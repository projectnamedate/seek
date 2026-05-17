import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import {
  ApiResponse,
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
  getPreparedBountyById,
  acquireWalletLock,
  releaseWalletLock,
  acquireBountyLock,
  releaseBountyLock,
  issueBountySubmitToken,
  verifyBountySubmitToken,
} from '../services/bounty.service';
import { extractExifMetadata, formatMetadata } from '../services/exif.service';
import { validatePhoto, isValidImageFormat, checkImageSize, canApplySgtConfidenceBonus } from '../services/ai.service';
import {
  deriveBountyPda,
  formatSkr,
  generateMissionCommitment,
  getCurrentSlotAndTimestamp,
  resolveBountyOnChain,
  verifyTransaction,
} from '../services/solana.service';
import { getFinalizerSafetyPause } from '../services/finalizer.service';
import { getRandomMission } from '../data/missions';
import { PublicKey } from '@solana/web3.js';
import { isWalletSGTVerified, verifySGTOwnershipForWallet } from '../services/sgt.service';
import {
  attestationService,
  AttestationPayload,
  mergeAttestationMetadata,
} from '../services/attestation.service';
import { getWalletDailyBountyStatus, reserveWalletDailyBounty } from '../services/wallet-bounty-limit.service';
import { validate } from '../middleware/validate.middleware';
import { verifyWalletAuthRequest } from '../middleware/auth.middleware';
import { bountyPrepareLimiter, bountyStartLimiter, bountySubmitLimiter } from '../middleware/rateLimiter.middleware';
import { childLogger } from '../services/logger.service';
import { config } from '../config';

const log = childLogger('bounty-routes');

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
  prepareId: z.string().min(32).max(128).optional(),
});

const submitPhotoSchema = z.object({
  bountyId: z.string().uuid('Invalid bounty ID format'),
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address').optional(),
  submitToken: z.string().min(32).max(128).optional(),
});

// Prepare bounty schema (pre-transaction)
const prepareBountySchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address'),
});

/**
 * POST /api/bounty/prepare
 * Prepare a bounty before on-chain transaction.
 * Returns commitment, timestamp, and bountyPda for the mobile client
 * to build the accept_bounty transaction.
 * Anonymous by design: the on-chain accept_bounty transaction in /start is the
 * wallet authorization. The prepareId prevents anonymous PDA-poisoning from
 * overwriting another client's prepared commitment.
 */
router.post('/prepare', bountyPrepareLimiter, validate(prepareBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, playerWallet } = req.body as { tier: Tier; playerWallet: string };

    const finalizerPause = await getFinalizerSafetyPause();
    if (finalizerPause.paused) {
      return res.status(503).json({
        success: false,
        error: 'Bounty starts are temporarily paused while settlement catches up',
        data: {
          reason: finalizerPause.reason,
          retryAt: finalizerPause.until
            ? new Date(finalizerPause.until * 1000).toISOString()
            : null,
        },
      });
    }

    // Check for existing active bounty
    const existing = await getPlayerActiveBounty(playerWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Player already has an active bounty',
      });
    }

    const dailyLimit = await getWalletDailyBountyStatus(playerWallet);
    if (!dailyLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Daily bounty limit reached',
        data: {
          limit: dailyLimit.limit,
          resetAt: dailyLimit.resetAt.toISOString(),
        },
      });
    }

    // Get current Solana timestamp for PDA derivation
    const { timestamp } = await getCurrentSlotAndTimestamp();

    // Pick the mission and generate commitment.
    const mission = getRandomMission(tier);
    const { commitment, missionIdBytes, salt } = generateMissionCommitment(mission.id);

    // Derive bounty PDA
    const playerPubkey = new PublicKey(playerWallet);
    const [bountyPda] = deriveBountyPda(playerPubkey, timestamp);
    const prepareId = randomBytes(32).toString('hex');

    // Store prepared bounty data (keyed by bountyPda) so /start can retrieve it
    await storePreparedBounty(bountyPda.toBase58(), {
      prepareId,
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

    log.info({ bountyPda: bountyPda.toBase58().slice(0, 8), tier, missionId: mission.id }, 'bounty prepared');

    return res.status(200).json({
      success: true,
      data: {
        commitment: Array.from(commitment),
        prepareId,
        timestamp: Number(timestamp),
        bountyPda: bountyPda.toBase58(),
        entryAmount: Number(ENTRY_AMOUNTS[tier]),
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'prepare bounty error');
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
// /start does NOT require wallet-auth headers — verifyTransaction below proves
// the player authorized the bounty by signing the on-chain accept_bounty. This
// avoids a third MWA prompt in the BountyReveal flow (prepare auth + tx + start
// auth would be 3 prompts). The on-chain tx is stronger proof anyway.
router.post('/start', bountyStartLimiter, validate(startBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, bountyPda, transactionSignature, playerWallet, prepareId } = req.body;

    // Acquire per-wallet lock (Redis-backed; multi-instance safe)
    if (!(await acquireWalletLock(playerWallet))) {
      return res.status(409).json({
        success: false,
        error: 'Bounty creation already in progress for this wallet',
      } as ApiResponse<never>);
    }

    try {
    // Check for existing active bounty
    const existing = await getPlayerActiveBounty(playerWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Player already has an active bounty',
      } as ApiResponse<never>);
    }

    // Verify on-chain transaction actually contains an accept_bounty call
    // for THIS player against THIS bountyPda. Confirmation status alone is
    // not enough — an attacker could paste any random confirmed tx sig.
    if (!transactionSignature) {
      return res.status(400).json({
        success: false,
        error: 'transactionSignature required',
      } as ApiResponse<never>);
    }
    const txVerified = await verifyTransaction(transactionSignature, playerWallet, bountyPda);
    if (!txVerified) {
      return res.status(400).json({
        success: false,
        error: 'Transaction does not contain a valid accept_bounty for this player + bountyPda',
      } as ApiResponse<never>);
    }

    // Check SGT verification status. If the passive home-screen check has not
    // populated the cache yet, read Token-2022 ownership directly here. This
    // route is already bound to an on-chain accept_bounty from the same wallet.
    const cachedSgtResult = await isWalletSGTVerified(playerWallet);
    const sgtResult = cachedSgtResult?.verified
      ? cachedSgtResult
      : await verifySGTOwnershipForWallet(playerWallet);
    const sgtVerified = sgtResult?.verified || false;

    // Try to use prepared bounty data (from /prepare endpoint). New clients send
    // prepareId so anonymous callers cannot poison a wallet+bountyPda record.
    const prepared = prepareId
      ? await getPreparedBountyById(prepareId)
      : await getPreparedBounty(bountyPda);

    if (!prepared) {
      // No prepared data means commitment mismatch — reject
      return res.status(400).json({
        success: false,
        error: 'No prepared bounty data found. Call /prepare first.',
      } as ApiResponse<never>);
    }

    if (prepared.bountyPda && prepared.bountyPda !== bountyPda) {
      return res.status(403).json({
        success: false,
        error: 'Prepared bounty ID does not match requested bounty',
      } as ApiResponse<never>);
    }

    // Verify prepared data matches the caller
    if (prepared.playerWallet !== playerWallet) {
      return res.status(403).json({
        success: false,
        error: 'Prepared bounty belongs to a different wallet',
      } as ApiResponse<never>);
    }

    // Bind /start to the exact prepared tier. The on-chain accept_bounty
    // transaction was built from /prepare's entryAmount/timestamp/commitment;
    // trusting a new client-supplied tier here would desync backend timers and
    // payout display from the already-signed on-chain bounty.
    if (prepared.tier !== tier) {
      return res.status(400).json({
        success: false,
        error: 'Tier does not match prepared bounty',
      } as ApiResponse<never>);
    }

    const dailyLimit = await reserveWalletDailyBounty(playerWallet);
    if (!dailyLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Daily bounty limit reached',
        data: {
          limit: dailyLimit.limit,
          resetAt: dailyLimit.resetAt.toISOString(),
        },
      });
    }

    // Create bounty using the prepared mission (not a new random one)
    const { bounty, missionDescription } = await createBounty(
      playerWallet,
      tier,
      bountyPda,
      transactionSignature,
      sgtVerified,
      prepared.missionId // Use the prepared mission, not a random one
    );

    // Store prepared mission secrets (must match on-chain commitment)
    await storeMissionSecrets(bounty.id, prepared.missionIdBytes, prepared.salt);
    const submitTokenTtl = Math.ceil((bounty.expiresAt.getTime() - Date.now()) / 1000) + 10 * 60;
    const submitToken = await issueBountySubmitToken(bounty.id, bounty.playerWallet, submitTokenTtl);

    // Return response
    const response: StartBountyResponse = {
      bountyId: bounty.id,
      mission: {
        id: bounty.missionId,
        description: missionDescription,
      },
      expiresAt: bounty.expiresAt.toISOString(),
      bountyPda: bounty.bountyPda,
      submitToken,
    };

    log.info({ bountyId: bounty.id, tier, missionDescription }, 'bounty started');

    return res.status(201).json({
      success: true,
      data: response,
    } as ApiResponse<StartBountyResponse>);
    } finally {
      await releaseWalletLock(playerWallet);
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'start bounty error');
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

    const { bountyId, submitToken } = parsed.data;

    // Acquire per-bounty lock (Redis-backed; multi-instance safe)
    if (!(await acquireBountyLock(bountyId))) {
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
    const bounty = await getBounty(bountyId);
    if (!bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found',
      } as ApiResponse<never>);
    }

    const tokenAuthorized = submitToken
      ? await verifyBountySubmitToken(bountyId, submitToken, bounty.playerWallet)
      : false;

    let walletAuthorized = false;
    if (!tokenAuthorized) {
      const walletAuth = await verifyWalletAuthRequest(req, 'submit');
      if (walletAuth.ok) {
        walletAuthorized = walletAuth.walletAddress === bounty.playerWallet;
      } else if (!req.headers['x-wallet-address']) {
        return res.status(401).json({
          success: false,
          error: 'Missing submit token',
        } as ApiResponse<never>);
      } else {
        return res.status(walletAuth.status).json({
          success: false,
          error: walletAuth.error,
        } as ApiResponse<never>);
      }
    }

    // Verify this client is authorized for this bounty. New app builds use the
    // submit token issued by /start; old builds can still fall back to wallet auth.
    if (!tokenAuthorized && !walletAuthorized) {
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
      await updateBountyStatus(bountyId, 'expired');
      return res.status(400).json({
        success: false,
        error: 'Bounty has expired',
      } as ApiResponse<never>);
    }

    // Get mission
    const mission = await getBountyMission(bountyId);
    if (!mission) {
      return res.status(500).json({
        success: false,
        error: 'Mission not found for bounty',
      } as ApiResponse<never>);
    }

    // Mark as validating
    await markBountyValidating(bountyId);

    log.info({ bountyId }, 'validating photo for bounty');

    // Extract EXIF metadata
    const metadata = await extractExifMetadata(req.file.buffer);
    log.info({ exif: formatMetadata(metadata) }, 'extracted exif');

    // Verify camera attestation (if provided)
    let attestationPayload: AttestationPayload | null = null;
    if (req.body.attestation) {
      try {
        attestationPayload = JSON.parse(req.body.attestation);
      } catch { /* ignore malformed attestation */ }
    }
    const attestationResult = await attestationService.verifyAttestation(attestationPayload, req.file.buffer);
    if (attestationResult.confidence !== 'none') {
      log.info({ type: attestationResult.type, confidence: attestationResult.confidence, integrity: attestationResult.photoIntegrity }, 'attestation');
    }
    const validationMetadata = mergeAttestationMetadata(metadata, attestationPayload, attestationResult);
    if (validationMetadata !== metadata) {
      log.info({ metadata: formatMetadata(validationMetadata), source: validationMetadata.source }, 'merged attestation metadata');
    }

    // Log attestation integrity (hard rejection disabled until TEE SDK ships —
    // standard hash check is unreliable across device camera pipelines)
    if (attestationPayload && attestationResult.isSeekerDevice && !attestationResult.photoIntegrity) {
      log.info('attestation hash mismatch for Seeker device (non-blocking) — proceeding to AI validation');
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
      validationMetadata,
      bounty.tier,
      bounty.createdAt
    );

    // Apply SGT bonus: lower the confidence threshold for verified Seeker users
    if (
      bounty.sgtVerified &&
      !validation.isValid &&
      canApplySgtConfidenceBonus(validation)
    ) {
      const baseThreshold = TIER_CONFIDENCE_THRESHOLDS[bounty.tier];
      const sgtBonus = config.sgt.bonusConfidenceReduction;
      const adjustedThreshold = baseThreshold - sgtBonus;
      if (validation.confidence >= adjustedThreshold) {
        log.info({ confidence: validation.confidence, adjustedThreshold, baseThreshold, sgtBonus }, 'SGT bonus applied');
        validation.isValid = true;
      }
    }

    log.info({ outcome: validation.isValid ? 'PASS' : 'FAIL', confidence: validation.confidence, sgt: bounty.sgtVerified }, 'validation result');
    log.info({ reasoning: validation.reasoning }, 'validation reasoning');

    // Resolve on-chain
    const success = validation.isValid;
    const secrets = await getMissionSecrets(bountyId);
    const { signature, challengeEndsAt, singularityWon } = await resolveBountyOnChain(
      bounty.bountyPda,
      bounty.playerWallet,
      success,
      secrets?.missionIdBytes,
      secrets?.salt
    );

    // Update bounty status
    await updateBountyStatus(
      bountyId,
      success ? 'won' : 'lost',
      signature,
      new Date(challengeEndsAt * 1000),
    );

    // Build response
    const response: SubmitPhotoResponse = {
      status: success ? 'won' : 'lost',
      validation,
      transactionSignature: signature,
      bountyPda: bounty.bountyPda,
      challengeEndsAt,
    };

    if (success) {
      response.payout = formatSkr(bounty.entryAmount * 2n);
      response.singularityWon = singularityWon;

      if (singularityWon) {
        log.info({ playerWallet: bounty.playerWallet }, 'SINGULARITY WON');
      }
    }

    log.info({ bountyId, outcome: success ? 'WON' : 'LOST' }, 'bounty resolved');

    return res.status(200).json({
      success: true,
      data: response,
    } as ApiResponse<SubmitPhotoResponse>);
    } finally {
      await releaseBountyLock(bountyId);
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'submit photo error');
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

/**
 * POST /api/bounty/dispute
 * Public disputes are disabled for the current release. Keep the endpoint
 * fail-closed so older clients do not submit a paid dispute transaction.
 */
router.post('/dispute', bountySubmitLimiter, async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Public disputes are disabled in this release',
  } as ApiResponse<never>);
});

/**
 * GET /api/bounty/:id
 * Get bounty status
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bounty = await getBounty(req.params.id);
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
        bountyPda: bounty.bountyPda,
        challengeEndsAt: bounty.challengeEndsAt?.toISOString() ?? null,
        disputeTransactionSignature: bounty.disputeTransactionSignature ?? null,
        disputedAt: bounty.disputedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'get bounty error');
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
    const bounty = await getPlayerActiveBounty(req.params.wallet);
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
        bountyPda: bounty.bountyPda,
        challengeEndsAt: bounty.challengeEndsAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'get player bounty error');
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse<never>);
  }
});

export default router;
