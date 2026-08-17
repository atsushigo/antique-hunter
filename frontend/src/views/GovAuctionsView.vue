<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">官公庁拍賣</div>
      <v-btn size="x-small" variant="text" icon="mdi-refresh" :loading="loading" class="ms-1" @click="load" />
      <v-spacer />
      <v-btn size="x-small" variant="text" href="https://kankocho.jp" target="_blank">
        KSI 官網 <v-icon size="14" end>mdi-open-in-new</v-icon>
      </v-btn>
    </div>

    <v-card variant="tonal" color="secondary" class="mb-3">
      <v-card-text class="pa-3 text-caption">
        <b>KSI 官公庁オークション</b> — 稅金滯納品、遺失物、政府公有財產拍賣。
        涵蓋警視庁遺失物公売、国税局公売、都道府県公売。
        起標常 ¥50-100，撿漏空間大。
      </v-card-text>
    </v-card>

    <v-tabs v-model="tab" density="compact" color="primary" class="mb-2">
      <v-tab value="car">🚗 車輛 <span class="ms-1 text-caption">{{ counts.car }}</span></v-tab>
      <v-tab value="general">📦 一般 <span class="ms-1 text-caption">{{ counts.general }}</span></v-tab>
      <v-tab value="real-estate">🏠 不動產 <span class="ms-1 text-caption">{{ counts['real-estate'] }}</span></v-tab>
    </v-tabs>

    <!-- 拍賣規模 -->
    <div v-if="stats && stats.totalItems > 0" class="d-flex align-center flex-wrap ga-2 mb-2 px-1 text-caption">
      <v-chip size="x-small" variant="tonal">共 {{ stats.totalItems }} 件</v-chip>
      <v-chip size="x-small" variant="tonal">{{ stats.governmentCount }} 政府</v-chip>
      <v-chip
        v-for="(n, s) in stats.byStatus"
        :key="s"
        size="x-small"
        variant="tonal"
        :color="s === '申し込み受付中' ? 'success' : (s === '入札開始待ち' ? 'warning' : undefined)"
      >{{ s }} {{ n }}</v-chip>
      <v-spacer />
      <v-btn-toggle v-model="govFilter" density="compact" color="primary" variant="outlined">
        <v-btn value="" size="x-small">全部</v-btn>
        <v-btn v-for="g in stats.topGovernments" :key="g.name" :value="g.name" size="x-small">
          {{ g.name }} {{ g.count }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <div v-if="!loading && !items.length" class="text-caption text-medium-emphasis text-center pa-8">
      這個類別目前無拍賣
    </div>

    <div class="list">
      <a
        v-for="i in filteredItems"
        :key="i.id"
        :href="i.sourceUrl"
        target="_blank"
        class="row"
      >
        <div class="body">
          <div class="line-1">
            <span class="price">
              <span v-if="i.priceJpy != null">¥{{ i.priceJpy.toLocaleString() }}</span>
              <span v-else class="text-medium-emphasis">—</span>
            </span>
            <span v-if="i.currentPriceJpy != null && i.currentPriceJpy > i.priceJpy" class="current">
              → ¥{{ i.currentPriceJpy.toLocaleString() }}
            </span>
            <span class="title">{{ i.title }}</span>
          </div>
          <div class="line-2">
            <span class="chip" :class="{ 'chip-warning': i.statusJP === '入札開始待ち' }">{{ i.statusJP }}</span>
            <span class="chip">{{ i.openWayJP }}</span>
            <span class="gov">🏛 {{ i.government }}</span>
          </div>
        </div>
        <v-icon size="18" color="grey">mdi-open-in-new</v-icon>
      </a>
    </div>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api } from '../api.js';

const tab = ref('car');
const items = ref([]);
const stats = ref(null);
const counts = reactive({ car: 0, general: 0, 'real-estate': 0 });
const loading = ref(false);
const error = ref('');
const govFilter = ref('');

const filteredItems = computed(() =>
  govFilter.value ? items.value.filter((i) => i.government === govFilter.value) : items.value
);

async function load() {
  loading.value = true;
  error.value = '';
  govFilter.value = '';
  try {
    const { data } = await api.get('/gov-auctions', { params: { category: tab.value } });
    items.value = data.data;
    stats.value = data.stats;
    counts[tab.value] = data.total;
  } catch (err) {
    error.value = err.message || '載入失敗';
  } finally { loading.value = false; }
}

async function preloadCounts() {
  for (const cat of ['car', 'general', 'real-estate']) {
    if (cat === tab.value) continue;
    try {
      const { data } = await api.get('/gov-auctions', { params: { category: cat } });
      counts[cat] = data.total;
    } catch { /* silent */ }
  }
}

onMounted(async () => {
  await load();
  preloadCounts(); // 背景填其他 tab 的數字
});
watch(tab, load);
</script>

<style scoped>
.list { display: flex; flex-direction: column; gap: 4px; }
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: #FDFBF7;
  text-decoration: none;
  color: inherit;
  transition: background 0.1s;
}
.row:hover { background: rgba(121, 85, 72, 0.05); }
.body { flex: 1; min-width: 0; }
.line-1 {
  display: flex; align-items: baseline; gap: 8px;
  white-space: nowrap; overflow: hidden;
}
.price {
  flex-shrink: 0; font-size: 15px; font-weight: 700; color: #795548;
}
.title {
  font-size: 13px; color: #3E2723;
  overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;
}
.line-2 {
  font-size: 11px; color: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; gap: 6px; margin-top: 3px;
  flex-wrap: wrap;
}
.chip {
  background: rgba(121, 85, 72, 0.08);
  padding: 1px 6px; border-radius: 3px;
  font-weight: 500;
}
.chip-warning {
  background: rgba(245, 124, 0, 0.15);
  color: #E65100;
}
.current {
  font-size: 13px;
  font-weight: 600;
  color: #E65100;
  flex-shrink: 0;
}
.gov { color: rgba(0, 0, 0, 0.65); }
</style>
