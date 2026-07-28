import { ActiveBounty, BountyStatus, Tier } from '../types';
import { config } from '../config';
import { getRedis, RK } from './redis.service';

const MIN_ACTIVE_BOUNTY_TTL_SECONDS = 24 * 60 * 60;

export interface SerializedActiveBounty {
  id: string;
  missionId: string;
  playerWallet: string;
  tier: Tier;
  entryAmount: string;
  status: BountyStatus;
  createdAt: string;
  expiresAt: string;
  bountyPda: string;
  transactionSignature?: string;
  disputeTransactionSignature?: string;
  challengeEndsAt?: string;
  disputedAt?: string;
  sgtVerified?: boolean;
  sgtMintAddress?: string;
  sessionId?: string;
  sessionClientProtocolVersion?: number;
  attestationType?: 'none' | 'standard';
  resolutionOutcome?: boolean;
  requiresMissionAck?: boolean;
  missionDeliveredAt?: string;
}

export function serializeActiveBounty(bounty: ActiveBounty): SerializedActiveBounty {
  return {
    ...bounty,
    entryAmount: bounty.entryAmount.toString(),
    createdAt: bounty.createdAt.toISOString(),
    expiresAt: bounty.expiresAt.toISOString(),
    challengeEndsAt: bounty.challengeEndsAt?.toISOString(),
    disputedAt: bounty.disputedAt?.toISOString(),
    missionDeliveredAt: bounty.missionDeliveredAt?.toISOString(),
  };
}

export function deserializeActiveBounty(serialized: SerializedActiveBounty): ActiveBounty {
  const { challengeEndsAt, disputedAt, missionDeliveredAt, ...rest } = serialized;
  const bounty: ActiveBounty = {
    ...rest,
    entryAmount: BigInt(serialized.entryAmount),
    createdAt: new Date(serialized.createdAt),
    expiresAt: new Date(serialized.expiresAt),
  };

  if (challengeEndsAt) {
    bounty.challengeEndsAt = new Date(challengeEndsAt);
  }
  if (disputedAt) {
    bounty.disputedAt = new Date(disputedAt);
  }
  if (missionDeliveredAt) {
    bounty.missionDeliveredAt = new Date(missionDeliveredAt);
  }

  return bounty;
}

export function getActiveBountyTtlSeconds(
  bounty: ActiveBounty,
  now: Date = new Date()
): number {
  const secondsUntilExpiry = Math.max(
    0,
    Math.ceil((bounty.expiresAt.getTime() - now.getTime()) / 1000)
  );
  return Math.max(
    MIN_ACTIVE_BOUNTY_TTL_SECONDS,
    secondsUntilExpiry + MIN_ACTIVE_BOUNTY_TTL_SECONDS
  );
}

async function getRedisForWrite() {
  const r = await getRedis();
  if (!r && config.redis.url) {
    throw new Error('Redis unavailable for active bounty persistence');
  }
  return r;
}

export async function persistActiveBounty(bounty: ActiveBounty): Promise<void> {
  const r = await getRedisForWrite();
  if (!r) return;

  const ttlSeconds = getActiveBountyTtlSeconds(bounty);
  const payload = JSON.stringify(serializeActiveBounty(bounty));

  await r.set(RK.activeBounty(bounty.id), payload, { EX: ttlSeconds });
  await r.set(RK.activeBountyByPlayer(bounty.playerWallet), bounty.id, {
    EX: ttlSeconds,
  });
  await r.sAdd(RK.activeBountiesSet(), bounty.id);
}

export async function loadActiveBounty(bountyId: string): Promise<ActiveBounty | undefined> {
  const r = await getRedis();
  if (!r) return undefined;

  const raw = await r.get(RK.activeBounty(bountyId));
  if (!raw) {
    await r.sRem(RK.activeBountiesSet(), bountyId);
    return undefined;
  }

  try {
    return deserializeActiveBounty(JSON.parse(raw) as SerializedActiveBounty);
  } catch {
    await r.del(RK.activeBounty(bountyId));
    await r.sRem(RK.activeBountiesSet(), bountyId);
    return undefined;
  }
}

export async function loadPlayerActiveBountyId(playerWallet: string): Promise<string | undefined> {
  const r = await getRedis();
  if (!r) return undefined;
  return (await r.get(RK.activeBountyByPlayer(playerWallet))) ?? undefined;
}

export async function loadAllActiveBounties(): Promise<ActiveBounty[]> {
  const r = await getRedis();
  if (!r) return [];

  const ids = await r.sMembers(RK.activeBountiesSet());
  const bounties: ActiveBounty[] = [];
  for (const id of ids) {
    const bounty = await loadActiveBounty(id);
    if (bounty) {
      bounties.push(bounty);
    }
  }
  return bounties;
}

export async function removePersistedActiveBounty(bounty: ActiveBounty): Promise<void> {
  const r = await getRedisForWrite();
  if (!r) return;

  await r.del(RK.activeBounty(bounty.id));
  await r.del(RK.activeBountyByPlayer(bounty.playerWallet));
  await r.sRem(RK.activeBountiesSet(), bounty.id);
}
