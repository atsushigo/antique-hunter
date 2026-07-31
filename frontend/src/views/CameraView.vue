<template>
  <v-container class="px-4">
    <ImagePreview :src="previewUrl" />

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onPick"
    />

    <div v-if="!file" class="mt-6">
      <v-btn
        color="primary"
        size="x-large"
        block
        prepend-icon="mdi-camera"
        @click="openPicker()"
      >
        拍照 / 選相片
      </v-btn>
      <p class="text-caption text-medium-emphasis text-center mt-3">
        iOS 會跳出「拍照 / 從相簿選擇」選單
      </p>
    </div>

    <div v-else class="mt-6 d-flex ga-2">
      <v-btn
        variant="outlined"
        block
        :disabled="store.uploading"
        @click="reset()"
      >重拍</v-btn>
      <v-btn
        color="primary"
        block
        :loading="store.uploading"
        prepend-icon="mdi-send"
        @click="submit()"
      >送出鑑定</v-btn>
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
const fileInput = ref(null);
const file = ref(null);
const previewUrl = ref(null);

function openPicker() {
  fileInput.value?.click();
}

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
  if (fileInput.value) fileInput.value.value = '';
}

async function submit() {
  try {
    const localId = await store.submit(file.value);
    router.replace({ name: 'result', params: { localId } });
  } catch {
    // error 已寫進 store.lastError
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>
