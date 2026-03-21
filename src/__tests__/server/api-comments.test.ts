import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createMockRequest,
  createMockParams,
  createMockStory,
  createMockChapter,
  getResponseData,
} from "../helpers";

const storyId = "story-1";
const chapterId = "ch-1";
const routeParams = { storyId, chapterId };

describe("GET /api/stories/[storyId]/chapters/[chapterId]/comments", () => {
  it("returns paginated comments", async () => {
    vi.resetModules();

    const mockComments = [
      { id: "c1", content: "Great chapter!", user: { id: "u1", displayName: "Alice", avatarUrl: null } },
      { id: "c2", content: "Thanks!", user: { id: "u2", displayName: "Bob", avatarUrl: null } },
    ];

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockComments),
                  }),
                }),
              }),
            }),
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`);
    const res = await mod.GET(req, createMockParams(routeParams));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data).toHaveLength(2);
    expect((body as any).hasMore).toBe(false);
  });

  it("returns hasMore=true when more results exist", async () => {
    vi.resetModules();

    // Default limit is 20, so return 21 items to trigger hasMore
    const mockComments = Array.from({ length: 21 }, (_, i) => ({
      id: `c${i}`,
      content: `Comment ${i}`,
      user: { id: "u1", displayName: "Alice", avatarUrl: null },
    }));

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockComments),
                  }),
                }),
              }),
            }),
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`);
    const res = await mod.GET(req, createMockParams(routeParams));
    const { body } = await getResponseData(res);

    expect((body as any).hasMore).toBe(true);
    expect((body as any).data).toHaveLength(20);
  });
});

describe("POST /api/stories/[storyId]/chapters/[chapterId]/comments", () => {
  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "Nice!" },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("rejects empty comment content", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "" },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("rejects comment exceeding max length", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "x".repeat(2001) },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("returns 404 when story not found", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(null) },
          chapters: { findFirst: vi.fn() },
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "Nice chapter!" },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status } = await getResponseData(res);

    expect(status).toBe(404);
  });

  it("returns 404 when chapter not published", async () => {
    vi.resetModules();

    const mockStory = createMockStory();
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          chapters: { findFirst: vi.fn().mockResolvedValue(null) }, // not found because status != published
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "Nice chapter!" },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as any).error.message).toContain("not published");
  });

  it("creates a comment successfully", async () => {
    vi.resetModules();

    const mockStory = createMockStory({ userId: "other-user" });
    const mockChapter = createMockChapter({ status: "published" });
    const createdComment = {
      id: "comment-1",
      userId: "user-1",
      chapterId,
      storyId,
      content: "Great work!",
      parentId: null,
      user: { id: "user-1", displayName: "Test", avatarUrl: null },
      createdAt: new Date(),
    };

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          chapters: { findFirst: vi.fn().mockResolvedValue(mockChapter) },
        },
        transaction: vi.fn().mockImplementation(async (cb: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: "comment-1" }]),
              }),
            }),
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([createdComment]),
                  }),
                }),
              }),
            }),
          };
          return cb(tx);
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createNotification: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/comments/route");
    const req = createMockRequest(`/api/stories/${storyId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: { content: "Great work!" },
    });
    const res = await mod.POST(req, createMockParams(routeParams));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(201);
    expect((body as any).data.id).toBe("comment-1");
  });
});
