import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { childLogger } from './logger.service';

const log = childLogger('redis');

/**
 * Redis client singleton. Lazy-connects on first use; returns null when
 * REDIS_URL is unset (dev / local runs continue to work with in-memory state).
 *
 * Production deploys MUST set REDIS_URL (Upstash, Redis Cloud, etc) so state
 * survives restarts and horizontal scale-outs don't desync.
 */

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  if (!config.redis.url) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const c = createClient({ url: config.redis.url }) as RedisClientType;
      c.on('error', (err) => log.error({ err }, 'redis client error'));
      c.on('connect', () => log.info('connected'));
      c.on('reconnecting', () => log.info('reconnecting'));
      await c.connect();
      client = c;
      return c;
    } catch (err) {
      log.error({ err }, 'failed to connect');
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
    client = null;
  }
}

/**
 * Key namespaces. Use these helpers so key shapes stay consistent.
 */
export const RK = {
  missionSecrets: (bountyId: string) => `seek:mission:${bountyId}`,
  preparedBounty: (bountyPda: string) => `seek:prepared:${bountyPda}`,
  finalizerQueue: () => `seek:finalizer:queue`, // sorted set by challengeEndsAt
  finalizerMeta: (bountyPda: string) => `seek:finalizer:meta:${bountyPda}`,
  walletLock: (wallet: string) => `seek:lock:wallet:${wallet}`,
  bountyLock: (bountyId: string) => `seek:lock:bounty:${bountyId}`,
  authNonce: (wallet: string, ts: string, op: string) => `seek:nonce:${op}:${wallet}:${ts}`,
  sgtVerified: (wallet: string) => `seek:sgt:verified:${wallet}`,
  sgtMintOwner: (mint: string) => `seek:sgt:mint:${mint}`,
  sgtNonce: (nonce: string) => `seek:sgt:nonce:${nonce}`,
} as const;

/**
 * Acquire a distributed lock with TTL. Returns true if acquired, false if
 * another process holds it OR if Redis is configured but unreachable.
 * TTL prevents deadlock on crashes.
 *
 * Fail-mode policy:
 *  - REDIS_URL UNSET (dev): returns true (no-op lock; single-instance only).
 *  - REDIS_URL SET but client unreachable (production outage): returns FALSE
 *    so callers fail closed. A 503 to the client is correct here — without
 *    locks, /submit and the expirer can race and double-resolve.
 */
export async function redisAcquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  if (!config.redis.url) return true; // dev mode, no Redis configured
  try {
    const r = await getRedis();
    if (!r) return false; // Redis configured but unavailable → fail closed
    const result = await r.set(key, '1', { NX: true, EX: ttlSeconds });
    return result === 'OK';
  } catch (err) {
    log.error({ err, key }, 'lock acquire failed — failing closed');
    return false;
  }
}

export async function redisReleaseLock(key: string): Promise<void> {
  if (!config.redis.url) return;
  try {
    const r = await getRedis();
    if (!r) return;
    await r.del(key);
  } catch (err) {
    log.error({ err, key }, 'lock release failed — TTL will expire it');
  }
}

/**
 * Consume an auth nonce. Returns true if this is the first time the nonce
 * is being used (and reserves it for `ttlSeconds`), false if it has already
 * been consumed within the TTL OR if Redis is configured but unreachable.
 *
 * Fail-mode policy:
 *  - REDIS_URL UNSET (dev): returns true (no replay protection — dev only).
 *  - REDIS_URL SET but client unreachable: returns FALSE so auth replay is
 *    impossible during a Redis outage. Clients get 401 until Redis recovers.
 */
export async function redisConsumeNonce(key: string, ttlSeconds: number): Promise<boolean> {
  if (!config.redis.url) return true;
  try {
    const r = await getRedis();
    if (!r) return false; // Redis configured but unavailable → fail closed
    const result = await r.set(key, '1', { NX: true, EX: ttlSeconds });
    return result === 'OK';
  } catch (err) {
    log.error({ err, key }, 'nonce consume failed — failing closed');
    return false;
  }
}
