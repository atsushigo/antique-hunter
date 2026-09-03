<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <v-btn size="x-small" variant="text" icon="mdi-refresh" :loading="loading" @click="load" />
      <v-spacer />
      <v-btn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-book-open-page-variant" @click="$router.push('/gov-auctions/guide')">
        入門手冊
      </v-btn>
    </div>

    <v-alert type="info" variant="tonal" density="compact" class="mb-2">
      BIT 裁判所競売＝法院法拍屋。跟 KSI 不同，<b>不用事前參加申込</b>，
      入札期間內直接送投標書 + 保証金即可。抓取要跑一遍官網流程，第一次載入約 3-8 秒。
    </v-alert>

    <v-tabs v-model="prefecture" density="compact" color="primary" class="mb-2" show-arrows>
      <v-tab v-for="p in prefectures" :key="p.key" :value="p.key">{{ p.name }}</v-tab>
    </v-tabs>

    <div class="d-flex align-center flex-wrap ga-2 mb-2 px-1">
      <v-btn-toggle v-model="sortBy" mandatory density="compact" color="primary" variant="outlined">
        <v-btn value="near" size="x-small">📍 近</v-btn>
        <v-btn value="cheap" size="x-small">💴 便宜</v-btn>
        <v-btn value="soon" size="x-small">⏰ 快截止</v-btn>
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <div v-if="!loading && !items.length" class="text-caption text-medium-emphasis text-center pa-8">
      這個都道府県目前沒有可競標物件
    </div>

    <div class="list">
      <div v-for="i in sortedItems" :key="i.saleUnitId" class="row">
        <a :href="i.url" target="_blank" class="body-link">
          <div class="body">
            <div class="line-1">
              <span class="price">
                <span v-if="i.minPriceJpy != null">¥{{ i.minPriceJpy.toLocaleString() }}</span>
                <span v-else class="text-medium-emphasis">—</span>
              </span>
              <v-chip size="x-small" variant="tonal" color="secondary" class="category-chip">{{ i.category }}</v-chip>
              <span class="title">{{ i.address }}</span>
            </div>
            <div class="line-2">
              <span v-if="i.distanceKm != null" class="dist" :class="distClass(i.distanceKm)"
                :title="i.nearestHome ? `離「${i.nearestHome}」最近` : ''">
                📍 {{ i.distanceKm }}km<span v-if="i.nearestHome" class="near-home">({{ i.nearestHome === '通天閣' ? '通' : '武' }})</span>
              </span>
              <span class="gov">{{ i.courtCase }}</span>
              <span v-if="i.cancelled" class="chip-warning">中止</span>
            </div>
            <div class="line-3">
              📅 入札 {{ formatShortDate(i.bidStart) }}～{{ formatShortDate(i.bidEnd) }}
              · 開札 {{ formatShortDate(i.kaisatsuDate) }}
              · 保証金 ¥{{ (i.depositJpy || 0).toLocaleString() }}
            </div>
          </div>
        </a>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../api.js';

const prefecture = ref('hyogo');
const prefectures = ref([
  { key: 'hyogo', name: '兵庫県' },
  { key: 'osaka', name: '大阪府' },
  { key: 'kyoto', name: '京都府' },
  { key: 'nara', name: '奈良県' },
  { key: 'shiga', name: '滋賀県' },
  { key: 'wakayama', name: '和歌山県' },
]);

const items = ref([]);
const loading = ref(false);
const error = ref('');
const sortBy = ref('near');

const sortedItems = computed(() => {
  const arr = [...items.value];
  if (sortBy.value === 'near') arr.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  else if (sortBy.value === 'cheap') arr.sort((a, b) => (a.minPriceJpy ?? 99999999) - (b.minPriceJpy ?? 99999999));
  else if (sortBy.value === 'soon') arr.sort((a, b) => (a.bidEnd || '9999').localeCompare(b.bidEnd || '9999'));
  return arr;
});

function distClass(km) {
  if (km <= 50) return 'dist-near';
  if (km <= 200) return 'dist-mid';
  return 'dist-far';
}
function formatShortDate(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/bit-properties', { params: { prefecture: prefecture.value } });
    items.value = data.data;
  } catch (err) {
    error.value = err.message || '載入失敗（BIT 官網可能暫時連不上）';
  } finally { loading.value = false; }
}

onMounted(load);
watch(prefecture, load);
</script>

<style scoped>
.list { display: flex; flex-direction: column; gap: 4px; }
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: #FDFBF7;
  transition: background 0.1s;
}
.row:hover { background: rgba(121, 85, 72, 0.05); }
.body-link { flex: 1; min-width: 0; text-decoration: none; color: inherit; display: block; }
.body { flex: 1; min-width: 0; }
.line-1 { display: flex; align-items: baseline; gap: 8px; white-space: nowrap; overflow: hidden; }
.price { flex-shrink: 0; font-size: 15px; font-weight: 700; color: #795548; }
.category-chip { flex-shrink: 0; }
.title { font-size: 13px; color: #3E2723; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; }
.line-2 {
  font-size: 11px; color: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap;
}
.line-3 { font-size: 10px; color: rgba(0, 0, 0, 0.55); margin-top: 2px; }
.chip-warning {
  background: rgba(211, 47, 47, 0.15); color: #C62828;
  padding: 1px 6px; border-radius: 3px; font-weight: 500; font-size: 10px;
}
.dist { font-weight: 700; font-size: 11px; padding: 1px 5px; border-radius: 3px; }
.dist-near { color: #2E7D32; background: rgba(46, 125, 50, 0.1); }
.dist-mid { color: #E65100; background: rgba(230, 81, 0, 0.08); }
.dist-far { color: rgba(0, 0, 0, 0.5); background: rgba(0, 0, 0, 0.04); }
.near-home { font-weight: 400; margin-left: 2px; opacity: 0.65; }
.gov { color: rgba(0, 0, 0, 0.65); }
</style>
