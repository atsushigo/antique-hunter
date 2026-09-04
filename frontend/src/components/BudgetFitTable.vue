<template>
  <v-card v-if="rows.length" variant="tonal" color="secondary" class="mb-3 mx-1">
    <v-expansion-panels flat>
      <v-expansion-panel>
        <v-expansion-panel-title class="text-caption py-2">
          💰 ¥{{ BUDGET_JPY.toLocaleString() }} 預算內盤點（{{ rows.length }} 個管道）
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="fit-table">
            <div v-for="r in rows" :key="r.id" class="fit-row">
              <div class="fit-name">
                <a :href="r.url" target="_blank" class="fit-link">{{ r.icon }} {{ r.shortName }}</a>
              </div>
              <div class="fit-status">{{ r.status }}</div>
              <div class="fit-verdict">{{ r.verdict }}</div>
            </div>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            盤點時間：2026-09。管道現況會變（例如自転車公売開放新場次），有疑問直接問我重新查證。
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const BUDGET_JPY = 1_000_000;

// 顯示順序（跟資料庫原本分類順序不同，這裡照「該關注程度」排）
const ORDER = ['ksi', 'nta-koubai', 'bit-courts', 'osaka-police-bicycle', 'hyogo-police-bicycle', 'osaka-customs', 'kobe-customs', 'mandarake'];

const rows = ref([]);

onMounted(async () => {
  try {
    const { data } = await api.get('/auction-sources');
    const withFit = data.data.filter((s) => s.budgetFit);
    withFit.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
    rows.value = withFit.map((s) => ({
      id: s.id,
      shortName: s.shortName,
      url: s.url,
      icon: s.budgetFit.icon,
      status: s.budgetFit.status,
      verdict: s.budgetFit.verdict,
    }));
  } catch {
    rows.value = [];
  }
});
</script>

<style scoped>
.fit-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fit-row {
  padding: 8px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}
.fit-row:last-child { border-bottom: none; }
.fit-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
.fit-link { color: inherit; text-decoration: none; }
.fit-link:hover { text-decoration: underline; }
.fit-status { font-size: 12px; color: rgba(0, 0, 0, 0.7); margin-bottom: 2px; }
.fit-verdict { font-size: 12px; font-weight: 500; color: #795548; }
</style>
