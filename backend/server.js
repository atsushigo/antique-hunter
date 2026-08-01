import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, isDev } from './config.js';
import { connect, sequelize } from './db.js';
import { marketsRouter } from './routes/markets.js';
import { appraisalRouter } from './routes/appraisal.js';
import { eventsRouter } from './routes/events.js';
import './models/MarketEvent.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(isDev ? 'dev' : 'combined'));

app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/markets', marketsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/appraisal', appraisalRouter);

app.get('/api/health', async (req, res) => {
  let db = 'ok';
  try {
    await sequelize.authenticate();
  } catch (err) {
    db = `error: ${err.message}`;
  }
  res.json({
    status: 'ok',
    db,
    env: config.env,
    claudeEnabled: config.claude.enabled,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.code || 'internal_error',
    message: isDev ? err.message : undefined,
  });
});

async function start() {
  await connect();
  app.listen(config.port, () => {
    console.log(`[antique-hunter] http://localhost:${config.port}`);
    console.log(`[antique-hunter] env=${config.env} claude=${config.claude.enabled ? 'on' : 'off (no ANTHROPIC_API_KEY)'}`);
  });
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
