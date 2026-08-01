// 從二手商品頁面（Mercari / Yahoo Auction / Rakuma）抓 og metadata + 商品圖 + 掛牌價
// SSRF 保護：域名白名單 + HTTPS only + 圖片大小/timeout 上限

const ALLOWED_HOSTS = new Set([
  'jp.mercari.com',
  'mercari.com',
  'mercari.jp',
  'page.auctions.yahoo.co.jp',
  'auctions.yahoo.co.jp',
  'fril.jp', // ラクマ
]);

const HOST_LABEL = {
  'jp.mercari.com': 'Mercari',
  'mercari.com': 'Mercari',
  'mercari.jp': 'Mercari',
  'page.auctions.yahoo.co.jp': 'Yahoo Auction',
  'auctions.yahoo.co.jp': 'Yahoo Auction',
  'fril.jp': 'Rakuma',
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const HTML_TIMEOUT_MS = 10_000;
const IMG_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8MB

export class UrlFetchError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function parseAndValidateUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new UrlFetchError('invalid_url', 'URL 格式錯誤');
  }
  if (u.protocol !== 'https:') {
    throw new UrlFetchError('invalid_scheme', '僅接受 HTTPS URL');
  }
  if (!ALLOWED_HOSTS.has(u.hostname)) {
    throw new UrlFetchError(
      'domain_not_supported',
      `不支援 ${u.hostname}，目前僅：Mercari / Yahoo Auction / Rakuma`
    );
  }
  return { url: u, host: u.hostname, siteLabel: HOST_LABEL[u.hostname] };
}

async function fetchWithLimits(url, { timeoutMs, maxBytes, accept }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: accept,
        'Accept-Language': 'ja,en;q=0.8',
      },
    });
    if (!res.ok) {
      throw new UrlFetchError('fetch_failed', `來源回應 ${res.status}`, 502);
    }
    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > maxBytes) {
      throw new UrlFetchError('payload_too_large', `內容超過 ${Math.floor(maxBytes / 1024 / 1024)}MB`, 413);
    }
    // 邊讀邊防超額
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        try { reader.cancel(); } catch {}
        throw new UrlFetchError('payload_too_large', `內容超過 ${Math.floor(maxBytes / 1024 / 1024)}MB`, 413);
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { buffer: buf, contentType: res.headers.get('content-type') || '' };
  } catch (err) {
    if (err instanceof UrlFetchError) throw err;
    if (err.name === 'AbortError') {
      throw new UrlFetchError('fetch_timeout', '來源網站無回應（timeout）', 504);
    }
    throw new UrlFetchError('fetch_failed', err.message || 'fetch failed', 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMetadata(url) {
  const { buffer } = await fetchWithLimits(url, {
    timeoutMs: HTML_TIMEOUT_MS,
    maxBytes: MAX_HTML_BYTES,
    accept: 'text/html,application/xhtml+xml',
  });
  const html = buffer.toString('utf-8');
  return extractMetadata(html);
}

// 從 HTML 抓 og:*、JSON-LD、常見價格 pattern
export function extractMetadata(html) {
  const meta = {};

  // OpenGraph
  for (const [prop, key] of [
    ['og:image', 'image'],
    ['og:title', 'title'],
    ['og:description', 'description'],
    ['og:site_name', 'siteName'],
    ['og:url', 'canonicalUrl'],
    ['product:price:amount', 'ogPriceAmount'],
    ['product:price:currency', 'ogPriceCurrency'],
  ]) {
    const re = new RegExp(
      `<meta[^>]+property=["']${escapeRe(prop)}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const m = html.match(re) || html.match(reverseAttrOrder(prop));
    if (m) meta[key] = decodeHtml(m[1]);
  }

  // <title> fallback
  if (!meta.title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) meta.title = decodeHtml(m[1].trim());
  }

  // JSON-LD Product
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node['@type'] === 'Product' || (Array.isArray(node['@type']) && node['@type'].includes('Product'))) {
          meta.jsonldName = node.name || meta.jsonldName;
          meta.jsonldDescription = node.description || meta.jsonldDescription;
          if (node.image) {
            meta.jsonldImage = Array.isArray(node.image) ? node.image[0] : node.image;
          }
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          if (offers) {
            meta.jsonldPrice = offers.price ? Number(offers.price) : meta.jsonldPrice;
            meta.jsonldCurrency = offers.priceCurrency || meta.jsonldCurrency;
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // 融合
  const title = meta.jsonldName || meta.title || null;
  const description = meta.jsonldDescription || meta.description || null;
  const image = meta.jsonldImage || meta.image || null;

  let listedPriceJpy = null;
  const isJpy =
    !meta.jsonldCurrency ||
    meta.jsonldCurrency === 'JPY' ||
    meta.ogPriceCurrency === 'JPY' ||
    !meta.ogPriceCurrency;
  const rawPrice =
    Number.isFinite(meta.jsonldPrice) ? meta.jsonldPrice :
    Number.isFinite(+meta.ogPriceAmount) ? +meta.ogPriceAmount :
    null;
  if (rawPrice != null && isJpy) {
    listedPriceJpy = Math.floor(rawPrice);
  } else {
    // fallback：從描述抓 ¥xxx,xxx 或 XX,XXX円
    listedPriceJpy = extractYenFromText(`${title || ''} ${description || ''}`);
  }

  return {
    title: title ? cleanText(title, 200) : null,
    description: description ? cleanText(description, 500) : null,
    imageUrl: image || null,
    listedPriceJpy,
    siteName: meta.siteName || null,
    canonicalUrl: meta.canonicalUrl || null,
  };
}

export async function fetchImage(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlFetchError('invalid_image_url', '商品圖片 URL 異常');
  }
  if (parsed.protocol !== 'https:') {
    throw new UrlFetchError('invalid_image_url', '商品圖片必須為 HTTPS');
  }
  // 商品圖 CDN 通常在其他 host（e.g. static.mercdn.net），不強制白名單，只擋非 https
  const { buffer, contentType } = await fetchWithLimits(url, {
    timeoutMs: IMG_TIMEOUT_MS,
    maxBytes: MAX_IMG_BYTES,
    accept: 'image/*',
  });
  if (!contentType.startsWith('image/')) {
    throw new UrlFetchError('invalid_image', `商品圖回應非 image (${contentType})`, 502);
  }
  return buffer;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function reverseAttrOrder(prop) {
  // 也支援 <meta content="..." property="og:*">
  return new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRe(prop)}["']`,
    'i'
  );
}
function decodeHtml(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function cleanText(s, max) {
  return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
}
function extractYenFromText(text) {
  if (!text) return null;
  // 匹配 ¥1,234 / ¥ 1234 / 1,234円 / 1234 円
  const m = text.match(/(?:¥|￥)\s*([\d,]+)|([\d,]+)\s*円/);
  if (!m) return null;
  const digits = (m[1] || m[2] || '').replace(/,/g, '');
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return n;
}
