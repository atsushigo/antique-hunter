import { Router } from 'express';
import multer from 'multer';
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
