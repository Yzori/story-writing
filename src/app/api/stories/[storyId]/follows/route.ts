import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { follows, stories } from "@/server/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createNotification } from "@/server/services/notifications";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

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
    return handleRouteError(error, "GET /api/stories/[storyId]/follows", "Failed to fetch follows");
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

    // Atomic toggle using transaction to prevent race conditions
    const followed = await db.transaction(async (tx) => {
      const existing = await tx.query.follows.findFirst({
        where: and(
          eq(follows.userId, session.user.id),
          eq(follows.storyId, storyId)
        ),
      });

      if (existing) {
        await tx
          .delete(follows)
          .where(and(eq(follows.userId, session.user.id), eq(follows.storyId, storyId)));
        return false;
      } else {
        // Double-click race: loser's insert hits the unique constraint —
        // treat as "already following", not a 500.
        await tx
          .insert(follows)
          .values({
            userId: session.user.id,
            storyId,
          })
          .onConflictDoNothing();
        return true;
      }
    });

    // Notify story owner (only on new follow, outside transaction)
    if (followed && story.userId !== session.user.id) {
      const name = session.user.name || "Someone";
      createNotification(
        story.userId,
        "follow",
        `${name} is now following "${story.title}"`,
        `/story/${story.slug || storyId}`
      );
    }

    const [{ value: followCount }] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.storyId, storyId));

    return NextResponse.json({
      data: { followed, count: followCount },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/follows",
      "Failed to toggle follow",
    );
  }
}
