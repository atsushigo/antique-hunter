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
}

SearchKeyword.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    keyword: { type: DataTypes.STRING, allowNull: false },
    sites: { type: DataTypes.STRING, allowNull: false, defaultValue: 'yahoo_auction' },
    isActive: { type: DataTypes.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true },
    lastRunAt: { type: DataTypes.DATE, field: 'last_run_at' },
    lastError: { type: DataTypes.STRING, field: 'last_error' },
    excludeKeywords: { type: DataTypes.TEXT, field: 'exclude_keywords' },
  },
  {
    sequelize,
    modelName: 'SearchKeyword',
    tableName: 'search_keywords',
    underscored: true,
    timestamps: true,
  }
);
