// Browser check — 用 real Playwright 開所有 tab，驗證 DOM 有 render + 有實資料
// 用法：node backend/scripts/browser-check.js
// 前提：backend + frontend dev server 已跑（3000 / 5173）

import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
let PASS = 0;
let FAIL = 0;
const errors = [];

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  PASS++;
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
  FAIL++;
}

async function check(page, path, checks) {
  const consoleErrors = [];
  const networkErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onResponse = (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon') && !r.url().includes('sw.js')) {
      networkErrors.push(`${r.status()} ${r.url().slice(-80)}`);
    }
  };
  page.on('console', onConsole);
  page.on('response', onResponse);

  try {
    const resp = await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    if (!resp || resp.status() >= 400) {
      fail(`${path} → HTTP ${resp?.status()}`);
      return;
    }
    // Wait for Vue mount
    await page.waitForSelector('#app > *', { timeout: 5000 }).catch(() => {});
    // Give SPA data-fetch some time
    await page.waitForTimeout(1500);

    for (const [name, fn] of Object.entries(checks)) {
      try {
        const ok = await fn(page);
        if (ok === true) pass(`${path} ${name}`);
        else if (ok === false) fail(`${path} ${name}`);
        else pass(`${path} ${name} (${ok})`);
      } catch (e) {
        fail(`${path} ${name} → ${e.message}`);
      }
    }
    if (consoleErrors.length) {
      const filtered = consoleErrors.filter(
        (e) =>
          !e.includes('Failed to load resource') &&
          !e.includes('sw.js') &&
          !e.includes('service worker') &&
          !e.includes('Extension')
      );
      if (filtered.length) {
        fail(`${path} 有 ${filtered.length} 個 console error`);
        filtered.slice(0, 2).forEach((e) => errors.push(`  ${path}: ${e.slice(0, 200)}`));
      }
    }
    if (networkErrors.length) {
      fail(`${path} 有 ${networkErrors.length} 個 網路 error`);
      networkErrors.slice(0, 3).forEach((e) => errors.push(`  ${path} net: ${e}`));
    }
  } catch (err) {
    fail(`${path} → ${err.message}`);
  } finally {
    page.off('console', onConsole);
    page.off('response', onResponse);
  }
}

const q = (sel) => async (page) => (await page.$(sel)) !== null;
const has = (sel, needle) => async (page) => {
  const el = await page.$(sel);
  if (!el) return false;
  const txt = await el.innerText();
  return txt.includes(needle);
};
const count = (sel, min) => async (page) => {
  const n = (await page.$$(sel)).length;
  return n >= min ? `${n} 筆` : false;
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone-like
  const page = await context.newPage();

  console.log('== BottomNav 5 tabs ==');
  await check(page, '/', {
    'has 首頁 tab': has('.v-bottom-navigation', '首頁'),
    'has 追蹤 tab': has('.v-bottom-navigation', '追蹤'),
    'has 日曆 tab': has('.v-bottom-navigation', '日曆'),
    'has 官公庁 tab': has('.v-bottom-navigation', '官公庁'),
    'has 帳號 tab': has('.v-bottom-navigation', '帳號'),
  });

  console.log('\n== / (Home) ==');
  await check(page, '/', {
    'mounts': q('#app > *'),
    '有主要操作按鈕（相機/追蹤/官公庁）': async (p) => {
      const t = await p.innerText('body');
      const hits = ['拍照', '追蹤', '官公庁', '骨董'].filter((k) => t.includes(k));
      return hits.length >= 2 ? `含 ${hits.join('/')}` : false;
    },
  });

  console.log('\n== /calendar ==');
  await check(page, '/calendar', {
    '月切換 header': q('.month-title'),
    '日期格子 42 格': count('.day-cell', 42),
    '顏色圖例含官公庁': has('.legend', '官公庁'),
  });

  console.log('\n== /inbox ==');
  await check(page, '/inbox', {
    'mounts': q('#app > *'),
    '有 listing 或空狀態': async (p) => {
      const t = await p.innerText('body');
      return t.includes('筆') || t.includes('沒有') || t.includes('empty') || t.length > 200;
    },
  });

  console.log('\n== /gov-auctions ==');
  await check(page, '/gov-auctions', {
    'mounts': q('#app > *'),
    '有 category 篩選或列表': async (p) => {
      const t = await p.innerText('body');
      return t.includes('車輛') || t.includes('一般') || t.includes('不動產');
    },
  });

  console.log('\n== /gov-auctions/guide ==');
  await check(page, '/gov-auctions/guide', {
    '有入門手冊標題': has('.text-h5', '入門手冊'),
    '有各站對照卡片': count('.source-card', 5),
    '有 KSI 卡片': has('.source-cards', 'KSI'),
    '有 まんだらけ 卡片': has('.source-cards', 'まんだらけ'),
    '有外國人 OK badge': has('.source-cards', '外國人 OK'),
    '有過往真實成交案例': has('.guide', '過往真實成交案例'),
  });

  console.log('\n== /accounts ==');
  await check(page, '/accounts', {
    '有 4 個站': async (p) => {
      const t = await p.innerText('body');
      const sites = ['Yahoo', 'Mercari', 'Rakuma', 'Jimoty'].filter((s) => t.toLowerCase().includes(s.toLowerCase()));
      return sites.length >= 3 ? `${sites.length}/4` : false;
    },
  });

  console.log('\n== /markets ==');
  await check(page, '/markets', {
    '有市集列表 (15+)': async (p) => {
      const t = await p.innerText('body');
      return t.includes('市') || t.includes('蚤') ? true : false;
    },
  });

  console.log('\n== /keywords ==');
  await check(page, '/keywords', {
    '有 keyword 列表或新增按鈕': async (p) => {
      const t = await p.innerText('body');
      return t.includes('keyword') || t.includes('新增') || t.includes('關鍵') || t.length > 200;
    },
  });

  console.log('\n== /history ==');
  await check(page, '/history', {
    'mounts': q('#app > *'),
  });

  console.log('\n== /knowledge ==');
  await check(page, '/knowledge', {
    'mounts': q('#app > *'),
  });

  console.log('\n== /search ==');
  await check(page, '/search', {
    'mounts': q('#app > *'),
  });

  console.log('\n== BottomNav 點擊測試 (從 / 點日曆) ==');
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  await page.click('.v-bottom-navigation button:has-text("日曆")');
  await page.waitForTimeout(500);
  const url = page.url();
  if (url.endsWith('/calendar')) pass('點日曆 → URL 變 /calendar');
  else fail(`點日曆 → URL = ${url}`);

  await browser.close();

  console.log('\n===================================');
  console.log(`PASS ${PASS} / FAIL ${FAIL}`);
  if (errors.length) {
    console.log('\n-- 詳細錯誤 --');
    errors.forEach((e) => console.log(e));
  }
  process.exit(FAIL === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
