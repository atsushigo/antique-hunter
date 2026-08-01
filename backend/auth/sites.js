// 每個站別的登入設定：登入頁 URL、判定登入成功的 URL pattern、後續 base URL、CSRF token 抓法
// 加新站別只要加一筆 config

export const SITES = {
  jimoty: {
    id: 'jimoty',
    label: 'Jimoty',
    cookieDomain: 'jmty.jp',
    loginUrl: 'https://jmty.jp/login',
    // 登入成功偵測：URL 必須是 jmty.jp 且不在任何登入/註冊/OAuth 路徑
    // Jimoty 用 Rails Devise，`/users/sign_in`、`/users/sign_up`、`/users/password`、`/users/auth/*` 都是未登入
    loggedInWhen: (url) => {
      if (!url.startsWith('https://jmty.jp')) return false;
      try {
        const p = new URL(url).pathname;
        if (/^\/(login|logout|users\/(sign_in|sign_up|password|confirmation|auth))/.test(p)) return false;
        return true;
      } catch { return false; }
    },
    // /my/mypage 不存在，/my/posts 是登入後可訪問頁；未登入會 redirect 到 /users/sign_in
    statusUrl: 'https://jmty.jp/my/posts',
    loggedInMarker: /投稿管理|お気に入り|ログアウト|マイページ/,
    baseUrl: 'https://jmty.jp',
    csrfSelector: 'meta[name="csrf-token"]',
  },
  mercari: {
    id: 'mercari',
    label: 'Mercari',
    cookieDomain: 'jp.mercari.com',
    loginUrl: 'https://jp.mercari.com/login',
    loggedInWhen: (url) => {
      if (!url.startsWith('https://jp.mercari.com')) return false;
      try {
        const p = new URL(url).pathname;
        if (/^\/(login|signup|signin|password|auth)/.test(p)) return false;
        return true;
      } catch { return false; }
    },
    statusUrl: 'https://jp.mercari.com/mypage',
    loggedInMarker: /ログアウト|マイページ|logout/i,
    baseUrl: 'https://jp.mercari.com',
    csrfSelector: null,
  },
  rakuma: {
    id: 'rakuma',
    label: 'Rakuma',
    cookieDomain: 'fril.jp',
    loginUrl: 'https://fril.jp/users/sign_in',
    loggedInWhen: (url) => {
      if (!url.startsWith('https://fril.jp') && !url.startsWith('https://item.fril.jp')) return false;
      try {
        const p = new URL(url).pathname;
        if (/^\/users\/(sign_in|sign_up|password|confirmation|auth)/.test(p)) return false;
        return true;
      } catch { return false; }
    },
    statusUrl: 'https://fril.jp/mypage',
    loggedInMarker: /ログアウト|マイページ/,
    baseUrl: 'https://fril.jp',
    csrfSelector: 'meta[name="csrf-token"]',
  },
  yahoo_auction: {
    id: 'yahoo_auction',
    label: 'Yahoo Auction',
    cookieDomain: 'yahoo.co.jp',
    loginUrl: 'https://login.yahoo.co.jp/config/login?.src=auc',
    loggedInWhen: (url) => {
      // Yahoo 登入完會導到 auctions.yahoo.co.jp 且非 login domain
      if (url.includes('login.yahoo.co.jp')) return false;
      return url.includes('auctions.yahoo.co.jp');
    },
    statusUrl: 'https://auctions.yahoo.co.jp/user/jp/show/mystatus',
    loggedInMarker: /ログアウト|マイオク/,
    baseUrl: 'https://auctions.yahoo.co.jp',
    csrfSelector: null,
  },
};

export function getSite(id) {
  const s = SITES[id];
  if (!s) throw new Error(`unknown site: ${id}`);
  return s;
}
