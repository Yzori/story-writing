import { z } from "zod";

// ── Stories ──────────────────────────────────────────────────

export const createStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  writingMode: z.enum(["solo", "co-op", "campaign"]).optional(),
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
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
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
  writingMode: z.enum(["solo", "co-op", "campaign"]).optional(),
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

// ── Comments ────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  parentId: z.string().uuid().optional(),
});

// ── Creator Updates ─────────────────────────────────────────

export const createUpdateSchema = z.object({
  content: z.string().min(1, "Update cannot be empty").max(1000),
});

// ── Flags (content reports) ─────────────────────────────────

export const createFlagSchema = z.object({
  reason: z.enum(["misrated", "harmful", "spam"]),
  details: z.string().max(1000).optional(),
  storyId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
});

// ── Reactions ───────────────────────────────────────────────

export const createReactionSchema = z.object({
  type: z.enum([
    "gasped",
    "cried",
    "laughed",
    "need-more",
    "saw-it-coming",
    "heartbroken",
    "inspired",
    "terrified",
  ]),
});

// ── User Preferences ────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  comfortRating: z.enum(["everyone", "teen", "mature", "explicit"]).optional(),
  readingMode: z.enum(["paginated", "scroll"]).optional(),
  readingFont: z.enum(["default", "serif", "sans", "mono"]).optional(),
});

// ── Collaborators ───────────────────────────────────────────

export const createCollaboratorSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["writer", "illustrator", "editor", "worldbuilder"]),
});

export const updateCollaboratorSchema = z.object({
  status: z.enum(["pending", "accepted", "declined"]).optional(),
  role: z.enum(["writer", "illustrator", "editor", "worldbuilder"]).optional(),
});

// ── Agreements ──────────────────────────────────────────────

export const createAgreementSchema = z.object({
  template: z.enum(["equal-partners", "lead-contributor", "work-for-hire", "custom"]),
  ownershipSplit: z.string().max(2000).optional(),
  creditFormat: z.string().max(2000).optional(),
  terms: z.string().max(10000).optional(),
});

// ── Suggestions ─────────────────────────────────────────────

export const createSuggestionSchema = z.object({
  chapterId: z.string().uuid("Invalid chapter ID"),
  content: z.string().min(1, "Content is required"),
  note: z.string().max(2000).optional(),
});

export const updateSuggestionSchema = z.object({
  status: z.enum(["pending", "woven", "revised", "passed"]),
  reviewNote: z.string().max(2000).optional(),
});

// ── Open Calls ──────────────────────────────────────────────

export const createOpenCallSchema = z.object({
  role: z.string().min(1, "Role is required").max(200),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().min(1, "Description is required").max(5000),
  requirements: z.string().max(5000).optional(),
});

export const createOpenCallResponseSchema = z.object({
  pitch: z.string().min(1, "Pitch is required").max(5000),
});

// ── Lore Entries ────────────────────────────────────────────

export const createLoreEntrySchema = z.object({
  category: z.enum(["character", "place", "event", "item", "lore"]),
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateLoreEntrySchema = z.object({
  category: z.enum(["character", "place", "event", "item", "lore"]).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Player Characters ──────────────────────────────────────

export const createPlayerCharacterSchema = z.object({
  name: z.string().min(1, "Character name is required").max(200),
  portrait: z.string().optional(),
  description: z.string().max(5000).optional(),
  traits: z.string().max(5000).optional(),
  backstory: z.string().max(10000).optional(),
});

export const updatePlayerCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  portrait: z.string().optional(),
  description: z.string().max(5000).optional(),
  traits: z.string().max(5000).optional(),
  backstory: z.string().max(10000).optional(),
  status: z.enum(["active", "retired", "dead"]).optional(),
});

// ── Campaign Sessions ──────────────────────────────────────

export const createCampaignSessionSchema = z.object({
  title: z.string().min(1, "Session title is required").max(500),
  summary: z.string().max(5000).optional(),
});

export const updateCampaignSessionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(5000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

// ── Campaign Turns ─────────────────────────────────────────

export const createCampaignTurnSchema = z.object({
  characterId: z.string().uuid().optional(),
  type: z.enum(["narration", "action", "dialogue", "roll", "ooc"]),
  content: z.string().min(1, "Content is required").max(10000),
  metadata: z.string().max(5000).optional(),
});

// ── Reading Progress ────────────────────────────────────────

export const upsertReadingProgressSchema = z.object({
  storyId: z.string().uuid("Invalid story ID"),
  chapterId: z.string().uuid("Invalid chapter ID"),
  scrollPercent: z.number().int().min(0).max(100).optional(),
  pageNumber: z.number().int().min(1).optional(),
});
