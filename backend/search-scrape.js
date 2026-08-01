// 站內搜尋 scraper
// - Yahoo Auction + Jimoty：SSR，純 HTTP 直接抓
// - Mercari + Rakuma：SPA，走 Playwright headless chromium

import { withPage } from './browser.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 4 * 1024 * 1024;

// 站內搜尋只啟用 SSR 站別（純 HTTP 快）；Mercari/Rakuma 是 SPA 要 Playwright，效能考量停用
// URL 貼上估價仍支援 4 站（那走 og:tag 純 HTTP，不需 Playwright）
export const SEARCH_SITES = ['yahoo_auction', 'jimoty'];
export const SITE_LABELS = {
  yahoo_auction: 'Yahoo Auction',
  jimoty: 'Jimoty',
  mercari: 'Mercari',
  rakuma: 'Rakuma',
};

export const ALL_SITES_META = [
  { id: 'yahoo_auction', label: 'Yahoo Auction', supported: true },
  { id: 'jimoty', label: 'Jimoty', supported: true },
  {
    id: 'mercari',
    label: 'Mercari',
    supported: false,
    reason: '站內搜尋需 Playwright（SPA），效能考量停用。URL 貼上估價仍可用。',
  },
  {
    id: 'rakuma',
    label: 'Rakuma',
    supported: false,
    reason: '站內搜尋需 Playwright（SPA），效能考量停用。URL 貼上估價仍可用。',
  },
];

const SEARCH_URL = {
  yahoo_auction: (q) => `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(q)}&s1=new`,
  // Jimoty：/all/sale + /all/car 兩個都抓（物件 + 車輛都涵蓋）
  jimoty: (q) => [
    `https://jmty.jp/all/sale?keyword=${encodeURIComponent(q)}`,
    `https://jmty.jp/all/car?keyword=${encodeURIComponent(q)}`,
  ],
  mercari: (q) => `https://jp.mercari.com/search?keyword=${encodeURIComponent(q)}&sort=created_time&order=desc&status=on_sale`,
  rakuma: (q) => `https://fril.jp/s?query=${encodeURIComponent(q)}`,
};

// 各站已售出/已終了關鍵字 pattern
const SOLD_PATTERNS = /SOLD\s*OUT|SOLD|売切|売り切|売却済|取引済|取引成立|募集終了|終了|落札済/i;

const HTTP_PARSERS = {
  yahoo_auction: parseYahooAuction,
  jimoty: parseJimoty,
};
const BROWSER_SCRAPERS = {
  mercari: scrapeMercariBrowser,
  rakuma: scrapeRakumaBrowser,
};

export class ScrapeError extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

async function fetchHtml(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.8',
      },
    });
    if (!res.ok) throw new ScrapeError('http_error', `${res.status}`);
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { try { reader.cancel(); } catch {} throw new ScrapeError('too_large', `>${MAX_BYTES}b`); }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
  } catch (err) {
    if (err instanceof ScrapeError) throw err;
    if (err.name === 'AbortError') throw new ScrapeError('timeout', `>${TIMEOUT_MS}ms`);
    throw new ScrapeError('fetch_failed', err.message);
  } finally {
    clearTimeout(t);
  }
}

export async function searchSite(site, keyword) {
  if (!SEARCH_SITES.includes(site)) {
    throw new ScrapeError('unsupported_site', site);
  }
  const urlOrList = SEARCH_URL[site](keyword);
  const urls = Array.isArray(urlOrList) ? urlOrList : [urlOrList];

  if (HTTP_PARSERS[site]) {
    const seen = new Set();
    const items = [];
    for (const u of urls) {
      const html = await fetchHtml(u);
      for (const it of HTTP_PARSERS[site](html)) {
        if (!it.sourceUrl || seen.has(it.sourceUrl)) continue;
        seen.add(it.sourceUrl);
        items.push(it);
      }
    }
    return { site, keyword, url: urls.join(' + '), items };
  }
  if (BROWSER_SCRAPERS[site]) {
    const items = await BROWSER_SCRAPERS[site](urls[0]);
    return { site, keyword, url: urls[0], items };
  }
  throw new ScrapeError('no_parser', site);
}

// ---------- Yahoo Auction ----------
function parseYahooAuction(html) {
  const items = [];
  const seen = new Set();
  const anchorRe = /<a\b([^>]*?data-auction-img[^>]*?)>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const attrs = m[1];
    const href = matchAttr(attrs, 'href');
    if (!href || !/^https:\/\/auctions\.yahoo\.co\.jp\/jp\/auction\/[a-z0-9]+/.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const img = matchAttr(attrs, 'data-auction-img');
    const priceStr = matchAttr(attrs, 'data-auction-price');
    const price = priceStr ? Number(priceStr.replace(/[^\d]/g, '')) : null;

    const blockEnd = html.indexOf('</a>', m.index);
    const block = blockEnd > 0 ? html.slice(m.index, blockEnd) : html.slice(m.index, m.index + 2000);
    // 卡片外殼有時秀「落札済み」/ 「終了」
    const outerBlock = html.slice(m.index, m.index + 3000);
    if (SOLD_PATTERNS.test(outerBlock)) continue;

    const title = matchAttr(block, 'alt') || matchAttr(block, 'aria-label') || null;

    items.push({
      sourceUrl: href.split('?')[0],
      imageUrl: cleanImgUrl(img),
      title: title ? decodeHtml(title).trim().slice(0, 200) : null,
      priceJpy: Number.isFinite(price) ? price : null,
      raw: null,
    });
  }
  return items;
}

// ---------- Jimoty ----------
// 通用 parser：sale-* / car-* / 其他 category 都吃；含 absolute + relative URL
function parseJimoty(html) {
  const items = [];
  const seen = new Set();
  const anchorRe = /<a[^>]+href="(https:\/\/jmty\.jp)?(\/[^"\/]+\/[a-z]+-[^"\/]+\/article-[a-z0-9]+)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const path = m[2];
    const full = `https://jmty.jp${path}`;
    if (seen.has(full)) continue;
    seen.add(full);

    const start = m.index;
    const close = html.indexOf('</a>', start);
    const innerBlock = close > 0 ? html.slice(start, close) : html.slice(start, start + 3000);
    const priceBlock = html.slice(start, start + 4000);

    if (SOLD_PATTERNS.test(priceBlock)) continue;

    // 圖：inner 或 forward 都掃
    const imgMatch = (innerBlock + priceBlock).match(/<img[^>]+src="(https:\/\/cdn\.jmty\.jp\/articles\/images\/[^"]+)"/i);
    // 標題：img alt 優先；否則 anchor 內 text；否則後段 p-item-title 內文字
    let title = matchAttr(innerBlock, 'alt');
    if (!title) {
      const spanM = innerBlock.match(/<[^>]+>([^<]{3,120})</);
      if (spanM) title = spanM[1];
    }
    if (!title) {
      const titleAnchor = priceBlock.match(/class=['"]p-item-title['"][\s\S]{0,50}?<a[^>]*>([^<]{3,120})</);
      if (titleAnchor) title = titleAnchor[1];
    }

    // 價格：優先找 <b>XX,XXX円</b>（車頁）、再退 XX,XXX 円
    let priceJpy = null;
    let priceLabel = null;
    const boldPriceM = priceBlock.match(/<b>([\d,]+)\s*円<\/b>/);
    const anyPriceM = priceBlock.match(/([\d,]+)\s*円/);
    const pm = boldPriceM || anyPriceM;
    if (pm) {
      const n = Number(pm[1].replace(/,/g, ''));
      if (Number.isFinite(n) && n < 100_000_000) priceJpy = n;
    } else if (/無料/.test(priceBlock)) {
      priceJpy = 0;
      priceLabel = '無料';
    }

    items.push({
      sourceUrl: full,
      imageUrl: imgMatch ? imgMatch[1] : null,
      title: title ? decodeHtml(title).trim().slice(0, 200) : null,
      priceJpy,
      priceLabel,
      raw: null,
    });
  }
  return items;
}

// ---------- Mercari (Playwright) ----------
async function scrapeMercariBrowser(url) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('a[href*="/item/"]', { timeout: 12_000 });
    } catch {
      return [];
    }
    const items = await page.evaluate(() => {
      const nodes = document.querySelectorAll('a[href*="/item/"]');
      const seen = new Set();
      const out = [];
      const soldRe = /SOLD/i;
      for (const a of nodes) {
        const href = a.getAttribute('href');
        if (!href) continue;
        const idM = href.match(/\/item\/(m[a-z0-9]+)/i);
        if (!idM) continue;
        const id = idM[1];
        if (seen.has(id)) continue;
        seen.add(id);
        // 過濾 SOLD sticker（保底，URL param status=on_sale 已擋大部分）
        const inner = a.innerText || '';
        const soldEl = a.querySelector('[class*="sold"], [class*="Sold"], [data-testid*="sold"]');
        if (soldEl || soldRe.test(inner)) continue;

        const thumb = a.querySelector('[role="img"][aria-label]');
        const img = a.querySelector('img');
        const aria = thumb?.getAttribute('aria-label') || '';
        const pm = aria.match(/([\d,]+)\s*円\s*$/);
        const priceJpy = pm ? Number(pm[1].replace(/,/g, '')) : null;
        const title = aria.replace(/の画像\s*[\d,]+\s*円\s*$/, '').trim() || null;
        out.push({
          id,
          sourceUrl: `https://jp.mercari.com/item/${id}`,
          imageUrl: img?.getAttribute('src') || null,
          title,
          priceJpy: Number.isFinite(priceJpy) ? priceJpy : null,
        });
      }
      return out;
    });
    return items.map(({ id, ...rest }) => rest);
  }, { timeoutMs: 20_000 });
}

// ---------- Rakuma (Playwright) ----------
async function scrapeRakumaBrowser(url) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('.item a[href*="fril.jp"]', { timeout: 12_000 });
    } catch {
      return [];
    }
    // 讓 lazy image 有機會載入
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.item');
      const seen = new Set();
      const out = [];
      for (const card of cards) {
        const a = card.querySelector('a[href*="fril.jp"]');
        if (!a) continue;
        const href = a.getAttribute('href');
        if (!href || seen.has(href)) continue;
        seen.add(href);
        // 過濾 SOLD OUT ribbon
        if (card.querySelector('.item-box__soldout_ribbon, [class*="soldout"], [class*="SoldOut"]')) continue;
        const img = card.querySelector('img');
        // 圖片：優先 real src；若還是 dummy，看 data-src / data-original
        let imgSrc = img?.getAttribute('src') || null;
        if (imgSrc && imgSrc.includes('item_square_dummy')) {
          imgSrc = img?.getAttribute('data-src') || img?.getAttribute('data-original') || imgSrc;
        }
        const alt = img?.getAttribute('alt') || null;
        const priceEl = card.querySelector('.item-box__item-price') || card.querySelector('[class*=price]');
        const priceTxt = priceEl?.textContent?.trim() || '';
        const pm = priceTxt.match(/([\d,]+)/);
        const priceJpy = pm ? Number(pm[1].replace(/,/g, '')) : null;
        out.push({
          sourceUrl: href.split('?')[0],
          imageUrl: imgSrc && !imgSrc.includes('item_square_dummy') ? imgSrc : null,
          title: alt ? alt.slice(0, 200) : null,
          priceJpy: Number.isFinite(priceJpy) && priceJpy > 0 ? priceJpy : null,
        });
      }
      return out;
    });
    return items;
  }, { timeoutMs: 20_000 });
}

// ---------- helpers ----------
function matchAttr(str, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i');
  const m = str.match(re);
  return m ? m[1] : null;
}
function cleanImgUrl(url) {
  if (!url) return null;
  // Yahoo Auction 縮圖 URL 有一堆 fallback param，取 base
  return url.split('?')[0];
}
function decodeHtml(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
