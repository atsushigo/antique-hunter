import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class AuctionKnowledge extends Model {
  get tagsArray() {
    return (this.tags || '').split(/[,、\s]+/).map((s) => s.trim()).filter(Boolean);
  }
}

AuctionKnowledge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING(32) },
    title: { type: DataTypes.STRING, allowNull: false },
    sourceUrl: { type: DataTypes.STRING, field: 'source_url' },
    sourceSite: { type: DataTypes.STRING(32), field: 'source_site' },
    listingPriceJpy: { type: DataTypes.INTEGER, field: 'listing_price_jpy' },
    winningPriceJpy: { type: DataTypes.INTEGER, field: 'winning_price_jpy' },
    didIBid: { type: DataTypes.BOOLEAN, field: 'did_i_bid', defaultValue: false },
    myAppraisalLowJpy: { type: DataTypes.INTEGER, field: 'my_appraisal_low_jpy' },
    myAppraisalHighJpy: { type: DataTypes.INTEGER, field: 'my_appraisal_high_jpy' },
    notes: { type: DataTypes.TEXT },
    tags: { type: DataTypes.STRING },
    observedAt: { type: DataTypes.DATE, field: 'observed_at' },
    settledAt: { type: DataTypes.DATE, field: 'settled_at' },
  },
  {
    sequelize,
    modelName: 'AuctionKnowledge',
    tableName: 'auction_knowledge',
    underscored: true,
    timestamps: true,
  }
);
