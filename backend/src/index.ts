import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { config } from './config';
import bountyRoutes from './routes/bounty.routes';
import healthRoutes from './routes/health.routes';
import skrRoutes from './routes/skr.routes';
import sgtRoutes from './routes/sgt.routes';
import { startFinalizationWorker, stopFinalizationWorker } from './services/finalizer.service';
import { startBountyWorkers, stopBountyWorkers } from './services/bounty.service';
import { startSGTWorkers, stopSGTWorkers } from './services/sgt.service';
import { initSentry, setupSentryErrorHandler } from './services/sentry.service';
import { logger } from './services/logger.service';

// Initialize Sentry FIRST — auto-instruments http + express via OpenTelemetry.
initSentry();

// Create Express app
const app = express();

// Trust proxy (needed for Cloudflare tunnel / ngrok / Railway proxy)
app.set('trust proxy', 1);

// Structured request logging with correlation IDs. Every request gets a UUID
// stamped on every log line for its duration, so a single grep surfaces the
// full lifecycle. Health probes skipped to avoid log noise.
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = (req.headers['x-request-id'] as string | undefined) || randomUUID();
      res.setHeader('x-request-id', existing);
      return existing;
    },
    autoLogging: {
      ignore: (req) => (req.url ?? '').startsWith('/api/health'),
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        // Do NOT log body — photos + wallet addrs are PII-adjacent.
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

// Security headers
app.use(helmet());

// CORS configuration — allow all origins in dev for ngrok/real-device testing
app.use(cors({
  origin: config.server.isDev
    ? true  // Allow any origin (ngrok URLs are dynamic)
    : false, // Mobile API — no browser origins in production
  methods: ['GET', 'POST'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-wallet-address',
    'x-wallet-signature',
    'x-signature-timestamp',
  ],
  credentials: true,
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limit: 300 requests per 15 minutes per IP.
// Tighter per-wallet limits on /start + /submit live in rateLimiter.middleware.ts.
// A single app session easily hits ~20 requests (balance + sgt + prepare + start +
// poll + submit) so keep the global budget friendly for users behind carrier NAT.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Request logging is now handled by pino-http above — the old console-based
// middleware has been removed.

// Routes
app.use('/api/bounty', bountyRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/skr', skrRoutes);
app.use('/api/sgt', sgtRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Seek Protocol API',
    version: '0.1.0',
    description: 'Pokemon GO for crypto scavenger hunts',
    endpoints: {
      health: '/api/health',
      stats: '/api/health/stats',
      startBounty: 'POST /api/bounty/start',
      submitPhoto: 'POST /api/bounty/submit',
      getBounty: 'GET /api/bounty/:id',
      getPlayerBounty: 'GET /api/bounty/player/:wallet',
      resolveSkr: 'GET /api/skr/lookup/:addressOrDomain',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Sentry error handler (must come BEFORE our own error handler).
setupSentryErrorHandler(app);

// Global error handler — no stack traces or internal paths in production
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(
    { err, reqId: (req as any).id, path: req.path },
    'Request error'
  );
  res.status(500).json({
    success: false,
    error: config.server.isDev ? err.message : 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;
const HOST = '0.0.0.0'; // Listen on all interfaces for emulator access

const server = app.listen(PORT, HOST, () => {
  logger.info(
    {
      port: PORT,
      network: config.solana.network,
      mode: config.server.nodeEnv,
      redis: config.redis.url ? 'enabled' : 'disabled',
      sentry: config.sentry.dsn ? 'enabled' : 'disabled',
    },
    'Seek backend listening'
  );

  // Start background workers (cleanly stopped on SIGTERM)
  startFinalizationWorker();
  startBountyWorkers();
  startSGTWorkers();
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  stopFinalizationWorker();
  stopBountyWorkers();
  stopSGTWorkers();
  server.close(() => {
    logger.info('Server closed cleanly');
    process.exit(0);
  });
  // Force exit after 10 seconds if connections hang
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
