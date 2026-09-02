<template>
  <div v-if="rounds.length" class="d-flex flex-column ga-2 mb-3">
    <v-alert
      v-for="r in rounds"
      :key="r.id"
      :type="r.entryOpenNow ? 'warning' : 'info'"
      variant="tonal"
      rounded="lg"
      density="comfortable"
      closable
      @click:close="dismiss(r)"
    >
      <div class="d-flex align-center flex-wrap ga-1">
        <span class="font-weight-bold">
          {{ r.entryOpenNow ? '📋 現在可以申請' : '📋 新一輪拍賣' }}
        </span>
        <span class="text-caption">{{ r.categoryLabel }}{{ r.government ? ` · ${r.government}` : '' }}</span>
      </div>
      <div class="text-caption mt-1">
        申請期間：{{ r.entryStart }} ～ {{ r.entryEnd }}
      </div>
      <v-btn
        v-if="r.url"
        size="small"
        variant="tonal"
        class="mt-2"
        :href="r.url"
        target="_blank"
        rel="noopener"
      >去看物件</v-btn>
    </v-alert>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const rounds = ref([]);

async function load() {
  try {
    const { data } = await api.get('/auction-rounds', { params: { dismissed: 0, actionableOnly: 1 } });
    rounds.value = data.data;
  } catch {
    rounds.value = [];
  }
}

async function dismiss(r) {
  rounds.value = rounds.value.filter((x) => x.id !== r.id);
  try {
    await api.post(`/auction-rounds/${r.id}/dismiss`);
  } catch {}
}

onMounted(load);
</script>
