import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playerCharacters, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updatePlayerCharacterSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";

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
    if (character.userId !== session.user.id && story.userId !== session.user.id) {
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

    const [updated] = await db
      .update(playerCharacters)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(playerCharacters.id, characterId))
      .returning();

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
