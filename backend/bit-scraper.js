// BIT 不動産競売物件情報サイト（裁判所法拍屋）— 各裁判所的「年間売却スケジュール」
// 跟 KSI 不同，BIT 沒有事前參加申込這一步：直接在入札期間內送出投標書 + 保証金即可，
// 不用先報名資格。頁面是傳統 server-render HTML（非 SPA），純 fetch + regex 就能抓。
//
// 資料源：https://www.bit.courts.go.jp/app/schedule/pr005/h01?courtId=XXXXX
// courtId 對照表（近畿地方主要裁判所，離 Sam 武庫川団地/通天閣近的優先）：

export const KANSAI_COURTS = [
  { courtId: '33311', name: '神戸地方裁判所本庁' },
  { courtId: '33331', name: '神戸地方裁判所尼崎支部' },
  { courtId: '33111', name: '大阪地方裁判所本庁' },
  { courtId: '33131', name: '大阪地方裁判所堺支部' },
  { courtId: '33141', name: '大阪地方裁判所岸和田支部' },
  { courtId: '33211', name: '京都地方裁判所本庁' },
  { courtId: '33411', name: '奈良地方裁判所本庁' },
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 令和 → 西元：令和1 = 2019
function reiwaToISO(str) {
  const m = str && str.match(/R(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  const year = 2018 + Number(m[1]);
  return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export async function fetchCourtSchedule(court) {
  try {
    const html = await fetch(`https://www.bit.courts.go.jp/app/schedule/pr005/h01?courtId=${court.courtId}`, {
      headers: { 'User-Agent': UA },
    }).then((r) => r.text());
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    const out = [];
    for (const row of rows) {
      const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
      if (tds.length < 10) continue;
      const [land, kaisatsu, , koukoku, etsuran, bidStart, bidEnd, kettei, , status] = tds;
      if (!/^R\d+\//.test(kaisatsu)) continue;
      out.push({
        court: court.name,
        courtId: court.courtId,
        isFarmland: land === '★',
        announceDate: reiwaToISO(koukoku),
        viewStart: reiwaToISO(etsuran),
        bidStart: reiwaToISO(bidStart),
        bidEnd: reiwaToISO(bidEnd),
        kaisatsuDate: reiwaToISO(kaisatsu),
        decisionDate: reiwaToISO(kettei),
        status,
      });
    }
    return out;
  } catch (err) {
    console.warn('[bit-scraper] fetchCourtSchedule', court.name, err.message);
    return [];
  }
}

export async function fetchAllKansaiCourtSchedules() {
  const results = [];
  for (const c of KANSAI_COURTS) {
    const rows = await fetchCourtSchedule(c);
    results.push(...rows);
  }
  return results;
}
