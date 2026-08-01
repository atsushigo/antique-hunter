<template>
  <div v-if="points.length < 2" class="sparkline-empty">
    <span class="text-caption text-medium-emphasis">
      {{ points.length === 1 ? '首次記錄' : '無歷史' }}
    </span>
  </div>
  <div v-else class="sparkline-wrap">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <polyline
        :points="polyline"
        fill="none"
        :stroke="strokeColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <circle
        v-for="(p, i) in coords"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        :r="i === coords.length - 1 ? 2.5 : 1.5"
        :fill="i === coords.length - 1 ? strokeColor : '#999'"
      />
    </svg>
    <div class="delta text-caption" :class="deltaClass">
      <span>¥{{ (min).toLocaleString() }} → ¥{{ (last).toLocaleString() }}</span>
      <span class="ms-1">{{ deltaLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: { type: Array, default: () => [] },  // [{seenAt, priceJpy}, ...]
  width: { type: Number, default: 120 },
  height: { type: Number, default: 30 },
});

const values = computed(() => props.points.map((p) => p.priceJpy));
const min = computed(() => Math.min(...values.value));
const max = computed(() => Math.max(...values.value));
const first = computed(() => values.value[0]);
const last = computed(() => values.value[values.value.length - 1]);

const coords = computed(() => {
  if (props.points.length < 2) return [];
  const range = max.value - min.value || 1;
  return props.points.map((p, i) => ({
    x: (i / (props.points.length - 1)) * (props.width - 4) + 2,
    y: props.height - 2 - ((p.priceJpy - min.value) / range) * (props.height - 4),
  }));
});
const polyline = computed(() => coords.value.map((c) => `${c.x},${c.y}`).join(' '));

const deltaAbs = computed(() => last.value - first.value);
const deltaPct = computed(() => (first.value > 0 ? (deltaAbs.value / first.value) * 100 : 0));
const deltaLabel = computed(() => {
  const p = deltaPct.value;
  if (Math.abs(p) < 0.5) return '持平';
  return `${p > 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1)}%`;
});
const deltaClass = computed(() => {
  const p = deltaPct.value;
  if (p > 0.5) return 'text-error';   // 漲 = 對買家不利
  if (p < -0.5) return 'text-success'; // 跌 = 對買家有利
  return 'text-medium-emphasis';
});
const strokeColor = computed(() => {
  const p = deltaPct.value;
  if (p > 0.5) return '#D32F2F';
  if (p < -0.5) return '#2E7D32';
  return '#795548';
});
</script>

<style scoped>
.sparkline-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sparkline-empty {
  height: 30px;
  display: flex;
  align-items: center;
}
.delta {
  font-size: 10px;
  line-height: 1;
}
</style>
