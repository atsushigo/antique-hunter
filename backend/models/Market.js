import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class Market extends Model {}

Market.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    scheduleType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'schedule_type',
    },
    scheduleRule: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'schedule_rule',
    },
    timeRange: { type: DataTypes.STRING, field: 'time_range' },
    theme: { type: DataTypes.TEXT },
    scale: { type: DataTypes.STRING },
    driveTimeMin: { type: DataTypes.INTEGER, field: 'drive_time_min' },
    tollYen: { type: DataTypes.INTEGER, field: 'toll_yen' },
    route: { type: DataTypes.STRING },
    notes: { type: DataTypes.TEXT },
    sourceUrl: { type: DataTypes.STRING, field: 'source_url' },
    position: { type: DataTypes.INTEGER, defaultValue: 100 },
  },
  {
    sequelize,
    modelName: 'Market',
    tableName: 'markets',
    underscored: true,
    timestamps: true,
  }
);
