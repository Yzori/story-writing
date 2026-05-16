import { z } from "zod";
import { CAMPAIGN_TURN_TYPES, CAMPAIGN_TURN_TYPES_ALLOW_EMPTY } from "@/lib/campaign-turns";

// ── Stories ──────────────────────────────────────────────────

export const createStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  writingMode: z.enum(["solo", "co-op", "campaign"]).optional(),
  synopsis: z.string().max(5000).optional(),
  hook: z.string().max(280).optional(),
  coverImageUrl: z.string().optional(),
  genres: z.array(z.string()).optional(),
  contentRating: z.string().optional(),
  contentNotes: z.array(z.string()).max(10).optional(),
  status: z.string().optional(),
  dedication: z.string().max(2000).optional(),
  language: z.string().optional(),
  epigraph: z.string().max(2000).optional(),
  epigraphAttribution: z.string().max(500).optional(),
  foreword: z.string().max(10000).optional(),
  showToc: z.boolean().optional(),
  dropCaps: z.boolean().optional(),
  sceneBreakStyle: z
    .enum(["asterism", "fleuron", "dots", "line", "text-line", "space"])
    .optional(),
  paragraphIndent: z.boolean().optional(),
  lineSpacing: z.enum(["compact", "comfortable", "relaxed"]).optional(),
  textAlignment: z.enum(["left", "center", "justified"]).optional(),
  paragraphSpacing: z.enum(["tight", "normal", "loose"]).optional(),
  dailyWordTarget: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  synopsis: z.string().max(5000).optional(),
  hook: z.string().max(280).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  genres: z.array(z.string()).optional(),
  contentRating: z.string().optional(),
  contentNotes: z.array(z.string()).max(10).optional(),
  status: z.string().optional(),
  dedication: z.string().max(2000).optional(),
  language: z.string().optional(),
  epigraph: z.string().max(2000).optional(),
  epigraphAttribution: z.string().max(500).optional(),
  foreword: z.string().max(10000).optional(),
  showToc: z.boolean().optional(),
  dropCaps: z.boolean().optional(),
  sceneBreakStyle: z
    .enum(["asterism", "fleuron", "dots", "line", "text-line", "space"])
    .optional(),
  paragraphIndent: z.boolean().optional(),
  lineSpacing: z.enum(["compact", "comfortable", "relaxed"]).optional(),
  textAlignment: z.enum(["left", "center", "justified"]).optional(),
  paragraphSpacing: z.enum(["tight", "normal", "loose"]).optional(),
  dailyWordTarget: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  writingMode: z.enum(["solo", "co-op", "campaign"]).optional(),
  slug: z.string().min(1).max(500).optional(),
});

// ── Chapters ─────────────────────────────────────────────────

export const createChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(500000).optional(), // ~500KB max per chapter, roughly 80K words
  status: z.enum(["draft", "published"]).optional(),
  authorNoteBefore: z.string().max(5000).optional(),
  authorNoteAfter: z.string().max(5000).optional(),
  outline: z.string().max(10000).optional(),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(500000).optional(), // ~500KB max per chapter, roughly 80K words
  status: z.enum(["draft", "published"]).optional(),
  authorNoteBefore: z.string().max(5000).optional(),
  authorNoteAfter: z.string().max(5000).optional(),
  outline: z.string().max(10000).optional(),
  baseVersion: z.number().int().positive().optional(), // optimistic locking
});

// ── Webtoon Panels ──────────────────────────────────────────

export const createPanelsSchema = z.object({
  panels: z.array(z.object({
    imageData: z.string().max(1_500_000), // ~1MB base64
    caption: z.string().max(2000).optional(),
    sortOrder: z.number().int().min(0).optional(),
    sizing: z.enum(["tall", "wide", "standard", "custom"]).optional(),
    layout: z.enum(["single", "side-by-side", "stack", "top-pair-bottom", "left-stack-right", "grid-4", "mosaic-5", "grid-6"]).optional(),
    frames: z.string().max(6_000_000).optional(),
    borderStyle: z.enum(["none", "black", "light"]).optional(),
    imageFit: z.enum(["cover", "contain", "top"]).optional(),
    aspectRatio: z.string().max(20).nullable().optional(),
    overlays: z.string().max(50000).optional(),
  })).min(1).max(20),
});

export const updatePanelSchema = z.object({
  imageData: z.string().max(1_500_000).optional(),
  caption: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  sizing: z.enum(["tall", "wide", "standard", "custom"]).optional(),
  layout: z.enum(["single", "side-by-side", "stack", "top-pair-bottom", "left-stack-right", "grid-4", "mosaic-5", "grid-6"]).optional(),
  frames: z.string().max(6_000_000).optional(),
  borderStyle: z.enum(["none", "black", "light"]).optional(),
  imageFit: z.enum(["cover", "contain", "top"]).optional(),
  aspectRatio: z.string().max(20).nullable().optional(),
  overlays: z.string().max(50000).optional(),
});

export const reorderPanelsSchema = z.object({
  panels: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
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
  emailNotifications: z.boolean().optional(),
  emailDigestMode: z.enum(["instant", "daily", "weekly", "off"]).optional(),
  preferredGenres: z.array(z.string().max(64)).max(20).optional(),
  preferredReadLength: z.enum(["quick", "short", "medium", "long", "any"]).optional(),
  /** Pass `true` to stamp onboardedAt to now. Cannot be unset. */
  markOnboarded: z.boolean().optional(),
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

const splitEntrySchema = z.object({
  userId: z.string().uuid(),
  percent: z.number().min(0).max(100),
});

export const createAgreementSchema = z.object({
  template: z.enum(["equal-partners", "lead-contributor", "work-for-hire", "custom"]),
  splits: z.array(splitEntrySchema).min(1).max(20),
  creditFormat: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
}).refine(
  (data) => Math.abs(data.splits.reduce((s, e) => s + e.percent, 0) - 100) < 0.01,
  { message: "Splits must total 100%" }
);

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
  stats: z.string().max(10000).optional(),
});

export const updatePlayerCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  portrait: z.string().optional(),
  description: z.string().max(5000).optional(),
  traits: z.string().max(5000).optional(),
  backstory: z.string().max(10000).optional(),
  stats: z.string().max(10000).optional(),
  status: z.enum(["active", "retired", "dead"]).optional(),
});

// ── Campaign Sessions ──────────────────────────────────────

export const createCampaignSessionSchema = z.object({
  title: z.string().min(1, "Session title is required").max(500),
  summary: z.string().max(5000).optional(),
  opening: z.string().max(20000).optional(),
});

export const updateCampaignSessionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(5000).optional(),
  opening: z.string().max(20000).optional(),
  epilogue: z.string().max(5000).optional(),
  closingMood: z.string().max(50).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  activePlayerId: z.string().uuid().nullable().optional(),
});

// ── Campaign Turns ─────────────────────────────────────────

// scene-break is a structural marker the GM drops between scenes; it can
// have empty content (the metadata carries the title/mood). Prose types
// (action/dialogue/etc.) still must have non-empty content.
export const createCampaignTurnSchema = z
  .object({
    characterId: z.string().uuid().optional(),
    type: z.enum(CAMPAIGN_TURN_TYPES),
    content: z.string().max(10000),
    metadata: z.string().max(5000).optional(),
  })
  .refine(
    (data) =>
      (CAMPAIGN_TURN_TYPES_ALLOW_EMPTY as readonly string[]).includes(data.type) ||
      data.content.length > 0,
    { message: "Content is required", path: ["content"] },
  );

export const createFloorRoundSchema = z
  .object({
    prompt: z.string().min(1, "Prompt is required").max(1000),
    mode: z.enum(["gm_pick", "vote"]).default("gm_pick"),
    audiencePulseEnabled: z.boolean().optional().default(false),
  })
  .refine((data) => !data.audiencePulseEnabled || data.mode === "vote", {
    message: "Audience Pulse requires vote mode",
    path: ["audiencePulseEnabled"],
  });

export const updateFloorRoundSchema = z.object({
  status: z.enum(["voting", "closed", "resolved", "cancelled"]),
  selectedSubmissionId: z.string().uuid().optional(),
});

export const createFloorSubmissionSchema = z.object({
  characterId: z.string().uuid(),
  type: z.enum(["action", "dialogue", "reaction", "description"]),
  content: z.string().min(1, "Content is required").max(10000),
});

export const createFloorVoteSchema = z.object({
  submissionId: z.string().uuid(),
});

export const createFloorAudiencePulseSchema = z.object({
  token: z.string().min(1).max(200),
  submissionId: z.string().uuid(),
});

// ── Campaign Applications ───────────────────────────────────

export const createApplicationSchema = z.object({
  pitch: z.string().min(1, "Pitch is required").max(5000),
});

export const updateApplicationSchema = z.object({
  status: z.enum(["approved", "declined", "voting"]),
  votingDeadline: z.string().datetime().optional(),
});

// ── Campaign Votes ──────────────────────────────────────────

export const createVoteSchema = z.object({
  vote: z.boolean(),
});

// ── GM Transfer ─────────────────────────────────────────────

export const transferGmSchema = z.object({
  newGmUserId: z.string().uuid("Invalid user ID"),
});

// ── Session Polls ───────────────────────────────────────────

export const createSessionPollSchema = z.object({
  title: z.string().max(500).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(5),
});

export const voteSessionPollSchema = z.object({
  selectedOptions: z.array(z.number().int().min(0)),
});

export const closeSessionPollSchema = z.object({
  confirmedOption: z.string().max(200),
});

// ── Progress Clocks ────────────────────────────────────────

export const createProgressClockSchema = z.object({
  name: z.string().min(1).max(200),
  segments: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  type: z.enum(["danger", "progress", "racing"]).default("danger"),
});

export const updateProgressClockSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  filled: z.number().int().min(0).optional(),
});

// ── Session Roster ──────────────────────────────────────────

export const updateSessionRosterSchema = z.object({
  characterIds: z.array(z.string().uuid()),
});

export const updateRosterEntrySchema = z.object({
  status: z.enum(["present", "absent", "introduced", "spectating"]),
});

// ── Reading Progress ────────────────────────────────────────

export const upsertReadingProgressSchema = z.object({
  storyId: z.string().uuid("Invalid story ID"),
  chapterId: z.string().uuid("Invalid chapter ID"),
  scrollPercent: z.number().int().min(0).max(100).optional(),
  pageNumber: z.number().int().min(1).optional(),
});

// ── Guild Profiles ──────────────────────────────────────────

// ── Spectator Reactions ────────────────────────────────────

export const spectatorReactionSchema = z.object({
  token: z.string().min(1).max(100),
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

// ── Ink Drop Tips ──────────────────────────────────────────

// ── Annotations ────────────────────────────────────────────

export const createAnnotationSchema = z.object({
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  content: z.string().min(1).max(2000),
  visibility: z.enum(["private", "public"]).default("private"),
}).refine((d) => d.endOffset > d.startOffset, {
  message: "endOffset must be greater than startOffset",
});

// ── Story Jams ─────────────────────────────────────────────

export const createJamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  theme: z.string().min(1).max(500),
  bannerUrl: z.string().url().max(1000).optional(),
  submissionStartsAt: z.string().datetime(),
  submissionEndsAt: z.string().datetime(),
  votingStartsAt: z.string().datetime(),
  votingEndsAt: z.string().datetime(),
  wordCountMin: z.number().int().min(0).optional(),
  wordCountMax: z.number().int().min(1).optional(),
  maxEntries: z.number().int().min(1).optional(),
});

export const submitJamEntrySchema = z.object({
  storyId: z.string().uuid(),
});

export const createJamVoteSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const boostStorySchema = z.object({
  durationHours: z.literal(24), // only 24h boosts for now
});

export const inkDropCheckoutSchema = z.object({
  tier: z.enum(["500", "1200", "3000"]),
});

export const inkDropTipSchema = z.object({
  recipientUserId: z.string().uuid("Invalid recipient"),
  amount: z.union([z.literal(5), z.literal(10), z.literal(25), z.literal(50), z.literal(100)]),
  message: z.string().max(200).optional(),
});

export const guildProfileSchema = z.object({
  tagline: z.string().max(200).optional(),
  roles: z.array(z.enum(["writer", "illustrator", "editor", "worldbuilder"])).min(1).max(4),
  genres: z.array(z.string()).max(10).optional(),
  availability: z.enum(["open", "selective", "busy", "unavailable"]),
  portfolioLinks: z.array(z.object({
    label: z.string().max(50),
    url: z.string().url().max(500),
  })).max(5).optional(),
  showcaseStoryIds: z.array(z.string().uuid()).max(5).optional(),
  yearsWriting: z.number().int().min(0).max(100).optional(),
  lookingFor: z.string().max(500).optional(),
});
