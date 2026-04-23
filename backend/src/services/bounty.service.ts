import { v4 as uuidv4 } from 'uuid';
import { ActiveBounty, Tier, BountyStatus, ENTRY_AMOUNTS, TIER_DURATIONS } from '../types';
import { getRandomMission, getMissionById } from '../data/missions';
import { getRedis, RK } from './redis.service';

// In-memory fallback for when Redis is unavailable. On mainnet, REDIS_URL must
// be set — otherwise a backend restart drops every in-flight bounty and
// horizontal scale-outs desync. See config.redis.url.
const activeBounties = new Map<string, ActiveBounty>();

// Index by player wallet for quick lookup
const bountyByPlayer = new Map<string, string>();

// Mission commitment secrets for commit-reveal (bountyId → { missionIdBytes, salt }).
// Mirrored to Redis so restart doesn't lose them (without them we can't reveal on-chain).
const missionSecrets = new Map<string, { missionIdBytes: Buffer; salt: Buffer }>();

// Mutex locks for race condition prevention
const walletLocks = new Set<string>();  // Per-wallet lock for bounty creation
const bountyLocks = new Set<string>();  // Per-bounty lock for submission

export function acquireWalletLock(wallet: string): boolean {
  if (walletLocks.has(wallet)) return false;
  walletLocks.add(wallet);
  return true;
}

export function releaseWalletLock(wallet: string): void {
  walletLocks.delete(wallet);
}

export function acquireBountyLock(bountyId: string): boolean {
  if (bountyLocks.has(bountyId)) return false;
  bountyLocks.add(bountyId);
  return true;
}

export function releaseBountyLock(bountyId: string): void {
  bountyLocks.delete(bountyId);
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

  console.log(`[Bounty] Created: ${bounty.id} | Player: ${playerWallet} | Mission: ${mission.description}`);

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

  console.log(`[Bounty] Updated: ${bountyId} | Status: ${status}`);

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
 * Expire old bounties (call periodically)
 */
export function expireOldBounties(): number {
  const now = new Date();
  let expiredCount = 0;

  for (const [id, bounty] of activeBounties) {
    if (bounty.status === 'pending' && now > bounty.expiresAt) {
      bounty.status = 'expired';
      expiredCount++;
      console.log(`[Bounty] Expired: ${id}`);
    }
  }

  return expiredCount;
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
    console.log(`[Bounty] Cleaned up ${removedCount} old bounties`);
  }

  return removedCount;
}

// Start periodic cleanup
setInterval(() => {
  expireOldBounties();
}, 30000); // Check every 30 seconds

setInterval(() => {
  cleanupOldBounties(24);
}, 60 * 60 * 1000); // Cleanup every hour
