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
