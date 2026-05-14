import { describe, expect, it } from "vitest";
import { reconcileSuccessfulChapterSaves } from "@/hooks/use-chapter-autosave";

describe("reconcileSuccessfulChapterSaves", () => {
  it("clears a pending save when the saved snapshot is still current", () => {
    const pending = new Map([
      ["chapter-1", { content: "<p>Saved</p>", version: 1 }],
    ]);

    reconcileSuccessfulChapterSaves(pending, [
      {
        chapterId: "chapter-1",
        content: "<p>Saved</p>",
        version: 1,
        status: 200,
        ok: true,
        json: { data: { version: 2 } },
      },
    ]);

    expect(pending.has("chapter-1")).toBe(false);
  });

  it("keeps newer in-flight edits and advances their base version", () => {
    const pending = new Map([
      ["chapter-1", { content: "<p>Newer edit</p>", version: 1 }],
    ]);

    reconcileSuccessfulChapterSaves(pending, [
      {
        chapterId: "chapter-1",
        content: "<p>Older snapshot</p>",
        version: 1,
        status: 200,
        ok: true,
        json: { data: { version: 2 } },
      },
    ]);

    expect(pending.get("chapter-1")).toEqual({
      content: "<p>Newer edit</p>",
      version: 2,
    });
  });

  it("keeps newer edits unchanged when the response has no version", () => {
    const pending = new Map([
      ["chapter-1", { content: "<p>Newer edit</p>", version: 1 }],
    ]);

    reconcileSuccessfulChapterSaves(pending, [
      {
        chapterId: "chapter-1",
        content: "<p>Older snapshot</p>",
        version: 1,
        status: 200,
        ok: true,
        json: { data: {} },
      },
    ]);

    expect(pending.get("chapter-1")).toEqual({
      content: "<p>Newer edit</p>",
      version: 1,
    });
  });
});
