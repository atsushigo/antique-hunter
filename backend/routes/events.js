import { Router } from 'express';
import { Op } from 'sequelize';
import { MarketEvent } from '../models/MarketEvent.js';
import { Market } from '../models/Market.js';

export const eventsRouter = Router();

// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
// 預設：今天起 60 天
eventsRouter.get('/', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultFrom = today.toISOString().slice(0, 10);
    const defaultToDate = new Date(today);
    defaultToDate.setDate(defaultToDate.getDate() + 60);
    const defaultTo = defaultToDate.toISOString().slice(0, 10);

    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : defaultFrom;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : defaultTo;

    const events = await MarketEvent.findAll({
      where: { date: { [Op.between]: [from, to] } },
      include: [{ model: Market, as: 'market' }],
      order: [['date', 'ASC'], ['market_id', 'ASC']],
    });

    res.json({
      data: events.map((e) => ({
        id: e.id,
        date: e.date,
        note: e.note,
        market: {
          id: e.market.id,
          name: e.market.name,
          location: e.market.location,
          timeRange: e.market.timeRange,
          theme: e.market.theme,
          scale: e.market.scale,
          driveTimeMin: e.market.driveTimeMin,
          tollYen: e.market.tollYen,
          route: e.market.route,
          notes: e.market.notes,
          sourceUrl: e.market.sourceUrl,
        },
      })),
      range: { from, to },
    });
  } catch (err) {
    next(err);
  }
});
