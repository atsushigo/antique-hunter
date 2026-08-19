# antique-hunter

Sam 個人用的**日本二手/古董撿漏工具**（Mobile-First PWA）。

拍照 → AI 估價 · 追蹤新上架 · 官公庁拍賣日曆 · 市集情報 · 收藏管理

---

## Quick start

```bash
# 1. Env
cp .env.example backend/.env
#    填 ANTHROPIC_API_KEY（沒填會走 mock 模式，UI/流程都能跑）

# 2. Backend
cd backend && npm install && npm run db:migrate && npm run db:seed && npm start
# → http://localhost:3000

# 3. Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

**驗證：**
```bash
bash backend/scripts/smoke-test.sh          # 35 項 HTTP + API
node backend/scripts/browser-check.js       # 27 項 Playwright DOM
```

---

## 功能地圖

| Route | 功能 |
|---|---|
| `/` | 首頁：3 主功能大卡 |
| `/camera` | 拍照/選相片鑑定（1-5 張 + 補充描述） |
| `/url` | 貼 Mercari / Yahoo Auction / Rakuma / Jimoty URL 估價 |
| `/inbox` | 追蹤關鍵字新上架（Cron 每天 08:00） |
| `/calendar` | 關西市集 + KSI 官公庁拍賣 milestone |
| `/gov-auctions` | KSI 車輛 / 一般 / 不動產瀏覽 + 手冊 + 8 站對照 |
| `/history` `/collection` `/knowledge` | 鑑定歷史、收藏、拍賣觀察筆記 |
| `/accounts` `/jimoty` | 4 站帳號連接 + Jimoty 收藏/貼文 |
| `/pipeline` | 鑑定流程設計（dev doc） |

---

## Tech Stack

- **Frontend：** Vue 3 Composition API + Vuetify 3 + Vite + PWA (`vite-plugin-pwa`)
- **State：** Pinia + IndexedDB (`idb`) 本地暫存
- **Backend：** Node.js + Express + Sequelize
- **DB：** SQLite（Phase 1；資料量大時 Sequelize dialect 一行換 PostgreSQL）
- **AI：** Claude Vision（`@anthropic-ai/sdk`）
- **Scraping：** Playwright headless Chromium + `fetch`（KSI 用 Next.js RSC 解析）
- **Cron：** `node-cron` 每天 08:00
- **Language：** 純 JavaScript

---

## 文件

| File | 用途 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Claude Code session 規則（自動 load） |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | **完整交接文件（新 session 接手看這）** |
| [`docs/STATUS.md`](docs/STATUS.md) | 目前開發進度 |
| [`docs/APPRAISAL_PIPELINE.md`](docs/APPRAISAL_PIPELINE.md) | 鑑定流程完整設計 + 下一步 roadmap |

---

## Scope 排除

- ❌ 自動出價 / 自動送訊息 / auto-offer — 一律不做（避免誤操作損失）
- ❌ TypeScript — 純 JS 保持簡潔
- ❌ 對外多用戶 — 單人用，不做 auth/tenancy
