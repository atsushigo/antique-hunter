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

    <v-tabs v-model="tab" density="compact" color="primary" class="mb-2">
      <v-tab value="car">🚗 車輛 <span class="ms-1 text-caption">{{ counts.car }}</span></v-tab>
      <v-tab value="general">📦 一般 <span class="ms-1 text-caption">{{ counts.general }}</span></v-tab>
      <v-tab value="real-estate">🏠 不動產 <span class="ms-1 text-caption">{{ counts['real-estate'] }}</span></v-tab>
    </v-tabs>

    <!-- 政府 filter（只在 items 多時才秀）-->
    <div v-if="stats && stats.topGovernments.length > 1" class="mb-2 px-1">
      <v-chip-group v-model="govFilter" mandatory>
        <v-chip value="" size="x-small">全部 {{ stats.totalItems }}</v-chip>
        <v-chip v-for="g in stats.topGovernments" :key="g.name" :value="g.name" size="x-small">
          {{ g.name }} {{ g.count }}
        </v-chip>
      </v-chip-group>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <div v-if="!loading && !items.length" class="text-caption text-medium-emphasis text-center pa-8">
      這個類別目前無拍賣
    </div>

    <div class="list">
      <div v-for="i in filteredItems" :key="i.id" class="row">
        <a :href="i.sourceUrl" target="_blank" class="body-link">
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
              <span class="gov">{{ i.government }}</span>
              <span v-if="i.statusJP === '入札開始待ち'" class="chip-warning">開拍前</span>
            </div>
          </div>
        </a>
        <div class="quick-links" @click.stop>
          <a
            :href="`https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(cleanTitle(i.title))}`"
            target="_blank"
            title="Yahoo 落札濟（過去成交價參考）"
            class="ql"
          >Y!</a>
          <a
            :href="`https://jp.mercari.com/search?keyword=${encodeURIComponent(cleanTitle(i.title))}&status=sold_out`"
            target="_blank"
            title="Mercari 已售出（市場價參考）"
            class="ql"
          >M</a>
          <a
            :href="`https://www.google.com/search?q=${encodeURIComponent(cleanTitle(i.title) + ' 中古 相場')}`"
            target="_blank"
            title="Google 「XXX 中古 相場」"
            class="ql"
          >G</a>
        </div>
      </div>
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

// 清理 title 拿掉方括號等噪音，讓比價 search 準
function cleanTitle(t) {
  return (t || '')
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
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
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: #FDFBF7;
  transition: background 0.1s;
}
.row:hover { background: rgba(121, 85, 72, 0.05); }
.body-link {
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  display: block;
}
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
.chip-warning {
  background: rgba(245, 124, 0, 0.15);
  color: #E65100;
  padding: 1px 6px; border-radius: 3px;
  font-weight: 500;
  font-size: 10px;
}
.current {
  font-size: 13px;
  font-weight: 600;
  color: #E65100;
  flex-shrink: 0;
}
.quick-links {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.quick-links .ql {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  background: white;
  color: #555;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
}
.quick-links .ql:hover {
  background: rgba(121, 85, 72, 0.1);
  color: #3E2723;
}
.gov { color: rgba(0, 0, 0, 0.65); }
</style>
