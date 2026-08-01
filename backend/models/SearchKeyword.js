import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class SearchKeyword extends Model {
  get sitesArray() {
    return (this.sites || '').split(',').filter(Boolean);
  }
  setSitesArray(arr) {
    this.sites = Array.isArray(arr) ? arr.join(',') : '';
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
  },
  {
    sequelize,
    modelName: 'SearchKeyword',
    tableName: 'search_keywords',
    underscored: true,
    timestamps: true,
  }
);
