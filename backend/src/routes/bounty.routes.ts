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
  TIER_CONFIDENCE_THRESHOLDS,
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
  storePreparedBounty,
  getPreparedBounty,
  acquireWalletLock,
  releaseWalletLock,
  acquireBountyLock,
  releaseBountyLock,
} from '../services/bounty.service';
import { extractExifMetadata, formatMetadata } from '../services/exif.service';
import { validatePhoto, isValidImageFormat, checkImageSize } from '../services/ai.service';
import { resolveBountyOnChain, generateMissionCommitment, formatSkr, getCurrentSlotAndTimestamp, deriveBountyPda, verifyTransaction } from '../services/solana.service';
import { getRandomMission } from '../data/missions';
import { PublicKey } from '@solana/web3.js';
import { isWalletSGTVerified } from '../services/sgt.service';
import { attestationService, AttestationPayload } from '../services/attestation.service';
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
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address'),
});

// Prepare bounty schema (pre-transaction)
const prepareBountySchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address'),
});

// Demo mode schemas
const startBountyDemoSchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  wallet: z.string().optional(),
  entryAmount: z.number().optional(),
});

/**
 * POST /api/bounty/prepare
 * Prepare a bounty before on-chain transaction.
 * Returns commitment, timestamp, and bountyPda for the mobile client
 * to build the accept_bounty transaction.
 * No wallet auth required (player hasn't signed anything yet).
 */
router.post('/prepare', validate(prepareBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, playerWallet } = req.body as { tier: Tier; playerWallet: string };

    // Check for existing active bounty
    const existing = getPlayerActiveBounty(playerWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Player already has an active bounty',
      });
    }

    // Get current Solana timestamp for PDA derivation
    const { timestamp } = await getCurrentSlotAndTimestamp();

    // Pick a random mission and generate commitment
    const mission = getRandomMission(tier);
    const { commitment, missionIdBytes, salt } = generateMissionCommitment(mission.id);

    // Derive bounty PDA
    const playerPubkey = new PublicKey(playerWallet);
    const [bountyPda] = deriveBountyPda(playerPubkey, timestamp);

    // Store prepared bounty data (keyed by bountyPda) so /start can retrieve it
    storePreparedBounty(bountyPda.toBase58(), {
      tier,
      playerWallet,
      timestamp: Number(timestamp),
      missionId: mission.id,
      missionDescription: mission.description,
      missionIdBytes,
      salt,
      commitment,
      createdAt: Date.now(),
    });

    console.log(`[API] Bounty prepared: PDA=${bountyPda.toBase58().slice(0, 8)}... | Tier ${tier} | ${mission.id}`);

    return res.status(200).json({
      success: true,
      data: {
        commitment: Array.from(commitment),
        timestamp: Number(timestamp),
        bountyPda: bountyPda.toBase58(),
        entryAmount: Number(ENTRY_AMOUNTS[tier]),
      },
    });
  } catch (error) {
    console.error('[API] Prepare bounty error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/bounty/start
 * Start a new bounty hunt
 */
router.post('/start', bountyStartLimiter, validate(startBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, playerWallet, bountyPda, transactionSignature } = req.body;

    // Acquire per-wallet lock to prevent race conditions
    if (!acquireWalletLock(playerWallet)) {
      return res.status(409).json({
        success: false,
        error: 'Bounty creation already in progress for this wallet',
      } as ApiResponse<never>);
    }

    try {
    // Check for existing active bounty
    const existing = getPlayerActiveBounty(playerWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Player already has an active bounty',
      } as ApiResponse<never>);
    }

    // Verify on-chain transaction if provided
    if (transactionSignature) {
      const txVerified = await verifyTransaction(transactionSignature);
      if (!txVerified) {
        return res.status(400).json({
          success: false,
          error: 'Transaction not confirmed on-chain',
        } as ApiResponse<never>);
      }
    }

    // Check SGT verification status
    const sgtResult = isWalletSGTVerified(playerWallet);
    const sgtVerified = sgtResult?.verified || false;

    // Try to use prepared bounty data (from /prepare endpoint)
    const prepared = getPreparedBounty(bountyPda);

    if (!prepared) {
      // No prepared data means commitment mismatch — reject
      return res.status(400).json({
        success: false,
        error: 'No prepared bounty data found. Call /prepare first.',
      } as ApiResponse<never>);
    }

    // Verify prepared data matches the caller
    if (prepared.playerWallet !== playerWallet) {
      return res.status(403).json({
        success: false,
        error: 'Prepared bounty belongs to a different wallet',
      } as ApiResponse<never>);
    }

    // Create bounty using the prepared mission (not a new random one)
    const { bounty, missionDescription } = createBounty(
      playerWallet,
      tier,
      bountyPda,
      transactionSignature,
      sgtVerified,
      prepared.missionId // Use the prepared mission, not a random one
    );

    // Store prepared mission secrets (must match on-chain commitment)
    storeMissionSecrets(bounty.id, prepared.missionIdBytes, prepared.salt);

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
    } finally {
      releaseWalletLock(playerWallet);
    }
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
router.post('/submit', bountySubmitLimiter, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const parsed = submitPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message || 'Invalid request',
      } as ApiResponse<never>);
    }

    const { bountyId, playerWallet: submitterWallet } = parsed.data;

    // Acquire per-bounty lock to prevent double submission
    if (!acquireBountyLock(bountyId)) {
      return res.status(409).json({
        success: false,
        error: 'Photo validation already in progress for this bounty',
      } as ApiResponse<never>);
    }

    try {
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

    // Verify the wallet owns this bounty
    if (bounty.playerWallet !== submitterWallet) {
      return res.status(403).json({
        success: false,
        error: 'Wallet does not own this bounty',
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

    // Verify camera attestation (if provided)
    let attestationPayload: AttestationPayload | null = null;
    if (req.body.attestation) {
      try {
        attestationPayload = JSON.parse(req.body.attestation);
      } catch { /* ignore malformed attestation */ }
    }
    const attestationResult = await attestationService.verifyAttestation(attestationPayload, req.file.buffer);
    if (attestationResult.confidence !== 'none') {
      console.log(`[API] Attestation: ${attestationResult.type} | Confidence: ${attestationResult.confidence} | Integrity: ${attestationResult.photoIntegrity}`);
    }

    // Reject if attestation claims Seeker device but photo integrity fails
    if (attestationPayload && attestationResult.isSeekerDevice && !attestationResult.photoIntegrity) {
      updateBountyStatus(bountyId, 'lost');
      return res.status(200).json({
        success: true,
        data: {
          status: 'lost',
          validation: {
            isValid: false,
            confidence: 0,
            reasoning: 'Photo integrity check failed — image was modified after capture',
            detectedObjects: [],
            isScreenshot: false,
            matchesTarget: false,
          },
        },
      } as ApiResponse<SubmitPhotoResponse>);
    }

    // Record attestation type on the bounty for analytics
    if (attestationResult.confidence !== 'none') {
      bounty.attestationType = attestationResult.type;
    }

    // Validate with AI (pass tier + bounty start time for stricter checks)
    const validation = await validatePhoto(
      req.file.buffer,
      req.file.mimetype,
      mission,
      metadata,
      bounty.tier,
      bounty.createdAt
    );

    // Apply SGT bonus: lower the confidence threshold for verified Seeker users
    if (bounty.sgtVerified && !validation.isValid) {
      const baseThreshold = TIER_CONFIDENCE_THRESHOLDS[bounty.tier];
      const sgtBonus = config.sgt.bonusConfidenceReduction;
      const adjustedThreshold = baseThreshold - sgtBonus;
      if (validation.confidence >= adjustedThreshold) {
        console.log(`[API] SGT bonus applied: ${validation.confidence} >= ${adjustedThreshold} (base ${baseThreshold} - ${sgtBonus})`);
        validation.isValid = true;
      }
    }

    console.log(`[API] Validation result: ${validation.isValid ? 'PASS' : 'FAIL'} (${validation.confidence})${bounty.sgtVerified ? ' [SGT]' : ''}`);
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
      response.payout = formatSkr(bounty.entryAmount * 3n);
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
    } finally {
      releaseBountyLock(bountyId);
    }
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

    return res.status(200).json({
      success: true,
      data: {
        id: bounty.id,
        status: bounty.status,
        tier: bounty.tier,
        entryAmount: formatSkr(bounty.entryAmount),
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

    return res.status(200).json({
      success: true,
      data: {
        id: bounty.id,
        status: bounty.status,
        tier: bounty.tier,
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
