# antique-hunter STATUS

**Last updated:** 2026-07-31 by Sam × Claude session

## 目前狀態：Phase 1 開發準備中

## 已完成

- ✅ 需求梳理：Mobile-First PWA + Node.js API，MVP scope = 市集 Dashboard + 拍照鑑定
- ✅ 技術棧定案：Vue 3 + Vuetify (前端) / Element Plus (後台 Phase 2+) / Node.js Express / **純 JavaScript 不用 TypeScript**
- ✅ 部署方向：共用 Hetzner `personal-02` VPS（多服務公用），基礎設施 memory 由 personal:4 session 主導
- ✅ 本地資料夾：`~/Personal/antique-hunter/`
- ✅ Git repo：`https://github.com/[redacted]/antique-hunter`（PRIVATE）
- ✅ 首次 commit `c55066d`：骨架 (README + .gitignore + .env.example + docker-compose + package.jsons)
- ✅ 資料夾結構簡化 + 命名統一（見 reference_antique_hunter_scaffold.md）

## 待決策（進 Phase 1 前）

### 1. DB 選型：SQLite vs PostgreSQL（**Claude 已建議改 SQLite**）
- 資料量估算：一年 15MB structured + 3-7GB 圖片（本機）
- **建議：SQLite**（省 200MB RAM、簡化部署、免 Docker、Sequelize 未來可換 PG）
- **待 Sam 拍板**

### 2. Anthropic API Key
- 拍照鑑定必要
- **待 Sam 申請**（https://console.anthropic.com）
- 沒 Key 時 claude.js 會實作但無法真呼叫，Sam 加 key 後即可運作

## 下一步：Phase 1 開發 8 步

1. Backend 骨架：`server.js` / `config.js` / `db.js`
2. `models/Market.js` + `routes/markets.js` (GET /api/markets)
3. `seeders/20260731-kansai-markets.js` 匯入 16 筆關西骨董市（資料源 → reference_kansai_antique_markets.md）
4. `claude.js` + `image.js` + `models/AppraisalLog.js` + `routes/appraisal.js` (POST /api/appraisal)
5. Frontend 骨架：`vite.config.js` / `main.js` / `App.vue` / `router.js` / `vuetify.js` / `api.js` / `db.js`
6. Views：`MarketsView.vue` / `HomeView.vue` / `CameraView.vue` / `ResultView.vue` + `BottomNav.vue`
7. Stores：`markets.js` / `appraisals.js`（含 IndexedDB 離線 queue）
8. PWA 配置：`vite-plugin-pwa` manifest + Service Worker

每步骤結束 commit 一次，push 由 Sam 手動打 `! git push`。

## 授權範圍（Sam 已允許 dangerous mode 全權操作）

- ✅ 建/改/刪本專案內任何檔案
- ✅ npm install / node / docker（本機）
- ✅ 本地 git commit（不 push）
- ✅ 起本地 dev server（backend / frontend / DB container）
- ❌ **不 push 到 GitHub**（照 feedback_git_push_keychain.md，Sam 手動打）
- ❌ **不呼叫真 Claude API**（沒 key，Sam 加 key 後才啟動）
- ❌ **不部署到 Hetzner personal-02**（那邊 session 主導部署 SOP）

## 行為守則（即使 bypass permissions 也遵守）

- Commit message 用中文（feedback_commit_message_chinese.md）
- 不加 `Co-Authored-By: Claude`（feedback_no_ai_coauthor.md）
- Git identity: `[redacted]` / `Sam Wu`
- 開檔案用 VSCode（feedback_open_with_vscode.md）
- 檔案搬移只留一份（feedback_single_source_of_truth.md）

## 相關 Memory

- `project_antique_hunter.md` — 產品構想 + 技術棧 + 部署方案
- `reference_antique_hunter_scaffold.md` — 資料夾結構 + package.json + 命名規則
- `reference_kansai_antique_markets.md` — 關西骨董市資料源（供 seeder 用）
- `reference_japan_secondhand_channels.md` — 未鑑定貨源通路（供 Phase 2 URL 估價設計參考）
