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
        <v-chip v-if="result.mock" color="warning" size="small" variant="tonal">MOCK</v-chip>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">
          {{ result.modelUsed }} · {{ result.latencyMs }}ms
        </span>
      </div>

      <div class="text-h5 mb-1">{{ result.category || '無法辨識' }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ result.era || '—' }}</div>

      <div class="price-row">
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
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ result: { type: Object, required: true } });

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

function formatN(n) {
  return n == null ? '—' : Number(n).toLocaleString();
}
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
.price-sep {
  color: #999;
}
</style>
