<template>
  <v-card variant="flat">
    <v-card-text class="pa-4">
      <div class="d-flex align-center mb-3">
        <v-chip
          :color="riskColor"
          :prepend-icon="riskIcon"
          size="small"
          variant="flat"
          class="me-2"
        >{{ riskLabel }}</v-chip>
        <v-chip v-if="result.mock" color="warning" size="small" variant="tonal" class="me-2">MOCK</v-chip>
        <v-chip v-if="result.sourceHost" size="small" variant="tonal" color="primary" class="me-2">
          {{ siteBadge(result.sourceHost, result.sourceUrl) }}
        </v-chip>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">
          {{ result.modelUsed }} · {{ result.latencyMs }}ms
        </span>
      </div>

      <div v-if="result.sourceTitle" class="text-body-2 text-medium-emphasis mb-2 text-truncate-2">
        {{ result.sourceTitle }}
      </div>

      <div class="text-h5 mb-1">{{ result.category || '無法辨識' }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ result.era || '—' }}</div>

      <!-- URL 模式：掛牌 vs 估價 -->
      <div v-if="result.listedPriceJpy != null" class="verdict-block mb-3">
        <div class="d-flex align-baseline mb-2">
          <div class="me-3">
            <div class="text-caption text-medium-emphasis">賣家掛牌</div>
            <div class="listed-price">¥{{ formatN(result.listedPriceJpy) }}</div>
          </div>
          <div class="verdict-arrow me-3">
            <v-icon :color="verdictColor" size="24">{{ verdictIcon }}</v-icon>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">合理區間</div>
            <div class="range-price">¥{{ formatN(result.priceMinJpy) }}~¥{{ formatN(result.priceMaxJpy) }}</div>
          </div>
        </div>
        <v-chip :color="verdictColor" variant="flat" size="small" :prepend-icon="verdictIcon">
          {{ verdictLabel }}
        </v-chip>
      </div>

      <!-- 純拍照：只顯示估價 -->
      <div v-else class="price-row">
        <span class="price-yen">¥{{ formatN(result.priceMinJpy) }}</span>
        <span class="price-sep">~</span>
        <span class="price-yen">¥{{ formatN(result.priceMaxJpy) }}</span>
      </div>

      <div class="mt-3 d-flex align-center">
        <span class="text-caption me-2">把握度</span>
        <v-progress-linear
          :model-value="(result.confidence || 0) * 100"
          :color="confColor"
          height="6"
          rounded
          class="flex-grow-1"
        />
        <span class="text-caption ms-2">{{ Math.round((result.confidence || 0) * 100) }}%</span>
      </div>

      <v-alert
        v-if="result.notes"
        :type="riskAlertType"
        variant="tonal"
        density="compact"
        class="mt-4"
      >{{ result.notes }}</v-alert>

      <!-- 鑑真 checklist -->
      <div v-if="result.authenticityChecks?.length" class="mt-4">
        <div class="text-caption font-weight-medium mb-1">
          <v-icon size="14" class="me-1">mdi-shield-check</v-icon>鑑真檢查
        </div>
        <v-list density="compact" class="check-list pa-0" nav>
          <v-list-item
            v-for="(c, i) in result.authenticityChecks"
            :key="i"
            :prepend-icon="checkIcon(c.verdict)"
            :class="`check-${c.verdict}`"
          >
            <v-list-item-title class="text-body-2">{{ c.aspect }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ c.observation }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>

      <!-- 價格歷史 sparkline -->
      <div v-if="result.sourceUrl && priceHistory.length >= 2" class="mt-4 hist-block">
        <div class="text-caption font-weight-medium mb-1">
          <v-icon size="14" class="me-1">mdi-chart-line</v-icon>此 URL 價格歷史（近 60 天）
        </div>
        <Sparkline :points="priceHistory" :width="240" :height="40" />
        <div class="text-caption text-medium-emphasis mt-1">
          {{ priceHistory.length }} 次記錄 · 首次 {{ formatDate(priceHistory[0].seenAt) }}
        </div>
      </div>

      <!-- 動作列：源連結 + 收藏 -->
      <div class="d-flex mt-4 ga-2">
        <v-btn
          v-if="result.sourceUrl"
          variant="outlined"
          size="small"
          prepend-icon="mdi-open-in-new"
          :href="result.sourceUrl"
          target="_blank"
          rel="noopener"
        >看原頁</v-btn>
        <v-spacer />
        <v-btn
          v-if="result.id"
          :variant="result.isCollected ? 'flat' : 'outlined'"
          size="small"
          :color="result.isCollected ? 'warning' : undefined"
          :prepend-icon="result.isCollected ? 'mdi-star' : 'mdi-star-outline'"
          :loading="collecting"
          @click="$emit('toggle-collect')"
        >{{ result.isCollected ? '已收藏' : '收藏' }}</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { siteBadge } from '../labels.js';
import { api } from '../api.js';
import Sparkline from './Sparkline.vue';

const props = defineProps({
  result: { type: Object, required: true },
  collecting: { type: Boolean, default: false },
});
defineEmits(['toggle-collect']);

const riskMap = {
  green: { color: 'success', icon: 'mdi-check-circle', label: '真品可能高', alert: 'success' },
  yellow: { color: 'warning', icon: 'mdi-alert-circle', label: '需仔細檢視', alert: 'warning' },
  red: { color: 'error', icon: 'mdi-close-octagon', label: '仿品風險高', alert: 'error' },
};
const risk = computed(() => riskMap[props.result.authenticityRisk] || riskMap.yellow);
const riskColor = computed(() => risk.value.color);
const riskIcon = computed(() => risk.value.icon);
const riskLabel = computed(() => risk.value.label);
const riskAlertType = computed(() => risk.value.alert);

const confColor = computed(() => {
  const c = props.result.confidence || 0;
  if (c >= 0.7) return 'success';
  if (c >= 0.4) return 'warning';
  return 'error';
});

const VERDICT = {
  low: { color: 'success', icon: 'mdi-arrow-down-bold', label: '撿漏機會（低於行情）' },
  fair: { color: 'primary', icon: 'mdi-approximately-equal', label: '合理價（可入手）' },
  high: { color: 'warning', icon: 'mdi-arrow-up-bold', label: '偏高（考慮殺價）' },
  unknown: { color: 'grey', icon: 'mdi-help-circle', label: '無法判斷' },
};
const verdictColor = computed(() => VERDICT[props.result.priceVerdict]?.color || 'grey');
const verdictIcon = computed(() => VERDICT[props.result.priceVerdict]?.icon || 'mdi-help-circle');
const verdictLabel = computed(() => VERDICT[props.result.priceVerdict]?.label || '—');

function formatN(n) {
  return n == null ? '—' : Number(n).toLocaleString();
}
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function checkIcon(v) {
  return {
    consistent_with_real: 'mdi-check-circle',
    suspicious: 'mdi-alert-circle',
    cannot_tell: 'mdi-help-circle',
  }[v] || 'mdi-help-circle';
}

// 抓價格歷史（URL 模式）
const priceHistory = ref([]);
async function loadHistory() {
  if (!props.result?.sourceUrl) return;
  try {
    const { data } = await api.get('/appraisal/price-history', { params: { url: props.result.sourceUrl, days: 60 } });
    priceHistory.value = data.data;
  } catch { /* silent */ }
}
onMounted(loadHistory);
watch(() => props.result?.sourceUrl, loadHistory);
</script>

<style scoped>
.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.price-yen {
  font-size: 2rem;
  font-weight: 700;
  color: #795548;
}
.price-sep { color: #999; }
.verdict-block {
  background: rgba(121, 85, 72, 0.04);
  border-radius: 8px;
  padding: 12px;
}
.listed-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3E2723;
}
.range-price {
  font-size: 1rem;
  font-weight: 600;
  color: #795548;
}
.verdict-arrow {
  align-self: flex-end;
  padding-bottom: 4px;
}
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.check-list :deep(.v-list-item) {
  padding-inline: 8px;
  min-height: 40px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.check-list .check-consistent_with_real :deep(.v-icon) { color: #2E7D32; }
.check-list .check-suspicious :deep(.v-icon) { color: #C62828; }
.check-list .check-cannot_tell :deep(.v-icon) { color: #B0BEC5; }
.check-list .check-suspicious { background: rgba(198, 40, 40, 0.06); }
.hist-block {
  background: rgba(121, 85, 72, 0.04);
  padding: 12px;
  border-radius: 8px;
}
</style>
