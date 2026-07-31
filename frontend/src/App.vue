<template>
  <v-app>
    <v-app-bar color="primary" density="compact" flat>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-app-bar>

    <v-main class="pb-16">
      <router-view />
    </v-main>

    <BottomNav />
  </v-app>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';

const route = useRoute();
const title = computed(() => route.meta?.title || '古董獵人');
</script>
