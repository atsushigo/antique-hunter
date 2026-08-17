import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
    meta: { title: '古董獵人' },
  },
  {
    path: '/markets',
    name: 'markets',
    component: () => import('./views/MarketsView.vue'),
    meta: { title: '市集情報' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('./views/CalendarView.vue'),
    meta: { title: '市集日曆' },
  },
  {
    path: '/url',
    name: 'url',
    component: () => import('./views/UrlAppraisalView.vue'),
    meta: { title: 'URL 估價' },
  },
  {
    path: '/collection',
    name: 'collection',
    component: () => import('./views/CollectionView.vue'),
    meta: { title: '收藏' },
  },
  {
    path: '/keywords',
    name: 'keywords',
    component: () => import('./views/KeywordsView.vue'),
    meta: { title: '追蹤關鍵字' },
  },
  {
    path: '/inbox',
    name: 'inbox',
    component: () => import('./views/InboxView.vue'),
    meta: { title: '收件匣' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('./views/SearchView.vue'),
    meta: { title: '即時搜尋' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('./views/HistoryView.vue'),
    meta: { title: '鑑定歷史' },
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('./views/AccountsView.vue'),
    meta: { title: '帳號連接' },
  },
  {
    path: '/jimoty',
    name: 'jimoty',
    component: () => import('./views/JimotyView.vue'),
    meta: { title: '我的 Jimoty' },
  },
  {
    path: '/gov-auctions',
    name: 'gov-auctions',
    component: () => import('./views/GovAuctionsView.vue'),
    meta: { title: '官公庁拍賣' },
  },
  {
    path: '/gov-auctions/guide',
    name: 'gov-auctions-guide',
    component: () => import('./views/GovAuctionsGuideView.vue'),
    meta: { title: '官公庁拍賣手冊' },
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('./views/KnowledgeView.vue'),
    meta: { title: '知識庫' },
  },
  {
    path: '/camera',
    name: 'camera',
    component: () => import('./views/CameraView.vue'),
    meta: { title: '拍照鑑定' },
  },
  {
    path: '/result/:localId',
    name: 'result',
    component: () => import('./views/ResultView.vue'),
    meta: { title: '鑑定結果' },
    props: true,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  if (to.meta?.title) document.title = to.meta.title;
});
