// 圖片 proxy — 走 backend 中繼避免 CORS/referer 檢查
// 額外：磁碟 cache（一次抓到永遠有）— 為 Cloudflare geo-block 情境準備，Sam 切 JP IP 抓一次就能永久顯示
import { Router } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadState, toCookieHeader } from '../auth/session-store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(here, '../data/img-cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function cacheKey(url) {
  return crypto.createHash('sha1').update(url).digest('hex');
}
async function getCached(url) {
  const key = cacheKey(url);
  const file = path.join(CACHE_DIR, key);
  const meta = path.join(CACHE_DIR, key + '.meta');
  try {
    const [data, m] = await Promise.all([fsp.readFile(file), fsp.readFile(meta, 'utf-8')]);
    return { data, contentType: m.trim() };
  } catch { return null; }
}
async function saveCached(url, data, contentType) {
  const key = cacheKey(url);
  await Promise.all([
    fsp.writeFile(path.join(CACHE_DIR, key), data),
    fsp.writeFile(path.join(CACHE_DIR, key + '.meta'), contentType),
  ]);
}

export const imgProxyRouter = Router();

const ALLOWED_HOSTS = new Set([
  'cdn.jmty.jp',
  'auc-pctr.c.yimg.jp',
  'auctions.c.yimg.jp',
  'wing-auctions.c.yimg.jp',
  'static.mercdn.net',
  'asset.fril.jp',
]);

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 10 * 1024 * 1024;

imgProxyRouter.get('/', async (req, res) => {
  const raw = String(req.query.url || '').trim();
  if (!raw) return res.status(400).send('missing url');
  let u;
  try { u = new URL(raw); } catch { return res.status(400).send('bad url'); }
  if (u.protocol !== 'https:') return res.status(400).send('https only');
  if (!ALLOWED_HOSTS.has(u.hostname)) return res.status(403).send('host not allowed');

  // 檢查 disk cache（未來 Sam 切 JP IP 抓過的圖永久可用）
  const cached = await getCached(raw);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('X-Cache', 'HIT');
    return res.end(cached.data);
  }

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // 每站帶對應 referer（避免 hotlinking 擋）
    const referer = getReferer(u.hostname);
    // Jimoty CDN 可能認用戶 session → 從 saved session 拉 cookie
    let cookieHeader = '';
    if (u.hostname === 'cdn.jmty.jp' || u.hostname.endsWith('jmty.jp')) {
      const state = await loadState('jimoty').catch(() => null);
      if (state) cookieHeader = toCookieHeader(state, 'jmty.jp');
    }
    const upstream = await fetch(raw, {
      signal: ctl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
        'Accept-Language': 'ja,en;q=0.8',
        ...(referer ? { Referer: referer } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!upstream.ok) {
      // 特別標明 Cloudflare geo-block（Jimoty CDN 對 TW IP 常見）
      const isCf = upstream.headers.get('server')?.includes('cloudflare');
      const hint = isCf && upstream.status === 403 ? ' cloudflare_geoblock' : '';
      return res.status(upstream.status).send(`upstream ${upstream.status}${hint}`);
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return res.status(502).send('not image');
    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > MAX_BYTES) return res.status(413).send('too large');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 天
    res.setHeader('X-Cache', 'MISS');
    // 收齊 buffer + 存 cache + 回傳（比 stream 略慢但可 cache）
    const chunks = [];
    const reader = upstream.body.getReader();
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { try { reader.cancel(); } catch {} break; }
      chunks.push(Buffer.from(value));
    }
    const buf = Buffer.concat(chunks);
    // 只 cache 成功的（>500 bytes 且是 image）
    if (buf.length > 500) saveCached(raw, buf, contentType).catch(() => {});
    res.end(buf);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).send('timeout');
    console.error('[img-proxy]', err.message);
    if (!res.headersSent) res.status(502).send('proxy failed');
  } finally {
    clearTimeout(t);
  }
});

function getReferer(host) {
  if (host === 'cdn.jmty.jp') return 'https://jmty.jp/';
  if (host.includes('yimg.jp')) return 'https://auctions.yahoo.co.jp/';
  if (host === 'static.mercdn.net') return 'https://jp.mercari.com/';
  if (host === 'asset.fril.jp') return 'https://fril.jp/';
  return null;
}
