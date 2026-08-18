<template>
  <v-container class="px-3 pb-16">
    <div v-if="store.inbox.length" class="d-flex align-center mb-2">
      <v-spacer />
      <v-btn
        color="secondary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-inbox"
        @click="$router.push('/inbox')"
      >
        收件匣
        <v-chip size="x-small" color="error" variant="flat" class="ms-1">{{ store.inbox.length }}</v-chip>
      </v-btn>
    </div>

    <!-- 流程說明卡 -->
    <v-card variant="tonal" color="secondary" class="mb-3 flow-card" density="compact">
      <v-card-text class="pa-3">
        <div class="d-flex align-center text-caption">
          <v-icon size="18" class="me-2">mdi-information</v-icon>
          <div>
            <b>設個關鍵字</b> → 每天早上 <b>08:00</b> 自動查 Yahoo Auction + Jimoty →
            新上架商品進 <b>收件匣</b>，點卡片直接送 AI 估價
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 加關鍵字 dialog -->
    <v-dialog v-model="addDialog" max-width="480">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon class="me-2">mdi-plus-circle</v-icon>加新的追蹤條件
        </v-card-title>
        <v-card-text class="pt-2">
          <v-text-field
            v-model="newKw"
            label="關鍵字"
            placeholder="如：昭和 陶器、Rolex 不明、祖父の遺品"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="addKeyword"
          />
          <div class="mt-3">
            <div class="text-caption text-medium-emphasis mb-1">查哪些站：</div>
            <div class="d-flex align-center flex-wrap ga-2">
              <v-chip
                v-for="s in supportedSites"
                :key="s.id"
                size="small"
                :color="s.supported && newSites.includes(s.id) ? 'primary' : undefined"
                :variant="s.supported && newSites.includes(s.id) ? 'flat' : 'outlined'"
                :disabled="!s.supported"
                @click="onSiteChipClick(s)"
              >
                <v-icon v-if="!s.supported" size="14" start>mdi-lock</v-icon>
                <v-icon v-else-if="s.note" size="12" start>mdi-clock-outline</v-icon>
                {{ s.label }}
              </v-chip>
            </div>
            <div v-if="siteNotes.length" class="text-caption text-medium-emphasis mt-2">
              <div v-for="n in siteNotes" :key="n">⏱ {{ n }}</div>
            </div>
            <div v-if="disabledReason" class="text-caption text-warning mt-2">
              ⚠️ {{ disabledReason }}
            </div>
          </div>
          <div class="text-caption text-medium-emphasis mt-3">
            💡 撿漏詞：不明・詳細不明・祖父の遺品・昭和レトロ・まとめて
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="addDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!newKw || !newSites.length"
            :loading="adding"
            @click="addKeyword"
          >
            <v-icon start>mdi-plus</v-icon>加入並立即查
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" :timeout="4000" location="top">
      {{ snackText }}
      <template v-if="lastRunSummary" #actions>
        <v-btn variant="text" @click="$router.push('/inbox'); snackbar = false">看收件匣</v-btn>
      </template>
    </v-snackbar>

    <v-progress-linear v-if="store.loading" indeterminate color="primary" height="2" class="mb-2" />

    <!-- 清單 -->
    <div v-if="!store.list.length && !store.loading" class="text-center pa-8">
      <v-icon size="48" color="grey">mdi-magnify</v-icon>
      <div class="text-body-2 mt-2 text-medium-emphasis">還沒有追蹤條件</div>
      <v-btn class="mt-3" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openAddDialog">
        加第一個關鍵字
      </v-btn>
    </div>

    <div class="text-caption text-medium-emphasis mb-1" v-if="store.list.length">
      追蹤中 {{ store.list.length }} 個關鍵字
    </div>

    <v-card
      v-for="kw in store.list"
      :key="kw.id"
      variant="outlined"
      class="mb-2"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center mb-1">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">🔍 {{ kw.keyword }}</div>
          <v-switch
            :model-value="kw.isActive"
            hide-details
            density="compact"
            color="primary"
            @update:model-value="toggleActive(kw)"
          />
        </div>
        <div class="d-flex flex-wrap align-center ga-1 mb-1">
          <v-chip
            v-for="s in kw.sites"
            :key="s"
            size="x-small"
            variant="tonal"
          >{{ siteLabel(s) }}</v-chip>
          <v-menu>
            <template #activator="{ props }">
              <v-chip
                v-bind="props"
                size="x-small"
                :color="kw.categoryHint ? 'secondary' : undefined"
                :variant="kw.categoryHint ? 'flat' : 'outlined'"
                append-icon="mdi-menu-down"
              >{{ categoryLabel(kw.categoryHint) }}</v-chip>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="c in CATEGORIES"
                :key="c.id || 'none'"
                @click="setCategory(kw, c.id)"
              >
                <v-list-item-title>{{ c.label }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ c.hint }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
        <div class="text-caption text-medium-emphasis">
          <span v-if="kw.lastRunAt">上次跑 {{ formatDate(kw.lastRunAt) }}</span>
          <span v-else>還沒跑過</span>
          <span v-if="kw.lastError" class="text-error ms-2">· {{ kw.lastError }}</span>
        </div>
        <div class="d-flex ga-2 mt-2">
          <v-btn
            size="x-small"
            variant="tonal"
            :loading="running.has(kw.id)"
            prepend-icon="mdi-play"
            @click="runNow(kw)"
          >馬上跑一次</v-btn>
          <v-btn
            size="x-small"
            variant="text"
            prepend-icon="mdi-filter-minus"
            @click="excludeOpen[kw.id] = !excludeOpen[kw.id]; excludeDraft[kw.id] = kw.excludeKeywords"
          >排除詞 ({{ (kw.excludeKeywords || '').split(/[,、\s]+/).filter(Boolean).length }})</v-btn>
          <v-spacer />
          <v-btn size="x-small" variant="text" color="error" @click="remove(kw)">刪除</v-btn>
        </div>

        <v-expand-transition>
          <div v-if="excludeOpen[kw.id]" class="mt-3">
            <div class="text-caption text-medium-emphasis mb-1">
              Title 含以下任一詞的 listing 會被跳過（空白或逗號分隔）：
            </div>
            <v-textarea
              v-model="excludeDraft[kw.id]"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
              placeholder="例：カタログ トミカ ミニカー 純正 部品 タイヤ ホイール"
              hide-details
            />
            <div class="d-flex mt-2 ga-2">
              <v-btn size="x-small" variant="text" @click="excludeOpen[kw.id] = false">取消</v-btn>
              <v-spacer />
              <v-btn size="x-small" variant="tonal" @click="applyCarDefaults(kw)">套用「車輛」預設</v-btn>
              <v-btn size="small" color="primary" @click="saveExclude(kw)">存</v-btn>
            </div>
          </div>
        </v-expand-transition>
      </v-card-text>
    </v-card>

    <!-- FAB 加關鍵字（列表非空時才顯示，空狀態已有 CTA button）-->
    <v-btn
      v-if="store.list.length"
      icon="mdi-plus"
      color="primary"
      size="large"
      class="fab-add"
      elevation="4"
      @click="openAddDialog"
    />
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useKeywordsStore } from '../stores/keywords.js';

const store = useKeywordsStore();
const newKw = ref('');
const newSites = ref(['yahoo_auction', 'jimoty']);
const running = reactive(new Set());
const adding = ref(false);
const addDialog = ref(false);
const excludeOpen = reactive({});
const excludeDraft = reactive({});

function openAddDialog() {
  newKw.value = '';
  newSites.value = ['yahoo_auction', 'jimoty'];
  disabledReason.value = '';
  addDialog.value = true;
}

const CATEGORIES = [
  { id: null, label: '類別：不限', hint: '不做類別過濾' },
  { id: 'car', label: '類別：車輛', hint: 'Jimoty 只吃 /car-*；Yahoo Auction 需含 車検/万km/年式 等' },
  { id: 'antique', label: '類別：物件', hint: 'Jimoty 排除 /car-* 分類' },
];

function categoryLabel(c) {
  const item = CATEGORIES.find((x) => x.id === c);
  return item ? item.label : '類別：不限';
}

async function setCategory(kw, categoryHint) {
  await store.update(kw.id, { categoryHint });
  snackText.value = `「${kw.keyword}」類別已設為 ${categoryLabel(categoryHint)}`;
  snackColor.value = 'success';
  snackbar.value = true;
}

const CAR_DEFAULTS = [
  // 基本零件
  'カタログ トミカ ミニカー プラモ フィギュア',
  'スピーカー ラジエーター ホイール タイヤ シート ガスケット',
  'コントロールユニット マニホールド バンパー ミラー パネル ドア ライト',
  'マフラー ブレーキ クラッチ オイル',
  // 額外零件/雜物
  'グリル フロントグリル ラジエータグリル グリルマーカー',
  'スパーク プラグ センサー コイル バルブ ポンプ フィルター バッテリー',
  'エンブレム ロゴ ワッペン ステッカー フィルム',
  'ハーネス ワイヤー ケーブル モール カバー ワイパー フォグ',
  '部品 純正 中古品 サービスマニュアル 訳あり ジャンク パーツ 部品取り',
  '空気入れ 電動ポンプ リアゲート ダッシュ ヒーター ブロアモーター',
  // 非車類（Rolex Explorer 手錶、Gibson Explorer 吉他等）
  '腕時計 時計 ケース カフス ペンダント 封筒 冊子 カード',
  'ギター エレキ Epiphone Gibson Fender エレキギター',
  'INTEX GLOBBER トライク QUARTORIGO マイク ミキサー アンプ ピック 弦',
].join(' ');

async function saveExclude(kw) {
  await store.update(kw.id, { excludeKeywords: excludeDraft[kw.id] || '' });
  excludeOpen[kw.id] = false;
  snackText.value = `「${kw.keyword}」排除詞已更新`;
  snackColor.value = 'success';
  snackbar.value = true;
}

function applyCarDefaults(kw) {
  excludeDraft[kw.id] = CAR_DEFAULTS;
}
const snackbar = ref(false);
const snackText = ref('');
const snackColor = ref('success');
const lastRunSummary = ref(null);

const supportedSites = computed(() => store.supportedSites);
const disabledReason = ref('');
const siteNotes = computed(() =>
  supportedSites.value
    .filter((s) => s.supported && s.note && newSites.value.includes(s.id))
    .map((s) => `${s.label}：${s.note}`)
);

function siteLabel(id) {
  return supportedSites.value.find((s) => s.id === id)?.label || id;
}
function onSiteChipClick(s) {
  if (!s.supported) {
    disabledReason.value = `${s.label}：${s.reason}`;
    return;
  }
  disabledReason.value = '';
  const i = newSites.value.indexOf(s.id);
  if (i === -1) newSites.value.push(s.id);
  else newSites.value.splice(i, 1);
}

// 加入 → 自動跑一次 → snackbar 顯示結果
async function addKeyword() {
  if (!newKw.value.trim() || !newSites.value.length) return;
  adding.value = true;
  try {
    const kw = await store.create({ keyword: newKw.value.trim(), sites: newSites.value });
    newKw.value = '';
    addDialog.value = false;
    // auto-run
    const summary = await store.run(kw.id);
    lastRunSummary.value = summary;
    snackText.value = `「${kw.keyword}」跑完了：抓到 ${summary.newTotal} 件新上架`;
    snackColor.value = summary.newTotal > 0 ? 'success' : 'info';
    snackbar.value = true;
  } catch (err) {
    snackText.value = `失敗：${err.message || err}`;
    snackColor.value = 'error';
    snackbar.value = true;
  } finally {
    adding.value = false;
  }
}
async function toggleActive(kw) {
  await store.update(kw.id, { isActive: !kw.isActive });
}
async function runNow(kw) {
  running.add(kw.id);
  try {
    const summary = await store.run(kw.id);
    lastRunSummary.value = summary;
    snackText.value = `「${kw.keyword}」抓到 ${summary.newTotal} 件新上架`;
    snackColor.value = summary.newTotal > 0 ? 'success' : 'info';
    snackbar.value = true;
  } finally { running.delete(kw.id); }
}
async function remove(kw) {
  if (!confirm(`刪除「${kw.keyword}」？（相關 listing 也會刪除）`)) return;
  await store.remove(kw.id);
}
function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return '剛剛';
  if (diff < 60) return `${diff} 分前`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} 小時前`;
  return `${Math.floor(diff / 60 / 24)} 天前`;
}

onMounted(() => {
  store.fetchAll();
  store.fetchInbox({ days: 7 }).catch(() => {});
});
</script>

<style scoped>
.flow-card { border-left: 3px solid rgb(var(--v-theme-secondary)); }
.fab-add {
  position: fixed;
  right: 16px;
  bottom: 72px; /* 避開 BottomNav */
  z-index: 5;
}
</style>
