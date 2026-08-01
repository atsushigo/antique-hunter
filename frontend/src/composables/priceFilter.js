// 價格 filter + sort 邏輯共用 — 給 Inbox / Search / History 用
import { computed } from 'vue';

export const PRICE_BUCKETS = [
  { id: 'all', label: '全部' },
  { id: 'free', label: '🆓 免費' },
  { id: '1k', label: '¥1k 內', max: 1000 },
  { id: '3k', label: '¥3k 內', max: 3000 },
  { id: '10k', label: '¥1 萬內', max: 10000 },
  { id: '30k', label: '¥3 萬內', max: 30000 },
];

export const SORT_OPTIONS = [
  { id: 'new', label: '新↓', icon: 'mdi-clock-outline' },
  { id: 'cheap', label: '便宜↑', icon: 'mdi-arrow-up' },
  { id: 'expensive', label: '貴↓', icon: 'mdi-arrow-down' },
];

export function passPrice(price, bucket) {
  if (bucket === 'all') return true;
  if (bucket === 'free') return price === 0;
  const b = PRICE_BUCKETS.find((x) => x.id === bucket);
  if (!b?.max) return true;
  if (price == null) return false;
  return price >= 0 && price <= b.max;
}

// list: [{ priceJpy, priceLabel, firstSeenAt? / createdAt?, ... }]
export function useFilteredSorted(list, priceRef, sortRef, timeField = 'firstSeenAt') {
  return computed(() => {
    const filtered = list.value.filter((it) => passPrice(it.priceJpy, priceRef.value));
    const sorted = [...filtered];
    if (sortRef.value === 'cheap') {
      sorted.sort((a, b) => (a.priceJpy ?? Infinity) - (b.priceJpy ?? Infinity));
    } else if (sortRef.value === 'expensive') {
      sorted.sort((a, b) => (b.priceJpy ?? -Infinity) - (a.priceJpy ?? -Infinity));
    } else {
      // new (依 timeField desc)
      sorted.sort((a, b) => new Date(b[timeField] || 0) - new Date(a[timeField] || 0));
    }
    return sorted;
  });
}
