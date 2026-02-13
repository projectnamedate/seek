import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  generateSIWSNonce,
  buildSIWSMessage,
  verifySGTForWallet,
  isWalletSGTVerified,
  getSGTStats,
} from '../services/sgt.service';
import { validate } from '../middleware/validate.middleware';
import { config } from '../config';

const router = Router();

// Base58 pattern for Solana addresses
const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Validation schemas
const nonceSchema = z.object({
  walletAddress: z.string().regex(base58Pattern, 'Invalid Solana address'),
});

const verifySchema = z.object({
  walletAddress: z.string().regex(base58Pattern, 'Invalid Solana address'),
  signature: z.string().min(1, 'Signature required'),
  message: z.object({
    domain: z.string(),
    address: z.string(),
    statement: z.string(),
    uri: z.string(),
    version: z.string(),
    chainId: z.string(),
    nonce: z.string(),
    issuedAt: z.string(),
  }),
});

/**
 * POST /api/sgt/nonce
 * Get a SIWS nonce + message for SGT verification
 */
router.post('/nonce', validate(nonceSchema), (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    // Check if already verified
    const existing = isWalletSGTVerified(walletAddress);
    if (existing?.verified) {
      return res.status(200).json({
        success: true,
        data: {
          alreadyVerified: true,
          verifiedAt: existing.verifiedAt?.toISOString(),
        },
      });
    }

    // Generate nonce and build SIWS message
    const nonce = generateSIWSNonce(walletAddress);
    const message = buildSIWSMessage(walletAddress, nonce);

    return res.status(200).json({
      success: true,
      data: { nonce, message },
    });
  } catch (error) {
    console.error('[SGT] Nonce error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate verification nonce',
    });
  }
});

/**
 * POST /api/sgt/verify
 * Submit SIWS signature and verify SGT ownership
 */
router.post('/verify', validate(verifySchema), async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    const result = await verifySGTForWallet(walletAddress, signature, message);

    return res.status(result.verified ? 200 : 403).json({
      success: result.verified,
      data: {
        verified: result.verified,
        sgtMintAddress: result.sgtMintAddress,
        verifiedAt: result.verifiedAt?.toISOString(),
        error: result.error,
      },
    });
  } catch (error) {
    console.error('[SGT] Verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

/**
 * GET /api/sgt/status/:wallet
 * Check cached SGT verification status (no network calls)
 */
router.get('/status/:wallet', (req: Request, res: Response) => {
  const { wallet } = req.params;

  if (!base58Pattern.test(wallet)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address',
    });
  }

  const result = isWalletSGTVerified(wallet);

  return res.status(200).json({
    success: true,
    data: {
      verified: result?.verified || false,
      verifiedAt: result?.verifiedAt?.toISOString() || null,
      sgtMintAddress: result?.sgtMintAddress || null,
    },
  });
});

// Stats endpoint (dev only)
if (config.server.isDev) {
  router.get('/stats', (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      data: getSGTStats(),
    });
  });
}

export default router;
