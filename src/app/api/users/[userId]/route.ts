import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, stories, chapters, sparks as sparksTable } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql, count as countFn } from "drizzle-orm";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]
 * Get user profile with their stories and stats.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();
    const isOwnProfile = session?.user?.id === userId;

    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        bio: users.bio,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const storyConditions = [eq(stories.userId, userId), isNull(stories.deletedAt)];
    if (!isOwnProfile) {
      storyConditions.push(eq(stories.isPublic, true));
    }

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

    const userStories = await db
      .select({
        id: stories.id,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        status: stories.status,
        isPublic: stories.isPublic,
        slug: stories.slug,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
        totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
      })
      .from(stories)
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .where(and(...storyConditions))
      .orderBy(desc(stories.createdAt));

    return NextResponse.json({
      data: {
        ...user,
        displayName: user.displayName ?? user.name,
        avatarUrl: user.avatarUrl ?? user.image,
        stories: userStories,
      },
    });
  } catch (error) {
    console.error("GET /api/users/[userId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch user" } },
      { status: 500 }
    );
  }
}

// ── PATCH /api/users/[userId] ───────────────────────────────

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["writer", "illustrator", "editor", "worldbuilder", "reader"]).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * PATCH /api/users/[userId]
 * Update the authenticated user's profile.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { userId } = await params;

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only edit your own profile" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No fields to update" } },
        { status: 400 }
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        bio: users.bio,
        role: users.role,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        ...updatedUser,
        displayName: updatedUser.displayName ?? updatedUser.name,
        avatarUrl: updatedUser.avatarUrl ?? updatedUser.image,
      },
    });
  } catch (error) {
    console.error("PATCH /api/users/[userId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } },
      { status: 500 }
    );
  }
}
