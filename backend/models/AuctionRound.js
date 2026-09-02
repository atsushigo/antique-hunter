import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class AuctionRound extends Model {}

AuctionRound.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    auctionId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'auction_id' },
    category: { type: DataTypes.STRING(32) },
    government: { type: DataTypes.STRING },
    sampleTitle: { type: DataTypes.STRING, field: 'sample_title' },
    sampleItemId: { type: DataTypes.INTEGER, field: 'sample_item_id' },
    entryStart: { type: DataTypes.STRING(32), field: 'entry_start' },
    entryEnd: { type: DataTypes.STRING(32), field: 'entry_end' },
    bidStart: { type: DataTypes.STRING(32), field: 'bid_start' },
    bidEnd: { type: DataTypes.STRING(32), field: 'bid_end' },
    firstSeenAt: { type: DataTypes.DATE, field: 'first_seen_at' },
    dismissedAt: { type: DataTypes.DATE, field: 'dismissed_at' },
  },
  {
    sequelize,
    modelName: 'AuctionRound',
    tableName: 'auction_rounds',
    underscored: true,
    timestamps: true,
  }
);
