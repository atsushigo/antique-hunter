<template>
  <v-container class="px-3 pb-16">
    <div class="text-h6 mb-1">URL 估價</div>
    <div class="text-caption text-medium-emphasis mb-3">
      支援 Mercari / Yahoo Auction / Rakuma 商品頁
    </div>

    <v-text-field
      v-model="url"
      label="貼上商品 URL"
      placeholder="https://jp.mercari.com/item/... 或 https://page.auctions.yahoo.co.jp/..."
      variant="outlined"
      density="comfortable"
      clearable
      :error-messages="urlError"
      @keyup.enter="onPreview"
    >
      <template #append-inner>
        <v-btn
          :loading="previewing"
          color="primary"
          variant="tonal"
          size="small"
          :disabled="!url"
          @click="onPreview"
        >預覽</v-btn>
      </template>
    </v-text-field>

    <v-alert v-if="apiError" type="error" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <!-- Preview 卡片 -->
    <v-card v-if="preview" variant="outlined" class="mb-3 preview-card">
      <v-row no-gutters>
        <v-col cols="4" class="pa-2">
          <v-img
            v-if="preview.imageUrl"
            :src="preview.imageUrl"
            aspect-ratio="1"
            cover
            rounded
          />
          <div v-else class="no-img d-flex align-center justify-center">
            <v-icon color="grey">mdi-image-off</v-icon>
          </div>
        </v-col>
        <v-col cols="8" class="pa-3">
          <div class="d-flex align-center mb-1">
            <v-chip size="x-small" color="primary" variant="tonal">{{ preview.siteLabel }}</v-chip>
            <v-spacer />
            <div v-if="preview.listedPriceJpy != null" class="text-h6 font-weight-bold" style="color:#795548">
              ¥{{ preview.listedPriceJpy.toLocaleString() }}
            </div>
          </div>
          <div class="text-body-2 font-weight-medium text-truncate-2">{{ preview.title }}</div>
          <div class="text-caption text-medium-emphasis mt-1 text-truncate-2">
            {{ preview.description }}
          </div>
        </v-col>
      </v-row>
      <v-divider />
      <v-card-actions class="pa-2">
        <v-btn size="small" variant="text" @click="reset">重貼</v-btn>
        <v-spacer />
        <v-btn
          :loading="submitting"
          color="primary"
          variant="flat"
          prepend-icon="mdi-magic-staff"
          @click="onAppraise"
        >送 AI 估價</v-btn>
      </v-card-actions>
    </v-card>

    <div v-if="!preview && !previewing" class="text-caption text-medium-emphasis pa-4 tips">
      <div class="mb-2">💡 撿漏 tip：</div>
      <ul class="ps-4">
        <li>Mercari 找關鍵字「不明」「詳細不明」「祖父の遺品」「昭和レトロ」</li>
        <li>Yahoo Auction 找「まとめて」「大量」「セット」（藏單品）</li>
        <li>週日晚上 9-11 點是 Mercari 新上架高峰</li>
      </ul>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const store = useAppraisalsStore();

const url = ref('');
const urlError = ref('');
const apiError = ref('');
const preview = ref(null);
const previewing = ref(false);
const submitting = ref(false);

function reset() {
  preview.value = null;
  apiError.value = '';
  urlError.value = '';
}

async function onPreview() {
  urlError.value = '';
  apiError.value = '';
  if (!url.value?.trim()) {
    urlError.value = '請貼上 URL';
    return;
  }
  previewing.value = true;
  try {
    const { data } = await api.post('/appraisal/url/preview', { url: url.value.trim() });
    preview.value = data.data;
  } catch (err) {
    apiError.value = err.message || '預覽失敗';
    preview.value = null;
  } finally {
    previewing.value = false;
  }
}

async function onAppraise() {
  if (!preview.value) return;
  apiError.value = '';
  submitting.value = true;
  try {
    const localId = await store.submitUrl({
      url: url.value.trim(),
      preview: preview.value,
    });
    router.push({ name: 'result', params: { localId } });
  } catch (err) {
    apiError.value = err.message || 'AI 估價失敗';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.preview-card {
  overflow: hidden;
}
.no-img {
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tips ul {
  margin: 0;
}
.tips li {
  margin-bottom: 4px;
}
</style>
