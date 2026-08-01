<template>
  <v-bottom-navigation :model-value="active" grow color="primary" bg-color="surface">
    <v-btn value="home" @click="go('home')">
      <v-icon>mdi-camera</v-icon>
      <span>拍照</span>
    </v-btn>
    <v-btn value="calendar" @click="go('calendar')">
      <v-icon>mdi-calendar-month</v-icon>
      <span>日曆</span>
    </v-btn>
    <v-btn value="markets" @click="go('markets')">
      <v-icon>mdi-storefront</v-icon>
      <span>市集</span>
    </v-btn>
    <v-btn value="camera" @click="go('camera')" style="display:none" />
  </v-bottom-navigation>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const active = computed(() => {
  if (route.name === 'markets') return 'markets';
  if (route.name === 'calendar') return 'calendar';
  return 'home';
});

function go(name) {
  if (route.name !== name) router.push({ name });
}
</script>
