import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { follows, stories } from "@/lib/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/api-utils";

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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

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

    let followed: boolean;

    if (existing) {
      // Unfollow
      await db.delete(follows).where(eq(follows.id, existing.id));
      followed = false;
    } else {
      // Follow — handle race condition where concurrent request already inserted
      try {
        await db.insert(follows).values({
          userId: session.user.id,
          storyId,
        });
        followed = true;
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "23505") {
          // Unique constraint hit — treat as toggle off
          await db.delete(follows).where(
            and(eq(follows.userId, session.user.id), eq(follows.storyId, storyId))
          );
          followed = false;
        } else {
          throw err;
        }
      }

      // Notify story owner (only on new follow)
      if (followed && story.userId !== session.user.id) {
        const name = session.user.name || "Someone";
        createNotification(
          story.userId,
          "follow",
          `${name} is now following "${story.title}"`,
          `/story/${story.slug || storyId}`
        );
      }
    }

    const [{ value: followCount }] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.storyId, storyId));

    return NextResponse.json({
      data: { followed, count: followCount },
    });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/follows error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to toggle follow" } },
      { status: 500 }
    );
  }
}
