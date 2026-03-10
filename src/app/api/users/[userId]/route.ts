import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, stories } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]
 * Get user profile with their stories and stats.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

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
      })
      .from(stories)
      .where(and(eq(stories.userId, userId), isNull(stories.deletedAt)))
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
