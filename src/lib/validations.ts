import { z } from "zod";

// ── Stories ──────────────────────────────────────────────────

export const createStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  format: z.enum(["prose", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  synopsis: z.string().max(5000).optional(),
  coverImageUrl: z.string().optional(),
  genres: z.array(z.string()).optional(),
  contentRating: z.string().optional(),
  status: z.string().optional(),
  dedication: z.string().max(2000).optional(),
  language: z.string().optional(),
  epigraph: z.string().max(2000).optional(),
  epigraphAttribution: z.string().max(500).optional(),
  foreword: z.string().max(10000).optional(),
  showToc: z.boolean().optional(),
  dropCaps: z.boolean().optional(),
  sceneBreakStyle: z
    .enum(["asterism", "fleuron", "dots", "line", "space"])
    .optional(),
  dailyWordTarget: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  format: z.enum(["prose", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  synopsis: z.string().max(5000).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  genres: z.array(z.string()).optional(),
  contentRating: z.string().optional(),
  status: z.string().optional(),
  dedication: z.string().max(2000).optional(),
  language: z.string().optional(),
  epigraph: z.string().max(2000).optional(),
  epigraphAttribution: z.string().max(500).optional(),
  foreword: z.string().max(10000).optional(),
  showToc: z.boolean().optional(),
  dropCaps: z.boolean().optional(),
  sceneBreakStyle: z
    .enum(["asterism", "fleuron", "dots", "line", "space"])
    .optional(),
  dailyWordTarget: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  slug: z.string().min(1).max(500).optional(),
});

// ── Chapters ─────────────────────────────────────────────────

export const createChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  authorNoteBefore: z.string().max(5000).optional(),
  authorNoteAfter: z.string().max(5000).optional(),
  outline: z.string().max(10000).optional(),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  authorNoteBefore: z.string().max(5000).optional(),
  authorNoteAfter: z.string().max(5000).optional(),
  outline: z.string().max(10000).optional(),
});

// ── Reorder ──────────────────────────────────────────────────

export const reorderChaptersSchema = z.object({
  chapters: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1),
});

// ── Bible Entries ────────────────────────────────────────────

export const createBibleEntrySchema = z.object({
  type: z.enum(["character", "place", "note"]),
  name: z.string().min(1, "Name is required").max(500),
  description: z.string().max(10000).optional(),
  details: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateBibleEntrySchema = z.object({
  type: z.enum(["character", "place", "note"]).optional(),
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  details: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
