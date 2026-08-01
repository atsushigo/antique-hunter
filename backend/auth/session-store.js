// 儲存/讀取 site session（Playwright storageState 格式 = cookies + origins）
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSite } from './sites.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.resolve(here, '../data/sessions');

async function ensureDir() {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}
function fileFor(siteId) {
  return path.join(SESSIONS_DIR, `${siteId}.json`);
}

export async function loadState(siteId) {
  try {
    const raw = await fs.readFile(fileFor(siteId), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function saveState(siteId, state) {
  await ensureDir();
  await fs.writeFile(fileFor(siteId), JSON.stringify(state, null, 2));
}

export async function clearState(siteId) {
  try { await fs.unlink(fileFor(siteId)); } catch (err) { if (err.code !== 'ENOENT') throw err; }
}

// 把 Playwright storageState 的 cookies 陣列組成 fetch() 用的 Cookie: header
export function toCookieHeader(state, domainSuffix = null) {
  if (!state?.cookies?.length) return '';
  const relevant = domainSuffix
    ? state.cookies.filter((c) => c.domain?.endsWith(domainSuffix))
    : state.cookies;
  return relevant.map((c) => `${c.name}=${c.value}`).join('; ');
}

// 檢查 session 是否還有效：發 GET statusUrl，看 body 有無 loggedInMarker
export async function checkStatus(siteId) {
  const site = getSite(siteId);
  const state = await loadState(siteId);
  if (!state) return { siteId, exists: false, valid: false };
  const cookie = toCookieHeader(state, site.baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
  try {
    const res = await fetch(site.statusUrl, {
      headers: {
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.8',
      },
      redirect: 'manual', // 不 follow login redirect
    });
    if (res.status >= 300 && res.status < 400) {
      return { siteId, exists: true, valid: false, reason: `redirected to ${res.headers.get('location')}` };
    }
    if (!res.ok) return { siteId, exists: true, valid: false, reason: `status ${res.status}` };
    const html = await res.text();
    const valid = site.loggedInMarker.test(html);
    return {
      siteId,
      exists: true,
      valid,
      savedAt: state.savedAt || null,
      cookieCount: state.cookies?.length || 0,
    };
  } catch (err) {
    return { siteId, exists: true, valid: false, reason: err.message };
  }
}
