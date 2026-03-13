import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  staffPicks,
  stories,
  users,
  sparks as sparksTable,
  chapters,
} from "@/lib/db/schema";
import { eq, isNull, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";
import { z } from "zod";

const createStaffPickSchema = z.object({
  storyId: z.string().uuid(),
  curatorNote: z.string().min(1).max(500),
  pickedBy: z.string().min(1).max(100),
});

/**
 * GET /api/staff-picks
 * Returns staff picks with full story data, ordered by most recent pick.
 */
export async function GET() {
  try {
    const chapterStats = db
      .select({
        storyId: chapters.storyId,
        chapterCount: sql<number>`count(*)`.as("chapter_count"),
        totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as(
          "total_words"
        ),
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
        pickId: staffPicks.id,
        curatorNote: staffPicks.curatorNote,
        pickedBy: staffPicks.pickedBy,
        pickedAt: staffPicks.pickedAt,
        id: stories.id,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        status: stories.status,
        slug: stories.slug,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        authorName: users.displayName,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
        totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
      })
      .from(staffPicks)
      .innerJoin(
        stories,
        and(
          eq(staffPicks.storyId, stories.id),
          isNull(stories.deletedAt),
          eq(stories.isPublic, true)
        )
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .orderBy(desc(staffPicks.pickedAt))
      .limit(6);

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("GET /api/staff-picks error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch staff picks",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff-picks
 * Create a staff pick. Requires authentication.
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const body = await request.json();
    const parsed = createStaffPickSchema.safeParse(body);

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

    const [pick] = await db
      .insert(staffPicks)
      .values(parsed.data)
      .returning();

    return NextResponse.json({ data: pick }, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff-picks error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create staff pick",
        },
      },
      { status: 500 }
    );
  }
}
