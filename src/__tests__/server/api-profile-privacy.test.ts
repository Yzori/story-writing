import { describe, expect, it, vi } from "vitest";
import { createMockRequest, createMockStory, getResponseData } from "../helpers";

type ErrorBody = {
  error: {
    code: string;
  };
};

describe("profile-adjacent privacy guards", () => {
  it("does not expose private story metadata by id", async () => {
    vi.resetModules();
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: {
            findFirst: vi.fn().mockResolvedValue(
              createMockStory({
                id: "story-private",
                userId: "author-1",
                isPublic: false,
                status: "draft",
              })
            ),
          },
        },
        select: vi.fn(),
      },
    }));

    const { GET } = await import("@/app/api/stories/[storyId]/route");
    const res = await GET(createMockRequest("/api/stories/story-private"), {
      params: Promise.resolve({ storyId: "story-private" }),
    });
    const { body, status } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as ErrorBody).error.code).toBe("NOT_FOUND");
  });

  it("does not expose private story metadata by slug", async () => {
    vi.resetModules();
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: {
            findFirst: vi.fn().mockResolvedValue(
              createMockStory({
                id: "story-private",
                userId: "author-1",
                slug: "private-draft",
                isPublic: false,
                status: "draft",
              })
            ),
          },
        },
        select: vi.fn(),
      },
    }));

    const { GET } = await import("@/app/api/stories/by-slug/[slug]/route");
    const res = await GET(createMockRequest("/api/stories/by-slug/private-draft"), {
      params: Promise.resolve({ slug: "private-draft" }),
    });
    const { body, status } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as ErrorBody).error.code).toBe("NOT_FOUND");
  });

  it("prevents desk notes from attaching private stories", async () => {
    vi.resetModules();
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "author-1" } }),
    }));

    const insertMock = vi.fn();
    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "story-private",
                  userId: "author-1",
                  isPublic: false,
                  status: "draft",
                },
              ]),
            }),
          }),
        }),
        update: vi.fn(),
        insert: insertMock,
      },
    }));

    const { POST } = await import("@/app/api/users/[userId]/notes/route");
    const res = await POST(
      createMockRequest("/api/users/author-1/notes", {
        method: "POST",
        body: {
          body: "A note that should not point to a private draft",
          storyId: "00000000-0000-4000-8000-000000000001",
          isPinned: false,
        },
      }),
      { params: Promise.resolve({ userId: "author-1" }) }
    );
    const { body, status } = await getResponseData(res);

    expect(status).toBe(403);
    expect((body as ErrorBody).error.code).toBe("FORBIDDEN");
    expect(insertMock).not.toHaveBeenCalled();
  });
});
