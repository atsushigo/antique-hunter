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
  // Jimoty 收藏頁：href 相對或絕對；category 前綴可為 sale-/car- 等
  const anchorRe = /<a[^>]+href="(https:\/\/jmty\.jp)?(\/[^"\/]+\/[a-z]+-[^"\/]+\/article-[a-z0-9]+)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const path = m[2];
    const full = `https://jmty.jp${path}`;
    if (seen.has(full)) continue;
    seen.add(full);
    const start = m.index;
    const close = html.indexOf('</a>', start);
    // 標題：anchor 內第一個 <span>...</span> 文字
    const inner = close > 0 ? html.slice(start, close) : '';
    const titleM = inner.match(/<span[^>]*>([^<]{2,120})<\/span>/);
    // 價格 + 圖 + 狀態：往後找 2000 chars（同 row），往前 1500 chars（image 在上方兄弟）
    const forward = html.slice(start, start + 2000);
    const backward = html.slice(Math.max(0, start - 1500), start);
    // image 通常在 anchor 前方（同一個 row 的圖片欄）
    const imgM = backward.match(/<img[^>]+src="(https:\/\/cdn\.jmty\.jp\/articles\/images\/[^"]+)"[^>]*>(?![\s\S]*<img)/);
    const priceM = forward.match(/([\d,]+)\s*円/);
    const isSold = /受付終了|取引成立|募集終了/.test(backward + forward);

    items.push({
      sourceUrl: full,
      imageUrl: imgM ? imgM[1] : null,
      title: titleM ? decodeHtml(titleM[1].trim()) : null,
      priceJpy: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
      category: path.match(/\/([a-z]+)-[^\/]+\//)?.[1] || null, // sale / car
      region: path.match(/^\/([a-z]+)\//)?.[1] || null, // osaka / hyogo 等
      isSold,
    });
  }
  return items;
}

// ---------- 我的貼文 ----------
// Jimoty 沒有統一 inbox，改讀「我的貼文」— Sam 自己上架的物件
export async function listMyPosts() {
  const res = await fetchJmty('/my/posts');
  const html = await res.text();
  return parseMyPostsHtml(html);
}

function parseMyPostsHtml(html) {
  const posts = [];
  const seen = new Set();
  // /my/posts 是 table 布局，每 row 一個貼文
  // 抓 article URL + 標題 + 狀態 + 問い合わせ數 / お気に入り數
  const anchorRe = /<a[^>]+href="(https:\/\/jmty\.jp)?(\/[^"\/]+\/[a-z]+-[^"\/]+\/article-[a-z0-9]+)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const path = m[2];
    const full = `https://jmty.jp${path}`;
    if (seen.has(full)) continue;
    seen.add(full);

    const start = m.index;
    const close = html.indexOf('</a>', start);
    const inner = close > 0 ? html.slice(start, close) : '';
    const forward = html.slice(start, start + 3000);

    const titleM = inner.match(/>([^<]{3,120})</) || forward.match(/class=['"]p-item-title['"][\s\S]{0,80}?>([^<]{3,120})</);
    const priceM = forward.match(/<b>([\d,]+)\s*円<\/b>|([\d,]+)\s*円/);
    const price = priceM ? Number((priceM[1] || priceM[2]).replace(/,/g, '')) : null;
    const isClosed = /受付終了|取引成立/.test(forward);
    const inquiryM = forward.match(/問い合わせ数[^\d]{0,20}(\d+)/);
    const favM = forward.match(/お気に入り数[^\d]{0,20}(\d+)/);

    posts.push({
      sourceUrl: full,
      title: titleM ? decodeHtml(titleM[1].trim()) : null,
      priceJpy: Number.isFinite(price) && price > 0 ? price : null,
      isClosed,
      inquiryCount: inquiryM ? Number(inquiryM[1]) : 0,
      favoriteCount: favM ? Number(favM[1]) : 0,
      category: path.match(/\/([a-z]+)-[^\/]+\//)?.[1] || null,
      region: path.match(/^\/([a-z]+)\//)?.[1] || null,
    });
  }
  return posts;
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
