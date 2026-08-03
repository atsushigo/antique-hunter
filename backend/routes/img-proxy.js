// 圖片 proxy — Jimoty CDN 對 non-jmty.jp origin 回 403 hotlinking protection
// 讓瀏覽器 <img src="/api/img-proxy?url=..."> 走 backend 中繼，避免 CORS/referer 檢查
// 對 Jimoty 額外帶用戶 session cookies（cdn.jmty.jp 可能認 session）
import { Router } from 'express';
import { loadState, toCookieHeader } from '../auth/session-store.js';

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
    if (!upstream.ok) return res.status(upstream.status).send(`upstream ${upstream.status}`);
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return res.status(502).send('not image');
    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > MAX_BYTES) return res.status(413).send('too large');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 天
    // stream
    const reader = upstream.body.getReader();
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { try { reader.cancel(); } catch {} return res.end(); }
      res.write(Buffer.from(value));
    }
    res.end();
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
