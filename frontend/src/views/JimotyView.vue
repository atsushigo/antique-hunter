<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <v-spacer />
      <v-btn size="x-small" variant="text" @click="$router.push('/accounts')">帳號</v-btn>
    </div>

    <v-alert v-if="notLoggedIn" type="warning" density="compact" class="mb-2">
      Jimoty session 沒設或過期。到
      <v-btn size="x-small" variant="text" @click="$router.push('/accounts')">帳號頁</v-btn>
      看指令重登。
    </v-alert>

    <v-tabs v-model="tab" density="compact" color="primary" class="mb-2">
      <v-tab value="favorites">★ 收藏 <span class="ms-1 text-caption">{{ favorites.length }}</span></v-tab>
      <v-tab value="my-posts">📝 我的貼文 <span class="ms-1 text-caption">{{ myPosts.length }}</span></v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- 收藏 -->
      <v-window-item value="favorites">
        <v-progress-linear v-if="loadingFav" indeterminate height="2" color="primary" />
        <div v-if="!loadingFav && favorites.length" class="d-flex align-center mb-2 px-1">
          <v-chip size="x-small" variant="tonal">共 {{ favorites.length }}</v-chip>
          <v-chip size="x-small" variant="tonal" color="success" class="ms-1">有效 {{ favActive }}</v-chip>
          <v-chip size="x-small" variant="tonal" color="grey" class="ms-1">已成交 {{ favSold }}</v-chip>
          <v-spacer />
          <v-btn-toggle v-model="favFilter" mandatory density="compact" color="primary" variant="outlined">
            <v-btn value="active" size="x-small">有效</v-btn>
            <v-btn value="all" size="x-small">全部</v-btn>
          </v-btn-toggle>
        </div>
        <div v-if="!loadingFav && !favorites.length" class="text-caption text-medium-emphasis text-center pa-6">
          沒有收藏
        </div>
        <div class="grid">
          <v-card
            v-for="(it, i) in filteredFavorites"
            :key="i"
            variant="outlined"
            class="listing-card"
            :class="{ 'is-sold': it.isSold }"
          >
            <v-img v-if="it.imageUrl" :src="it.imageUrl" aspect-ratio="1" cover @click="openItem(it)" />
            <div v-else class="no-img d-flex align-center justify-center" @click="openItem(it)">
              <v-icon color="grey">mdi-image-off</v-icon>
            </div>
            <v-card-text class="pa-2">
              <div class="d-flex align-center mb-1">
                <div class="price flex-grow-1">
                  <span v-if="it.priceJpy != null">¥{{ it.priceJpy.toLocaleString() }}</span>
                  <span v-else class="text-medium-emphasis">—</span>
                </div>
                <v-chip
                  v-if="it.isSold"
                  size="x-small" color="grey" variant="tonal"
                >已成交</v-chip>
                <v-btn
                  v-else
                  size="x-small" variant="tonal" icon="mdi-magic-staff"
                  @click="appraise(it)"
                />
              </div>
              <div class="title text-caption font-weight-medium" :title="`${it.region} · ${it.category === 'car' ? '車輛' : '物件'}`">
                {{ it.title || '(無標題)' }}
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-window-item>

      <!-- 我的貼文 -->
      <v-window-item value="my-posts">
        <v-progress-linear v-if="loadingPosts" indeterminate height="2" color="primary" />
        <div v-if="!loadingPosts && !myPosts.length" class="text-caption text-medium-emphasis text-center pa-6">
          你在 Jimoty 沒有上架中的貼文
        </div>
        <v-card
          v-for="(p, i) in myPosts"
          :key="i"
          variant="outlined"
          class="mb-2 post-card"
          @click="openItem(p)"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center mb-1">
              <div class="text-subtitle-2 font-weight-medium flex-grow-1">{{ p.title || '(無標題)' }}</div>
              <span v-if="p.priceJpy" class="post-price">¥{{ p.priceJpy.toLocaleString() }}</span>
              <v-chip v-if="p.isClosed" size="x-small" color="grey" variant="tonal" class="ms-2">已結束</v-chip>
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center">
              <span>{{ p.region }}</span>
              <v-spacer />
              <v-icon size="12" class="me-1">mdi-message</v-icon>{{ p.inquiryCount }}
              <v-icon size="12" class="ms-2 me-1">mdi-star</v-icon>{{ p.favoriteCount }}
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <v-snackbar v-model="snackbar" :color="snackColor" :timeout="6000" location="top">{{ snackText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const appraisals = useAppraisalsStore();

const tab = ref('favorites');
const favorites = ref([]);
const myPosts = ref([]);
const loadingFav = ref(false);
const loadingPosts = ref(false);
const notLoggedIn = ref(false);
const favFilter = ref('active');

const snackbar = ref(false);
const snackText = ref('');
const snackColor = ref('success');

const favActive = computed(() => favorites.value.filter((f) => !f.isSold).length);
const favSold = computed(() => favorites.value.filter((f) => f.isSold).length);
const filteredFavorites = computed(() =>
  favFilter.value === 'active' ? favorites.value.filter((f) => !f.isSold) : favorites.value
);

async function loadFav() {
  loadingFav.value = true;
  notLoggedIn.value = false;
  try {
    const { data } = await api.get('/jimoty/favorites');
    favorites.value = data.data;
  } catch (err) {
    if (err.error === 'not_logged_in' || err.error === 'session_expired') notLoggedIn.value = true;
    else snack('載入收藏失敗：' + err.message, 'error');
  } finally { loadingFav.value = false; }
}

async function loadMyPosts() {
  loadingPosts.value = true;
  try {
    const { data } = await api.get('/jimoty/my-posts');
    myPosts.value = data.data;
  } catch (err) {
    if (err.error === 'not_logged_in' || err.error === 'session_expired') notLoggedIn.value = true;
    else snack('載入貼文失敗：' + err.message, 'error');
  } finally { loadingPosts.value = false; }
}

function appraise(it) {
  appraisals.submitUrl({
    url: it.sourceUrl,
    preview: { imageUrl: it.imageUrl, title: it.title, siteLabel: 'Jimoty', listedPriceJpy: it.priceJpy },
  }).then((id) => router.push({ name: 'result', params: { localId: id } }));
}

function openItem(it) { window.open(it.sourceUrl, '_blank', 'noopener'); }
function snack(text, color = 'success') { snackText.value = text; snackColor.value = color; snackbar.value = true; }

onMounted(() => {
  loadFav();
  loadMyPosts();
});
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.listing-card { overflow: hidden; }
.no-img { aspect-ratio: 1; background: rgba(0,0,0,0.05); cursor: pointer; }
.price { font-size: 14px; font-weight: 700; color: #795548; }
.title {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; min-height: 32px; line-height: 1.3;
}
.post-card { cursor: pointer; }
.post-price { font-size: 14px; font-weight: 700; color: #795548; }
.listing-card.is-sold { opacity: 0.55; }
</style>
