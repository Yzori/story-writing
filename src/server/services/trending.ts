import "server-only";
import { db } from "@/server/db";
import { stories, users, sparks, follows, storyDonations } from "@/server/db/schema";
import { and, eq, isNull, ne, or, sql, type SQL } from "drizzle-orm";

/**
 * Shared trending scorer — the single source of truth for "what's hot".
 *
 * Weighted score over the last 7 days: sparks ×3, follows ×5, donation
 * drops ×0.5. Only public, published, non-deleted stories are considered.
 * The interaction subqueries are time-bounded to the window so the
 * aggregates stay index-prunable.
 *
 * Used by /api/home (hero fill + trending row) and /api/discover
 * (genre-biased dashboard strip).
 */

/** Trending window in days. */
export const TRENDING_WINDOW_DAYS = 7;

/** How many candidate stories are scored per computation. */
const CANDIDATE_POOL_SIZE = 100;

export interface TrendingOptions {
  /** Bias to these genres (story matches if it has ANY of them). */
  genres?: string[];
  /** Exclude stories owned by this user (e.g. the viewer's own work). */
  excludeUserId?: string;
  /** Max stories returned (default: the whole scored candidate pool). */
  limit?: number;
}

export type TrendingStory = Awaited<ReturnType<typeof computeTrending>>[number];

/**
 * Compute decay-window trending stories, highest score first.
 */
export async function computeTrending(options: TrendingOptions = {}) {
  const { genres = [], excludeUserId, limit } = options;

  const now = new Date();
  const windowStartIso = new Date(
    now.getTime() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const conds: (SQL | undefined)[] = [
    eq(stories.isPublic, true),
    eq(stories.status, "published"),
    isNull(stories.deletedAt),
  ];
  if (excludeUserId) {
    conds.push(ne(stories.userId, excludeUserId));
  }
  if (genres.length > 0) {
    conds.push(or(...genres.map((g) => sql`${g} = ANY(${stories.genres})`)));
  }

  const rows = await db
    .select({
      id: stories.id,
      userId: stories.userId,
      title: stories.title,
      slug: stories.slug,
      synopsis: stories.synopsis,
      hook: stories.hook,
      coverImageUrl: stories.coverImageUrl,
      genres: stories.genres,
      format: stories.format,
      writingMode: stories.writingMode,
      publishedAt: stories.publishedAt,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
      sparkScore: sql<number>`(
        select coalesce(count(*), 0)::int from ${sparks}
        where ${sparks.storyId} = ${stories.id}
          and ${sparks.createdAt} > ${windowStartIso}::timestamptz
      )`,
      followScore: sql<number>`(
        select coalesce(count(*), 0)::int from ${follows}
        where ${follows.storyId} = ${stories.id}
          and ${follows.createdAt} > ${windowStartIso}::timestamptz
      )`,
      donationScore: sql<number>`(
        select coalesce(sum(${storyDonations.amount}), 0)::int from ${storyDonations}
        where ${storyDonations.storyId} = ${stories.id}
          and ${storyDonations.createdAt} > ${windowStartIso}::timestamptz
      )`,
    })
    .from(stories)
    .leftJoin(users, eq(stories.userId, users.id))
    .where(and(...conds))
    .limit(CANDIDATE_POOL_SIZE);

  const scored = rows
    .map((r) => {
      const sparkScore = Number(r.sparkScore);
      const followScore = Number(r.followScore);
      const donationScore = Number(r.donationScore);
      const score = sparkScore * 3 + followScore * 5 + donationScore * 0.5;
      return {
        ...r,
        sparkScore,
        followScore,
        donationScore,
        score,
        weeklyInteractions: {
          sparks: sparkScore,
          follows: followScore,
          donationDrops: donationScore,
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}
