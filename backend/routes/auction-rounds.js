// KSI 拍賣輪次追蹤 — 給 HomeView 的「新輪次提醒」banner 用
// 實際偵測邏輯在 cron.js（每天 08:00 順便跑），這裡只負責讀 + dismiss

import { Router } from 'express';
import { Op } from 'sequelize';
import { AuctionRound } from '../models/AuctionRound.js';

export const auctionRoundsRouter = Router();

function serialize(r) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return {
    id: r.id,
    auctionId: r.auctionId,
    category: r.category,
    categoryLabel: r.category === 'car' ? '車輛' : r.category === 'real-estate' ? '不動產' : '一般',
    government: r.government,
    sampleTitle: r.sampleTitle,
    url: r.sampleItemId ? `https://kankocho.jp/items/${r.sampleItemId}/` : null,
    entryStart: r.entryStart,
    entryEnd: r.entryEnd,
    bidStart: r.bidStart,
    bidEnd: r.bidEnd,
    firstSeenAt: r.firstSeenAt,
    dismissed: !!r.dismissedAt,
    // 現在正是申請期間內 = 該去申請了
    entryOpenNow: !!(r.entryStart && r.entryEnd && r.entryStart <= now && now <= r.entryEnd),
  };
}

// GET /api/auction-rounds?dismissed=0&actionableOnly=1
// actionableOnly：只回「申請還沒截止」的（給 HomeView banner 用，避免提醒已經來不及動作的舊輪次）
auctionRoundsRouter.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.dismissed === '0') where.dismissedAt = { [Op.eq]: null };
    if (req.query.actionableOnly === '1') {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      where.entryEnd = { [Op.gte]: now };
    }
    const rows = await AuctionRound.findAll({ where, order: [['first_seen_at', 'DESC']], limit: 50 });
    res.json({ data: rows.map(serialize) });
  } catch (err) { next(err); }
});

// POST /api/auction-rounds/:id/dismiss
auctionRoundsRouter.post('/:id/dismiss', async (req, res, next) => {
  try {
    const row = await AuctionRound.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    row.dismissedAt = new Date();
    await row.save();
    res.json({ data: serialize(row) });
  } catch (err) { next(err); }
});
