import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createMockRequest,
  createMockParams,
  createMockStory,
  createMockChapter,
  getResponseData,
  mockAuth,
  mockNoAuth,
} from "../helpers";

// ── GET & POST /api/stories/[storyId]/chapters ─────────────────────────

describe("GET /api/stories/[storyId]/chapters", () => {
  let GET: (request: NextRequest, ctx: any) => Promise<any>;

  const mockStory = createMockStory({ id: "story-1", userId: "user-1" });
  const mockChapters = [
    createMockChapter({ id: "ch-1", status: "published", sortOrder: 0 }),
    createMockChapter({ id: "ch-2", status: "draft", sortOrder: 1 }),
  ];

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => {
      const orderByMock = vi.fn().mockResolvedValue(mockChapters);
      return {
        db: {
          query: {
            stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          },
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: orderByMock,
              }),
            }),
          }),
        },
      };
    });

    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));

    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    GET = mod.GET;
  });

  it("returns chapters for a story", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters");
    const res = await GET(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data).toHaveLength(2);
  });

  it("includes chapter versions when loading editor content", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters?withContent=true");
    const res = await GET(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);
    const data = (body as { data: Array<{ version: number }> }).data;

    expect(status).toBe(200);
    expect(data[0].version).toBe(mockChapters[0].version);
  });

  it("returns 404 for non-existent story", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: { stories: { findFirst: vi.fn().mockResolvedValue(null) } },
        select: vi.fn(),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    const req = createMockRequest("/api/stories/missing/chapters");
    const res = await mod.GET(req, createMockParams({ storyId: "missing" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as any).error.code).toBe("NOT_FOUND");
  });

  it("denies withContent for non-owners", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: { stories: { findFirst: vi.fn().mockResolvedValue(mockStory) } },
        select: vi.fn(),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "other-user" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    const req = createMockRequest("/api/stories/story-1/chapters?withContent=true");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(403);
  });
});

describe("POST /api/stories/[storyId]/chapters", () => {
  let POST: (request: NextRequest, ctx: any) => Promise<any>;

  const mockStory = createMockStory({ id: "story-1", userId: "user-1" });
  const mockChapter = createMockChapter();

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockChapter]),
          }),
        }),
      },
    }));

    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    }));

    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    POST = mod.POST;
  });

  it("creates a chapter with valid input", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters", {
      method: "POST",
      body: { title: "New Chapter", content: "<p>Content</p>" },
    });
    const res = await POST(req, createMockParams({ storyId: "story-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(201);
    expect((body as any).data.id).toBe("chapter-1");
  });

  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    const req = createMockRequest("/api/stories/story-1/chapters", {
      method: "POST",
      body: { title: "Chapter" },
    });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("rejects missing title", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters", {
      method: "POST",
      body: { content: "<p>No title</p>" },
    });
    const res = await POST(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("returns 403 for non-owner", async () => {
    vi.resetModules();

    const otherStory = createMockStory({ userId: "other-user" });
    vi.doMock("@/server/db", () => ({
      db: {
        query: { stories: { findFirst: vi.fn().mockResolvedValue(otherStory) } },
        select: vi.fn(),
        insert: vi.fn(),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/route");
    const req = createMockRequest("/api/stories/story-1/chapters", {
      method: "POST",
      body: { title: "Chapter" },
    });
    const res = await mod.POST(req, createMockParams({ storyId: "story-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(403);
  });
});

// ── GET, PATCH, DELETE /api/stories/[storyId]/chapters/[chapterId] ─────

describe("GET /api/stories/[storyId]/chapters/[chapterId]", () => {
  it("returns a published chapter", async () => {
    vi.resetModules();

    const mockChapter = createMockChapter({ status: "published" });
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          chapters: { findFirst: vi.fn().mockResolvedValue(mockChapter) },
          stories: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data.id).toBe("chapter-1");
  });

  it("returns 404 for missing chapter", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          chapters: { findFirst: vi.fn().mockResolvedValue(null) },
          stories: { findFirst: vi.fn() },
        },
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/missing");
    const res = await mod.GET(req, createMockParams({ storyId: "story-1", chapterId: "missing" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(404);
  });
});

describe("PATCH /api/stories/[storyId]/chapters/[chapterId]", () => {
  let PATCH: (request: NextRequest, ctx: any) => Promise<any>;

  const mockStory = createMockStory({ id: "story-1", userId: "user-1" });
  const existingChapter = createMockChapter({ version: 1, wordCount: 10 });
  const updatedChapter = createMockChapter({ version: 2, title: "Updated" });

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          chapters: { findFirst: vi.fn().mockResolvedValue(existingChapter) },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedChapter]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            then: vi.fn().mockReturnValue({ catch: vi.fn() }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    }));

    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
      }),
    }));

    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    vi.doMock("@/server/services/notifications", () => ({
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    PATCH = mod.PATCH;
  });

  it("updates a chapter with valid input", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", {
      method: "PATCH",
      body: { title: "Updated Title", baseVersion: 1 },
    });
    const res = await PATCH(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data).toBeDefined();
  });

  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: { query: { stories: {}, chapters: {} } } }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const res = await mod.PATCH(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("returns 409 on version conflict", async () => {
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", {
      method: "PATCH",
      body: { title: "Updated", baseVersion: 5 },
    });
    const res = await PATCH(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(409);
    expect((body as any).error.code).toBe("CONFLICT");
  });

  it("returns 403 for non-owner", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(createMockStory({ userId: "other-user" })) },
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
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const res = await mod.PATCH(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(403);
  });
});

describe("DELETE /api/stories/[storyId]/chapters/[chapterId]", () => {
  it("soft deletes a chapter for owner", async () => {
    vi.resetModules();

    const mockStory = createMockStory({ userId: "user-1" });
    const mockChapter = createMockChapter();
    const deletedChapter = { ...mockChapter, deletedAt: new Date() };

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          chapters: { findFirst: vi.fn().mockResolvedValue(mockChapter) },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([deletedChapter]),
            }),
          }),
        }),
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
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", { method: "DELETE" });
    const res = await mod.DELETE(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data.deletedAt).toBeDefined();
  });

  it("requires authentication for delete", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: { query: { stories: {}, chapters: {} } },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/services/notifications", () => ({
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/ch-1", { method: "DELETE" });
    const res = await mod.DELETE(req, createMockParams({ storyId: "story-1", chapterId: "ch-1" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("returns 404 when chapter not found", async () => {
    vi.resetModules();

    const mockStory = createMockStory({ userId: "user-1" });
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(mockStory) },
          chapters: { findFirst: vi.fn().mockResolvedValue(null) },
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
      createBulkNotifications: vi.fn(),
    }));

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/missing", { method: "DELETE" });
    const res = await mod.DELETE(req, createMockParams({ storyId: "story-1", chapterId: "missing" }));
    const { status } = await getResponseData(res);

    expect(status).toBe(404);
  });
});
