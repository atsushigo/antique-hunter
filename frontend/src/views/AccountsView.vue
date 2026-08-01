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
        <div class="mt-2 d-flex ga-2 flex-wrap">
          <v-btn
            v-if="!s.valid"
            size="small"
            variant="flat"
            color="primary"
            prepend-icon="mdi-login"
            :loading="starting[s.siteId]"
            @click="startLogin(s)"
          >一鍵登入</v-btn>
          <v-btn
            v-if="!s.valid"
            size="small"
            variant="tonal"
            prepend-icon="mdi-content-paste"
            @click="pasteOpen[s.siteId] = !pasteOpen[s.siteId]"
          >手動貼 cookie</v-btn>
          <v-btn
            v-if="s.siteId === 'jimoty' && s.valid"
            size="small"
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

        <!-- 手動貼 cookie 面板 -->
        <v-expand-transition>
          <div v-if="pasteOpen[s.siteId] && !s.valid" class="mt-3 paste-panel">
            <div class="text-caption font-weight-medium mb-1">從你自己的 Chrome 抓 cookie 貼進來</div>
            <ol class="text-caption ps-4 mb-2">
              <li>用日常 Chrome 登入 <b>{{ s.label }}</b></li>
              <li>登入完，任意頁面按 <code>F12</code> 打開 DevTools</li>
              <li><b>Network</b> tab → 隨便點一個 request → 右邊 <b>Headers</b> → <b>Request Headers</b> → 找 <code>cookie:</code> 那行</li>
              <li>複製整行冒號後面的內容（<code>xxx=abc; yyy=def; ...</code>），貼下面</li>
            </ol>
            <v-textarea
              v-model="pasteBody[s.siteId]"
              placeholder="_jmty_session=abc123...; xxx=yyy; ..."
              variant="outlined"
              density="compact"
              rows="3"
              hide-details
              class="mono-input"
            />
            <div class="d-flex mt-2">
              <v-btn size="x-small" variant="text" @click="pasteOpen[s.siteId] = false">取消</v-btn>
              <v-spacer />
              <v-btn
                size="small"
                color="primary"
                :loading="pasting[s.siteId]"
                :disabled="!pasteBody[s.siteId]?.trim()"
                @click="submitPaste(s)"
              >送出並驗證</v-btn>
            </div>
          </div>
        </v-expand-transition>
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
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { api } from '../api.js';

const sites = ref([]);
const loading = ref(false);
const error = ref('');
const snackbar = ref(false);
const snackText = ref('');
const starting = reactive({});
const pasteOpen = reactive({});
const pasteBody = reactive({});
const pasting = reactive({});
let pollTimer = null;

async function submitPaste(site) {
  pasting[site.siteId] = true;
  try {
    const { data } = await api.post(`/auth/paste/${site.siteId}`, { cookie: pasteBody[site.siteId] });
    snackText.value = `${site.label} cookie 驗證成功（${data.data.cookies} 個 cookies）`;
    snackbar.value = true;
    pasteOpen[site.siteId] = false;
    pasteBody[site.siteId] = '';
    await load();
  } catch (err) {
    snackText.value = `失敗：${err.message || '驗證未通過'}`;
    snackbar.value = true;
  } finally { pasting[site.siteId] = false; }
}

// 觸發後端 spawn 登入 script
async function startLogin(site) {
  starting[site.siteId] = true;
  try {
    await api.post(`/auth/login/${site.siteId}`);
    snackText.value = `已開啟 ${site.label} 登入視窗。在該視窗完成登入後這頁會自動更新。`;
    snackbar.value = true;
    startPolling();
  } catch (err) {
    snackText.value = `啟動失敗：${err.message || err}`;
    snackbar.value = true;
    starting[site.siteId] = false;
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    await load();
    // 全部 site 都完成 login 就停 poll
    const stillWaiting = sites.value.some((s) => starting[s.siteId] && !s.valid);
    if (!stillWaiting) {
      clearInterval(pollTimer);
      pollTimer = null;
      // 清 starting flags
      for (const s of sites.value) if (s.valid) starting[s.siteId] = false;
    }
  }, 3000);
}

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});


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
.paste-panel {
  background: rgba(0, 0, 0, 0.03);
  padding: 10px;
  border-radius: 6px;
}
.mono-input :deep(textarea) {
  font-family: 'Menlo', monospace;
  font-size: 11px;
}
</style>
