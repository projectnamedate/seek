import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  ApiResponse,
  StartBountyRequest,
  StartBountyResponse,
  SubmitPhotoResponse,
  Tier,
  ENTRY_AMOUNTS,
} from '../types';
import {
  createBounty,
  getBounty,
  getPlayerActiveBounty,
  updateBountyStatus,
  isBountyExpired,
  getBountyMission,
  markBountyValidating,
  storeMissionSecrets,
  getMissionSecrets,
} from '../services/bounty.service';
import { extractExifMetadata, formatMetadata } from '../services/exif.service';
import { validatePhoto, isValidImageFormat, checkImageSize } from '../services/ai.service';
import { resolveBountyOnChain, generateMissionCommitment, formatSkr } from '../services/solana.service';
import { requireWalletAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { bountyStartLimiter, bountySubmitLimiter } from '../middleware/rateLimiter.middleware';
import { config } from '../config';

const router = Router();

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Base58 pattern for Solana addresses
const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Request validation schemas
const startBountySchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address (base58, 32-44 chars)'),
  bountyPda: z.string().regex(base58Pattern, 'Invalid PDA address (base58, 32-44 chars)'),
  transactionSignature: z.string().optional(),
});

const submitPhotoSchema = z.object({
  bountyId: z.string().uuid('Invalid bounty ID format'),
});

// Demo mode schemas
const startBountyDemoSchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  wallet: z.string().optional(),
  entryAmount: z.number().optional(),
});

/**
 * POST /api/bounty/start
 * Start a new bounty hunt
 */
router.post('/start', requireWalletAuth, bountyStartLimiter, validate(startBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, playerWallet, bountyPda, transactionSignature } = req.body;

    // Check for existing active bounty
    const existing = getPlayerActiveBounty(playerWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Player already has an active bounty',
      } as ApiResponse<never>);
    }

    // Create bounty
    const { bounty, missionDescription } = createBounty(
      playerWallet,
      tier,
      bountyPda,
      transactionSignature
    );

    // Generate and store mission commitment for commit-reveal
    const { missionIdBytes, salt } = generateMissionCommitment(bounty.missionId);
    storeMissionSecrets(bounty.id, missionIdBytes, salt);

    // Return response
    const response: StartBountyResponse = {
      bountyId: bounty.id,
      mission: {
        id: bounty.missionId,
        description: missionDescription,
      },
      expiresAt: bounty.expiresAt.toISOString(),
      bountyPda: bounty.bountyPda,
    };

    console.log(`[API] Bounty started: ${bounty.id} | Tier ${tier} | ${missionDescription}`);

    return res.status(201).json({
      success: true,
      data: response,
    } as ApiResponse<StartBountyResponse>);
  } catch (error) {
    console.error('[API] Start bounty error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

/**
 * POST /api/bounty/submit
 * Submit a photo for validation
 */
router.post('/submit', requireWalletAuth, bountySubmitLimiter, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    // Validate bounty ID
    const parsed = submitPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounty ID',
      } as ApiResponse<never>);
    }

    const { bountyId } = parsed.data;

    // Check photo was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo uploaded',
      } as ApiResponse<never>);
    }

    // Validate image format
    if (!isValidImageFormat(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Supported: JPEG, PNG, WebP, HEIC',
      } as ApiResponse<never>);
    }

    // Check image size
    const sizeCheck = checkImageSize(req.file.buffer);
    if (!sizeCheck.valid) {
      return res.status(400).json({
        success: false,
        error: sizeCheck.reason,
      } as ApiResponse<never>);
    }

    // Get bounty
    const bounty = getBounty(bountyId);
    if (!bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found',
      } as ApiResponse<never>);
    }

    // Check bounty status
    if (bounty.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Bounty is not pending (current status: ${bounty.status})`,
      } as ApiResponse<never>);
    }

    // Check expiration
    if (isBountyExpired(bounty)) {
      updateBountyStatus(bountyId, 'expired');
      return res.status(400).json({
        success: false,
        error: 'Bounty has expired',
      } as ApiResponse<never>);
    }

    // Get mission
    const mission = getBountyMission(bountyId);
    if (!mission) {
      return res.status(500).json({
        success: false,
        error: 'Mission not found for bounty',
      } as ApiResponse<never>);
    }

    // Mark as validating
    markBountyValidating(bountyId);

    console.log(`[API] Validating photo for bounty: ${bountyId}`);

    // Extract EXIF metadata
    const metadata = await extractExifMetadata(req.file.buffer);
    console.log(`[API] EXIF: ${formatMetadata(metadata)}`);

    // Validate with AI (pass tier + bounty start time for stricter checks)
    const validation = await validatePhoto(
      req.file.buffer,
      req.file.mimetype,
      mission,
      metadata,
      bounty.tier,
      bounty.createdAt
    );

    console.log(`[API] Validation result: ${validation.isValid ? 'PASS' : 'FAIL'} (${validation.confidence})`);
    console.log(`[API] Reasoning: ${validation.reasoning}`);

    // Resolve on-chain
    const success = validation.isValid;
    const secrets = getMissionSecrets(bountyId);
    const { signature, singularityWon } = await resolveBountyOnChain(
      bounty.bountyPda,
      bounty.playerWallet,
      success,
      secrets?.missionIdBytes,
      secrets?.salt
    );

    // Update bounty status
    updateBountyStatus(bountyId, success ? 'won' : 'lost', signature);

    // Build response
    const response: SubmitPhotoResponse = {
      status: success ? 'won' : 'lost',
      validation,
      transactionSignature: signature,
    };

    if (success) {
      response.payout = formatSkr(bounty.entryAmount * 2n);
      response.singularityWon = singularityWon;

      if (singularityWon) {
        console.log(`[API] SINGULARITY WON! Player: ${bounty.playerWallet}`);
      }
    }

    console.log(`[API] Bounty ${bountyId} resolved: ${success ? 'WON' : 'LOST'}`);

    return res.status(200).json({
      success: true,
      data: response,
    } as ApiResponse<SubmitPhotoResponse>);
  } catch (error) {
    console.error('[API] Submit photo error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

// === Demo routes: only register in development ===
if (config.server.isDev) {
  /**
   * POST /api/bounty/demo/start
   * Start a bounty in demo mode (no blockchain required)
   */
  router.post('/demo/start', validate(startBountyDemoSchema), async (req: Request, res: Response) => {
    try {
      const { tier, wallet } = req.body as { tier: Tier; wallet?: string };
      const demoWallet = wallet || 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker';
      const demoPda = `demo-pda-${Date.now()}`;

      // Create bounty without blockchain
      const { bounty, missionDescription } = createBounty(
        demoWallet,
        tier,
        demoPda,
        undefined
      );

      console.log(`[DEMO] Bounty started: ${bounty.id} | Tier ${tier} | ${missionDescription}`);

      return res.status(201).json({
        success: true,
        bounty: {
          id: bounty.id,
          tier: tier,
          target: missionDescription.split(': ')[0] || missionDescription,
          targetHint: missionDescription.split(': ')[1] || 'Find this object',
          startTime: bounty.createdAt.getTime(),
          endTime: bounty.expiresAt.getTime(),
          status: 'hunting',
          entryAmount: Number(ENTRY_AMOUNTS[tier] / 1_000_000_000n),
          potentialReward: Number((ENTRY_AMOUNTS[tier] * 2n) / 1_000_000_000n),
        },
      });
    } catch (error) {
      console.error('[DEMO] Start bounty error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse<never>);
    }
  });

  /**
   * POST /api/bounty/demo/submit
   * Submit a photo for validation in demo mode (no blockchain required)
   */
  router.post('/demo/submit', upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const { bountyId } = req.body;

      if (!bountyId) {
        return res.status(400).json({
          success: false,
          error: 'Bounty ID required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No photo uploaded',
        });
      }

      if (!isValidImageFormat(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image format. Supported: JPEG, PNG, WebP, HEIC',
        });
      }

      const bounty = getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({
          success: false,
          error: 'Bounty not found',
        });
      }

      const mission = getBountyMission(bountyId);
      if (!mission) {
        return res.status(500).json({
          success: false,
          error: 'Mission not found for bounty',
        });
      }

      markBountyValidating(bountyId);

      console.log(`[DEMO] Validating photo for bounty: ${bountyId}`);
      console.log(`[DEMO] Mission: ${mission.description}`);

      const metadata = await extractExifMetadata(req.file.buffer);
      console.log(`[DEMO] EXIF: ${formatMetadata(metadata)}`);

      const validation = await validatePhoto(
        req.file.buffer,
        req.file.mimetype,
        mission,
        metadata,
        bounty.tier,
        bounty.createdAt
      );

      const success = validation.isValid;

      console.log(`[DEMO] AI Result: ${success ? 'PASS' : 'FAIL'} | Confidence: ${Math.round(validation.confidence * 100)}%`);
      console.log(`[DEMO] Reasoning: ${validation.reasoning}`);

      updateBountyStatus(bountyId, success ? 'won' : 'lost');

      return res.status(200).json({
        success: true,
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          reasoning: validation.reasoning,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('[DEMO] Submit photo error:', error);
      return res.status(500).json({
        success: false,
        error: 'AI validation failed',
      });
    }
  });
}

/**
 * GET /api/bounty/:id
 * Get bounty status
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bounty = getBounty(req.params.id);
    if (!bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found',
      } as ApiResponse<never>);
    }

    const mission = getBountyMission(req.params.id);

    return res.status(200).json({
      success: true,
      data: {
        id: bounty.id,
        status: bounty.status,
        tier: bounty.tier,
        entryAmount: formatSkr(bounty.entryAmount),
        mission: mission ? {
          id: mission.id,
          description: mission.description,
        } : null,
        createdAt: bounty.createdAt.toISOString(),
        expiresAt: bounty.expiresAt.toISOString(),
        isExpired: isBountyExpired(bounty),
        transactionSignature: bounty.transactionSignature,
      },
    });
  } catch (error) {
    console.error('[API] Get bounty error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/bounty/player/:wallet
 * Get player's active bounty
 */
router.get('/player/:wallet', async (req: Request, res: Response) => {
  try {
    const bounty = getPlayerActiveBounty(req.params.wallet);
    if (!bounty) {
      return res.status(404).json({
        success: false,
        error: 'No active bounty for player',
      } as ApiResponse<never>);
    }

    const mission = getBountyMission(bounty.id);

    return res.status(200).json({
      success: true,
      data: {
        id: bounty.id,
        status: bounty.status,
        tier: bounty.tier,
        mission: mission ? {
          id: mission.id,
          description: mission.description,
        } : null,
        expiresAt: bounty.expiresAt.toISOString(),
        remainingSeconds: Math.max(0, Math.floor((bounty.expiresAt.getTime() - Date.now()) / 1000)),
      },
    });
  } catch (error) {
    console.error('[API] Get player bounty error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

export default router;
