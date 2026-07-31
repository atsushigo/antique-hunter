import { Router } from 'express';
import { Market } from '../models/Market.js';

export const marketsRouter = Router();

marketsRouter.get('/', async (req, res, next) => {
  try {
    const markets = await Market.findAll({
      order: [
        ['position', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json({ data: markets });
  } catch (err) {
    next(err);
  }
});
