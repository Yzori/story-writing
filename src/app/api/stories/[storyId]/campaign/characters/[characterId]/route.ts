import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { playerCharacters, stories, sessionRoster, campaignSessions } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { updatePlayerCharacterSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; characterId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/campaign/characters/[characterId]
 * Update a character. Only the character's owner or story owner can update.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, characterId } = await params;

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

    // Fetch the character
    const character = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.id, characterId),
        eq(playerCharacters.storyId, storyId)
      ),
    });
    if (!character) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }

    // Only character owner or story owner can update
    const isStoryOwner = story.userId === session.user.id;
    if (character.userId !== session.user.id && !isStoryOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only edit your own character" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updatePlayerCharacterSchema.safeParse(body);

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

    // Lifecycle status is GM-only: dead/retired/active flips drive roster
    // state and would otherwise let a player self-revive their character.
    if (parsed.data.status !== undefined && !isStoryOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can change a character's status" } },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(playerCharacters)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(playerCharacters.id, characterId))
      .returning();

    // Update roster in any active session based on character status change
    if (parsed.data.status === "dead" || parsed.data.status === "retired" || parsed.data.status === "active") {
      const activeSessions = await db
        .select({ id: campaignSessions.id })
        .from(campaignSessions)
        .where(
          and(
            eq(campaignSessions.storyId, storyId),
            eq(campaignSessions.status, "active")
          )
        );

      const rosterStatus = parsed.data.status === "active" ? "present" : "spectating";
      for (const activeSession of activeSessions) {
        await db
          .update(sessionRoster)
          .set({ status: rosterStatus })
          .where(
            and(
              eq(sessionRoster.sessionId, activeSession.id),
              eq(sessionRoster.characterId, characterId)
            )
          );
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/campaign/characters/[characterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update character" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/campaign/characters/[characterId]
 * Delete a character. Only the character's owner or story owner can delete.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, characterId } = await params;

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

    // Fetch the character
    const character = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.id, characterId),
        eq(playerCharacters.storyId, storyId)
      ),
    });
    if (!character) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }

    // Only character owner or story owner can delete
    if (character.userId !== session.user.id && story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only delete your own character" } },
        { status: 403 }
      );
    }

    await db
      .delete(playerCharacters)
      .where(eq(playerCharacters.id, characterId));

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/stories/[storyId]/campaign/characters/[characterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete character" } },
      { status: 500 }
    );
  }
}
