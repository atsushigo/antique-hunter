<template>
  <v-container class="px-2 pb-16">
    <div class="text-h6 mb-2 px-1">即時搜尋</div>

    <v-text-field
      v-model="q"
      label="關鍵字（Yahoo Auction + Jimoty 同時搜）"
      placeholder="如：昭和 陶器、Rolex、不明 遺品"
      variant="outlined"
      density="comfortable"
      clearable
      @keyup.enter="onSearch"
    >
      <template #append-inner>
        <v-btn
          :loading="searching"
          color="primary"
          variant="tonal"
          size="small"
          :disabled="!q"
          @click="onSearch"
        >搜</v-btn>
      </template>
    </v-text-field>

    <div class="text-caption text-medium-emphasis mb-2 px-1">
      不會儲存追蹤；想每天自動查請去
      <v-btn size="x-small" variant="text" class="pa-0" @click="$router.push('/keywords')">追蹤關鍵字</v-btn>
    </div>

    <v-alert v-if="apiError" type="error" density="compact" class="mb-2">{{ apiError }}</v-alert>

    <div v-for="g in groups" :key="g.site" class="mb-4">
      <div class="d-flex align-center mb-2 px-1">
        <v-chip size="small" variant="tonal" color="primary">{{ g.siteLabel }}</v-chip>
        <span class="text-caption text-medium-emphasis ms-2">{{ g.items.length }} 件</span>
        <v-spacer />
        <span v-if="g.error" class="text-caption text-error">{{ g.error }}</span>
      </div>
      <div class="grid">
        <v-card
          v-for="(item, i) in g.items"
          :key="`${g.site}-${i}`"
          variant="outlined"
          class="listing-card"
        >
          <v-img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            aspect-ratio="1"
            cover
            @click="onAppraise(item, g)"
          />
          <div v-else class="no-img d-flex align-center justify-center" @click="onAppraise(item, g)">
            <v-icon color="grey">mdi-image-off</v-icon>
          </div>
          <v-card-text class="pa-2">
            <div class="d-flex align-center mb-1">
              <div class="price flex-grow-1">
                <span v-if="item.priceJpy === 0 && item.priceLabel">{{ item.priceLabel }}</span>
                <span v-else-if="item.priceJpy != null">¥{{ item.priceJpy.toLocaleString() }}</span>
                <span v-else class="text-medium-emphasis">—</span>
              </div>
              <v-btn
                size="x-small"
                variant="tonal"
                icon="mdi-magic-staff"
                :loading="appraising === item.sourceUrl"
                @click="onAppraise(item, g)"
              />
            </div>
            <div class="title text-caption font-weight-medium">
              {{ item.title || '(無標題)' }}
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const appraisals = useAppraisalsStore();
const q = ref('');
const groups = ref([]);
const searching = ref(false);
const apiError = ref('');
const appraising = ref(null);

async function onSearch() {
  if (!q.value?.trim()) return;
  apiError.value = '';
  searching.value = true;
  try {
    const { data } = await api.get('/search', { params: { q: q.value.trim() } });
    groups.value = data.data.groups;
  } catch (err) {
    apiError.value = err.message || '搜尋失敗';
    groups.value = [];
  } finally {
    searching.value = false;
  }
}

async function onAppraise(item, group) {
  appraising.value = item.sourceUrl;
  try {
    const localId = await appraisals.submitUrl({
      url: item.sourceUrl,
      preview: {
        imageUrl: item.imageUrl,
        title: item.title,
        siteLabel: group.siteLabel,
        listedPriceJpy: item.priceJpy,
      },
    });
    router.push({ name: 'result', params: { localId } });
  } catch (err) {
    apiError.value = err.message || '估價失敗';
  } finally {
    appraising.value = null;
  }
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.listing-card { overflow: hidden; }
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
