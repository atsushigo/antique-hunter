import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useMarketsStore = defineStore('markets', {
  state: () => ({
    list: [],
    loading: false,
    error: null,
    loadedAt: null,
  }),
  actions: {
    async fetch({ force = false } = {}) {
      if (!force && this.list.length && this.loadedAt && Date.now() - this.loadedAt < 5 * 60 * 1000) {
        return this.list;
      }
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get('/markets');
        this.list = data.data;
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
