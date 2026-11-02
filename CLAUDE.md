# CLAUDE.md · antique-hunter

**這份是給 Claude Code session 讀的規則。開始工作前務必先讀 `docs/HANDOFF.md`。**

---

## Repo 一句話定位

Sam 個人用的日本二手/古董撿漏 PWA — Vue 3 + Node.js + Express + SQLite + Claude Vision。

## 使用者上下文（省得每次問）

- **Sam** = 唯一 user，[redacted]，有車
- 目標：骨董 / 中古車 / 手錶 / 相機 / 官公庁拍賣品
- [redacted]
- [redacted]

## Tech Stack

| 層 | 選型 |
|---|---|
| Frontend | Vue 3 Composition API + Vuetify 3 + Vite + PWA |
| State | Pinia + IndexedDB (`idb`) |
| Backend | Node.js + Express + Sequelize |
| DB | SQLite (`backend/data/antique_hunter.sqlite`) |
| AI | Claude Vision（`@anthropic-ai/sdk`），default `claude-haiku-4-5-20251001` |
| Scraping | Playwright headless Chromium + `fetch` (Next.js RSC 解析) |
| Cron | `node-cron` 08:00 每日追蹤 |
| Language | **純 JavaScript**（不要引入 TypeScript） |

## Local Dev 端口

- Backend `:3000`
- Frontend `:5173`
- Sam 用 Mac，Playwright / DB 檔都在 `backend/`

## 慣例 · 硬規則

**Commits：**
- 繁中 message OK
- 標題 + 空行 + 詳細條列（見 `git log`）
- **不要**用 `--no-verify`, `--force`, `--amend`（已 push 的）
- 個人 repo，直接 push main 沒 PR
- 除非明確要求，別加 `Co-Authored-By: Claude`

**Testing（前置：dev server 兩個都要跑）：**
- Backend `:3000` — `cd backend && npm start`（smoke test 需要）
- Frontend `:5173` — `cd frontend && npm run dev`（browser check 需要）
- 每輪改動跑 `bash backend/scripts/smoke-test.sh`（35 項）
- Frontend 改跑 `node backend/scripts/browser-check.js`（27 項）
- **UI 改自己截圖驗證** 別讓 Sam 開瀏覽器才發現壞
- 全綠才 commit

**檔案：**
- 沒必要**不要建新檔**（優先編既有）
- 沒必要**不要建 .md**（除非 Sam 明說）
- `backend/data/` 內只有 `*.sqlite` / `img-cache/` / `sessions/` 被 gitignore，code files 要進 git
- App bar 已顯示 `route.meta.title`，body 內**不要**再寫重複 title

## 慣例 · 軟規則（Sam 的偏好）

**UI：**
- 極簡，資訊一眼看懂
- 避免重複入口、重複標題、無意義資料
- Buttons 兩顆 > dropdown（tap 更快）
- 空狀態要有 CTA + friendly icon（別只寫「沒資料」）
- Icon-only button 加 `title` tooltip
- 卡片要能一行多卡（不是每張全寬）
- 分頁用真頁碼，不用「載入更多」按鈕
- Vuetify theme 棕色主色 `#795548`（`antiqueLight`）

**溝通：**
- 探索性問題 → 給 2-3 選項 + 建議 + tradeoff，讓 Sam 決定
- 明確 task → 直接做完，不要問確認
- **回答要精確**：Sam 問 A，別答 A + B + C
- Sam 說 "反正能自動去做" = autopilot 過關，往前推
- Sam 說 "全做" = 一次做完不要一步步問

**除錯：**
- 爬蟲 fail → 先假設 site 變了 / IP 被擋（Cloudflare geo-block 常見），不要當 code bug
- 圖片 broken → 先看是不是 Cloudflare 擋台灣 IP
- 「找不到紀錄」→ 可能 IndexedDB 舊 mock 已被 auto-purge

## 已知 gotchas（別重踩）

1. **Jimoty 圖片台灣 IP 常被 Cloudflare 擋** → img-proxy 磁碟 cache 有救
2. **KSI `?q=` 無效** → 用 category browse
3. **KSI 用 Next.js RSC** → 資料在 `self.__next_f.push([1, "..."])` streams
4. **Playwright** 常駐 500-800 MB，只在 scrape 時起
5. **Jimoty auth** 只能 CLI 貼 cookie（Turnstile 擋不能自動登）
6. **Camera Android** `capture="environment"` 會鎖只能相機 → 已拆兩鈕

## 推薦下一步（by ROI）

見 `docs/APPRAISAL_PIPELINE.md` 或 `/pipeline` view。當下最有 ROI：
1. **部 backend 到 Hetzner** ← 沒這步出門 app 是死的
2. OCR container (Tesseract) → 型號準度
3. 議價目標 UI
4. 反向圖搜（optional，SerpAPI $$）

---

**深入細節看 `docs/HANDOFF.md`（含 Patterns · 如何加新東西 section）。**

**Repo：** `atsushigo/antique-hunter`。Local git remote 用 SSH alias `git@github-atsushigo:...`。
