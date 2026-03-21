import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, users, sparks as sparksTable, chapters } from "@/lib/db/schema";
import { eq, isNull, desc, lt, and, sql, count, ilike } from "drizzle-orm";
import { createStorySchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";
import { auth } from "@/lib/auth";

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
    const isPublic = searchParams.get("public") === "true";
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "latest";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const conditions = [isNull(stories.deletedAt)];

    if (mine) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
          { status: 401 }
        );
      }
      conditions.push(eq(stories.userId, session.user.id));
    }

    if (isPublic) {
      conditions.push(eq(stories.isPublic, true));
    }

    const writingMode = searchParams.get("writingMode");
    if (writingMode) {
      conditions.push(eq(stories.writingMode, writingMode));
    }

    if (search) {
      conditions.push(ilike(stories.title, `%${search}%`));
    }

    if (cursor) {
      const cursorStory = await db.query.stories.findFirst({
        where: eq(stories.id, cursor),
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

    const results = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
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
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .where(and(...conditions))
      .orderBy(
        sort === "most-sparked"
          ? desc(sql`coalesce(${sparkStats.sparkCount}, 0)`)
          : sort === "most-read"
          ? desc(sql`coalesce(${chapterStats.totalWords}, 0)`)
          : sort === "rising"
          ? desc(sql`coalesce(${sparkStats.sparkCount}, 0) * 10 + extract(epoch from ${stories.createdAt}) / 86400`)
          : desc(stories.createdAt)
      )
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      data: {
        stories: items,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error("GET /api/stories error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch stories" } },
      { status: 500 }
    );
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

    const { title, ...rest } = parsed.data;
    const slug = generateSlug(title);

    const [story] = await db
      .insert(stories)
      .values({
        title,
        slug,
        userId: session.user.id,
        ...rest,
      })
      .returning();

    return NextResponse.json({ data: story }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create story" } },
      { status: 500 }
    );
  }
}
