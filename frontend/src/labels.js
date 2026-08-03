// 站別 + 地區 label 共用 util（給 UrlAppraisalView / AppraisalResult / CollectionView 用）

const HOST_LABEL = {
  'jp.mercari.com': 'Mercari',
  'mercari.com': 'Mercari',
  'mercari.jp': 'Mercari',
  'page.auctions.yahoo.co.jp': 'Yahoo Auction',
  'auctions.yahoo.co.jp': 'Yahoo Auction',
  'fril.jp': 'Rakuma',
  'jmty.jp': 'Jimoty',
};

const JIMOTY_REGIONS = {
  all: '全国',
  hokkaido: '北海道', aomori: '青森', iwate: '岩手', miyagi: '宮城',
  akita: '秋田', yamagata: '山形', fukushima: '福島',
  ibaraki: '茨城', tochigi: '栃木', gunma: '群馬', saitama: '埼玉',
  chiba: '千葉', tokyo: '東京', kanagawa: '神奈川',
  niigata: '新潟', toyama: '富山', ishikawa: '石川', fukui: '福井',
  yamanashi: '山梨', nagano: '長野', gifu: '岐阜', shizuoka: '静岡', aichi: '愛知',
  mie: '三重', shiga: '滋賀', kyoto: '京都', osaka: '大阪',
  hyogo: '兵庫', nara: '奈良', wakayama: '和歌山',
  tottori: '鳥取', shimane: '島根', okayama: '岡山', hiroshima: '広島', yamaguchi: '山口',
  tokushima: '徳島', kagawa: '香川', ehime: '愛媛', kochi: '高知',
  fukuoka: '福岡', saga: '佐賀', nagasaki: '長崎', kumamoto: '熊本',
  oita: '大分', miyazaki: '宮崎', kagoshima: '鹿児島', okinawa: '沖縄',
};

export function hostLabel(host) {
  return HOST_LABEL[host] || host || '—';
}

// 從 Jimoty URL 抽地區（其他站回 null）
export function regionOf(host, sourceUrl) {
  if (host !== 'jmty.jp' || !sourceUrl) return null;
  try {
    const u = new URL(sourceUrl);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return JIMOTY_REGIONS[seg] || null;
  } catch {
    return null;
  }
}

// 組合：Mercari · 大阪（Jimoty 有地區時）
export function siteBadge(host, sourceUrl) {
  const label = hostLabel(host);
  const region = regionOf(host, sourceUrl);
  return region ? `${label} · ${region}` : label;
}

// 有些 CDN 有 hotlink protection（Jimoty 的 cdn.jmty.jp 對 非-jmty 來源 403）
// 過走 backend /api/img-proxy 中繼；proxy 有 host 白名單
const PROXY_HOSTS = ['cdn.jmty.jp', 'auc-pctr.c.yimg.jp', 'auctions.c.yimg.jp', 'wing-auctions.c.yimg.jp', 'asset.fril.jp'];
export function proxiedImg(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (PROXY_HOSTS.includes(u.hostname)) {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      return `${base}/img-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  } catch { return url; }
}
