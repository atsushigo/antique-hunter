// KSI 官公庁瀏覽 — 依類別列出當前拍賣物件
// KSI 的 keyword search 不生效（`?q=` 只是 URL cosmetic），改成 category browse

import { Router } from 'express';

export const govAuctionsRouter = Router();

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORY_URL = {
  car: 'https://kankocho.jp/search/car/',
  'real-estate': 'https://kankocho.jp/search/real-estate/',
  general: 'https://kankocho.jp/search/',
};

// GET /api/gov-auctions?category=car|real-estate|general
govAuctionsRouter.get('/', async (req, res, next) => {
  try {
    const cat = String(req.query.category || 'general');
    const url = CATEGORY_URL[cat];
    if (!url) return res.status(400).json({ error: 'unknown_category', supported: Object.keys(CATEGORY_URL) });

    const html = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' },
    }).then((r) => {
      if (!r.ok) throw new Error(`ksi HTTP ${r.status}`);
      return r.text();
    });

    // 抽 RSC streaming chunks → 找 item JSON
    const streams = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) {
      try { full += JSON.parse(`"${s[1]}"`); } catch { /* skip */ }
    }
    const items = [];
    const seen = new Set();
    const itemRe = /\{"id":(\d+),"auctionId":(\d+),"openWay":"([^"]+)","printOrder":\d+,"title":"((?:[^"\\]|\\.)*)","estimateFee":(\d+)[\s\S]*?"statusJP":"([^"]+)"[\s\S]*?"government":\{"id":\d+,"name":"([^"]+)"/g;
    let m;
    while ((m = itemRe.exec(full))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const title = m[4].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const price = Number(m[5]);
      const statusJP = m[6];
      const govName = m[7];
      if (!['申し込み受付中', 'せり売中', '入札受付中', '申込受付中'].includes(statusJP)) continue;
      items.push({
        id: Number(id),
        auctionId: Number(m[2]),
        title,
        priceJpy: Number.isFinite(price) ? price : null,
        openWay: m[3],
        openWayJP: m[3] === 'AUCTION' ? 'せり売' : '入札',
        statusJP,
        government: govName,
        sourceUrl: `https://kankocho.jp/items/${id}/`,
      });
    }
    res.json({
      data: items,
      category: cat,
      total: items.length,
      note: '圖片在物件詳細頁 og:image；本 endpoint 只列標題+起標價+主辦政府',
    });
  } catch (err) { next(err); }
});
