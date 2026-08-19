# antique-hunter · 交接文件（HANDOFF）

**目的：** 一個沒看過這 repo 的人（人類 or AI session）看完這份能接手繼續開發。
**Last updated：** 2026-08-20（含 patterns section + repo migrate 到 atsushigo）

---

## 1 · 這是什麼

**antique-hunter** 是 Sam 個人使用的**日本二手/古董撿漏工具**（PWA），核心功能：
- **拍照鑑定** — 手機拍物件 → Claude Vision → 類別 / 年代 / 估價 / 仿品風險
- **關西市集日曆** — 大阪/京都/兵庫/奈良 骨董市 + 蚤の市時程
- **追蹤新上架** — 設關鍵字，每天早 8:00 自動查 Yahoo Auction + Jimoty
- **官公庁拍賣** — KSI（kankocho.jp）車輛/一般/不動產瀏覽 + milestone events 進 Calendar
- **知識庫** — 觀察拍賣 → 估價 vs 成交 → 學習指標
- **收藏 / 歷史 / 帳號連接（Yahoo/Mercari/Rakuma/Jimoty session）**

**使用者：** 只有 Sam 一個人（個人專案，不對外）。

---

## 2 · 使用者背景（Sam）

決策時要考慮以下（避免每次都問）：

| 項目 | 值 |
|---|---|
| 常住點 A | 武庫川団地（兵庫尼崎 [redacted]） |
| 常住點 B | 通天閣（大阪 [redacted]） |
| 交通 | 有車 → 20-50km 內物件可自取（省 ¥3-10k 運費） |
| 目標物件 | 骨董 / 中古車 / 手錶 / 相機 / 老家具 / 官公庁拍賣品 |
| [redacted] |
| [redacted] |
| 開發習慣 | 極簡 UI，資訊要一眼看懂；喜歡真分頁不是「載入更多」；卡片要能一行多卡 |
| 語言偏好 | 對話用繁中；code comments/commit messages 也繁中 OK |

計算距離時用 `backend/data/prefectures.js` 的 `distanceFromHome(govName)` → 兩點取最小值 + `(武)` / `(通)` 標記。

---

## 3 · Tech Stack

- **Frontend：** Vue 3 Composition API + Vuetify 3 + Vite + PWA (`vite-plugin-pwa`)
- **State：** Pinia + IndexedDB（`idb`）本地暫存鑑定 log
- **Backend：** Node.js + Express + Sequelize + SQLite（Phase 1）
- **AI：** Anthropic Claude Vision（`@anthropic-ai/sdk`），預設 model `claude-haiku-4-5-20251001`
- **Scraping：** Playwright headless Chromium（Mercari / Rakuma / Jimoty SPA） + `fetch` for RSC (Next.js `self.__next_f.push()` 解析，KSI 用這招)
- **Cron：** `node-cron` 每天 08:00 跑追蹤關鍵字
- **Language：** 純 JavaScript（無 TypeScript）

---

## 4 · 目前部署狀況

**現況：只跑本機 Mac（backend :3000, frontend :5173）**
- 出門手機打開 app = 死的（除非 Mac 開著 + 網路能連 localhost，不可能）
- SQLite 在 `backend/data/antique_hunter.sqlite`
- 沒推到 Hetzner（下一階段）

**計畫部署（見 `docs/APPRAISAL_PIPELINE.md`）：**
- Backend → Hetzner CX33（跟 其他個人專案共用，剩 ~4GB RAM）
- Frontend PWA → Cloudflare Pages（免費 static）
- Auth → 單人簡易 API token header
- Public 存取 → subdomain + Cloudflare tunnel

---

## 5 · 目錄結構

```
antique-hunter/
├── README.md                      GitHub 首頁
├── CLAUDE.md                      給 Claude Code session 讀的規則
├── .env.example                   env 樣板
├── docs/
│   ├── HANDOFF.md                 這份（新 session 接手用）
│   ├── STATUS.md                  當下開發進度
│   └── APPRAISAL_PIPELINE.md      鑑定流程完整設計
├── backend/
│   ├── server.js                  Express entry
│   ├── config.js                  env 讀取
│   ├── db.js                      Sequelize connect
│   ├── cron.js                    每日 08:00 追蹤 job
│   ├── claude.js                  Claude Vision 封裝 + mock 模式
│   ├── image.js                   sharp 處理上傳
│   ├── browser.js                 Playwright 共用 browser
│   ├── search-scrape.js           Yahoo Auction / Jimoty scraper
│   ├── url-fetch.js               URL 估價 SSRF-safe metadata 抓取
│   ├── routes/                    API endpoints（見下）
│   ├── models/                    Sequelize models（見下）
│   ├── data/
│   │   ├── antique_hunter.sqlite  DB（gitignore）
│   │   ├── prefectures.js         都道府縣 + 距離計算
│   │   ├── auction-sources.js     8 個拍賣管道 metadata
│   │   ├── img-cache/             img proxy 磁碟 cache（gitignore）
│   │   └── sessions/              帳號 session cookies（gitignore）
│   ├── scripts/
│   │   ├── smoke-test.sh          HTTP + API 一鍵驗證（每輪改動跑）
│   │   ├── browser-check.js       Playwright DOM 驗證
│   │   ├── auth-login.mjs         帳號登入 CLI
│   │   └── gen-icons.mjs          PWA icon 產生
│   ├── migrations/                Sequelize migrations
│   └── seeders/                   關西市集 seed data
└── frontend/
    ├── src/
    │   ├── main.js                Vue app entry
    │   ├── App.vue                app-bar + router-view + BottomNav
    │   ├── router.js              所有 route + meta.title
    │   ├── api.js                 axios instance（VITE_API_BASE_URL）
    │   ├── db.js                  IndexedDB（idb）
    │   ├── labels.js              siteLabel / hostLabel / proxiedImg 共用 util
    │   ├── vuetify.js             theme 定義（棕色 #795548 主色 = antiqueLight）
    │   ├── views/                 每個 route 一個
    │   ├── components/            共用元件
    │   ├── stores/                Pinia stores
    │   └── composables/           priceFilter 等
    ├── vite.config.js             含 PWA plugin 設定
    └── package.json
```

### API endpoints（`backend/routes/*`）

| Route | 用途 |
|---|---|
| `GET /api/health` | 健康檢查 |
| `GET /api/markets` | 關西市集列表（seed 資料，18 筆） |
| `GET /api/events?from=&to=` | 市集展開的具體場次 |
| `POST /api/appraisal` | 拍照鑑定（multipart `images[]`, 1-5 張, + optional `description`） |
| `POST /api/appraisal/url` | URL 估價（Mercari/Yahoo/Rakuma/Jimoty） |
| `POST /api/appraisal/url/preview` | URL 純預覽（不呼 Claude） |
| `GET /api/appraisal/history` | 鑑定歷史 |
| `GET /api/appraisal/stats` | 統計摘要 |
| `POST /api/appraisal/:id/collect` | 收藏 toggle |
| `GET /api/appraisal/collection` | 收藏列表 |
| `GET /api/keywords` | 追蹤關鍵字列表 |
| `POST /api/keywords` | 加關鍵字 |
| `PATCH /api/keywords/:id` | 改（含 excludeKeywords / categoryHint） |
| `DELETE /api/keywords/:id` | 刪 |
| `POST /api/keywords/:id/run` | 立即跑一次 |
| `GET /api/keywords/inbox` | 收件匣（分頁 + filter） |
| `GET /api/search?q=` | 即時搜尋 Yahoo + Jimoty |
| `GET /api/gov-auctions?category=car|general|real-estate` | KSI 官公庁瀏覽 |
| `GET /api/auction-schedule?from=&to=` | KSI 4 個 milestone events → Calendar |
| `GET /api/auction-sources` | 8 個拍賣管道 metadata（Guide 頁對照表） |
| `GET /api/knowledge` | 知識庫列表 + accuracy stats |
| `POST /api/knowledge` | 新增筆記 |
| `PATCH/DELETE /api/knowledge/:id` | 改/刪 |
| `GET /api/auth/status` | 4 站帳號登入狀態 |
| `GET /api/jimoty/favorites` | Jimoty 收藏 |
| `GET /api/jimoty/my-posts` | Jimoty 我的貼文 |
| `GET /api/img-proxy?url=` | 圖片 proxy + 磁碟 cache（繞 Cloudflare geo-block） |

### Sequelize models（`backend/models/*`）

- `Market` — 關西市集元資料
- `MarketEvent` — 市集展開的具體場次（seeder 依規則產 12 個月 = 161 場）
- `AppraisalLog` — 每次鑑定記錄
- `PriceSnapshot` — URL 掛牌價時序（供趨勢圖）
- `SearchKeyword` + `TrackedListing` — 追蹤關鍵字 + 新上架 listings
- `AuctionKnowledge` — 手動記錄的拍賣觀察

### Views（`frontend/src/views/*`，17 個）

| Route | View | 用途 |
|---|---|---|
| `/` | HomeView | 首頁：3 主功能大卡 + 次要工具列 |
| `/camera` | CameraView | 拍照/選相片（1-5 張）+ 補充描述 |
| `/url` | UrlAppraisalView | 貼商品 URL 估價 |
| `/result/:localId` | ResultView | 鑑定結果 |
| `/inbox` | InboxView | 追蹤關鍵字新上架 |
| `/keywords` | KeywordsView | 管理追蹤條件（FAB + dialog） |
| `/search` | SearchView | 即時搜 Yahoo + Jimoty |
| `/calendar` | CalendarView | 月曆：市集 + KSI 拍賣 milestone |
| `/markets` | MarketsView | 市集列表 |
| `/gov-auctions` | GovAuctionsView | KSI 車輛/一般/不動產 |
| `/gov-auctions/guide` | GovAuctionsGuideView | 拍賣入門手冊 + 8 站對照 |
| `/knowledge` | KnowledgeView | 拍賣觀察筆記 |
| `/history` | HistoryView | 鑑定歷史 |
| `/collection` | CollectionView | 收藏 |
| `/accounts` | AccountsView | 4 站帳號連接 |
| `/jimoty` | JimotyView | 我的 Jimoty（收藏 + 貼文） |
| `/pipeline` | PipelineDocView | 鑑定流程設計 dev doc |

### Pinia stores（`frontend/src/stores/*`）
- `appraisals` — 鑑定 log（含 IndexedDB 暫存）
- `keywords` — 追蹤 + inbox
- `events` — 市集 + KSI auction 事件（Calendar）
- `markets` — 市集元資料

---

## 6 · Local Dev 起法

```bash
# 一次性
git clone https://github.com/atsushigo/antique-hunter
cd antique-hunter
cp .env.example backend/.env     # 填 ANTHROPIC_API_KEY（沒填會走 mock 模式）
cd backend && npm install && npm run db:migrate && npm run db:seed
cd ../frontend && npm install

# 每次
cd backend && npm start          # port 3000
cd frontend && npm run dev       # port 5173

# 驗證
bash backend/scripts/smoke-test.sh          # 35/35 HTTP + API check
node backend/scripts/browser-check.js       # 27/27 Playwright DOM check
```

**沒 ANTHROPIC_API_KEY 也能開發：** claude.js 有 mock 模式，鑑定會回假資料（`mock: true`）。UI 會自動清 mock 資料以免混淆真結果。

---

## 7 · 已知 gotchas / 陷阱

**要進來就知道，別重踩：**

1. **Cloudflare geo-block Jimoty 圖片** — Sam 在台灣 VPN 時 Jimoty CDN 擋圖 → img-proxy 有磁碟 cache（`backend/data/img-cache/`）+ InboxView 有 fallback UI（🚫 Geo 擋）。解法：切 JP VPN 抓一次後永久 cache
2. **KSI keyword search `?q=` 無效** — kankocho.jp 前端假裝有 q 參數但 backend 不 filter。轉用 category browse（`/search/car/` / `/search/general/` / `/search/real-estate/`）
3. **KSI 使用 Next.js RSC** — 資料在 `self.__next_f.push([1, "..."])` streams，需 `JSON.parse` decode 後正則掃。`backend/routes/gov-auctions.js` + `auction-schedule.js` 用這招
4. **Playwright browser 記憶體** — Chromium 常駐 ~500-800MB，只在 scrape 時起，`browser.js` 有 close 機制
5. **Jimoty 需 cookie session** — 走 `npm run auth:login jimoty` CLI 貼 Chromium DevTools 抓的 cookie value（不能自動登，`ja` domain 有 Turnstile）
6. **BIT 裁判所競売正確 URL 是 `www.bit.courts.go.jp`**（不是 `bit.sikkou.jp`）
7. **`backend/data/` 內混 code + DB + cache** — `.gitignore` 只擋 `*.sqlite / img-cache/ / sessions/`，code files（`prefectures.js`, `auction-sources.js`）要進 git
8. **App bar 已有 route.meta.title** — body 內別再寫 h6 標題，會重複
9. **拍照按鈕 mobile Android 若加 `capture="environment"` 會鎖只能相機**。現在拆兩鈕：拍照 = 有 capture、選相片 = 無 capture（手機開相簿、桌面開檔案總管）

---

## 8 · Testing 慣例

**前置：** 這兩個 test 都需要 dev server 跑著：
- `backend/scripts/smoke-test.sh` → 需要 backend `:3000`（跑 `cd backend && npm start`）
- `backend/scripts/browser-check.js` → 需要 backend `:3000` + frontend `:5173`（多開一個 terminal 跑 `cd frontend && npm run dev`）

**每輪改動要跑：**

```bash
# 1. Backend HTTP + API check（35 項）
bash backend/scripts/smoke-test.sh

# 2. Frontend DOM check（27 項，用 repo 內 Playwright）
node backend/scripts/browser-check.js

# 3. UI 大改要人肉截圖確認
cat > /tmp/audit.mjs << 'EOF'
import { chromium } from '/Users/user/Personal/antique-hunter/backend/node_modules/playwright/index.mjs';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/your-route');
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/shot.png', fullPage: false });
await b.close();
EOF
node /tmp/audit.mjs
# Read /tmp/shot.png 給 Claude 看
```

**smoke test 期望：全綠 35/35** — 若有 fail 先修，不要進下一輪。

---

## 9 · Commit / PR 慣例

- **繁中 commit message OK**（Sam 自己 review 得懂）
- **Message 格式：** 標題一行 + 空行 + 詳細條列。範例：
  ```
  Calendar 加入 KSI 官公庁拍賣 milestone events

  新增 /api/auction-schedule 端點：抓 KSI 3 大 category 的當前
  auction sessions，每 session 展開為 4 個 milestone events...
  ```
- **Co-Authored-By 標記 Claude** — 只有 Sam 明確要求時才加
- **不用 PR，直接 push main** — 個人 repo，Sam 一人 review
- **絕不 `--no-verify`, `--force`**
- **推之前** 跑 smoke + browser check
- **UI 改動** 額外截圖確認再推

---

## 10 · Sam 的 collaboration preferences

**風格：**
- 極簡 UI，資訊一眼看懂
- 避免重複入口、重複標題、無意義資料
- Buttons 拆兩顆比一個下拉選單好（tap 更快）
- 空狀態要有 CTA，不要只寫「沒資料」
- Icon-only 按鈕加 `title` tooltip
- 新用戶友善（tagline / 建議 / hint）

**行為：**
- 探索性問題 → 給 2-3 個選項 + 建議 + tradeoff，讓 Sam 決定
- 明確 task → 直接做完，不要問確認
- **不要打斷 Sam 的思路** — 他問 A，你別答 A + B + C
- **每輪 commit + push**（不留本地未推）
- **UI 改完自己截圖驗證** 別讓 Sam 開瀏覽器才發現壞
- 遇到爬蟲 fail → 先假設 site 變了或 IP 被擋，不要當 code bug

---

## 11 · 目前開發到哪（2026-08-20）

**已完成的大功能：**
- ✅ Phase 1 MVP：拍照鑑定 + 市集日曆 + PWA
- ✅ Phase 2-1：URL 貼上估價（4 站）
- ✅ Phase 2-2：收藏 / 歷史 / 統計
- ✅ Phase 3：追蹤新上架（Cron + inbox + 分頁）
- ✅ Phase 4：知識庫（拍賣觀察 → estimate accuracy）
- ✅ Phase 5：官公庁拍賣（KSI 3 category + 距離 + 手冊 + 8 站對照）
- ✅ Phase 6：Calendar 整合 KSI 4 個 milestone
- ✅ Phase 7：UI 精簡（5 view）+ 新手 UX（tagline / CTA / tooltip）
- ✅ Phase 8：Camera 多張照片（1-5）+ 補充描述
- ✅ Phase 9：交接文件（這份 + CLAUDE.md + STATUS 刷新）
- ✅ Phase 10：Repo migrate 到 `atsushigo/antique-hunter`（2026-08-20，
  舊 repo `[redacted]/antique-hunter` 仍存在未動）

**下一步（by ROI，見 `/pipeline` view 或 `docs/APPRAISAL_PIPELINE.md`）：**
1. **部 backend 到 Hetzner CX33** ← 最大 QoL 提升，沒這步出門用不到
2. OCR container（Tesseract）→ 品牌型號準度提升
3. 議價目標 + 大字判斷 UI
4. 反向圖搜（SerpAPI）→ 真實成交當議價依據

---

## 12 · 外部依賴 / 帳號

**必要：**
- **Anthropic API key** — 沒 key 走 mock 模式 OK
- **GitHub** repo：https://github.com/atsushigo/antique-hunter（PRIVATE）

**選用：**
- **Yahoo JAPAN ID** — 用於 Yahoo Auction 收藏 + KSI 拍賣參加
- **Jimoty account** — cookie session（要 CLI 貼 Chromium DevTools 抓的 value）
- **Mercari / Rakuma account** — 同上機制
- **Hetzner VPS**（Sam 已有）— tmux `personal:4` 的 CX33，跟 其他個人專案共用
- **Cloudflare** — 若上線用 Pages + tunnel
- **SerpAPI** — 反向圖搜（$50/mo，optional）

---

## 13 · 找 Claude memory 相關記錄

若你是 Claude session，這 project 的 memory 存在：
- `~/.claude/projects/-Users-user-Personal-antique-hunter/memory/MEMORY.md` — 索引
- 相關檔案：user preferences、feedback records、project state
- 讀 memory 系統要先 read `MEMORY.md`

（memory 是 Claude Code 的功能，只在同一台 Mac 有；換裝置就靠這份 HANDOFF 接手）

---

## 14 · Patterns · 如何加新東西

**先看已有的**，比 scratch 寫快。所有 pattern 都能複製既有檔案改。

### 14.1 加新 API endpoint

複製最單純的 `backend/routes/auction-sources.js` 當範本：

```js
// backend/routes/foo.js
import { Router } from 'express';
export const fooRouter = Router();

fooRouter.get('/', async (req, res, next) => {
  try {
    res.json({ data: [...], count: 0 });
  } catch (err) { next(err); }
});
```

在 `backend/server.js` 註冊：
```js
import { fooRouter } from './routes/foo.js';
app.use('/api/foo', fooRouter);
```

**若要接 DB：** 看 `backend/routes/knowledge.js`（用 Sequelize models）
**若要爬外站：** 看 `backend/routes/gov-auctions.js`（fetch + Next.js RSC 解析）
**若要 Playwright：** 看 `backend/search-scrape.js`（用 `browser.js` singleton）

**加 smoke test：** 在 `backend/scripts/smoke-test.sh` 加一行 `check_json` 呼叫。

### 14.2 加新 view

複製 `frontend/src/views/CollectionView.vue`（結構最簡）：

```vue
<template>
  <v-container class="px-3 pb-16">
    <!-- app-bar 已顯示 route.meta.title，不要重複寫 -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <div v-else-if="!list.length" class="text-center pa-8">
      <!-- 空狀態要有 icon + 說明 + CTA -->
      <v-icon size="48" color="grey">mdi-inbox-outline</v-icon>
      <div class="text-body-2 mt-2">還沒有資料</div>
      <v-btn class="mt-3" color="primary" variant="tonal">去做點什麼</v-btn>
    </div>
    <!-- list rendering here -->
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const list = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/foo');
    list.value = data.data;
  } finally { loading.value = false; }
});
</script>
```

在 `frontend/src/router.js` 註冊：
```js
{
  path: '/foo',
  name: 'foo',
  component: () => import('./views/FooView.vue'),
  meta: { title: 'Foo 標題' }, // ← app-bar 用這個
}
```

**若要進 BottomNav：** 改 `frontend/src/components/BottomNav.vue`（5 tab 已滿，要換掉一個）
**若只要輔助入口：** `HomeView.vue` 次要工具列加一個 `v-btn`

**加 browser-check test：** 在 `backend/scripts/browser-check.js` 加 `await check(page, '/foo', {...})`

### 14.3 加靜態 seed 資料

如市集 / 拍賣管道這種手動維護的 metadata：
- **hardcode JS：** `backend/data/auction-sources.js` 那樣 export const 陣列
- **走 seeder：** `backend/seeders/*.cjs`（Market/MarketEvent 用這個，能改 DB）
- **註冊到 API：** 在 route file 內 import 資料

`backend/data/` 是 gitignore 過的（DB / cache / sessions 不進 git），但 `.js` code files 有例外 include，會進 git。

### 14.4 加 cron job

看 `backend/cron.js`。目前只有一個「每天 08:00 跑追蹤關鍵字」。加新 job 就 `cron.schedule('0 8 * * *', async () => {...})`。

**注意：** cron 只在 `npm start`（`server.js` 啟動時）跑。單跑 script 不會觸發。

### 14.5 常見改動的檔案速查

| 想做的事 | 改哪 |
|---|---|
| 加 API route | `backend/routes/`, `backend/server.js` |
| 加 DB 欄位 | `backend/models/`, `backend/migrations/` + `npm run db:migrate` |
| 加 view | `frontend/src/views/`, `frontend/src/router.js` |
| 加 BottomNav tab | `frontend/src/components/BottomNav.vue` |
| 加共用 API 呼叫 | `frontend/src/stores/`（Pinia store） |
| 加共用 util | `frontend/src/labels.js` 或 `composables/` |
| 加 seed 資料 | `backend/seeders/` 或 `backend/data/` |
| 改 theme 色 | `frontend/src/vuetify.js` |
| 改 app-bar / 底 nav | `frontend/src/App.vue`, `BottomNav.vue` |

---

## 附錄 · 一句話回答 Sam 常見疑問

- 「Claude API 是不是必要？」有 mock 模式可跑，但要真估價得付 $
- 「能不能 self-host VLM？」CX33 沒 GPU 跑不動；升 GEX 月 €500+，Sam 呼叫量 <1000/月時付 Claude 更便宜
- 「為什麼精準度不夠？」拍太少張、沒 OCR 抽字、Claude 對某些日本品類廣度有限
- 「什麼時候能出門用？」部 Hetzner 之後
- 「兵庫県警拍賣有嗎？」有，他們用 KSI 上架 → Calendar 已抓
- 「大阪府警自転車呢？」現場拍賣，沒穩定 schedule 可爬 → Guide 頁列連結
