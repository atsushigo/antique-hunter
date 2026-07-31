<template>
  <v-container class="px-3">
    <v-progress-linear v-if="store.loading" indeterminate color="primary" class="mb-3" />
    <v-alert v-if="store.error" type="error" density="compact" class="mb-3">
      載入失敗：{{ store.error }}
    </v-alert>

    <MarketCard v-for="m in store.list" :key="m.id" :market="m" />

    <div v-if="!store.loading && !store.list.length" class="text-caption text-medium-emphasis text-center pa-8">
      尚無市集資料
    </div>
  </v-container>
</template>

<script setup>
import { onMounted } from 'vue';
import { useMarketsStore } from '../stores/markets.js';
import MarketCard from '../components/MarketCard.vue';

const store = useMarketsStore();

onMounted(() => store.fetch().catch(() => {}));
</script>
