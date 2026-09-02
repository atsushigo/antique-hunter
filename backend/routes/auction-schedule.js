// 拍賣期間 events — 給 Calendar 用
// 資料源：kankocho.jp/schedules/ 年間スケジュール（比逐物件爬蟲更完整可靠，
// 含還沒開放申込、還沒上架物件的未來輪次）
// 每筆是「時間段」（entry 或 bid），Calendar 用連續橫條顯示，不是單日 icon

import { Router } from 'express';
import { fetchAnnualSchedule } from '../ksi-scraper.js';

export const auctionScheduleRouter = Router();

// GET /api/auction-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
auctionScheduleRouter.get('/', async (req, res, next) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const schedule = await fetchAnnualSchedule();
    const events = [];
    for (const round of schedule) {
      for (const period of round.periods) {
        const type = period.label.includes('申し込み') ? 'entry' : 'bid';
        events.push({
          source: 'ksi',
          sourceLabel: 'KSI 官公庁',
          roundTitle: round.title,
          statusLabel: round.statusLabel,
          periodLabel: period.label,
          type,
          startDate: period.startJst.slice(0, 10),
          startTime: period.startJst.slice(11, 16),
          endDate: period.endJst.slice(0, 10),
          endTime: period.endJst.slice(11, 16),
          url: 'https://kankocho.jp/schedules/',
        });
      }
    }
    // 區間跟 [from, to] 有重疊就收
    const filtered = events.filter((e) => {
      if (to && e.startDate > to) return false;
      if (from && e.endDate < from) return false;
      return true;
    });
    filtered.sort((a, b) => a.startDate.localeCompare(b.startDate));
    res.json({ data: filtered, roundsCount: schedule.length });
  } catch (err) { next(err); }
});
