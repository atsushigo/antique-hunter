import { defineStore } from 'pinia';
import { api } from '../api.js';

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
    grouped(state) {
      const map = {};
      for (const e of state.list) {
        const d = e.date;
        if (!map[d]) map[d] = [];
        map[d].push({ ...e, kind: 'market' });
      }
      for (const a of state.auctions) {
        const d = a.date.slice(0, 10);
        if (!map[d]) map[d] = [];
        map[d].push({ ...a, kind: 'auction' });
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
