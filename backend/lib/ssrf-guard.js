// 擋掉 SSRF 打內網/本機的 hostname/IP。這是 defense-in-depth，不是唯一防線——
// 呼叫端（img-proxy.js / url-fetch.js）仍應優先用 host allowlist，這支只補「URL 不在固定名單內」的情境。
// 已知侷限：這是 check-then-fetch，沒有把解析到的 IP pin 進實際連線，嚴格防 DNS rebinding 需要更進一步
// （例如自訂 dns lookup + 把解析出的 IP 傳給 fetch 的 dispatcher），目前沒做到那麼徹底。
import dns from 'node:dns/promises';
import net from 'node:net';

const PRIVATE_V4_RANGES = [
  [/^0\./],
  [/^10\./],
  [/^127\./],
  [/^169\.254\./], // link-local，含雲端 metadata endpoint (169.254.169.254)
  [/^172\.(1[6-9]|2\d|3[01])\./],
  [/^192\.168\./],
  [/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./], // CGNAT 100.64.0.0/10
];

function isPrivateV4(ip) {
  return PRIVATE_V4_RANGES.some(([re]) => re.test(ip));
}

function isPrivateV6(ip) {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' || // loopback
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') || lower.startsWith('fd') || // unique local fc00::/7
    lower.startsWith('::ffff:127.') || lower.startsWith('::ffff:10.') // v4-mapped 常見內網
  );
}

export class SsrfBlockedError extends Error {
  constructor(message) {
    super(message);
    this.code = 'ssrf_blocked';
  }
}

// 丟進 hostname，解析後確認不是內網/本機位址才放行。呼叫端 fetch 前先 await 這支。
export async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (net.isIP(hostname) === 4 ? isPrivateV4(hostname) : isPrivateV6(hostname)) {
      throw new SsrfBlockedError(`hostname 是內網/本機位址: ${hostname}`);
    }
    return;
  }
  if (hostname === 'localhost') throw new SsrfBlockedError('hostname 是 localhost');

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    // 解析失敗讓後續 fetch 自己處理（會因為連不到而失敗），不在這裡擋
    return;
  }
  for (const { address, family } of records) {
    if (family === 4 && isPrivateV4(address)) {
      throw new SsrfBlockedError(`${hostname} 解析到內網位址 ${address}`);
    }
    if (family === 6 && isPrivateV6(address)) {
      throw new SsrfBlockedError(`${hostname} 解析到內網位址 ${address}`);
    }
  }
}
