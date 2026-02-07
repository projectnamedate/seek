import { Router, Request, Response } from 'express';
import skrService from '../services/skr.service';

const router = Router();

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
    console.error('[SKR Route] Error resolving address:', error);
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
    console.error('[SKR Route] Error resolving domain:', error);
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

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Missing input parameter',
      });
    }

    // Detect if input is a .skr domain or an address
    const isSkrDomain = input.toLowerCase().endsWith('.skr') ||
                        (!input.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/));

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
    console.error('[SKR Route] Error in lookup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup',
    });
  }
});

export default router;
