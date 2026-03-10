import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creatorUpdates, stories, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createUpdateSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/updates
 * List creator updates for a story, newest first. Limited to 20.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

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
      .limit(20);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/updates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch updates" } },
      { status: 500 }
    );
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

    const { storyId } = await params;
    const userId = session.user.id;

    // Verify the user owns this story
    const [story] = await db
      .select({ userId: stories.userId })
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

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/updates error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create update",
        },
      },
      { status: 500 }
    );
  }
}
