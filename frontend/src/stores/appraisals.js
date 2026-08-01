import { defineStore } from 'pinia';
import { api } from '../api.js';
import { enqueueAppraisal, listAppraisals, updateAppraisal, pendingAppraisals, getDb } from '../db.js';

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const useAppraisalsStore = defineStore('appraisals', {
  state: () => ({
    list: [],
    uploading: false,
    lastError: null,
  }),
  getters: {
    recent: (state) => [...state.list].reverse().slice(0, 6),
  },
  actions: {
    async loadLocal() {
      this.list = await listAppraisals();
      return this.list;
    },

    async getOne(localId) {
      const db = await getDb();
      return db.get('appraisals', Number(localId));
    },

    async submit(fileOrBlob) {
      this.uploading = true;
      this.lastError = null;

      const dataUrl = await blobToDataUrl(fileOrBlob);
      const localId = await enqueueAppraisal({
        thumbDataUrl: dataUrl,
        filename: fileOrBlob.name || 'capture.jpg',
        sizeBytes: fileOrBlob.size,
        result: null,
      });

      try {
        const form = new FormData();
        form.append('image', fileOrBlob, fileOrBlob.name || 'capture.jpg');
        const { data } = await api.post('/appraisal', form);
        await updateAppraisal(localId, { status: 'done', result: data.data });
        await this.loadLocal();
        return localId;
      } catch (err) {
        await updateAppraisal(localId, { status: 'failed', error: err.message || 'upload_failed' });
        this.lastError = err.message || 'upload_failed';
        await this.loadLocal();
        throw err;
      } finally {
        this.uploading = false;
      }
    },

    async submitUrl({ url, preview }) {
      this.uploading = true;
      this.lastError = null;

      const localId = await enqueueAppraisal({
        type: 'url',
        thumbDataUrl: preview?.imageUrl || null,
        sourceUrl: url,
        sourcePreview: preview,
        result: null,
      });

      try {
        const body = { url };
        // 若前端已從 inbox 抓到掛牌價，傳給 backend 當 fallback
        // (Jimoty 頁面沒有 og:price meta，backend 自己抓不到)
        if (preview?.listedPriceJpy) body.listedPriceJpy = preview.listedPriceJpy;
        if (preview?.title) body.title = preview.title;
        const { data } = await api.post('/appraisal/url', body);
        await updateAppraisal(localId, { status: 'done', result: data.data });
        await this.loadLocal();
        return localId;
      } catch (err) {
        await updateAppraisal(localId, { status: 'failed', error: err.message || 'url_appraisal_failed' });
        this.lastError = err.message || 'url_appraisal_failed';
        await this.loadLocal();
        throw err;
      } finally {
        this.uploading = false;
      }
    },

    async toggleCollect(localId) {
      const entry = await this.getOne(localId);
      if (!entry?.result?.id) return null;
      const { data } = await api.post(`/appraisal/${entry.result.id}/collect`);
      const merged = { ...entry, result: { ...entry.result, isCollected: data.data.isCollected } };
      await updateAppraisal(Number(localId), merged);
      await this.loadLocal();
      return merged;
    },

    async retryPending() {
      const pend = await pendingAppraisals();
      const results = [];
      for (const p of pend) {
        try {
          const form = new FormData();
          const blob = await (await fetch(p.thumbDataUrl)).blob();
          form.append('image', blob, p.filename || 'capture.jpg');
          const { data } = await api.post('/appraisal', form);
          await updateAppraisal(p.localId, { status: 'done', result: data.data });
          results.push({ localId: p.localId, ok: true });
        } catch (err) {
          results.push({ localId: p.localId, ok: false, error: err.message });
        }
      }
      await this.loadLocal();
      return results;
    },
  },
});
