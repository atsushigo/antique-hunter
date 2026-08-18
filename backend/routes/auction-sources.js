// GET /api/auction-sources
// 回所有拍賣管道 metadata（參加方式 / 身分限制 / 外國人可否）
// 給 Guide + Calendar 用

import { Router } from 'express';
import { AUCTION_SOURCES } from '../data/auction-sources.js';

export const auctionSourcesRouter = Router();

auctionSourcesRouter.get('/', (req, res) => {
  res.json({ data: AUCTION_SOURCES, count: AUCTION_SOURCES.length });
});

auctionSourcesRouter.get('/:id', (req, res) => {
  const src = AUCTION_SOURCES.find((s) => s.id === req.params.id);
  if (!src) return res.status(404).json({ error: 'not_found' });
  res.json({ data: src });
});
