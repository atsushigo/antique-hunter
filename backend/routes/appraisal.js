import { Router } from 'express';
import multer from 'multer';
import { processUpload } from '../image.js';
import { appraiseImage } from '../claude.js';
import { AppraisalLog } from '../models/AppraisalLog.js';

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

appraisalRouter.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'missing_image', message: '請以 multipart/form-data field="image" 上傳圖片' });
    }

    const img = await processUpload(req.file.buffer);
    const result = await appraiseImage({ base64: img.base64, mediaType: img.mediaType });

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

    res.json({
      data: {
        id: log.id,
        category: result.category,
        era: result.era,
        priceMinJpy: result.price_min_jpy,
        priceMaxJpy: result.price_max_jpy,
        confidence: result.confidence,
        authenticityRisk: result.authenticity_risk,
        notes: result.notes,
        modelUsed: result.model_used,
        latencyMs: result.latency_ms,
        mock: result.mock,
        image: { hash: img.hash, bytes: img.bytes, width: img.width, height: img.height },
      },
    });
  } catch (err) {
    next(err);
  }
});
