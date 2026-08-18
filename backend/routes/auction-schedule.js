// 拍賣期間 events — 給 Calendar 用
// 目前只涵蓋 KSI（各 auction session 的 4 個 milestone）
// 未來擴充：兵庫県警獨立公売、税関官報公告等 hardcode/scrape

import { Router } from 'express';
export const auctionScheduleRouter = Router();

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CATEGORY_URL = {
  car: 'https://kankocho.jp/search/car/',
  'real-estate': 'https://kankocho.jp/search/real-estate/',
  general: 'https://kankocho.jp/search/',
};

// 拍賣 session 日期 cache — 同一 auctionId 全 items 共用日期
const sessionCache = new Map(); // auctionId → { entryStart, entryEnd, bidStart, bidEnd, at }
const CACHE_TTL = 60 * 60 * 1000;

async function extractSessionDates(sampleItemId) {
  try {
    const h = await fetch(`https://kankocho.jp/items/${sampleItemId}/`, {
      headers: { 'User-Agent': UA },
    }).then((r) => r.text());
    const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }
    const dates = [...full.matchAll(/2\d{3}年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分/g)].map((m) => {
      const yr = m[0].slice(0, 4);
      return `${yr}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')} ${String(m[3]).padStart(2, '0')}:${String(m[4]).padStart(2, '0')}`;
    });
    if (dates.length < 4) return null;
    return { entryStart: dates[0], entryEnd: dates[1], bidStart: dates[2], bidEnd: dates[3] };
  } catch { return null; }
}

async function collectKsiSessions() {
  // 對 3 category 各抓一頁，收集所有 uniq auctionId + 政府名 category
  const sessions = new Map(); // auctionId → { category, sampleItemId, sampleGov, sampleTitle }
  for (const [cat, url] of Object.entries(CATEGORY_URL)) {
    try {
      const h = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.text());
      const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
      let full = '';
      for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }
      const itemRe = /\{"id":(\d+),"auctionId":(\d+)/g;
      let m;
      while ((m = itemRe.exec(full))) {
        const iid = Number(m[1]);
        const aid = Number(m[2]);
        if (sessions.has(aid)) continue;
        // 抓該 item 的 title + government
        const win = full.slice(m.index, m.index + 3000);
        const titleM = win.match(/"title":"((?:[^"\\]|\\.)*)"/);
        const govM = win.match(/"government":\s*\{[^}]*?"name":"([^"]+)"/);
        sessions.set(aid, {
          category: cat,
          sampleItemId: iid,
          sampleGovernment: govM ? govM[1] : '',
          sampleTitle: titleM ? titleM[1] : '',
          categoryLabel: cat === 'car' ? '車輛' : cat === 'real-estate' ? '不動產' : '一般',
        });
      }
    } catch (err) { console.warn('[auction-schedule]', cat, err.message); }
  }
  return sessions;
}

// GET /api/auction-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
// 回所有拍賣 milestone events（entry_start / entry_end / bid_start / bid_end）
auctionScheduleRouter.get('/', async (req, res, next) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const sessions = await collectKsiSessions();
    const events = [];
    for (const [aid, meta] of sessions) {
      const cached = sessionCache.get(aid);
      let dates = cached && Date.now() - cached.at < CACHE_TTL ? cached : null;
      if (!dates) {
        const d = await extractSessionDates(meta.sampleItemId);
        if (!d) continue;
        dates = { ...d, at: Date.now() };
        sessionCache.set(aid, dates);
      }
      const auctionUrl = `https://kankocho.jp/items/${meta.sampleItemId}/`;
      const base = {
        source: 'ksi',
        sourceId: 'ksi',
        sourceLabel: 'KSI 官公庁',
        auctionId: aid,
        category: meta.category,
        categoryLabel: meta.categoryLabel,
        government: meta.sampleGovernment,
        url: auctionUrl,
      };
      events.push({ ...base, type: 'entry_start', typeLabel: '申請開始', date: dates.entryStart });
      events.push({ ...base, type: 'entry_end', typeLabel: '申請截止', date: dates.entryEnd });
      events.push({ ...base, type: 'bid_start', typeLabel: '入札開始', date: dates.bidStart });
      events.push({ ...base, type: 'bid_end', typeLabel: '入札終了', date: dates.bidEnd });
    }
    // Filter by date range
    const filtered = events.filter((e) => {
      const d = e.date.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ data: filtered, sessionsCount: sessions.size });
  } catch (err) { next(err); }
});
