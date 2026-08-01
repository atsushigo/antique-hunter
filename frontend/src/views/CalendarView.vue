<template>
  <v-container class="px-2 pt-2 pb-16 cal-root">
    <!-- 月切換 header -->
    <div class="d-flex align-center mb-3 px-1">
      <v-btn icon="mdi-chevron-left" size="small" variant="text" @click="shiftMonth(-1)" />
      <div class="month-title mx-1">
        <span class="year">{{ year }}</span>
        <span class="month">{{ month + 1 }} 月</span>
      </div>
      <v-btn icon="mdi-chevron-right" size="small" variant="text" @click="shiftMonth(1)" />
      <v-btn size="x-small" variant="tonal" color="primary" class="ms-2" @click="goToday">今日</v-btn>
      <v-spacer />
      <v-btn-toggle v-model="mode" mandatory density="compact" color="primary" variant="outlined">
        <v-btn value="month" size="x-small" icon="mdi-calendar-month" />
        <v-btn value="agenda" size="x-small" icon="mdi-view-list" />
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="store.loading" indeterminate color="primary" class="mb-2" rounded height="2" />
    <v-alert v-if="store.error" type="error" density="compact" class="mb-2">
      {{ store.error }}
    </v-alert>

    <!-- === 月曆格子 === -->
    <template v-if="mode === 'month'">
      <!-- 週標 -->
      <div class="cal-grid weekday-row">
        <div
          v-for="(w, i) in WEEKDAYS"
          :key="w"
          class="weekday-cell"
          :class="{ sun: i === 0, sat: i === 6 }"
        >{{ w }}</div>
      </div>

      <!-- 日期格 -->
      <div class="cal-grid grid-body">
        <div
          v-for="cell in cells"
          :key="cell.iso"
          class="day-cell"
          :class="{
            'other-month': !cell.inMonth,
            today: cell.isToday,
            selected: cell.iso === selectedISO,
            'has-events': cell.events.length > 0,
          }"
          @click="selectedISO = cell.iso"
        >
          <div class="date-row">
            <span class="date-num" :class="{ sun: cell.dow === 0, sat: cell.dow === 6 }">
              {{ cell.day }}
            </span>
          </div>
          <div class="chips">
            <div
              v-for="ev in cell.events.slice(0, 3)"
              :key="ev.id"
              class="chip"
              :style="{
                '--chip-color': areaColor(ev.market.location),
                '--chip-bg': areaColorSoft(ev.market.location),
              }"
              :title="ev.market.name"
            >{{ shortName(ev.market.name) }}</div>
            <div v-if="cell.events.length > 3" class="more">+{{ cell.events.length - 3 }}</div>
          </div>
        </div>
      </div>

      <!-- 顏色圖例 -->
      <div class="legend d-flex flex-wrap ga-3 mt-3 px-1">
        <span v-for="(c, area) in AREA_COLORS" :key="area" class="d-flex align-center">
          <span class="legend-dot" :style="{ background: c }" />
          <span class="text-caption">{{ area }}</span>
        </span>
      </div>

      <!-- 選中日詳情 -->
      <v-card
        v-if="selectedEvents.length"
        class="mt-4 selected-panel"
        elevation="1"
        rounded="lg"
      >
        <div class="d-flex align-center pa-3 selected-header">
          <div class="date-block me-3">
            <div class="text-h5 font-weight-bold">{{ dayNum(selectedISO) }}</div>
            <div class="text-caption">{{ monthLabel(selectedISO) }}</div>
          </div>
          <div>
            <div class="text-body-2 font-weight-medium">{{ weekdayLabel(selectedISO) }}</div>
            <div class="text-caption text-medium-emphasis">{{ relativeLabel(selectedISO) }} · {{ selectedEvents.length }} 場</div>
          </div>
        </div>
        <v-divider />
        <div
          v-for="ev in selectedEvents"
          :key="ev.id"
          class="pa-3 event-row"
          :style="{ '--row-color': areaColor(ev.market.location) }"
        >
          <div class="d-flex align-center">
            <div class="text-subtitle-2 font-weight-medium">{{ ev.market.name }}</div>
            <v-spacer />
            <div v-if="ev.market.timeRange" class="text-caption text-medium-emphasis">
              {{ ev.market.timeRange }}
            </div>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            <v-icon size="14" class="me-1">mdi-map-marker</v-icon>{{ ev.market.location }}
            <span v-if="ev.market.driveTimeMin != null" class="ms-2">
              <v-icon size="14" class="me-1">mdi-car</v-icon>{{ ev.market.driveTimeMin }} 分
              <span v-if="ev.market.tollYen != null">· ¥{{ ev.market.tollYen.toLocaleString() }}</span>
            </span>
          </div>
          <div v-if="ev.market.scale" class="text-caption text-medium-emphasis mt-1">
            <v-icon size="14" class="me-1">mdi-storefront</v-icon>{{ ev.market.scale }}
          </div>
          <div v-if="ev.market.theme" class="text-caption mt-1">{{ ev.market.theme }}</div>
          <div v-if="ev.market.notes" class="text-caption text-medium-emphasis mt-1">
            <v-icon size="14" class="me-1">mdi-lightbulb-outline</v-icon>{{ ev.market.notes }}
          </div>
        </div>
      </v-card>
      <div v-else-if="!store.loading" class="text-caption text-medium-emphasis text-center pa-6">
        {{ selectedISO }} 沒有活動
      </div>
    </template>

    <!-- === Agenda 列表 === -->
    <template v-else>
      <div v-for="date in store.sortedDates" :key="date" class="mb-3">
        <div class="d-flex align-center mb-2 date-header">
          <div class="date-block me-3">
            <div class="text-h6 font-weight-bold">{{ dayNum(date) }}</div>
            <div class="text-caption">{{ monthLabel(date) }}</div>
          </div>
          <div>
            <div class="text-body-2 font-weight-medium">{{ weekdayLabel(date) }}</div>
            <div class="text-caption text-medium-emphasis">{{ relativeLabel(date) }}</div>
          </div>
        </div>
        <v-card
          v-for="ev in store.grouped[date]"
          :key="ev.id"
          variant="outlined"
          class="mb-2 agenda-card"
          :style="{ borderLeftColor: areaColor(ev.market.location) }"
        >
          <v-card-text class="pa-3">
            <div class="text-subtitle-2 font-weight-medium">{{ ev.market.name }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              <v-icon size="14" class="me-1">mdi-map-marker</v-icon>{{ ev.market.location }}
              <span v-if="ev.market.timeRange" class="ms-2">
                <v-icon size="14" class="me-1">mdi-clock-outline</v-icon>{{ ev.market.timeRange }}
              </span>
            </div>
            <div v-if="ev.market.theme" class="text-caption mt-1">{{ ev.market.theme }}</div>
          </v-card-text>
        </v-card>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useEventsStore } from '../stores/events.js';

const store = useEventsStore();
const mode = ref('month');

const today = new Date();
today.setHours(0, 0, 0, 0);
const cursor = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedISO = ref(toISO(today));

const year = computed(() => cursor.value.getFullYear());
const month = computed(() => cursor.value.getMonth());

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function loadRange() {
  const first = new Date(year.value, month.value, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 41);
  await store.fetch({ from: toISO(start), to: toISO(end), force: true }).catch(() => {});
}
function shiftMonth(delta) {
  cursor.value = new Date(year.value, month.value + delta, 1);
}
function goToday() {
  cursor.value = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedISO.value = toISO(today);
}

onMounted(loadRange);
watch(cursor, loadRange);

const cells = computed(() => {
  const first = new Date(year.value, month.value, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const arr = [];
  const dayMap = store.grouped;
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISO(d);
    arr.push({
      iso,
      day: d.getDate(),
      dow: d.getDay(),
      inMonth: d.getMonth() === month.value,
      isToday: iso === toISO(today),
      events: dayMap[iso] || [],
    });
  }
  return arr;
});

const selectedEvents = computed(() => store.grouped[selectedISO.value] || []);

// 和風配色（比 Google 的原色柔和）
const AREA_COLORS = {
  大阪: '#B84C3E', // 弁柄（べんがら，日式紅褐）
  京都: '#6B4E71', // 京紫
  兵庫: '#3B5F7A', // 藍鼠
  奈良: '#5A7A48', // 若竹
};
const AREA_COLORS_SOFT = {
  大阪: 'rgba(184, 76, 62, 0.10)',
  京都: 'rgba(107, 78, 113, 0.10)',
  兵庫: 'rgba(59, 95, 122, 0.10)',
  奈良: 'rgba(90, 122, 72, 0.10)',
};
function areaColor(location) {
  for (const [area, color] of Object.entries(AREA_COLORS)) {
    if (location?.startsWith(area)) return color;
  }
  return '#795548';
}
function areaColorSoft(location) {
  for (const [area, color] of Object.entries(AREA_COLORS_SOFT)) {
    if (location?.startsWith(area)) return color;
  }
  return 'rgba(121, 85, 72, 0.10)';
}

const SHORT_NAME = {
  '四天王寺骨董市': '四天王',
  '東寺弘法市': '弘法',
  '北野天満宮 天神市': '天神',
  '平安蚤の市': '平安',
  '百万遍さんの手づくり市': '百万遍',
  '上賀茂神社 手づくり市': '上賀茂',
  '西宮えびす神社骨董市': '西宮',
  '高砂鹿嶋骨董市': '高砂',
  '東寺がらくた市': '東寺',
  '四天会蚤の市': '四天会',
  '十三市': '十三',
  '万博蚤の市': '万博',
  '関西蚤の市': '関西',
  '天神さんの古本まつり': '古本',
  '奈良 蚤の市': '奈良',
};
function shortName(name) {
  return SHORT_NAME[name] || name.slice(0, 2);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
function dayNum(iso) { return parseDate(iso).getDate(); }
function monthLabel(iso) { return `${parseDate(iso).getMonth() + 1} 月`; }
function weekdayLabel(iso) { return `週${WEEKDAYS[parseDate(iso).getDay()]}`; }
function relativeLabel(iso) {
  const diff = Math.round((parseDate(iso) - today) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === -1) return '昨天';
  if (diff > 0 && diff < 7) return `${diff} 天後`;
  if (diff > 0 && diff < 30) return `${Math.floor(diff / 7)} 週後`;
  if (diff > 0) return `${Math.floor(diff / 30)} 個月後`;
  return `${Math.abs(diff)} 天前`;
}
</script>

<style scoped>
.cal-root {
  color: #3E2723;
}
.month-title {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.month-title .year {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  letter-spacing: 0.5px;
}
.month-title .month {
  font-size: 20px;
  font-weight: 600;
  color: #3E2723;
  letter-spacing: 0.5px;
}

/* Grid */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
}
.grid-body {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
}
.weekday-row {
  margin-bottom: 2px;
}
.weekday-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  padding: 6px 0 4px;
  letter-spacing: 1px;
}
.weekday-cell.sun { color: #B84C3E; }
.weekday-cell.sat { color: #3B5F7A; }

/* Day cells */
.day-cell {
  min-height: 66px;
  padding: 4px 3px 3px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: background 0.15s;
  overflow: hidden;
  position: relative;
  background: #FDFBF7;
}
.day-cell:active {
  background: rgba(121, 85, 72, 0.06);
}
.day-cell.other-month {
  background: #F5F1EA;
}
.day-cell.other-month .date-num,
.day-cell.other-month .chip {
  opacity: 0.4;
}
.day-cell.selected {
  background: #F5EDDF;
  box-shadow: inset 0 0 0 2px #795548;
  z-index: 1;
}
.day-cell.has-events:not(.selected) {
  background: #FBF7EF;
}

.date-row {
  display: flex;
  justify-content: flex-end;
  min-height: 18px;
}
.date-num {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.72);
  padding: 0 2px;
  line-height: 1.5;
}
.date-num.sun { color: #B84C3E; }
.date-num.sat { color: #3B5F7A; }

.today .date-num {
  background: #795548;
  color: white;
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
  padding: 0;
  height: 18px;
  line-height: 18px;
  display: inline-block;
  font-weight: 600;
}

/* Event chips */
.chips {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chip {
  font-size: 9.5px;
  line-height: 1.4;
  color: var(--chip-color);
  background: var(--chip-bg);
  border-left: 2px solid var(--chip-color);
  padding: 1px 3px 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.more {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.5);
  padding: 0 3px;
  font-weight: 500;
}

/* Legend */
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 5px;
}

/* Selected panel */
.selected-panel {
  background: #FDFBF7 !important;
  border: 1px solid rgba(121, 85, 72, 0.15) !important;
}
.selected-header {
  background: linear-gradient(90deg, rgba(121, 85, 72, 0.06), transparent);
}
.date-block {
  min-width: 44px;
  text-align: center;
  line-height: 1;
  color: #3E2723;
}
.event-row {
  border-left: 3px solid var(--row-color);
  margin: 0;
}
.event-row + .event-row {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* Agenda mode */
.date-header {
  border-bottom: 2px solid #795548;
  padding-bottom: 4px;
}
.agenda-card {
  border-left-width: 3px !important;
}
</style>
