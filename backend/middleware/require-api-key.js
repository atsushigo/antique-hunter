// 單一分享金鑰驗證——這是給「個人工具部署到公網」擋掉匿名/自動化濫用用的最低限度防線，
// 不是多使用者權限系統。
//
// 已知侷限：如果 frontend 也公開部署，VITE_API_KEY 會被打包進前端 bundle，
// 任何人看原始碼就能把金鑰挖出來——這擋得住隨手亂打的 script/爬蟲，擋不住真的想繞過的人。
// 真要讓外部能存取，這層之外還要在 reverse proxy（nginx/caddy）加 Basic Auth，
// 或乾脆限制來源 IP / 走 VPN（Tailscale 等），不要只靠這支 middleware。
import crypto from 'node:crypto';
import { config, isDev } from '../config.js';

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireApiKey(req, res, next) {
  if (!config.apiKey) {
    // 本機開發沒設 API_KEY：放行，但每次都印警告，提醒部署前要設
    if (!isDev) {
      // production 模式沒設金鑰是真的危險，直接拒絕所有請求而不是靜默放行
      return res.status(500).json({
        error: 'server_misconfigured',
        message: 'API_KEY 未設定，production 模式拒絕所有請求（避免無防護曝險）',
      });
    }
    return next();
  }
  const provided = req.headers['x-api-key'];
  if (typeof provided !== 'string' || !timingSafeEqual(provided, config.apiKey)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
