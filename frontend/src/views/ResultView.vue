<template>
  <v-container class="px-3">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
      <div class="text-caption mt-2 text-medium-emphasis">載入中...</div>
    </div>

    <template v-else-if="entry">
      <v-img
        v-if="entry.thumbDataUrl && !imgFailed"
        :src="proxiedImg(entry.thumbDataUrl)"
        max-height="300"
        contain
        rounded
        class="mb-3 result-thumb"
        @error="imgFailed = true"
      />
      <div v-else-if="entry.thumbDataUrl" class="thumb-fallback mb-3 d-flex flex-column align-center justify-center">
        <div style="font-size:48px">🇯🇵</div>
        <div class="text-caption mt-1">圖片被 CDN 擋（需 JP IP / 關 VPN）</div>
        <v-btn size="x-small" variant="text" :href="entry.thumbDataUrl" target="_blank" class="mt-1">
          在新分頁開圖片
        </v-btn>
      </div>

      <v-alert v-if="entry.status === 'pending'" type="info" density="compact" class="mb-3">
        送出中，請稍候
      </v-alert>
      <v-alert v-else-if="entry.status === 'failed'" type="error" density="compact" class="mb-3">
        鑑定失敗：{{ entry.error || '未知錯誤' }}
      </v-alert>

      <AppraisalResult
        v-if="entry.result"
        :result="entry.result"
        :collecting="collecting"
        @toggle-collect="onToggleCollect"
      />

      <div class="mt-6 d-flex ga-2">
        <v-btn variant="outlined" block prepend-icon="mdi-home" @click="$router.push('/')">首頁</v-btn>
        <v-btn
          v-if="entry.type === 'url'"
          color="primary" block prepend-icon="mdi-link-variant"
          @click="$router.replace('/url')"
        >再貼一個 URL</v-btn>
        <v-btn
          v-else
          color="primary" block prepend-icon="mdi-camera"
          @click="$router.replace('/camera')"
        >再拍一張</v-btn>
      </div>
    </template>

    <div v-else class="text-center pa-8">
      <v-icon size="64" color="grey">mdi-file-remove-outline</v-icon>
      <div class="text-h6 mt-3">找不到這筆紀錄</div>
      <div class="text-caption text-medium-emphasis mt-1">
        localId={{ localId }} — 可能已被自動清除（舊 mock 資料）或已被覆蓋
      </div>
      <div class="d-flex ga-2 mt-4 justify-center flex-wrap">
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-inbox" @click="$router.push('/inbox')">
          去收件夾
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-home" @click="$router.push('/')">首頁</v-btn>
        <v-btn variant="text" prepend-icon="mdi-history" @click="$router.push('/history')">歷史</v-btn>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.result-thumb {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}
.thumb-fallback {
  height: 180px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.55);
}
</style>

<script setup>
import { onMounted, ref } from 'vue';
import { useAppraisalsStore } from '../stores/appraisals.js';
import { proxiedImg } from '../labels.js';
import AppraisalResult from '../components/AppraisalResult.vue';

const props = defineProps({ localId: { type: [String, Number], required: true } });
const store = useAppraisalsStore();
const entry = ref(null);
const loading = ref(true);
const collecting = ref(false);
const imgFailed = ref(false);

async function refresh() {
  entry.value = await store.getOne(props.localId);
}

async function onToggleCollect() {
  collecting.value = true;
  try {
    await store.toggleCollect(props.localId);
    await refresh();
  } finally {
    collecting.value = false;
  }
}

onMounted(async () => {
  try {
    await refresh();
  } finally {
    loading.value = false;
  }
});
</script>
