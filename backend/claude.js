import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

const SYSTEM_PROMPT = `你是專業的日本二手/古董鑑定顧問，擅長從一張照片判斷物品的類別、年代與二手行情。
使用者會傳一張物品照片給你，請你嚴格回覆單一 JSON 物件（不加 markdown 圍欄、不加說明），schema 如下：

{
  "category": "類別，中文（如：陶瓷茶碗、老懷錶、木製家具、和服...）",
  "era": "年代，中文（如：明治後期、昭和初期、現代仿品）",
  "price_min_jpy": 整數，日圓估價下限,
  "price_max_jpy": 整數，日圓估價上限,
  "confidence": 0~1 的小數，你對估價把握程度,
  "authenticity_risk": "green" | "yellow" | "red"（真偽風險：green=看起來真、yellow=需檢視、red=高機率仿品/現代品）,
  "notes": "50 字內備註（可寫關鍵鑑定點、殺價建議、或警告）"
}

若圖片無法辨識（模糊、非物品、遮擋嚴重）：回 category="無法辨識"、confidence=0、其他欄位盡量估。`;

const USER_PROMPT = '請鑑定這件物品，回 JSON。';

let client = null;
function getClient() {
  if (!client && config.claude.enabled) {
    client = new Anthropic({ apiKey: config.claude.apiKey });
  }
  return client;
}

export async function appraiseImage({ base64, mediaType }) {
  const started = Date.now();

  if (!config.claude.enabled) {
    return {
      ...mockAppraisal(),
      model_used: 'mock',
      latency_ms: Date.now() - started,
      mock: true,
      raw_response: null,
    };
  }

  const c = getClient();
  const response = await c.messages.create({
    model: config.claude.model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: USER_PROMPT },
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
    ...normalize(parsed),
    model_used: config.claude.model,
    latency_ms: Date.now() - started,
    mock: false,
    raw_response: text,
  };
}

function mockAppraisal() {
  return normalize({
    category: '陶瓷茶碗（mock）',
    era: '昭和中期（mock）',
    price_min_jpy: 800,
    price_max_jpy: 2500,
    confidence: 0.35,
    authenticity_risk: 'yellow',
    notes: '未設定 ANTHROPIC_API_KEY，此為 mock 結果，僅供前後端串接測試。',
  });
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        // fall through
      }
    }
    return {};
  }
}

function normalize(p) {
  const risk = ['green', 'yellow', 'red'].includes(p.authenticity_risk)
    ? p.authenticity_risk
    : 'yellow';
  return {
    category: String(p.category ?? '無法辨識').slice(0, 100),
    era: String(p.era ?? '').slice(0, 100),
    price_min_jpy: Number.isFinite(+p.price_min_jpy) ? Math.max(0, Math.floor(+p.price_min_jpy)) : null,
    price_max_jpy: Number.isFinite(+p.price_max_jpy) ? Math.max(0, Math.floor(+p.price_max_jpy)) : null,
    confidence: Number.isFinite(+p.confidence) ? Math.min(1, Math.max(0, +p.confidence)) : 0,
    authenticity_risk: risk,
    notes: String(p.notes ?? '').slice(0, 500),
  };
}
