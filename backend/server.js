import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, isDev } from './config.js';
import { requireApiKey } from './middleware/require-api-key.js';
import { connect, sequelize } from './db.js';
import { marketsRouter } from './routes/markets.js';
import { appraisalRouter } from './routes/appraisal.js';
import { eventsRouter } from './routes/events.js';
import { keywordsRouter } from './routes/keywords.js';
import { searchRouter } from './routes/search.js';
import { authRouter } from './routes/auth.js';
import { jimotyRouter } from './routes/jimoty.js';
import { imgProxyRouter } from './routes/img-proxy.js';
import { govAuctionsRouter } from './routes/gov-auctions.js';
import { auctionScheduleRouter } from './routes/auction-schedule.js';
import { auctionSourcesRouter } from './routes/auction-sources.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { auctionRoundsRouter } from './routes/auction-rounds.js';
import { bitPropertiesRouter } from './routes/bit-properties.js';
import './models/AuctionKnowledge.js';
import './models/AuctionRound.js';
import { startCron } from './cron.js';
import { closeBrowser } from './browser.js';
import './models/MarketEvent.js';
import './models/TrackedListing.js';
import './models/PriceSnapshot.js';

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

// /api/health 刻意放在 requireApiKey 之前 → 監控/uptime check 不需要帶金鑰
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

app.use('/api/', requireApiKey);

app.use('/api/markets', marketsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/appraisal', appraisalRouter);
app.use('/api/keywords', keywordsRouter);
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/jimoty', jimotyRouter);
app.use('/api/img-proxy', imgProxyRouter);
app.use('/api/gov-auctions', govAuctionsRouter);
app.use('/api/auction-schedule', auctionScheduleRouter);
app.use('/api/auction-sources', auctionSourcesRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/auction-rounds', auctionRoundsRouter);
app.use('/api/bit-properties', bitPropertiesRouter);

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
  startCron();
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

async function shutdown(sig) {
  console.log(`[shutdown] ${sig}`);
  try { await closeBrowser(); } catch {}
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
