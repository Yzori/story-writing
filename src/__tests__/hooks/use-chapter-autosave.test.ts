import { describe, expect, it } from "vitest";
import {
  clearLocalChapterDraft,
  localDraftStorageKey,
  readLocalChapterDraft,
  reconcileSuccessfulChapterSaves,
  writeLocalChapterDraft,
} from "@/hooks/use-chapter-autosave";

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

describe("local chapter draft recovery", () => {
  it("writes, reads, and clears local chapter drafts", () => {
    const store = new Map<string, string>();
    const previousWindow = globalThis.window;
    const previousLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });

    try {
      writeLocalChapterDraft("story-1", "chapter-1", {
        content: "<p>Still here</p>",
        version: 3,
        reason: "failed-save",
      });

      expect(store.has(localDraftStorageKey("story-1", "chapter-1"))).toBe(true);
      expect(readLocalChapterDraft("story-1", "chapter-1")).toMatchObject({
        content: "<p>Still here</p>",
        version: 3,
        reason: "failed-save",
      });

      clearLocalChapterDraft("story-1", "chapter-1");
      expect(readLocalChapterDraft("story-1", "chapter-1")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage,
      });
    }
  });

  it("ignores malformed draft payloads", () => {
    const previousWindow = globalThis.window;
    const previousLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => JSON.stringify({ content: "<p>x</p>", version: "1" }),
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });

    try {
      expect(readLocalChapterDraft("story-1", "chapter-1")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage,
      });
    }
  });
});
