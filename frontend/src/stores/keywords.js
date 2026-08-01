import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useKeywordsStore = defineStore('keywords', {
  state: () => ({
    list: [],
    supportedSites: [],
    inbox: [],
    inboxLoadedAt: null,
    inboxPagination: null,
    inboxPerKeyword: {},
    loading: false,
    error: null,
  }),
  getters: {
    inboxCount(state) { return state.inbox.length; },
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const { data } = await api.get('/keywords');
        this.list = data.data;
        this.supportedSites = data.supportedSites;
      } finally { this.loading = false; }
    },
    async create({ keyword, sites }) {
      const { data } = await api.post('/keywords', { keyword, sites });
      this.list.unshift(data.data);
      return data.data;
    },
    async update(id, patch) {
      const { data } = await api.patch(`/keywords/${id}`, patch);
      const idx = this.list.findIndex((k) => k.id === id);
      if (idx !== -1) this.list.splice(idx, 1, data.data);
      return data.data;
    },
    async remove(id) {
      await api.delete(`/keywords/${id}`);
      this.list = this.list.filter((k) => k.id !== id);
    },
    async run(id) {
      const { data } = await api.post(`/keywords/${id}/run`);
      await this.fetchAll();
      await this.fetchInbox({ force: true });
      return data.data;
    },
    async fetchInbox({ days = 7, keyword = null, limit = 50, offset = 0, append = false, force = false } = {}) {
      if (!force && !offset && this.inboxLoadedAt && Date.now() - this.inboxLoadedAt < 60_000 && !keyword) return this.inbox;
      const params = { days, limit, offset };
      if (keyword) params.keyword = keyword;
      const { data } = await api.get('/keywords/inbox', { params });
      this.inbox = append ? [...this.inbox, ...data.data] : data.data;
      this.inboxPagination = data.pagination;
      this.inboxPerKeyword = data.perKeyword;
      this.inboxLoadedAt = Date.now();
      return data;
    },
    async dismiss(id) {
      await api.post(`/keywords/inbox/${id}/dismiss`);
      this.inbox = this.inbox.filter((i) => i.id !== id);
    },
  },
});
