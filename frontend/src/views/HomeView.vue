<template>
  <v-container class="px-4">
    <div class="text-center pt-6 pb-2">
      <v-btn
        color="primary"
        size="x-large"
        rounded="xl"
        block
        prepend-icon="mdi-camera"
        @click="$router.push('/camera')"
      >
        拍照鑑定
      </v-btn>
    </div>

    <div class="mt-8">
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
        還沒有紀錄，去拍第一件吧
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
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const store = useAppraisalsStore();

onMounted(() => store.loadLocal());

function open(a) {
  router.push({ name: 'result', params: { localId: a.localId } });
}
</script>
