import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  unique,
  index,
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
  bio: text("bio"),
  role: text("role").notNull().default("writer"),
  comfortRating: text("comfort_rating").notNull().default("everyone"),
  readingMode: text("reading_mode").notNull().default("paginated"),
  readingFont: text("reading_font").notNull().default("default"),
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
}));

// ── Stories ──────────────────────────────────────────────────

export const stories = pgTable("stories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  format: text("format").notNull().default("novel"),
  synopsis: text("synopsis").default(""),
  coverImageUrl: text("cover_image_url"),
  genres: text("genres")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  contentRating: text("content_rating").notNull().default("G"),
  status: text("status").notNull().default("draft"),
  dedication: text("dedication").default(""),
  language: text("language").notNull().default("English"),
  epigraph: text("epigraph").default(""),
  epigraphAttribution: text("epigraph_attribution").default(""),
  foreword: text("foreword").default(""),
  showToc: boolean("show_toc").notNull().default(true),
  dropCaps: boolean("drop_caps").notNull().default(false),
  sceneBreakStyle: text("scene_break_style").notNull().default("asterism"),
  dailyWordTarget: integer("daily_word_target").notNull().default(500),
  writingMode: text("writing_mode").notNull().default("solo"), // 'solo' | 'co-op' | 'campaign'
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
});

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, { fields: [stories.userId], references: [users.id] }),
  chapters: many(chapters),
  bibleEntries: many(bibleEntries),
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
  sessionId: uuid("session_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chapterSnapshotsRelations = relations(
  chapterSnapshots,
  ({ one }) => ({
    chapter: one(chapters, {
      fields: [chapterSnapshots.chapterId],
      references: [chapters.id],
    }),
  })
);

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
});

export const bibleEntriesRelations = relations(bibleEntries, ({ one }) => ({
  story: one(stories, {
    fields: [bibleEntries.storyId],
    references: [stories.id],
  }),
}));

// ── Writing Sessions ─────────────────────────────────────────

export const writingSessions = pgTable("writing_sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id),
  date: date("date").notNull(),
  wordsWritten: integer("words_written").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
      .references(() => users.id),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("sparks_user_story_unique").on(table.userId, table.storyId)]
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
      .references(() => users.id),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("follows_user_story_unique").on(table.userId, table.storyId)]
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
    .references(() => users.id),
  chapterId: uuid("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): any => comments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    .references(() => users.id),
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
});

export const flagsRelations = relations(flags, ({ one }) => ({
  user: one(users, { fields: [flags.userId], references: [users.id] }),
  story: one(stories, { fields: [flags.storyId], references: [stories.id] }),
  comment: one(comments, {
    fields: [flags.commentId],
    references: [comments.id],
  }),
}));

// ── Notifications ──────────────────────────────────────────

export const notifications = pgTable("notifications", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
      .references(() => users.id),
    role: text("role").notNull(), // 'writer' | 'illustrator' | 'editor' | 'worldbuilder'
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("collaborators_story_user_unique").on(table.storyId, table.userId),
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
      .references(() => users.id),
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
    .references(() => users.id),
  content: text("content").notNull(),
  note: text("note"),
  status: text("status").notNull().default("pending"), // 'pending' | 'woven' | 'revised' | 'passed'
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    .references(() => users.id),
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
});

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
      .references(() => users.id),
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
      .references(() => users.id),
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
    .references(() => users.id),
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
});

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
      .references(() => users.id),
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
  }
);

export const playerCharactersRelations = relations(
  playerCharacters,
  ({ one }) => ({
    story: one(stories, {
      fields: [playerCharacters.storyId],
      references: [stories.id],
    }),
    user: one(users, {
      fields: [playerCharacters.userId],
      references: [users.id],
    }),
  })
);

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
});

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
      .references(() => users.id),
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
    .references(() => users.id),
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
      .references(() => users.id),
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
    .references(() => users.id),
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
]);

export const campaignTurnsRelations = relations(campaignTurns, ({ one }) => ({
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
      .references(() => users.id),
    pitch: text("pitch").notNull(),
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
      .references(() => users.id),
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
