import { db } from "@/server/db";
import { stories, users, sparks as sparksTable, chapters } from "@/server/db/schema";
import { and, eq, isNull, desc, sql } from "drizzle-orm";

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
