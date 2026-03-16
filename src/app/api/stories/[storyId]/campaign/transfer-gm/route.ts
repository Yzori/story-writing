import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, playerCharacters, collaborators } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { transferGmSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";
import { createNotification, createBulkNotifications } from "@/lib/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * POST /api/stories/[storyId]/campaign/transfer-gm
 * Transfer GM ownership to another user. Current GM only.
 * The new GM must be an existing player or collaborator in the campaign.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId } = await params;

    // Verify story exists and current user is the GM
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
        { error: { code: "FORBIDDEN", message: "Only the current GM can transfer ownership" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = transferGmSchema.safeParse(body);
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

    const { newGmUserId } = parsed.data;

    // Cannot transfer to yourself
    if (newGmUserId === session.user.id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "You are already the GM" } },
        { status: 400 }
      );
    }

    // Verify the new GM is a player or collaborator in this campaign
    const isPlayer = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.userId, newGmUserId)
      ),
    });
    const isCollaborator = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.storyId, storyId),
        eq(collaborators.userId, newGmUserId)
      ),
    });

    if (!isPlayer && !isCollaborator) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "The new GM must be an existing player or collaborator in this campaign" } },
        { status: 400 }
      );
    }

    // Transfer ownership
    const [updated] = await db
      .update(stories)
      .set({ userId: newGmUserId, updatedAt: new Date() })
      .where(eq(stories.id, storyId))
      .returning();

    // Notify the new GM
    await createNotification(
      newGmUserId,
      "collaboration",
      `You are now the GM of "${story.title}"`,
      `/campaign/${storyId}`
    );

    // Notify all other players
    const players = await db.query.playerCharacters.findMany({
      where: eq(playerCharacters.storyId, storyId),
    });
    const otherPlayerIds = [...new Set(
      players
        .map((p) => p.userId)
        .filter((id) => id !== newGmUserId && id !== session.user.id)
    )];
    if (otherPlayerIds.length > 0) {
      await createBulkNotifications(
        otherPlayerIds,
        "collaboration",
        `GM role for "${story.title}" has been transferred`,
        `/campaign/${storyId}`
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("POST /api/.../campaign/transfer-gm error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to transfer GM role" } },
      { status: 500 }
    );
  }
}
