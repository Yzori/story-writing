import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  unique,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ── Users ────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  name: text("name"),
  displayName: text("display_name"),
  image: text("image"),
  avatarUrl: text("avatar_url"),
  password: text("password"),
  sessionVersion: integer("session_version").notNull().default(0),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  bio: text("bio"),
  role: text("role").notNull().default("writer"),
  comfortRating: text("comfort_rating").notNull().default("everyone"),
  readingMode: text("reading_mode").notNull().default("paginated"),
  readingFont: text("reading_font").notNull().default("default"),
  isAdmin: boolean("is_admin").notNull().default(false),
  inkDropBalance: integer("ink_drop_balance").notNull().default(100),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  // Email cadence: "instant" sends per-event (default), "daily"/"weekly" queue
  // until a digest is built by /api/cron/email-digest, "off" suppresses emails
  // entirely (effectively the same as emailNotifications=false; we keep both
  // for backwards compatibility — either being off suppresses sends).
  emailDigestMode: text("email_digest_mode").notNull().default("instant"),
  lastDigestSentAt: timestamp("last_digest_sent_at", { withTimezone: true }),
  // Subscription fields
  subscriptionTier: text("subscription_tier").notNull().default("free"), // 'free' | 'pro' | 'premium'
  subscriptionStatus: text("subscription_status").notNull().default("active"), // 'active' | 'cancelled' | 'past_due' | 'trialing'
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  // AI usage tracking
  aiRequestsThisMonth: integer("ai_requests_this_month").notNull().default(0),
  aiRequestsResetAt: timestamp("ai_requests_reset_at", { withTimezone: true }),
  // Free-tier "taste" — lifetime cap of free editorial AI passes.
  aiFreeGenerationsUsed: integer("ai_free_generations_used").notNull().default(0),
  // Reader streak — incremented when reading-progress is upserted on a new UTC day
  readingStreakDays: integer("reading_streak_days").notNull().default(0),
  readingStreakLastDay: text("reading_streak_last_day"), // YYYY-MM-DD (UTC)
  readingStreakBest: integer("reading_streak_best").notNull().default(0),
  // Reader onboarding — preferences captured at signup to prime the For You feed.
  preferredGenres: text("preferred_genres")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  preferredReadLength: text("preferred_read_length"), // "quick" | "short" | "medium" | "long" | null = no preference
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  // Study hosting — what the writer sets out for profile visitors.
  // Hearth: visitors may light a candle (7-day warm presence on the mantel).
  profileHearth: boolean("profile_hearth").notNull().default(true),
  // Letterbox policy: 'open' (anyone signed in) | 'followers' (follows one of
  // the writer's stories) | 'closed'. Letters are private until answered.
  profileLetterbox: text("profile_letterbox").notNull().default("open"),
  // Whether "Leave a gift" is set out on the profile.
  profileShowGifts: boolean("profile_show_gifts").notNull().default(true),
  // What fronts the profile cover's disc:
  //   'auto'     — the writer's best (most-sparked) work, portrait fallback
  //   'portrait' — the writer themselves
  //   'story'    — the specific work in profileCoverStoryId
  // When a work fronts the cover, the portrait rides along as a small
  // medallion beside the disc.
  profileCoverMode: text("profile_cover_mode").notNull().default("auto"),
  profileCoverStoryId: uuid("profile_cover_story_id").references(
    (): AnyPgColumn => stories.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  stories: many(stories),
  writingSessions: many(writingSessions),
  sparks: many(sparks),
  follows: many(follows),
  collaborators: many(collaborators),
  guildProfile: one(guildProfiles),
  sentTips: many(inkDropTransactions, { relationName: "sentTips" }),
  receivedTips: many(inkDropTransactions, { relationName: "receivedTips" }),
  deskNotes: many(deskNotes),
}));

// ── Stories ──────────────────────────────────────────────────

export const stories = pgTable("stories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  format: text("format").notNull().default("novel"),
  synopsis: text("synopsis").default(""),
  /** Author-curated 1-2 sentence pitch — surfaced on cards/feeds. */
  hook: text("hook").default(""),
  coverImageUrl: text("cover_image_url"),
  genres: text("genres")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  contentRating: text("content_rating").notNull().default("everyone"),
  contentNotes: text("content_notes").default("[]"),
  status: text("status").notNull().default("draft"),
  dedication: text("dedication").default(""),
  language: text("language").notNull().default("English"),
  epigraph: text("epigraph").default(""),
  epigraphAttribution: text("epigraph_attribution").default(""),
  foreword: text("foreword").default(""),
  showToc: boolean("show_toc").notNull().default(true),
  dropCaps: boolean("drop_caps").notNull().default(false),
  sceneBreakStyle: text("scene_break_style").notNull().default("asterism"),
  paragraphIndent: boolean("paragraph_indent").notNull().default(false),
  lineSpacing: text("line_spacing").notNull().default("comfortable"),
  textAlignment: text("text_alignment").notNull().default("left"),
  paragraphSpacing: text("paragraph_spacing").notNull().default("normal"),
  dailyWordTarget: integer("daily_word_target").notNull().default(500),
  feedImpressions: integer("feed_impressions").notNull().default(0),
  writingMode: text("writing_mode").notNull().default("solo"), // 'solo' | 'co-op' | 'campaign'
  campaignSeats: integer("campaign_seats").notNull().default(6),
  campaignToneMood: integer("campaign_tone_mood").notNull().default(62),
  campaignToneScale: integer("campaign_tone_scale").notNull().default(45),
  campaignToneInfluence: integer("campaign_tone_influence").notNull().default(35),
  campaignCadence: text("campaign_cadence").notNull().default("Cadence set by the GM"),
  campaignAuditionPrompt: text("campaign_audition_prompt")
    .notNull()
    .default("Write the moment we first meet your character. Where are they? What are they doing? What do they want, and what stops them from getting it?"),
  // Optional URL of a map image overlaid by the SpatialMap view. Capped at
  // the API layer (Zod max 4096) — never accept fat data: URIs here, the
  // avatar mistake showed how those balloon NextAuth cookies.
  mapImageUrl: text("map_image_url"),
  monetizationModel: text("monetization_model").notNull().default("free"), // 'free' | 'freemium' | 'gated'
  freeChapterCount: integer("free_chapter_count").notNull().default(3), // min free chapters for freemium
  defaultGatingTier: text("default_gating_tier").notNull().default("standard"), // default tier for new gated chapters
  isPublic: boolean("is_public").notNull().default(false),
  slug: text("slug").unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_stories_user_id").on(table.userId),
    index("idx_stories_browse").on(table.isPublic, table.status, table.deletedAt, table.publishedAt),
    index("idx_stories_status").on(table.status),
  ]
);

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, { fields: [stories.userId], references: [users.id] }),
  chapters: many(chapters),
  bibleEntries: many(bibleEntries),
  intelligenceArtifacts: many(storyIntelligenceArtifacts),
  writingSessions: many(writingSessions),
  sparks: many(sparks),
  follows: many(follows),
  comments: many(comments),
  creatorUpdates: many(creatorUpdates),
  collaborators: many(collaborators),
}));

// ── Chapters ─────────────────────────────────────────────────

export const chapters = pgTable("chapters", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").default(""),
  wordCount: integer("word_count").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("draft"),
  authorNoteBefore: text("author_note_before").default(""),
  authorNoteAfter: text("author_note_after").default(""),
  outline: text("outline").default(""),
  version: integer("version").notNull().default(1),
  sessionId: uuid("session_id").references(() => campaignSessions.id, { onDelete: "set null" }),
  gatingTier: text("gating_tier").notNull().default("free"), // 'free' | 'standard' (15) | 'extended' (30) | 'premium' (50)
  earlyAccessDays: integer("early_access_days").notNull().default(0), // 0 = no early access, 3/5/7
  earlyAccessUntil: timestamp("early_access_until", { withTimezone: true }), // null = no early access gate
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_chapters_story_id").on(table.storyId),
  index("idx_chapters_story_status_sort").on(table.storyId, table.status, table.sortOrder),
]);

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  story: one(stories, {
    fields: [chapters.storyId],
    references: [stories.id],
  }),
  session: one(campaignSessions, {
    fields: [chapters.sessionId],
    references: [campaignSessions.id],
  }),
  snapshots: many(chapterSnapshots),
  panels: many(panels),
}));

// ── Chapter Snapshots ────────────────────────────────────────

export const chapterSnapshots = pgTable("chapter_snapshots", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  label: text("label").default(""),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_chapter_snapshots_chapter_id").on(table.chapterId),
  ]
);

export const chapterSnapshotsRelations = relations(
  chapterSnapshots,
  ({ one }) => ({
    chapter: one(chapters, {
      fields: [chapterSnapshots.chapterId],
      references: [chapters.id],
    }),
  })
);

// ── Webtoon Panels ──────────────────────────────────────────

export const panels = pgTable("panels", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  imageData: text("image_data").notNull(),
  caption: text("caption").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  sizing: text("sizing").notNull().default("standard"), // tall | wide | standard | custom
  layout: text("layout").notNull().default("single"), // single | side-by-side | stack | top-pair-bottom | left-stack-right | grid-4 | mosaic-5 | grid-6
  frames: text("frames").default("[]"), // JSON: images inside this comic panel
  borderStyle: text("border_style").notNull().default("none"), // none | black | light
  imageFit: text("image_fit").notNull().default("cover"), // cover | contain | top
  aspectRatio: text("aspect_ratio"),
  overlays: text("overlays").default("[]"), // JSON: text overlay positions
  seam: text("seam").notNull().default("none"), // vertical pacing above panel: none | beat | pause | breath | blackout
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_panels_chapter_sort").on(table.chapterId, table.sortOrder),
]);

export const panelsRelations = relations(panels, ({ one }) => ({
  chapter: one(chapters, {
    fields: [panels.chapterId],
    references: [chapters.id],
  }),
}));

// Reusable image library per story (webtoon asset tray): characters,
// backgrounds, props an author drops into panel frames across episodes.
export const storyAssets = pgTable("story_assets", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  imageData: text("image_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_story_assets_story_id").on(table.storyId),
]);

export const storyAssetsRelations = relations(storyAssets, ({ one }) => ({
  story: one(stories, {
    fields: [storyAssets.storyId],
    references: [stories.id],
  }),
}));

// ── Bible Entries ────────────────────────────────────────────

export const bibleEntries = pgTable("bible_entries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'character' | 'place' | 'note'
  name: text("name").notNull(),
  description: text("description").default(""),
  details: text("details").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_bible_entries_story_id").on(table.storyId),
  ]
);

export const bibleEntriesRelations = relations(bibleEntries, ({ one }) => ({
  story: one(stories, {
    fields: [bibleEntries.storyId],
    references: [stories.id],
  }),
}));

// ── Story Intelligence Artifacts ─────────────────────────────

export const storyIntelligenceArtifacts = pgTable(
  "story_intelligence_artifacts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // chapter_summary | timeline | continuity_report | open_threads | style_profile
    sourceHash: text("source_hash").notNull(),
    content: text("content").notNull(),
    model: text("model"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_story_intel_story_type").on(table.storyId, table.type),
    index("idx_story_intel_chapter_type").on(table.chapterId, table.type),
    unique("story_intel_source_unique").on(table.storyId, table.chapterId, table.type, table.sourceHash),
  ],
);

export const storyIntelligenceArtifactsRelations = relations(
  storyIntelligenceArtifacts,
  ({ one }) => ({
    story: one(stories, {
      fields: [storyIntelligenceArtifacts.storyId],
      references: [stories.id],
    }),
    chapter: one(chapters, {
      fields: [storyIntelligenceArtifacts.chapterId],
      references: [chapters.id],
    }),
  }),
);

// ── Writing Sessions ─────────────────────────────────────────

export const writingSessions = pgTable("writing_sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  wordsWritten: integer("words_written").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_writing_sessions_user_id").on(table.userId),
    index("idx_writing_sessions_story_id").on(table.storyId),
  ]
);

export const writingSessionsRelations = relations(
  writingSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [writingSessions.userId],
      references: [users.id],
    }),
    story: one(stories, {
      fields: [writingSessions.storyId],
      references: [stories.id],
    }),
  })
);

// ── Sparks (likes) ───────────────────────────────────────────

export const sparks = pgTable(
  "sparks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sparks_user_story_unique").on(table.userId, table.storyId),
    index("idx_sparks_story_id").on(table.storyId),
  ]
);

export const sparksRelations = relations(sparks, ({ one }) => ({
  user: one(users, { fields: [sparks.userId], references: [users.id] }),
  story: one(stories, { fields: [sparks.storyId], references: [stories.id] }),
}));

// ── Follows ─────────────────────────────────────────────────

export const follows = pgTable(
  "follows",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("follows_user_story_unique").on(table.userId, table.storyId),
    index("idx_follows_story_id").on(table.storyId),
  ]
);

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, { fields: [follows.userId], references: [users.id] }),
  story: one(stories, { fields: [follows.storyId], references: [stories.id] }),
}));

// ── Comments ──────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  circleOnly: boolean("circle_only").notNull().default(false), // visible only to Circle subscribers
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_comments_chapter_story").on(table.chapterId, table.storyId),
    index("idx_comments_parent_id").on(table.parentId),
    index("idx_comments_user_id").on(table.userId),
  ]
);

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  chapter: one(chapters, {
    fields: [comments.chapterId],
    references: [chapters.id],
  }),
  story: one(stories, {
    fields: [comments.storyId],
    references: [stories.id],
  }),
}));

// ── Editor Comment Threads ──────────────────────────────────

export const editorCommentThreads = pgTable("editor_comment_threads", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quotedText: text("quoted_text").notNull(),
  fromPos: integer("from_pos").notNull(),
  toPos: integer("to_pos").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_editor_comment_threads_chapter").on(table.storyId, table.chapterId, table.deletedAt),
  ]
);

export const editorCommentReplies = pgTable("editor_comment_replies", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => editorCommentThreads.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_editor_comment_replies_thread").on(table.threadId, table.deletedAt, table.createdAt),
  ]
);

export const editorCommentThreadsRelations = relations(editorCommentThreads, ({ one, many }) => ({
  story: one(stories, { fields: [editorCommentThreads.storyId], references: [stories.id] }),
  chapter: one(chapters, { fields: [editorCommentThreads.chapterId], references: [chapters.id] }),
  user: one(users, { fields: [editorCommentThreads.userId], references: [users.id] }),
  replies: many(editorCommentReplies),
}));

export const editorCommentRepliesRelations = relations(editorCommentReplies, ({ one }) => ({
  thread: one(editorCommentThreads, {
    fields: [editorCommentReplies.threadId],
    references: [editorCommentThreads.id],
  }),
  user: one(users, { fields: [editorCommentReplies.userId], references: [users.id] }),
}));

// ── Creator Updates ─────────────────────────────────────────

export const creatorUpdates = pgTable("creator_updates", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_creator_updates_story_id").on(table.storyId),
  ]
);

export const creatorUpdatesRelations = relations(
  creatorUpdates,
  ({ one }) => ({
    story: one(stories, {
      fields: [creatorUpdates.storyId],
      references: [stories.id],
    }),
    user: one(users, {
      fields: [creatorUpdates.userId],
      references: [users.id],
    }),
  })
);

// ── Flags (content reports) ─────────────────────────────────

export const flags = pgTable("flags", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").references(() => stories.id, {
    onDelete: "cascade",
  }),
  commentId: uuid("comment_id").references(() => comments.id, {
    onDelete: "cascade",
  }),
  reason: text("reason").notNull(), // 'misrated' | 'harmful' | 'spam'
  details: text("details"),
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'dismissed'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_flags_story_id").on(table.storyId),
  ]
);

export const flagsRelations = relations(flags, ({ one }) => ({
  user: one(users, { fields: [flags.userId], references: [users.id] }),
  story: one(stories, { fields: [flags.storyId], references: [stories.id] }),
  comment: one(comments, {
    fields: [flags.commentId],
    references: [comments.id],
  }),
}));

// ── Notifications ──────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'chapter' | 'spark' | 'follow' | 'comment' | 'update'
    message: text("message").notNull(),
    href: text("href").notNull(),
    read: boolean("read").notNull().default(false),
    /** When the corresponding email was sent. Null means either suppressed
     *  (user opted out) or queued for the next digest run. */
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_user_read").on(table.userId, table.read),
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
    index("idx_notifications_user_emailed").on(table.userId, table.emailedAt),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ── Collaborators ─────────────────────────────────────────────

export const collaborators = pgTable(
  "collaborators",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'writer' | 'illustrator' | 'editor' | 'worldbuilder'
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("collaborators_story_user_unique").on(table.storyId, table.userId),
    index("idx_collaborators_story_status").on(table.storyId, table.status),
  ]
);

export const collaboratorsRelations = relations(collaborators, ({ one }) => ({
  story: one(stories, {
    fields: [collaborators.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [collaborators.userId],
    references: [users.id],
  }),
}));

// ── Agreements ──────────────────────────────────────────────

export const agreements = pgTable("agreements", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  template: text("template").notNull().default("equal-partners"), // 'equal-partners' | 'lead-contributor' | 'work-for-hire' | 'custom'
  splits: text("splits"), // JSON: [{userId, percent}]
  creditFormat: text("credit_format"),
  terms: text("terms"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'superseded'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agreementsRelations = relations(agreements, ({ one, many }) => ({
  story: one(stories, {
    fields: [agreements.storyId],
    references: [stories.id],
  }),
  confirmations: many(agreementConfirmations),
}));

// ── Agreement Confirmations ─────────────────────────────────

export const agreementConfirmations = pgTable(
  "agreement_confirmations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("agreement_confirmations_agreement_user_unique").on(
      table.agreementId,
      table.userId
    ),
  ]
);

export const agreementConfirmationsRelations = relations(
  agreementConfirmations,
  ({ one }) => ({
    agreement: one(agreements, {
      fields: [agreementConfirmations.agreementId],
      references: [agreements.id],
    }),
    user: one(users, {
      fields: [agreementConfirmations.userId],
      references: [users.id],
    }),
  })
);

// ── Suggestions ─────────────────────────────────────────────

export const suggestions = pgTable("suggestions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  note: text("note"),
  status: text("status").notNull().default("pending"), // 'pending' | 'woven' | 'revised' | 'passed'
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_suggestions_story_id").on(table.storyId),
    index("idx_suggestions_status").on(table.status),
    index("idx_suggestions_chapter_id").on(table.chapterId),
  ]
);

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  story: one(stories, {
    fields: [suggestions.storyId],
    references: [stories.id],
  }),
  chapter: one(chapters, {
    fields: [suggestions.chapterId],
    references: [chapters.id],
  }),
  user: one(users, {
    fields: [suggestions.userId],
    references: [users.id],
  }),
}));

// ── Open Calls ──────────────────────────────────────────────

export const openCalls = pgTable("open_calls", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  status: text("status").notNull().default("open"), // 'open' | 'filled' | 'closed'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_open_calls_story_id").on(table.storyId),
  ]
);

export const openCallsRelations = relations(openCalls, ({ one, many }) => ({
  story: one(stories, {
    fields: [openCalls.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [openCalls.userId],
    references: [users.id],
  }),
  responses: many(openCallResponses),
}));

// ── Open Call Responses ─────────────────────────────────────

export const openCallResponses = pgTable(
  "open_call_responses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    callId: uuid("call_id")
      .notNull()
      .references(() => openCalls.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pitch: text("pitch").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("open_call_responses_call_user_unique").on(
      table.callId,
      table.userId
    ),
  ]
);

export const openCallResponsesRelations = relations(
  openCallResponses,
  ({ one }) => ({
    call: one(openCalls, {
      fields: [openCallResponses.callId],
      references: [openCalls.id],
    }),
    user: one(users, {
      fields: [openCallResponses.userId],
      references: [users.id],
    }),
  })
);

// ── Reactions ───────────────────────────────────────────────

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'gasped' | 'cried' | 'laughed' | 'need-more' | 'saw-it-coming' | 'heartbroken' | 'inspired' | 'terrified'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reactions_user_chapter_unique").on(table.userId, table.chapterId),
    index("idx_reactions_chapter_id").on(table.chapterId),
    index("idx_reactions_story_id").on(table.storyId),
  ]
);

export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
  chapter: one(chapters, {
    fields: [reactions.chapterId],
    references: [chapters.id],
  }),
  story: one(stories, {
    fields: [reactions.storyId],
    references: [stories.id],
  }),
}));

// ── Lore Entries ────────────────────────────────────────────

export const loreEntries = pgTable("lore_entries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // 'character' | 'place' | 'event' | 'item' | 'lore'
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_lore_entries_story_id").on(table.storyId),
  ]
);

export const loreEntriesRelations = relations(loreEntries, ({ one }) => ({
  story: one(stories, {
    fields: [loreEntries.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [loreEntries.userId],
    references: [users.id],
  }),
}));

// ── Places (Adventure-Mode Map) ─────────────────────────────
//
// A `place` is a named location a campaign references. Scene-break turns
// carry an optional locationId pointing here; when a fresh scene-break
// title is posted the server upserts a row so the Places list populates
// for free. Coordinates are percentage 0-100 over the (optional) story
// map image — null when the GM hasn't placed the pin yet. Migration
// 0038_campaign_places.sql defines the CHECK constraints + unique index
// on (story_id, name_key).

export const places = pgTable(
  "places",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    mood: text("mood"),
    description: text("description").notNull().default(""),
    x: integer("x"),
    y: integer("y"),
    autoCreated: boolean("auto_created").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_places_story_id").on(table.storyId),
    uniqueIndex("places_story_name_unique").on(table.storyId, table.nameKey),
  ],
);

export const placesRelations = relations(places, ({ one }) => ({
  story: one(stories, {
    fields: [places.storyId],
    references: [stories.id],
  }),
}));

// ── Workshop Messages (Co-op Chat + Activity Feed) ─────────

export const workshopMessages = pgTable("workshop_messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: text("type").notNull().default("chat"), // 'chat' | 'edit' | 'join' | 'leave' | 'suggestion' | 'publish'
  metadata: text("metadata").default("{}"), // JSON: { chapterTitle, chapterId, etc. }
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_workshop_messages_story_created").on(table.storyId, table.createdAt),
  ]
);

// ── Editor Presence (Co-op) ────────────────────────────────

export const editorPresence = pgTable(
  "editor_presence",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .references(() => chapters.id, { onDelete: "set null" }),
    status: text("status").notNull().default("viewing"), // 'viewing' | 'editing'
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("editor_presence_story_user_unique").on(table.storyId, table.userId),
    index("idx_editor_presence_story").on(table.storyId),
  ]
);

export const workshopMessagesRelations = relations(workshopMessages, ({ one }) => ({
  story: one(stories, {
    fields: [workshopMessages.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [workshopMessages.userId],
    references: [users.id],
  }),
}));

export const editorPresenceRelations = relations(editorPresence, ({ one }) => ({
  story: one(stories, {
    fields: [editorPresence.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [editorPresence.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [editorPresence.chapterId],
    references: [chapters.id],
  }),
}));

// ── Staff Picks ─────────────────────────────────────────────

export const staffPicks = pgTable("staff_picks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  curatorNote: text("curator_note").notNull(),
  pickedBy: text("picked_by").notNull(),
  pickedAt: timestamp("picked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const staffPicksRelations = relations(staffPicks, ({ one }) => ({
  story: one(stories, {
    fields: [staffPicks.storyId],
    references: [stories.id],
  }),
}));

// ── Player Characters (Campaign Mode) ──────────────────────

export const playerCharacters = pgTable(
  "player_characters",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    portrait: text("portrait"), // base64 or URL
    description: text("description").default(""),
    traits: text("traits").default(""), // free-form text
    backstory: text("backstory").default(""),
    stats: text("stats"), // JSON: { hp: {current,max}, mp: {current,max}, attributes: Record<string,number>, items: string[] }
    status: text("status").notNull().default("active"), // 'active' | 'retired' | 'dead'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_player_characters_story_id").on(table.storyId),
    index("idx_player_characters_user_id").on(table.userId),
    index("idx_player_characters_story_status").on(table.storyId, table.status),
  ]
);

export const playerCharactersRelations = relations(
  playerCharacters,
  ({ one, many }) => ({
    story: one(stories, {
      fields: [playerCharacters.storyId],
      references: [stories.id],
    }),
    user: one(users, {
      fields: [playerCharacters.userId],
      references: [users.id],
    }),
    marks: many(characterMarks),
  })
);

// ── Character Marks ────────────────────────────────────────
// Player-authored beats that stick to a character across sessions:
// scars, vows, debts, memories. Server flags mark-worthy events;
// the player decides whether to mark and what to write.

export const characterMarks = pgTable("character_marks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  characterId: uuid("character_id")
    .notNull()
    .references(() => playerCharacters.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  // Session/turn may be deleted while marks remain — they're part of the
  // character's accumulated history, not the session's transient record.
  sessionId: uuid("session_id").references(() => campaignSessions.id, { onDelete: "set null" }),
  sourceTurnId: uuid("source_turn_id").references(() => campaignTurns.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // 'scar' | 'vow' | 'debt' | 'memory'
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("idx_character_marks_character_source_unique").on(table.characterId, table.sourceTurnId),
  index("idx_character_marks_character_created").on(table.characterId, table.createdAt),
  index("idx_character_marks_session").on(table.sessionId, table.createdAt),
]);

export const characterMarksRelations = relations(characterMarks, ({ one }) => ({
  character: one(playerCharacters, {
    fields: [characterMarks.characterId],
    references: [playerCharacters.id],
  }),
  session: one(campaignSessions, {
    fields: [characterMarks.sessionId],
    references: [campaignSessions.id],
  }),
  sourceTurn: one(campaignTurns, {
    fields: [characterMarks.sourceTurnId],
    references: [campaignTurns.id],
  }),
}));

// ── Campaign Sessions ──────────────────────────────────────

export const campaignSessions = pgTable("campaign_sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  opening: text("opening"),
  epilogue: text("epilogue"),
  // Future-tense hook into the next session. Distinct from epilogue
  // (closing thought). Drives the "Previously, on…" card next time.
  cliffhanger: text("cliffhanger"),
  closingMood: text("closing_mood"),
  chapterId: uuid("chapter_id"),
  activePlayerId: uuid("active_player_id").references(() => users.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("active"), // 'draft' | 'active' | 'completed' | 'archived'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_campaign_sessions_story_id").on(table.storyId),
    // Backs the "one active session per story" invariant. Migration
    // 0018_one_active_session_per_story.sql creates this partial unique
    // index in the live DB; the session PATCH handler relies on it
    // catching concurrent activations via PG error code 23505.
    uniqueIndex("campaign_sessions_one_active_per_story")
      .on(table.storyId)
      .where(sql`status = 'active'`),
  ]
);

export const campaignSessionsRelations = relations(
  campaignSessions,
  ({ one, many }) => ({
    story: one(stories, {
      fields: [campaignSessions.storyId],
      references: [stories.id],
    }),
    turns: many(campaignTurns),
    roster: many(sessionRoster),
    clocks: many(progressClocks),
    spectators: many(spectatorPresence),
  })
);

// ── Session Roster ──────────────────────────────────────────

export const sessionRoster = pgTable(
  "session_roster",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => campaignSessions.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => playerCharacters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("present"), // 'present' | 'absent' | 'introduced' | 'spectating'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("session_roster_session_character_unique").on(
      table.sessionId,
      table.characterId
    ),
    index("idx_session_roster_session").on(table.sessionId),
  ]
);

export const sessionRosterRelations = relations(sessionRoster, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [sessionRoster.sessionId],
    references: [campaignSessions.id],
  }),
  character: one(playerCharacters, {
    fields: [sessionRoster.characterId],
    references: [playerCharacters.id],
  }),
  user: one(users, {
    fields: [sessionRoster.userId],
    references: [users.id],
  }),
}));

// ── Session Polls ───────────────────────────────────────────

export const sessionPolls = pgTable("session_polls", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").default("When should we play next?"),
  options: text("options").notNull(), // JSON array of strings
  status: text("status").notNull().default("open"), // 'open' | 'closed'
  confirmedOption: text("confirmed_option"), // the GM's final pick
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessionPollsRelations = relations(
  sessionPolls,
  ({ one, many }) => ({
    story: one(stories, {
      fields: [sessionPolls.storyId],
      references: [stories.id],
    }),
    createdByUser: one(users, {
      fields: [sessionPolls.createdBy],
      references: [users.id],
    }),
    votes: many(sessionPollVotes),
  })
);

// ── Session Poll Votes ──────────────────────────────────────

export const sessionPollVotes = pgTable(
  "session_poll_votes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => sessionPolls.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    selectedOptions: text("selected_options").notNull(), // JSON array of indices
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("session_poll_votes_poll_user_unique").on(
      table.pollId,
      table.userId
    ),
  ]
);

export const sessionPollVotesRelations = relations(
  sessionPollVotes,
  ({ one }) => ({
    poll: one(sessionPolls, {
      fields: [sessionPollVotes.pollId],
      references: [sessionPolls.id],
    }),
    user: one(users, {
      fields: [sessionPollVotes.userId],
      references: [users.id],
    }),
  })
);

// ── Progress Clocks ─────────────────────────────────────────

export const progressClocks = pgTable("progress_clocks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => campaignSessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  segments: integer("segments").notNull(), // 4, 6, or 8
  filled: integer("filled").notNull().default(0),
  type: text("type").notNull().default("danger"), // 'danger' | 'progress' | 'racing'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const progressClocksRelations = relations(progressClocks, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [progressClocks.sessionId],
    references: [campaignSessions.id],
  }),
}));

// ── Campaign Floor Rounds ───────────────────────────────────

export const campaignFloorRounds = pgTable("campaign_floor_rounds", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => campaignSessions.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  mode: text("mode").notNull().default("gm_pick"), // 'gm_pick' | 'vote' | 'house_fork'
  status: text("status").notNull().default("open"), // 'open' | 'voting' | 'closed' | 'resolved' | 'cancelled'
  audiencePulseEnabled: boolean("audience_pulse_enabled").notNull().default(false),
  selectedSubmissionId: uuid("selected_submission_id"),
  // ── house_fork mode: the GM opens the floor to the audience ──
  // GM-authored options the house votes on (JSON array of { label }).
  options: text("options"),
  // who may vote: 'gallery' (audience) | 'table' (players) | 'both'
  constituency: text("constituency").notNull().default("table"),
  // advisory by default; when true the GM has pledged to honour the result.
  binding: boolean("binding").notNull().default(false),
  // index of the winning option once the GM closes a house_fork.
  resolvedOption: integer("resolved_option"),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_campaign_floor_rounds_session_status").on(table.sessionId, table.status),
]);

export const campaignFloorSubmissions = pgTable("campaign_floor_submissions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundId: uuid("round_id")
    .notNull()
    .references(() => campaignFloorRounds.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  characterId: uuid("character_id").references(() => playerCharacters.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("action"),
  content: text("content").notNull(),
  source: text("source").notNull().default("player"), // 'player' | 'audience_spark'
  sourceLabel: text("source_label"),
  audienceSparkId: uuid("audience_spark_id"),
  status: text("status").notNull().default("submitted"), // 'submitted' | 'selected' | 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_floor_submission_round_user_unique").on(table.roundId, table.userId),
  index("idx_campaign_floor_submissions_round").on(table.roundId),
]);

export const campaignFloorAudienceSparks = pgTable("campaign_floor_audience_sparks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundId: uuid("round_id")
    .notNull()
    .references(() => campaignFloorRounds.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  amount: integer("amount").notNull().default(25),
  status: text("status").notNull().default("pending"), // 'pending' | 'promoted' | 'rejected'
  promotedSubmissionId: uuid("promoted_submission_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_floor_audience_sparks_round_token_unique").on(table.roundId, table.token),
  index("idx_campaign_floor_audience_sparks_round").on(table.roundId, table.status),
  index("idx_campaign_floor_audience_sparks_user").on(table.userId, table.createdAt),
]);

// ── The house votes on a GM-opened floor (house_fork) ──
// One ballot per spectator token per round. Free votes weigh 1; patrons may
// spend drops for extra weight (capped, computed server-side into `weight`).
export const campaignFloorAudienceVotes = pgTable("campaign_floor_audience_votes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundId: uuid("round_id")
    .notNull()
    .references(() => campaignFloorRounds.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  optionIndex: integer("option_index").notNull(),
  dropsSpent: integer("drops_spent").notNull().default(0),
  weight: integer("weight").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_floor_audience_votes_round_token_unique").on(table.roundId, table.token),
  index("idx_campaign_floor_audience_votes_round").on(table.roundId),
]);

// ── Champion a character ──
// An audience member backs a specific character; characters accrue followings.
export const characterChampions = pgTable("character_champions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  characterId: uuid("character_id")
    .notNull()
    .references(() => playerCharacters.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("character_champions_user_character_unique").on(table.userId, table.characterId),
  index("idx_character_champions_character").on(table.characterId),
]);

export const campaignFloorVotes = pgTable("campaign_floor_votes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundId: uuid("round_id")
    .notNull()
    .references(() => campaignFloorRounds.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => campaignFloorSubmissions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_floor_vote_round_user_unique").on(table.roundId, table.userId),
  index("idx_campaign_floor_votes_submission").on(table.submissionId),
]);

export const campaignFloorAudiencePulses = pgTable("campaign_floor_audience_pulses", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundId: uuid("round_id")
    .notNull()
    .references(() => campaignFloorRounds.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => campaignFloorSubmissions.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_floor_audience_pulse_round_token_unique").on(table.roundId, table.token),
  index("idx_campaign_floor_audience_pulses_submission").on(table.submissionId),
]);

export const campaignFloorRoundsRelations = relations(campaignFloorRounds, ({ one, many }) => ({
  session: one(campaignSessions, {
    fields: [campaignFloorRounds.sessionId],
    references: [campaignSessions.id],
  }),
  opener: one(users, {
    fields: [campaignFloorRounds.openedBy],
    references: [users.id],
  }),
  submissions: many(campaignFloorSubmissions),
  votes: many(campaignFloorVotes),
  audiencePulses: many(campaignFloorAudiencePulses),
  audienceSparks: many(campaignFloorAudienceSparks),
}));

export const campaignFloorSubmissionsRelations = relations(campaignFloorSubmissions, ({ one, many }) => ({
  round: one(campaignFloorRounds, {
    fields: [campaignFloorSubmissions.roundId],
    references: [campaignFloorRounds.id],
  }),
  user: one(users, {
    fields: [campaignFloorSubmissions.userId],
    references: [users.id],
  }),
  character: one(playerCharacters, {
    fields: [campaignFloorSubmissions.characterId],
    references: [playerCharacters.id],
  }),
  votes: many(campaignFloorVotes),
  audiencePulses: many(campaignFloorAudiencePulses),
}));

export const campaignFloorAudienceSparksRelations = relations(campaignFloorAudienceSparks, ({ one }) => ({
  round: one(campaignFloorRounds, {
    fields: [campaignFloorAudienceSparks.roundId],
    references: [campaignFloorRounds.id],
  }),
  user: one(users, {
    fields: [campaignFloorAudienceSparks.userId],
    references: [users.id],
  }),
  promotedSubmission: one(campaignFloorSubmissions, {
    fields: [campaignFloorAudienceSparks.promotedSubmissionId],
    references: [campaignFloorSubmissions.id],
  }),
}));

export const campaignFloorVotesRelations = relations(campaignFloorVotes, ({ one }) => ({
  round: one(campaignFloorRounds, {
    fields: [campaignFloorVotes.roundId],
    references: [campaignFloorRounds.id],
  }),
  submission: one(campaignFloorSubmissions, {
    fields: [campaignFloorVotes.submissionId],
    references: [campaignFloorSubmissions.id],
  }),
  user: one(users, {
    fields: [campaignFloorVotes.userId],
    references: [users.id],
  }),
}));

export const campaignFloorAudiencePulsesRelations = relations(campaignFloorAudiencePulses, ({ one }) => ({
  round: one(campaignFloorRounds, {
    fields: [campaignFloorAudiencePulses.roundId],
    references: [campaignFloorRounds.id],
  }),
  submission: one(campaignFloorSubmissions, {
    fields: [campaignFloorAudiencePulses.submissionId],
    references: [campaignFloorSubmissions.id],
  }),
  user: one(users, {
    fields: [campaignFloorAudiencePulses.userId],
    references: [users.id],
  }),
}));

// ── Campaign Turns ─────────────────────────────────────────

export const campaignTurns = pgTable("campaign_turns", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => campaignSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  characterId: uuid("character_id").references(() => playerCharacters.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // 'narration' | 'action' | 'dialogue' | 'roll' | 'ooc'
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON: dice rolls, skill checks, etc.
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_campaign_turns_session_sort").on(table.sessionId, table.sortOrder),
  index("idx_campaign_turns_user_id").on(table.userId),
]);

export const campaignRollResponses = pgTable("campaign_roll_responses", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => campaignSessions.id, { onDelete: "cascade" }),
  rollRequestTurnId: uuid("roll_request_turn_id")
    .notNull()
    .references(() => campaignTurns.id, { onDelete: "cascade" }),
  rollTurnId: uuid("roll_turn_id")
    .notNull()
    .references(() => campaignTurns.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  unique("campaign_roll_response_request_user_unique").on(table.rollRequestTurnId, table.userId),
  unique("campaign_roll_response_turn_unique").on(table.rollTurnId),
  index("idx_campaign_roll_responses_session").on(table.sessionId),
]);

export const campaignTurnsRelations = relations(campaignTurns, ({ one, many }) => ({
  session: one(campaignSessions, {
    fields: [campaignTurns.sessionId],
    references: [campaignSessions.id],
  }),
  user: one(users, {
    fields: [campaignTurns.userId],
    references: [users.id],
  }),
  character: one(playerCharacters, {
    fields: [campaignTurns.characterId],
    references: [playerCharacters.id],
  }),
  rollResponsesAsRequest: many(campaignRollResponses, { relationName: "rollRequest" }),
  rollResponse: one(campaignRollResponses, {
    fields: [campaignTurns.id],
    references: [campaignRollResponses.rollTurnId],
    relationName: "rollTurn",
  }),
}));

export const campaignRollResponsesRelations = relations(campaignRollResponses, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [campaignRollResponses.sessionId],
    references: [campaignSessions.id],
  }),
  rollRequestTurn: one(campaignTurns, {
    fields: [campaignRollResponses.rollRequestTurnId],
    references: [campaignTurns.id],
    relationName: "rollRequest",
  }),
  rollTurn: one(campaignTurns, {
    fields: [campaignRollResponses.rollTurnId],
    references: [campaignTurns.id],
    relationName: "rollTurn",
  }),
  user: one(users, {
    fields: [campaignRollResponses.userId],
    references: [users.id],
  }),
}));

// ── Campaign Applications ───────────────────────────────────

export const campaignApplications = pgTable(
  "campaign_applications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pitch: text("pitch").notNull(),
    characterName: text("character_name"),
    characterArchetype: text("character_archetype"),
    characterKnownFor: text("character_known_for"),
    characterPortrait: text("character_portrait"),
    firstGlimpse: text("first_glimpse"),
    playerCadence: text("player_cadence"),
    playerSpotlight: text("player_spotlight"),
    writingSampleUrl: text("writing_sample_url"),
    voiceCadence: text("voice_cadence"),
    voiceMood: text("voice_mood"),
    voiceRestraint: text("voice_restraint"),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'declined' | 'voting'
    votingDeadline: timestamp("voting_deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("campaign_applications_story_user_unique").on(
      table.storyId,
      table.userId
    ),
  ]
);

export const campaignApplicationsRelations = relations(
  campaignApplications,
  ({ one }) => ({
    story: one(stories, {
      fields: [campaignApplications.storyId],
      references: [stories.id],
    }),
    user: one(users, {
      fields: [campaignApplications.userId],
      references: [users.id],
    }),
  })
);

// ── Campaign Votes ──────────────────────────────────────────

export const campaignVotes = pgTable(
  "campaign_votes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => campaignApplications.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: boolean("vote").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("campaign_votes_application_voter_unique").on(
      table.applicationId,
      table.voterId
    ),
  ]
);

export const campaignVotesRelations = relations(campaignVotes, ({ one }) => ({
  application: one(campaignApplications, {
    fields: [campaignVotes.applicationId],
    references: [campaignApplications.id],
  }),
  voter: one(users, {
    fields: [campaignVotes.voterId],
    references: [users.id],
  }),
}));

// ── Reading Progress ────────────────────────────────────────

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    scrollPercent: integer("scroll_percent").notNull().default(0),
    pageNumber: integer("page_number").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reading_progress_user_story_unique").on(
      table.userId,
      table.storyId
    ),
  ]
);

export const readingProgressRelations = relations(
  readingProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [readingProgress.userId],
      references: [users.id],
    }),
    story: one(stories, {
      fields: [readingProgress.storyId],
      references: [stories.id],
    }),
    chapter: one(chapters, {
      fields: [readingProgress.chapterId],
      references: [chapters.id],
    }),
  })
);

// ── Guild Profiles ──────────────────────────────────────────

export const guildProfiles = pgTable(
  "guild_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    tagline: text("tagline"),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`'{writer}'::text[]`), // writer | illustrator | editor | worldbuilder
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    availability: text("availability").notNull().default("open"), // 'open' | 'selective' | 'busy' | 'unavailable'
    portfolioLinks: text("portfolio_links"), // JSON: [{label, url}]
    showcaseStoryIds: text("showcase_story_ids")
      .array()
      .default(sql`'{}'::text[]`),
    yearsWriting: integer("years_writing"),
    lookingFor: text("looking_for"),
    listedAt: timestamp("listed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_guild_profiles_availability").on(table.availability),
    index("idx_guild_profiles_listed").on(table.listedAt),
  ]
);

export const guildProfilesRelations = relations(guildProfiles, ({ one }) => ({
  user: one(users, {
    fields: [guildProfiles.userId],
    references: [users.id],
  }),
}));

// ── Spectator Presence ──────────────────────────────────────

export const spectatorPresence = pgTable(
  "spectator_presence",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => campaignSessions.id, { onDelete: "cascade" }),
    token: text("token").notNull(), // client-generated UUID for anonymous viewers
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // optional, set if logged in
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("spectator_presence_session_token_unique").on(table.sessionId, table.token),
    index("idx_spectator_presence_session").on(table.sessionId),
    index("idx_spectator_presence_heartbeat").on(table.lastHeartbeat),
  ]
);

export const spectatorPresenceRelations = relations(spectatorPresence, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [spectatorPresence.sessionId],
    references: [campaignSessions.id],
  }),
  user: one(users, {
    fields: [spectatorPresence.userId],
    references: [users.id],
  }),
}));

// ── Password Reset Tokens ───────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
  (table) => [
    index("idx_password_reset_tokens_token").on(table.token),
    index("idx_password_reset_tokens_user_id").on(table.userId),
  ]
);

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// ── Auth Rate Limits ─────────────────────────────────────────

export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Spectator Reactions ────────────────────────────────────

export const spectatorReactions = pgTable(
  "spectator_reactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => campaignSessions.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // gasped | cried | laughed | need-more | saw-it-coming | heartbroken | inspired | terrified
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_spectator_reactions_session_created").on(table.sessionId, table.createdAt),
  ]
);

export const spectatorReactionsRelations = relations(spectatorReactions, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [spectatorReactions.sessionId],
    references: [campaignSessions.id],
  }),
  user: one(users, {
    fields: [spectatorReactions.userId],
    references: [users.id],
  }),
}));

// ── Story Moment Amplifications ─────────────────────────────
// Audience-held story moments. These do not steer the plot; they mark what
// the Chorus felt should be remembered.

export const storyMomentAmplifications = pgTable(
  "story_moment_amplifications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => campaignSessions.id, { onDelete: "cascade" }),
    turnId: uuid("turn_id")
      .notNull()
      .references(() => campaignTurns.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("story_moment_amplifications_turn_token_unique").on(table.turnId, table.token),
    index("idx_story_moment_amplifications_session").on(table.sessionId, table.createdAt),
    index("idx_story_moment_amplifications_turn").on(table.turnId),
  ],
);

export const storyMomentAmplificationsRelations = relations(storyMomentAmplifications, ({ one }) => ({
  session: one(campaignSessions, {
    fields: [storyMomentAmplifications.sessionId],
    references: [campaignSessions.id],
  }),
  turn: one(campaignTurns, {
    fields: [storyMomentAmplifications.turnId],
    references: [campaignTurns.id],
  }),
  user: one(users, {
    fields: [storyMomentAmplifications.userId],
    references: [users.id],
  }),
}));

// ── Ink Drop Transactions ──────────────────────────────────

export const inkDropTransactions = pgTable(
  "ink_drop_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => campaignSessions.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    type: text("type").notNull(), // tip | grant | purchase
    message: text("message"),
    stripeSessionId: text("stripe_session_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ink_drop_tx_to_user").on(table.toUserId, table.createdAt),
    index("idx_ink_drop_tx_session").on(table.sessionId, table.createdAt),
  ]
);

export const inkDropTransactionsRelations = relations(inkDropTransactions, ({ one }) => ({
  fromUser: one(users, {
    fields: [inkDropTransactions.fromUserId],
    references: [users.id],
    relationName: "sentTips",
  }),
  toUser: one(users, {
    fields: [inkDropTransactions.toUserId],
    references: [users.id],
    relationName: "receivedTips",
  }),
  session: one(campaignSessions, {
    fields: [inkDropTransactions.sessionId],
    references: [campaignSessions.id],
  }),
}));

// ── Story Boosts ───────────────────────────────────────────

export const storyBoosts = pgTable(
  "story_boosts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inkDropsCost: integer("ink_drops_cost").notNull(),
    tier: text("tier").notNull().default("standard"), // 'standard' | 'hero'
    status: text("status").notNull().default("active"), // 'pending' | 'active' | 'expired'
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_story_boosts_expires").on(table.expiresAt),
    index("idx_story_boosts_story").on(table.storyId),
    index("idx_story_boosts_tier_status").on(table.tier, table.status, table.startsAt),
  ]
);

export const storyBoostsRelations = relations(storyBoosts, ({ one }) => ({
  story: one(stories, {
    fields: [storyBoosts.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [storyBoosts.userId],
    references: [users.id],
  }),
}));

// ── Annotations (Marginalia) ───────────────────────────────

export const annotations = pgTable(
  "annotations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    content: text("content").notNull(),
    visibility: text("visibility").notNull().default("private"), // private | public
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_annotations_chapter").on(table.chapterId),
    index("idx_annotations_user_chapter").on(table.userId, table.chapterId),
  ]
);

export const annotationsRelations = relations(annotations, ({ one }) => ({
  chapter: one(chapters, {
    fields: [annotations.chapterId],
    references: [chapters.id],
  }),
  user: one(users, {
    fields: [annotations.userId],
    references: [users.id],
  }),
}));

// ── Story Jams ─────────────────────────────────────────────

export const storyJams = pgTable(
  "story_jams",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description").notNull(),
    theme: text("theme").notNull(),
    bannerUrl: text("banner_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    submissionStartsAt: timestamp("submission_starts_at", { withTimezone: true }).notNull(),
    submissionEndsAt: timestamp("submission_ends_at", { withTimezone: true }).notNull(),
    votingStartsAt: timestamp("voting_starts_at", { withTimezone: true }).notNull(),
    votingEndsAt: timestamp("voting_ends_at", { withTimezone: true }).notNull(),
    wordCountMin: integer("word_count_min"),
    wordCountMax: integer("word_count_max"),
    maxEntries: integer("max_entries"),
    status: text("status").notNull().default("upcoming"), // upcoming | open | voting | ended
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_story_jams_status").on(table.status),
  ]
);

export const storyJamsRelations = relations(storyJams, ({ one, many }) => ({
  creator: one(users, {
    fields: [storyJams.createdBy],
    references: [users.id],
  }),
  entries: many(jamEntries),
}));

export const jamEntries = pgTable(
  "jam_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jamId: uuid("jam_id")
      .notNull()
      .references(() => storyJams.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("jam_entries_jam_story_unique").on(table.jamId, table.storyId),
    index("idx_jam_entries_jam").on(table.jamId),
  ]
);

export const jamEntriesRelations = relations(jamEntries, ({ one, many }) => ({
  jam: one(storyJams, {
    fields: [jamEntries.jamId],
    references: [storyJams.id],
  }),
  story: one(stories, {
    fields: [jamEntries.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [jamEntries.userId],
    references: [users.id],
  }),
  votes: many(jamVotes),
}));

export const jamVotes = pgTable(
  "jam_votes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jamId: uuid("jam_id")
      .notNull()
      .references(() => storyJams.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => jamEntries.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("jam_votes_entry_voter_unique").on(table.entryId, table.voterId),
    index("idx_jam_votes_entry").on(table.entryId),
    index("idx_jam_votes_jam").on(table.jamId),
  ]
);

export const jamVotesRelations = relations(jamVotes, ({ one }) => ({
  jam: one(storyJams, {
    fields: [jamVotes.jamId],
    references: [storyJams.id],
  }),
  entry: one(jamEntries, {
    fields: [jamVotes.entryId],
    references: [jamEntries.id],
  }),
  voter: one(users, {
    fields: [jamVotes.voterId],
    references: [users.id],
  }),
}));

// ── The Circle — Creator Subscriptions ──────────────────────

export const creatorCircles = pgTable(
  "creator_circles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(false),
    confidantPrice: integer("confidant_price").notNull().default(500), // drops/month
    confidantDescription: text("confidant_description"),
    earlyAccessDays: integer("early_access_days").notNull().default(3), // 1-7
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("creator_circles_creator_unique").on(table.creatorId),
    index("idx_creator_circles_active").on(table.isActive),
  ]
);

export const creatorCirclesRelations = relations(creatorCircles, ({ one, many }) => ({
  creator: one(users, {
    fields: [creatorCircles.creatorId],
    references: [users.id],
  }),
  subscriptions: many(circleSubscriptions),
}));

export const circleSubscriptions = pgTable(
  "circle_subscriptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    readerId: uuid("reader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: text("tier").notNull().default("confidant"), // 'confidant' | 'muse' | 'patron'
    status: text("status").notNull().default("active"), // 'active' | 'lapsed' | 'cancelled'
    priceAtSubscription: integer("price_at_subscription").notNull(), // drops/month locked in
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    renewalDate: timestamp("renewal_date", { withTimezone: true }).notNull(), // next billing date
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("circle_subs_reader_creator_unique").on(table.readerId, table.creatorId),
    index("idx_circle_subs_creator_status").on(table.creatorId, table.status),
    index("idx_circle_subs_reader").on(table.readerId),
    index("idx_circle_subs_renewal").on(table.renewalDate),
  ]
);

export const circleSubscriptionsRelations = relations(circleSubscriptions, ({ one }) => ({
  reader: one(users, {
    fields: [circleSubscriptions.readerId],
    references: [users.id],
    relationName: "circleSubscriptionsAsReader",
  }),
  creator: one(users, {
    fields: [circleSubscriptions.creatorId],
    references: [users.id],
    relationName: "circleSubscriptionsAsCreator",
  }),
}));

// ── Content Unlocks — Pay-per-chapter gating ────────────────

export const contentUnlocks = pgTable(
  "content_unlocks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    dropsSpent: integer("drops_spent").notNull(),
    giftedBy: uuid("gifted_by").references(() => users.id, { onDelete: "set null" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("content_unlocks_user_chapter_unique").on(table.userId, table.chapterId),
    index("idx_content_unlocks_user_story").on(table.userId, table.storyId),
    index("idx_content_unlocks_chapter").on(table.chapterId),
  ]
);

export const contentUnlocksRelations = relations(contentUnlocks, ({ one }) => ({
  user: one(users, {
    fields: [contentUnlocks.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [contentUnlocks.chapterId],
    references: [chapters.id],
  }),
  story: one(stories, {
    fields: [contentUnlocks.storyId],
    references: [stories.id],
  }),
  gifter: one(users, {
    fields: [contentUnlocks.giftedBy],
    references: [users.id],
    relationName: "giftedUnlocks",
  }),
}));

// ── Commissions Marketplace ───────────────

export const offerings = pgTable(
  "offerings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    artisanId: uuid("artisan_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    craft: text("craft").notNull(), // 'custom-chapter' | 'cover-art' | 'character-art' | 'editing' | 'poetry' | 'worldbuilding' | 'gm-for-hire' | 'webtoon-panels' | 'screenplay-coverage' | 'scene-illustration' | 'ghostwriting' | 'story-bible'
    title: text("title").notNull(),
    description: text("description").notNull(),
    priceMin: integer("price_min").notNull(), // drops
    priceMax: integer("price_max").notNull(), // drops
    deliveryDays: integer("delivery_days").notNull().default(7),
    revisionRounds: integer("revision_rounds").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    portfolioUrls: text("portfolio_urls").default("[]"), // JSON array of image/link URLs
    completedCount: integer("completed_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_offerings_artisan").on(table.artisanId),
    index("idx_offerings_craft_active").on(table.craft, table.isActive),
  ]
);

export const offeringsRelations = relations(offerings, ({ one, many }) => ({
  artisan: one(users, {
    fields: [offerings.artisanId],
    references: [users.id],
  }),
  commissions: many(commissions),
}));

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    offeringId: uuid("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    patronId: uuid("patron_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artisanId: uuid("artisan_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }), // optional linked story
    status: text("status").notNull().default("requested"), // 'requested' | 'quoted' | 'accepted' | 'in-progress' | 'delivered' | 'revision' | 'completed' | 'cancelled' | 'disputed'
    brief: text("brief").notNull(), // patron's request description
    quotedPrice: integer("quoted_price"), // artisan's quote in drops
    agreedPrice: integer("agreed_price"), // final agreed price in drops (locked in vault)
    revisionsUsed: integer("revisions_used").notNull().default(0),
    maxRevisions: integer("max_revisions").notNull().default(1),
    deliveryDeadline: timestamp("delivery_deadline", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_commissions_patron").on(table.patronId),
    index("idx_commissions_artisan_status").on(table.artisanId, table.status),
    index("idx_commissions_offering").on(table.offeringId),
  ]
);

export const commissionsRelations = relations(commissions, ({ one, many }) => ({
  offering: one(offerings, {
    fields: [commissions.offeringId],
    references: [offerings.id],
  }),
  patron: one(users, {
    fields: [commissions.patronId],
    references: [users.id],
    relationName: "commissionsAsPatron",
  }),
  artisan: one(users, {
    fields: [commissions.artisanId],
    references: [users.id],
    relationName: "commissionsAsArtisan",
  }),
  story: one(stories, {
    fields: [commissions.storyId],
    references: [stories.id],
  }),
  messages: many(commissionMessages),
}));

export const commissionMessages = pgTable(
  "commission_messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachmentUrl: text("attachment_url"), // for deliveries
    isDelivery: boolean("is_delivery").notNull().default(false), // marks delivery submissions
    isSystemMessage: boolean("is_system_message").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_commission_messages_commission").on(table.commissionId),
  ]
);

export const commissionMessagesRelations = relations(commissionMessages, ({ one }) => ({
  commission: one(commissions, {
    fields: [commissionMessages.commissionId],
    references: [commissions.id],
  }),
  sender: one(users, {
    fields: [commissionMessages.senderId],
    references: [users.id],
  }),
}));

export const commissionTestimonials = pgTable(
  "commission_testimonials",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artisanId: uuid("artisan_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    tags: text("tags").default("[]"), // JSON array: ['fast-delivery', 'exceeded-expectations', 'great-communication', 'true-to-brief']
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("testimonials_commission_unique").on(table.commissionId),
    index("idx_testimonials_artisan").on(table.artisanId),
  ]
);

export const commissionTestimonialsRelations = relations(commissionTestimonials, ({ one }) => ({
  commission: one(commissions, {
    fields: [commissionTestimonials.commissionId],
    references: [commissions.id],
  }),
  reviewer: one(users, {
    fields: [commissionTestimonials.reviewerId],
    references: [users.id],
  }),
  artisan: one(users, {
    fields: [commissionTestimonials.artisanId],
    references: [users.id],
  }),
}));

// ── Story Donations — general-purpose tips ──────────────────

export const storyDonations = pgTable(
  "story_donations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }), // optional — can donate from profile too
    amount: integer("amount").notNull(), // drops
    message: text("message"), // max 300 chars
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_donations_to_user").on(table.toUserId),
    index("idx_donations_story").on(table.storyId),
  ]
);

export const storyDonationsRelations = relations(storyDonations, ({ one }) => ({
  from: one(users, {
    fields: [storyDonations.fromUserId],
    references: [users.id],
    relationName: "sentDonations",
  }),
  to: one(users, {
    fields: [storyDonations.toUserId],
    references: [users.id],
    relationName: "receivedDonations",
  }),
  story: one(stories, {
    fields: [storyDonations.storyId],
    references: [stories.id],
  }),
}));

// ── Crossroads — influence polls with weighted voting ────────

export const crossroads = pgTable(
  "crossroads",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    options: text("options").notNull().default("[]"), // JSON array of { label: string }
    status: text("status").notNull().default("open"), // 'open' | 'closed' | 'resolved'
    resolvedOption: integer("resolved_option"), // index of the option the writer chose
    closesAt: timestamp("closes_at", { withTimezone: true }), // auto-close deadline
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_crossroads_story_status").on(table.storyId, table.status),
    index("idx_crossroads_creator").on(table.creatorId),
  ]
);

export const crossroadsRelations = relations(crossroads, ({ one, many }) => ({
  story: one(stories, {
    fields: [crossroads.storyId],
    references: [stories.id],
  }),
  creator: one(users, {
    fields: [crossroads.creatorId],
    references: [users.id],
  }),
  votes: many(crossroadsVotes),
}));

export const crossroadsVotes = pgTable(
  "crossroads_votes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    crossroadId: uuid("crossroad_id")
      .notNull()
      .references(() => crossroads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(), // which option they voted for
    dropsSpent: integer("drops_spent").notNull(), // weight = drops spent
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_crossroads_votes_crossroad").on(table.crossroadId),
    index("idx_crossroads_votes_user").on(table.userId),
  ]
);

export const crossroadsVotesRelations = relations(crossroadsVotes, ({ one }) => ({
  crossroad: one(crossroads, {
    fields: [crossroadsVotes.crossroadId],
    references: [crossroads.id],
  }),
  user: one(users, {
    fields: [crossroadsVotes.userId],
    references: [users.id],
  }),
}));

// ── Desk Notes ──────────────────────────────────────────────
// Short literary posts an author pins to their profile — the
// commonplace book / margins of the desk. Optional reference to
// one of their own stories.

export const deskNotes = pgTable(
  "desk_notes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    storyId: uuid("story_id").references(() => stories.id, {
      onDelete: "set null",
    }),
    isPinned: boolean("is_pinned").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_desk_notes_user_feed").on(
      table.userId,
      table.deletedAt,
      table.isPinned,
      table.createdAt
    ),
  ]
);

export const deskNotesRelations = relations(deskNotes, ({ one }) => ({
  author: one(users, {
    fields: [deskNotes.userId],
    references: [users.id],
  }),
  story: one(stories, {
    fields: [deskNotes.storyId],
    references: [stories.id],
  }),
}));

// ── Profile visits — candles & letters ───────────────────────
// The profile is the writer's study opened to visitors. A candle is a
// lightweight warm gesture (one per visitor, re-lightable; "burning" =
// lit within the last 7 days). A letter is private correspondence that
// becomes public only when the writer answers it.

export const profileCandles = pgTable(
  "profile_candles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    litAt: timestamp("lit_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("profile_candles_visitor_unique").on(
      table.profileUserId,
      table.visitorId
    ),
    index("idx_profile_candles_recent").on(table.profileUserId, table.litAt),
  ]
);

export const profileCandlesRelations = relations(profileCandles, ({ one }) => ({
  profileUser: one(users, {
    fields: [profileCandles.profileUserId],
    references: [users.id],
  }),
  visitor: one(users, {
    fields: [profileCandles.visitorId],
    references: [users.id],
  }),
}));

export const profileLetters = pgTable(
  "profile_letters",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** The writer whose desk the letter lands on. */
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** The writer's answer. A letter is public correspondence once answered. */
    reply: text("reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    isPinned: boolean("is_pinned").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_profile_letters_feed").on(
      table.profileUserId,
      table.deletedAt,
      table.repliedAt,
      table.createdAt
    ),
    index("idx_profile_letters_sender").on(table.senderId, table.createdAt),
  ]
);

export const profileLettersRelations = relations(profileLetters, ({ one }) => ({
  profileUser: one(users, {
    fields: [profileLetters.profileUserId],
    references: [users.id],
  }),
  sender: one(users, {
    fields: [profileLetters.senderId],
    references: [users.id],
  }),
}));
