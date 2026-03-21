import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/server/rate-limit";

describe("Rate Limiter", () => {
  // Use unique keys per test to avoid state leakage
  let keyCounter = 0;
  function uniqueKey() {
    return `test-key-${++keyCounter}-${Date.now()}`;
  }

  describe("rateLimit()", () => {
    it("allows requests within the limit", () => {
      const key = uniqueKey();
      const opts = { max: 5, windowSeconds: 60 };

      const result = rateLimit(key, opts);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("tracks remaining count correctly", () => {
      const key = uniqueKey();
      const opts = { max: 3, windowSeconds: 60 };

      const r1 = rateLimit(key, opts);
      const r2 = rateLimit(key, opts);
      const r3 = rateLimit(key, opts);

      expect(r1.remaining).toBe(2);
      expect(r2.remaining).toBe(1);
      expect(r3.remaining).toBe(0);
    });

    it("blocks requests that exceed the limit", () => {
      const key = uniqueKey();
      const opts = { max: 2, windowSeconds: 60 };

      rateLimit(key, opts);
      rateLimit(key, opts);
      const blocked = rateLimit(key, opts);

      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("provides a reset timestamp in the future", () => {
      const key = uniqueKey();
      const opts = { max: 5, windowSeconds: 60 };

      const result = rateLimit(key, opts);
      const now = Math.floor(Date.now() / 1000);

      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(now + 61);
    });

    it("uses independent buckets for different keys", () => {
      const key1 = uniqueKey();
      const key2 = uniqueKey();
      const opts = { max: 1, windowSeconds: 60 };

      rateLimit(key1, opts);
      const result = rateLimit(key2, opts);

      expect(result.success).toBe(true);
    });

    it("uses default options if not provided", () => {
      const key = uniqueKey();
      const result = rateLimit(key);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(29); // default max is 30
    });
  });

  describe("RATE_LIMITS defaults", () => {
    it("write limit is 30 per 60s", () => {
      expect(RATE_LIMITS.write.max).toBe(30);
      expect(RATE_LIMITS.write.windowSeconds).toBe(60);
    });

    it("read limit is 100 per 60s", () => {
      expect(RATE_LIMITS.read.max).toBe(100);
      expect(RATE_LIMITS.read.windowSeconds).toBe(60);
    });
  });
});
