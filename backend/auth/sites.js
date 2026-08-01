// 每個站別的登入設定：登入頁 URL、判定登入成功的 URL pattern、後續 base URL、CSRF token 抓法
// 加新站別只要加一筆 config

export const SITES = {
  jimoty: {
    id: 'jimoty',
    label: 'Jimoty',
    loginUrl: 'https://jmty.jp/login',
    // 登入成功後會導到非 /login 頁；waitForURL 用這個判定
    loggedInWhen: (url) => !url.includes('/login'),
    // 檢查 session 還活著：GET 這個 URL 若拿到 200 且含 loggedInMarker 表 OK
    statusUrl: 'https://jmty.jp/my/mypage',
    loggedInMarker: /ログアウト|my\/mypage|マイページ/,
    baseUrl: 'https://jmty.jp',
    csrfSelector: 'meta[name="csrf-token"]', // Rails 常見
  },
  mercari: {
    id: 'mercari',
    label: 'Mercari',
    loginUrl: 'https://jp.mercari.com/login',
    loggedInWhen: (url) => url.includes('mypage') || (!url.includes('/login') && !url.includes('/signup')),
    statusUrl: 'https://jp.mercari.com/mypage',
    loggedInMarker: /ログアウト|マイページ/,
    baseUrl: 'https://jp.mercari.com',
    csrfSelector: null, // Mercari 用 API + auth header，此欄位視 action 需要再處理
  },
  rakuma: {
    id: 'rakuma',
    label: 'Rakuma',
    loginUrl: 'https://fril.jp/users/sign_in',
    loggedInWhen: (url) => !url.includes('/sign_in'),
    statusUrl: 'https://fril.jp/mypage',
    loggedInMarker: /ログアウト|マイページ/,
    baseUrl: 'https://fril.jp',
    csrfSelector: 'meta[name="csrf-token"]',
  },
  yahoo_auction: {
    id: 'yahoo_auction',
    label: 'Yahoo Auction',
    loginUrl: 'https://login.yahoo.co.jp/config/login?.src=auc',
    loggedInWhen: (url) => url.includes('auctions.yahoo.co.jp') && !url.includes('login'),
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
