import { Router } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../auth/sites.js';
import { checkStatus, clearState } from '../auth/session-store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const loginScript = path.resolve(here, '../scripts/auth-login.mjs');

export const authRouter = Router();

// 所有站別的 session 狀態
authRouter.get('/status', async (req, res, next) => {
  try {
    const results = await Promise.all(
      Object.keys(SITES).map(async (id) => {
        const s = await checkStatus(id);
        return { ...s, label: SITES[id].label };
      })
    );
    res.json({ data: results });
  } catch (err) { next(err); }
});

// 一鍵登入 — spawn auth-login script（backend 跑在本機 Mac，headed browser 會在你螢幕開起來）
// 白名單擋 shell injection（:site 只能是 SITES key）
const runningLogins = new Map(); // siteId → child process

authRouter.post('/login/:site', async (req, res, next) => {
  try {
    const siteId = req.params.site;
    if (!SITES[siteId]) return res.status(400).json({ error: 'unknown_site' });
    if (runningLogins.has(siteId)) {
      return res.status(409).json({ error: 'already_running', message: '登入視窗已開啟，完成登入或關掉視窗' });
    }
    const child = spawn('node', [loginScript, siteId], {
      stdio: 'inherit', // 讓 script log 出現在 backend terminal
      detached: false,
    });
    runningLogins.set(siteId, child);
    child.on('exit', (code) => {
      runningLogins.delete(siteId);
      console.log(`[auth-login] ${siteId} exited: ${code}`);
    });
    res.json({ data: { siteId, pid: child.pid, status: 'started' } });
  } catch (err) { next(err); }
});

// 手動貼 cookie 登入（bot detection 擋住 auto login 時用）
// body: { cookie: "name=value; name=value; ..." }
authRouter.post('/paste/:site', async (req, res, next) => {
  try {
    const siteId = req.params.site;
    if (!SITES[siteId]) return res.status(400).json({ error: 'unknown_site' });
    const raw = String(req.body?.cookie || '').trim();
    if (!raw) return res.status(400).json({ error: 'missing_cookie' });

    const site = SITES[siteId];
    const domain = site.cookieDomain || site.baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // 解析 "name=value; name=value" 格式（DevTools "cookie:" header）
    const cookies = raw.split(';').map((s) => s.trim()).filter(Boolean).map((kv) => {
      const idx = kv.indexOf('=');
      if (idx < 0) return null;
      return {
        name: kv.slice(0, idx).trim(),
        value: kv.slice(idx + 1).trim(),
        domain: `.${domain}`,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    }).filter(Boolean);

    if (!cookies.length) return res.status(400).json({ error: 'no_valid_cookies_parsed' });

    const state = {
      cookies,
      origins: [],
      savedAt: new Date().toISOString(),
      siteId,
      source: 'manual_paste',
    };

    // Import helpers inline
    const { saveState, checkStatus } = await import('../auth/session-store.js');
    await saveState(siteId, state);

    // 立刻驗證這批 cookie 真的有登入
    const status = await checkStatus(siteId);
    if (!status.valid) {
      // 沒登入 — 刪掉不留爛 session
      const { clearState } = await import('../auth/session-store.js');
      await clearState(siteId);
      return res.status(422).json({
        error: 'cookie_not_valid',
        message: `貼的 cookie 無法通過 ${site.statusUrl} 驗證。可能：(1) 沒複製到 session cookie (2) cookie 已過期 (3) 錯的站別`,
        details: status,
      });
    }

    res.json({ data: { ok: true, cookies: cookies.length, status } });
  } catch (err) { next(err); }
});

// 登出（僅刪本地 session 檔）
authRouter.delete('/session/:site', async (req, res, next) => {
  try {
    if (!SITES[req.params.site]) return res.status(404).json({ error: 'unknown_site' });
    await clearState(req.params.site);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
});
