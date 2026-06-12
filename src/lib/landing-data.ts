import { db } from "@/server/db";
import { stories, users, sparks as sparksTable, chapters } from "@/server/db/schema";
import { and, eq, isNull, or, desc, asc, sql } from "drizzle-orm";
import { extractFirstLine, htmlToText } from "@/lib/text-extract";
import type { LandingTale } from "@/components/landing/FilmLanding";
import type { ShoreStory } from "@/app/landing-experience/LandingExperience";

export interface FeaturedStoryData {
  slug: string;
  title: string;
  author: string | null;
  synopsis: string | null;
  genres: string[];
  chapterCount: number;
  sparkCount: number;
  coverImageUrl: string | null;
}

export interface ShelfStoryData {
  slug: string;
  title: string;
  author: string | null;
  genres: string[];
  coverImageUrl: string | null;
}

/**
 * Top public story by spark count. Returns null if no published public
 * stories exist yet — the homepage component falls back to fixture data
 * in that case so a fresh install still renders sensibly.
 */
export async function getFeaturedStory(): Promise<FeaturedStoryData | null> {
  const sparkStats = db
    .select({
      storyId: sparksTable.storyId,
      sparkCount: sql<number>`count(*)`.as("spark_count"),
    })
    .from(sparksTable)
    .groupBy(sparksTable.storyId)
    .as("spark_stats");

  const chapterStats = db
    .select({
      storyId: chapters.storyId,
      chapterCount: sql<number>`count(*)`.as("chapter_count"),
    })
    .from(chapters)
    .where(isNull(chapters.deletedAt))
    .groupBy(chapters.storyId)
    .as("chapter_stats");

  // Note: stories.hook exists in schema.ts but migration 0015_story_hook.sql
  // may be unapplied in some environments; we intentionally query synopsis
  // only so the homepage doesn't 500 when the column is missing.
  const rows = await db
    .select({
      slug: stories.slug,
      title: stories.title,
      synopsis: stories.synopsis,
      coverImageUrl: stories.coverImageUrl,
      genres: stories.genres,
      author: users.displayName,
      chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
      sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
    })
    .from(stories)
    .leftJoin(users, eq(stories.userId, users.id))
    .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
    .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
    .where(and(eq(stories.isPublic, true), isNull(stories.deletedAt)))
    .orderBy(desc(sql`coalesce(${sparkStats.sparkCount}, 0)`), desc(stories.publishedAt))
    .limit(1);

  const row = rows[0];
  if (!row?.slug) return null;
  return {
    slug: row.slug,
    title: row.title,
    author: row.author,
    synopsis: row.synopsis ?? null,
    genres: row.genres ?? [],
    chapterCount: Number(row.chapterCount ?? 0),
    sparkCount: Number(row.sparkCount ?? 0),
    coverImageUrl: row.coverImageUrl ?? null,
  };
}

/**
 * Most recently published public stories. Excludes the featured story so
 * the hero card and the shelf don't duplicate the same title.
 */
export async function getShelfStories(
  limit = 5,
  excludeSlug?: string | null,
): Promise<ShelfStoryData[]> {
  const rows = await db
    .select({
      slug: stories.slug,
      title: stories.title,
      coverImageUrl: stories.coverImageUrl,
      genres: stories.genres,
      author: users.displayName,
    })
    .from(stories)
    .leftJoin(users, eq(stories.userId, users.id))
    .where(and(eq(stories.isPublic, true), isNull(stories.deletedAt)))
    .orderBy(desc(stories.publishedAt), desc(stories.createdAt))
    .limit(limit + (excludeSlug ? 1 : 0));

  return rows
    .filter((r) => r.slug && r.slug !== excludeSlug)
    .slice(0, limit)
    .map((r) => ({
      slug: r.slug as string,
      title: r.title,
      author: r.author,
      genres: r.genres ?? [],
      coverImageUrl: r.coverImageUrl ?? null,
    }));
}

// ── Film landing ("V · What the ink became") ────────────────

function formatSparks(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}

// HTML→text excerpt helpers live in @/lib/text-extract (shared with the
// dashboard's manuscript hero). Tag-strip is fine: editor output is trusted
// Tiptap HTML and the result is rendered as text, never as markup.

/**
 * Top public stories with a published first chapter, shaped for the
 * homepage's First Line + Ledger. Returns [] when the platform is empty;
 * the component falls back to fixtures.
 */
export async function getLandingTales(limit = 5): Promise<LandingTale[]> {
  const sparkStats = db
    .select({
      storyId: sparksTable.storyId,
      sparkCount: sql<number>`count(*)`.as("spark_count"),
    })
    .from(sparksTable)
    .groupBy(sparksTable.storyId)
    .as("spark_stats");

  // Same caveat as getFeaturedStory: stories.hook may be unapplied in
  // some environments, so the hook line falls back to synopsis.
  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      synopsis: stories.synopsis,
      genres: stories.genres,
      author: users.displayName,
      sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
    })
    .from(stories)
    .leftJoin(users, eq(stories.userId, users.id))
    .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
    .where(and(eq(stories.isPublic, true), isNull(stories.deletedAt)))
    .orderBy(desc(sql`coalesce(${sparkStats.sparkCount}, 0)`), desc(stories.publishedAt))
    .limit(limit * 2); // headroom: stories without a readable chapter 1 drop out

  const tales: LandingTale[] = [];
  for (const row of rows) {
    if (tales.length >= limit) break;
    if (!row.slug) continue;
    const [first] = await db
      .select({ content: chapters.content, wordCount: chapters.wordCount })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, row.id),
          eq(chapters.status, "published"),
          isNull(chapters.deletedAt),
        ),
      )
      .orderBy(asc(chapters.sortOrder))
      .limit(1);
    if (!first) continue;
    const firstLine = extractFirstLine(first.content ?? "");
    const hook = (row.synopsis ?? "").trim();
    if (!firstLine && !hook) continue;
    tales.push({
      slug: row.slug,
      title: row.title,
      author: row.author?.trim() || "Anonymous",
      genre: row.genres?.[0] ?? "Story",
      sparks: formatSparks(Number(row.sparkCount ?? 0)),
      mins: Math.max(1, Math.ceil((first.wordCount ?? 0) / 250)),
      hook: hook.length > 140 ? `${hook.slice(0, 137).trimEnd()}…` : hook || firstLine,
      firstLine: firstLine || hook,
    });
  }
  return tales;
}

// ── The reader's test drive (landing-experience shores) ─────

/**
 * Which platform genres each archipelago world gathers. The worlds are
 * moods more than taxonomy entries, so each maps to a small family.
 */
const SHORE_GENRES: Record<string, string[]> = {
  romance: ["Romance", "Contemporary"],
  scifi: ["Science Fiction", "Cyberpunk", "Dystopian"],
  pirate: ["Adventure", "Historical Fiction", "Action"],
  horror: ["Horror", "Dark Fantasy", "Paranormal", "Thriller"],
};

/**
 * Opening paragraphs of a chapter's HTML, for the shore's mid-scene
 * excerpt. Splits on block boundaries so the drop-cap paragraph rhythm
 * of the reading page survives.
 */
function extractOpeningParas(html: string, max = 3): string[] {
  const paras: string[] = [];
  for (const block of html.split(/<\/(?:p|h[1-6]|blockquote|li|div)>/i)) {
    if (paras.length >= max) break;
    const text = htmlToText(block);
    if (text.length < 2) continue;
    paras.push(text.length > 480 ? `${text.slice(0, 477).trimEnd()}…` : text);
  }
  return paras;
}

export type ShoreTalesResult = Record<string, ShoreStory[]>;

/**
 * Three real tales per genre world for the landing-experience shores:
 * top-sparked public stories in the world's genre family that have a
 * published first chapter. A world only switches off its fixtures when
 * it can seat three real tales — a half-real shore reads as broken.
 */
export async function getShoreTales(): Promise<ShoreTalesResult> {
  const sparkStats = db
    .select({
      storyId: sparksTable.storyId,
      sparkCount: sql<number>`count(*)`.as("spark_count"),
    })
    .from(sparksTable)
    .groupBy(sparksTable.storyId)
    .as("spark_stats");

  const chapterStats = db
    .select({
      storyId: chapters.storyId,
      chapterCount: sql<number>`count(*)`.as("chapter_count"),
    })
    .from(chapters)
    .where(and(eq(chapters.status, "published"), isNull(chapters.deletedAt)))
    .groupBy(chapters.storyId)
    .as("chapter_stats");

  const result: ShoreTalesResult = {};

  for (const [worldKey, genreList] of Object.entries(SHORE_GENRES)) {
    const rows = await db
      .select({
        id: stories.id,
        slug: stories.slug,
        title: stories.title,
        synopsis: stories.synopsis,
        status: stories.status,
        author: users.displayName,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .where(
        and(
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
          or(...genreList.map((g) => sql`${g} = ANY(${stories.genres})`)),
        ),
      )
      .orderBy(desc(sql`coalesce(${sparkStats.sparkCount}, 0)`), desc(stories.publishedAt))
      .limit(6); // headroom: stories without a readable chapter one drop out

    const tales: ShoreStory[] = [];
    for (const row of rows) {
      if (tales.length >= 3) break;
      if (!row.slug) continue;
      const [first] = await db
        .select({ id: chapters.id, content: chapters.content, wordCount: chapters.wordCount })
        .from(chapters)
        .where(
          and(
            eq(chapters.storyId, row.id),
            eq(chapters.status, "published"),
            isNull(chapters.deletedAt),
          ),
        )
        .orderBy(asc(chapters.sortOrder))
        .limit(1);
      if (!first?.content) continue;
      const paras = extractOpeningParas(first.content);
      if (paras.length === 0) continue;
      const synopsis = (row.synopsis ?? "").trim();
      tales.push({
        title: row.title,
        author: row.author?.trim() || "Anonymous",
        hook: synopsis.length > 120 ? `${synopsis.slice(0, 117).trimEnd()}…` : synopsis || paras[0].slice(0, 120),
        synopsis: synopsis || paras[0],
        chapters: Number(row.chapterCount ?? 0),
        status: row.status === "completed" || row.status === "complete" ? "complete" : "ongoing",
        sparks: Number(row.sparkCount ?? 0),
        mins: Math.max(1, Math.ceil((first.wordCount ?? 0) / 250)),
        paras,
        slug: row.slug,
        firstChapterId: first.id,
      });
    }
    if (tales.length >= 3) result[worldKey] = tales;
  }

  return result;
}

/** Count of public stories, for the "…and N more in the stacks" receipt. */
export async function getPublicStoryCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stories)
    .where(and(eq(stories.isPublic, true), isNull(stories.deletedAt)));
  return Number(row?.count ?? 0);
}
