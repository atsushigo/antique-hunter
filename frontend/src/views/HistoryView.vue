<template>
  <v-container class="px-2 pb-16">
    <div class="d-flex align-center mb-2 px-1">
      <div class="text-h6">鑑定歷史</div>
      <v-spacer />
      <v-btn-toggle v-model="days" mandatory density="compact" color="primary" variant="outlined">
        <v-btn :value="7" size="x-small">7 天</v-btn>
        <v-btn :value="30" size="x-small">30 天</v-btn>
        <v-btn :value="365" size="x-small">全部</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Summary strip -->
    <v-card v-if="stats" variant="tonal" class="mb-3 stats-card">
      <v-card-text class="pa-3">
        <div class="d-flex flex-wrap ga-3 align-baseline">
          <div class="stat">
            <div class="num">{{ stats.total }}</div>
            <div class="lbl">總鑑定</div>
          </div>
          <v-divider vertical />
          <div class="stat">
            <div class="num" style="color:#2E7D32">{{ stats.byVerdict.low }}</div>
            <div class="lbl">撿漏機會</div>
          </div>
          <div class="stat">
            <div class="num" style="color:#F57C00">{{ stats.byVerdict.high }}</div>
            <div class="lbl">掛牌偏高</div>
          </div>
          <v-divider vertical />
          <div class="stat">
            <div class="num" style="color:#F57C00">{{ stats.collected }}</div>
            <div class="lbl">收藏</div>
          </div>
          <div class="stat">
            <div class="num" style="color:#C62828">{{ stats.byRisk.red }}</div>
            <div class="lbl">仿品風險</div>
          </div>
        </div>
        <div v-if="Object.keys(stats.byHost).length" class="mt-2 text-caption">
          <span class="text-medium-emphasis">來源：</span>
          <v-chip
            v-for="(count, host) in stats.byHost"
            :key="host"
            size="x-small"
            variant="text"
            class="pa-0 me-1"
          >{{ hostLabel(host) }} {{ count }}</v-chip>
          <v-chip size="x-small" variant="text" class="pa-0 me-1">
            📷 拍照 {{ stats.bySource.photo }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Filters -->
    <div class="d-flex flex-wrap ga-1 mb-2 px-1">
      <v-chip
        size="small"
        :variant="filters.source ? 'flat' : 'outlined'"
        :color="filters.source === 'photo' ? 'primary' : filters.source === 'url' ? 'primary' : undefined"
        @click="cycleFilter('source', ['', 'photo', 'url'])"
      >{{ filters.source === 'photo' ? '📷 拍照' : filters.source === 'url' ? '🔗 URL' : '全部來源' }}</v-chip>
      <v-chip
        v-for="v in VERDICTS"
        :key="v.id"
        size="small"
        :variant="filters.verdict === v.id ? 'flat' : 'outlined'"
        :color="filters.verdict === v.id ? v.color : undefined"
        @click="toggleFilter('verdict', v.id)"
      >{{ v.label }}</v-chip>
      <v-chip
        size="small"
        :variant="filters.collected ? 'flat' : 'outlined'"
        :color="filters.collected ? 'warning' : undefined"
        @click="filters.collected = !filters.collected"
      >⭐ 收藏</v-chip>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />

    <div v-if="!loading && !logs.length" class="text-caption text-medium-emphasis text-center pa-8">
      這段時間沒有紀錄
    </div>

    <v-card
      v-for="log in logs"
      :key="log.id"
      variant="outlined"
      class="mb-2 log-card"
      :style="{ borderLeftColor: verdictColor(log.priceVerdict) }"
      @click="openLog(log)"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center mb-1">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">{{ log.category }}</div>
          <v-icon v-if="log.isCollected" size="16" color="warning" class="ms-1">mdi-star</v-icon>
          <v-chip
            v-if="log.sourceHost"
            size="x-small"
            variant="tonal"
            color="primary"
            class="ms-1"
          >{{ siteBadge(log.sourceHost, log.sourceUrl) }}</v-chip>
          <v-chip v-else size="x-small" variant="tonal" class="ms-1">📷</v-chip>
        </div>
        <div class="text-caption text-medium-emphasis">{{ log.era }} · {{ formatDate(log.createdAt) }}</div>
        <div class="d-flex align-baseline mt-1 flex-wrap ga-2">
          <span class="text-body-2 font-weight-medium">
            ¥{{ (log.priceMinJpy || 0).toLocaleString() }}~¥{{ (log.priceMaxJpy || 0).toLocaleString() }}
          </span>
          <span v-if="log.listedPriceJpy != null" class="text-caption">
            掛牌 ¥{{ log.listedPriceJpy.toLocaleString() }}
          </span>
          <v-chip
            v-if="log.priceVerdict"
            size="x-small"
            :color="verdictColor(log.priceVerdict)"
            variant="flat"
          >{{ verdictLabel(log.priceVerdict) }}</v-chip>
          <v-chip
            size="x-small"
            :color="riskColor(log.authenticityRisk)"
            variant="tonal"
          >{{ riskLabel(log.authenticityRisk) }}</v-chip>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue';
import { api } from '../api.js';
import { siteBadge, hostLabel } from '../labels.js';

const days = ref(30);
const filters = reactive({ source: '', verdict: '', collected: false });
const logs = ref([]);
const stats = ref(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const [logRes, statRes] = await Promise.all([
      api.get('/appraisal/history', {
        params: {
          days: days.value,
          source: filters.source || undefined,
          verdict: filters.verdict || undefined,
          collected: filters.collected ? 1 : undefined,
        },
      }),
      api.get('/appraisal/stats', { params: { days: days.value } }),
    ]);
    logs.value = logRes.data.data;
    stats.value = statRes.data.data;
  } finally { loading.value = false; }
}

function cycleFilter(key, options) {
  const i = options.indexOf(filters[key]);
  filters[key] = options[(i + 1) % options.length];
}
function toggleFilter(key, val) {
  filters[key] = filters[key] === val ? '' : val;
}

const VERDICTS = [
  { id: 'low', label: '撿漏', color: 'success' },
  { id: 'fair', label: '合理', color: 'primary' },
  { id: 'high', label: '偏高', color: 'warning' },
];
const VMAP = Object.fromEntries(VERDICTS.map((v) => [v.id, v]));
function verdictColor(v) { return VMAP[v]?.color || 'grey'; }
function verdictLabel(v) { return VMAP[v]?.label || (v === 'unknown' ? '無掛牌' : '—'); }

const RMAP = {
  green: { color: 'success', label: '真品率高' },
  yellow: { color: 'warning', label: '需檢視' },
  red: { color: 'error', label: '仿品風險' },
};
function riskColor(r) { return RMAP[r]?.color || 'grey'; }
function riskLabel(r) { return RMAP[r]?.label || '—'; }

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 60) return `${diff} 分前`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} 小時前`;
  const days = Math.floor(diff / 60 / 24);
  if (days < 30) return `${days} 天前`;
  return d.toLocaleDateString();
}

function openLog(log) {
  if (log.sourceUrl) window.open(log.sourceUrl, '_blank', 'noopener');
}

onMounted(load);
watch([days, () => filters.source, () => filters.verdict, () => filters.collected], load);
</script>

<style scoped>
.stats-card :deep(.v-divider--vertical) { height: 32px; margin: 0 4px; }
.stat { text-align: center; padding: 0 4px; }
.stat .num { font-size: 22px; font-weight: 700; line-height: 1; color: #3E2723; }
.stat .lbl { font-size: 10px; color: rgba(0,0,0,0.55); margin-top: 2px; }
.log-card {
  border-left-width: 3px !important;
  cursor: pointer;
}
</style>
