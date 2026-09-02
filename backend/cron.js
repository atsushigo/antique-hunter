import cron from 'node-cron';
import { SearchKeyword } from './models/SearchKeyword.js';
import { runKeyword } from './routes/keywords.js';
import { AuctionRound } from './models/AuctionRound.js';
import { fetchAnnualSchedule } from './ksi-scraper.js';

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

// 字串 hash 成穩定整數 — auction_rounds.auction_id 欄位沿用舊的 INTEGER UNIQUE schema，
// 年間スケジュール沒有現成的數字 auctionId，用「輪次名稱+申込開始時間」算一個穩定 id 代替
function stableHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 掃 kankocho.jp/schedules/ 年間スケジュール，新出現的輪次記進 DB
// 讓 HomeView 的 banner 抓得到「新輪次」提醒，不用 Sam 自己記得去查
// 用官方年間スケジュール（而非逐物件爬蟲），連還沒上架物件的未來輪次也抓得到
export async function checkNewAuctionRounds() {
  const schedule = await fetchAnnualSchedule();
  let newCount = 0;
  for (const round of schedule) {
    const entry = round.periods.find((p) => p.label.includes('申し込み'));
    if (!entry) continue;
    const bidPeriods = round.periods.filter((p) => p !== entry);
    const bidStart = bidPeriods.length ? bidPeriods.map((p) => p.startJst).sort()[0] : null;
    const bidEnd = bidPeriods.length ? bidPeriods.map((p) => p.endJst).sort().pop() : null;
    const auctionId = stableHash(`${round.title}|${entry.startJst}`);
    const [row, created] = await AuctionRound.findOrCreate({
      where: { auctionId },
      defaults: {
        category: null,
        government: round.title,
        sampleTitle: round.statusLabel,
        sampleItemId: null,
        entryStart: entry.startJst,
        entryEnd: entry.endJst,
        bidStart,
        bidEnd,
        firstSeenAt: new Date(),
      },
    });
    if (created) newCount += 1;
    else {
      await row.update({ entryStart: entry.startJst, entryEnd: entry.endJst, bidStart, bidEnd, sampleTitle: round.statusLabel });
    }
  }
  console.log(`[cron] KSI 年間スケジュール掃描：${schedule.length} 輪，新增 ${newCount} 筆`);
  return { total: schedule.length, newCount };
}
