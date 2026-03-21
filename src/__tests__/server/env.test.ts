import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Environment Validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "test-secret");

    await expect(async () => {
      await import("@/server/env");
    }).rejects.toThrow("Missing or invalid environment variables");
  });

  it("throws when AUTH_SECRET is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("AUTH_SECRET", "");

    await expect(async () => {
      await import("@/server/env");
    }).rejects.toThrow("Missing or invalid environment variables");
  });

  it("succeeds with valid required vars", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("AUTH_SECRET", "test-secret-value");

    const mod = await import("@/server/env");
    expect(mod.env.DATABASE_URL).toBe("postgresql://localhost:5432/test");
    expect(mod.env.AUTH_SECRET).toBe("test-secret-value");
  });

  it("allows optional GitHub vars to be absent", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");

    const mod = await import("@/server/env");
    // Empty strings pass through as optional — Zod treats them as present
    expect(mod.env.GITHUB_CLIENT_ID).toBeDefined();
  });

  it("accepts valid NODE_ENV values", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "test");

    const mod = await import("@/server/env");
    expect(mod.env.NODE_ENV).toBe("test");
  });
});
