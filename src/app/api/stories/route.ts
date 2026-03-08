import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, chapters } from "@/lib/db/schema";
import { eq, isNull, desc, lt, and, sql } from "drizzle-orm";
import { createStorySchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";

// TODO: Add auth checks — the auth agent handles that

/**
 * GET /api/stories
 * List stories with optional userId filter and cursor-based pagination.
 * Query params: userId, cursor (story id), limit (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const conditions = [isNull(stories.deletedAt)];

    if (userId) {
      conditions.push(eq(stories.userId, userId));
    }

    if (cursor) {
      // Cursor is the createdAt timestamp of the last item from the previous page
      const cursorStory = await db.query.stories.findFirst({
        where: eq(stories.id, cursor),
      });
      if (cursorStory) {
        conditions.push(lt(stories.createdAt, cursorStory.createdAt));
      }
    }

    const results = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        status: stories.status,
        dedication: stories.dedication,
        language: stories.language,
        isPublic: stories.isPublic,
        slug: stories.slug,
        publishedAt: stories.publishedAt,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.createdAt))
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
 * Create a new story. Title is required.
 */
export async function POST(request: NextRequest) {
  try {
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

    // TODO: Get userId from auth session
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "userId is required" } },
        { status: 400 }
      );
    }

    const [story] = await db
      .insert(stories)
      .values({
        title,
        slug,
        userId,
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
