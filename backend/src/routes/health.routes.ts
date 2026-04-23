import { Router, Request, Response } from 'express';
import { getBountyStats } from '../services/bounty.service';
import {
  getHouseVaultBalance,
  getSingularityVaultBalance,
  formatSkr,
  getConnection,
  getGlobalState,
} from '../services/solana.service';
import { getFinalizerStatus } from '../services/finalizer.service';
import { getRedis } from '../services/redis.service';
import { childLogger } from '../services/logger.service';
import { config } from '../config';

const log = childLogger('health');

const router = Router();

/**
 * GET /api/health
 * Liveness check — does not touch downstream deps. Use for load-balancer
 * health probes; should always return 200 if the process is alive.
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    network: config.solana.network,
  });
});

/**
 * GET /api/health/ready
 * Readiness check — verifies downstream deps (RPC + on-chain program + Redis).
 * Returns 503 if anything critical is failing. Use for deployment gates.
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; error?: string; info?: string }> = {};

  // RPC reachable?
  try {
    const conn = getConnection();
    const slot = await conn.getSlot();
    checks.rpc = { ok: true, info: `slot=${slot}` };
  } catch (e: any) {
    checks.rpc = { ok: false, error: e.message };
  }

  // Program initialized on this cluster?
  try {
    const state = await getGlobalState();
    if (state) {
      checks.program = { ok: true, info: `authority=${state.authority.toBase58().slice(0, 8)}...` };
    } else {
      checks.program = { ok: false, error: 'global_state not found — protocol not initialized' };
    }
  } catch (e: any) {
    checks.program = { ok: false, error: e.message };
  }

  // Redis connected (if configured)?
  if (config.redis.url) {
    try {
      const r = await getRedis();
      if (r) {
        const pong = await r.ping();
        checks.redis = { ok: pong === 'PONG', info: pong };
      } else {
        checks.redis = { ok: false, error: 'getRedis returned null' };
      }
    } catch (e: any) {
      checks.redis = { ok: false, error: e.message };
    }
  } else {
    checks.redis = { ok: true, info: 'disabled (REDIS_URL unset)' };
  }

  const ready = Object.values(checks).every((c) => c.ok);
  res.status(ready ? 200 : 503).json({
    ready,
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/stats
 * Get protocol statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const bountyStats = getBountyStats();
    const houseBalance = await getHouseVaultBalance();
    const singularityBalance = await getSingularityVaultBalance();

    res.status(200).json({
      success: true,
      data: {
        bounties: bountyStats,
        vaults: {
          house: formatSkr(houseBalance),
          singularity: formatSkr(singularityBalance),
        },
        winRate: (bountyStats.won + bountyStats.lost) > 0
          ? ((bountyStats.won / (bountyStats.won + bountyStats.lost)) * 100).toFixed(1) + '%'
          : 'N/A',
        finalizer: getFinalizerStatus(),
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'stats error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
});

// Demo endpoint: only register in development
if (config.server.isDev) {
  /**
   * GET /api/health/demo
   * Demo-friendly stats (no blockchain calls)
   */
  router.get('/demo', (req: Request, res: Response) => {
    const bountyStats = getBountyStats();

    res.status(200).json({
      success: true,
      data: {
        status: 'Demo Mode Active',
        bounties: {
          ...bountyStats,
          winRate: bountyStats.total > 0
            ? Math.round((bountyStats.won / (bountyStats.won + bountyStats.lost || 1)) * 100)
            : 0,
        },
        features: {
          aiValidation: true,
          blockchain: false,
          singularityJackpot: 'simulated',
        },
        version: '1.0.0-demo',
      },
    });
  });
}

export default router;
