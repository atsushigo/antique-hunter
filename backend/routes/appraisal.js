import { Router } from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { processUpload } from '../image.js';
import { appraise } from '../claude.js';
import { AppraisalLog } from '../models/AppraisalLog.js';
import { parseAndValidateUrl, fetchMetadata, fetchImage, UrlFetchError } from '../url-fetch.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('only image/* allowed'));
    }
    cb(null, true);
  },
});

export const appraisalRouter = Router();

function toApi(log, result) {
  return {
    id: log.id,
    category: result.category,
    era: result.era,
    priceMinJpy: result.price_min_jpy,
    priceMaxJpy: result.price_max_jpy,
    confidence: result.confidence,
    authenticityRisk: result.authenticity_risk,
    priceVerdict: result.price_verdict || null,
    notes: result.notes,
    modelUsed: result.model_used,
    latencyMs: result.latency_ms,
    mock: result.mock,
    sourceUrl: log.sourceUrl || null,
    sourceTitle: log.sourceTitle || null,
    sourceHost: log.sourceHost || null,
    listedPriceJpy: log.listedPriceJpy || null,
    isCollected: log.isCollected,
    image: log.imageHash
      ? { hash: log.imageHash, bytes: log.imageBytes, width: log.imageWidth, height: log.imageHeight }
      : null,
  };
}

// 拍照鑑定
appraisalRouter.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'missing_image', message: '請以 multipart/form-data field="image" 上傳圖片' });
    }

    const img = await processUpload(req.file.buffer);
    const result = await appraise({ base64: img.base64, mediaType: img.mediaType, mode: 'image' });

    const log = await AppraisalLog.create({
      imageHash: img.hash,
      imageBytes: img.bytes,
      imageWidth: img.width,
      imageHeight: img.height,
      category: result.category,
      era: result.era,
      priceMinJpy: result.price_min_jpy,
      priceMaxJpy: result.price_max_jpy,
      confidence: result.confidence,
      authenticityRisk: result.authenticity_risk,
      notes: result.notes,
      rawResponse: result.raw_response,
      modelUsed: result.model_used,
      latencyMs: result.latency_ms,
      mock: result.mock,
    });

    res.json({ data: toApi(log, result) });
  } catch (err) {
    next(err);
  }
});

// URL 貼上估價
appraisalRouter.post('/url', async (req, res, next) => {
  try {
    const rawUrl = (req.body?.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'missing_url', message: '請提供 url' });
    }

    let source;
    try {
      source = parseAndValidateUrl(rawUrl);
    } catch (err) {
      if (err instanceof UrlFetchError) {
        return res.status(err.status).json({ error: err.code, message: err.message });
      }
      throw err;
    }

    // 1. 抓頁面 metadata
    let meta;
    try {
      meta = await fetchMetadata(source.url.toString());
    } catch (err) {
      if (err instanceof UrlFetchError) {
        return res.status(err.status).json({ error: err.code, message: err.message });
      }
      throw err;
    }

    if (!meta.imageUrl) {
      return res.status(422).json({
        error: 'no_product_image',
        message: '無法從頁面擷取商品圖（可能被登入牆擋、或頁面結構變更）',
        metadata: meta,
      });
    }

    // 2. 下載商品圖
    let rawImageBuf;
    try {
      rawImageBuf = await fetchImage(meta.imageUrl);
    } catch (err) {
      if (err instanceof UrlFetchError) {
        return res.status(err.status).json({ error: err.code, message: err.message });
      }
      throw err;
    }

    const img = await processUpload(rawImageBuf);

    // 3. 送 Claude 帶 context
    const context = {
      title: meta.title,
      description: meta.description,
      listedPriceJpy: meta.listedPriceJpy,
      sourceHost: source.host,
      sourceUrl: source.url.toString(),
    };
    const result = await appraise({ base64: img.base64, mediaType: img.mediaType, mode: 'url', context });

    const log = await AppraisalLog.create({
      imageHash: img.hash,
      imageBytes: img.bytes,
      imageWidth: img.width,
      imageHeight: img.height,
      category: result.category,
      era: result.era,
      priceMinJpy: result.price_min_jpy,
      priceMaxJpy: result.price_max_jpy,
      confidence: result.confidence,
      authenticityRisk: result.authenticity_risk,
      notes: result.notes,
      rawResponse: result.raw_response,
      modelUsed: result.model_used,
      latencyMs: result.latency_ms,
      mock: result.mock,
      sourceUrl: source.url.toString(),
      sourceTitle: meta.title,
      sourceHost: source.host,
      listedPriceJpy: meta.listedPriceJpy,
      priceVerdict: result.price_verdict,
    });

    res.json({ data: toApi(log, result), metadata: meta });
  } catch (err) {
    next(err);
  }
});

// URL 預覽（只抓 metadata，不送 Claude）— 前端貼 URL 後可先預覽
appraisalRouter.post('/url/preview', async (req, res, next) => {
  try {
    const rawUrl = (req.body?.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'missing_url', message: '請提供 url' });
    }
    let source;
    try {
      source = parseAndValidateUrl(rawUrl);
    } catch (err) {
      if (err instanceof UrlFetchError) {
        return res.status(err.status).json({ error: err.code, message: err.message });
      }
      throw err;
    }
    const meta = await fetchMetadata(source.url.toString());
    res.json({
      data: {
        ...meta,
        host: source.host,
        siteLabel: source.siteLabel,
        region: source.region,
      },
    });
  } catch (err) {
    if (err instanceof UrlFetchError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    next(err);
  }
});

// 歷史 + 統計
appraisalRouter.get('/history', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const source = String(req.query.source || '').trim(); // 'photo' | 'url' | 'all' | ''
    const verdict = String(req.query.verdict || '').trim(); // low/fair/high/unknown
    const risk = String(req.query.risk || '').trim(); // green/yellow/red
    const collected = req.query.collected === '1';

    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const where = { createdAt: { [Op.gte]: since } };
    if (source === 'url') where.sourceUrl = { [Op.ne]: null };
    else if (source === 'photo') where.sourceUrl = null;
    if (verdict) where.priceVerdict = verdict;
    if (risk) where.authenticityRisk = risk;
    if (collected) where.isCollected = true;

    const logs = await AppraisalLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    res.json({
      data: logs.map((l) => ({
        id: l.id,
        category: l.category,
        era: l.era,
        priceMinJpy: l.priceMinJpy,
        priceMaxJpy: l.priceMaxJpy,
        listedPriceJpy: l.listedPriceJpy,
        priceVerdict: l.priceVerdict,
        authenticityRisk: l.authenticityRisk,
        confidence: l.confidence,
        sourceUrl: l.sourceUrl,
        sourceHost: l.sourceHost,
        sourceTitle: l.sourceTitle,
        isCollected: l.isCollected,
        mock: l.mock,
        createdAt: l.createdAt,
      })),
      range: { days, since },
    });
  } catch (err) { next(err); }
});

appraisalRouter.get('/stats', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const logs = await AppraisalLog.findAll({
      where: { createdAt: { [Op.gte]: since } },
      attributes: ['priceVerdict', 'authenticityRisk', 'sourceUrl', 'sourceHost', 'isCollected'],
    });
    const stats = {
      total: logs.length,
      collected: 0,
      bySource: { photo: 0, url: 0 },
      byHost: {},
      byVerdict: { low: 0, fair: 0, high: 0, unknown: 0 },
      byRisk: { green: 0, yellow: 0, red: 0 },
    };
    for (const l of logs) {
      if (l.isCollected) stats.collected++;
      if (l.sourceUrl) {
        stats.bySource.url++;
        if (l.sourceHost) stats.byHost[l.sourceHost] = (stats.byHost[l.sourceHost] || 0) + 1;
      } else {
        stats.bySource.photo++;
      }
      if (l.priceVerdict && stats.byVerdict[l.priceVerdict] != null) stats.byVerdict[l.priceVerdict]++;
      if (l.authenticityRisk && stats.byRisk[l.authenticityRisk] != null) stats.byRisk[l.authenticityRisk]++;
    }
    res.json({ data: stats, range: { days, since } });
  } catch (err) { next(err); }
});

// 收藏 toggle
appraisalRouter.post('/:id/collect', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });
    const log = await AppraisalLog.findByPk(id);
    if (!log) return res.status(404).json({ error: 'not_found' });
    log.isCollected = !log.isCollected;
    await log.save();
    res.json({ data: { id: log.id, isCollected: log.isCollected } });
  } catch (err) {
    next(err);
  }
});

// 收藏清單
appraisalRouter.get('/collection', async (req, res, next) => {
  try {
    const logs = await AppraisalLog.findAll({
      where: { isCollected: true },
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    res.json({
      data: logs.map((log) => ({
        id: log.id,
        category: log.category,
        era: log.era,
        priceMinJpy: log.priceMinJpy,
        priceMaxJpy: log.priceMaxJpy,
        listedPriceJpy: log.listedPriceJpy,
        priceVerdict: log.priceVerdict,
        authenticityRisk: log.authenticityRisk,
        sourceUrl: log.sourceUrl,
        sourceHost: log.sourceHost,
        sourceTitle: log.sourceTitle,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
