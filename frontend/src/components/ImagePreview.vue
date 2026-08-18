<template>
  <div class="preview-wrap">
    <img v-if="src" :src="src" alt="preview" class="preview-img" />
    <div v-else class="preview-empty text-medium-emphasis">
      <v-icon size="56" color="grey-lighten-1">mdi-image-plus</v-icon>
      <div class="text-caption mt-3 text-center px-4">
        拍陶器 / 鐘錶 / 漫畫 / 老家具 / 相機<br>
        AI 判斷是否古董 + 估價範圍
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ src: { type: String, default: null } });
</script>

<style scoped>
.preview-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f0ece5;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  line-height: 1.5;
}
</style>
