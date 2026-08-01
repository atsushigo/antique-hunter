#!/usr/bin/env node
// 打開 Playwright headed 隔離 context（等於無痕）讓你手動登入，登入成功後存 cookie
//
// 用法：npm run auth:login jimoty
//
// ⚠️ 此 script 刻意寫得很短 — 你可以整段掃過確認：
//   1. 沒有 page.type / page.fill 對 password
//   2. 沒有 page.evaluate 讀 form 內容
//   3. 沒有 screenshot 登入頁
//   我只做：開頁 → 等 URL 變化 → 存 context.storageState()

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSite, SITES } from '../auth/sites.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const siteId = process.argv[2];
if (!siteId || !SITES[siteId]) {
  console.error(`Usage: npm run auth:login <site>\nAvailable: ${Object.keys(SITES).join(', ')}`);
  process.exit(1);
}
const site = getSite(siteId);
const outPath = path.resolve(here, `../data/sessions/${siteId}.json`);

console.log(`[auth-login] opening isolated chromium for ${site.label}...`);
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1100, height: 800 },
  // 全新 context = 無 cookie 無 localStorage，等同無痕
});
const page = await context.newPage();

console.log(`[auth-login] → ${site.loginUrl}`);
console.log('[auth-login] 請在打開的視窗中登入。登入成功後我會自動抓 cookie 並關閉視窗。');
console.log('[auth-login] 有 10 分鐘時間，超時會自動關閉。');

await page.goto(site.loginUrl, { waitUntil: 'domcontentloaded' });

// 等 URL 變成非登入頁 = 登入成功
await page.waitForURL((url) => site.loggedInWhen(url.toString()), { timeout: 10 * 60 * 1000 });

console.log(`[auth-login] ✓ 偵測到已登入（${page.url()}）`);

// 存 storageState — 這就是全部我要的
await fs.mkdir(path.dirname(outPath), { recursive: true });
const state = await context.storageState();
state.savedAt = new Date().toISOString();
state.siteId = siteId;
await fs.writeFile(outPath, JSON.stringify(state, null, 2));

console.log(`[auth-login] ✓ session 存到 ${path.relative(process.cwd(), outPath)}`);
console.log(`[auth-login] cookies: ${state.cookies.length} 個`);

await browser.close();
process.exit(0);
