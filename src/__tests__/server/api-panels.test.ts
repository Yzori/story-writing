import { describe, expect, it, vi } from "vitest";
import { createMockChapter, createMockParams, createMockRequest, createMockStory, getResponseData, mockApiUtils } from "../helpers";

type ApiBody = {
  data?: { reordered?: boolean };
  error?: { code?: string };
};

describe("panel API authorization", () => {
  it("accepts standard panel uploads with a null aspect ratio", async () => {
    vi.resetModules();
    const returning = vi.fn().mockResolvedValue([
      {
        id: "panel-1",
        chapterId: "chapter-1",
        imageData: "data:image/jpeg;base64,abc",
        caption: "",
        sortOrder: 5,
        sizing: "standard",
        layout: "top-pair-bottom",
        frames: JSON.stringify([
          { id: "frame-1", imageData: "data:image/jpeg;base64,abc" },
          { id: "frame-2", imageData: "data:image/jpeg;base64,def" },
          { id: "frame-3", imageData: "data:image/jpeg;base64,ghi" },
        ]),
        borderStyle: "black",
        imageFit: "contain",
        aspectRatio: null,
        overlays: "[]",
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const transaction = vi.fn(async (callback) => callback({
      execute: vi.fn().mockResolvedValue(undefined),
      query: {
        panels: { findMany: vi.fn().mockResolvedValue([{ sortOrder: 4 }]) },
      },
      insert,
    }));
    const chapterWhere = vi.fn().mockResolvedValue(undefined);
    const chapterSet = vi.fn().mockReturnValue({ where: chapterWhere });
    const update = vi.fn().mockReturnValue({ set: chapterSet });

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(createMockStory()) },
          collaborators: { findFirst: vi.fn() },
          chapters: { findFirst: vi.fn().mockResolvedValue(createMockChapter()) },
          panels: { findMany: vi.fn().mockResolvedValue([{ caption: "", overlays: "[]" }]) },
        },
        transaction,
        update,
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/panels/route");
    const req = createMockRequest("/api/stories/story-1/chapters/chapter-1/panels", {
      method: "POST",
      body: {
        panels: [
          {
            imageData: "data:image/jpeg;base64,abc",
            caption: "",
            sizing: "standard",
            layout: "top-pair-bottom",
            frames: JSON.stringify([
              { id: "frame-1", imageData: "data:image/jpeg;base64,abc" },
              { id: "frame-2", imageData: "data:image/jpeg;base64,def" },
              { id: "frame-3", imageData: "data:image/jpeg;base64,ghi" },
            ]),
            borderStyle: "black",
            imageFit: "contain",
            aspectRatio: null,
            overlays: "[]",
          },
        ],
      },
    });
    const res = await mod.POST(req, createMockParams({
      storyId: "story-1",
      chapterId: "chapter-1",
    }));
    const { status } = await getResponseData(res);

    expect(status).toBe(201);
    expect(values).toHaveBeenCalledWith([
      expect.objectContaining({
        aspectRatio: null,
        frames: expect.stringContaining("frame-3"),
        layout: "top-pair-bottom",
        borderStyle: "black",
        imageFit: "contain",
        sortOrder: 5,
        sizing: "standard",
      }),
    ]);
  });

  it("rejects panel updates when the chapter does not belong to the story", async () => {
    vi.resetModules();
    const update = vi.fn();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(createMockStory()) },
          collaborators: { findFirst: vi.fn() },
          chapters: { findFirst: vi.fn().mockResolvedValue(null) },
          panels: { findFirst: vi.fn() },
        },
        update,
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/panels/[panelId]/route");
    const req = createMockRequest("/api/stories/story-1/chapters/other-chapter/panels/panel-1", {
      method: "PATCH",
      body: { caption: "New caption" },
    });
    const res = await mod.PATCH(req, createMockParams({
      storyId: "story-1",
      chapterId: "other-chapter",
      panelId: "panel-1",
    }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as ApiBody).error?.code).toBe("NOT_FOUND");
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects panel reorder when the chapter does not belong to the story", async () => {
    vi.resetModules();
    const update = vi.fn();

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(createMockStory()) },
          collaborators: { findFirst: vi.fn() },
          chapters: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        update,
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/panels/reorder/route");
    const req = createMockRequest("/api/stories/story-1/chapters/other-chapter/panels/reorder", {
      method: "PUT",
      body: { panels: [{ id: "00000000-0000-4000-8000-000000000001", sortOrder: 0 }] },
    });
    const res = await mod.PUT(req, createMockParams({
      storyId: "story-1",
      chapterId: "other-chapter",
    }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(404);
    expect((body as ApiBody).error?.code).toBe("NOT_FOUND");
    expect(update).not.toHaveBeenCalled();
  });

  it("allows accepted collaborators to reorder panels in a matching chapter", async () => {
    vi.resetModules();
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });

    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          stories: { findFirst: vi.fn().mockResolvedValue(createMockStory({ userId: "owner-1", writingMode: "co-op" })) },
          collaborators: { findFirst: vi.fn().mockResolvedValue({ id: "collab-1" }) },
          chapters: { findFirst: vi.fn().mockResolvedValue(createMockChapter()) },
        },
        update,
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => mockApiUtils());

    const mod = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/panels/reorder/route");
    const req = createMockRequest("/api/stories/story-1/chapters/chapter-1/panels/reorder", {
      method: "PUT",
      body: { panels: [{ id: "00000000-0000-4000-8000-000000000001", sortOrder: 0 }] },
    });
    const res = await mod.PUT(req, createMockParams({
      storyId: "story-1",
      chapterId: "chapter-1",
    }));
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as ApiBody).data?.reordered).toBe(true);
    expect(update).toHaveBeenCalled();
  });
});
