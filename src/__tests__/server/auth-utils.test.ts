import { describe, expect, it } from "vitest";
import {
  clearLoginAttempts,
  getLoginAttemptKey,
  getLoginLockoutSeconds,
  normalizeEmail,
  recordFailedLogin,
} from "@/server/auth-utils";

describe("auth utilities", () => {
  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  Writer@Example.COM ")).toBe("writer@example.com");
  });

  it("builds login attempt keys from normalized email and forwarded IP", () => {
    const request = new Request("https://quiloria.test/login", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getLoginAttemptKey(" Writer@Example.COM ", request)).toBe(
      "writer@example.com:203.0.113.10"
    );
  });

  it("locks a login key after five failed attempts and clears on success", () => {
    const key = "writer@example.com:203.0.113.10";
    clearLoginAttempts(key);

    for (let i = 0; i < 4; i++) {
      recordFailedLogin(key, 1_000 + i);
      expect(getLoginLockoutSeconds(key, 2_000)).toBe(0);
    }

    recordFailedLogin(key, 2_000);
    expect(getLoginLockoutSeconds(key, 2_000)).toBeGreaterThan(0);

    clearLoginAttempts(key);
    expect(getLoginLockoutSeconds(key, 2_000)).toBe(0);
  });
});

