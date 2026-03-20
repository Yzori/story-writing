import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guildProfiles, users, stories, sparks } from "@/lib/db/schema";
import { eq, and, ilike, or, sql, desc, ne } from "drizzle-orm";

/**
 * GET /api/roster
 * Browse guild members with filtering, search, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rolesFilter = searchParams.get("roles"); // comma-separated
    const genresFilter = searchParams.get("genres"); // comma-separated
    const availabilityFilter = searchParams.get("availability");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where conditions
    const conditions = [];

    // Exclude unavailable by default (unless explicitly filtering for them)
    if (availabilityFilter) {
      conditions.push(eq(guildProfiles.availability, availabilityFilter));
    } else {
      conditions.push(ne(guildProfiles.availability, "unavailable"));
    }

    // Role filter: check if any of the requested roles overlap with the profile's roles
    if (rolesFilter) {
      const roles = rolesFilter.split(",").filter(Boolean);
      if (roles.length > 0) {
        conditions.push(
          sql`${guildProfiles.roles} && ARRAY[${sql.join(roles.map(r => sql`${r}`), sql`, `)}]::text[]`
        );
      }
    }

    // Genre filter: check overlap
    if (genresFilter) {
      const genres = genresFilter.split(",").filter(Boolean);
      if (genres.length > 0) {
        conditions.push(
          sql`${guildProfiles.genres} && ARRAY[${sql.join(genres.map(g => sql`${g}`), sql`, `)}]::text[]`
        );
      }
    }

    // Text search
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.displayName, searchPattern),
          ilike(guildProfiles.tagline, searchPattern),
          ilike(guildProfiles.lookingFor, searchPattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guildProfiles)
      .innerJoin(users, eq(guildProfiles.userId, users.id))
      .where(whereClause);

    // Fetch members
    const members = await db
      .select({
        id: guildProfiles.id,
        userId: guildProfiles.userId,
        tagline: guildProfiles.tagline,
        roles: guildProfiles.roles,
        genres: guildProfiles.genres,
        availability: guildProfiles.availability,
        portfolioLinks: guildProfiles.portfolioLinks,
        showcaseStoryIds: guildProfiles.showcaseStoryIds,
        yearsWriting: guildProfiles.yearsWriting,
        lookingFor: guildProfiles.lookingFor,
        listedAt: guildProfiles.listedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
      })
      .from(guildProfiles)
      .innerJoin(users, eq(guildProfiles.userId, users.id))
      .where(whereClause)
      .orderBy(desc(guildProfiles.listedAt))
      .limit(limit)
      .offset(offset);

    // Batch-fetch showcase stories + stats for all members
    const memberIds = members.map((m) => m.userId);

    // Get story stats per member
    const storyStats = memberIds.length > 0
      ? await db
          .select({
            userId: stories.userId,
            totalStories: sql<number>`count(*)::int`,
            totalWords: sql<number>`coalesce(sum(
              (SELECT coalesce(sum(c.word_count), 0) FROM chapters c WHERE c.story_id = ${stories.id})
            ), 0)::int`,
          })
          .from(stories)
          .where(
            and(
              sql`${stories.userId} = ANY(ARRAY[${sql.join(memberIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
              eq(stories.isPublic, true),
              sql`${stories.deletedAt} IS NULL`
            )
          )
          .groupBy(stories.userId)
      : [];

    // Get spark counts per member
    const sparkStats = memberIds.length > 0
      ? await db
          .select({
            userId: stories.userId,
            totalSparks: sql<number>`count(${sparks.id})::int`,
          })
          .from(sparks)
          .innerJoin(stories, eq(sparks.storyId, stories.id))
          .where(
            sql`${stories.userId} = ANY(ARRAY[${sql.join(memberIds.map(id => sql`${id}::uuid`), sql`, `)}])`
          )
          .groupBy(stories.userId)
      : [];

    // Get showcase stories
    const allShowcaseIds = members.flatMap((m) => m.showcaseStoryIds || []).filter(Boolean);
    const showcaseStories = allShowcaseIds.length > 0
      ? await db
          .select({
            id: stories.id,
            title: stories.title,
            slug: stories.slug,
            coverImageUrl: stories.coverImageUrl,
            userId: stories.userId,
          })
          .from(stories)
          .where(
            sql`${stories.id} = ANY(ARRAY[${sql.join(allShowcaseIds.map(id => sql`${id}::uuid`), sql`, `)}])`
          )
      : [];

    // Assemble response
    const statsMap = new Map(storyStats.map((s) => [s.userId, s]));
    const sparksMap = new Map(sparkStats.map((s) => [s.userId, s]));
    const showcaseMap = new Map<string, typeof showcaseStories>();
    for (const story of showcaseStories) {
      if (!showcaseMap.has(story.userId)) showcaseMap.set(story.userId, []);
      showcaseMap.get(story.userId)!.push(story);
    }

    const data = members.map((m) => {
      const stats = statsMap.get(m.userId);
      const sparkStat = sparksMap.get(m.userId);
      return {
        userId: m.userId,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        bio: m.bio,
        tagline: m.tagline,
        roles: m.roles,
        genres: m.genres,
        availability: m.availability,
        yearsWriting: m.yearsWriting,
        lookingFor: m.lookingFor,
        portfolioLinks: m.portfolioLinks ? JSON.parse(m.portfolioLinks) : [],
        listedAt: m.listedAt,
        showcaseStories: (showcaseMap.get(m.userId) || []).slice(0, 3),
        totalStories: stats?.totalStories || 0,
        totalWords: stats?.totalWords || 0,
        totalSparks: sparkStat?.totalSparks || 0,
      };
    });

    return NextResponse.json({
      data: {
        members: data,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("GET /api/roster error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch roster" } },
      { status: 500 }
    );
  }
}
