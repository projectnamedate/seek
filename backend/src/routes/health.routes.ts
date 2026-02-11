import { Router, Request, Response } from 'express';
import { getBountyStats } from '../services/bounty.service';
import { getHouseVaultBalance, getSingularityVaultBalance, formatSkr } from '../services/solana.service';
import { getFinalizerStatus } from '../services/finalizer.service';
import { config } from '../config';

const router = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
    console.error('[Health] Stats error:', error);
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
