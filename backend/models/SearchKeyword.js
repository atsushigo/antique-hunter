import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class SearchKeyword extends Model {
  get sitesArray() {
    return (this.sites || '').split(',').filter(Boolean);
  }
  setSitesArray(arr) {
    this.sites = Array.isArray(arr) ? arr.join(',') : '';
  }
  get excludeArray() {
    return (this.excludeKeywords || '').split(/[,、\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  // 檢查 title 是否含任一 exclude 詞
  isExcluded(title) {
    if (!title) return false;
    const excl = this.excludeArray;
    if (!excl.length) return false;
    return excl.some((w) => title.includes(w));
  }
  // 類別 positive filter — 依 categoryHint 判斷 listing 是否符合
  matchesCategory(listing) {
    if (!this.categoryHint) return true;
    if (this.categoryHint === 'car') {
      // Jimoty：URL 必須是 car category（/xxx/car-yyy/article-zzz）
      if (listing.site === 'jimoty' || listing.sourceUrl?.includes('jmty.jp')) {
        return /jmty\.jp\/[^\/]+\/car-/.test(listing.sourceUrl || '');
      }
      // Yahoo Auction：title 必須含車輛 positive marker
      return CAR_POSITIVE_MARKERS.test(listing.title || '');
    }
    if (this.categoryHint === 'antique') {
      // Jimoty：反過來排除 car-*（骨董應該在 sale-*）
      if (listing.site === 'jimoty' || listing.sourceUrl?.includes('jmty.jp')) {
        return !/jmty\.jp\/[^\/]+\/car-/.test(listing.sourceUrl || '');
      }
      return true;
    }
    return true;
  }
}

// 車輛 positive markers — 明確年份/里程/車検/交易術語才收
// 注意：H\d+ 之類太寬會誤 match chassis code（如「E-H56A」「H58A」パジェロミニ 型號）
// 年份必須跟「年」，Heisei/Reiwa 只 1-2 位數
const CAR_POSITIVE_MARKERS = /(\d+\s*万\s*km|\d+\s*万\s*キロ|\d+\s*キロ台|車検|年式|H\d{1,2}年|平成\d{1,2}年?|令和\d{1,2}年?|R\d{1,2}年|20\d\d年|支払.*総額|総額\s*\d+\s*万|走行\s*距離|4WD|CVT|MT車|AT車|5MT|6MT|オートローン|禁煙車|オールペン|走行\d+km)/i;

SearchKeyword.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    keyword: { type: DataTypes.STRING, allowNull: false },
    sites: { type: DataTypes.STRING, allowNull: false, defaultValue: 'yahoo_auction' },
    isActive: { type: DataTypes.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true },
    lastRunAt: { type: DataTypes.DATE, field: 'last_run_at' },
    lastError: { type: DataTypes.STRING, field: 'last_error' },
    excludeKeywords: { type: DataTypes.TEXT, field: 'exclude_keywords' },
    // 'car' | 'antique' | null(不限) — 啟用類別 positive filter
    categoryHint: { type: DataTypes.STRING(16), field: 'category_hint' },
  },
  {
    sequelize,
    modelName: 'SearchKeyword',
    tableName: 'search_keywords',
    underscored: true,
    timestamps: true,
  }
);
