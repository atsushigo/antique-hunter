'use strict';

// 事件產生範圍：從今天起 12 個月
const START = new Date();
START.setHours(0, 0, 0, 0);
const END = new Date(START);
END.setMonth(END.getMonth() + 12);

const toISO = (d) => d.toISOString().slice(0, 10);

function* eachMonth(from, to) {
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const stop = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= stop) {
    yield { year: cur.getFullYear(), month: cur.getMonth() };
    cur.setMonth(cur.getMonth() + 1);
  }
}

function monthlyDates(from, to, day) {
  const out = [];
  for (const { year, month } of eachMonth(from, to)) {
    const d = new Date(year, month, day);
    if (d.getMonth() === month && d >= from && d <= to) out.push(toISO(d));
  }
  return out;
}

// 每月第 N 個 weekday (weekday: 0=Sun ... 6=Sat；nth: 1-5)
function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  const d = new Date(year, month, day);
  return d.getMonth() === month ? d : null;
}

function monthlyWeekdayDates(from, to, weekday, nth) {
  const out = [];
  for (const { year, month } of eachMonth(from, to)) {
    const d = nthWeekdayOfMonth(year, month, weekday, nth);
    if (d && d >= from && d <= to) out.push(toISO(d));
  }
  return out;
}

// 每個 market 的日期計算規則（用 name 對照，避免 ID 綁死）
// weekday 常數：日 0、月 1、火 2、水 3、木 4、金 5、土 6
const rules = {
  '四天王寺骨董市': () => [
    ...monthlyDates(START, END, 21),
    ...monthlyDates(START, END, 22),
  ],
  '東寺弘法市': () => monthlyDates(START, END, 21),
  '北野天満宮 天神市': () => monthlyDates(START, END, 25),
  '百万遍さんの手づくり市': () => monthlyDates(START, END, 15),
  '十三市': () => monthlyDates(START, END, 13),
  '上賀茂神社 手づくり市': () => monthlyWeekdayDates(START, END, 0, 4), // 第 4 日曜
  '西宮えびす神社骨董市': () => monthlyWeekdayDates(START, END, 6, 3), // 第 3 土曜
  '高砂鹿嶋骨董市': () => monthlyWeekdayDates(START, END, 0, 4),      // 第 4 日曜
  '東寺がらくた市': () => monthlyWeekdayDates(START, END, 0, 1),      // 第 1 日曜
  '四天会蚤の市': () => monthlyWeekdayDates(START, END, 0, 2),        // 第 2 日曜
  '平安蚤の市': () => [
    '2026-08-19', '2026-09-15', '2026-10-08', '2026-11-05', '2026-12-03',
    '2027-01-21', '2027-02-04', '2027-03-11', '2027-04-22', '2027-06-03', '2027-06-17', '2027-07-25',
  ],
  '万博蚤の市': () => [
    '2026-10-23', '2026-10-24', '2026-10-25', // 秋
    '2027-04-16', '2027-04-17', '2027-04-18', // 春（推估同月中週末）
  ],
  '関西蚤の市': () => ['2026-12-04', '2026-12-05', '2026-12-06'],
  '天神さんの古本まつり': () => [
    '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
  ],
  '奈良 蚤の市': () => ['2027-03-14', '2027-03-15'],
  // irregular（無日程）暫不生 events：
  //   神戸三宮アンティークフェア / Sutekia Market 宝塚 / 神戸蚤の市
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query('SELECT id, name FROM markets');
    const nameToId = Object.fromEntries(rows.map((r) => [r.name, r.id]));

    const now = new Date();
    const events = [];
    for (const [name, fn] of Object.entries(rules)) {
      const marketId = nameToId[name];
      if (!marketId) {
        console.warn(`[seed:events] skip: market not found → ${name}`);
        continue;
      }
      for (const date of fn()) {
        events.push({
          market_id: marketId,
          date,
          note: null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    await queryInterface.bulkDelete('market_events', null, {});
    if (events.length) {
      await queryInterface.bulkInsert('market_events', events);
    }
    console.log(`[seed:events] inserted ${events.length} events`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('market_events', null, {});
  },
};
