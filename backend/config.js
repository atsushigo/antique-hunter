import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    path: path.resolve(
      __dirname,
      process.env.DATABASE_PATH || './data/antique_hunter.sqlite'
    ),
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export const isDev = config.env === 'development';
