import { defineStore } from 'pinia';
import { api } from '../api.js';

function addDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export const useEventsStore = defineStore('events', {
  state: () => ({
    list: [], // market events
    auctions: [], // KSI auction milestones
    loading: false,
    error: null,
    loadedAt: null,
    range: null,
  }),
  getters: {
    // 依日期分組：{ 'YYYY-MM-DD': [event, ...] }
    // 每 event 都有 kind = 'market' | 'auction'
    // auction 現在是「時間段」（startDate ~ endDate），展開到區間內每一天都放一筆，
    // 並標記 isRangeStart/isRangeEnd 方便 agenda 模式跟選中日詳情知道是不是第一/最後一天
    grouped(state) {
      const map = {};
      for (const e of state.list) {
        const d = e.date;
        if (!map[d]) map[d] = [];
        map[d].push({ ...e, kind: 'market' });
      }
      for (const a of state.auctions) {
        let d = a.startDate;
        while (d <= a.endDate) {
          if (!map[d]) map[d] = [];
          map[d].push({ ...a, kind: 'auction', isRangeStart: d === a.startDate, isRangeEnd: d === a.endDate });
          d = addDay(d);
        }
      }
      return map;
    },
    sortedDates() {
      return Object.keys(this.grouped).sort();
    },
  },
  actions: {
    async fetch({ from, to, force = false } = {}) {
      if (
        !force &&
        this.list.length &&
        this.loadedAt &&
        Date.now() - this.loadedAt < 5 * 60 * 1000
      ) {
        return this.list;
      }
      this.loading = true;
      this.error = null;
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const [marketRes, auctionRes] = await Promise.all([
          api.get('/events', { params }),
          api.get('/auction-schedule', { params }).catch(() => ({ data: { data: [] } })),
        ]);
        this.list = marketRes.data.data;
        this.auctions = auctionRes.data.data;
        this.range = marketRes.data.range;
        this.loadedAt = Date.now();
        return this.list;
      } catch (err) {
        this.error = err.message || 'load_failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
