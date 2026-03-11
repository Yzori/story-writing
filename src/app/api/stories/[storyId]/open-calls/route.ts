import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { openCalls, users, stories } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createOpenCallSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/open-calls
 * List open calls for a story. Public.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    const result = await db
      .select({
        id: openCalls.id,
        storyId: openCalls.storyId,
        userId: openCalls.userId,
        role: openCalls.role,
        title: openCalls.title,
        description: openCalls.description,
        requirements: openCalls.requirements,
        status: openCalls.status,
        createdAt: openCalls.createdAt,
        updatedAt: openCalls.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(openCalls)
      .leftJoin(users, eq(openCalls.userId, users.id))
      .where(eq(openCalls.storyId, storyId))
      .orderBy(desc(openCalls.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/open-calls error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch open calls" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/open-calls
 * Create an open call. Story owner only.
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

    // Verify story exists and ownership
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    if (story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createOpenCallSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(openCalls)
      .values({
        storyId,
        userId: session.user.id,
        role: parsed.data.role,
        title: parsed.data.title,
        description: parsed.data.description,
        requirements: parsed.data.requirements ?? null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/open-calls error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create open call" } },
      { status: 500 }
    );
  }
}
