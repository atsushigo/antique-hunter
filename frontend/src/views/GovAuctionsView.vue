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

    <!-- 相似過去成交案例（若有）-->
    <v-card
      v-if="cases.length"
      variant="tonal"
      color="secondary"
      class="mb-2 mx-1"
    >
      <v-expansion-panels flat>
        <v-expansion-panel>
          <v-expansion-panel-title class="text-caption py-2">
            💡 相似過去成交案例（{{ cases.length }} 筆知識庫紀錄）
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="c in cases" :key="c.id" class="case-row">
              <div class="text-caption">
                <b>{{ formatDate(c.settledAt) }}</b> ·
                起 ¥{{ (c.listingPriceJpy || 0).toLocaleString() }} →
                <b style="color:#795548">成 ¥{{ c.winningPriceJpy.toLocaleString() }}</b>
              </div>
              <div class="text-caption text-medium-emphasis">{{ c.title }}</div>
              <div v-if="c.notes" class="text-caption note">{{ c.notes }}</div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>

    <!-- Sort + 都道府縣 filter -->
    <div class="d-flex align-center flex-wrap ga-2 mb-2 px-1">
      <v-btn-toggle v-model="sortBy" mandatory density="compact" color="primary" variant="outlined">
        <v-btn value="near" size="x-small">📍 近</v-btn>
        <v-btn value="cheap" size="x-small">💴 便宜</v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-select
        v-if="stats?.prefectures?.length > 3"
        v-model="prefFilter"
        :items="[{ title: '全都道府縣', value: '' }, ...stats.prefectures.map(p => ({ title: `${p.name} (${p.count})`, value: p.name }))]"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 200px"
      />
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <div v-if="!loading && !items.length" class="text-caption text-medium-emphasis text-center pa-8">
      這個類別目前無拍賣
    </div>

    <div class="list">
      <template v-for="(group, region) in groupedItems" :key="region">
        <div class="region-header">{{ region }} · {{ group.length }} 件</div>
        <div v-for="i in group" :key="i.id" class="row">
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
                <span v-if="i.distanceKm != null" class="dist" :class="distClass(i.distanceKm)">
                  📍 {{ i.distanceKm }}km
                </span>
                <span class="gov">{{ i.prefecture ? `[${i.prefecture}] ` : '' }}{{ i.government }}</span>
                <span v-if="i.statusJP === '入札開始待ち'" class="chip-warning">開拍前</span>
              </div>
            </div>
          </a>
          <div class="quick-links" @click.stop>
            <a :href="ylink(i.title)" target="_blank" title="Yahoo 落札濟" class="ql">Y!</a>
            <a :href="mlink(i.title)" target="_blank" title="Mercari 已售出" class="ql">M</a>
            <a :href="glink(i.title)" target="_blank" title="Google 相場" class="ql">G</a>
          </div>
        </div>
      </template>
    </div>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api } from '../api.js';

const tab = ref('car');
const items = ref([]);
const stats = ref(null);
const cases = ref([]);
const counts = reactive({ car: 0, general: 0, 'real-estate': 0 });
const loading = ref(false);
const error = ref('');

const sortBy = ref('near');
const prefFilter = ref('');

const filteredItems = computed(() => {
  let arr = [...items.value];
  if (prefFilter.value) arr = arr.filter((i) => i.prefecture === prefFilter.value);
  if (sortBy.value === 'near') {
    arr.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  } else if (sortBy.value === 'cheap') {
    arr.sort((a, b) => (a.priceJpy ?? 99999999) - (b.priceJpy ?? 99999999));
  }
  return arr;
});

// 依 region 分組（保持 filter 後的排序）
const REGION_ORDER = ['関西', '中部', '中国', '四国', '関東', '東北', '北海道', '九州', '沖縄', '未知'];
const groupedItems = computed(() => {
  const groups = {};
  for (const i of filteredItems.value) {
    const key = i.region || '未知';
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  }
  const sorted = {};
  for (const r of REGION_ORDER) if (groups[r]) sorted[r] = groups[r];
  return sorted;
});

function distClass(km) {
  if (km <= 50) return 'dist-near';
  if (km <= 200) return 'dist-mid';
  return 'dist-far';
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
const ylink = (t) => `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(cleanTitle(t))}`;
const mlink = (t) => `https://jp.mercari.com/search?keyword=${encodeURIComponent(cleanTitle(t))}&status=sold_out`;
const glink = (t) => `https://www.google.com/search?q=${encodeURIComponent(cleanTitle(t) + ' 中古 相場')}`;

async function load() {
  loading.value = true;
  error.value = '';
  prefFilter.value = '';
  try {
    const { data } = await api.get('/gov-auctions', { params: { category: tab.value } });
    items.value = data.data;
    stats.value = data.stats;
    cases.value = data.knowledgeCases || [];
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
.region-header {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  margin: 8px 4px 2px;
  padding-bottom: 3px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.dist {
  font-weight: 700;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
}
.dist-near { color: #2E7D32; background: rgba(46, 125, 50, 0.1); }
.dist-mid { color: #E65100; background: rgba(230, 81, 0, 0.08); }
.dist-far { color: rgba(0, 0, 0, 0.5); background: rgba(0, 0, 0, 0.04); }
.case-row { padding: 4px 0; border-bottom: 1px dashed rgba(0,0,0,0.08); }
.case-row:last-child { border: none; }
.note { color: rgba(0,0,0,0.55); margin-top: 2px; }
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
