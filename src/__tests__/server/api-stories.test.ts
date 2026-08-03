import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockParams, createMockRequest, createMockStory, getResponseData } from "../helpers";
import type { RouteHandler, JsonBody } from "../helpers";

function createStoryListDb(mockStories: ReturnType<typeof createMockStory>[]) {
  let selectCall = 0;
  const select = vi.fn(() => {
    selectCall += 1;

    if (selectCall <= 4) {
      const as = vi.fn().mockReturnValue({});
      const groupBy = vi.fn().mockReturnValue({ as });
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ groupBy }),
          groupBy,
        }),
      };
    }

    if (selectCall === 5) {
      const mainBuilder: {
        leftJoin: ReturnType<typeof vi.fn>;
        where: ReturnType<typeof vi.fn>;
      } = {
        leftJoin: vi.fn(),
        where: vi.fn(),
      };
      mainBuilder.leftJoin.mockReturnValue(mainBuilder);
      mainBuilder.where.mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockStories),
        }),
      });
      return { from: vi.fn().mockReturnValue(mainBuilder) };
    }

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    };
  });

  return {
    select,
    query: {
      stories: { findFirst: vi.fn().mockResolvedValue(null) },
    },
  };
}
describe("GET /api/stories", () => {
  let GET: RouteHandler;

  beforeEach(async () => {
    vi.resetModules();

    const mockStories = [
      createMockStory({ id: "s1", title: "Story One", isPublic: true }),
      createMockStory({ id: "s2", title: "Story Two", isPublic: true }),
    ];

    vi.doMock("@/server/db", () => ({
      db: createStoryListDb(mockStories),
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));

    const mod = await import("@/app/api/stories/route");
    GET = mod.GET;
  });

  it("returns a list of stories", async () => {
    const req = createMockRequest("/api/stories");
    const res = await GET(req);
    const { body, status } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.stories).toHaveLength(2);
  });

  it("returns stories with hasMore and nextCursor fields", async () => {
    const req = createMockRequest("/api/stories");
    const res = await GET(req);
    const { body } = await getResponseData(res);

    expect((body as JsonBody).data).toHaveProperty("hasMore");
    expect((body as JsonBody).data).toHaveProperty("nextCursor");
  });

  it("requires auth for mine=true", async () => {
    // Auth is already mocked as null in beforeEach
    const req = createMockRequest("/api/stories?mine=true");
    const res = await GET(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(401);
    expect((body as JsonBody).error.code).toBe("UNAUTHORIZED");
  });

  it("allows mine=true when authenticated", async () => {
    vi.resetModules();

    const mockStories = [createMockStory({ id: "s1" })];
    vi.doMock("@/server/db", () => ({
      db: createStoryListDb(mockStories),
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User" },
      }),
    }));

    const mod = await import("@/app/api/stories/route");
    const req = createMockRequest("/api/stories?mine=true");
    const res = await mod.GET(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(200);
  });

  it("supports public filter", async () => {
    const req = createMockRequest("/api/stories?public=true");
    const res = await GET(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(200);
  });

  it("supports search parameter", async () => {
    const req = createMockRequest("/api/stories?search=fantasy");
    const res = await GET(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(200);
  });

  it("handles errors gracefully", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockImplementation(() => {
          throw new Error("DB down");
        }),
        query: { stories: { findFirst: vi.fn() } },
      },
    }));

    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));

    const mod = await import("@/app/api/stories/route");
    const req = createMockRequest("/api/stories");
    const res = await mod.GET(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(500);
    expect((body as JsonBody).error.code).toBe("INTERNAL_ERROR");
  });
});

describe("GET public campaign stories", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
  });

  function mockPublicDraftCampaignDb() {
    const campaign = createMockStory({
      id: "campaign-1",
      slug: "rea-2s633f",
      writingMode: "campaign",
      isPublic: true,
      status: "draft",
      contentNotes: "[]",
    });

    const selectMock = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "author-1",
                displayName: "Author",
                name: "Author",
                avatarUrl: null,
                bio: null,
                role: "writer",
              },
            ]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

    vi.doMock("@/server/db", () => ({
      db: {
        select: selectMock,
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(campaign) },
          collaborators: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      },
    }));
  }

  it("loads a public campaign by slug even before the story status is published", async () => {
    mockPublicDraftCampaignDb();

    const mod = await import("@/app/api/stories/by-slug/[slug]/route");
    const req = createMockRequest("/api/stories/by-slug/rea-2s633f");
    const res = await mod.GET(req, createMockParams({ slug: "rea-2s633f" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.id).toBe("campaign-1");
    expect((body as JsonBody).data.chapters).toEqual([]);
  });

  it("loads a public campaign by id for non-owner campaign pages", async () => {
    mockPublicDraftCampaignDb();

    const mod = await import("@/app/api/stories/[storyId]/route");
    const req = createMockRequest("/api/stories/campaign-1");
    const res = await mod.GET(req, createMockParams({ storyId: "campaign-1" }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as JsonBody).data.id).toBe("campaign-1");
    expect((body as JsonBody).data.bibleEntries).toEqual([]);
  });
});

describe("POST /api/stories", () => {
  let POST: RouteHandler;
  const mockStory = createMockStory();

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => {
      const insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockStory]),
        }),
      });
      return {
        db: {
          query: { stories: { findFirst: vi.fn().mockResolvedValue(null) } },
          insert,
          // POST creates story + first chapter atomically; the tx exposes the
          // same insert surface as the db mock.
          transaction: vi
            .fn()
            .mockImplementation(async (fn: (tx: { insert: typeof insert }) => unknown) =>
              fn({ insert })
            ),
        },
      };
    });

    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    }));

    const mod = await import("@/app/api/stories/route");
    POST = mod.POST;
  });

  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: { insert: vi.fn() },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));

    const mod = await import("@/app/api/stories/route");
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "My Story" },
    });
    const res = await mod.POST(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(401);
    expect((body as JsonBody).error.code).toBe("UNAUTHORIZED");
  });

  it("creates a story with valid input", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "My New Story", format: "novel" },
    });
    const res = await POST(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(201);
    expect((body as JsonBody).data).toBeDefined();
    expect((body as JsonBody).data.id).toBe("story-1");
  });

  it("rejects missing title", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { format: "novel" },
    });
    const res = await POST(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(400);
    expect((body as JsonBody).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects empty title", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "" },
    });
    const res = await POST(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("rejects invalid format enum", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "Test", format: "invalid_format" },
    });
    const res = await POST(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("rejects title exceeding max length", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "x".repeat(501) },
    });
    const res = await POST(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(400);
  });

  it("accepts optional fields", async () => {
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: {
        title: "Full Story",
        format: "novel",
        writingMode: "solo",
        synopsis: "A great story",
        genres: ["Fantasy", "Romance"],
        contentRating: "teen",
      },
    });
    const res = await POST(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(201);
  });

  it("handles DB errors gracefully", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        query: { stories: { findFirst: vi.fn().mockResolvedValue(null) } },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error("DB error")),
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

    const mod = await import("@/app/api/stories/route");
    const req = createMockRequest("/api/stories", {
      method: "POST",
      body: { title: "My Story" },
    });
    const res = await mod.POST(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(500);
  });
});
