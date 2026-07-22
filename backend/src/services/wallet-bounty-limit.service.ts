import { config } from '../config';
import { getRedis, RK } from './redis.service';

interface LocalCounter {
  count: number;
  resetAt: Date;
}

export interface WalletDailyBountyReservation {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

const localCounters = new Map<string, LocalCounter>();
const localWinCounters = new Map<string, LocalCounter>();

export function identityForBountyLimits(
  wallet: string,
  sgtMintAddress?: string | null,
): string {
  return sgtMintAddress ? `sgt:${sgtMintAddress}` : `wallet:${wallet}`;
}

export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function secondsUntilNextUtcDay(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

export async function reserveWalletDailyBounty(
  wallet: string,
  now: Date = new Date()
): Promise<WalletDailyBountyReservation> {
  const limit = config.validation.maxBountiesPerWalletPerDay;
  const day = utcDayKey(now);
  const resetAt = new Date(now.getTime() + secondsUntilNextUtcDay(now) * 1000);

  if (config.redis.url) {
    const r = await getRedis();
    if (!r) {
      return {
        allowed: false,
        limit,
        used: limit,
        remaining: 0,
        resetAt,
      };
    }

    const key = RK.walletDailyBountyLimit(wallet, day);
    const used = await r.incr(key);
    if (used === 1) {
      await r.expire(key, secondsUntilNextUtcDay(now));
    }
    return buildReservation(used, limit, resetAt);
  }

  const key = `${day}:${wallet}`;
  const current = localCounters.get(key);
  if (!current || current.resetAt <= now) {
    localCounters.set(key, { count: 1, resetAt });
    return buildReservation(1, limit, resetAt);
  }

  current.count += 1;
  return buildReservation(current.count, limit, current.resetAt);
}

export async function getWalletDailyBountyStatus(
  wallet: string,
  now: Date = new Date()
): Promise<WalletDailyBountyReservation> {
  const limit = config.validation.maxBountiesPerWalletPerDay;
  const day = utcDayKey(now);
  const resetAt = new Date(now.getTime() + secondsUntilNextUtcDay(now) * 1000);

  if (config.redis.url) {
    const r = await getRedis();
    if (!r) {
      return {
        allowed: false,
        limit,
        used: limit,
        remaining: 0,
        resetAt,
      };
    }

    const raw = await r.get(RK.walletDailyBountyLimit(wallet, day));
    const used = raw ? Number(raw) : 0;
    return buildStatus(used, limit, resetAt);
  }

  const key = `${day}:${wallet}`;
  const current = localCounters.get(key);
  const used = current && current.resetAt > now ? current.count : 0;
  return buildStatus(used, limit, current?.resetAt && current.resetAt > now ? current.resetAt : resetAt);
}

export async function recordIdentityDailyWin(
  identity: string,
  now: Date = new Date(),
): Promise<WalletDailyBountyReservation> {
  const limit = config.validation.maxWinsPerIdentityPerDay;
  const day = utcDayKey(now);
  const resetAt = new Date(now.getTime() + secondsUntilNextUtcDay(now) * 1000);

  if (config.redis.url) {
    const r = await getRedis();
    if (!r) {
      return { allowed: false, limit, used: limit, remaining: 0, resetAt };
    }

    const key = RK.identityDailyWinLimit(identity, day);
    const used = await r.incr(key);
    if (used === 1) {
      await r.expire(key, secondsUntilNextUtcDay(now));
    }
    return buildReservation(used, limit, resetAt);
  }

  const key = `${day}:${identity}`;
  const current = localWinCounters.get(key);
  if (!current || current.resetAt <= now) {
    localWinCounters.set(key, { count: 1, resetAt });
    return buildReservation(1, limit, resetAt);
  }

  current.count += 1;
  return buildReservation(current.count, limit, current.resetAt);
}

export async function getIdentityDailyWinStatus(
  identity: string,
  now: Date = new Date(),
): Promise<WalletDailyBountyReservation> {
  const limit = config.validation.maxWinsPerIdentityPerDay;
  const day = utcDayKey(now);
  const resetAt = new Date(now.getTime() + secondsUntilNextUtcDay(now) * 1000);

  if (config.redis.url) {
    const r = await getRedis();
    if (!r) {
      return { allowed: false, limit, used: limit, remaining: 0, resetAt };
    }

    const raw = await r.get(RK.identityDailyWinLimit(identity, day));
    const used = raw ? Number(raw) : 0;
    return buildStatus(used, limit, resetAt);
  }

  const key = `${day}:${identity}`;
  const current = localWinCounters.get(key);
  const used = current && current.resetAt > now ? current.count : 0;
  return buildStatus(used, limit, current?.resetAt && current.resetAt > now ? current.resetAt : resetAt);
}

function buildReservation(
  used: number,
  limit: number,
  resetAt: Date
): WalletDailyBountyReservation {
  return {
    allowed: used <= limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
  };
}

function buildStatus(
  used: number,
  limit: number,
  resetAt: Date
): WalletDailyBountyReservation {
  return {
    allowed: used < limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
  };
}
