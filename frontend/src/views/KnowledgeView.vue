<template>
  <v-container class="px-3 pb-16">
    <div class="d-flex align-center mb-2">
      <div class="text-h6">知識庫</div>
      <v-btn size="x-small" variant="text" icon="mdi-refresh" :loading="loading" class="ms-1" @click="load" />
      <v-spacer />
      <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openEditor()">新增</v-btn>
    </div>

    <v-card variant="tonal" color="secondary" class="mb-3">
      <v-card-text class="pa-3 text-caption">
        記錄拍賣觀察 + 我估價 + 實際成交價，累積為以後判斷的參考。
        <span v-if="stats && stats.accuracy" class="ms-2">
          <b>估價命中率：{{ stats.accuracy.pct }}%</b>（{{ stats.accuracy.hits }}/{{ stats.accuracy.total }}）
        </span>
      </v-card-text>
    </v-card>

    <div class="d-flex align-center flex-wrap ga-1 mb-2">
      <v-text-field
        v-model="search"
        placeholder="搜尋 title / notes / tags..."
        variant="outlined"
        density="compact"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        style="max-width: 260px"
        @keyup.enter="load"
        @click:clear="load"
      />
      <v-chip
        size="small"
        :color="!filterCategory ? 'primary' : undefined"
        :variant="!filterCategory ? 'flat' : 'outlined'"
        @click="filterCategory = ''; load()"
      >全部</v-chip>
      <v-chip
        v-for="(n, c) in stats?.byCategory || {}"
        :key="c"
        size="small"
        :color="filterCategory === c ? 'primary' : undefined"
        :variant="filterCategory === c ? 'flat' : 'outlined'"
        @click="filterCategory = c; load()"
      >{{ c }} {{ n }}</v-chip>
      <v-spacer />
      <v-btn-toggle v-model="filterSettled" mandatory density="compact" color="primary" variant="outlined">
        <v-btn value="" size="x-small">全部</v-btn>
        <v-btn value="0" size="x-small">觀察中</v-btn>
        <v-btn value="1" size="x-small">已成交</v-btn>
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="loading" indeterminate height="2" color="primary" class="mb-2" />

    <div v-if="!loading && !entries.length" class="text-center pa-8 text-caption text-medium-emphasis">
      還沒有筆記。可從 <a @click="$router.push('/gov-auctions')" style="cursor:pointer;color:#795548">官公庁拍賣</a> 觀察後新增。
    </div>

    <v-card
      v-for="e in entries"
      :key="e.id"
      variant="outlined"
      class="mb-2 entry"
      @click="openEditor(e)"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center mb-1">
          <div class="text-subtitle-2 font-weight-medium flex-grow-1">{{ e.title }}</div>
          <v-chip v-if="e.category" size="x-small" variant="tonal" class="ms-1">{{ e.category }}</v-chip>
          <v-chip v-if="e.sourceSite" size="x-small" variant="tonal" color="primary" class="ms-1">{{ e.sourceSite }}</v-chip>
        </div>
        <div class="text-caption mt-1 d-flex flex-wrap ga-3">
          <span v-if="e.listingPriceJpy">起 ¥{{ e.listingPriceJpy.toLocaleString() }}</span>
          <span v-if="e.myAppraisalLowJpy" class="me-1">
            我估 ¥{{ e.myAppraisalLowJpy.toLocaleString() }}~¥{{ e.myAppraisalHighJpy?.toLocaleString() }}
          </span>
          <span v-if="e.winningPriceJpy" :class="verdictClass(e)">
            <b>成交 ¥{{ e.winningPriceJpy.toLocaleString() }}</b>
            <span v-if="e.appraisalDelta"> ({{ appraisalHint(e) }})</span>
          </span>
          <span v-else class="text-medium-emphasis">未成交</span>
          <span v-if="e.didIBid" class="ms-2">🎯 我有出價</span>
        </div>
        <div v-if="e.notes" class="text-caption text-medium-emphasis mt-1 notes">{{ e.notes }}</div>
        <div v-if="e.tags?.length" class="d-flex ga-1 mt-1">
          <v-chip v-for="t in e.tags" :key="t" size="x-small" variant="text">#{{ t }}</v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Editor Dialog -->
    <v-dialog v-model="editorOpen" max-width="640">
      <v-card v-if="draft">
        <v-card-title>{{ draft.id ? '編輯' : '新增' }}筆記</v-card-title>
        <v-card-text class="pa-3">
          <!-- Section: 基本 -->
          <div class="section-label">📝 基本</div>
          <v-text-field v-model="draft.title" label="Title *" variant="outlined" density="compact" required />
          <div class="d-flex ga-2">
            <v-select v-model="draft.category" :items="CATEGORIES" label="類別" variant="outlined" density="compact" clearable style="max-width: 180px" />
            <v-select v-model="draft.sourceSite" :items="SITES" label="來源站別" variant="outlined" density="compact" clearable style="max-width: 180px" />
          </div>
          <v-text-field v-model="draft.sourceUrl" label="來源 URL" variant="outlined" density="compact" clearable />

          <v-divider class="my-3" />

          <!-- Section: 價格 -->
          <div class="section-label">💰 價格</div>
          <div class="d-flex ga-2">
            <v-text-field v-model.number="draft.listingPriceJpy" label="起標/掛牌價" type="number" variant="outlined" density="compact" />
            <v-text-field v-model.number="draft.myAppraisalLowJpy" label="我估最低" type="number" variant="outlined" density="compact" />
            <v-text-field v-model.number="draft.myAppraisalHighJpy" label="我估最高" type="number" variant="outlined" density="compact" />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-text-field v-model.number="draft.winningPriceJpy" label="實際成交價（拍完再填）" type="number" variant="outlined" density="compact" />
            <v-checkbox v-model="draft.didIBid" label="我有出價" hide-details density="compact" />
          </div>

          <v-divider class="my-3" />

          <!-- Section: 標記 & 筆記 -->
          <div class="section-label">🏷 標記 & 筆記</div>
          <v-text-field v-model="draft.tagsStr" label="Tags（逗號分隔）" placeholder="パジェロ,V4,4WD" variant="outlined" density="compact" />
          <v-textarea v-model="draft.notes" label="筆記" variant="outlined" density="compact" rows="3" auto-grow />
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="draft.id" color="error" variant="text" @click="onDelete">刪除</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="editorOpen = false">取消</v-btn>
          <v-btn color="primary" :disabled="!draft.title" @click="onSave">存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000">{{ snackText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const CATEGORIES = ['car', 'bike', 'antique', 'general', 'real-estate', 'other'];
const SITES = ['kankocho', 'yahoo_auction', 'jimoty', 'mercari', 'rakuma'];

const entries = ref([]);
const stats = ref(null);
const loading = ref(false);
const search = ref('');
const filterCategory = ref('');
const filterSettled = ref('');

const editorOpen = ref(false);
const draft = ref(null);
const snackbar = ref(false);
const snackText = ref('');

async function load() {
  loading.value = true;
  try {
    const params = {};
    if (search.value) params.search = search.value;
    if (filterCategory.value) params.category = filterCategory.value;
    if (filterSettled.value) params.settled = filterSettled.value;
    const { data } = await api.get('/knowledge', { params });
    entries.value = data.data;
    stats.value = data.stats;
  } finally { loading.value = false; }
}

function openEditor(entry = null) {
  draft.value = entry
    ? { ...entry, tagsStr: (entry.tags || []).join(', ') }
    : { title: '', category: '', sourceSite: '', sourceUrl: '', tagsStr: '', didIBid: false };
  editorOpen.value = true;
}

async function onSave() {
  const body = { ...draft.value, tags: draft.value.tagsStr };
  delete body.tagsStr;
  delete body.appraisalDelta;
  try {
    if (body.id) await api.patch(`/knowledge/${body.id}`, body);
    else await api.post('/knowledge', body);
    editorOpen.value = false;
    snackText.value = '已存';
    snackbar.value = true;
    await load();
  } catch (err) {
    snackText.value = err.message || '失敗';
    snackbar.value = true;
  }
}

async function onDelete() {
  if (!confirm(`刪除「${draft.value.title}」？`)) return;
  await api.delete(`/knowledge/${draft.value.id}`);
  editorOpen.value = false;
  await load();
}

function verdictClass(e) {
  if (!e.appraisalDelta) return '';
  const { winningVsLowPct, winningVsHighPct } = e.appraisalDelta;
  if (winningVsLowPct >= 0 && winningVsHighPct <= 0) return 'text-success'; // 落在區間
  if (winningVsHighPct > 0) return 'text-warning'; // 高於估價
  return 'text-error'; // 低於估價（我估太高了）
}

function appraisalHint(e) {
  if (!e.appraisalDelta) return '';
  const { winningVsLowPct, winningVsHighPct } = e.appraisalDelta;
  if (winningVsLowPct >= 0 && winningVsHighPct <= 0) return '命中我估';
  if (winningVsHighPct > 0) return `比我估上限高 ${winningVsHighPct}%`;
  return `比我估下限低 ${Math.abs(winningVsLowPct)}%`;
}

onMounted(load);
</script>

<style scoped>
.entry { cursor: pointer; }
.notes {
  white-space: pre-wrap;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  margin-top: 4px;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #5D4037;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
</style>
