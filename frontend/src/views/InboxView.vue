<template>
  <v-container class="px-2 pb-16">
    <div class="d-flex align-center mb-2 px-1">
      <div class="text-h6">收件匣</div>
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-refresh"
        :loading="loading"
        class="ms-1"
        @click="load"
      />
      <v-spacer />
      <v-btn-toggle v-model="days" mandatory density="compact" color="primary" variant="outlined">
        <v-btn :value="1" size="x-small">今日</v-btn>
        <v-btn :value="3" size="x-small">3 天</v-btn>
        <v-btn :value="7" size="x-small">週</v-btn>
      </v-btn-toggle>
    </div>

    <!-- 來源說明 -->
    <v-card variant="tonal" color="secondary" class="mb-2 mx-1 src-card">
      <v-card-text class="pa-2 d-flex align-center">
        <v-icon size="16" class="me-2">mdi-information</v-icon>
        <div class="text-caption flex-grow-1">
          追蹤中 keyword 的 4 站新上架，共 {{ pagination?.total || 0 }} 件（顯示 {{ filtered.length }}）
        </div>
        <v-btn size="x-small" variant="text" @click="$router.push('/keywords')">管理</v-btn>
      </v-card-text>
    </v-card>

    <!-- Keyword filter chips -->
    <div v-if="keywordChips.length" class="d-flex align-center flex-wrap ga-1 mb-2 px-1">
      <v-chip
        size="small"
        :color="!keywordFilter ? 'primary' : undefined"
        :variant="!keywordFilter ? 'flat' : 'outlined'"
        @click="setKeywordFilter(null)"
      >全部 {{ pagination?.total || 0 }}</v-chip>
      <v-chip
        v-for="k in keywordChips"
        :key="k.name"
        size="small"
        :color="keywordFilter === k.name ? 'primary' : undefined"
        :variant="keywordFilter === k.name ? 'flat' : 'outlined'"
        @click="setKeywordFilter(k.name)"
      >
        🔍 {{ k.name }} <span class="ms-1 text-caption">{{ k.count }}</span>
      </v-chip>
    </div>

    <!-- 價格 + 排序 filter -->
    <div class="d-flex align-center flex-wrap ga-1 mb-2 px-1">
      <v-chip
        v-for="b in PRICE_BUCKETS"
        :key="b.id"
        size="small"
        :color="priceBucket === b.id ? 'secondary' : undefined"
        :variant="priceBucket === b.id ? 'flat' : 'outlined'"
        @click="priceBucket = b.id"
      >{{ b.label }}</v-chip>
      <v-spacer />
      <v-btn-toggle v-model="sortBy" mandatory density="compact" color="primary" variant="outlined">
        <v-btn v-for="s in SORT_OPTIONS" :key="s.id" :value="s.id" size="x-small">{{ s.label }}</v-btn>
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />

    <div v-if="!loading && !store.inbox.length" class="text-center pa-8">
      <v-icon size="48" color="grey">mdi-inbox-outline</v-icon>
      <div class="text-body-2 mt-2">這段時間沒有新上架</div>
      <div class="text-caption text-medium-emphasis mt-1 mb-3">
        還沒設關鍵字？加一個試試
      </div>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="$router.push('/keywords')">
        去加追蹤關鍵字
      </v-btn>
    </div>

    <div v-else-if="!filtered.length" class="text-center pa-8 text-caption text-medium-emphasis">
      篩選後無結果 — 試試放寬價格條件
    </div>

    <div class="list">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="row"
        @click="onAppraise(item)"
      >
        <v-img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          class="thumb"
          cover
        />
        <div v-else class="thumb no-img d-flex align-center justify-center">
          <v-icon size="20" color="grey">mdi-image-off</v-icon>
        </div>
        <div class="body">
          <div class="line-1">
            <span class="price">
              <span v-if="item.priceJpy === 0 && item.priceLabel">{{ item.priceLabel }}</span>
              <span v-else-if="item.priceJpy != null">¥{{ item.priceJpy.toLocaleString() }}</span>
              <span v-else class="text-medium-emphasis">—</span>
            </span>
            <span class="title">{{ item.title || '(無標題)' }}</span>
          </div>
          <div class="line-2">
            <span class="site">{{ item.siteLabel }}</span>
            <span class="sep">·</span>
            <span class="kw">🔍 {{ item.keyword }}</span>
            <span class="sep">·</span>
            <span class="date">{{ formatRelative(item.firstSeenAt) }}</span>
          </div>
        </div>
        <div class="actions" @click.stop>
          <v-btn
            size="x-small"
            variant="tonal"
            icon="mdi-magic-staff"
            :loading="appraising === item.id"
            @click="onAppraise(item)"
          />
          <v-btn
            size="x-small"
            variant="text"
            icon="mdi-close"
            @click="onDismiss(item)"
          />
        </div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="pagination?.hasMore" class="text-center mt-4">
      <v-btn
        variant="tonal"
        color="primary"
        :loading="loadingMore"
        @click="loadMore"
      >
        載入更多（還有 {{ pagination.total - store.inbox.length }} 筆）
      </v-btn>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useKeywordsStore } from '../stores/keywords.js';
import { useAppraisalsStore } from '../stores/appraisals.js';
import { PRICE_BUCKETS, SORT_OPTIONS, useFilteredSorted } from '../composables/priceFilter.js';

const router = useRouter();
const store = useKeywordsStore();
const appraisals = useAppraisalsStore();
const days = ref(3);
const loading = ref(false);
const loadingMore = ref(false);
const appraising = ref(null);
const priceBucket = ref('all');
const sortBy = ref('new');
const keywordFilter = ref(null);
const pageSize = 50;

const inboxList = computed(() => store.inbox);
const filtered = useFilteredSorted(inboxList, priceBucket, sortBy, 'firstSeenAt');
const pagination = computed(() => store.inboxPagination);
const keywordChips = computed(() =>
  Object.entries(store.inboxPerKeyword || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
);

async function load() {
  loading.value = true;
  try {
    await store.fetchInbox({
      days: days.value,
      keyword: keywordFilter.value,
      limit: pageSize,
      offset: 0,
      force: true,
    });
  } finally { loading.value = false; }
}

async function loadMore() {
  if (!pagination.value?.hasMore) return;
  loadingMore.value = true;
  try {
    await store.fetchInbox({
      days: days.value,
      keyword: keywordFilter.value,
      limit: pageSize,
      offset: store.inbox.length,
      append: true,
      force: true,
    });
  } finally { loadingMore.value = false; }
}

function setKeywordFilter(name) {
  keywordFilter.value = name;
}

async function onAppraise(item) {
  appraising.value = item.id;
  try {
    const localId = await appraisals.submitUrl({
      url: item.sourceUrl,
      preview: {
        imageUrl: item.imageUrl,
        title: item.title,
        siteLabel: item.siteLabel,
        listedPriceJpy: item.priceJpy,
      },
    });
    router.push({ name: 'result', params: { localId } });
  } catch (err) {
    alert(`估價失敗：${err.message || err}`);
  } finally {
    appraising.value = null;
  }
}

async function onDismiss(item) {
  await store.dismiss(item.id);
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

onMounted(load);
watch([days, keywordFilter], load);
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: #FDFBF7;
  cursor: pointer;
  transition: background 0.1s;
}
.row:active {
  background: rgba(121, 85, 72, 0.08);
}
.thumb {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
}
.no-img {
  background: rgba(0,0,0,0.05);
}
.body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.line-1 {
  display: flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.line-1 .price {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  color: #795548;
}
.line-1 .title {
  font-size: 13px;
  color: #3E2723;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.line-2 {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
}
.line-2 .site {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}
.line-2 .sep {
  opacity: 0.4;
}
.actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
</style>
