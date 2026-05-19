import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
  AcceptBountyInstructionVersion,
  ActiveBounty,
  Tier,
  BountyStatus,
  ENTRY_AMOUNTS,
  TIER_DURATIONS,
} from '../types';
import { getRandomMission, getMissionById } from '../data/missions';
import { getRedis, RK, redisAcquireLock, redisReleaseLock } from './redis.service';
import {
  loadActiveBounty,
  loadAllActiveBounties,
  loadPlayerActiveBountyId,
  persistActiveBounty,
  removePersistedActiveBounty,
} from './bounty-persistence.service';
import { childLogger } from './logger.service';

const log = childLogger('bounty');

// In-memory fallback for when Redis is unavailable. On mainnet, REDIS_URL must
// be set — otherwise a backend restart drops every in-flight bounty and
// horizontal scale-outs desync. See config.redis.url.
const activeBounties = new Map<string, ActiveBounty>();

// Index by player wallet for quick lookup
const bountyByPlayer = new Map<string, string>();

// Mission commitment secrets for commit-reveal (bountyId → { missionIdBytes, salt }).
// Mirrored to Redis so restart doesn't lose them (without them we can't reveal on-chain).
const missionSecrets = new Map<string, { missionIdBytes: Buffer; salt: Buffer }>();

// Distributed locks live in Redis (multi-instance + crash-resistant via TTL).
// In-memory Set is the dev fallback when REDIS_URL is unset; the redis helpers
// auto-fallback to "always acquire" when no Redis client is configured, so
// the local Set guards a single-process run.
const walletLocks = new Set<string>();
const bountyLocks = new Set<string>();
const WALLET_LOCK_TTL_SECONDS = 60;
const BOUNTY_LOCK_TTL_SECONDS = 120; // submit handler can run > 60s with Claude Vision

export async function acquireWalletLock(wallet: string): Promise<boolean> {
  if (walletLocks.has(wallet)) return false;
  const got = await redisAcquireLock(RK.walletLock(wallet), WALLET_LOCK_TTL_SECONDS);
  if (!got) return false;
  walletLocks.add(wallet);
  return true;
}

export async function releaseWalletLock(wallet: string): Promise<void> {
  walletLocks.delete(wallet);
  await redisReleaseLock(RK.walletLock(wallet));
}

export async function acquireBountyLock(bountyId: string): Promise<boolean> {
  if (bountyLocks.has(bountyId)) return false;
  const got = await redisAcquireLock(RK.bountyLock(bountyId), BOUNTY_LOCK_TTL_SECONDS);
  if (!got) return false;
  bountyLocks.add(bountyId);
  return true;
}

export async function releaseBountyLock(bountyId: string): Promise<void> {
  bountyLocks.delete(bountyId);
  await redisReleaseLock(RK.bountyLock(bountyId));
}

// Store prepared bounty data (from /prepare endpoint, before on-chain tx)
// Keyed by bountyPda → prepared data
export interface PreparedBounty {
  prepareId?: string;
  bountyPda?: string;
  tier: Tier;
  instructionVersion: AcceptBountyInstructionVersion;
  entryAmount: string;
  playerWallet: string;
  timestamp: number;
  missionId: string;
  missionDescription: string;
  missionIdBytes: Buffer;
  salt: Buffer;
  commitment: Buffer;
  createdAt: number;
}
const preparedBounties = new Map<string, PreparedBounty>();
const preparedBountiesById = new Map<string, PreparedBounty>();

interface SubmitTokenRecord {
  tokenHash: string;
  playerWallet: string;
}

const submitTokens = new Map<string, SubmitTokenRecord>();


/**
 * Create a new bounty for a player
 */
export async function createBounty(
  playerWallet: string,
  tier: Tier,
  bountyPda: string,
  transactionSignature?: string,
  sgtVerified?: boolean,
  preparedMissionId?: string,
  preparedEntryAmount?: bigint
): Promise<{ bounty: ActiveBounty; missionDescription: string }> {
  // Check if player already has an active bounty
  const existing = await getPlayerActiveBounty(playerWallet);
  if (existing) {
    throw new Error('Player already has an active bounty');
  }

  // Use prepared mission if provided, otherwise get random
  const mission = preparedMissionId
    ? getMissionById(preparedMissionId) || getRandomMission(tier)
    : getRandomMission(tier);

  // Calculate expiration
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TIER_DURATIONS[tier] * 1000);

  // Create bounty record
  const bounty: ActiveBounty = {
    id: uuidv4(),
    missionId: mission.id,
    playerWallet,
    tier,
    entryAmount: preparedEntryAmount ?? ENTRY_AMOUNTS[tier],
    status: 'pending',
    createdAt: now,
    expiresAt,
    bountyPda,
    transactionSignature,
    sgtVerified: sgtVerified || false,
  };

  // Store bounty. Redis is durable/shared truth on production; Maps are a
  // read-through cache and local-dev fallback.
  await persistActiveBounty(bounty);
  activeBounties.set(bounty.id, bounty);
  bountyByPlayer.set(playerWallet, bounty.id);

  log.info({ bountyId: bounty.id, playerWallet, mission: mission.description }, 'bounty created');

  return { bounty, missionDescription: mission.description };
}

/**
 * Get bounty by ID
 */
export async function getBounty(bountyId: string): Promise<ActiveBounty | undefined> {
  const cached = activeBounties.get(bountyId);
  if (cached) return cached;

  const restored = await loadActiveBounty(bountyId);
  if (restored) {
    activeBounties.set(restored.id, restored);
    bountyByPlayer.set(restored.playerWallet, restored.id);
  }
  return restored;
}

/**
 * Get active bounty for a player
 */
export async function getPlayerActiveBounty(playerWallet: string): Promise<ActiveBounty | undefined> {
  const bountyId =
    bountyByPlayer.get(playerWallet) ?? (await loadPlayerActiveBountyId(playerWallet));
  if (!bountyId) return undefined;

  const bounty = await getBounty(bountyId);
  if (!bounty || !['pending', 'validating', 'disputed'].includes(bounty.status)) {
    return undefined;
  }

  if (bounty.status === 'disputed') {
    try {
      const { getBountyOnChain } = await import('./solana.service');
      const onChainBounty = await getBountyOnChain(bounty.bountyPda);
      const onChainStatus = Object.keys(onChainBounty?.status || {})[0]?.toLowerCase();
      if (['won', 'lost', 'cancelled'].includes(onChainStatus)) {
        activeBounties.delete(bounty.id);
        bountyByPlayer.delete(bounty.playerWallet);
        await removePersistedActiveBounty(bounty);
        return undefined;
      }
    } catch {
      // If RPC is temporarily unavailable, keep the dispute active locally.
    }
  }

  return bounty;
}

/**
 * Update bounty status
 */
export async function updateBountyStatus(
  bountyId: string,
  status: BountyStatus,
  transactionSignature?: string,
  challengeEndsAt?: Date
): Promise<ActiveBounty | undefined> {
  const bounty = await getBounty(bountyId);
  if (!bounty) return undefined;

  bounty.status = status;
  if (transactionSignature) {
    bounty.transactionSignature = transactionSignature;
  }
  if (challengeEndsAt) {
    bounty.challengeEndsAt = challengeEndsAt;
  }

  activeBounties.set(bounty.id, bounty);
  bountyByPlayer.set(bounty.playerWallet, bounty.id);
  await persistActiveBounty(bounty);

  log.info({ bountyId, status }, 'bounty updated');

  return bounty;
}

export async function markBountyDisputed(
  bountyId: string,
  disputeTransactionSignature: string,
): Promise<ActiveBounty | undefined> {
  const bounty = await getBounty(bountyId);
  if (!bounty) return undefined;

  bounty.status = 'disputed';
  bounty.disputeTransactionSignature = disputeTransactionSignature;
  bounty.disputedAt = new Date();

  activeBounties.set(bounty.id, bounty);
  bountyByPlayer.set(bounty.playerWallet, bounty.id);
  await persistActiveBounty(bounty);

  log.info({ bountyId, status: 'disputed' }, 'bounty disputed');

  return bounty;
}

/**
 * Check if bounty has expired
 */
export function isBountyExpired(bounty: ActiveBounty): boolean {
  return new Date() > bounty.expiresAt;
}

/**
 * Get mission for a bounty
 */
export async function getBountyMission(bountyId: string) {
  const bounty = await getBounty(bountyId);
  if (!bounty) return undefined;

  return getMissionById(bounty.missionId);
}

/**
 * Store mission commitment secrets for commit-reveal. Mirrors to Redis when
 * available so backend restart doesn't orphan in-flight bounties.
 */
export async function storeMissionSecrets(
  bountyId: string,
  missionIdBytes: Buffer,
  salt: Buffer
): Promise<void> {
  missionSecrets.set(bountyId, { missionIdBytes, salt });
  const r = await getRedis();
  if (r) {
    await r.set(
      RK.missionSecrets(bountyId),
      JSON.stringify({
        m: missionIdBytes.toString('base64'),
        s: salt.toString('base64'),
      }),
      { EX: 24 * 60 * 60 } // keep for 24h — plenty for dispute + finalize windows
    );
  }
}

/**
 * Get mission commitment secrets for commit-reveal. Falls back to Redis on
 * memory miss (recovers from backend restart mid-bounty).
 */
export async function getMissionSecrets(
  bountyId: string
): Promise<{ missionIdBytes: Buffer; salt: Buffer } | undefined> {
  const cached = missionSecrets.get(bountyId);
  if (cached) return cached;

  const r = await getRedis();
  if (!r) return undefined;
  const raw = await r.get(RK.missionSecrets(bountyId));
  if (!raw) return undefined;

  try {
    const { m, s } = JSON.parse(raw) as { m: string; s: string };
    const secrets = {
      missionIdBytes: Buffer.from(m, 'base64'),
      salt: Buffer.from(s, 'base64'),
    };
    missionSecrets.set(bountyId, secrets); // repopulate in-memory cache
    return secrets;
  } catch {
    return undefined;
  }
}

/**
 * Store prepared bounty data (from /prepare, before on-chain tx).
 * Mirrored to Redis with 5-min TTL so restart doesn't break /start.
 */
export async function storePreparedBounty(bountyPda: string, data: PreparedBounty): Promise<void> {
  const prepared = { ...data, bountyPda };

  preparedBounties.set(bountyPda, prepared);
  setTimeout(() => preparedBounties.delete(bountyPda), 5 * 60 * 1000);
  if (prepared.prepareId) {
    preparedBountiesById.set(prepared.prepareId, prepared);
    setTimeout(() => {
      if (prepared.prepareId) preparedBountiesById.delete(prepared.prepareId);
    }, 5 * 60 * 1000);
  }

  const r = await getRedis();
  if (r) {
    const serialized = serializePreparedBounty(prepared);
    await r.set(RK.preparedBounty(bountyPda), serialized, { EX: 5 * 60 });
    if (prepared.prepareId) {
      await r.set(RK.preparedBountyById(prepared.prepareId), serialized, { EX: 5 * 60 });
    }
  }
}

/**
 * Get prepared bounty data (non-destructive for retry safety).
 * Data auto-expires via setTimeout in storePreparedBounty + Redis TTL.
 */
export async function getPreparedBounty(bountyPda: string): Promise<PreparedBounty | undefined> {
  const cached = preparedBounties.get(bountyPda);
  if (cached) return cached;

  const r = await getRedis();
  if (!r) return undefined;
  const raw = await r.get(RK.preparedBounty(bountyPda));
  if (!raw) return undefined;

  try {
    const prepared = deserializePreparedBounty(raw);
    preparedBounties.set(bountyPda, prepared); // repopulate in-memory cache
    if (prepared.prepareId) preparedBountiesById.set(prepared.prepareId, prepared);
    return prepared;
  } catch {
    return undefined;
  }
}

export async function getPreparedBountyById(prepareId: string): Promise<PreparedBounty | undefined> {
  const cached = preparedBountiesById.get(prepareId);
  if (cached) return cached;

  const r = await getRedis();
  if (!r) return undefined;
  const raw = await r.get(RK.preparedBountyById(prepareId));
  if (!raw) return undefined;

  try {
    const prepared = deserializePreparedBounty(raw);
    preparedBountiesById.set(prepareId, prepared);
    if (prepared.bountyPda) preparedBounties.set(prepared.bountyPda, prepared);
    return prepared;
  } catch {
    return undefined;
  }
}

export async function issueBountySubmitToken(
  bountyId: string,
  playerWallet: string,
  ttlSeconds: number
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const record: SubmitTokenRecord = {
    tokenHash: hashSubmitToken(token),
    playerWallet,
  };
  const ttl = Math.max(60, ttlSeconds);

  submitTokens.set(bountyId, record);
  setTimeout(() => submitTokens.delete(bountyId), ttl * 1000);

  const r = await getRedis();
  if (r) {
    await r.set(RK.bountySubmitToken(bountyId), JSON.stringify(record), { EX: ttl });
  }

  return token;
}

export async function verifyBountySubmitToken(
  bountyId: string,
  token: string,
  playerWallet: string
): Promise<boolean> {
  const record = await getSubmitTokenRecord(bountyId);
  if (!record || record.playerWallet !== playerWallet) return false;

  const expected = Buffer.from(record.tokenHash, 'hex');
  const actual = Buffer.from(hashSubmitToken(token), 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function serializePreparedBounty(data: PreparedBounty): string {
  // Serialize buffers as base64 for JSON round-trip.
  return JSON.stringify({
    ...data,
    missionIdBytes: data.missionIdBytes.toString('base64'),
    salt: data.salt.toString('base64'),
    commitment: data.commitment.toString('base64'),
  });
}

function deserializePreparedBounty(raw: string): PreparedBounty {
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    instructionVersion: (parsed.instructionVersion ?? 1) as AcceptBountyInstructionVersion,
    entryAmount: parsed.entryAmount ?? ENTRY_AMOUNTS[parsed.tier as Tier].toString(),
    missionIdBytes: Buffer.from(parsed.missionIdBytes, 'base64'),
    salt: Buffer.from(parsed.salt, 'base64'),
    commitment: Buffer.from(parsed.commitment, 'base64'),
  };
}

async function getSubmitTokenRecord(bountyId: string): Promise<SubmitTokenRecord | undefined> {
  const cached = submitTokens.get(bountyId);
  if (cached) return cached;

  const r = await getRedis();
  if (!r) return undefined;
  const raw = await r.get(RK.bountySubmitToken(bountyId));
  if (!raw) return undefined;

  try {
    const record = JSON.parse(raw) as SubmitTokenRecord;
    submitTokens.set(bountyId, record);
    return record;
  } catch {
    return undefined;
  }
}

function hashSubmitToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Mark bounty as validating (photo submitted)
 */
export async function markBountyValidating(bountyId: string): Promise<boolean> {
  const bounty = await getBounty(bountyId);
  if (!bounty || bounty.status !== 'pending') return false;

  bounty.status = 'validating';
  activeBounties.set(bounty.id, bounty);
  await persistActiveBounty(bounty);
  return true;
}

export async function hydrateActiveBountiesFromRedis(): Promise<number> {
  const restored = await loadAllActiveBounties();
  for (const bounty of restored) {
    activeBounties.set(bounty.id, bounty);
    bountyByPlayer.set(bounty.playerWallet, bounty.id);
  }
  if (restored.length > 0) {
    log.info({ restored: restored.length }, 'restored active bounties from redis');
  }
  return restored.length;
}

/**
 * For every Pending bounty whose timer has lapsed, call propose_resolution(false)
 * on chain. CRITICAL for the economic model — without this, a player can wait
 * out the timer (3min) + 1h cancel grace period and reclaim their FULL entry
 * via cancel_bounty, driving the loss rate to 0% and bleeding the house.
 *
 * Idempotent: bounty lock + status guard prevents double-processing if a player
 * happens to /submit just as expiration kicks in.
 */
export async function expireAndResolveOldBounties(): Promise<number> {
  await hydrateActiveBountiesFromRedis();
  const now = new Date();
  let resolvedCount = 0;

  // Lazy-import to avoid module-init order issues
  const { resolveBountyOnChain } = await import('./solana.service');

  const candidates: Array<{ id: string; bountyPda: string; playerWallet: string }> = [];
  for (const [id, bounty] of activeBounties) {
    if (bounty.status === 'pending' && now > bounty.expiresAt) {
      candidates.push({ id, bountyPda: bounty.bountyPda, playerWallet: bounty.playerWallet });
    }
  }

  for (const { id, bountyPda, playerWallet } of candidates) {
    if (!(await acquireBountyLock(id))) continue; // skip — submit handler is already running
    try {
      const bounty = activeBounties.get(id);
      if (!bounty || bounty.status !== 'pending' || now <= bounty.expiresAt) continue;

      const secrets = await getMissionSecrets(id);
      if (!secrets) {
        log.error({ bountyId: id }, 'expirer: missing mission secrets — cannot reveal/propose. Marking expired locally only.');
        await updateBountyStatus(id, 'expired');
        continue;
      }

      await updateBountyStatus(id, 'validating'); // prevent submit handler from racing in
      const { signature } = await resolveBountyOnChain(
        bountyPda,
        playerWallet,
        false, // forced loss for timer expiry
        secrets.missionIdBytes,
        secrets.salt,
      );
      await updateBountyStatus(id, 'lost', signature);
      resolvedCount++;
      log.info({ bountyId: id, signature }, 'expirer: bounty timed out → propose_resolution(false)');
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : err, bountyId: id }, 'expirer: failed to resolve expired bounty');
      // leave as-is for next cycle to retry
      const bounty = activeBounties.get(id);
      if (bounty && bounty.status === 'validating') {
        await updateBountyStatus(id, 'pending');
      }
    } finally {
      await releaseBountyLock(id);
    }
  }

  return resolvedCount;
}

/**
 * Get stats for monitoring
 */
export async function getBountyStats() {
  await hydrateActiveBountiesFromRedis();
  let pending = 0;
  let validating = 0;
  let won = 0;
  let lost = 0;
  let expired = 0;
  let sgtBounties = 0;
  let sgtWins = 0;
  let attestedBounties = 0;

  for (const bounty of activeBounties.values()) {
    if (bounty.sgtVerified) {
      sgtBounties++;
      if (bounty.status === 'won') sgtWins++;
    }
    if (bounty.attestationType && bounty.attestationType !== 'none') {
      attestedBounties++;
    }
    switch (bounty.status) {
      case 'pending':
        pending++;
        break;
      case 'validating':
        validating++;
        break;
      case 'won':
        won++;
        break;
      case 'lost':
        lost++;
        break;
      case 'expired':
        expired++;
        break;
    }
  }

  return {
    pending, validating, won, lost, expired,
    total: activeBounties.size,
    sgtBounties, sgtWins, attestedBounties,
  };
}

/**
 * Cleanup old completed bounties (call periodically)
 */
export async function cleanupOldBounties(maxAgeHours: number = 24): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  let removedCount = 0;

  for (const [id, bounty] of activeBounties) {
    if (bounty.status !== 'pending' && bounty.status !== 'validating' && bounty.createdAt < cutoff) {
      activeBounties.delete(id);
      bountyByPlayer.delete(bounty.playerWallet);
      missionSecrets.delete(id);
      await removePersistedActiveBounty(bounty);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    log.info({ removedCount }, 'cleaned up old bounties');
  }

  return removedCount;
}

// Periodic interval handles managed by scheduler.service — start/stop are
// wired into the server lifecycle so SIGTERM cleanly tears them down.
let expirerHandle: NodeJS.Timeout | null = null;
let cleanupHandle: NodeJS.Timeout | null = null;

export function startBountyWorkers(): void {
  if (expirerHandle || cleanupHandle) return;
  void hydrateActiveBountiesFromRedis().catch(err =>
    log.error({ err: err instanceof Error ? err.message : err }, 'active bounty hydration failed')
  );
  // Expirer — 30s cadence keeps the cancel_bounty exploit window short
  expirerHandle = setInterval(() => {
    expireAndResolveOldBounties().catch(err =>
      log.error({ err: err instanceof Error ? err.message : err }, 'expirer tick failed')
    );
  }, 30_000);
  // Old-bounty memory cleanup (terminal-state only) every hour
  cleanupHandle = setInterval(() => {
    cleanupOldBounties(24).catch(err =>
      log.error({ err: err instanceof Error ? err.message : err }, 'bounty cleanup failed')
    );
  }, 60 * 60 * 1000);
  log.info('bounty workers started');
}

export function stopBountyWorkers(): void {
  if (expirerHandle) {
    clearInterval(expirerHandle);
    expirerHandle = null;
  }
  if (cleanupHandle) {
    clearInterval(cleanupHandle);
    cleanupHandle = null;
  }
  log.info('bounty workers stopped');
}
