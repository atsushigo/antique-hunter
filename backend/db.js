import fs from 'node:fs';
import path from 'node:path';
import { Sequelize } from 'sequelize';
import { config, isDev } from './config.js';

fs.mkdirSync(path.dirname(config.db.path), { recursive: true });

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.db.path,
  logging: isDev ? (msg) => console.log(`[sql] ${msg}`) : false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export async function connect() {
  await sequelize.authenticate();
}
