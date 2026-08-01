import { Router } from 'express';
import { Op } from 'sequelize';
import { SearchKeyword } from '../models/SearchKeyword.js';
import { TrackedListing } from '../models/TrackedListing.js';
import { snapshotPrice } from '../models/PriceSnapshot.js';
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
    excludeKeywords: kw.excludeKeywords || '',
    categoryHint: kw.categoryHint || null,
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
    if (typeof req.body?.excludeKeywords === 'string') {
      kw.excludeKeywords = req.body.excludeKeywords.slice(0, 500);
    }
    if (['car', 'antique', null, ''].includes(req.body?.categoryHint)) {
      kw.categoryHint = req.body.categoryHint || null;
    }
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

// GET /api/inbox?days=7&keyword=X&limit=50&offset=0&includeInactive=1
// 預設：只列 active keyword 的 listing、近 7 天、最多 50 筆（分頁）
keywordsRouter.get('/inbox', async (req, res, next) => {
  try {
    const days = Math.min(60, Math.max(1, Number(req.query.days) || 7));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const includeInactive = req.query.includeInactive === '1';
    const kwFilter = req.query.keyword ? String(req.query.keyword) : null;

    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const where = { firstSeenAt: { [Op.gte]: since }, isDismissed: false };

    const kwWhere = {};
    if (!includeInactive) kwWhere.isActive = true;
    if (kwFilter) kwWhere.keyword = kwFilter;

    // total 供分頁用
    const total = await TrackedListing.count({
      where,
      include: [{ model: SearchKeyword, as: 'keyword', where: kwWhere, required: true }],
    });

    // 分頁時同步 apply 排除詞 filter（keyword.excludeArray）
    // 為簡單起見：多抓一些後 JS 過濾（因每 keyword 排除詞短）
    const overFetch = Math.min(500, limit * 4);
    const raw = await TrackedListing.findAll({
      where,
      include: [{ model: SearchKeyword, as: 'keyword', where: kwWhere, required: true }],
      order: [['first_seen_at', 'DESC']],
      limit: overFetch,
      offset,
    });
    const listings = raw
      .filter((l) => {
        if (!l.keyword) return false;
        if (l.keyword.isExcluded(l.title)) return false;
        if (l.title && !l.title.toLowerCase().includes(l.keyword.keyword.toLowerCase())) return false;
        // 類別 positive filter
        if (!l.keyword.matchesCategory({ site: l.site, sourceUrl: l.sourceUrl, title: l.title })) return false;
        return true;
      })
      .slice(0, limit);

    // 每個 active keyword 的 count（給 UI 篩選 chip 顯示）
    const perKeyword = await TrackedListing.findAll({
      where,
      include: [{ model: SearchKeyword, as: 'keyword', where: kwWhere, required: true, attributes: ['id', 'keyword'] }],
      attributes: ['keyword_id'],
    });
    const kwCount = {};
    for (const l of perKeyword) {
      const kw = l.keyword?.keyword;
      if (kw) kwCount[kw] = (kwCount[kw] || 0) + 1;
    }

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
      pagination: { limit, offset, total, hasMore: offset + listings.length < total },
      perKeyword: kwCount,
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
      const kwLower = kw.keyword.toLowerCase();
      for (const item of items) {
        if (!item.sourceUrl) continue;
        // 過濾：title 存在但不含 keyword（Jimoty 搜 description 常回不相關項）
        if (item.title && !item.title.toLowerCase().includes(kwLower)) continue;
        if (kw.isExcluded(item.title)) continue;
        // 類別 positive filter
        if (!kw.matchesCategory({ site, sourceUrl: item.sourceUrl, title: item.title })) continue;
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
        else if (item.priceJpy != null && item.priceJpy !== row.priceJpy) {
          row.priceJpy = item.priceJpy;
          await row.save();
        }
        // 每筆抓到的價格都嘗試 snapshot（內部會依 dedup 規則決定是否 insert）
        if (item.priceJpy) {
          await snapshotPrice({
            sourceUrl: item.sourceUrl,
            sourceHost: hostFromSite(site),
            priceJpy: item.priceJpy,
            sourceType: 'tracked',
          }).catch((e) => console.warn('[snapshot]', e.message));
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

function hostFromSite(site) {
  return {
    yahoo_auction: 'auctions.yahoo.co.jp',
    jimoty: 'jmty.jp',
    mercari: 'jp.mercari.com',
    rakuma: 'fril.jp',
  }[site] || null;
}
