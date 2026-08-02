import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockRequest, createMockParams, createMockStory, getResponseData, mockApiUtils } from "../helpers";
import type { RouteHandler, JsonBody } from "../helpers";

// ── Sparks ──────────────────────────────────────────────────

describe("GET /api/stories/[storyId]/sparks", () => {
  it("returns spark count and hasSparked=false for anonymous", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 5 }]),
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/sparks/route");
    const req = createMockRequest("/api/stories/story-1/sparks");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.count).toBe(5);
    expect((body as JsonBody).data.hasSparked).toBe(false);
  });

  it("returns hasSparked=true for authenticated user who sparked", async () => {
    vi.resetModules();

    const selectMock = vi.fn();
    // First call: count query, second call: user check
    let callCount = 0;
    selectMock.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 1) {
            // count query
            return [{ value: 3 }];
          }
          // user spark check
          return { limit: vi.fn().mockResolvedValue([{ id: "spark-1" }]) };
        }),
      }),
    }));

    vi.doMock("@/server/db", () => ({
      db: { select: selectMock },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/sparks/route");
    const req = createMockRequest("/api/stories/story-1/sparks");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.count).toBe(3);
    expect((body as JsonBody).data.hasSparked).toBe(true);
  });
});

describe("POST /api/stories/[storyId]/sparks", () => {
  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/sparks/route");
    const req = createMockRequest("/api/stories/story-1/sparks", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("toggles spark on (creates) via transaction", async () => {
    vi.resetModules();

    const mockStory = createMockStory({ userId: "other-user" });

    vi.doMock("@/server/db", () => {
      let selectCallCount = 0;
      return {
        db: {
          transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                  onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
                }),
              }),
            };
            return cb(tx);
          }),
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                  if (selectCallCount === 1) {
                    // Story lookup
                    return { limit: vi.fn().mockResolvedValue([mockStory]) };
                  }
                  // Spark count
                  return [{ value: 1 }];
                }),
              }),
            };
          }),
        },
      };
    });
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/sparks/route");
    const req = createMockRequest("/api/stories/story-1/sparks", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.sparked).toBe(true);
  });

  it("toggles spark off (deletes) via transaction", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "spark-1" }]),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          };
          return cb(tx);
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 0 }]),
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/sparks/route");
    const req = createMockRequest("/api/stories/story-1/sparks", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.sparked).toBe(false);
  });
});

// ── Follows ──────────────────────────────────────────────────

describe("GET /api/stories/[storyId]/follows", () => {
  it("returns follow count and hasFollowed=false for anonymous", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 12 }]),
          }),
        }),
        query: {
          follows: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/follows/route");
    const req = createMockRequest("/api/stories/story-1/follows");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.count).toBe(12);
    expect((body as JsonBody).data.hasFollowed).toBe(false);
  });
});

describe("POST /api/stories/[storyId]/follows", () => {
  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/follows/route");
    const req = createMockRequest("/api/stories/story-1/follows", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("returns 404 when story not found", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/follows/route");
    const req = createMockRequest("/api/stories/missing/follows", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "missing" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(404);
  });

  it("toggles follow on via transaction", async () => {
    vi.resetModules();

    const mockStory = createMockStory({ userId: "other-user" });

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
        },
        transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            query: {
              follows: { findFirst: vi.fn().mockResolvedValue(null) },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          };
          return cb(tx);
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 1 }]),
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/follows/route");
    const req = createMockRequest("/api/stories/story-1/follows", { method: "POST" });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.followed).toBe(true);
    expect((body as JsonBody).data.count).toBe(1);
  });
});
