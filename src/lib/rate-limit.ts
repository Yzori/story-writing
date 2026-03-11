/**
 * In-memory sliding window rate limiter.
 * Good enough for single-instance MVP deployments.
 * For multi-instance production, swap to Redis-backed solution.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  max: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds to prevent unbounded growth
const CLEANUP_INTERVAL_MS = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowSeconds: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    // Use a generous cutoff — any entry whose newest timestamp is older
    // than 2x the longest typical window (2 min) is safe to remove.
    const cutoff = now - windowSeconds * 2 * 1000;
    for (const [key, entry] of store) {
      if (
        entry.timestamps.length === 0 ||
        entry.timestamps[entry.timestamps.length - 1] < cutoff
      ) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node process to exit even if the timer is running
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Check and consume a rate limit token for the given key.
 *
 * @param key   Unique identifier (e.g. `write:userId` or `read:ip`)
 * @param opts  Rate limit configuration
 * @returns     Result with success flag, remaining count, and reset time
 */
export function rateLimit(
  key: string,
  opts: RateLimitOptions = { max: 30, windowSeconds: 60 }
): RateLimitResult {
  const { max, windowSeconds } = opts;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  ensureCleanup(windowSeconds);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const reset = Math.ceil((now + windowMs) / 1000);

  if (entry.timestamps.length >= max) {
    return {
      success: false,
      remaining: 0,
      reset,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    success: true,
    remaining: max - entry.timestamps.length,
    reset,
  };
}

/** Default limits */
export const RATE_LIMITS = {
  /** POST / PATCH / DELETE operations */
  write: { max: 30, windowSeconds: 60 } satisfies RateLimitOptions,
  /** GET operations */
  read: { max: 100, windowSeconds: 60 } satisfies RateLimitOptions,
} as const;
