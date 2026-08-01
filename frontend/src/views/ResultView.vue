<template>
  <v-container class="px-3">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
      <div class="text-caption mt-2 text-medium-emphasis">載入中...</div>
    </div>

    <template v-else-if="entry">
      <v-img
        v-if="entry.thumbDataUrl"
        :src="entry.thumbDataUrl"
        aspect-ratio="1"
        cover
        rounded
        class="mb-3"
      />

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

    <v-alert v-else type="warning" density="compact">
      找不到這筆紀錄（localId={{ localId }}）
    </v-alert>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAppraisalsStore } from '../stores/appraisals.js';
import AppraisalResult from '../components/AppraisalResult.vue';

const props = defineProps({ localId: { type: [String, Number], required: true } });
const store = useAppraisalsStore();
const entry = ref(null);
const loading = ref(true);
const collecting = ref(false);

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
