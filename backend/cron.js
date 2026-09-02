import cron from 'node-cron';
import { SearchKeyword } from './models/SearchKeyword.js';
import { runKeyword } from './routes/keywords.js';
import { AuctionRound } from './models/AuctionRound.js';
import { collectKsiSessionsWithDates } from './ksi-scraper.js';

// 每天 08:00（本機時區）跑所有 active keywords + 偵測 KSI 新拍賣輪次
export function startCron() {
  const task = cron.schedule('0 8 * * *', async () => {
    await runAll();
    await checkNewAuctionRounds();
  }, {
    scheduled: true,
    timezone: process.env.TZ || undefined,
  });
  console.log('[cron] daily keyword search + KSI 新輪次偵測 scheduled at 08:00');
  return task;
}

export async function runAll() {
  const kws = await SearchKeyword.findAll({ where: { isActive: true } });
  console.log(`[cron] running ${kws.length} active keywords`);
  const results = [];
  for (const kw of kws) {
    try {
      const r = await runKeyword(kw);
      results.push(r);
      console.log(`[cron] "${kw.keyword}" → +${r.newTotal} new`);
    } catch (err) {
      console.error(`[cron] "${kw.keyword}" failed:`, err.message);
      results.push({ keywordId: kw.id, keyword: kw.keyword, error: err.message });
    }
  }
  return results;
}

// 掃 KSI 目前可見的所有 auction session，新出現的（auctionId 之前沒見過）記進 DB
// 讓 HomeView 的 banner 抓得到「新輪次」提醒，不用 Sam 自己記得去查
export async function checkNewAuctionRounds() {
  const sessions = await collectKsiSessionsWithDates();
  let newCount = 0;
  for (const s of sessions) {
    const [row, created] = await AuctionRound.findOrCreate({
      where: { auctionId: s.auctionId },
      defaults: {
        category: s.category,
        government: s.sampleGovernment,
        sampleTitle: s.sampleTitle,
        sampleItemId: s.sampleItemId,
        entryStart: s.entryStart,
        entryEnd: s.entryEnd,
        bidStart: s.bidStart,
        bidEnd: s.bidEnd,
        firstSeenAt: new Date(),
      },
    });
    if (created) newCount += 1;
    else {
      // 日期可能被 KSI 更新過，同步一下但不動 dismissedAt
      await row.update({
        entryStart: s.entryStart,
        entryEnd: s.entryEnd,
        bidStart: s.bidStart,
        bidEnd: s.bidEnd,
      });
    }
  }
  console.log(`[cron] KSI 輪次掃描：${sessions.length} 個 session，新增 ${newCount} 筆`);
  return { total: sessions.length, newCount };
}
