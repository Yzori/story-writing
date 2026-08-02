import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { openCalls, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ storyId: string; callId: string }>;
};

const updateOpenCallSchema = z.object({
  status: z.enum(["open", "filled", "closed"]),
});

/**
 * PATCH /api/stories/[storyId]/open-calls/[callId]
 * Update call status (close/fill). Story owner only.
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

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

    const body = await request.json();
    const parsed = updateOpenCallSchema.safeParse(body);

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

    const existing = await db.query.openCalls.findFirst({
      where: and(eq(openCalls.id, callId), eq(openCalls.storyId, storyId)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Open call not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(openCalls)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(eq(openCalls.id, callId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/open-calls/[callId]",
      "Failed to update open call",
    );
  }
}
