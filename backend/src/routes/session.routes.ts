import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import {
  BountySessionError,
  createBountySessionChallenge,
  verifyBountySessionChallenge,
} from '../services/bounty-session.service';
import { childLogger } from '../services/logger.service';
import { config } from '../config';
import { sgtLimiter } from '../middleware/rateLimiter.middleware';

const log = childLogger('session-routes');
const router = Router();

router.use(sgtLimiter);

const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const challengeSchema = z.object({
  walletAddress: z.string().regex(base58Pattern, 'Invalid Solana address'),
  clientProtocolVersion: z.number().int().min(1).max(99).optional(),
});

const verifySchema = z.object({
  walletAddress: z.string().regex(base58Pattern, 'Invalid Solana address'),
  challengeId: z.string().min(32).max(128),
  signature: z.string().min(32).max(256),
});

router.post('/challenge', validate(challengeSchema), async (req: Request, res: Response) => {
  try {
    const challenge = await createBountySessionChallenge(req.body);
    return res.status(200).json({
      success: true,
      data: {
        ...challenge,
        sessionRequired: config.sessionProof.requireForBounties,
      },
    });
  } catch (error) {
    if (error instanceof BountySessionError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    log.error({ err: error instanceof Error ? error.message : error }, 'session challenge error');
    return res.status(500).json({
      success: false,
      error: 'Failed to create session challenge',
    });
  }
});

router.post('/verify', validate(verifySchema), async (req: Request, res: Response) => {
  try {
    const session = await verifyBountySessionChallenge(req.body);
    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    if (error instanceof BountySessionError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    log.error({ err: error instanceof Error ? error.message : error }, 'session verify error');
    return res.status(500).json({
      success: false,
      error: 'Failed to verify session',
    });
  }
});

export default router;
