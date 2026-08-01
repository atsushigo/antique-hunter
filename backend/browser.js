// Playwright browser singleton — lazy 啟動、reuse for 多次抓取
import { chromium } from 'playwright';

let browserPromise = null;

export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((err) => {
      browserPromise = null;
      throw err;
    });
    console.log('[browser] launching headless chromium');
  }
  return browserPromise;
}

export async function withPage(fn, { timeoutMs = 20_000 } = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  if (b) await b.close();
}
