import cron from 'node-cron';
import { SearchKeyword } from './models/SearchKeyword.js';
import { runKeyword } from './routes/keywords.js';

// 每天 08:00（本機時區）跑所有 active keywords
export function startCron() {
  const task = cron.schedule('0 8 * * *', runAll, {
    scheduled: true,
    timezone: process.env.TZ || undefined,
  });
  console.log('[cron] daily keyword search scheduled at 08:00');
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
