// KSI（kankocho.jp）共用爬蟲邏輯 — Next.js RSC streams 解析
// 給 routes/auction-schedule.js（Calendar 用）+ cron.js（新輪次偵測用）共用

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CATEGORY_URL = {
  car: 'https://kankocho.jp/search/car/',
  'real-estate': 'https://kankocho.jp/search/real-estate/',
  general: 'https://kankocho.jp/search/',
};

// 拍賣 session 日期 cache — 同一 auctionId 全 items 共用日期
const sessionDatesCache = new Map(); // auctionId → { entryStart, entryEnd, bidStart, bidEnd, at }
const CACHE_TTL = 60 * 60 * 1000;

export async function extractSessionDates(sampleItemId) {
  try {
    const h = await fetch(`https://kankocho.jp/items/${sampleItemId}/`, {
      headers: { 'User-Agent': UA },
    }).then((r) => r.text());
    const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }
    const dates = [...full.matchAll(/2\d{3}年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分/g)].map((m) => {
      const yr = m[0].slice(0, 4);
      return `${yr}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')} ${String(m[3]).padStart(2, '0')}:${String(m[4]).padStart(2, '0')}`;
    });
    if (dates.length < 4) return null;
    return { entryStart: dates[0], entryEnd: dates[1], bidStart: dates[2], bidEnd: dates[3] };
  } catch { return null; }
}

export async function collectKsiSessions() {
  // 對 3 category 各抓一頁，收集所有 uniq auctionId + 政府名 category
  const sessions = new Map(); // auctionId → { category, sampleItemId, sampleGovernment, sampleTitle, categoryLabel }
  for (const [cat, url] of Object.entries(CATEGORY_URL)) {
    try {
      const h = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.text());
      const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
      let full = '';
      for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }
      const itemRe = /\{"id":(\d+),"auctionId":(\d+)/g;
      let m;
      while ((m = itemRe.exec(full))) {
        const iid = Number(m[1]);
        const aid = Number(m[2]);
        if (sessions.has(aid)) continue;
        const win = full.slice(m.index, m.index + 3000);
        const titleM = win.match(/"title":"((?:[^"\\]|\\.)*)"/);
        const govM = win.match(/"government":\s*\{[^}]*?"name":"([^"]+)"/);
        sessions.set(aid, {
          category: cat,
          sampleItemId: iid,
          sampleGovernment: govM ? govM[1] : '',
          sampleTitle: titleM ? titleM[1] : '',
          categoryLabel: cat === 'car' ? '車輛' : cat === 'real-estate' ? '不動產' : '一般',
        });
      }
    } catch (err) { console.warn('[ksi-scraper] collectKsiSessions', cat, err.message); }
  }
  return sessions;
}

// kankocho.jp/schedules/「年間スケジュール」— 比 collectKsiSessions 更可靠的資料源：
// 官方直接列出每一輪的完整時程（含還沒開放申込、還沒有物件上架的未來輪次），
// 每個時段旁邊「加入 Google Calendar」連結的 URL 裡藏著精確 UTC 時間戳記，
// 不用像逐物件爬蟲那樣從日文日期文字猜年份。
const UTC_DATE_RE = /dates=(\d{8}T\d{6}Z)\/(\d{8}T\d{6}Z)","target":"_blank","rel":"noopener noreferrer","className":"[^"]*","aria-label":"([^"]+)"/g;
const ROUND_TITLE_RE = /\["\$","div","([^"]+)",\{"className":"mb-6 flex"/g;
const STATUS_RE = /"children":"(オークション開催前|入札期間中|申込受付中)"/;

function utcToJst(raw) {
  // raw: "20261023T040000Z" → Date（UTC）→ +9h → "YYYY-MM-DD HH:mm"
  const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
  const h = raw.slice(9, 11), mi = raw.slice(11, 13), s = raw.slice(13, 15);
  const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  const jst = new Date(utc.getTime() + 9 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`;
}

export async function fetchAnnualSchedule() {
  try {
    const h = await fetch('https://kankocho.jp/schedules/', { headers: { 'User-Agent': UA } }).then((r) => r.text());
    const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }

    const titleMatches = [...full.matchAll(ROUND_TITLE_RE)];
    if (!titleMatches.length) return [];
    const rounds = [];
    for (let i = 0; i < titleMatches.length && i < 3; i++) {
      // 開催中のスケジュール區塊固定最多 3 筆（見官網「開催中のスケジュール」表格）；
      // 之後同樣的 div 樣式在頁面下方「月別」區塊會重複出現不同語意，用 titleMatches[3] 當右邊界避免混進去
      const start = titleMatches[i].index;
      const end = titleMatches[i + 1] ? titleMatches[i + 1].index : (titleMatches[3] ? titleMatches[3].index : start + 4000);
      const seg = full.slice(start, end);
      const statusM = seg.match(STATUS_RE);
      const periods = [...seg.matchAll(UTC_DATE_RE)].map((m) => ({
        label: m[3].replace(/をGoogleカレンダーに追加$/, ''),
        startJst: utcToJst(m[1]),
        endJst: utcToJst(m[2]),
      }));
      if (!periods.length) continue;
      rounds.push({ title: titleMatches[i][1], statusLabel: statusM ? statusM[1] : '', periods });
    }
    return rounds;
  } catch (err) {
    console.warn('[ksi-scraper] fetchAnnualSchedule', err.message);
    return [];
  }
}

// 回傳所有目前可見的 session，含日期（用 cache 避免重複打 KSI）
export async function collectKsiSessionsWithDates() {
  const sessions = await collectKsiSessions();
  const out = [];
  for (const [aid, meta] of sessions) {
    const cached = sessionDatesCache.get(aid);
    let dates = cached && Date.now() - cached.at < CACHE_TTL ? cached : null;
    if (!dates) {
      const d = await extractSessionDates(meta.sampleItemId);
      if (!d) continue;
      dates = { ...d, at: Date.now() };
      sessionDatesCache.set(aid, dates);
    }
    out.push({ auctionId: aid, ...meta, ...dates });
  }
  return out;
}
