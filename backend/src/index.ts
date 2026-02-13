import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import bountyRoutes from './routes/bounty.routes';
import healthRoutes from './routes/health.routes';
import skrRoutes from './routes/skr.routes';
import sgtRoutes from './routes/sgt.routes';
import { startFinalizationWorker, stopFinalizationWorker } from './services/finalizer.service';

// Create Express app
const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.server.isDev
    ? ['http://localhost:3000', 'http://localhost:8081', 'http://10.0.2.2:3001']
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

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Request logging in development
if (config.server.isDev) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

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

// Global error handler — no stack traces or internal paths in production
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (config.server.isDev) {
    console.error('[Error]', err);
  } else {
    console.error('[Error]', err.message);
  }
  res.status(500).json({
    success: false,
    error: config.server.isDev ? err.message : 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;
const HOST = '0.0.0.0'; // Listen on all interfaces for emulator access

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║         SEEK PROTOCOL API SERVER          ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  Port:     ${PORT}                            ║`);
  console.log(`║  Network:  ${config.solana.network.padEnd(27)}║`);
  console.log(`║  Mode:     ${config.server.nodeEnv.padEnd(27)}║`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/health          - Health check');
  console.log('  GET  /api/health/stats    - Protocol stats');
  console.log('  POST /api/bounty/start    - Start bounty hunt');
  console.log('  POST /api/bounty/submit   - Submit photo');
  console.log('  GET  /api/bounty/:id      - Get bounty status');
  console.log('  GET  /api/skr/lookup/:x   - Resolve .skr domain');
  console.log('  POST /api/sgt/verify      - Verify Seeker Genesis Token');
  if (config.server.isDev) {
    console.log('  POST /api/bounty/demo/*   - Demo endpoints (dev only)');
    console.log('  GET  /api/health/demo     - Demo stats (dev only)');
  }
  console.log('');

  // Start finalization worker for challenge period processing
  startFinalizationWorker();
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  stopFinalizationWorker();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds if connections hang
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
