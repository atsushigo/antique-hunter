// BIT 裁判所競売 物件瀏覽 — 依都道府県列出目前可競標物件（土地/戸建て/マンション等）
import { Router } from 'express';
import { PREFECTURES, fetchPrefectureProperties } from '../bit-properties.js';
import { distanceFromHome } from '../data/prefectures.js';

export const bitPropertiesRouter = Router();

// GET /api/bit-properties?prefecture=hyogo
bitPropertiesRouter.get('/', async (req, res, next) => {
  try {
    const key = String(req.query.prefecture || 'hyogo');
    const pref = PREFECTURES.find((p) => p.key === key);
    if (!pref) return res.status(400).json({ error: 'unknown_prefecture', supported: PREFECTURES.map((p) => p.key) });
    const rows = await fetchPrefectureProperties(pref.code);
    const data = rows.map((r) => ({
      ...r,
      ...distanceFromHome(r.courtCase || pref.name),
    }));
    res.json({ data, count: data.length, prefecture: pref.key });
  } catch (err) { next(err); }
});

// GET /api/bit-properties/prefectures — 給前端切換 tab 用
bitPropertiesRouter.get('/prefectures', (req, res) => {
  res.json({ data: PREFECTURES });
});
