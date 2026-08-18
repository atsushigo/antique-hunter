<template>
  <v-bottom-navigation :model-value="active" grow color="primary" bg-color="surface">
    <v-btn value="home" @click="go('home')">
      <v-icon>mdi-home</v-icon>
      <span>首頁</span>
    </v-btn>
    <v-btn value="inbox" @click="go('inbox')">
      <v-icon>mdi-bell-ring</v-icon>
      <span>追蹤</span>
    </v-btn>
    <v-btn value="gov-auctions" @click="go('gov-auctions')">
      <v-icon>mdi-gavel</v-icon>
      <span>官公庁</span>
    </v-btn>
    <v-btn value="accounts" @click="go('accounts')">
      <v-icon>mdi-account-key</v-icon>
      <span>帳號</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const active = computed(() => {
  const map = { inbox: 'inbox', 'gov-auctions': 'gov-auctions', accounts: 'accounts' };
  return map[route.name] || 'home';
});

function go(name) {
  if (route.name !== name) router.push({ name });
}
</script>
