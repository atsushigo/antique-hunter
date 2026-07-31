<template>
  <div class="preview-wrap">
    <img v-if="src" :src="src" alt="preview" class="preview-img" />
    <div v-else class="preview-empty text-medium-emphasis">
      <v-icon size="48">mdi-image-off-outline</v-icon>
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
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
