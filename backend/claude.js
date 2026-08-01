import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

const BASE_SCHEMA = `{
  "category": "類別，中文（如：陶瓷茶碗、老懷錶、木製家具、和服...）",
  "era": "年代，中文（如：明治後期、昭和初期、現代仿品）",
  "price_min_jpy": 整數，日圓估價下限,
  "price_max_jpy": 整數，日圓估價上限,
  "confidence": 0~1 的小數，你對估價把握程度,
  "authenticity_risk": "green" | "yellow" | "red"（真偽風險：green=看起來真、yellow=需檢視、red=高機率仿品/現代品）,
  "notes": "50 字內備註（可寫關鍵鑑定點、殺價建議、或警告）"
}`;

const SYSTEM_PROMPT_IMAGE = `你是專業的日本二手/古董鑑定顧問，擅長從一張照片判斷物品的類別、年代與二手行情。
使用者會傳一張物品照片給你，請你嚴格回覆單一 JSON 物件（不加 markdown 圍欄、不加說明），schema 如下：

${BASE_SCHEMA}

若圖片無法辨識（模糊、非物品、遮擋嚴重）：回 category="無法辨識"、confidence=0、其他欄位盡量估。`;

const SYSTEM_PROMPT_URL = `你是專業的日本二手/古董鑑定顧問，擅長從商品頁面（Mercari / Yahoo Auction / Rakuma）判斷物品行情，並協助買家判斷「賣家是否錯定價」。

使用者會傳一張商品圖 + 頁面描述（含掛牌價）給你。請嚴格回覆單一 JSON（不加 markdown、不加說明），schema：

{
  "category": "類別，中文",
  "era": "年代，中文",
  "price_min_jpy": 你評估的市場合理價下限（不是掛牌價），
  "price_max_jpy": 你評估的市場合理價上限,
  "confidence": 0~1 的小數,
  "authenticity_risk": "green" | "yellow" | "red",
  "price_verdict": "low" | "fair" | "high" | "unknown"（掛牌價 vs 你估的合理區間：low=掛得比合理下限還低=撿漏機會、fair=在區間內、high=貴、unknown=無掛牌價或無法判斷）,
  "notes": "80 字內備註（可寫：關鍵鑑定點、殺價建議、warning、或撿漏理由）"
}

判斷 verdict 規則：若掛牌價 < price_min_jpy → low（值得買）；若 price_min_jpy ≤ 掛牌價 ≤ price_max_jpy → fair；> price_max_jpy → high；若無掛牌價 → unknown。

若圖片模糊/描述含糊 → 降低 confidence，risk 給 yellow，notes 說明理由。`;

const USER_PROMPT_IMAGE = '請鑑定這件物品，回 JSON。';

let client = null;
function getClient() {
  if (!client && config.claude.enabled) {
    client = new Anthropic({ apiKey: config.claude.apiKey });
  }
  return client;
}

// mode='image' | 'url'
// context 只在 mode='url' 用：{ title, description, listedPriceJpy, sourceHost, sourceUrl }
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
    max_tokens: 1024,
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

// 向後相容舊呼叫端
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
    '請鑑定並判斷掛牌價是否值得買。回 JSON。',
  ].join('\n');
}

function mockAppraisal(mode, context) {
  if (mode === 'url') {
    const listed = context?.listedPriceJpy || 0;
    let verdict = 'unknown';
    if (listed > 0) {
      // mock：合理區間 800-2500，比照回 verdict
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
        price_verdict: verdict,
        notes: `MOCK：未設 ANTHROPIC_API_KEY。抓到掛牌 ¥${listed.toLocaleString()}，僅供串接測試。`,
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
      notes: '未設定 ANTHROPIC_API_KEY，此為 mock 結果，僅供前後端串接測試。',
    },
    mode,
    context
  );
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return {};
  }
}

function normalize(p, mode, context) {
  const risk = ['green', 'yellow', 'red'].includes(p.authenticity_risk) ? p.authenticity_risk : 'yellow';
  const priceMin = Number.isFinite(+p.price_min_jpy) ? Math.max(0, Math.floor(+p.price_min_jpy)) : null;
  const priceMax = Number.isFinite(+p.price_max_jpy) ? Math.max(0, Math.floor(+p.price_max_jpy)) : null;

  let verdict = null;
  if (mode === 'url') {
    const listed = context?.listedPriceJpy;
    if (['low', 'fair', 'high', 'unknown'].includes(p.price_verdict)) {
      verdict = p.price_verdict;
    } else if (listed != null && priceMin != null && priceMax != null) {
      if (listed < priceMin) verdict = 'low';
      else if (listed > priceMax) verdict = 'high';
      else verdict = 'fair';
    } else {
      verdict = 'unknown';
    }
  }

  return {
    category: String(p.category ?? '無法辨識').slice(0, 100),
    era: String(p.era ?? '').slice(0, 100),
    price_min_jpy: priceMin,
    price_max_jpy: priceMax,
    confidence: Number.isFinite(+p.confidence) ? Math.min(1, Math.max(0, +p.confidence)) : 0,
    authenticity_risk: risk,
    price_verdict: verdict,
    notes: String(p.notes ?? '').slice(0, 500),
  };
}
