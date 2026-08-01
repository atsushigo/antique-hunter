import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

// 常見造假熱區的專項檢查點（給 Claude 判斷時 anchor 用）
const FAKE_CHECKS_GUIDE = `【機械錶類（Rolex / Omega / Patek / Tudor 等）】檢查：
- 王冠 / logo 立體感（真品浮凸；仿品扁平）
- 面盤字體/字距（真品字距均勻、字體收邊乾淨）
- 序列號字體與雕刻深度
- 針/index 邊緣是否鋒利
- 錶帶連接處工藝
- ⚠ 蚤の市 ¥5 萬以下的 Rolex 99% 為仿；¥10 萬以下需極謹慎

【名牌皮件（LV / Chanel / Hermès / Gucci / Dior 等）】檢查：
- 縫線密度、針距均勻、無跳線
- 五金 logo 刻字精度（真品字體俐落，仿品字距不均）
- 皮質紋理與磨損痕跡是否自然一致
- 內襯印字位置、字體、顏色
- 車線顏色與蠟感

【骨董陶瓷（Meissen / Wedgwood / 伊萬里 / 有田焼 等）】檢查：
- 底款字體、筆法、位置
- 釉色深淺與胎質質感
- 磨損痕跡是否對稱自然（造舊常過於均勻）
- 縮釉、氣孔等時代特徵

【玻璃/銀器/漆器/古書畫】檢查：
- 有時代特徵的細微瑕疵（真品常見；仿品過於完美）
- 材質重量/厚薄與該年代技術是否一致
- 底款、銘、印章位置

其他物件無此類熱區檢查，authenticity_checks 回空陣列 []。`;

const SCHEMA_BASE = `{
  "category": "類別，中文",
  "era": "年代，中文",
  "price_min_jpy": 整數，市場合理價下限,
  "price_max_jpy": 整數，市場合理價上限,
  "confidence": 0~1 的小數,
  "authenticity_risk": "green" | "yellow" | "red",
  "authenticity_checks": [
    {
      "aspect": "檢查項名（如：王冠 logo 立體感）",
      "observation": "從照片看到的實際狀況",
      "verdict": "consistent_with_real" | "suspicious" | "cannot_tell"
    }
  ],
  "notes": "50-80 字備註"
}`;

const SYSTEM_PROMPT_IMAGE = `你是專業的日本二手/古董鑑定顧問，擅長從一張照片判斷物品的類別、年代、二手行情、以及真偽風險。

使用者會傳一張物品照片給你，請嚴格回覆單一 JSON（不加 markdown、不加說明）：

${SCHEMA_BASE}

===
真偽鑑定額外指引：如物品屬以下熱區類別，逐項填 authenticity_checks；否則回空陣列。

${FAKE_CHECKS_GUIDE}
===

authenticity_checks 項目數量控制在 3-6 項（挑最關鍵者）；verdict 誠實回「cannot_tell」若照片無法辨識該項（例：秒針滑順度需影片）。
若照片無法辨識物品（模糊/非物品/遮擋嚴重）：category="無法辨識"、confidence=0。`;

const SYSTEM_PROMPT_URL = `你是專業的日本二手/古董鑑定顧問，擅長從商品頁面（Mercari / Yahoo Auction / Rakuma / Jimoty）判斷物品行情，並協助買家判斷「賣家是否錯定價 or 賣家掛牌是仿品」。

使用者會傳商品圖 + 頁面描述（含掛牌價）給你。請嚴格回覆單一 JSON：

{
  "category": "類別，中文",
  "era": "年代，中文",
  "price_min_jpy": 你評估的市場合理價下限（非掛牌價）,
  "price_max_jpy": 市場合理價上限,
  "confidence": 0~1,
  "authenticity_risk": "green" | "yellow" | "red",
  "authenticity_checks": [{ "aspect": ..., "observation": ..., "verdict": ... }],
  "price_verdict": "low" | "fair" | "high" | "unknown",
  "notes": "80 字內備註"
}

判斷 price_verdict：掛牌 < price_min_jpy → low；min ≤ 掛牌 ≤ max → fair；> max → high；無掛牌 → unknown。

===
真偽鑑定額外指引：如物品屬以下熱區類別，逐項填 authenticity_checks；否則回空陣列。

${FAKE_CHECKS_GUIDE}
===

authenticity_checks 3-6 項，verdict 誠實回 cannot_tell 若照片辨識不了。
若圖片/描述含糊 → confidence 降低、risk 給 yellow、notes 說明理由。`;

const USER_PROMPT_IMAGE = '請鑑定這件物品，回 JSON。';

let client = null;
function getClient() {
  if (!client && config.claude.enabled) {
    client = new Anthropic({ apiKey: config.claude.apiKey });
  }
  return client;
}

export async function appraise({ base64, mediaType, mode = 'image', context = null }) {
  const started = Date.now();

  if (!config.claude.enabled) {
    const m = mockAppraisal(mode, context);
    return {
      ...m,
      model_used: 'mock',
      latency_ms: Date.now() - started,
      mock: true,
      raw_response: null,
    };
  }

  const c = getClient();
  const isUrl = mode === 'url';
  const system = isUrl ? SYSTEM_PROMPT_URL : SYSTEM_PROMPT_IMAGE;
  const userText = isUrl ? buildUrlUserPrompt(context) : USER_PROMPT_IMAGE;

  const response = await c.messages.create({
    model: config.claude.model,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: userText },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const parsed = parseJsonLoose(text);
  return {
    ...normalize(parsed, mode, context),
    model_used: config.claude.model,
    latency_ms: Date.now() - started,
    mock: false,
    raw_response: text,
  };
}

export async function appraiseImage({ base64, mediaType }) {
  return appraise({ base64, mediaType, mode: 'image' });
}

function buildUrlUserPrompt({ title, description, listedPriceJpy, sourceHost }) {
  const priceLine = listedPriceJpy != null
    ? `賣家掛牌價：¥${listedPriceJpy.toLocaleString()}`
    : '賣家掛牌價：無法擷取';
  return [
    `來源：${sourceHost || '未知'}`,
    `商品標題：${title || '（無）'}`,
    `商品描述：${(description || '（無）').slice(0, 400)}`,
    priceLine,
    '',
    '請鑑定並判斷掛牌價是否值得買、有無仿品風險。回 JSON。',
  ].join('\n');
}

function mockAppraisal(mode, context) {
  const mockChecks = [
    { aspect: '整體工藝一致性', observation: '照片解析度不足以判斷細節', verdict: 'cannot_tell' },
    { aspect: '磨損痕跡自然度', observation: '看得出年代痕跡，但需實物確認', verdict: 'cannot_tell' },
  ];
  if (mode === 'url') {
    const listed = context?.listedPriceJpy || 0;
    let verdict = 'unknown';
    if (listed > 0) {
      if (listed < 800) verdict = 'low';
      else if (listed <= 2500) verdict = 'fair';
      else verdict = 'high';
    }
    return normalize(
      {
        category: (context?.title || '陶瓷茶碗').slice(0, 40) + '（mock）',
        era: '昭和中期（mock）',
        price_min_jpy: 800,
        price_max_jpy: 2500,
        confidence: 0.3,
        authenticity_risk: 'yellow',
        authenticity_checks: mockChecks,
        price_verdict: verdict,
        notes: `MOCK：未設 ANTHROPIC_API_KEY。抓到掛牌 ¥${listed.toLocaleString()}。`,
      },
      mode,
      context
    );
  }
  return normalize(
    {
      category: '陶瓷茶碗（mock）',
      era: '昭和中期（mock）',
      price_min_jpy: 800,
      price_max_jpy: 2500,
      confidence: 0.35,
      authenticity_risk: 'yellow',
      authenticity_checks: mockChecks,
      notes: '未設 ANTHROPIC_API_KEY，此為 mock 結果。',
    },
    mode,
    context
  );
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return {};
  }
}

const VALID_VERDICTS = ['consistent_with_real', 'suspicious', 'cannot_tell'];

function normalize(p, mode, context) {
  const risk = ['green', 'yellow', 'red'].includes(p.authenticity_risk) ? p.authenticity_risk : 'yellow';
  const priceMin = Number.isFinite(+p.price_min_jpy) ? Math.max(0, Math.floor(+p.price_min_jpy)) : null;
  const priceMax = Number.isFinite(+p.price_max_jpy) ? Math.max(0, Math.floor(+p.price_max_jpy)) : null;

  let priceVerdict = null;
  if (mode === 'url') {
    const listed = context?.listedPriceJpy;
    if (['low', 'fair', 'high', 'unknown'].includes(p.price_verdict)) priceVerdict = p.price_verdict;
    else if (listed != null && priceMin != null && priceMax != null) {
      if (listed < priceMin) priceVerdict = 'low';
      else if (listed > priceMax) priceVerdict = 'high';
      else priceVerdict = 'fair';
    } else priceVerdict = 'unknown';
  }

  const checks = Array.isArray(p.authenticity_checks) ? p.authenticity_checks.slice(0, 8) : [];
  const authenticityChecks = checks
    .filter((c) => c && typeof c === 'object' && (c.aspect || c.observation))
    .map((c) => ({
      aspect: String(c.aspect || '').slice(0, 60),
      observation: String(c.observation || '').slice(0, 200),
      verdict: VALID_VERDICTS.includes(c.verdict) ? c.verdict : 'cannot_tell',
    }));

  return {
    category: String(p.category ?? '無法辨識').slice(0, 100),
    era: String(p.era ?? '').slice(0, 100),
    price_min_jpy: priceMin,
    price_max_jpy: priceMax,
    confidence: Number.isFinite(+p.confidence) ? Math.min(1, Math.max(0, +p.confidence)) : 0,
    authenticity_risk: risk,
    authenticity_checks: authenticityChecks,
    price_verdict: priceVerdict,
    notes: String(p.notes ?? '').slice(0, 500),
  };
}
