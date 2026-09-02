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
      // 同一輪的入札相關時段常有「せり売入札期間」跟「入札期間」兩種物件結算方式，
      // 起始時間通常一樣、只有截止不同 —— 依開始時間分組合併，避免同一天顯示兩張幾乎一樣的卡片
      const bidGroups = new Map(); // startJst → [period, ...]
      const entryPeriods = [];
      for (const period of round.periods) {
        if (period.label.includes('申し込み')) { entryPeriods.push(period); continue; }
        if (!bidGroups.has(period.startJst)) bidGroups.set(period.startJst, []);
        bidGroups.get(period.startJst).push(period);
      }
      for (const period of entryPeriods) {
        events.push({
          source: 'ksi',
          sourceLabel: 'KSI 官公庁',
          roundTitle: round.title,
          statusLabel: round.statusLabel,
          periodLabel: period.label,
          type: 'entry',
          subPeriods: null,
          startDate: period.startJst.slice(0, 10),
          startTime: period.startJst.slice(11, 16),
          endDate: period.endJst.slice(0, 10),
          endTime: period.endJst.slice(11, 16),
          url: 'https://kankocho.jp/schedules/',
        });
      }
      for (const [startJst, periods] of bidGroups) {
        const latest = periods.reduce((a, b) => (a.endJst > b.endJst ? a : b));
        events.push({
          source: 'ksi',
          sourceLabel: 'KSI 官公庁',
          roundTitle: round.title,
          statusLabel: round.statusLabel,
          periodLabel: periods.length > 1 ? '入札期間' : periods[0].label,
          type: 'bid',
          // 兩種以上結算方式共用開始時間但截止不同時，把各自截止時間攤開給前端分行顯示
          subPeriods: periods.length > 1
            ? periods.map((p) => ({ label: p.label, endDate: p.endJst.slice(0, 10), endTime: p.endJst.slice(11, 16) }))
            : null,
          startDate: startJst.slice(0, 10),
          startTime: startJst.slice(11, 16),
          endDate: latest.endJst.slice(0, 10),
          endTime: latest.endJst.slice(11, 16),
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
