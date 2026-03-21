import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Test applyRateLimit without the module-level mocks from setup
describe("applyRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null when request is within limits", async () => {
    const { applyRateLimit } = await import("@/lib/api-utils");
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const result = applyRateLimit(request, "user-1", "write");
    expect(result).toBeNull();
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { applyRateLimit } = await import("@/lib/api-utils");
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.2" },
    });

    // Exhaust the limit
    const opts = { max: 2, windowSeconds: 60 };
    applyRateLimit(request, "rate-user-1", "write", opts);
    applyRateLimit(request, "rate-user-1", "write", opts);
    const result = applyRateLimit(request, "rate-user-1", "write", opts);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("uses IP when no userId provided", async () => {
    const { applyRateLimit } = await import("@/lib/api-utils");
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });

    const result = applyRateLimit(request, null, "write");
    expect(result).toBeNull();
  });

  it("includes rate limit headers on 429 response", async () => {
    const { applyRateLimit } = await import("@/lib/api-utils");
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.3" },
    });

    const opts = { max: 1, windowSeconds: 60 };
    applyRateLimit(request, "header-user", "write", opts);
    const result = applyRateLimit(request, "header-user", "write", opts);

    expect(result).not.toBeNull();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("respects custom rate limit options", async () => {
    const { applyRateLimit } = await import("@/lib/api-utils");
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "10.0.0.4" },
    });

    // Very strict custom limit
    const opts = { max: 1, windowSeconds: 3600 };
    const first = applyRateLimit(request, "custom-user", "write", opts);
    expect(first).toBeNull();

    const second = applyRateLimit(request, "custom-user", "write", opts);
    expect(second).not.toBeNull();
    expect(second!.status).toBe(429);
  });
});
