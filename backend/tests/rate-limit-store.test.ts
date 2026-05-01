import test from 'node:test';
import assert from 'node:assert/strict';

import { RedisRateLimitStore } from '../src/middleware/redis-rate-limit-store';

class FakeRedis {
  values = new Map<string, number>();
  ttls = new Map<string, number>();

  async incr(key: string): Promise<number> {
    const next = (this.values.get(key) ?? 0) + 1;
    this.values.set(key, next);
    return next;
  }

  async decr(key: string): Promise<number> {
    const next = (this.values.get(key) ?? 0) - 1;
    this.values.set(key, next);
    return next;
  }

  async get(key: string): Promise<string | null> {
    const value = this.values.get(key);
    return value === undefined ? null : String(value);
  }

  async pExpire(key: string, ttlMs: number): Promise<number> {
    this.ttls.set(key, ttlMs);
    return 1;
  }

  async pTTL(key: string): Promise<number> {
    return this.ttls.get(key) ?? -1;
  }

  async del(key: string): Promise<number> {
    const existed = this.values.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }
}

test('redis rate-limit store namespaces counters and preserves fixed-window ttl', async () => {
  const redis = new FakeRedis();
  const store = new RedisRateLimitStore({
    prefix: 'seek:rl:test',
    getClient: async () => redis as any,
  });
  store.init?.({ windowMs: 60_000 } as any);

  const first = await store.increment('127.0.0.1');
  const second = await store.increment('127.0.0.1');

  assert.equal(first.totalHits, 1);
  assert.equal(second.totalHits, 2);
  assert.equal(redis.values.get('seek:rl:test:127.0.0.1'), 2);
  assert.equal(redis.ttls.get('seek:rl:test:127.0.0.1'), 60_000);
  assert.ok(first.resetTime instanceof Date);
});

test('redis rate-limit store supports get and resetKey', async () => {
  const redis = new FakeRedis();
  const store = new RedisRateLimitStore({
    prefix: 'seek:rl:test',
    getClient: async () => redis as any,
  });
  store.init?.({ windowMs: 30_000 } as any);

  await store.increment('wallet');
  assert.equal((await store.get?.('wallet'))?.totalHits, 1);

  await store.resetKey('wallet');
  assert.equal(await store.get?.('wallet'), undefined);
});

test('redis rate-limit store fails closed when redis is configured but unavailable', async () => {
  const store = new RedisRateLimitStore({
    prefix: 'seek:rl:test',
    getClient: async () => null,
  });
  store.init?.({ windowMs: 30_000 } as any);

  await assert.rejects(() => store.increment('wallet'), /Redis rate limit store unavailable/);
});
