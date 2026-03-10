import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { follows, stories } from "@/lib/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/follows
 * Get follow count and whether the current user follows this story.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const session = await auth();

    const [{ value: followCount }] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.storyId, storyId));

    let hasFollowed = false;
    if (session?.user?.id) {
      const existing = await db.query.follows.findFirst({
        where: and(
          eq(follows.userId, session.user.id),
          eq(follows.storyId, storyId)
        ),
      });
      hasFollowed = !!existing;
    }

    return NextResponse.json({
      data: { count: followCount, hasFollowed },
    });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/follows error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch follows" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/follows
 * Toggle follow on a story. Requires authentication.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId } = await params;

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Check existing follow
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.userId, session.user.id),
        eq(follows.storyId, storyId)
      ),
    });

    if (existing) {
      // Unfollow
      await db.delete(follows).where(eq(follows.id, existing.id));
    } else {
      // Follow
      await db.insert(follows).values({
        userId: session.user.id,
        storyId,
      });
    }

    const [{ value: followCount }] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.storyId, storyId));

    return NextResponse.json({
      data: { followed: !existing, count: followCount },
    });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/follows error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to toggle follow" } },
      { status: 500 }
    );
  }
}
