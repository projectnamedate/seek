import { Router, Request, Response } from 'express';
import skrService from '../services/skr.service';
import { childLogger } from '../services/logger.service';
import { skrLookupLimiter } from '../middleware/rateLimiter.middleware';

const log = childLogger('skr-routes');

const router = Router();

// All SKR routes go through the rate limiter — every endpoint hits mainnet
// RPC for resolution. Cap per-IP at 60/min.
router.use(skrLookupLimiter);

// Hard cap on input length — base58 wallets max 44 chars, .skr domains
// realistically < 64. Anything longer is malformed; reject early to keep
// bad input from reaching the RPC client.
const MAX_LOOKUP_LENGTH = 64;

/**
 * POST /api/skr/resolve-address
 * Resolve a wallet address to its .skr domain name
 */
router.post('/resolve-address', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid address parameter',
      });
    }

    const skrName = await skrService.resolveAddressToSkr(address);

    res.status(200).json({
      success: true,
      data: {
        address,
        skrName,
        hasSkrDomain: skrName !== null,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'error resolving address');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve address',
    });
  }
});

/**
 * POST /api/skr/resolve-domain
 * Resolve a .skr domain name to its wallet address
 */
router.post('/resolve-domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid domain parameter',
      });
    }

    const address = await skrService.resolveSkrToAddress(domain);

    res.status(200).json({
      success: true,
      data: {
        domain,
        address,
        found: address !== null,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'error resolving domain');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve domain',
    });
  }
});

/**
 * GET /api/skr/lookup/:addressOrDomain
 * Universal lookup - auto-detects if input is address or domain
 */
router.get('/lookup/:input', async (req: Request, res: Response) => {
  try {
    const { input } = req.params;

    if (!input || input.length > MAX_LOOKUP_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input parameter',
      });
    }

    // Validate input format
    const isValidAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
    const isSkrDomain = /^[a-z0-9_-]+\.skr$/i.test(input);

    if (!isValidAddress && !isSkrDomain) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: must be a Solana address or .skr domain',
      });
    }

    if (isSkrDomain) {
      const address = await skrService.resolveSkrToAddress(input);
      res.status(200).json({
        success: true,
        data: {
          type: 'domain',
          input,
          address,
          found: address !== null,
        },
      });
    } else {
      const skrName = await skrService.resolveAddressToSkr(input);
      res.status(200).json({
        success: true,
        data: {
          type: 'address',
          input,
          skrName,
          hasSkrDomain: skrName !== null,
        },
      });
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'error in lookup');
    res.status(500).json({
      success: false,
      error: 'Failed to lookup',
    });
  }
});

export default router;
