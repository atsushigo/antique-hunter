<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">追蹤關鍵字</div>
      <v-spacer />
      <div class="text-caption text-medium-emphasis">每天 08:00 自動跑</div>
    </div>

    <!-- 新增 -->
    <v-card variant="outlined" class="mb-3">
      <v-card-text class="pa-3">
        <v-text-field
          v-model="newKw"
          label="關鍵字（如：昭和 陶器、Rolex、不明 遺品）"
          variant="outlined"
          density="comfortable"
          hide-details
          @keyup.enter="addKeyword"
        />
        <div class="mt-2 d-flex align-center flex-wrap ga-2">
          <span class="text-caption me-1">站別：</span>
          <v-chip
            v-for="s in supportedSites"
            :key="s.id"
            size="small"
            :color="newSites.includes(s.id) ? 'primary' : undefined"
            :variant="newSites.includes(s.id) ? 'flat' : 'outlined'"
            @click="toggleNewSite(s.id)"
          >{{ s.label }}</v-chip>
          <v-spacer />
          <v-btn color="primary" size="small" :disabled="!newKw" @click="addKeyword">加入</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="store.error" type="error" density="compact" class="mb-2">{{ store.error }}</v-alert>
    <v-progress-linear v-if="store.loading" indeterminate color="primary" height="2" class="mb-2" />

    <!-- 清單 -->
    <div v-if="!store.list.length && !store.loading" class="text-caption text-medium-emphasis text-center pa-6">
      還沒有追蹤關鍵字
    </div>

    <v-card
      v-for="kw in store.list"
      :key="kw.id"
      variant="outlined"
      class="mb-2"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center mb-1">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">{{ kw.keyword }}</div>
          <v-switch
            :model-value="kw.isActive"
            hide-details
            density="compact"
            color="primary"
            @update:model-value="toggleActive(kw)"
          />
        </div>
        <div class="d-flex flex-wrap ga-1 mb-1">
          <v-chip
            v-for="s in kw.sites"
            :key="s"
            size="x-small"
            variant="tonal"
          >{{ siteLabel(s) }}</v-chip>
        </div>
        <div class="text-caption text-medium-emphasis">
          <span v-if="kw.lastRunAt">上次 {{ formatDate(kw.lastRunAt) }}</span>
          <span v-else>還沒跑過</span>
          <span v-if="kw.lastError" class="text-error ms-2">· {{ kw.lastError }}</span>
        </div>
        <div class="d-flex ga-2 mt-2">
          <v-btn
            size="x-small"
            variant="tonal"
            :loading="running.has(kw.id)"
            prepend-icon="mdi-play"
            @click="runNow(kw)"
          >跑一次</v-btn>
          <v-spacer />
          <v-btn
            size="x-small"
            variant="text"
            color="error"
            @click="remove(kw)"
          >刪除</v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useKeywordsStore } from '../stores/keywords.js';

const store = useKeywordsStore();
const newKw = ref('');
const newSites = ref(['yahoo_auction', 'jimoty']);
const running = reactive(new Set());
const supportedSites = computed(() => store.supportedSites);

function siteLabel(id) {
  return supportedSites.value.find((s) => s.id === id)?.label || id;
}
function toggleNewSite(id) {
  const i = newSites.value.indexOf(id);
  if (i === -1) newSites.value.push(id);
  else newSites.value.splice(i, 1);
}
async function addKeyword() {
  if (!newKw.value.trim()) return;
  await store.create({ keyword: newKw.value.trim(), sites: newSites.value });
  newKw.value = '';
}
async function toggleActive(kw) {
  await store.update(kw.id, { isActive: !kw.isActive });
}
async function runNow(kw) {
  running.add(kw.id);
  try { await store.run(kw.id); } finally { running.delete(kw.id); }
}
async function remove(kw) {
  if (!confirm(`刪除「${kw.keyword}」？（相關 listing 也會刪除）`)) return;
  await store.remove(kw.id);
}
function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return '剛剛';
  if (diff < 60) return `${diff} 分前`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} 小時前`;
  return `${Math.floor(diff / 60 / 24)} 天前`;
}

onMounted(() => store.fetchAll());
</script>
