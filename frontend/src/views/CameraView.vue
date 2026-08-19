<template>
  <v-container class="px-4 pb-16">
    <div class="preview-slot">
      <ImagePreview :src="previewUrl" />
    </div>

    <!-- 拍照 input（mobile 才會走 camera）-->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onPick"
    />
    <!-- 上傳 input（不加 capture → 手機開相簿、桌面開檔案總管）-->
    <input
      ref="uploadInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onPick"
    />

    <div v-if="!file" class="mt-4 d-flex ga-2">
      <v-btn
        color="primary"
        class="flex-1"
        prepend-icon="mdi-camera"
        @click="cameraInput?.click()"
      >拍照</v-btn>
      <v-btn
        color="primary"
        variant="tonal"
        class="flex-1"
        prepend-icon="mdi-image-multiple"
        @click="uploadInput?.click()"
      >選相片</v-btn>
    </div>

    <div v-else class="mt-4 d-flex ga-2">
      <v-btn
        variant="outlined"
        :disabled="store.uploading"
        prepend-icon="mdi-refresh"
        @click="reset()"
      >重選</v-btn>
      <v-btn
        color="primary"
        class="flex-1"
        :loading="store.uploading"
        prepend-icon="mdi-send"
        @click="submit()"
      >送出鑑定</v-btn>
    </div>

    <!-- 描述輸入 -->
    <v-textarea
      v-model="description"
      class="mt-4"
      variant="outlined"
      density="comfortable"
      rows="3"
      auto-grow
      counter="500"
      maxlength="500"
      hide-details="auto"
      label="補充描述（選填，會併入 AI 判斷）"
      placeholder="例：市集賣家開價 ¥3,000、底款有『大清乾隆年製』、有一小缺角、聲稱是家中長輩收藏"
    />
    <div class="text-caption text-medium-emphasis mt-1 px-1">
      💡 描述越具體越好（來源／狀況／賣家開價／可疑點）— AI 會綜合照片 + 你的觀察做估價
    </div>

    <v-alert v-if="store.lastError" type="error" density="compact" class="mt-4">
      {{ store.lastError }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import ImagePreview from '../components/ImagePreview.vue';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const store = useAppraisalsStore();
const cameraInput = ref(null);
const uploadInput = ref(null);
const file = ref(null);
const previewUrl = ref(null);
const description = ref('');

function onPick(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  file.value = f;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(f);
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
  file.value = null;
  if (cameraInput.value) cameraInput.value.value = '';
  if (uploadInput.value) uploadInput.value.value = '';
}

async function submit() {
  try {
    const localId = await store.submit(file.value, { description: description.value });
    router.replace({ name: 'result', params: { localId } });
  } catch {
    // error 已寫進 store.lastError
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<style scoped>
.preview-slot {
  max-width: 240px;
  margin: 0 auto;
}
.flex-1 { flex: 1 1 0; }
</style>
