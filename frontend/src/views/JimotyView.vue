<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">我的 Jimoty</div>
      <v-spacer />
      <v-btn size="x-small" variant="text" @click="$router.push('/accounts')">帳號</v-btn>
    </div>

    <v-alert v-if="notLoggedIn" type="warning" density="compact" class="mb-2">
      Jimoty session 沒設或過期。到
      <v-btn size="x-small" variant="text" @click="$router.push('/accounts')">帳號頁</v-btn>
      看指令重登。
    </v-alert>

    <v-tabs v-model="tab" density="compact" color="primary" class="mb-2">
      <v-tab value="favorites">★ 收藏</v-tab>
      <v-tab value="messages">💬 訊息</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- 收藏 -->
      <v-window-item value="favorites">
        <v-progress-linear v-if="loadingFav" indeterminate height="2" color="primary" />
        <div v-if="!loadingFav && !favorites.length" class="text-caption text-medium-emphasis text-center pa-6">
          沒有收藏或抓不到（parser 若失敗可看
          <v-btn size="x-small" variant="text" @click="showRaw('/my/favorite_article_references')">raw HTML</v-btn>）
        </div>
        <div class="grid">
          <v-card v-for="(it, i) in favorites" :key="i" variant="outlined" class="listing-card">
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
                <v-btn size="x-small" variant="tonal" icon="mdi-magic-staff" @click="appraise(it)" />
              </div>
              <div class="title text-caption font-weight-medium">
                {{ it.title || '(無標題)' }}
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-window-item>

      <!-- 訊息 -->
      <v-window-item value="messages">
        <v-progress-linear v-if="loadingThreads" indeterminate height="2" color="primary" />
        <div v-if="!loadingThreads && !threads.length" class="text-caption text-medium-emphasis text-center pa-6">
          沒有訊息或抓不到（parser 若失敗可看
          <v-btn size="x-small" variant="text" @click="showRaw('/my/messages')">raw HTML</v-btn>）
        </div>
        <v-card
          v-for="t in threads"
          :key="t.id"
          variant="outlined"
          class="mb-2 thread-card"
          @click="openThread(t)"
        >
          <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis mb-1">Thread #{{ t.id }}</div>
            <div class="text-body-2 text-truncate-2">{{ t.preview }}</div>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- 訊息詳情 + 打稿送 -->
    <v-dialog v-model="threadOpen" max-width="600">
      <v-card v-if="activeThread">
        <v-card-title class="text-body-1">
          Thread #{{ activeThread.id }}
          <v-spacer />
          <v-btn size="small" variant="text" :href="activeThread.url" target="_blank">在 Jimoty 開啟</v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-3">
          <div class="text-caption text-medium-emphasis mb-2">
            對話內容（原始）— {{ activeThread.rawHtmlSize?.toLocaleString() }} bytes
          </div>
          <div class="body-preview">{{ activeThread.bodyPreview }}</div>
        </v-card-text>
        <v-divider />
        <v-card-text class="pa-3">
          <div class="text-subtitle-2 mb-1">回覆</div>
          <v-textarea
            v-model="replyBody"
            placeholder="打你的訊息..."
            variant="outlined"
            density="comfortable"
            rows="3"
            auto-grow
            hide-details
          />
          <div class="d-flex align-center mt-2">
            <div class="text-caption text-medium-emphasis">
              ⚠️ 按送出前請再看一次 — 我不會自動改內容
            </div>
            <v-spacer />
            <v-btn variant="text" @click="threadOpen = false">取消</v-btn>
            <v-btn
              color="primary"
              :disabled="!replyBody.trim()"
              :loading="sending"
              @click="sendReply"
            >送出</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" :timeout="6000" location="top">{{ snackText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAppraisalsStore } from '../stores/appraisals.js';

const router = useRouter();
const appraisals = useAppraisalsStore();

const tab = ref('favorites');
const favorites = ref([]);
const threads = ref([]);
const loadingFav = ref(false);
const loadingThreads = ref(false);
const notLoggedIn = ref(false);

const threadOpen = ref(false);
const activeThread = ref(null);
const replyBody = ref('');
const sending = ref(false);

const snackbar = ref(false);
const snackText = ref('');
const snackColor = ref('success');

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

async function loadThreads() {
  loadingThreads.value = true;
  try {
    const { data } = await api.get('/jimoty/messages');
    threads.value = data.data;
  } catch (err) {
    if (err.error === 'not_logged_in' || err.error === 'session_expired') notLoggedIn.value = true;
    else snack('載入訊息失敗：' + err.message, 'error');
  } finally { loadingThreads.value = false; }
}

async function openThread(t) {
  const { data } = await api.get(`/jimoty/messages/${t.id}`);
  activeThread.value = { ...data.data, url: t.url };
  replyBody.value = '';
  threadOpen.value = true;
}

async function sendReply() {
  sending.value = true;
  try {
    const { data } = await api.post(`/jimoty/messages/${activeThread.value.id}/reply`, {
      body: replyBody.value,
    });
    if (data.data.ok) {
      snack('送出成功', 'success');
      threadOpen.value = false;
      await loadThreads();
    } else {
      snack('可能送失敗（status ' + data.data.status + '）', 'warning');
    }
  } catch (err) {
    snack('送出失敗：' + err.message, 'error');
  } finally { sending.value = false; }
}

function appraise(it) {
  appraisals.submitUrl({
    url: it.sourceUrl,
    preview: { imageUrl: it.imageUrl, title: it.title, siteLabel: 'Jimoty', listedPriceJpy: it.priceJpy },
  }).then((id) => router.push({ name: 'result', params: { localId: id } }));
}

function openItem(it) { window.open(it.sourceUrl, '_blank', 'noopener'); }
async function showRaw(path) {
  const { data } = await api.get('/jimoty/raw', { params: { path } });
  console.log('=== raw ===', data.data);
  snack(`Raw dump 印在 console（${data.data.size} bytes）`, 'info');
}
function snack(text, color = 'success') { snackText.value = text; snackColor.value = color; snackbar.value = true; }

onMounted(() => {
  loadFav();
  loadThreads();
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
.thread-card { cursor: pointer; }
.text-truncate-2 {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.body-preview {
  max-height: 200px; overflow: auto;
  background: rgba(0,0,0,0.03); padding: 8px; border-radius: 4px;
  font-size: 12px; line-height: 1.5; white-space: pre-wrap;
}
</style>
