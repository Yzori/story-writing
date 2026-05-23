import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { characterMarks, playerCharacters, stories } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; characterId: string; markId: string }>;
};

/**
 * DELETE /api/stories/[storyId]/campaign/characters/[characterId]/marks/[markId]
 * Remove a mark. Character's owner OR story GM. No edit endpoint — marks are
 * one-line; revisit by delete + recreate.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, characterId, markId } = await params;

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    const character = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.id, characterId),
        eq(playerCharacters.storyId, storyId),
      ),
    });
    if (!character) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 },
      );
    }

    const isOwner = character.userId === session.user.id;
    const isGM = story.userId === session.user.id;
    if (!isOwner && !isGM) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the player or the GM can remove this mark" } },
        { status: 403 },
      );
    }

    const mark = await db.query.characterMarks.findFirst({
      where: and(eq(characterMarks.id, markId), eq(characterMarks.characterId, characterId)),
    });
    if (!mark) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Mark not found" } },
        { status: 404 },
      );
    }

    await db.delete(characterMarks).where(eq(characterMarks.id, markId));
    return NextResponse.json({ data: { id: markId } });
  } catch (error) {
    console.error("DELETE character mark error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove mark" } },
      { status: 500 },
    );
  }
}
