import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, users, sparks as sparksTable, chapters, playerCharacters, campaignSessions } from "@/server/db/schema";
import { eq, ne, isNull, desc, lt, and, or, sql, ilike, inArray } from "drizzle-orm";
import { createStorySchema } from "@/lib/validations";
import { LEGACY_RATING_MAP } from "@/config/genres";
import { firstChapterTitleFor } from "@/lib/constants";
import { generateSlug } from "@/lib/utils";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/stories
 * List stories with optional filters and cursor-based pagination.
 * Query params: mine (boolean), public (boolean), cursor, limit, search
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "true";
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "latest";
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;

    const conditions = [isNull(stories.deletedAt)];
    let visibilityCondition = eq(stories.isPublic, true);

    if (mine) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
          { status: 401 }
        );
      }
      visibilityCondition = eq(stories.userId, session.user.id);
    }
    conditions.push(visibilityCondition);

    const writingMode = searchParams.get("writingMode");
    if (writingMode) {
      conditions.push(eq(stories.writingMode, writingMode));
    } else {
      // Adventure books are written at the table, not the desk. Keep them
      // out of generic listings until the adventure finishes and compiles
      // the story to 'complete' — then it's a real book on the shelf.
      const cond = or(
        ne(stories.writingMode, "adventure"),
        eq(stories.status, "complete")
      );
      if (cond) conditions.push(cond);
    }

    if (search) {
      conditions.push(ilike(stories.title, `%${search}%`));
    }

    // Filter by author userId
    const filterUserId = searchParams.get("userId");
    if (filterUserId) {
      conditions.push(eq(stories.userId, filterUserId));
    }

    // Filter by genre
    const filterGenre = searchParams.get("genre");
    if (filterGenre) {
      conditions.push(sql`${filterGenre} = ANY(${stories.genres})`);
    }

    // Filter by format. A concrete format excludes adventure-mode tables
    // (they browse as "Adventure" via writingMode, not by format).
    const filterFormat = searchParams.get("format");
    if (filterFormat) {
      conditions.push(eq(stories.format, filterFormat));
      if (!writingMode) conditions.push(ne(stories.writingMode, "campaign"));
    }

    // Filter by story status — comma-separated ("in-progress,published").
    const filterStatus = searchParams.get("status");
    if (filterStatus) {
      const statuses = filterStatus.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
      if (statuses.length > 0) conditions.push(inArray(stories.status, statuses));
    }

    // Filter by content rating — comma-separated allowlist; the client
    // computes the allowed set from its comfort cap.
    const filterRatings = searchParams.get("ratings");
    if (filterRatings) {
      const ratings = filterRatings.split(",").map((r) => r.trim()).filter(Boolean).slice(0, 10);
      if (ratings.length > 0) conditions.push(inArray(stories.contentRating, ratings));
    }

    // Exclude a specific story
    const excludeId = searchParams.get("exclude");
    if (excludeId) {
      conditions.push(ne(stories.id, excludeId));
    }

    if (cursor) {
      const cursorStory = await db.query.stories.findFirst({
        where: and(
          eq(stories.id, cursor),
          isNull(stories.deletedAt),
          visibilityCondition
        ),
      });
      if (cursorStory) {
        conditions.push(lt(stories.createdAt, cursorStory.createdAt));
      }
    }

    // Join with users to get author name, subquery for chapter stats and spark counts
    const chapterStats = db
      .select({
        storyId: chapters.storyId,
        chapterCount: sql<number>`count(*)`.as("chapter_count"),
        totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as("total_words"),
      })
      .from(chapters)
      .where(isNull(chapters.deletedAt))
      .groupBy(chapters.storyId)
      .as("chapter_stats");

    const sparkStats = db
      .select({
        storyId: sparksTable.storyId,
        sparkCount: sql<number>`count(*)`.as("spark_count"),
      })
      .from(sparksTable)
      .groupBy(sparksTable.storyId)
      .as("spark_stats");

    const playerStats = db
      .select({
        storyId: playerCharacters.storyId,
        playerCount: sql<number>`count(distinct ${playerCharacters.userId})`.as("player_count"),
      })
      .from(playerCharacters)
      .where(eq(playerCharacters.status, "active"))
      .groupBy(playerCharacters.storyId)
      .as("player_stats");

    const sessionStats = db
      .select({
        storyId: campaignSessions.storyId,
        sessionCount: sql<number>`count(*)`.as("session_count"),
      })
      .from(campaignSessions)
      .groupBy(campaignSessions.storyId)
      .as("session_stats");

    const results = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        hook: stories.hook,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        contentNotes: stories.contentNotes,
        status: stories.status,
        writingMode: stories.writingMode,
        isPublic: stories.isPublic,
        slug: stories.slug,
        publishedAt: stories.publishedAt,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        authorName: users.displayName,
        authorImage: users.avatarUrl,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
        totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
        playerCount: sql<number>`coalesce(${playerStats.playerCount}, 0)`,
        sessionCount: sql<number>`coalesce(${sessionStats.sessionCount}, 0)`,
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .leftJoin(playerStats, eq(stories.id, playerStats.storyId))
      .leftJoin(sessionStats, eq(stories.id, sessionStats.storyId))
      .where(and(...conditions, ...wordRangeConditions(searchParams, chapterStats)))
      .orderBy(
        sort === "most-sparked"
          ? desc(sql`coalesce(${sparkStats.sparkCount}, 0)`)
          : sort === "most-read"
          ? desc(sql`coalesce(${chapterStats.totalWords}, 0)`)
          : sort === "rising" || sort === "recommended"
          ? desc(sql`coalesce(${sparkStats.sparkCount}, 0) * 10 + extract(epoch from ${stories.createdAt}) / 86400`)
          : desc(stories.createdAt)
      )
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const rawItems = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? rawItems[rawItems.length - 1].id : null;

    // Batch-check which stories have an active campaign session
    const storyIds = rawItems.map((r) => r.id);
    let activeSessionStoryIds = new Set<string>();
    if (storyIds.length > 0) {
      const activeSessions = await db
        .select({ storyId: campaignSessions.storyId })
        .from(campaignSessions)
        .where(
          and(
            sql`${campaignSessions.storyId} IN (${sql.join(storyIds.map(id => sql`${id}`), sql`, `)})`,
            eq(campaignSessions.status, "active")
          )
        );
      activeSessionStoryIds = new Set(activeSessions.map((s) => s.storyId));
    }

    // Parse contentNotes JSON string to array
    const items = rawItems.map((item) => ({
      ...item,
      contentNotes: parseContentNotes(item.contentNotes),
      hasActiveSession: activeSessionStoryIds.has(item.id),
    }));

    return NextResponse.json({
      data: {
        stories: items,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/stories", "Failed to fetch stories");
  }
}

/**
 * Total-word-count range filter (?minWords= / ?maxWords=) against the
 * published-chapter stats subquery, so length filters run in the DB
 * instead of over whatever slice the client happened to fetch.
 */
function wordRangeConditions(
  searchParams: URLSearchParams,
  chapterStats: { totalWords: unknown },
) {
  const conditions = [];
  const minWords = Number.parseInt(searchParams.get("minWords") || "", 10);
  const maxWords = Number.parseInt(searchParams.get("maxWords") || "", 10);
  if (Number.isFinite(minWords) && minWords > 0) {
    conditions.push(sql`coalesce(${chapterStats.totalWords}, 0) >= ${minWords}`);
  }
  if (Number.isFinite(maxWords) && maxWords > 0) {
    conditions.push(sql`coalesce(${chapterStats.totalWords}, 0) < ${maxWords}`);
  }
  return conditions;
}

function parseContentNotes(value: string | null): unknown[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * POST /api/stories
 * Create a new story. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 10,
      windowSeconds: 3600,
    });
    if (rl) return rl;

    const body = await request.json();
    const parsed = createStorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { title, contentNotes, contentRating, ...rest } = parsed.data;
    const slug = await generateUniqueStorySlug(title);

    // Normalize legacy G/PG/PG13/R/MA values to the canonical
    // everyone/teen/mature/explicit scheme used by readers' comfort filter.
    const normalizedRating = contentRating
      ? (LEGACY_RATING_MAP[contentRating] ?? contentRating)
      : undefined;

    const story = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(stories)
        .values({
          title,
          slug,
          userId: session.user.id,
          ...rest,
          ...(normalizedRating !== undefined && { contentRating: normalizedRating }),
          ...(contentNotes !== undefined && {
            contentNotes: JSON.stringify(contentNotes),
          }),
        })
        .returning();

      // Seed the first chapter so the editor always opens onto a real, saveable
      // page. Campaign tables are the exception — their chapters are compiled
      // from played sessions, so an empty one would be a phantom on the shelf.
      if (created.writingMode !== "campaign") {
        await tx.insert(chapters).values({
          storyId: created.id,
          title: firstChapterTitleFor(created.format),
          content: "",
          wordCount: 0,
          sortOrder: 0,
          status: "draft",
          authorNoteBefore: "",
          authorNoteAfter: "",
          outline: "",
        });
      }

      return created;
    });

    // Parse contentNotes back to array for response
    const responseStory = {
      ...story,
      contentNotes: (() => { try { return story.contentNotes ? JSON.parse(story.contentNotes) : []; } catch { return []; } })(),
    };

    return NextResponse.json({ data: responseStory }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/stories", "Failed to create story");
  }
}

async function generateUniqueStorySlug(title: string) {
  const baseSlug = generateSlug(title) || "story";
  let slug = baseSlug;
  let suffix = 2;

  while (await db.query.stories.findFirst({ where: eq(stories.slug, slug) })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
