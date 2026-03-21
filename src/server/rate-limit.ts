import "server-only";

/**
 * Rate limiter with pluggable storage backend.
 * Ships with an in-memory store (good for single-instance).
 * Swap to RedisRateLimitStore for horizontal scaling.
 */

export interface RateLimitOptions {
  max: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/** Storage backend interface — implement this for Redis, DynamoDB, etc. */
export interface RateLimitStore {
  /** Check and consume a token. Return count of requests in current window. */
  increment(key: string, windowMs: number): Promise<number> | number;
}

// ── In-Memory Store (default) ───────────────────────────────

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, number[]>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.store.get(key);
    if (!timestamps) {
      timestamps = [];
      this.store.set(key, timestamps);
    }

    // Remove expired timestamps
    const filtered = timestamps.filter((t) => t > windowStart);
    filtered.push(now);
    this.store.set(key, filtered);

    return filtered.length;
  }

  private startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 120_000; // 2 min
      for (const [key, timestamps] of this.store) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
          this.store.delete(key);
        }
      }
    }, 60_000);

    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }
}

// ── Redis Store (plug in when ready) ────────────────────────
//
// To use Redis, install `ioredis` and create:
//
//   import Redis from "ioredis";
//
//   export class RedisRateLimitStore implements RateLimitStore {
//     constructor(private redis: Redis) {}
//
//     async increment(key: string, windowMs: number): Promise<number> {
//       const now = Date.now();
//       const windowStart = now - windowMs;
//       const redisKey = `rate:${key}`;
//
//       const pipeline = this.redis.pipeline();
//       pipeline.zremrangebyscore(redisKey, 0, windowStart);
//       pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
//       pipeline.zcard(redisKey);
//       pipeline.pexpire(redisKey, windowMs);
//
//       const results = await pipeline.exec();
//       return (results?.[2]?.[1] as number) ?? 0;
//     }
//   }
//
// Then: setRateLimitStore(new RedisRateLimitStore(redis));

// ── Singleton store ─────────────────────────────────────────

let activeStore: RateLimitStore = new MemoryRateLimitStore();

/** Swap the rate limit backend (e.g., to Redis in production). */
export function setRateLimitStore(store: RateLimitStore) {
  activeStore = store;
}

/**
 * Check and consume a rate limit token for the given key.
 */
export function rateLimit(
  key: string,
  opts: RateLimitOptions = { max: 30, windowSeconds: 60 }
): RateLimitResult {
  const { max, windowSeconds } = opts;
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const reset = Math.ceil((now + windowMs) / 1000);

  const count = activeStore.increment(key, windowMs);

  // Handle async stores (Redis) — for sync stores this is a no-op
  if (count instanceof Promise) {
    // Fallback: allow the request if store is async and we can't block
    // In production, use the async-aware applyRateLimit in api-utils.ts
    return { success: true, remaining: max - 1, reset };
  }

  if (count > max) {
    return { success: false, remaining: 0, reset };
  }

  return { success: true, remaining: max - count, reset };
}

/** Default limits */
export const RATE_LIMITS = {
  write: { max: 30, windowSeconds: 60 } satisfies RateLimitOptions,
  read: { max: 100, windowSeconds: 60 } satisfies RateLimitOptions,
} as const;
