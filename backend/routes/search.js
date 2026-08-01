import { Router } from 'express';
import { searchSite, SEARCH_SITES, SITE_LABELS, ScrapeError } from '../search-scrape.js';

export const searchRouter = Router();

// GET /api/search?q=&sites=yahoo_auction,jimoty
// 即時搜尋不落地，給「打開就查」用
searchRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing_q' });

    const requested = String(req.query.sites || 'yahoo_auction,jimoty')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => SEARCH_SITES.includes(s));
    const sites = requested.length ? requested : ['yahoo_auction', 'jimoty'];

    const groups = [];
    for (const site of sites) {
      try {
        const { items } = await searchSite(site, q);
        groups.push({
          site,
          siteLabel: SITE_LABELS[site],
          count: items.length,
          items: items.slice(0, 30),
        });
      } catch (err) {
        const msg = err instanceof ScrapeError ? `${err.code}: ${err.message}` : err.message;
        groups.push({ site, siteLabel: SITE_LABELS[site], error: msg, items: [] });
      }
    }
    res.json({ data: { keyword: q, groups } });
  } catch (err) { next(err); }
});
