// 拍賣期間 events — 給 Calendar 用
// 目前只涵蓋 KSI（各 auction session 的 4 個 milestone）
// 未來擴充：兵庫県警獨立公売、税関官報公告等 hardcode/scrape

import { Router } from 'express';
import { collectKsiSessionsWithDates } from '../ksi-scraper.js';

export const auctionScheduleRouter = Router();

// GET /api/auction-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
// 回所有拍賣 milestone events（entry_start / entry_end / bid_start / bid_end）
auctionScheduleRouter.get('/', async (req, res, next) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const sessions = await collectKsiSessionsWithDates();
    const events = [];
    for (const s of sessions) {
      const base = {
        source: 'ksi',
        sourceId: 'ksi',
        sourceLabel: 'KSI 官公庁',
        auctionId: s.auctionId,
        category: s.category,
        categoryLabel: s.categoryLabel,
        government: s.sampleGovernment,
        url: `https://kankocho.jp/items/${s.sampleItemId}/`,
      };
      events.push({ ...base, type: 'entry_start', typeLabel: '申請開始', date: s.entryStart });
      events.push({ ...base, type: 'entry_end', typeLabel: '申請截止', date: s.entryEnd });
      events.push({ ...base, type: 'bid_start', typeLabel: '入札開始', date: s.bidStart });
      events.push({ ...base, type: 'bid_end', typeLabel: '入札終了', date: s.bidEnd });
    }
    // Filter by date range
    const filtered = events.filter((e) => {
      const d = e.date.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ data: filtered, sessionsCount: sessions.length });
  } catch (err) { next(err); }
});
