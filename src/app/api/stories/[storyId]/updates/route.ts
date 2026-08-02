import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { creatorUpdates, stories, users, follows } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createUpdateSchema } from "@/lib/validations";
import { createBulkNotifications } from "@/server/services/notifications";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/updates
 * List creator updates for a story, newest first. Limited to 20.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const offset = (page - 1) * limit;

    const result = await db
      .select({
        id: creatorUpdates.id,
        storyId: creatorUpdates.storyId,
        userId: creatorUpdates.userId,
        content: creatorUpdates.content,
        createdAt: creatorUpdates.createdAt,
        user: {
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(creatorUpdates)
      .leftJoin(users, eq(creatorUpdates.userId, users.id))
      .where(eq(creatorUpdates.storyId, storyId))
      .orderBy(desc(creatorUpdates.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;

    return NextResponse.json({ data, hasMore });
  } catch (error) {
    return handleRouteError(error, "GET /api/stories/[storyId]/updates", "Failed to fetch updates");
  }
}

/**
 * POST /api/stories/[storyId]/updates
 * Create a creator update. Requires auth. Only the story owner can post.
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

    // Verify the user owns this story
    const [story] = await db
      .select({ userId: stories.userId, title: stories.title, slug: stories.slug })
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1);

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    if (story.userId !== userId) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the story owner can post updates",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    const [created] = await db
      .insert(creatorUpdates)
      .values({ storyId, userId, content })
      .returning();

    // Return with user info
    const [result] = await db
      .select({
        id: creatorUpdates.id,
        storyId: creatorUpdates.storyId,
        userId: creatorUpdates.userId,
        content: creatorUpdates.content,
        createdAt: creatorUpdates.createdAt,
        user: {
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(creatorUpdates)
      .leftJoin(users, eq(creatorUpdates.userId, users.id))
      .where(eq(creatorUpdates.id, created.id))
      .limit(1);

    // Notify all followers of this story
    const followerRows = await db
      .select({ userId: follows.userId })
      .from(follows)
      .where(eq(follows.storyId, storyId));
    const followerIds = followerRows
      .map((f) => f.userId)
      .filter((id) => id !== userId);
    if (followerIds.length > 0) {
      const authorName = session.user.name || "The author";
      createBulkNotifications(
        followerIds,
        "update",
        `${authorName} posted an update on "${story.title}"`,
        `/story/${story.slug || storyId}`
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/updates",
      "Failed to create update",
    );
  }
}
