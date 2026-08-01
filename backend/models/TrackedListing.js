import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';
import { SearchKeyword } from './SearchKeyword.js';

export class TrackedListing extends Model {}

TrackedListing.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    keywordId: { type: DataTypes.INTEGER, field: 'keyword_id', allowNull: false },
    site: { type: DataTypes.STRING(32), allowNull: false },
    sourceUrl: { type: DataTypes.STRING, field: 'source_url', allowNull: false },
    imageUrl: { type: DataTypes.STRING, field: 'image_url' },
    title: { type: DataTypes.STRING },
    priceJpy: { type: DataTypes.INTEGER, field: 'price_jpy' },
    priceLabel: { type: DataTypes.STRING(32), field: 'price_label' },
    firstSeenAt: { type: DataTypes.DATE, field: 'first_seen_at', allowNull: false },
    isDismissed: { type: DataTypes.BOOLEAN, field: 'is_dismissed', allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'TrackedListing',
    tableName: 'tracked_listings',
    underscored: true,
    timestamps: true,
  }
);

SearchKeyword.hasMany(TrackedListing, { foreignKey: 'keywordId', as: 'listings' });
TrackedListing.belongsTo(SearchKeyword, { foreignKey: 'keywordId', as: 'keyword' });
