// 站內搜尋 scraper — Yahoo Auction + Jimoty（Mercari 是 SPA 無 SSR，需 Playwright，暫不支援）
// 給 keyword 每日 cron 用；也給即時搜尋用

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 4 * 1024 * 1024;

export const SEARCH_SITES = ['yahoo_auction', 'jimoty'];
export const SITE_LABELS = {
  yahoo_auction: 'Yahoo Auction',
  jimoty: 'Jimoty',
};

const SEARCH_URL = {
  yahoo_auction: (q) => `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(q)}&s1=new`,
  jimoty: (q) => `https://jmty.jp/all/sale?keyword=${encodeURIComponent(q)}`,
};

const PARSERS = {
  yahoo_auction: parseYahooAuction,
  jimoty: parseJimoty,
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
  const url = SEARCH_URL[site](keyword);
  const html = await fetchHtml(url);
  const items = PARSERS[site](html);
  return { site, keyword, url, items };
}

// ---------- Yahoo Auction ----------
function parseYahooAuction(html) {
  const items = [];
  const seen = new Set();
  // 每個商品是一個 <a> tag 含 data-auction-* 屬性 + href
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

    // 找 title：從此 <a> 開始的區塊裡取 img alt 或 aria-label
    const blockEnd = html.indexOf('</a>', m.index);
    const block = blockEnd > 0 ? html.slice(m.index, blockEnd) : html.slice(m.index, m.index + 2000);
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
function parseJimoty(html) {
  const items = [];
  const seen = new Set();
  // Jimoty 商品連結：<a href="https://jmty.jp/{region}/sale-*/article-xxx">
  const anchorRe = /<a[^>]+href="(https:\/\/jmty\.jp\/[^"\/]+\/sale[^"\/]+\/article-[a-z0-9]+)"[^>]*>/gi;
  let m;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);

    // 從 anchor 往後：抓 img/alt 用 <a>..</a> 內容；抓 price 用更大範圍（卡片外殼常在 </a> 之後）
    const start = m.index;
    const close = html.indexOf('</a>', start);
    const innerBlock = close > 0 ? html.slice(start, close) : html.slice(start, start + 3000);
    const priceBlock = html.slice(start, start + 3000); // 含 </a> 之後的價格區

    const imgMatch = innerBlock.match(/<img[^>]+src="(https:\/\/cdn\.jmty\.jp\/articles\/images\/[^"]+)"/i);
    const image = imgMatch ? imgMatch[1] : null;
    const alt = matchAttr(innerBlock, 'alt');

    let priceJpy = null;
    let priceLabel = null;
    const priceM = priceBlock.match(/([\d,]+)\s*円/);
    if (priceM) {
      const n = Number(priceM[1].replace(/,/g, ''));
      if (Number.isFinite(n) && n < 100_000_000) priceJpy = n;
    } else if (/無料/.test(priceBlock)) {
      priceJpy = 0;
      priceLabel = '無料';
    }

    items.push({
      sourceUrl: href,
      imageUrl: image,
      title: alt ? decodeHtml(alt).trim().slice(0, 200) : null,
      priceJpy,
      priceLabel,
      raw: null,
    });
  }
  return items;
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
