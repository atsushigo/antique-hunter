# antique-hunter

AI 輔助的日本二手/古董撿漏工具 — Mobile-First PWA + Node.js API

## Scope

**Phase 1 MVP**
- 市集情報 Dashboard（關西骨董市/蚤の市時程與交通）
- 拍照鑑定+估價（相機/相簿選圖 → 預覽 → Claude Vision → 估價）
- PWA 加桌面圖示 + 離線暫存待送圖片

**Phase 2**
- URL 貼上估價（Mercari/Yahoo Auction）
- 收藏管理 + 行情資料庫

## Tech Stack

- **Frontend**：Vue 3 Composition API + Vuetify 3 + Vite + PWA
- **Backend**：Node.js + Express + Sequelize
- **Database**：SQLite（Phase 1；Phase 2+ 資料量大時可換 PostgreSQL，Sequelize dialect 換一行）
- **AI**：Anthropic Claude Vision（API）
- **Deployment**：共用 Hetzner `personal-02` VPS（非交易類個人服務公用）
- **Language**：純 JavaScript（不用 TypeScript）

## 使用場景

- 【市集現場 — 手機】拍照 → 預覽 → 送 AI → 3-5 秒看到類別/年代/估價/真偽風險
- 【回家 — 電腦】桌機打開 → 查今天拍的物件詳細 → 貼 URL 深入比價（Phase 2）

## Local Dev

```bash
# Backend（SQLite 自動建檔，免起 Docker）
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## 相關 Memory

- `~/.claude/projects/-Users-user-Desktop/memory/project_antique_hunter.md`
- `~/.claude/projects/-Users-user-Desktop/memory/reference_antique_hunter_scaffold.md`
- `~/.claude/projects/-Users-user-Desktop/memory/reference_kansai_antique_markets.md`
- `~/.claude/projects/-Users-user-Desktop/memory/reference_japan_secondhand_channels.md`
