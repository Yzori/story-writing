import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  unique,
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
  writingSessions: many(writingSessions),
  sparks: many(sparks),
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
  format: text("format").notNull().default("prose"),
  synopsis: text("synopsis").default(""),
  coverImageUrl: text("cover_image_url"),
  genres: text("genres")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  contentRating: text("content_rating").notNull().default("everyone"),
  status: text("status").notNull().default("draft"),
  dedication: text("dedication").default(""),
  language: text("language").notNull().default("English"),
  epigraph: text("epigraph").default(""),
  epigraphAttribution: text("epigraph_attribution").default(""),
  foreword: text("foreword").default(""),
  showToc: boolean("show_toc").notNull().default(true),
  dropCaps: boolean("drop_caps").notNull().default(true),
  sceneBreakStyle: text("scene_break_style").notNull().default("asterism"),
  dailyWordTarget: integer("daily_word_target").notNull().default(500),
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
      .references(() => stories.id),
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
