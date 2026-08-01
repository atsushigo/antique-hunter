// Jimoty 授權後動作：讀收藏 / 讀訊息 / 打稿送訊息
// 用 fetch + Cookie header（不需 Playwright，快）

import { loadState, toCookieHeader } from '../auth/session-store.js';
import { getSite } from '../auth/sites.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class AuthError extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

async function fetchJmty(pathOrUrl, opts = {}) {
  const state = await loadState('jimoty');
  if (!state) throw new AuthError('not_logged_in', '請先跑 npm run auth:login jimoty');
  const site = getSite('jimoty');
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${site.baseUrl}${pathOrUrl}`;
  const cookie = toCookieHeader(state, 'jmty.jp');
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: {
      Cookie: cookie,
      'User-Agent': UA,
      'Accept-Language': 'ja,en;q=0.8',
      ...(opts.headers || {}),
    },
    body: opts.body,
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location') || '';
    if (loc.includes('/login')) throw new AuthError('session_expired', 'session 過期，請重跑 npm run auth:login jimoty');
    // 其他 redirect（正常導向）→ follow 一次
    return fetch(loc.startsWith('http') ? loc : `${site.baseUrl}${loc}`, {
      headers: { Cookie: cookie, 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' },
    });
  }
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res;
}

// ---------- 收藏 ----------
export async function listFavorites() {
  const res = await fetchJmty('/my/favorite_article_references');
  const html = await res.text();
  return parseFavoritesHtml(html);
}

function parseFavoritesHtml(html) {
  const items = [];
  const seen = new Set();
  const anchorRe = /<a[^>]+href="(https:\/\/jmty\.jp\/[^"\/]+\/sale[^"\/]+\/article-[a-z0-9]+)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);
    const start = m.index;
    const close = html.indexOf('</a>', start);
    const inner = close > 0 ? html.slice(start, close) : html.slice(start, start + 3000);
    const outer = html.slice(start, start + 4000);
    const imgM = inner.match(/<img[^>]+src="(https:\/\/cdn\.jmty\.jp\/articles\/images\/[^"]+)"/i);
    const altM = inner.match(/alt="([^"]+)"/i);
    const priceM = outer.match(/([\d,]+)\s*円/);
    items.push({
      sourceUrl: href,
      imageUrl: imgM ? imgM[1] : null,
      title: altM ? decodeHtml(altM[1]) : null,
      priceJpy: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
    });
  }
  return items;
}

// ---------- 訊息列表 ----------
export async function listThreads() {
  const res = await fetchJmty('/my/messages');
  const html = await res.text();
  return parseThreadsHtml(html);
}

function parseThreadsHtml(html) {
  const threads = [];
  const seen = new Set();
  // Jimoty 訊息 thread URL 格式（保守 guess）：/my/messages/{id}
  const anchorRe = /<a[^>]+href="(\/my\/messages\/(\d+)(?:[^"]*)?)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const start = m.index;
    const close = html.indexOf('</a>', start);
    const inner = close > 0 ? html.slice(start, close) : html.slice(start, start + 2000);
    // 保守：整段文字 collapse 為 preview
    const preview = inner
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    threads.push({
      id,
      url: `https://jmty.jp${href}`,
      preview,
    });
  }
  return threads;
}

// ---------- 單一 thread 詳情 ----------
export async function getThread(id) {
  const res = await fetchJmty(`/my/messages/${id}`);
  const html = await res.text();
  return parseThreadHtml(html, id);
}

function parseThreadHtml(html, id) {
  // 抓 CSRF token（reply 用）
  const csrfM = html.match(/<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/i);
  // 找 reply form action
  const formM = html.match(/<form[^>]+action="([^"]+)"[^>]+method="post"/i);
  const formAction = formM ? formM[1] : null;
  // 訊息主體文字（粗略：抓所有明顯 message bubble class）
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    id,
    csrfToken: csrfM ? csrfM[1] : null,
    formAction,
    bodyPreview: bodyText.slice(0, 2000),
    rawHtmlSize: html.length,
  };
}

// ---------- 送訊息 ----------
export async function replyThread(id, body) {
  if (!body || typeof body !== 'string' || !body.trim()) {
    throw new Error('empty_body');
  }
  const thread = await getThread(id);
  if (!thread.csrfToken || !thread.formAction) {
    throw new Error('cannot_locate_form: 頁面結構可能已變，需人工檢視 raw HTML');
  }
  const formData = new URLSearchParams();
  formData.set('authenticity_token', thread.csrfToken);
  formData.set('message[body]', body.trim());

  const res = await fetchJmty(thread.formAction, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-Token': thread.csrfToken,
      Origin: 'https://jmty.jp',
      Referer: `https://jmty.jp/my/messages/${id}`,
    },
    body: formData.toString(),
  });
  return { ok: res.ok, status: res.status };
}

// ---------- debug: 抓 raw HTML 給前端看（scope 決策：只 preview 前 5KB）----------
export async function fetchRaw(pathOrUrl) {
  const res = await fetchJmty(pathOrUrl);
  const html = await res.text();
  return { url: pathOrUrl, size: html.length, preview: html.slice(0, 5000) };
}

function decodeHtml(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
