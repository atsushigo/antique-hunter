#!/usr/bin/env node
// 打開 Playwright headed 隔離 context（等於無痕）讓你手動登入，登入成功後存 cookie
//
// 用法：npm run auth:login jimoty
//
// ⚠️ 此 script 刻意寫得很短 — 你可以整段掃過確認：
//   1. 沒有 page.type / page.fill 對 password
//   2. 沒有 page.evaluate 讀 form 內容
//   3. 沒有 screenshot 登入頁
//   我只做：開頁 → bringToFront → 等 URL 變化 → 存 context.storageState()

import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSite, SITES } from '../auth/sites.js';

chromium.use(stealth()); // 隱藏 navigator.webdriver 等自動化痕跡，減少 bot detection

const here = path.dirname(fileURLToPath(import.meta.url));

const siteId = process.argv[2];
if (!siteId || !SITES[siteId]) {
  console.error(`Usage: npm run auth:login <site>\nAvailable: ${Object.keys(SITES).join(', ')}`);
  process.exit(1);
}
const site = getSite(siteId);
const outPath = path.resolve(here, `../data/sessions/${siteId}.json`);

console.log(`[auth-login] launching chromium for ${site.label}...`);
const browser = await chromium.launch({
  headless: false,
  // 註：Playwright 已用獨立 user-data-dir，不加 --incognito（跟 Playwright 內部管理衝突會閃退）
  // 視覺上跟一般 chromium 一樣，但 context 隔離是真的（cookies 只存在 script 生命週期）
  args: ['--window-size=1200,900', '--window-position=100,100'],
});
const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1200, height: 900 },
});
const page = await context.newPage();

console.log(`[auth-login] → ${site.loginUrl}`);
console.log(`[auth-login] ★ 應該有一個 chromium 視窗開起來（Dock 中會有藍色圓形 icon）`);
console.log(`[auth-login] ★ 若看不到 → 到 Dock 找「Chromium」點一下、或 Cmd+Tab 切過去`);

await page.goto(site.loginUrl, { waitUntil: 'domcontentloaded' });

// 強制搶焦點（macOS 上 Playwright chromium 有時不會自動 foreground）
try { await page.bringToFront(); } catch {}

console.log('[auth-login] 請在視窗登入。有 10 分鐘時間。');

// 每 30 秒 log 一次，讓你知道 script 還在等
const heartbeat = setInterval(() => {
  const url = page.url();
  console.log(`[auth-login] 還在等... 目前 URL: ${url.slice(0, 100)}`);
}, 30_000);

try {
  await page.waitForURL((url) => site.loggedInWhen(url.toString()), { timeout: 10 * 60 * 1000 });
  clearInterval(heartbeat);
} catch (err) {
  clearInterval(heartbeat);
  if (err.message?.includes('closed')) {
    console.error('[auth-login] ✗ 視窗被關掉了（或 crash）。請重試一次，這次不要關視窗。');
  } else {
    console.error(`[auth-login] ✗ timeout 或錯誤：${err.message}`);
  }
  await browser.close().catch(() => {});
  process.exit(1);
}

console.log(`[auth-login] URL 已離開登入頁：${page.url()}`);

// Double-check：fetch statusUrl 用當下 cookies 驗證真的登入了（避免誤存匿名 session）
const state = await context.storageState();
const cookieHeader = state.cookies
  .filter((c) => site.statusUrl.includes(c.domain.replace(/^\./, '')))
  .map((c) => `${c.name}=${c.value}`)
  .join('; ');

try {
  const check = await fetch(site.statusUrl, {
    headers: { Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.8' },
    redirect: 'manual',
  });
  const html = check.status === 200 ? await check.text() : '';
  const authed = check.status === 200 && site.loggedInMarker.test(html);
  if (!authed) {
    console.error(`[auth-login] ✗ 驗證失敗：URL 離開了登入頁但 statusUrl (${site.statusUrl}) 沒偵測到 login marker`);
    console.error(`[auth-login]   status=${check.status}，可能你按了「其他登入方式」但沒完成，或登入失敗回到頁面`);
    console.error(`[auth-login]   ⚠ 不會存這批 cookie。請重試，這次確保完成登入直到看到 mypage`);
    await browser.close().catch(() => {});
    process.exit(2);
  }
} catch (err) {
  console.error(`[auth-login] ✗ status 驗證錯誤：${err.message}`);
  await browser.close().catch(() => {});
  process.exit(3);
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
state.savedAt = new Date().toISOString();
state.siteId = siteId;
await fs.writeFile(outPath, JSON.stringify(state, null, 2));

console.log(`[auth-login] ✓ session 驗證成功、存到 ${path.relative(process.cwd(), outPath)}`);
console.log(`[auth-login] cookies: ${state.cookies.length} 個`);

await browser.close();
process.exit(0);
