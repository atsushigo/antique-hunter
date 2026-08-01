<template>
  <v-container class="px-3 pt-4">
    <!-- 3 個主要功能大卡 -->
    <div class="d-flex flex-column ga-3">
      <v-card
        color="primary"
        rounded="xl"
        class="action-card"
        elevation="2"
        @click="$router.push('/camera')"
      >
        <v-card-text class="d-flex align-center pa-4">
          <v-icon size="42" class="me-3">mdi-camera</v-icon>
          <div>
            <div class="text-h6 font-weight-bold">拍照鑑定</div>
            <div class="text-caption">市集現場拿手機拍 → 3-5 秒 AI 估價</div>
          </div>
        </v-card-text>
      </v-card>

      <v-card
        color="primary"
        variant="tonal"
        rounded="xl"
        class="action-card"
        @click="$router.push('/url')"
      >
        <v-card-text class="d-flex align-center pa-4">
          <v-icon size="36" class="me-3">mdi-link-variant</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold">貼 URL 估價</div>
            <div class="text-caption">Mercari / Yahoo Auction / Rakuma / Jimoty 商品連結</div>
          </div>
        </v-card-text>
      </v-card>

      <v-card
        color="secondary"
        variant="tonal"
        rounded="xl"
        class="action-card"
        @click="$router.push('/keywords')"
      >
        <v-card-text class="d-flex align-center pa-4">
          <v-icon size="36" class="me-3">mdi-bell-ring</v-icon>
          <div class="flex-grow-1">
            <div class="d-flex align-center">
              <div class="text-subtitle-1 font-weight-bold me-2">追蹤新上架</div>
              <v-chip
                v-if="inboxCount > 0"
                size="x-small"
                color="error"
                variant="flat"
              >{{ inboxCount }} 新</v-chip>
            </div>
            <div class="text-caption">
              設關鍵字 → 每天早 8 點自動查 Yahoo Auction + Jimoty
            </div>
          </div>
          <v-icon
            v-if="inboxCount > 0"
            size="18"
            class="ms-2"
            @click.stop="$router.push('/inbox')"
          >mdi-inbox-arrow-down</v-icon>
        </v-card-text>
      </v-card>
    </div>

    <!-- 次要工具列 -->
    <div class="d-flex flex-wrap ga-1 mt-4 mb-2">
      <v-btn variant="text" size="small" prepend-icon="mdi-calendar-month" @click="$router.push('/calendar')">市集日曆</v-btn>
      <v-btn variant="text" size="small" prepend-icon="mdi-text-search" @click="$router.push('/search')">即時搜尋</v-btn>
      <v-btn variant="text" size="small" prepend-icon="mdi-history" @click="$router.push('/history')">歷史</v-btn>
      <v-btn variant="text" size="small" prepend-icon="mdi-star" @click="$router.push('/collection')">收藏</v-btn>
    </div>

    <!-- 最近鑑定 -->
    <div class="mt-4">
      <div class="d-flex align-center mb-2">
        <span class="text-subtitle-2">最近鑑定</span>
        <v-spacer />
        <v-btn
          v-if="store.list.length"
          size="x-small"
          variant="text"
          @click="store.loadLocal()"
        >重新整理</v-btn>
      </div>

      <div v-if="!store.list.length" class="text-caption text-medium-emphasis text-center pa-6">
        還沒有紀錄
      </div>

      <v-row v-else dense>
        <v-col v-for="a in store.recent" :key="a.localId" cols="6">
          <v-card variant="outlined" @click="open(a)">
            <v-img :src="a.thumbDataUrl" aspect-ratio="1" cover />
            <v-card-text class="pa-2">
              <div class="text-caption text-truncate">
                <v-chip
                  v-if="a.status === 'pending'"
                  size="x-small" color="warning" variant="tonal"
                >送出中</v-chip>
                <v-chip
                  v-else-if="a.status === 'failed'"
                  size="x-small" color="error" variant="tonal"
                >失敗</v-chip>
                <span v-else>{{ a.result?.category || '—' }}</span>
              </div>
              <div v-if="a.result?.priceMinJpy != null" class="text-caption text-medium-emphasis">
                ¥{{ a.result.priceMinJpy.toLocaleString() }}~¥{{ a.result.priceMaxJpy.toLocaleString() }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppraisalsStore } from '../stores/appraisals.js';
import { useKeywordsStore } from '../stores/keywords.js';

const router = useRouter();
const store = useAppraisalsStore();
const keywords = useKeywordsStore();

const inboxCount = computed(() => keywords.inboxCount);

onMounted(() => {
  store.loadLocal();
  keywords.fetchInbox({ days: 3 }).catch(() => {});
});

function open(a) {
  router.push({ name: 'result', params: { localId: a.localId } });
}
</script>

<style scoped>
.action-card {
  cursor: pointer;
  transition: transform 0.15s;
}
.action-card:active {
  transform: scale(0.98);
}
</style>
