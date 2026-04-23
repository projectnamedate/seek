import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';

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
      c.on('error', (err) => console.error('[Redis]', err));
      c.on('connect', () => console.log('[Redis] Connected'));
      c.on('reconnecting', () => console.log('[Redis] Reconnecting...'));
      await c.connect();
      client = c;
      return c;
    } catch (err) {
      console.error('[Redis] Failed to connect:', err);
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
} as const;

/**
 * Acquire a distributed lock with TTL. Returns true if acquired, false if
 * another process holds it. TTL prevents deadlock on crashes.
 *
 * When Redis is unavailable, returns true (single-instance in-memory fallback
 * is handled by the caller via Set-based locking).
 */
export async function redisAcquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const r = await getRedis();
  if (!r) return true; // caller falls back to in-memory lock
  const result = await r.set(key, '1', { NX: true, EX: ttlSeconds });
  return result === 'OK';
}

export async function redisReleaseLock(key: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  await r.del(key);
}
