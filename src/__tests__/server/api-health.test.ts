import { describe, it, expect, vi, beforeEach } from "vitest";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 200 when database is reachable", async () => {
    vi.doMock("@/server/db", () => ({
      db: {
        execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      },
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns 503 when database is unreachable", async () => {
    vi.doMock("@/server/db", () => ({
      db: {
        execute: vi.fn().mockRejectedValue(new Error("Connection refused")),
      },
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.message).toContain("Database");
  });
});
