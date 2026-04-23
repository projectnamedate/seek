import { v4 as uuidv4 } from 'uuid';
import { ActiveBounty, Tier, BountyStatus, ENTRY_AMOUNTS, TIER_DURATIONS } from '../types';
import { getRandomMission, getMissionById } from '../data/missions';
import { getRedis, RK, redisAcquireLock, redisReleaseLock } from './redis.service';
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
  tier: Tier;
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


/**
 * Create a new bounty for a player
 */
export function createBounty(
  playerWallet: string,
  tier: Tier,
  bountyPda: string,
  transactionSignature?: string,
  sgtVerified?: boolean,
  preparedMissionId?: string
): { bounty: ActiveBounty; missionDescription: string } {
  // Check if player already has an active bounty
  const existingBountyId = bountyByPlayer.get(playerWallet);
  if (existingBountyId) {
    const existing = activeBounties.get(existingBountyId);
    if (existing && existing.status === 'pending') {
      throw new Error('Player already has an active bounty');
    }
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
    entryAmount: ENTRY_AMOUNTS[tier],
    status: 'pending',
    createdAt: now,
    expiresAt,
    bountyPda,
    transactionSignature,
    sgtVerified: sgtVerified || false,
  };

  // Store bounty
  activeBounties.set(bounty.id, bounty);
  bountyByPlayer.set(playerWallet, bounty.id);

  log.info({ bountyId: bounty.id, playerWallet, mission: mission.description }, 'bounty created');

  return { bounty, missionDescription: mission.description };
}

/**
 * Get bounty by ID
 */
export function getBounty(bountyId: string): ActiveBounty | undefined {
  return activeBounties.get(bountyId);
}

/**
 * Get active bounty for a player
 */
export function getPlayerActiveBounty(playerWallet: string): ActiveBounty | undefined {
  const bountyId = bountyByPlayer.get(playerWallet);
  if (!bountyId) return undefined;

  const bounty = activeBounties.get(bountyId);
  if (!bounty || bounty.status !== 'pending') return undefined;

  return bounty;
}

/**
 * Update bounty status
 */
export function updateBountyStatus(
  bountyId: string,
  status: BountyStatus,
  transactionSignature?: string
): ActiveBounty | undefined {
  const bounty = activeBounties.get(bountyId);
  if (!bounty) return undefined;

  bounty.status = status;
  if (transactionSignature) {
    bounty.transactionSignature = transactionSignature;
  }

  log.info({ bountyId, status }, 'bounty updated');

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
export function getBountyMission(bountyId: string) {
  const bounty = activeBounties.get(bountyId);
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
  preparedBounties.set(bountyPda, data);
  setTimeout(() => preparedBounties.delete(bountyPda), 5 * 60 * 1000);

  const r = await getRedis();
  if (r) {
    // Serialize buffers as base64 for JSON round-trip.
    const serialized = JSON.stringify({
      ...data,
      missionIdBytes: data.missionIdBytes.toString('base64'),
      salt: data.salt.toString('base64'),
      commitment: data.commitment.toString('base64'),
    });
    await r.set(RK.preparedBounty(bountyPda), serialized, { EX: 5 * 60 });
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
    const parsed = JSON.parse(raw);
    const prepared: PreparedBounty = {
      ...parsed,
      missionIdBytes: Buffer.from(parsed.missionIdBytes, 'base64'),
      salt: Buffer.from(parsed.salt, 'base64'),
      commitment: Buffer.from(parsed.commitment, 'base64'),
    };
    preparedBounties.set(bountyPda, prepared); // repopulate in-memory cache
    return prepared;
  } catch {
    return undefined;
  }
}

/**
 * Mark bounty as validating (photo submitted)
 */
export function markBountyValidating(bountyId: string): boolean {
  const bounty = activeBounties.get(bountyId);
  if (!bounty || bounty.status !== 'pending') return false;

  bounty.status = 'validating';
  return true;
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
        bounty.status = 'expired';
        continue;
      }

      bounty.status = 'validating'; // prevent submit handler from racing in
      const { signature } = await resolveBountyOnChain(
        bountyPda,
        playerWallet,
        false, // forced loss for timer expiry
        secrets.missionIdBytes,
        secrets.salt,
      );
      updateBountyStatus(id, 'lost', signature);
      resolvedCount++;
      log.info({ bountyId: id, signature }, 'expirer: bounty timed out → propose_resolution(false)');
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : err, bountyId: id }, 'expirer: failed to resolve expired bounty');
      // leave as-is for next cycle to retry
      const bounty = activeBounties.get(id);
      if (bounty && bounty.status === 'validating') bounty.status = 'pending';
    } finally {
      await releaseBountyLock(id);
    }
  }

  return resolvedCount;
}

/**
 * Get stats for monitoring
 */
export function getBountyStats() {
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
export function cleanupOldBounties(maxAgeHours: number = 24): number {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  let removedCount = 0;

  for (const [id, bounty] of activeBounties) {
    if (bounty.status !== 'pending' && bounty.status !== 'validating' && bounty.createdAt < cutoff) {
      activeBounties.delete(id);
      bountyByPlayer.delete(bounty.playerWallet);
      missionSecrets.delete(id);
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
  // Expirer — 30s cadence keeps the cancel_bounty exploit window short
  expirerHandle = setInterval(() => {
    expireAndResolveOldBounties().catch(err =>
      log.error({ err: err instanceof Error ? err.message : err }, 'expirer tick failed')
    );
  }, 30_000);
  // Old-bounty memory cleanup (terminal-state only) every hour
  cleanupHandle = setInterval(() => {
    cleanupOldBounties(24);
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
