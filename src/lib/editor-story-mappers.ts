import type { Chapter, StoryBible } from "@/types/editor";

/**
 * Pure mappers between the API's story/chapter/bible shapes and the editor's
 * local StoryProject model, plus the localStorage helpers for editor-only
 * settings (typography, goals). Lifted out of write/[storyId]/page.tsx so the
 * page and the useStoryLoader hook share one source of truth.
 */

// ── Editor-only settings (localStorage) ──────────────────────
function editorSettingsKey(storyId: string) {
  return `quiloria-editor-${storyId}`;
}

export function loadEditorSettings(storyId: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(editorSettingsKey(storyId));
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveEditorSettings(storyId: string, settings: Record<string, unknown>) {
  try {
    localStorage.setItem(editorSettingsKey(storyId), JSON.stringify(settings));
  } catch {
    // Storage full / unavailable — server copy remains canonical.
  }
}

// ── Bible: API entries → local StoryBible ────────────────────
export interface ApiBibleEntry {
  id: string;
  type: string;
  name: string;
  description: string;
  details: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function parseDetails(details: string): Record<string, unknown> {
  if (!details) return {};
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function apiBibleToLocal(entries: ApiBibleEntry[]): StoryBible {
  const characters = entries
    .filter((e) => e.type === "character")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        name: e.name,
        aliases: stringArray(extra.aliases),
        description: e.description || "",
        imageDataUrl: nullableString(extra.imageDataUrl),
        color: stringValue(extra.color, "#D4A574"),
        tags: stringArray(extra.tags),
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  const places = entries
    .filter((e) => e.type === "place")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        name: e.name,
        description: e.description || "",
        imageDataUrl: nullableString(extra.imageDataUrl),
        tags: stringArray(extra.tags),
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  const notes = entries
    .filter((e) => e.type === "note")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        title: e.name,
        content: e.description || "",
        category: (extra.category || "custom") as
          | "lore"
          | "timeline"
          | "research"
          | "custom",
        tags: stringArray(extra.tags),
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  return { characters, places, notes };
}

// ── Chapters: API chapter → local Chapter ────────────────────
export interface ApiChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  sortOrder: number;
  status: "draft" | "published";
  authorNoteBefore: string;
  authorNoteAfter: string;
  outline: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function apiChapterToLocal(ch: ApiChapter): Chapter {
  return {
    id: ch.id,
    title: ch.title || "Untitled",
    content: ch.content || "",
    wordCount: ch.wordCount || 0,
    createdAt: new Date(ch.createdAt).getTime(),
    updatedAt: new Date(ch.updatedAt).getTime(),
    status: ch.status || "draft",
    authorNoteBefore: ch.authorNoteBefore || "",
    authorNoteAfter: ch.authorNoteAfter || "",
    outline: ch.outline || "",
    version: ch.version || 1,
    snapshots: [],
  };
}
