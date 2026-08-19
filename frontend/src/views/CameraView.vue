<template>
  <v-container class="px-4 pb-16">
    <!-- 主預覽（第 1 張大圖）+ 其餘小圖 -->
    <div class="preview-slot">
      <ImagePreview :src="previews[0] || null" />
    </div>

    <!-- 附圖 thumbnails（有第 2 張以後才顯示）-->
    <div v-if="previews.length > 0" class="thumb-row mt-2">
      <div
        v-for="(url, i) in previews"
        :key="i"
        class="thumb"
        :class="{ 'primary-thumb': i === 0 }"
      >
        <img :src="url" alt="" />
        <v-btn
          class="thumb-remove"
          size="x-small"
          density="compact"
          variant="flat"
          color="grey-darken-3"
          icon="mdi-close"
          @click="removeAt(i)"
        />
      </div>
      <!-- 加一張的小卡（未達上限）-->
      <div v-if="previews.length < MAX_PHOTOS" class="thumb add-more" @click="uploadInput?.click()">
        <v-icon color="grey">mdi-plus</v-icon>
        <div class="text-caption">加一張</div>
      </div>
    </div>

    <!-- 拍/選 input -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onPick"
    />
    <input
      ref="uploadInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onPickMulti"
    />

    <!-- 首次或還沒選任何張時的兩顆大按鈕 -->
    <div v-if="!files.length" class="mt-4 d-flex ga-2">
      <v-btn color="primary" class="flex-1" prepend-icon="mdi-camera" @click="cameraInput?.click()">拍照</v-btn>
      <v-btn color="primary" variant="tonal" class="flex-1" prepend-icon="mdi-image-multiple" @click="uploadInput?.click()">選相片</v-btn>
    </div>

    <!-- 已有照片時的動作列 -->
    <div v-else class="mt-3 d-flex ga-2 align-center">
      <v-btn size="small" variant="outlined" prepend-icon="mdi-camera-plus" :disabled="atMax" @click="cameraInput?.click()">
        再拍一張
      </v-btn>
      <v-btn size="small" variant="text" prepend-icon="mdi-delete-sweep" @click="resetAll">
        清除
      </v-btn>
      <v-spacer />
      <v-btn color="primary" :loading="store.uploading" prepend-icon="mdi-send" @click="submit()">
        送出鑑定
      </v-btn>
    </div>

    <div class="text-caption text-medium-emphasis mt-2 px-1">
      💡 建議拍 <b>正面 + 底款/內襯 + 瑕疵</b> 三張，AI 綜合判斷更準（最多 {{ MAX_PHOTOS }} 張）
    </div>

    <!-- 描述 -->
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
      📝 描述越具體越好（來源／狀況／賣家開價／可疑點）— AI 會綜合照片 + 你的觀察做估價
    </div>

    <v-alert v-if="store.lastError" type="error" density="compact" class="mt-4">
      {{ store.lastError }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import ImagePreview from '../components/ImagePreview.vue';
import { useAppraisalsStore } from '../stores/appraisals.js';

const MAX_PHOTOS = 5;
const router = useRouter();
const store = useAppraisalsStore();
const cameraInput = ref(null);
const uploadInput = ref(null);
const files = ref([]); // File[]
const previews = ref([]); // objectURL[]
const description = ref('');

const atMax = computed(() => files.value.length >= MAX_PHOTOS);

function addFile(f) {
  if (!f || files.value.length >= MAX_PHOTOS) return;
  files.value.push(f);
  previews.value.push(URL.createObjectURL(f));
}

function onPick(e) {
  const f = e.target.files?.[0];
  if (f) addFile(f);
  e.target.value = '';
}
function onPickMulti(e) {
  const list = Array.from(e.target.files || []);
  for (const f of list) {
    if (atMax.value) break;
    addFile(f);
  }
  e.target.value = '';
}

function removeAt(i) {
  const url = previews.value[i];
  if (url) URL.revokeObjectURL(url);
  previews.value.splice(i, 1);
  files.value.splice(i, 1);
}

function resetAll() {
  for (const url of previews.value) URL.revokeObjectURL(url);
  previews.value = [];
  files.value = [];
}

async function submit() {
  if (!files.value.length) return;
  try {
    const localId = await store.submit(files.value, { description: description.value });
    router.replace({ name: 'result', params: { localId } });
  } catch {
    // error 在 store.lastError
  }
}

onBeforeUnmount(() => {
  for (const url of previews.value) URL.revokeObjectURL(url);
});
</script>

<style scoped>
.preview-slot {
  max-width: 240px;
  margin: 0 auto;
}
.flex-1 { flex: 1 1 0; }

.thumb-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px;
}
.thumb {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.thumb.primary-thumb {
  border: 2px solid #795548;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0.85;
}
.thumb.add-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.55);
  border-style: dashed;
}
.thumb.add-more:hover {
  background: rgba(121, 85, 72, 0.05);
}
</style>
