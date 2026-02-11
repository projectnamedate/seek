import { v4 as uuidv4 } from 'uuid';
import { ActiveBounty, Tier, BountyStatus, ENTRY_AMOUNTS, TIER_DURATIONS } from '../types';
import { getRandomMission, getMissionById } from '../data/missions';

// In-memory store for active bounties (would use Redis/DB in production)
const activeBounties = new Map<string, ActiveBounty>();

// Index by player wallet for quick lookup
const bountyByPlayer = new Map<string, string>();

// Store mission commitment secrets for commit-reveal
// Keyed by bountyId → { missionIdBytes, salt }
const missionSecrets = new Map<string, { missionIdBytes: Buffer; salt: Buffer }>();

// Logging helper
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Bounty] ${message}`, data ? JSON.stringify(data) : '');
}

/**
 * Create a new bounty for a player
 */
export function createBounty(
  playerWallet: string,
  tier: Tier,
  bountyPda: string,
  transactionSignature?: string
): { bounty: ActiveBounty; missionDescription: string } {
  // Check if player already has an active bounty
  const existingBountyId = bountyByPlayer.get(playerWallet);
  if (existingBountyId) {
    const existing = activeBounties.get(existingBountyId);
    if (existing && existing.status === 'pending') {
      throw new Error('Player already has an active bounty');
    }
  }

  // Get random mission for this tier
  const mission = getRandomMission(tier);

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
 * Store mission commitment secrets for commit-reveal
 */
export function storeMissionSecrets(
  bountyId: string,
  missionIdBytes: Buffer,
  salt: Buffer
): void {
  missionSecrets.set(bountyId, { missionIdBytes, salt });
}

/**
 * Get mission commitment secrets for commit-reveal
 */
export function getMissionSecrets(
  bountyId: string
): { missionIdBytes: Buffer; salt: Buffer } | undefined {
  return missionSecrets.get(bountyId);
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

  for (const bounty of activeBounties.values()) {
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

  return { pending, validating, won, lost, expired, total: activeBounties.size };
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
