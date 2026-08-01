import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../db.js';

export class PriceSnapshot extends Model {}

PriceSnapshot.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sourceUrl: { type: DataTypes.STRING, field: 'source_url', allowNull: false },
    sourceHost: { type: DataTypes.STRING, field: 'source_host' },
    priceJpy: { type: DataTypes.INTEGER, field: 'price_jpy', allowNull: false },
    seenAt: { type: DataTypes.DATE, field: 'seen_at', allowNull: false },
    sourceType: { type: DataTypes.STRING(16), field: 'source_type' },
  },
  {
    sequelize,
    modelName: 'PriceSnapshot',
    tableName: 'price_snapshots',
    underscored: true,
    timestamps: true,
  }
);

// 智慧 log：若最新一筆同 URL 的價格相同且 < 24 小時，不 log；否則 insert 新 snapshot
export async function snapshotPrice({ sourceUrl, priceJpy, sourceHost = null, sourceType = null }) {
  if (!sourceUrl || !Number.isFinite(priceJpy) || priceJpy <= 0) return null;
  const last = await PriceSnapshot.findOne({
    where: { sourceUrl },
    order: [['seen_at', 'DESC']],
  });
  const now = new Date();
  if (last && last.priceJpy === priceJpy) {
    const ageMs = now - new Date(last.seenAt);
    if (ageMs < 24 * 3600 * 1000) return null;
  }
  return PriceSnapshot.create({ sourceUrl, sourceHost, priceJpy, seenAt: now, sourceType });
}

export async function historyFor(sourceUrl, { days = 60 } = {}) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  return PriceSnapshot.findAll({
    where: { sourceUrl, seenAt: { [Op.gte]: since } },
    order: [['seen_at', 'ASC']],
    attributes: ['id', 'priceJpy', 'seenAt'],
  });
}
