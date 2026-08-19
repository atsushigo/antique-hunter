# antique-hunter STATUS

**Last updated:** 2026-08-20

> 目前開發狀況一覽。詳細技術/交接請看 `docs/HANDOFF.md`；下一步 roadmap 看 `docs/APPRAISAL_PIPELINE.md`。

---

## 目前狀態

**已完成到 Phase 9 · 交接文件**（單人專案，phase 純粹是里程碑標記）

```
Phase 1 · MVP：拍照鑑定 + 市集日曆 + PWA          ✅ 2026-07 完成
Phase 2 · URL 估價 + 收藏 + 統計                   ✅
Phase 3 · 追蹤新上架 + Cron + 即時搜尋 + 歷史       ✅
Phase 4 · 知識庫（估價 vs 成交 accuracy）           ✅
Phase 5 · 官公庁拍賣（KSI + 距離 + 手冊 + 8 站對照） ✅
Phase 6 · Calendar 整合 KSI milestone              ✅
Phase 7 · UI 精簡 + 新手 UX                         ✅
Phase 8 · Camera 多張照片 + 補充描述                ✅
Phase 9 · 交接文件（CLAUDE.md + HANDOFF.md）        ✅ 2026-08-20
```

**下一步（by ROI）：** 見 `docs/APPRAISAL_PIPELINE.md` 或 app 內 `/pipeline` view
1. 部 backend 到 Hetzner CX33 ← 最大 QoL
2. OCR container（Tesseract）→ 型號準度
3. 議價目標 + 大字判斷 UI
4. 反向圖搜（optional）

---

## 目前可跑

```bash
# Backend（sqlite 自動建檔）
cd backend && npm install && npm run db:migrate && npm run db:seed && npm start
# → http://localhost:3000/api/health

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173

# 驗證
bash backend/scripts/smoke-test.sh          # 35/35
node backend/scripts/browser-check.js       # 27/27
```

沒 `ANTHROPIC_API_KEY` 走 mock 模式（前後端串接可跑通，estimate 是假）。

---

## 主要 API endpoint 分布

- 鑑定：`/api/appraisal`（拍照 1-5 張 + description）、`/appraisal/url`
- 追蹤：`/api/keywords`（CRUD + `/inbox` 分頁）
- 拍賣：`/api/gov-auctions?category=`、`/api/auction-schedule`、`/api/auction-sources`
- 市集：`/api/markets`、`/api/events`
- 知識：`/api/knowledge`
- 帳號：`/api/auth/status`、`/api/jimoty/*`
- 其他：`/api/search?q=`、`/api/img-proxy?url=`

## 17 個 view

Home / Camera / URL / Result / Inbox / Keywords / Search / Calendar / Markets /
GovAuctions / GovAuctionsGuide / Knowledge / History / Collection / Accounts /
Jimoty / **PipelineDoc (dev doc)**

---

## 已測平台

- ✅ macOS Chrome / Safari desktop
- ✅ iOS Safari「加入主畫面」PWA
- ⚠️ Android 拍照按鈕已修（拆兩鈕，避 `capture="environment"` lock）

## 待決策

- **部 Hetzner 時機** — Sam 隨時可動；當前手動只有 Mac 開才能用
- **Claude model 選型** — 目前 haiku-4-5，若品牌型號準度不夠可升 sonnet-4-6 / opus-4-7
- **SerpAPI 要不要付** — 反向圖搜 $50/月，可靠但要 $

## 授權範圍（給 AI session）

- ✅ 建/改/刪任何檔案、npm、git commit
- ✅ **可直接 push main**（單人 repo，Sam 一人 review）
- ❌ 不部署到 Hetzner（等 Sam 明確授權）
- ❌ 沒 `--force` / `--no-verify` / 呼叫危險 API

---

## 相關文件

- `README.md` — GitHub 首頁快速起步
- `CLAUDE.md` — Claude Code session 硬規則
- `docs/HANDOFF.md` — 完整交接（新 session 能接手）
- `docs/APPRAISAL_PIPELINE.md` — 端到端流程 + 下一步 roadmap
