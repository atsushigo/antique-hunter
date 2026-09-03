// BIT 不動産競売物件情報サイト — 依都道府県瀏覽目前可競標物件清單
// 網站是舊式多步驟 JS 導覽（點地圖→選都道府県→送出→分頁），沒有 GET API，
// 用專案既有的 Playwright browser.js singleton 直接跑一遍點擊流程再解析結果 HTML。

import { withPage } from './browser.js';

export const PREFECTURES = [
  { code: '28', key: 'hyogo', name: '兵庫県' },
  { code: '27', key: 'osaka', name: '大阪府' },
  { code: '26', key: 'kyoto', name: '京都府' },
  { code: '29', key: 'nara', name: '奈良県' },
  { code: '25', key: 'shiga', name: '滋賀県' },
  { code: '30', key: 'wakayama', name: '和歌山県' },
];

function reiwaToISO(str) {
  const m = str && str.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (!m) return null;
  const year = 2018 + Number(m[1]);
  return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

function parsePropertyBlocks(html) {
  const blocks = html.split('<div class="bit__searchResult bit__currentSearchCondition_regionBox mb-2">').slice(1);
  const out = [];
  for (const block of blocks) {
    const detailM = block.match(/tranPropertyDetail\(&quot;([0-9]+)&quot;,\s*&quot;([0-9]+)&quot;/);
    if (!detailM) continue;
    const [, saleUnitId, courtId] = detailM;
    const badgeM = block.match(/badge-primary bit__badge_\w+ mr-2 p-1">([^<]+)</);
    const courtCaseM = block.match(/class="bit__link">([^<]+)<br>/);
    const viewStartM = block.match(/閲覧開始日<\/div>\s*<div class="bit__multiHeadTable_td[^"]*">([^<]+)</);
    const bidPeriodM = block.match(/入札期間<\/div>\s*<div class="bit__multiHeadTable_td[^"]*">([^<]+)</);
    const kaisatsuM = block.match(/開札期日<\/div>\s*<div class="bit__multiHeadTable_td[^"]*">([^<]+)</);
    const priceM = block.match(/売却基準価額<\/p>\s*<p[^>]*>([\d,]+)円/);
    const depositM = block.match(/買受申出保証金<\/p>\s*<p[^>]*>([\d,]+)円/);
    const addrM = block.match(/bit__icon_access[^"]*"><\/i>([^<]+)</);
    const imgM = block.match(/<img src="([^"]+)" alt="一覧用画像"/);
    const cancelM = block.match(/中止情報<\/div>\s*<div[^>]*><span class="bit__text_red">([^<]*)<\/span>/);

    let bidStart = null;
    let bidEnd = null;
    if (bidPeriodM) {
      const parts = bidPeriodM[1].split('〜');
      bidStart = reiwaToISO(parts[0]);
      bidEnd = reiwaToISO(parts[1]);
    }

    out.push({
      saleUnitId,
      courtId,
      category: badgeM ? badgeM[1] : null,
      courtCase: courtCaseM ? courtCaseM[1].trim() : null,
      viewStart: viewStartM ? reiwaToISO(viewStartM[1]) : null,
      bidStart,
      bidEnd,
      kaisatsuDate: kaisatsuM ? reiwaToISO(kaisatsuM[1]) : null,
      minPriceJpy: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
      depositJpy: depositM ? Number(depositM[1].replace(/,/g, '')) : null,
      address: addrM ? addrM[1].trim() : null,
      imageUrl: imgM ? `https://www.bit.courts.go.jp${imgM[1]}` : null,
      cancelled: !!(cancelM && cancelM[1].trim()),
      url: `https://www.bit.courts.go.jp/app/detail/pd001/h04?courtId=${courtId}&saleUnitId=${saleUnitId}`,
    });
  }
  return out;
}

const MAX_PAGES = 5; // 頁面大小 30 → 最多抓 150 筆，一般都道府県夠用，避免極端情況跑太久

export async function fetchPrefectureProperties(prefCode) {
  return withPage(async (page) => {
    await page.goto('https://www.bit.courts.go.jp/app/top/pt001/h01', { waitUntil: 'networkidle' });
    await page.evaluate(() => tranAreaMap('06', 'property')); // 06 = 近畿
    await page.waitForTimeout(500);
    await page.evaluate((code) => showSearchCondition(code, '2', ''), prefCode);
    await page.waitForTimeout(500);
    await page.evaluate(() => tranAllAreaSearch());
    await page.waitForSelector('.bit__resultList_listArea', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(800);
    // 頁面大小拉到最大 30，減少要翻的頁數
    await page.evaluate(() => {
      const sel = document.getElementById('pageList');
      if (sel) { sel.value = '30'; if (typeof pageSizeChange === 'function') pageSizeChange(); }
    });
    await page.waitForTimeout(1200);

    const all = parsePropertyBlocks(await safeContent(page));
    for (let n = 2; n <= MAX_PAGES; n++) {
      const hasNext = await page.evaluate((num) => typeof getData === 'function' && !!document.querySelector(`a[onclick="getData(${num});"]`), n);
      if (!hasNext) break;
      await page.evaluate((num) => getData(num), n);
      await page.waitForTimeout(1200);
      all.push(...parsePropertyBlocks(await safeContent(page)));
    }
    return all;
  }, { timeoutMs: 45_000 });
}

// page.content() 偶爾會撞到「頁面正在導覽/改內容」的瞬間報錯，重試幾次
async function safeContent(page, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try { return await page.content(); } catch (err) {
      if (i === retries - 1) throw err;
      await page.waitForTimeout(600);
    }
  }
}
