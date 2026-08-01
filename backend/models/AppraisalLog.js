import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export class AppraisalLog extends Model {}

AppraisalLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    imageHash: { type: DataTypes.STRING(64), allowNull: false, field: 'image_hash' },
    imageBytes: { type: DataTypes.INTEGER, field: 'image_bytes' },
    imageWidth: { type: DataTypes.INTEGER, field: 'image_width' },
    imageHeight: { type: DataTypes.INTEGER, field: 'image_height' },
    category: DataTypes.STRING,
    era: DataTypes.STRING,
    priceMinJpy: { type: DataTypes.INTEGER, field: 'price_min_jpy' },
    priceMaxJpy: { type: DataTypes.INTEGER, field: 'price_max_jpy' },
    confidence: DataTypes.FLOAT,
    authenticityRisk: { type: DataTypes.STRING(16), field: 'authenticity_risk' },
    notes: DataTypes.TEXT,
    rawResponse: { type: DataTypes.TEXT, field: 'raw_response' },
    modelUsed: { type: DataTypes.STRING, field: 'model_used' },
    latencyMs: { type: DataTypes.INTEGER, field: 'latency_ms' },
    mock: { type: DataTypes.BOOLEAN, defaultValue: false },
    sourceUrl: { type: DataTypes.STRING, field: 'source_url' },
    sourceTitle: { type: DataTypes.STRING, field: 'source_title' },
    sourceHost: { type: DataTypes.STRING, field: 'source_host' },
    listedPriceJpy: { type: DataTypes.INTEGER, field: 'listed_price_jpy' },
    priceVerdict: { type: DataTypes.STRING(16), field: 'price_verdict' },
    isCollected: { type: DataTypes.BOOLEAN, field: 'is_collected', defaultValue: false, allowNull: false },
  },
  {
    sequelize,
    modelName: 'AppraisalLog',
    tableName: 'appraisal_logs',
    underscored: true,
    timestamps: true,
  }
);
