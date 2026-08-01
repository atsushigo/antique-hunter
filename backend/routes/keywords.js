import { Router } from 'express';
import { Op } from 'sequelize';
import { SearchKeyword } from '../models/SearchKeyword.js';
import { TrackedListing } from '../models/TrackedListing.js';
import { searchSite, SEARCH_SITES, SITE_LABELS, ALL_SITES_META, ScrapeError } from '../search-scrape.js';

export const keywordsRouter = Router();

function serialize(kw) {
  return {
    id: kw.id,
    keyword: kw.keyword,
    sites: kw.sitesArray,
    isActive: kw.isActive,
    lastRunAt: kw.lastRunAt,
    lastError: kw.lastError,
    createdAt: kw.createdAt,
  };
}

// GET /api/keywords
keywordsRouter.get('/', async (req, res, next) => {
  try {
    const kws = await SearchKeyword.findAll({ order: [['created_at', 'DESC']] });
    res.json({
      data: kws.map(serialize),
      supportedSites: ALL_SITES_META, // 包含未支援站別（灰掉），完整揭露
    });
  } catch (err) { next(err); }
});

// POST /api/keywords  { keyword, sites: ["yahoo_auction",...] }
keywordsRouter.post('/', async (req, res, next) => {
  try {
    const keyword = String(req.body?.keyword || '').trim();
    if (!keyword) return res.status(400).json({ error: 'missing_keyword' });
    const sites = Array.isArray(req.body?.sites) && req.body.sites.length
      ? req.body.sites.filter((s) => SEARCH_SITES.includes(s))
      : ['yahoo_auction'];
    if (!sites.length) return res.status(400).json({ error: 'no_valid_sites', supported: SEARCH_SITES });

    const kw = await SearchKeyword.create({
      keyword: keyword.slice(0, 100),
      sites: sites.join(','),
      isActive: true,
    });
    res.json({ data: serialize(kw) });
  } catch (err) { next(err); }
});

// PATCH /api/keywords/:id  { keyword?, sites?, isActive? }
keywordsRouter.patch('/:id', async (req, res, next) => {
  try {
    const kw = await SearchKeyword.findByPk(Number(req.params.id));
    if (!kw) return res.status(404).json({ error: 'not_found' });
    if (typeof req.body?.keyword === 'string' && req.body.keyword.trim()) {
      kw.keyword = req.body.keyword.trim().slice(0, 100);
    }
    if (Array.isArray(req.body?.sites)) {
      const filtered = req.body.sites.filter((s) => SEARCH_SITES.includes(s));
      if (filtered.length) kw.sites = filtered.join(',');
    }
    if (typeof req.body?.isActive === 'boolean') kw.isActive = req.body.isActive;
    await kw.save();
    res.json({ data: serialize(kw) });
  } catch (err) { next(err); }
});

// DELETE /api/keywords/:id
keywordsRouter.delete('/:id', async (req, res, next) => {
  try {
    const n = await SearchKeyword.destroy({ where: { id: Number(req.params.id) } });
    res.json({ data: { deleted: n } });
  } catch (err) { next(err); }
});

// POST /api/keywords/:id/run — 同步觸發搜尋
keywordsRouter.post('/:id/run', async (req, res, next) => {
  try {
    const kw = await SearchKeyword.findByPk(Number(req.params.id));
    if (!kw) return res.status(404).json({ error: 'not_found' });
    const result = await runKeyword(kw);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/inbox?days=7  — 近 N 天新出現 listings
keywordsRouter.get('/inbox', async (req, res, next) => {
  try {
    const days = Math.min(60, Math.max(1, Number(req.query.days) || 7));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const listings = await TrackedListing.findAll({
      where: {
        firstSeenAt: { [Op.gte]: since },
        isDismissed: false,
      },
      include: [{ model: SearchKeyword, as: 'keyword' }],
      order: [['first_seen_at', 'DESC']],
      limit: 200,
    });
    res.json({
      data: listings.map((l) => ({
        id: l.id,
        site: l.site,
        siteLabel: SITE_LABELS[l.site] || l.site,
        sourceUrl: l.sourceUrl,
        imageUrl: l.imageUrl,
        title: l.title,
        priceJpy: l.priceJpy,
        priceLabel: l.priceLabel,
        firstSeenAt: l.firstSeenAt,
        keywordId: l.keywordId,
        keyword: l.keyword?.keyword,
      })),
      range: { days, since },
    });
  } catch (err) { next(err); }
});

// POST /api/inbox/:id/dismiss  — 略過某筆
keywordsRouter.post('/inbox/:id/dismiss', async (req, res, next) => {
  try {
    const l = await TrackedListing.findByPk(Number(req.params.id));
    if (!l) return res.status(404).json({ error: 'not_found' });
    l.isDismissed = true;
    await l.save();
    res.json({ data: { id: l.id, isDismissed: true } });
  } catch (err) { next(err); }
});

// 給 route + cron 共用的執行邏輯
export async function runKeyword(kw) {
  const sites = kw.sitesArray;
  const summary = { keywordId: kw.id, keyword: kw.keyword, perSite: [], newTotal: 0 };
  const errors = [];
  const now = new Date();

  for (const site of sites) {
    try {
      const { items } = await searchSite(site, kw.keyword);
      let newCount = 0;
      for (const item of items) {
        if (!item.sourceUrl) continue;
        const [row, created] = await TrackedListing.findOrCreate({
          where: { keywordId: kw.id, sourceUrl: item.sourceUrl },
          defaults: {
            site,
            sourceUrl: item.sourceUrl,
            imageUrl: item.imageUrl,
            title: item.title,
            priceJpy: item.priceJpy,
            priceLabel: item.priceLabel,
            firstSeenAt: now,
          },
        });
        if (created) newCount++;
        else {
          // 更新價格/圖（可能有變）
          if (item.priceJpy != null && item.priceJpy !== row.priceJpy) {
            row.priceJpy = item.priceJpy;
            await row.save();
          }
        }
      }
      summary.perSite.push({ site, fetched: items.length, new: newCount });
      summary.newTotal += newCount;
    } catch (err) {
      const msg = err instanceof ScrapeError ? `${err.code}: ${err.message}` : err.message;
      summary.perSite.push({ site, error: msg });
      errors.push(`[${site}] ${msg}`);
    }
  }

  kw.lastRunAt = now;
  kw.lastError = errors.length ? errors.join(' | ').slice(0, 500) : null;
  await kw.save();

  return summary;
}
