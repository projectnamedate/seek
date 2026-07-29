import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import {
  ApiResponse,
  StartBountyResponse,
  SubmitPhotoResponse,
  Tier,
  AcceptBountyInstructionVersion,
  ENTRY_AMOUNTS,
  LEGACY_ENTRY_AMOUNTS,
  SKR_MULTIPLIER,
  TIER_CONFIDENCE_THRESHOLDS,
  ActiveBounty,
} from '../types';
import {
  createBounty,
  getBounty,
  getPlayerActiveBounty,
  updateBountyStatus,
  isBountyExpired,
  getBountyMission,
  markBountyValidating,
  setBountyResolutionOutcome,
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
  markMissionDelivered,
  recoverBountyAfterValidationError,
} from '../services/bounty.service';
import { extractExifMetadata, formatMetadata } from '../services/exif.service';
import { validatePhoto, isValidImageFormat, checkImageSize, canApplySgtConfidenceBonus } from '../services/ai.service';
import {
  deriveBountyPda,
  formatSkr,
  generateMissionCommitment,
  getCurrentSlotAndTimestamp,
  resolveBountyOnChain,
  recoverAcceptedBountyAccount,
  getBountyOnChain,
  bountyStatusName,
  isPaymentRetrySafe,
  verifyTransaction,
} from '../services/solana.service';
import { getFinalizerSafetyPause } from '../services/finalizer.service';
import { getRandomMission } from '../data/missions';
import { PublicKey } from '@solana/web3.js';
import { isWalletSGTVerified, verifySGTOwnershipForWallet } from '../services/sgt.service';
import {
  BLOCKED_BOUNTY_ERROR,
  isBlockedBountyActor,
} from '../services/bounty-blocklist.service';
import {
  attestationService,
  AttestationPayload,
  mergeAttestationMetadata,
} from '../services/attestation.service';
import {
  BountySession,
  BountySessionError,
  verifyBountySessionToken,
} from '../services/bounty-session.service';
import {
  getIdentityDailyWinStatus,
  identityForBountyLimits,
  recordIdentityDailyWin,
  reserveWalletDailyBounty,
} from '../services/wallet-bounty-limit.service';
import { validate } from '../middleware/validate.middleware';
import { verifyWalletAuthRequest } from '../middleware/auth.middleware';
import { bountyPrepareLimiter, bountyStartLimiter, bountySubmitLimiter } from '../middleware/rateLimiter.middleware';
import { childLogger } from '../services/logger.service';
import { config } from '../config';
import { permissionPreflightSchema } from '../services/permission-preflight.service';

const log = childLogger('bounty-routes');

const router = Router();
const CURRENT_CLIENT_PROTOCOL_VERSION = 4;

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
  recentBlockhash: z.string().min(32).max(64).optional(),
  lastValidBlockHeight: z.number().int().positive().optional(),
  prepareId: z.string().min(32).max(128).optional(),
});

const submitPhotoSchema = z.object({
  bountyId: z.string().uuid('Invalid bounty ID format'),
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address').optional(),
  submitToken: z.string().min(32).max(128).optional(),
});

const acknowledgeMissionSchema = z.object({
  bountyId: z.string().uuid('Invalid bounty ID format'),
  submitToken: z.string().min(32).max(128),
});

// Prepare bounty schema (pre-transaction)
const prepareBountySchema = z.object({
  tier: z.number().int().min(1).max(3) as z.ZodType<Tier>,
  playerWallet: z.string().regex(base58Pattern, 'Invalid Solana address'),
  permissionsConfirmed: permissionPreflightSchema,
  clientProtocolVersion: z.number().int().min(1).max(CURRENT_CLIENT_PROTOCOL_VERSION).optional(),
});

function instructionVersionForClient(clientProtocolVersion?: number): AcceptBountyInstructionVersion {
  return clientProtocolVersion && clientProtocolVersion >= 2 ? 2 : 1;
}

function entryAmountsForInstruction(version: AcceptBountyInstructionVersion): Record<Tier, bigint> {
  return version === 2 ? ENTRY_AMOUNTS : LEGACY_ENTRY_AMOUNTS;
}

function wholeSkr(baseUnits: bigint): number {
  return Number(baseUnits / SKR_MULTIPLIER);
}

function sendUndeliveredExpiredResponse(res: Response, bounty: ActiveBounty) {
  const cancelAvailableAt = Math.floor(bounty.expiresAt.getTime() / 1000) + 3600;
  return res.status(410).json({
    success: false,
    error: 'The mission window expired before delivery. Your entry remains recoverable on-chain.',
    data: {
      recoveryRequired: true,
      bountyPda: bounty.bountyPda,
      cancelAvailableAt,
    },
  });
}

async function buildStartBountyResponse(
  bounty: ActiveBounty,
  missionDescription: string,
): Promise<StartBountyResponse> {
  const submitTokenTtl =
    Math.ceil((bounty.expiresAt.getTime() - Date.now()) / 1000) + 10 * 60;
  const submitToken = await issueBountySubmitToken(
    bounty.id,
    bounty.playerWallet,
    submitTokenTtl,
  );

  return {
    bountyId: bounty.id,
    mission: {
      id: bounty.missionId,
      description: missionDescription,
    },
    expiresAt: bounty.expiresAt.toISOString(),
    bountyPda: bounty.bountyPda,
    submitToken,
    sessionRequired: config.sessionProof.requireForBounties,
    entryAmountSkr: wholeSkr(bounty.entryAmount),
    returnAmountSkr: wholeSkr(bounty.entryAmount * 2n),
  };
}

async function verifiedSgtMintForWallet(playerWallet: string): Promise<string | null> {
  const cached = await isWalletSGTVerified(playerWallet);
  const result = cached?.verified
    ? cached
    : await verifySGTOwnershipForWallet(playerWallet);

  return result?.sgtMintAddress ?? null;
}

function sendBlockedBountyResponse(res: Response) {
  return res.status(403).json({
    success: false,
    error: BLOCKED_BOUNTY_ERROR,
  } as ApiResponse<never>);
}

function sendDailyWinLimitResponse(
  res: Response,
  dailyWinLimit: { limit: number; resetAt: Date },
) {
  return res.status(429).json({
    success: false,
    error: 'Daily win limit reached',
    data: {
      limit: dailyWinLimit.limit,
      resetAt: dailyWinLimit.resetAt.toISOString(),
    },
  });
}

type BountySessionResolution =
  | { ok: true; session?: BountySession }
  | { ok: false; status: number; error: string };

async function resolveBountySessionForWallet(
  req: Request,
  playerWallet: string,
  options: { required: boolean },
): Promise<BountySessionResolution> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (!options.required) return { ok: true };
    return { ok: false, status: 401, error: 'Bounty session proof required' };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, error: 'Invalid bounty session authorization header' };
  }

  try {
    const session = await verifyBountySessionToken(match[1]);
    if (!session) {
      return { ok: false, status: 401, error: 'Invalid or expired bounty session' };
    }
    if (session.walletAddress !== playerWallet) {
      return { ok: false, status: 403, error: 'Bounty session wallet mismatch' };
    }
    if (session.clientProtocolVersion < config.sessionProof.minClientProtocolVersion) {
      return {
        ok: false,
        status: 426,
        error: `Client protocol version ${config.sessionProof.minClientProtocolVersion} required`,
      };
    }
    return { ok: true, session };
  } catch (error) {
    if (error instanceof BountySessionError) {
      return { ok: false, status: error.status, error: error.message };
    }
    throw error;
  }
}

function sendBountySessionError(res: Response, result: Extract<BountySessionResolution, { ok: false }>) {
  return res.status(result.status).json({
    success: false,
    error: result.error,
  } as ApiResponse<never>);
}

/**
 * POST /api/bounty/prepare
 * Prepare a bounty before on-chain transaction.
 * Returns commitment, timestamp, and bountyPda for the mobile client
 * to build the accept_bounty transaction.
 * Session-aware but backward compatible: the off-chain session token is stored
 * when present, while prepareId prevents anonymous PDA-poisoning for old builds.
 */
router.post('/prepare', bountyPrepareLimiter, validate(prepareBountySchema), async (req: Request, res: Response) => {
  try {
    const { tier, playerWallet, clientProtocolVersion } = req.body as {
      tier: Tier;
      playerWallet: string;
      clientProtocolVersion?: number;
    };
    const instructionVersion = instructionVersionForClient(clientProtocolVersion);
    const entryAmount = entryAmountsForInstruction(instructionVersion)[tier];
    const returnAmount = entryAmount * 2n;
    const sessionResult = await resolveBountySessionForWallet(req, playerWallet, {
      required: config.sessionProof.requireForBounties,
    });
    if (!sessionResult.ok) {
      return sendBountySessionError(res, sessionResult);
    }
    const bountySession = sessionResult.session;

    if (isBlockedBountyActor({ walletAddress: playerWallet })) {
      return sendBlockedBountyResponse(res);
    }
    const sgtMintAddress = bountySession?.sgtMintAddress
      ?? await verifiedSgtMintForWallet(playerWallet);
    if (isBlockedBountyActor({ walletAddress: playerWallet, sgtMintAddress })) {
      return sendBlockedBountyResponse(res);
    }

    const dailyWinLimit = await getIdentityDailyWinStatus(
      identityForBountyLimits(playerWallet, sgtMintAddress),
    );
    if (!dailyWinLimit.allowed) {
      return sendDailyWinLimitResponse(res, dailyWinLimit);
    }

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

    // Admission controls belong before payment. Once an exact prepared
    // accept_bounty lands, /start must deliver or recover it rather than
    // introducing a new post-payment denial.
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
      instructionVersion,
      entryAmount: entryAmount.toString(),
      playerWallet,
      timestamp: Number(timestamp),
      missionId: mission.id,
      missionDescription: mission.description,
      missionIdBytes,
      salt,
      commitment,
      createdAt: Date.now(),
      sessionId: bountySession?.sessionId,
      sessionSgtMintAddress: bountySession?.sgtMintAddress,
      sessionClientProtocolVersion: bountySession?.clientProtocolVersion,
    });

    log.info(
      {
        bountyPda: bountyPda.toBase58().slice(0, 8),
        tier,
        instructionVersion,
        missionId: mission.id,
        session: Boolean(bountySession),
      },
      'bounty prepared'
    );

    return res.status(200).json({
      success: true,
      data: {
        commitment: Array.from(commitment),
        prepareId,
        timestamp: Number(timestamp),
        bountyPda: bountyPda.toBase58(),
        instructionVersion,
        entryAmount: Number(entryAmount),
        entryAmountSkr: wholeSkr(entryAmount),
        returnAmount: Number(returnAmount),
        returnAmountSkr: wholeSkr(returnAmount),
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
// /start does NOT require legacy wallet-auth headers. New clients attach the
// off-chain bounty session token when present, and verifyTransaction below
// still proves the player authorized the on-chain accept_bounty.
router.post('/start', bountyStartLimiter, validate(startBountySchema), async (req: Request, res: Response) => {
  try {
    const {
      tier,
      bountyPda,
      transactionSignature,
      recentBlockhash,
      lastValidBlockHeight,
      playerWallet,
      prepareId,
    } = req.body;

    // Acquire per-wallet lock (Redis-backed; multi-instance safe)
    if (!(await acquireWalletLock(playerWallet))) {
      return res.status(409).json({
        success: false,
        error: 'Bounty creation already in progress for this wallet',
      } as ApiResponse<never>);
    }

    try {
    // Try to use prepared bounty data (from /prepare endpoint). New clients send
    // prepareId so anonymous callers cannot poison a wallet+bountyPda record.
    const prepared = prepareId
      ? await getPreparedBountyById(prepareId)
      : await getPreparedBounty(bountyPda);

    if (!prepared) {
      if (isBlockedBountyActor({ walletAddress: playerWallet })) {
        return sendBlockedBountyResponse(res);
      }
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

    const sessionResult = await resolveBountySessionForWallet(req, playerWallet, {
      // prepareId is a 256-bit recovery capability bound to the exact wallet,
      // PDA, tier, commitment, and accepted on-chain account. An expired
      // short-lived session must not strand an already-paid entry.
      required: false,
    });
    const bountySession = sessionResult.ok ? sessionResult.session : undefined;

    if (
      prepared.sessionId &&
      bountySession &&
      bountySession.sessionId !== prepared.sessionId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Bounty session does not match prepared bounty',
      } as ApiResponse<never>);
    }
    if (
      prepared.sessionSgtMintAddress &&
      bountySession &&
      bountySession.sgtMintAddress !== prepared.sessionSgtMintAddress
    ) {
      return res.status(403).json({
        success: false,
        error: 'Bounty session SGT does not match prepared bounty',
      } as ApiResponse<never>);
    }
    // /start is a recovery endpoint as well as the initial handoff. If the
    // first response was lost after createBounty persisted, return the exact
    // same mission and a fresh submit token. Never ask this wallet to pay
    // again for the same prepared PDA.
    const existing = await getPlayerActiveBounty(playerWallet);
    if (existing) {
      if (existing.bountyPda !== bountyPda) {
        return res.status(409).json({
          success: false,
          error: 'Player already has a different active bounty',
        } as ApiResponse<never>);
      }

      const mission = await getBountyMission(existing.id);
      if (!mission) {
        return res.status(500).json({
          success: false,
          error: 'Mission not found for existing paid bounty',
        } as ApiResponse<never>);
      }
      if (
        existing.requiresMissionAck &&
        !existing.missionDeliveredAt &&
        isBountyExpired(existing)
      ) {
        const onChainStatus = bountyStatusName(
          await getBountyOnChain(existing.bountyPda),
        );
        if (onChainStatus === 'cancelled') {
          await updateBountyStatus(existing.id, 'cancelled');
          return res.status(200).json({
            success: true,
            data: {
              paymentRecovered: true,
              bountyPda: existing.bountyPda,
            },
          });
        }
        return sendUndeliveredExpiredResponse(res, existing);
      }

      const response = await buildStartBountyResponse(existing, mission.description);
      // Delivery state must not depend solely on a client-controlled ACK. If a
      // player could read the mission and deliberately withhold ACK, they
      // could wait out a miss and reclaim the entry through cancel_bounty.
      // Persist delivery before returning the mission; the durable mobile
      // receipt makes this exact bounty recoverable if the response is lost.
      await markMissionDelivered(existing.id);
      log.info({ bountyId: existing.id }, 'resumed existing paid bounty');
      return res.status(200).json({
        success: true,
        data: response,
      } as ApiResponse<StartBountyResponse>);
    }

    // Verify on-chain transaction actually contains the prepared accept_bounty
    // call for THIS player, THIS bountyPda, THIS tier, and THIS amount.
    // Confirmation status alone is not enough — an attacker could paste any
    // random confirmed tx sig.
    const expectedAcceptance = {
      instructionVersion: prepared.instructionVersion,
      tier: prepared.tier,
      entryAmount: BigInt(prepared.entryAmount),
      timestamp: prepared.timestamp,
      commitment: prepared.commitment,
    };
    let acceptedAccount: any | null = null;
    if (transactionSignature) {
      const txVerified = await verifyTransaction(
        transactionSignature,
        playerWallet,
        bountyPda,
        expectedAcceptance,
      );
      if (!txVerified) {
        const safeToRetryPayment = await isPaymentRetrySafe(
          transactionSignature,
          recentBlockhash,
          lastValidBlockHeight,
        );
        return res.status(safeToRetryPayment ? 409 : 425).json({
          success: false,
          error: safeToRetryPayment
            ? 'The previous transaction failed or expired without moving funds. A new payment is now safe.'
            : 'Paid transaction is still confirming. Retry recovery; do not pay again.',
          data: { safeToRetryPayment },
        });
      }
      acceptedAccount = await recoverAcceptedBountyAccount(bountyPda, {
        playerWallet,
        tier: prepared.tier,
        entryAmount: BigInt(prepared.entryAmount),
        commitment: prepared.commitment,
      });
    } else {
      acceptedAccount = await recoverAcceptedBountyAccount(bountyPda, {
        playerWallet,
        tier: prepared.tier,
        entryAmount: BigInt(prepared.entryAmount),
        commitment: prepared.commitment,
      });
      if (!acceptedAccount) {
        if (!recentBlockhash || !lastValidBlockHeight) {
          return res.status(425).json({
            success: false,
            error: 'Payment status is unknown. Retry recovery; do not pay again.',
          } as ApiResponse<never>);
        }
        const safeToRetryPayment = await isPaymentRetrySafe(
          undefined,
          recentBlockhash,
          lastValidBlockHeight,
        );
        return res.status(safeToRetryPayment ? 409 : 425).json({
          success: false,
          error: safeToRetryPayment
            ? 'The previous transaction expired without landing. A new payment is now safe.'
            : 'Wallet return is still settling. Retry recovery; do not pay again.',
          data: { safeToRetryPayment },
        });
      }
    }
    if (bountyStatusName(acceptedAccount) === 'cancelled') {
      return res.status(200).json({
        success: true,
        data: { paymentRecovered: true, bountyPda },
      });
    }

    // Check SGT verification status. A bounty session already binds the wallet
    // to an SGT mint; old clients still use the passive Token-2022 lookup.
    let sgtVerified = false;
    let sgtMintAddress: string | null = null;
    if (prepared.sessionSgtMintAddress) {
      sgtVerified = true;
      sgtMintAddress = prepared.sessionSgtMintAddress;
    } else if (bountySession) {
      sgtVerified = true;
      sgtMintAddress = bountySession.sgtMintAddress;
    } else {
      const cachedSgtResult = await isWalletSGTVerified(playerWallet);
      const sgtResult = cachedSgtResult?.verified
        ? cachedSgtResult
        : await verifySGTOwnershipForWallet(playerWallet);
      sgtVerified = sgtResult?.verified || false;
      sgtMintAddress = sgtResult?.sgtMintAddress ?? null;
    }

    // Create bounty using the prepared mission (not a new random one)
    const { bounty, missionDescription } = await createBounty(
      playerWallet,
      tier,
      bountyPda,
      transactionSignature,
      sgtVerified,
      sgtMintAddress,
      prepared.missionId, // Use the prepared mission, not a random one
      BigInt(prepared.entryAmount),
      prepared.sessionId
        ? {
          sessionId: prepared.sessionId,
          sessionClientProtocolVersion:
            prepared.sessionClientProtocolVersion ?? 3,
        }
        : bountySession
          ? {
            sessionId: bountySession.sessionId,
            sessionClientProtocolVersion: bountySession.clientProtocolVersion,
          }
          : undefined,
      prepared.timestamp,
    );

    // Store prepared mission secrets (must match on-chain commitment)
    await storeMissionSecrets(bounty.id, prepared.missionIdBytes, prepared.salt);
    if (
      bounty.requiresMissionAck &&
      !bounty.missionDeliveredAt &&
      isBountyExpired(bounty)
    ) {
      return sendUndeliveredExpiredResponse(res, bounty);
    }
    const response = await buildStartBountyResponse(bounty, missionDescription);
    await markMissionDelivered(bounty.id);

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
 * POST /api/bounty/ack
 * Confirm the mission response reached a protocol-v4 client. Until this ack,
 * the expiry worker must not turn an undelivered paid mission into a loss.
 */
router.post('/ack', bountyStartLimiter, validate(acknowledgeMissionSchema), async (req: Request, res: Response) => {
  try {
    const { bountyId, submitToken } = req.body;
    const bounty = await getBounty(bountyId);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }
    if (!(await verifyBountySubmitToken(bountyId, submitToken, bounty.playerWallet))) {
      return res.status(403).json({ success: false, error: 'Invalid bounty submit token' });
    }
    if (!(await markMissionDelivered(bountyId))) {
      return res.status(409).json({
        success: false,
        error: `Mission cannot be acknowledged in status ${bounty.status}`,
      });
    }
    return res.status(200).json({ success: true, data: { acknowledged: true } });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'mission ack error');
    return res.status(500).json({ success: false, error: 'Internal server error' });
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

    const sessionResult = await resolveBountySessionForWallet(req, bounty.playerWallet, {
      required: config.sessionProof.requireForBounties || Boolean(bounty.sessionId),
    });
    if (!sessionResult.ok) {
      return sendBountySessionError(res, sessionResult);
    }
    const bountySession = sessionResult.session;

    if (bounty.sessionId && bountySession?.sessionId !== bounty.sessionId) {
      return res.status(403).json({
        success: false,
        error: 'Bounty session does not own this bounty',
      } as ApiResponse<never>);
    }
    if (
      bountySession &&
      bounty.sgtMintAddress &&
      bountySession.sgtMintAddress !== bounty.sgtMintAddress
    ) {
      return res.status(403).json({
        success: false,
        error: 'Bounty session SGT does not own this bounty',
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
      // Keep the local state Pending. The expiry worker owns the durable
      // reveal/propose(false) transition; marking this `expired` here would
      // remove it from that worker and strand the on-chain entry.
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
    await setBountyResolutionOutcome(bountyId, success);
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

    if (success) {
      try {
        const recordedWin = await recordIdentityDailyWin(
          identityForBountyLimits(bounty.playerWallet, bounty.sgtMintAddress),
        );
        if (!recordedWin.allowed) {
          log.warn(
            { bountyId, used: recordedWin.used, limit: recordedWin.limit },
            'daily win cap exceeded after resolution',
          );
        }
      } catch (error) {
        log.error(
          { err: error instanceof Error ? error.message : error, bountyId },
          'failed to record daily win after resolution',
        );
      }
    }

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
    } catch (error) {
      await recoverBountyAfterValidationError(bountyId);
      throw error;
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
