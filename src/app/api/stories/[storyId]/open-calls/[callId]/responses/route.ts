import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { openCallResponses, openCalls, users, stories } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createOpenCallResponseSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; callId: string }>;
};

/**
 * GET /api/stories/[storyId]/open-calls/[callId]/responses
 * List responses. Story owner only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, callId } = await params;

    // Verify story ownership
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

    const result = await db
      .select({
        id: openCallResponses.id,
        callId: openCallResponses.callId,
        userId: openCallResponses.userId,
        pitch: openCallResponses.pitch,
        status: openCallResponses.status,
        createdAt: openCallResponses.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(openCallResponses)
      .leftJoin(users, eq(openCallResponses.userId, users.id))
      .where(eq(openCallResponses.callId, callId))
      .orderBy(desc(openCallResponses.createdAt))
      .limit(100);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/open-calls/[callId]/responses error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch responses" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/open-calls/[callId]/responses
 * Submit a response/pitch. Requires auth.
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

    const { storyId, callId } = await params;

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

    // Verify open call exists and is open
    const call = await db.query.openCalls.findFirst({
      where: and(eq(openCalls.id, callId), eq(openCalls.storyId, storyId)),
    });

    if (!call) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Open call not found" } },
        { status: 404 }
      );
    }

    if (call.status !== "open") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "This call is no longer accepting responses" } },
        { status: 400 }
      );
    }

    // Cannot respond to your own open call
    if (story.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You cannot respond to your own open call" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createOpenCallResponseSchema.safeParse(body);

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
      .insert(openCallResponses)
      .values({
        callId,
        userId: session.user.id,
        pitch: parsed.data.pitch,
      })
      .returning();

    // Notify the story owner about the response
    if (story.userId !== session.user.id) {
      const name = session.user.name || "Someone";
      createNotification(
        story.userId,
        "open-call",
        `${name} responded to your open call "${call.title}" on "${story.title}"`,
        `/story/${story.slug || storyId}`
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/stories/[storyId]/open-calls/[callId]/responses error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to submit response" } },
      { status: 500 }
    );
  }
}
