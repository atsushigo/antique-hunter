# antique-hunter STATUS

**Last updated:** 2026-08-01 by Sam × Claude session

## 目前狀態：Phase 1 MVP + 日曆 view 完成 ✅

## 已完成

### 前置決策
- ✅ 需求梳理：Mobile-First PWA + Node.js API，MVP scope = 市集 Dashboard + 拍照鑑定
- ✅ 技術棧定案：Vue 3 + Vuetify / Node.js Express / **純 JavaScript**
- ✅ 部署方向：共用 Hetzner `personal-02` VPS
- ✅ 本地資料夾：`~/Personal/antique-hunter/`
- ✅ Git repo：`https://github.com/[redacted]/antique-hunter`（PRIVATE）
- ✅ **DB 選型定案：SQLite**（Sam 拍板 2026-07-31；省 RAM、免 Docker、Sequelize 未來可換 PG）

### Phase 1 開發
- ✅ Phase 1-0 骨架對齊 SQLite（commit `3426a4f`）
- ✅ Phase 1-1 Backend 骨架（Express + Sequelize + /api/health）（commit `be856a0`）
- ✅ Phase 1-2 Market model + GET /api/markets（commit `4507968`）
- ✅ Phase 1-3 關西骨董市 seeder 9 筆（commit `3b857cf`）
  - 註：STATUS 原稱 16 筆，reference_kansai_antique_markets.md 實際只 9 筆，待補資料源
- ✅ Phase 1-4 拍照鑑定 API：image.js + claude.js（含 mock 模式）+ AppraisalLog + POST /api/appraisal（commit `d08dd58`）
- ✅ Phase 1-5 Frontend 骨架：Vue 3 + Vuetify + Pinia + Router + axios + idb（commit `12bb3b3`）
- ✅ Phase 1-6+7 Views + Pinia Stores + IndexedDB 離線 queue（commit `500509a`）
- ✅ Phase 1-8 PWA 配置：manifest + Service Worker + icons（commit `1beae57`）
- ✅ Phase 1-9 資料擴充 9 → 18 筆市集（含 東寺弘法市 1,200 攤、平安蚤の市 具體日期、万博蚤の市 春秋、関西蚤の市、四天会、十三市、北野天神市 等）
- ✅ Phase 1-10 `MarketEvent` 表 + seeder（規則型市集展開 12 個月 = 161 場活動）
- ✅ Phase 1-11 `GET /api/events?from=&to=` + Pinia store + PWA cache
- ✅ Phase 1-12 CalendarView（agenda 列表，可切 30/60/180 天）+ 底部 nav 加日曆 tab
- ✅ Phase 1-13 和風 icon（桜家紋 on 米金圓，棕底）+ `npm run gen:icons`

## 目前可跑

```bash
# Backend
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev
# → http://localhost:3000/api/health / /api/markets / POST /api/appraisal

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

沒設 `ANTHROPIC_API_KEY` 時鑑定 API 走 mock 模式，可完整跑通前後端串接。

## 待決策 / 待補

### 1. Anthropic API Key
- **待 Sam 申請**（https://console.anthropic.com）
- 加到 `backend/.env` `ANTHROPIC_API_KEY=sk-ant-xxxxx` 後即可切真 API

### 2. 資料源補齊
- ✅ 已補：18 筆市集 + 182 場 12 個月活動
- ✅ 已補：神戸三宮アンティークフェア（年 3 回，さんちかホール 20+ 攤，免費鑑定）
- ✅ 已補：Sutekia Market 宝塚（宝塚市立文化芸術センター 40-50 攤）
- ✅ 已補：神戸蚤の市（元町 4 丁目商店街 34 攤，年 1-2 回 pop-up）— 但下次日期未公告，追 IG「神戸蚤の市 | KOBE NOMINOICHI」看新場次

### 3. Icon 品牌化
- ✅ 已改：桜家紋（五瓣）on 米金雙圈 + 棕底（`frontend/public/icons/source.svg`）
- 想換：改 SVG 後 `cd backend && npm run gen:icons`

### 4. 手機實測（Sam 待做）
- 內網 URL：`http://192.168.0.2:5173`（or Tailscale：`http://100.90.160.114:5173`）
- iOS Safari「加入主畫面」測 PWA 桌面圖示（新 icon 生效）
- 測拍照 flow：Home → 拍照 → 預覽 → 送出（mock 回應）

## 下一步：Phase 2 藍圖

- URL 貼上估價（Mercari / Yahoo Auction 爬蟲，需 Playwright）
- 收藏管理 + 行情資料庫（PriceHistory model）
- 管理後台（admin/ 用 Element Plus）
- 部署到 Hetzner personal-02（Docker Compose 併入 stack）

## 授權範圍

- ✅ 建/改/刪本專案內任何檔案
- ✅ npm install / node（本機）
- ✅ 本地 git commit（不 push）
- ❌ **不 push 到 GitHub**（Sam 手動打 `! git push`）
- ❌ **不呼叫真 Claude API**（沒 key，Sam 加 key 後才啟動）
- ❌ **不部署到 Hetzner personal-02**

## 行為守則

- Commit message 用中文
- 不加 `Co-Authored-By: Claude`
- Git identity: `[redacted]` / `Sam Wu`
- 檔案搬移只留一份

## 相關 Memory

- `project_antique_hunter.md` — 產品構想 + 技術棧 + 部署方案
- `reference_antique_hunter_scaffold.md` — 資料夾結構 + package.json + 命名規則
- `reference_kansai_antique_markets.md` — 關西骨董市資料源
- `reference_japan_secondhand_channels.md` — 未鑑定貨源通路（Phase 2 URL 估價設計參考）
