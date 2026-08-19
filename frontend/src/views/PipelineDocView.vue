<template>
  <v-container class="px-3 pb-16 doc">
    <div class="d-flex align-center mb-2">
      <v-btn size="small" variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/')">回首頁</v-btn>
      <v-spacer />
      <v-chip size="x-small" variant="tonal">內部 dev doc</v-chip>
    </div>

    <div class="text-h5 mb-1">鑑定流程設計</div>
    <div class="text-caption text-medium-emphasis mb-3">
      市集現場拍照 → 買/不買判斷 · 端到端 pipeline
    </div>

    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      <div class="text-caption">
        寫給未來的自己：這份是 Sam × Claude session 討論出來的
        <b>理想流程</b>與<b>下一步做什麼</b>。方便隔幾週回頭看時能快速對齊。
      </div>
    </v-alert>

    <!-- 情境 -->
    <h2>情境設定</h2>
    <p><b>Sam 在關西市集（下午 3 點）：</b></p>
    <ul>
      <li>看到一只錶／花瓶／老車，賣家開價 ¥3,000</li>
      <li>想在 30 秒內判斷：<b>撿漏？被坑？值不值得砍價？是仿品嗎？</b></li>
      <li>手機 4G 連線（可能不穩），邊看邊做決策</li>
    </ul>

    <p class="mt-3"><b>核心產出（給使用者的答案）：</b></p>
    <ol>
      <li>一眼判斷：🟢 撿漏 / 🟡 合理 / 🔴 偏高 / ⚠️ 疑似仿品</li>
      <li>議價目標：「砍到 ¥X 值得買，否則 pass」</li>
      <li>議價依據：Yahoo / Mercari 過去 3 個月<b>真實成交價</b>（不只 AI 估算）</li>
      <li>仿品風險檢查點（品牌類物件）</li>
    </ol>

    <!-- Pipeline -->
    <h2>端到端 pipeline</h2>

    <div class="stage">
      <div class="stage-title">📱 0-30 秒 · 使用者現場動作</div>
      <ol>
        <li>PWA 開 app（已裝桌面 → 秒開）</li>
        <li>拍照（多角度：正面 + 底款/內襯 + 瑕疵，<b>1-5 張</b>）</li>
        <li>邊上傳邊打描述（賣家開 ¥3k、聲稱昭和期、有小裂）</li>
        <li>點送出</li>
      </ol>
    </div>

    <div class="stage">
      <div class="stage-title">☁️ 5-8 秒 · Server 端 pipeline（並行處理）</div>
      <div class="pipeline-diagram">
        <div class="pipe-row">
          <div class="pipe-label">A</div>
          <div class="pipe-body">
            <b>OCR 抽字（Tesseract, 0.5-1s）</b>
            <div class="text-caption">→ "Rolex Submariner 116610LN"</div>
            <div class="text-caption">→ "Made in Japan 1985"</div>
          </div>
        </div>
        <div class="pipe-arrow">▼</div>
        <div class="pipe-row">
          <div class="pipe-label">B</div>
          <div class="pipe-body">
            <b>Claude Vision（3-6s · 主判斷）</b>
            <div class="text-caption">Input = 圖 × N + 使用者描述 + OCR 抽到的字</div>
            <div class="text-caption">Output = 類別 / 年代 / 估價 / 仿品風險 / 檢查點</div>
          </div>
        </div>
        <div class="pipe-row async">
          <div class="pipe-label">C</div>
          <div class="pipe-body">
            <b>反向圖搜（async, 10-30s · 不阻塞主結果）</b>
            <div class="text-caption">→ Google Lens API / SerpAPI</div>
            <div class="text-caption">→ Yahoo 落札濟同型號 3-5 筆</div>
            <div class="text-caption">→ Mercari 已售 3-5 筆</div>
          </div>
        </div>
      </div>
      <p class="text-caption mt-2">
        <b>關鍵設計：</b> OCR 抽到的型號字<b>當 context 塞 Claude prompt</b>，不當獨立答案。
        理由：Claude 有廣度、OCR 有精度 → 合體最強。
      </p>
    </div>

    <div class="stage">
      <div class="stage-title">📤 返回給使用者（三屏分層）</div>

      <div class="screen">
        <div class="screen-label">🎯 第一屏（3-8s 主結果）</div>
        <div class="mock-card">
          <div class="mock-verdict">🟢 撿漏</div>
          <div class="mock-line">合理 ¥8,000-15,000</div>
          <div class="mock-line">你賣家開 ¥3,000</div>
          <div class="mock-highlight">💰 議價目標：砍到 ¥X 值得買</div>
        </div>
      </div>

      <div class="screen">
        <div class="screen-label">📋 第二屏（往下滑）</div>
        <ul>
          <li>AI 判定：類別 / 年代 / 品牌型號（含 OCR 抽到的字）</li>
          <li>仿品風險檢查點（王冠立體感、字距、五金…）</li>
          <li>你的補充描述有被納入</li>
        </ul>
      </div>

      <div class="screen">
        <div class="screen-label">📊 第三屏（async · 10-30s 後）</div>
        <ul>
          <li>Yahoo 過去 3 個月同型號真實成交（不是 AI 估）</li>
          <li>Mercari 已售清單連結</li>
          <li>「AI 估價 vs 真實成交」對照</li>
        </ul>
      </div>
    </div>

    <!-- 現況 -->
    <h2>現況 vs 目標</h2>
    <v-table density="compact" class="status-table">
      <thead>
        <tr><th>Step</th><th>狀態</th><th>說明</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in STATUS" :key="s.step">
          <td>{{ s.step }}</td>
          <td><span :class="`status-${s.state}`">{{ statusIcon(s.state) }}</span></td>
          <td class="text-caption">{{ s.note }}</td>
        </tr>
      </tbody>
    </v-table>

    <!-- 順序 -->
    <h2>建議實作順序（by ROI）</h2>
    <div v-for="(step, i) in ROADMAP" :key="i" class="roadmap-item">
      <div class="d-flex align-center mb-1">
        <div class="rm-num">{{ i + 1 }}</div>
        <div class="rm-title">{{ step.title }}</div>
        <v-spacer />
        <v-chip size="x-small" variant="tonal">{{ step.effort }}</v-chip>
      </div>
      <div class="text-caption text-medium-emphasis rm-why">
        <b>為什麼：</b>{{ step.why }}
      </div>
    </div>

    <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
      <div class="text-caption">
        <b>注意：</b> 步驟 1 完成前，先在本機做 2-4 也 OK，但測試時記得 Cron 只跑本機 backend 有資料。
        步驟 5 optional（SerpAPI 要 $50/月，Y!/M/G quick-link 也能用）。
      </div>
    </v-alert>

    <!-- 部署 -->
    <h2>部署架構決策</h2>
    <div class="callout">
      <p><b>Backend：</b>Hetzner CX33 現有 VPS（跟 其他個人專案共用）</p>
      <ul>
        <li>加 1 Docker container，~500 MB RAM</li>
        <li>Playwright headless Chromium 另 ~500-800 MB（只在 Cron 跑時吃）</li>
        <li>SQLite 檔在 VPS disk，rsync 定期備份到 Mac</li>
      </ul>
      <p><b>Frontend：</b>Cloudflare Pages（PWA static build 免費）</p>
      <p><b>Public 存取：</b>subdomain + Cloudflare tunnel（不用開 VPS 埠）</p>
      <p><b>Auth：</b>單人用，簡易 API token 塞 header 即可</p>
    </div>

    <p class="mt-3">
      <b>為什麼不換 GEX（GPU）自 host VLM：</b>
      Qwen2-VL / LLaVA 品質接近 Claude，但要 GPU。Hetzner GEX 月費 ~€500+。
      月呼叫量 &lt;1000 次的情況下，付 Claude API 遠比自 host 便宜。
    </p>

    <!-- Metric -->
    <h2>每階段的 metric 追蹤</h2>
    <p class="text-caption">實作完後要追蹤：</p>
    <ul>
      <li>鑑定平均延遲（p50 / p95）→ 目標 &lt;10s</li>
      <li>Claude 呼叫成本（¥/月）→ 觀察一個月看要不要優化</li>
      <li>OCR 抽字命中率（有多少張抽到有意義的字）</li>
      <li>使用者 override 率（AI 說「合理」使用者收藏了 → 說明不信 AI）</li>
    </ul>

    <div class="text-caption text-medium-emphasis text-center mt-6">
      Last discussed 2026-08-19 · Sam × Claude<br>
      原文檔案：<code>docs/APPRAISAL_PIPELINE.md</code>
    </div>
  </v-container>
</template>

<script setup>
const STATUS = [
  { step: 'PWA 手機開 app', state: 'done', note: 'vite-plugin-pwa 已配' },
  { step: '拍照多張（1-5）', state: 'done', note: '2026-08-19 加完（commit 4b6d63e）' },
  { step: '上傳', state: 'done', note: 'multipart/form-data' },
  { step: '補充描述', state: 'done', note: 'commit 50ebdb7' },
  { step: 'Claude 主判斷', state: 'done', note: '有 API key 就跑；含 authenticity_checks + price_verdict' },
  { step: 'OCR 抽字', state: 'todo', note: '沒做；型號準度靠 Claude 硬看' },
  { step: '反向圖搜', state: 'todo', note: '沒做；有 Y!/M/G quick-link 給人手動查' },
  { step: '一眼判斷 UI', state: 'partial', note: '有 verdict 但沒大字 + 議價目標' },
  { step: '議價目標', state: 'todo', note: 'Claude 沒被要求給這欄' },
  { step: '部到 Hetzner', state: 'todo', note: '只跑本機；出門就用不到 ← 最有感的升級' },
];

const ROADMAP = [
  { title: '部 backend 到 Hetzner CX33 + 前端 Cloudflare Pages', effort: '1-2 天', why: '沒這步其他優化都用不到（Mac 沒開 = app 死）' },
  { title: 'Camera 支援多張照片（1-5）', effort: '半天 · ✅ 已完成', why: '從 1 → 3 張精度立刻升' },
  { title: 'OCR container（Tesseract Docker）', effort: '半天', why: '品牌型號準度大幅升，成本 ~0' },
  { title: '議價目標 + 大字判斷 UI', effort: '半天', why: '現場能秒判斷、能開口砍' },
  { title: '反向圖搜（Google Lens / SerpAPI）', effort: '1 天 + $50/月', why: '真實成交當議價依據' },
];

function statusIcon(state) {
  return { done: '✅', partial: '🟡', todo: '❌' }[state] || '?';
}
</script>

<style scoped>
.doc { max-width: 760px; }
.doc h2 {
  margin-top: 28px; margin-bottom: 12px;
  font-size: 18px; font-weight: 600; color: #3E2723;
  border-bottom: 2px solid #795548; padding-bottom: 4px;
}
.doc p { line-height: 1.7; color: #3E2723; margin: 8px 0; }
.doc ul, .doc ol { padding-left: 22px; line-height: 1.8; color: #3E2723; }
.doc li { margin: 3px 0; }
.doc code {
  background: rgba(121, 85, 72, 0.08);
  padding: 1px 5px; border-radius: 3px; font-size: 12px;
}

/* Pipeline stage */
.stage {
  background: rgba(121, 85, 72, 0.03);
  border-left: 3px solid #795548;
  border-radius: 6px;
  padding: 12px 14px;
  margin: 12px 0;
}
.stage-title {
  font-weight: 600; color: #5D4037;
  margin-bottom: 8px; font-size: 14px;
}

/* Pipeline diagram */
.pipeline-diagram {
  background: #FDFBF7;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  padding: 10px 8px;
}
.pipe-row {
  display: flex; align-items: flex-start;
  padding: 8px; border-radius: 4px;
  background: rgba(121, 85, 72, 0.05);
}
.pipe-row.async {
  margin-top: 8px;
  background: rgba(90, 122, 72, 0.06);
  border: 1px dashed rgba(90, 122, 72, 0.3);
}
.pipe-label {
  width: 24px; height: 24px; border-radius: 999px;
  background: #795548; color: white;
  font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  margin-right: 10px; flex-shrink: 0;
}
.pipe-body { flex: 1; font-size: 13px; }
.pipe-arrow {
  text-align: center; color: rgba(0, 0, 0, 0.3);
  margin: 4px 0; font-size: 14px;
}

/* Mock result card */
.screen { margin: 10px 0; }
.screen-label {
  font-size: 12px; font-weight: 600;
  color: #5D4037; margin-bottom: 6px;
}
.mock-card {
  background: #FDFBF7;
  border: 2px solid #795548;
  border-radius: 8px;
  padding: 12px;
  max-width: 320px;
}
.mock-verdict {
  font-size: 22px; font-weight: 700; color: #2E7D32;
  margin-bottom: 4px;
}
.mock-line { font-size: 13px; color: #3E2723; }
.mock-highlight {
  margin-top: 8px; padding: 6px 8px;
  background: rgba(121, 85, 72, 0.08); border-radius: 4px;
  font-size: 13px; font-weight: 500;
}

/* Status table */
.status-table { background: transparent; }
.status-table th { font-size: 12px !important; }
.status-table td { font-size: 13px !important; padding: 6px 8px !important; }
.status-done { color: #2E7D32; }
.status-partial { color: #F57C00; }
.status-todo { color: rgba(0, 0, 0, 0.4); }

/* Roadmap */
.roadmap-item {
  background: rgba(121, 85, 72, 0.03);
  border-radius: 6px;
  padding: 10px 12px;
  margin: 8px 0;
}
.rm-num {
  width: 22px; height: 22px; border-radius: 999px;
  background: #795548; color: white;
  font-size: 11px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  margin-right: 8px;
}
.rm-title { font-weight: 500; color: #3E2723; }
.rm-why { padding-left: 30px; }

.callout {
  background: rgba(121, 85, 72, 0.04);
  border-radius: 6px;
  padding: 10px 14px;
}
.callout p, .callout ul { margin: 6px 0; }
</style>
