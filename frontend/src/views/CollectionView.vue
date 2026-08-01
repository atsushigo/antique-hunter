<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">收藏</div>
      <v-spacer />
      <div class="text-caption text-medium-emphasis">{{ list.length }} 件</div>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <div v-if="!loading && !list.length" class="text-caption text-medium-emphasis text-center pa-8">
      還沒有收藏，在鑑定結果頁按 ★ 加入
    </div>

    <v-card
      v-for="item in list"
      :key="item.id"
      variant="outlined"
      class="mb-2 coll-card"
      :style="{ borderLeftColor: verdictColor(item.priceVerdict) }"
      @click="openSource(item)"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">
            {{ item.category }}
          </div>
          <v-chip
            v-if="item.sourceHost"
            size="x-small"
            variant="tonal"
            color="primary"
            class="ms-1"
          >{{ siteBadge(item.sourceHost, item.sourceUrl) }}</v-chip>
        </div>
        <div class="text-caption text-medium-emphasis mt-1">{{ item.era }}</div>
        <div class="d-flex align-baseline mt-2 flex-wrap ga-3">
          <div>
            <span class="text-caption text-medium-emphasis me-1">估價</span>
            <span class="text-body-2 font-weight-medium">
              ¥{{ (item.priceMinJpy || 0).toLocaleString() }}~¥{{ (item.priceMaxJpy || 0).toLocaleString() }}
            </span>
          </div>
          <div v-if="item.listedPriceJpy != null">
            <span class="text-caption text-medium-emphasis me-1">掛牌</span>
            <span class="text-body-2 font-weight-medium">¥{{ item.listedPriceJpy.toLocaleString() }}</span>
            <v-chip
              v-if="item.priceVerdict"
              size="x-small"
              :color="verdictColor(item.priceVerdict)"
              variant="flat"
              class="ms-1"
            >{{ verdictLabel(item.priceVerdict) }}</v-chip>
          </div>
        </div>
        <div v-if="item.notes" class="text-caption text-medium-emphasis mt-2">{{ item.notes }}</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';
import { siteBadge } from '../labels.js';

const list = ref([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/appraisal/collection');
    list.value = data.data;
  } catch (err) {
    error.value = err.message || '載入失敗';
  } finally {
    loading.value = false;
  }
}

const VERDICT = {
  low: { color: 'success', label: '撿漏' },
  fair: { color: 'primary', label: '合理' },
  high: { color: 'warning', label: '偏高' },
  unknown: { color: 'grey', label: '無掛牌' },
};
function verdictColor(v) { return VERDICT[v]?.color || 'grey'; }
function verdictLabel(v) { return VERDICT[v]?.label || '—'; }

function openSource(item) {
  if (item.sourceUrl) window.open(item.sourceUrl, '_blank', 'noopener');
}

onMounted(load);
</script>

<style scoped>
.coll-card {
  border-left-width: 3px !important;
  cursor: pointer;
}
</style>
