import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sparks, stories } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/sparks
 * Returns the spark count and whether the current user has sparked this story.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const [{ value: sparkCount }] = await db
      .select({ value: count() })
      .from(sparks)
      .where(eq(sparks.storyId, storyId));

    let hasSparked = false;

    if (userId) {
      const existing = await db
        .select({ id: sparks.id })
        .from(sparks)
        .where(and(eq(sparks.storyId, storyId), eq(sparks.userId, userId)))
        .limit(1);

      hasSparked = existing.length > 0;
    }

    return NextResponse.json({
      data: { count: sparkCount, hasSparked },
    });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/sparks error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch sparks" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/sparks
 * Toggle spark for the current user. Requires authentication.
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
    const userId = session.user.id;

    // Atomic toggle using transaction to prevent race conditions
    const sparked = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: sparks.id })
        .from(sparks)
        .where(and(eq(sparks.storyId, storyId), eq(sparks.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        await tx
          .delete(sparks)
          .where(and(eq(sparks.storyId, storyId), eq(sparks.userId, userId)));
        return false;
      } else {
        await tx.insert(sparks).values({ userId, storyId });
        return true;
      }
    });

    // Notify story owner (only on new spark, outside transaction)
    if (sparked) {
      const [story] = await db
        .select({ userId: stories.userId, title: stories.title, slug: stories.slug })
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);
      if (story && story.userId !== userId) {
        const name = session.user.name || "Someone";
        createNotification(
          story.userId,
          "spark",
          `${name} sparked your story "${story.title}"`,
          `/story/${story.slug || storyId}`
        );
      }
    }

    // Get updated count
    const [{ value: sparkCount }] = await db
      .select({ value: count() })
      .from(sparks)
      .where(eq(sparks.storyId, storyId));

    return NextResponse.json({
      data: { sparked, count: sparkCount },
    });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/sparks error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to toggle spark" } },
      { status: 500 }
    );
  }
}
