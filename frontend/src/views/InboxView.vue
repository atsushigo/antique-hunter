<template>
  <v-container class="px-2 pb-16">
    <div class="d-flex align-center mb-2 px-1">
      <div class="text-h6">收件匣</div>
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
          追蹤中的關鍵字在 Yahoo Auction + Jimoty + Mercari + Rakuma 抓到的新上架，共 {{ store.inbox.length }} 件（篩後 {{ filtered.length }}）
        </div>
        <v-btn size="x-small" variant="text" @click="$router.push('/keywords')">管理</v-btn>
      </v-card-text>
    </v-card>

    <!-- 價格 + 排序 filter -->
    <div class="d-flex align-center flex-wrap ga-1 mb-2 px-1">
      <v-chip
        v-for="b in PRICE_BUCKETS"
        :key="b.id"
        size="small"
        :color="priceBucket === b.id ? 'primary' : undefined"
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

    <div class="grid">
      <v-card
        v-for="item in filtered"
        :key="item.id"
        variant="outlined"
        class="listing-card"
      >
        <v-img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          aspect-ratio="1"
          cover
          @click="onAppraise(item)"
        />
        <div v-else class="no-img d-flex align-center justify-center" @click="onAppraise(item)">
          <v-icon color="grey">mdi-image-off</v-icon>
        </div>
        <v-card-text class="pa-2">
          <div class="d-flex align-center mb-1">
            <v-chip size="x-small" variant="tonal" color="primary">{{ item.siteLabel }}</v-chip>
            <v-spacer />
            <div class="price">
              <span v-if="item.priceJpy === 0 && item.priceLabel">{{ item.priceLabel }}</span>
              <span v-else-if="item.priceJpy != null">¥{{ item.priceJpy.toLocaleString() }}</span>
              <span v-else>—</span>
            </div>
          </div>
          <div class="title text-caption font-weight-medium">
            {{ item.title || '(無標題)' }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            <v-chip size="x-small" variant="text" class="pa-0">🔍 {{ item.keyword }}</v-chip>
          </div>
          <div class="d-flex mt-2 ga-1">
            <v-btn
              size="x-small"
              variant="tonal"
              prepend-icon="mdi-magic-staff"
              :loading="appraising === item.id"
              @click="onAppraise(item)"
            >估價</v-btn>
            <v-spacer />
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-close"
              @click="onDismiss(item)"
            />
          </div>
        </v-card-text>
      </v-card>
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
const appraising = ref(null);
const priceBucket = ref('all');
const sortBy = ref('new');

const inboxList = computed(() => store.inbox);
const filtered = useFilteredSorted(inboxList, priceBucket, sortBy, 'firstSeenAt');

async function load() {
  loading.value = true;
  try { await store.fetchInbox({ days: days.value, force: true }); }
  finally { loading.value = false; }
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

onMounted(load);
watch(days, load);
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.listing-card {
  overflow: hidden;
}
.no-img {
  aspect-ratio: 1;
  background: rgba(0,0,0,0.05);
  cursor: pointer;
}
.price {
  font-size: 14px;
  font-weight: 700;
  color: #795548;
}
.title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 32px;
  line-height: 1.3;
}
</style>
