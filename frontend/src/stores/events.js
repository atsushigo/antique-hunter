import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useEventsStore = defineStore('events', {
  state: () => ({
    list: [],
    loading: false,
    error: null,
    loadedAt: null,
    range: null,
  }),
  getters: {
    // 依日期分組：{ 'YYYY-MM-DD': [event, event, ...] }
    grouped(state) {
      const map = {};
      for (const e of state.list) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
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
        const { data } = await api.get('/events', { params });
        this.list = data.data;
        this.range = data.range;
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
