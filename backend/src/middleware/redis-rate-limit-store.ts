import type {
  ClientRateLimitInfo,
  IncrementResponse,
  Options,
  Store,
} from 'express-rate-limit';
import { getRedis } from '../services/redis.service';

interface RedisLike {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  pExpire(key: string, ttlMs: number): Promise<number | boolean>;
  pTTL(key: string): Promise<number>;
  del(key: string): Promise<number>;
}

export interface RedisRateLimitStoreOptions {
  prefix: string;
  getClient?: () => Promise<RedisLike | null>;
}

export class RedisRateLimitStore implements Store {
  localKeys = false;
  prefix: string;

  private windowMs = 60_000;
  private readonly getClient: () => Promise<RedisLike | null>;

  constructor(options: RedisRateLimitStoreOptions) {
    this.prefix = options.prefix;
    this.getClient = options.getClient ?? (getRedis as unknown as () => Promise<RedisLike | null>);
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redis = await this.redis();
    const redisKey = this.key(key);
    const totalHits = await redis.incr(redisKey);
    let ttlMs = await redis.pTTL(redisKey);

    if (ttlMs < 0) {
      await redis.pExpire(redisKey, this.windowMs);
      ttlMs = this.windowMs;
    }

    return {
      totalHits,
      resetTime: new Date(Date.now() + ttlMs),
    };
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redis = await this.redis();
    const redisKey = this.key(key);
    const [raw, ttlMs] = await Promise.all([
      redis.get(redisKey),
      redis.pTTL(redisKey),
    ]);

    if (!raw || ttlMs < 0) return undefined;

    return {
      totalHits: Number(raw),
      resetTime: new Date(Date.now() + ttlMs),
    };
  }

  async decrement(key: string): Promise<void> {
    const redis = await this.redis();
    const redisKey = this.key(key);
    const raw = await redis.get(redisKey);
    if (raw && Number(raw) > 0) {
      await redis.decr(redisKey);
    }
  }

  async resetKey(key: string): Promise<void> {
    const redis = await this.redis();
    await redis.del(this.key(key));
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private async redis(): Promise<RedisLike> {
    const redis = await this.getClient();
    if (!redis) {
      throw new Error('Redis rate limit store unavailable');
    }
    return redis;
  }
}
