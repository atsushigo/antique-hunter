<template>
  <v-container class="px-3 pb-16">
    <div class="text-h6 mb-2">帳號連接</div>
    <div class="text-caption text-medium-emphasis mb-3">
      連上帳號後可讀自己的收藏、訊息，代打稿送出訊息。<b>不會自動出價</b>。
    </div>

    <!-- 登入說明卡 -->
    <v-card variant="tonal" color="secondary" class="mb-3">
      <v-card-text class="pa-3 text-caption">
        <div class="text-subtitle-2 font-weight-medium mb-1">
          <v-icon size="16" class="me-1">mdi-shield-key</v-icon>如何登入
        </div>
        <ol class="ps-4">
          <li>Terminal 到 backend 目錄跑 <code>npm run auth:login &lt;站別&gt;</code>（例：<code>npm run auth:login jimoty</code>）</li>
          <li>會開一個乾淨的 Chromium 視窗（無痕）跳到登入頁</li>
          <li>你自己輸密碼登入</li>
          <li>成功後我抓 cookie 存到 <code>backend/data/sessions/{站別}.json</code>（gitignored）</li>
          <li>密碼從頭到尾**沒有**經過我的 code；script &lt; 60 行可 git diff 掃過驗證</li>
        </ol>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

    <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="load" :loading="loading" class="mb-2">
      重新檢查狀態
    </v-btn>

    <v-card
      v-for="s in sites"
      :key="s.siteId"
      variant="outlined"
      class="mb-2 site-card"
      :class="{ 'site-ok': s.valid }"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">
            <v-icon size="18" :color="statusColor(s)" class="me-2">{{ statusIcon(s) }}</v-icon>
            {{ s.label }}
          </div>
          <v-chip size="x-small" :color="statusColor(s)" variant="tonal">{{ statusText(s) }}</v-chip>
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          <span v-if="s.savedAt">存於 {{ formatDate(s.savedAt) }} · {{ s.cookieCount }} cookies</span>
          <span v-else>尚未登入</span>
          <span v-if="s.reason" class="ms-1">· {{ s.reason }}</span>
        </div>
        <div class="mt-2 d-flex ga-2">
          <v-btn
            v-if="!s.valid"
            size="x-small"
            variant="tonal"
            prepend-icon="mdi-terminal"
            @click="showCmd(s)"
          >顯示登入指令</v-btn>
          <v-btn
            v-if="s.siteId === 'jimoty' && s.valid"
            size="x-small"
            variant="flat"
            color="primary"
            prepend-icon="mdi-open-in-app"
            @click="$router.push('/jimoty')"
          >我的 Jimoty</v-btn>
          <v-spacer />
          <v-btn
            v-if="s.exists"
            size="x-small"
            variant="text"
            color="error"
            @click="logout(s)"
          >清除本地 session</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :timeout="10000" location="top">
      {{ snackText }}
      <template #actions>
        <v-btn variant="text" @click="snackbar = false">關閉</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const sites = ref([]);
const loading = ref(false);
const error = ref('');
const snackbar = ref(false);
const snackText = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/auth/status');
    sites.value = data.data;
  } catch (err) {
    error.value = err.message || '載入失敗';
  } finally { loading.value = false; }
}

async function logout(site) {
  if (!confirm(`清除 ${site.label} 的本地 session？（不會登出遠端）`)) return;
  await api.delete(`/auth/session/${site.siteId}`);
  await load();
}

function showCmd(site) {
  const cmd = `cd backend && npm run auth:login ${site.siteId}`;
  snackText.value = `Terminal 執行：${cmd}`;
  snackbar.value = true;
}

function statusColor(s) {
  if (s.valid) return 'success';
  if (s.exists) return 'warning';
  return 'grey';
}
function statusIcon(s) {
  if (s.valid) return 'mdi-check-circle';
  if (s.exists) return 'mdi-alert-circle';
  return 'mdi-account-off';
}
function statusText(s) {
  if (s.valid) return '已登入';
  if (s.exists) return 'session 過期';
  return '未登入';
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now - d) / 3600000);
  if (diffH < 24) return `${diffH} 小時前`;
  return `${Math.floor(diffH / 24)} 天前`;
}

onMounted(load);
</script>

<style scoped>
.site-card.site-ok { border-left: 3px solid #2E7D32; }
code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
</style>
