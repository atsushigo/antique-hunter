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
    // 簡化：找每個 item 起點後，往後 3000 chars 內用 regex 抽獨立欄位
    // 不解析完整 JSON，因 RSC data 有 escape 難以 brace-track
    const idxRe = /\{"id":(\d+),"auctionId":(\d+)/g;
    let m;
    while ((m = idxRe.exec(full))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const win = full.slice(m.index, m.index + 3000);
      const get = (k) => {
        const mm = win.match(new RegExp(`"${k}":\\s*(null|"(?:[^"\\\\]|\\\\.)*"|\\d+(?:\\.\\d+)?|true|false)`));
        if (!mm) return null;
        const v = mm[1];
        if (v === 'null') return null;
        if (v.startsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (v === 'true') return true;
        if (v === 'false') return false;
        return Number(v);
      };
      const statusJP = get('statusJP');
      if (!['申し込み受付中', 'せり売中', '入札受付中', '申込受付中', '入札開始待ち', '入札中'].includes(statusJP)) continue;
      const openWay = get('openWay');
      const govMatch = win.match(/"government":\s*\{[^}]*?"name":"([^"]+)"/);
      const govName = govMatch ? govMatch[1] : '';
      items.push({
        id: Number(id),
        auctionId: Number(m[2]),
        title: get('title') || '',
        priceJpy: get('estimateFee'),
        currentPriceJpy: get('currentPrice'),
        openWay,
        openWayJP: openWay === 'AUCTION' ? 'せり売' : (openWay === 'BOTH' ? 'せり売+入札' : '入札'),
        statusJP,
        government: govName,
        sourceUrl: `https://kankocho.jp/items/${id}/`,
      });
    }

    // 統計：拍賣規模
    // 註：bidderCount/watchCount 在 anon 頁面永遠回 0（KSI 需登入才顯示），無 login infra，故不用
    const statusBreak = {};
    for (const i of items) statusBreak[i.statusJP] = (statusBreak[i.statusJP] || 0) + 1;
    const govBreak = {};
    for (const i of items) govBreak[i.government] = (govBreak[i.government] || 0) + 1;
    const stats = {
      totalItems: items.length,
      governmentCount: Object.keys(govBreak).length,
      byStatus: statusBreak,
      topGovernments: Object.entries(govBreak).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    };

    res.json({
      data: items,
      category: cat,
      total: items.length,
      stats,
      note: '規模 = 該類別當前所有出品；bidder/watch 需登入才看到，未實作',
    });
  } catch (err) { next(err); }
});
