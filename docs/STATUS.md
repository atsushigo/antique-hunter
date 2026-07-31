# antique-hunter STATUS

**Last updated:** 2026-07-31 by Sam × Claude session

## 目前狀態：Phase 1 MVP 完成 ✅

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

### 2. 資料源補齊（9 筆 → 更多）
- 神戶蚤の市、奈良蚤の市目前資料稀薄
- STATUS 原稱 16 筆，需再爬 antique-leaves.com 補齊

### 3. Icon 品牌化
- 目前 icon 是放大鏡 placeholder（棕底 + 米金），Sam 可以之後換

### 4. 手機實測
- 建議 Sam 用手機連 `http://<Mac 內網 IP>:5173` 測拍照 flow
- iOS Safari「加入主畫面」測 PWA 桌面圖示

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
