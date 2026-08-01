import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';
import { Market } from './Market.js';

export class MarketEvent extends Model {}

MarketEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    marketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'market_id',
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    note: { type: DataTypes.STRING },
  },
  {
    sequelize,
    modelName: 'MarketEvent',
    tableName: 'market_events',
    underscored: true,
    timestamps: true,
  }
);

Market.hasMany(MarketEvent, { foreignKey: 'marketId', as: 'events' });
MarketEvent.belongsTo(Market, { foreignKey: 'marketId', as: 'market' });
