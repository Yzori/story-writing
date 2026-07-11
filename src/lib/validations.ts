import { z } from "zod";
import { CAMPAIGN_TURN_TYPES, CAMPAIGN_TURN_TYPES_ALLOW_EMPTY } from "@/lib/campaign-turns";

// ── Stories ──────────────────────────────────────────────────

const coverImageUrlSchema = z.string().max(2_000_000).refine((value) => {
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Cover image must be an image data URL or HTTP(S) URL");

export const createStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  writingMode: z.enum(["solo", "co-op", "campaign"]).optional(),
  synopsis: z.string().max(5000).optional(),
  hook: z.string().max(280).optional(),
  coverImageUrl: coverImageUrlSchema.optional(),
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
  campaignSeats: z.number().int().min(2).max(6).optional(),
  campaignToneMood: z.number().int().min(0).max(100).optional(),
  campaignToneScale: z.number().int().min(0).max(100).optional(),
  campaignToneInfluence: z.number().int().min(0).max(100).optional(),
  campaignCadence: z.string().max(160).optional(),
  campaignAuditionPrompt: z.string().max(1000).optional(),
  campaignStrangerEnabled: z.boolean().optional(),
  campaignStrangerName: z.string().max(80).nullable().optional(),
  campaignStrangerNature: z.string().max(500).nullable().optional(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  format: z.enum(["novel", "webtoon", "poetry", "illustrated", "screenplay"]).optional(),
  synopsis: z.string().max(5000).optional(),
  hook: z.string().max(280).optional(),
  coverImageUrl: coverImageUrlSchema.nullable().optional(),
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
  campaignSeats: z.number().int().min(2).max(6).optional(),
  campaignToneMood: z.number().int().min(0).max(100).optional(),
  campaignToneScale: z.number().int().min(0).max(100).optional(),
  campaignToneInfluence: z.number().int().min(0).max(100).optional(),
  campaignCadence: z.string().max(160).optional(),
  campaignAuditionPrompt: z.string().max(1000).optional(),
  campaignStrangerEnabled: z.boolean().optional(),
  campaignStrangerName: z.string().max(80).nullable().optional(),
  campaignStrangerNature: z.string().max(500).nullable().optional(),
  // URL of a map background for the campaign's SpatialMap view. Capped at
  // 4096 chars on purpose — the avatar bloat incident showed how data:
  // URIs in DB columns blow up auth cookies. Real image upload lives in a
  // separate task; for now this accepts URLs (or small inline SVG).
  mapImageUrl: z.string().max(4096).nullable().optional(),
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
    sizing: z.enum(["tall", "wide", "standard", "custom", "full"]).optional(),
    layout: z.enum(["single", "side-by-side", "stack", "top-pair-bottom", "left-stack-right", "grid-4", "mosaic-5", "grid-6"]).optional(),
    frames: z.string().max(6_000_000).optional(),
    borderStyle: z.enum(["none", "black", "light"]).optional(),
    imageFit: z.enum(["cover", "contain", "top"]).optional(),
    aspectRatio: z.string().max(20).nullable().optional(),
    overlays: z.string().max(50000).optional(),
    seam: z.enum(["none", "beat", "pause", "breath", "blackout"]).optional(),
  })).min(1).max(20),
});

export const updatePanelSchema = z.object({
  imageData: z.string().max(1_500_000).optional(),
  caption: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  sizing: z.enum(["tall", "wide", "standard", "custom", "full"]).optional(),
  layout: z.enum(["single", "side-by-side", "stack", "top-pair-bottom", "left-stack-right", "grid-4", "mosaic-5", "grid-6"]).optional(),
  frames: z.string().max(6_000_000).optional(),
  borderStyle: z.enum(["none", "black", "light"]).optional(),
  imageFit: z.enum(["cover", "contain", "top"]).optional(),
  aspectRatio: z.string().max(20).nullable().optional(),
  overlays: z.string().max(50000).optional(),
  seam: z.enum(["none", "beat", "pause", "breath", "blackout"]).optional(),
});

export const createAssetSchema = z.object({
  name: z.string().max(120).optional(),
  imageData: z.string().max(1_500_000), // ~1MB base64, same ceiling as panels
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

const portraitSchema = z
  .string()
  .max(250000, "Portrait must be smaller than 250KB")
  .refine(
    (value) =>
      !value ||
      value.startsWith("data:image/jpeg;base64,") ||
      value.startsWith("data:image/png;base64,") ||
      value.startsWith("data:image/webp;base64,") ||
      /^https?:\/\/\S+$/i.test(value),
    "Portrait must be a PNG, JPG, WebP, or image URL"
  );

export const createPlayerCharacterSchema = z.object({
  name: z.string().min(1, "Character name is required").max(200),
  portrait: portraitSchema.optional(),
  description: z.string().max(5000).optional(),
  traits: z.string().max(5000).optional(),
  backstory: z.string().max(10000).optional(),
  stats: z.string().max(10000).optional(),
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
  // Cliffhanger seeds the "Previously, on…" card next session. Kept tight
  // (280 chars) so the GM writes a hook, not a paragraph.
  cliffhanger: z.string().max(280).optional(),
  closingMood: z.string().max(50).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  activePlayerId: z.string().uuid().nullable().optional(),
  // Settling the audience's wagers rides the same end-of-session PATCH as
  // the epilogue: checked slips came true, everything else left open goes
  // false. NOT a session column — the route destructures it out before the
  // UPDATE ... SET spread.
  wagerResults: z
    .array(z.object({ id: z.string().uuid(), cameTrue: z.boolean() }))
    .max(50)
    .optional(),
});

// The audience's wager — one short prediction, pinned at the rim. Signed-in
// to write (free text needs a name behind it server-side, even though no
// name ever leaves the room); anonymous token to hold.
export const createWagerSchema = z.object({
  content: z.string().min(1, "Write the wager first").max(120),
});

export const createWagerHoldSchema = z.object({
  token: z.string().min(1).max(200),
});

// ── Campaign Turns ─────────────────────────────────────────

// scene-break is a structural marker the GM drops between scenes; it can
// have empty content (the metadata carries the title/mood). Story moments
// carry their main beat in content, so they follow the prose content rule.
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

// Crossroads has ONE table shape: players write competing responses, the
// table votes, the GM canonizes. (The house_fork/gm_pick modes, constituency,
// binding pledge, and drops-weighted audience ballots were killed 2026-07-01
// — see docs/adventure-audit.md.) Mode "stranger" is the one deliberate
// resurrection of GM-authored options: the Director frames 2–4 deeds for the
// audience-played Stranger and the house's pulses are the ballot. Deeds
// arrive with the round — the submissions endpoint stays closed to it.
// Lobby modes (draft sessions only): "warmup" — the Director leaves one
// question, the cast answers in a line, one lifted answer may open the
// story; "temperature" — the Director poses 2–4 options and the room leans.
// A temperature is NOT a vote: non-binding forever, prints nothing, never
// resolvable via the API (the begin transaction closes it).
export const createFloorRoundSchema = z
  .object({
    prompt: z.string().min(1, "Prompt is required").max(1000),
    audiencePulseEnabled: z.boolean().optional().default(false),
    mode: z.enum(["vote", "stranger", "warmup", "temperature"]).optional().default("vote"),
    deeds: z.array(z.string().min(1).max(500)).max(4).optional(),
    options: z.array(z.string().min(1).max(120)).max(4).optional(),
  })
  .refine(
    (data) => data.mode !== "stranger" || (data.deeds && data.deeds.length >= 2),
    { message: "The Stranger needs at least two deeds to choose between" },
  )
  .refine((data) => data.mode === "stranger" || !data.deeds, {
    message: "Only Stranger rounds carry deeds",
  })
  .refine(
    (data) => data.mode !== "temperature" || (data.options && data.options.length >= 2),
    { message: "A temperature needs at least two options to lean between" },
  )
  .refine((data) => data.mode === "temperature" || !data.options, {
    message: "Only temperature rounds carry options",
  });

export const updateFloorRoundSchema = z
  .object({
    status: z.enum(["voting", "closed", "resolved", "cancelled"]).optional(),
    selectedSubmissionId: z.string().uuid().optional(),
    // Warm-up lift: mark one answer to open the story at begin. Null un-lifts.
    liftSubmissionId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.liftSubmissionId !== undefined, {
    message: "Nothing to update",
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

export const createApplicationSchema = z
  .object({
    pitch: z.string().max(5000).optional(),
    characterName: z.string().min(1).max(60).optional(),
    characterArchetype: z.string().max(80).optional(),
    characterKnownFor: z.string().max(120).optional(),
    characterPortrait: portraitSchema.optional(),
    firstGlimpse: z.string().max(1500).optional(),
    playerCadence: z.string().max(80).optional(),
    playerSpotlight: z.enum(["driver", "reactor", "fades"]).optional(),
    writingSampleUrl: z.string().max(500).optional(),
    voiceCadence: z.string().max(40).optional(),
    voiceMood: z.string().max(40).optional(),
    voiceRestraint: z.string().max(40).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.pitch?.trim()) ||
      Boolean(
        data.characterName?.trim() &&
          data.characterKnownFor?.trim() &&
          data.firstGlimpse?.trim()
      ),
    { message: "Audition details are required" }
  );

export const updateApplicationSchema = z.object({
  status: z.enum(["approved", "declined", "voting"]),
  votingDeadline: z.string().datetime().optional(),
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
  // Cap at the poll option max (5) and dedupe — duplicate indices would let
  // a single voter inflate an option's tally arbitrarily.
  selectedOptions: z
    .array(z.number().int().min(0))
    .max(5)
    .transform((selected) => [...new Set(selected)]),
});

export const closeSessionPollSchema = z.object({
  confirmedOption: z.string().max(200),
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

export const houseGoldSchema = z.object({
  amount: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]),
  // A line set in gold — omitted, the gold is for the whole table.
  turnId: z.string().uuid().optional(),
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

// Story map-image URL. Capped tight on purpose — the avatar incident
// taught us not to let big data: URIs live in DB columns. URLs only,
// short data: SVGs accepted as a convenience.
export const storyMapImageSchema = z.string().max(4096).nullable();

// ── Adventures ("the table") ─────────────────────────────────

export const ADVENTURE_PACES = [
  "turn-daily",
  "turn-2-days",
  "turn-weekly",
  "live",
] as const;

// Six distinct inks — the theme aliases violet→lavender and burnt→copper,
// so offering those would give two writers identical-looking "different" inks.
export const ADVENTURE_INK_COLORS = [
  "amber",
  "rose",
  "sage",
  "lavender",
  "teal",
  "copper",
] as const;

const adventureCharacterFields = {
  characterName: z.string().min(1).max(80),
  characterBrief: z.string().max(500).default(""),
  inkColor: z.enum(ADVENTURE_INK_COLORS).default("amber"),
};

export const createAdventureSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    premise: z.string().min(1, "Premise is required").max(1000),
    genre: z.string().min(1, "Genre is required").max(50),
    pace: z.enum(ADVENTURE_PACES),
    mySeat: z.enum(["director", "writer"]),
    writerSeats: z.number().int().min(2).max(4).default(3),
    boardVisibility: z.enum(["private", "board"]).default("private"),
    characterName: adventureCharacterFields.characterName.optional(),
    characterBrief: z.string().max(500).optional(),
    inkColor: z.enum(ADVENTURE_INK_COLORS).optional(),
  })
  .refine((data) => data.mySeat !== "writer" || !!data.characterName, {
    message: "Writers bring a character to the table",
    path: ["characterName"],
  });

export const signAdventurePassageSchema = z.object({
  content: z.string().min(1, "Write something first").max(50_000),
});

export const passAdventureSpotlightSchema = z.object({
  toSeatId: z.string().uuid(),
});

export const raiseAdventureHandSchema = z.object({
  whisper: z.string().max(200).optional(),
});

export const adventureSceneSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"),
    title: z.string().max(200).default(""),
    newAct: z.boolean().default(false),
    opening: z.string().max(50_000).optional(),
  }),
  z.object({
    action: z.literal("close"),
  }),
]);

export const adventureSeatSetupSchema = z.object(adventureCharacterFields);
