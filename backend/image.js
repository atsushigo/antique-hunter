import crypto from 'node:crypto';
import sharp from 'sharp';

const MAX_EDGE = 1568;
const JPEG_QUALITY = 82;

export async function processUpload(buffer) {
  const meta = await sharp(buffer).metadata();
  const needsResize = (meta.width || 0) > MAX_EDGE || (meta.height || 0) > MAX_EDGE;

  const pipeline = sharp(buffer).rotate();
  if (needsResize) {
    pipeline.resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true });
  }
  const processed = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
  const outMeta = await sharp(processed).metadata();
  const hash = crypto.createHash('sha256').update(processed).digest('hex');

  return {
    buffer: processed,
    hash,
    bytes: processed.length,
    width: outMeta.width || null,
    height: outMeta.height || null,
    base64: processed.toString('base64'),
    mediaType: 'image/jpeg',
  };
}
