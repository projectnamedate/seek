import express from 'express';
import cors from 'cors';
import { config } from './config';
import bountyRoutes from './routes/bounty.routes';
import healthRoutes from './routes/health.routes';
import skrRoutes from './routes/skr.routes';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: config.server.isDev ? '*' : [
    'https://seek.app',
    'https://www.seek.app',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: config.server.isDev ? err.message : 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
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
  console.log('');
});

export default app;
