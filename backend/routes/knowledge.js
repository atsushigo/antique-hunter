import { Router } from 'express';
import { Op } from 'sequelize';
import { AuctionKnowledge } from '../models/AuctionKnowledge.js';

export const knowledgeRouter = Router();

function serialize(k) {
  return {
    id: k.id,
    category: k.category,
    title: k.title,
    sourceUrl: k.sourceUrl,
    sourceSite: k.sourceSite,
    listingPriceJpy: k.listingPriceJpy,
    winningPriceJpy: k.winningPriceJpy,
    didIBid: k.didIBid,
    myAppraisalLowJpy: k.myAppraisalLowJpy,
    myAppraisalHighJpy: k.myAppraisalHighJpy,
    notes: k.notes,
    tags: k.tagsArray,
    observedAt: k.observedAt,
    settledAt: k.settledAt,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    // 學習指標
    settled: !!k.settledAt,
    // 成交價 vs 我估價 delta
    appraisalDelta: (k.winningPriceJpy && k.myAppraisalLowJpy && k.myAppraisalHighJpy)
      ? {
          winningVsLowPct: Math.round(((k.winningPriceJpy - k.myAppraisalLowJpy) / k.myAppraisalLowJpy) * 100),
          winningVsHighPct: Math.round(((k.winningPriceJpy - k.myAppraisalHighJpy) / k.myAppraisalHighJpy) * 100),
        }
      : null,
  };
}

// GET /api/knowledge?category=&search=&settled=1
knowledgeRouter.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.settled === '1') where.settledAt = { [Op.ne]: null };
    else if (req.query.settled === '0') where.settledAt = null;
    if (req.query.search) {
      const s = String(req.query.search);
      where[Op.or] = [
        { title: { [Op.like]: `%${s}%` } },
        { notes: { [Op.like]: `%${s}%` } },
        { tags: { [Op.like]: `%${s}%` } },
      ];
    }
    const rows = await AuctionKnowledge.findAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: 500,
    });
    // 統計
    const stats = {
      total: rows.length,
      settled: rows.filter((r) => r.settledAt).length,
      byCategory: {},
      accuracy: null, // 平均估價準確度
    };
    for (const r of rows) {
      if (r.category) stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    }
    // 準確度 = 成交價落在估價區間內的比例
    const settled = rows.filter((r) => r.settledAt && r.winningPriceJpy && r.myAppraisalLowJpy && r.myAppraisalHighJpy);
    if (settled.length) {
      const hits = settled.filter((r) => r.winningPriceJpy >= r.myAppraisalLowJpy && r.winningPriceJpy <= r.myAppraisalHighJpy).length;
      stats.accuracy = { total: settled.length, hits, pct: Math.round((hits / settled.length) * 100) };
    }
    res.json({ data: rows.map(serialize), stats });
  } catch (err) { next(err); }
});

// POST /api/knowledge
knowledgeRouter.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'missing_title' });
    const row = await AuctionKnowledge.create({
      category: b.category || null,
      title: String(b.title).slice(0, 500),
      sourceUrl: b.sourceUrl || null,
      sourceSite: b.sourceSite || null,
      listingPriceJpy: Number.isFinite(+b.listingPriceJpy) ? +b.listingPriceJpy : null,
      winningPriceJpy: Number.isFinite(+b.winningPriceJpy) ? +b.winningPriceJpy : null,
      didIBid: !!b.didIBid,
      myAppraisalLowJpy: Number.isFinite(+b.myAppraisalLowJpy) ? +b.myAppraisalLowJpy : null,
      myAppraisalHighJpy: Number.isFinite(+b.myAppraisalHighJpy) ? +b.myAppraisalHighJpy : null,
      notes: b.notes || null,
      tags: Array.isArray(b.tags) ? b.tags.join(',') : (b.tags || null),
      observedAt: b.observedAt ? new Date(b.observedAt) : new Date(),
      settledAt: b.settledAt ? new Date(b.settledAt) : null,
    });
    res.json({ data: serialize(row) });
  } catch (err) { next(err); }
});

// PATCH /api/knowledge/:id
knowledgeRouter.patch('/:id', async (req, res, next) => {
  try {
    const row = await AuctionKnowledge.findByPk(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not_found' });
    const b = req.body || {};
    const setIf = (field, val, conv = (x) => x) => { if (val !== undefined) row[field] = val === null ? null : conv(val); };
    setIf('category', b.category);
    setIf('title', b.title, (x) => String(x).slice(0, 500));
    setIf('sourceUrl', b.sourceUrl);
    setIf('sourceSite', b.sourceSite);
    setIf('listingPriceJpy', b.listingPriceJpy, Number);
    setIf('winningPriceJpy', b.winningPriceJpy, Number);
    setIf('didIBid', b.didIBid, Boolean);
    setIf('myAppraisalLowJpy', b.myAppraisalLowJpy, Number);
    setIf('myAppraisalHighJpy', b.myAppraisalHighJpy, Number);
    setIf('notes', b.notes);
    if (b.tags !== undefined) row.tags = Array.isArray(b.tags) ? b.tags.join(',') : b.tags;
    setIf('observedAt', b.observedAt, (x) => new Date(x));
    setIf('settledAt', b.settledAt, (x) => new Date(x));
    await row.save();
    res.json({ data: serialize(row) });
  } catch (err) { next(err); }
});

// DELETE /api/knowledge/:id
knowledgeRouter.delete('/:id', async (req, res, next) => {
  try {
    const n = await AuctionKnowledge.destroy({ where: { id: Number(req.params.id) } });
    res.json({ data: { deleted: n } });
  } catch (err) { next(err); }
});
