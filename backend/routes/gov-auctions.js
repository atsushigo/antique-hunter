// KSI 官公庁瀏覽 — 依類別列出當前拍賣物件
// KSI 的 keyword search 不生效（`?q=` 只是 URL cosmetic），改成 category browse

import { Router } from 'express';
import { Op } from 'sequelize';
import { distanceFromHome } from '../data/prefectures.js';
import { AuctionKnowledge } from '../models/AuctionKnowledge.js';

export const govAuctionsRouter = Router();

// auctionId → { entryStart, entryEnd, bidStart, bidEnd } cache（KSI 一回 auction 全 items 共用）
const auctionDateCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時

async function fetchAuctionDates(sampleItemId, auctionId) {
  const cached = auctionDateCache.get(auctionId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.dates;
  try {
    const h = await fetch(`https://kankocho.jp/items/${sampleItemId}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then((r) => r.text());
    const streams = [...h.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) { try { full += JSON.parse(`"${s[1]}"`); } catch {} }
    // 抓 4 個 JP-format 日期：申請開始/終了、入札開始/終了
    const dates = [...full.matchAll(/2\d{3}年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分/g)]
      .map((m) => {
        const [_, mo, dy, hr, mn] = m;
        // 假設年份用當前年（或抓原字串前 4 chars）
        const yr = m[0].slice(0, 4);
        return `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')} ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
      });
    let out = null;
    if (dates.length >= 4) {
      out = {
        entryStart: dates[0],
        entryEnd: dates[1],
        bidStart: dates[2],
        bidEnd: dates[3],
      };
    }
    auctionDateCache.set(auctionId, { dates: out, at: Date.now() });
    return out;
  } catch (err) {
    console.warn('[gov-auctions] fetchAuctionDates failed:', err.message);
    return null;
  }
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORY_URL = {
  car: 'https://kankocho.jp/search/car/',
  'real-estate': 'https://kankocho.jp/search/real-estate/',
  general: 'https://kankocho.jp/search/',
};

// GET /api/gov-auctions?category=car|real-estate|general
govAuctionsRouter.get('/', async (req, res, next) => {
  try {
    const cat = String(req.query.category || 'general');
    const url = CATEGORY_URL[cat];
    if (!url) return res.status(400).json({ error: 'unknown_category', supported: Object.keys(CATEGORY_URL) });

    const html = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' },
    }).then((r) => {
      if (!r.ok) throw new Error(`ksi HTTP ${r.status}`);
      return r.text();
    });

    // 抽 RSC streaming chunks → 找 item JSON
    const streams = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let full = '';
    for (const s of streams) {
      try { full += JSON.parse(`"${s[1]}"`); } catch { /* skip */ }
    }
    const items = [];
    const seen = new Set();
    // 簡化：找每個 item 起點後，往後 3000 chars 內用 regex 抽獨立欄位
    // 不解析完整 JSON，因 RSC data 有 escape 難以 brace-track
    const idxRe = /\{"id":(\d+),"auctionId":(\d+)/g;
    let m;
    while ((m = idxRe.exec(full))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const win = full.slice(m.index, m.index + 3000);
      const get = (k) => {
        const mm = win.match(new RegExp(`"${k}":\\s*(null|"(?:[^"\\\\]|\\\\.)*"|\\d+(?:\\.\\d+)?|true|false)`));
        if (!mm) return null;
        const v = mm[1];
        if (v === 'null') return null;
        if (v.startsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (v === 'true') return true;
        if (v === 'false') return false;
        return Number(v);
      };
      const statusJP = get('statusJP');
      if (!['申し込み受付中', 'せり売中', '入札受付中', '申込受付中', '入札開始待ち', '入札中'].includes(statusJP)) continue;
      const openWay = get('openWay');
      const govMatch = win.match(/"government":\s*\{[^}]*?"name":"([^"]+)"/);
      const govName = govMatch ? govMatch[1] : '';
      const loc = distanceFromHome(govName);
      items.push({
        id: Number(id),
        auctionId: Number(m[2]),
        title: get('title') || '',
        priceJpy: get('estimateFee'),
        currentPriceJpy: get('price'),
        bidderCount: get('bidderTotalCount'),
        openWay,
        openWayJP: openWay === 'AUCTION' ? 'せり売' : (openWay === 'BOTH' ? 'せり売+入札' : '入札'),
        statusJP,
        government: govName,
        prefecture: loc.prefecture,
        region: loc.region,
        distanceKm: loc.distanceKm,
        nearestHome: loc.nearestHome,
        sourceUrl: `https://kankocho.jp/items/${id}/`,
      });
    }

    // 每 auctionId 抓一次 sample item detail 拿日期（cached）
    const uniqAuctions = [...new Set(items.map((i) => i.auctionId))];
    const auctionDates = {};
    for (const aid of uniqAuctions) {
      const sample = items.find((i) => i.auctionId === aid);
      if (sample) auctionDates[aid] = await fetchAuctionDates(sample.id, aid);
    }
    // 把日期塞回每個 item
    for (const i of items) i.auctionDates = auctionDates[i.auctionId] || null;

    // 依區域分組
    const byRegion = {};
    for (const i of items) {
      const key = i.region || '未知';
      if (!byRegion[key]) byRegion[key] = [];
      byRegion[key].push(i);
    }
    // 都道府縣 filter list
    const prefectureBreak = {};
    for (const i of items) {
      if (!i.prefecture) continue;
      prefectureBreak[i.prefecture] = (prefectureBreak[i.prefecture] || 0) + 1;
    }
    const stats = {
      totalItems: items.length,
      byRegion: Object.fromEntries(Object.entries(byRegion).map(([k, v]) => [k, v.length])),
      prefectures: Object.entries(prefectureBreak).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    };

    // 相似成功案例 — 從知識庫 filter 有 winning_price + 相同 category
    const kbCategory = cat === 'car' ? 'car' : cat === 'real-estate' ? 'real-estate' : 'general';
    const knowledgeCases = await AuctionKnowledge.findAll({
      where: {
        category: kbCategory,
        winningPriceJpy: { [Op.ne]: null },
        settledAt: { [Op.ne]: null },
      },
      order: [['settled_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'title', 'listingPriceJpy', 'winningPriceJpy', 'settledAt', 'notes'],
    });

    res.json({
      data: items,
      category: cat,
      total: items.length,
      stats,
      knowledgeCases: knowledgeCases.map((k) => ({
        id: k.id,
        title: k.title,
        listingPriceJpy: k.listingPriceJpy,
        winningPriceJpy: k.winningPriceJpy,
        settledAt: k.settledAt,
        notes: k.notes,
      })),
    });
  } catch (err) { next(err); }
});
