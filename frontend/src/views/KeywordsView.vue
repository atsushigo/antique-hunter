<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">自動追蹤新上架</div>
      <v-spacer />
      <v-btn
        v-if="store.inbox.length"
        color="secondary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-inbox"
        @click="$router.push('/inbox')"
      >
        收件匣
        <v-chip size="x-small" color="error" variant="flat" class="ms-1">{{ store.inbox.length }}</v-chip>
      </v-btn>
    </div>

    <!-- 流程說明卡 -->
    <v-card variant="tonal" color="secondary" class="mb-3 flow-card" density="compact">
      <v-card-text class="pa-3">
        <div class="d-flex align-center text-caption">
          <v-icon size="18" class="me-2">mdi-information</v-icon>
          <div>
            <b>設個關鍵字</b> → 每天早上 <b>08:00</b> 自動查 Yahoo Auction + Jimoty →
            新上架商品進 <b>收件匣</b>，點卡片直接送 AI 估價
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 加關鍵字 -->
    <v-card variant="outlined" class="mb-3">
      <v-card-text class="pa-3">
        <div class="text-subtitle-2 font-weight-medium mb-2">
          <v-icon size="18" class="me-1">mdi-plus-circle</v-icon>加新的追蹤條件
        </div>
        <v-text-field
          v-model="newKw"
          label="關鍵字"
          placeholder="如：昭和 陶器、Rolex 不明、祖父の遺品、レトロ 眼鏡"
          variant="outlined"
          density="comfortable"
          hide-details
          @keyup.enter="addKeyword"
        />
        <div class="mt-2">
          <div class="text-caption text-medium-emphasis mb-1">查哪些站（點按選/取消）：</div>
          <div class="d-flex align-center flex-wrap ga-2">
            <v-chip
              v-for="s in supportedSites"
              :key="s.id"
              size="small"
              :color="s.supported && newSites.includes(s.id) ? 'primary' : undefined"
              :variant="s.supported && newSites.includes(s.id) ? 'flat' : 'outlined'"
              :disabled="!s.supported"
              @click="onSiteChipClick(s)"
            >
              <v-icon v-if="!s.supported" size="14" start>mdi-lock</v-icon>
              <v-icon v-else-if="s.note" size="12" start>mdi-clock-outline</v-icon>
              {{ s.label }}
            </v-chip>
          </div>
          <div v-if="siteNotes.length" class="text-caption text-medium-emphasis mt-2">
            <div v-for="n in siteNotes" :key="n">⏱ {{ n }}</div>
          </div>
          <div v-if="disabledReason" class="text-caption text-warning mt-2">
            ⚠️ {{ disabledReason }}
          </div>
        </div>
        <div class="d-flex justify-end mt-3">
          <v-btn
            color="primary"
            :disabled="!newKw || !newSites.length"
            :loading="adding"
            @click="addKeyword"
          >
            <v-icon start>mdi-plus</v-icon>加入並立即查一次
          </v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          💡 撿漏關鍵字建議：
          <span class="me-2">「不明」</span>
          <span class="me-2">「詳細不明」</span>
          <span class="me-2">「祖父の遺品」</span>
          <span class="me-2">「昭和レトロ」</span>
          <span class="me-2">「まとめて」</span>
        </div>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackColor" :timeout="4000" location="top">
      {{ snackText }}
      <template v-if="lastRunSummary" #actions>
        <v-btn variant="text" @click="$router.push('/inbox'); snackbar = false">看收件匣</v-btn>
      </template>
    </v-snackbar>

    <v-progress-linear v-if="store.loading" indeterminate color="primary" height="2" class="mb-2" />

    <!-- 清單 -->
    <div v-if="!store.list.length && !store.loading" class="text-caption text-medium-emphasis text-center pa-8">
      還沒有追蹤條件，加一個試試 👆
    </div>

    <div class="text-caption text-medium-emphasis mb-1" v-if="store.list.length">
      追蹤中 {{ store.list.length }} 個關鍵字
    </div>

    <v-card
      v-for="kw in store.list"
      :key="kw.id"
      variant="outlined"
      class="mb-2"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center mb-1">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">🔍 {{ kw.keyword }}</div>
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
          <span v-if="kw.lastRunAt">上次跑 {{ formatDate(kw.lastRunAt) }}</span>
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
          >馬上跑一次</v-btn>
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
const adding = ref(false);
const snackbar = ref(false);
const snackText = ref('');
const snackColor = ref('success');
const lastRunSummary = ref(null);

const supportedSites = computed(() => store.supportedSites);
const disabledReason = ref('');
const siteNotes = computed(() =>
  supportedSites.value
    .filter((s) => s.supported && s.note && newSites.value.includes(s.id))
    .map((s) => `${s.label}：${s.note}`)
);

function siteLabel(id) {
  return supportedSites.value.find((s) => s.id === id)?.label || id;
}
function onSiteChipClick(s) {
  if (!s.supported) {
    disabledReason.value = `${s.label}：${s.reason}`;
    return;
  }
  disabledReason.value = '';
  const i = newSites.value.indexOf(s.id);
  if (i === -1) newSites.value.push(s.id);
  else newSites.value.splice(i, 1);
}

// 加入 → 自動跑一次 → snackbar 顯示結果
async function addKeyword() {
  if (!newKw.value.trim() || !newSites.value.length) return;
  adding.value = true;
  try {
    const kw = await store.create({ keyword: newKw.value.trim(), sites: newSites.value });
    newKw.value = '';
    // auto-run
    const summary = await store.run(kw.id);
    lastRunSummary.value = summary;
    snackText.value = `「${kw.keyword}」跑完了：抓到 ${summary.newTotal} 件新上架`;
    snackColor.value = summary.newTotal > 0 ? 'success' : 'info';
    snackbar.value = true;
  } catch (err) {
    snackText.value = `失敗：${err.message || err}`;
    snackColor.value = 'error';
    snackbar.value = true;
  } finally {
    adding.value = false;
  }
}
async function toggleActive(kw) {
  await store.update(kw.id, { isActive: !kw.isActive });
}
async function runNow(kw) {
  running.add(kw.id);
  try {
    const summary = await store.run(kw.id);
    lastRunSummary.value = summary;
    snackText.value = `「${kw.keyword}」抓到 ${summary.newTotal} 件新上架`;
    snackColor.value = summary.newTotal > 0 ? 'success' : 'info';
    snackbar.value = true;
  } finally { running.delete(kw.id); }
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

onMounted(() => {
  store.fetchAll();
  store.fetchInbox({ days: 7 }).catch(() => {});
});
</script>

<style scoped>
.flow-card { border-left: 3px solid rgb(var(--v-theme-secondary)); }
</style>
