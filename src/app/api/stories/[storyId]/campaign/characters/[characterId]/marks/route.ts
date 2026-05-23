import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignSessions,
  campaignTurns,
  characterMarks,
  playerCharacters,
  stories,
} from "@/server/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createCharacterMarkSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; characterId: string }>;
};

async function loadCharacter(storyId: string, characterId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { error: "STORY_NOT_FOUND" as const };
  const character = await db.query.playerCharacters.findFirst({
    where: and(
      eq(playerCharacters.id, characterId),
      eq(playerCharacters.storyId, storyId),
    ),
  });
  if (!character) return { error: "CHARACTER_NOT_FOUND" as const };
  return { story, character };
}

/**
 * GET /api/stories/[storyId]/campaign/characters/[characterId]/marks
 * List marks on a character. Visible to anyone who can see the campaign
 * (public story or authenticated viewer); marks are part of the public
 * character record.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, characterId } = await params;
    const loaded = await loadCharacter(storyId, characterId);
    if ("error" in loaded) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 },
      );
    }
    if (!loaded.story.isPublic) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Sign in to view" } },
          { status: 401 },
        );
      }
      const check = await verifyCollaboratorAccess(storyId, session.user.id);
      if (check.error === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Story not found" } },
          { status: 404 },
        );
      }
      if (check.error === "FORBIDDEN") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
          { status: 403 },
        );
      }
    }
    const marks = await db.query.characterMarks.findMany({
      where: eq(characterMarks.characterId, characterId),
      orderBy: [asc(characterMarks.createdAt)],
    });
    return NextResponse.json({ data: marks });
  } catch (error) {
    console.error("GET character marks error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load marks" } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/characters/[characterId]/marks
 * Create a mark. The character's owner OR the story owner (GM) can mark.
 * GM-authored marks let the GM "invite" a mark after a consequence or
 * story-moment; player-authored is the primary path.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { storyId, characterId } = await params;
    const loaded = await loadCharacter(storyId, characterId);
    if ("error" in loaded) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 },
      );
    }

    const isOwner = loaded.character.userId === session.user.id;
    const isGM = loaded.story.userId === session.user.id;
    if (!isOwner && !isGM) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the player or the GM can mark this character" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createCharacterMarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    let sessionIdToStore = parsed.data.sessionId ?? null;
    if (sessionIdToStore) {
      const markSession = await db.query.campaignSessions.findFirst({
        where: and(
          eq(campaignSessions.id, sessionIdToStore),
          eq(campaignSessions.storyId, storyId),
        ),
      });
      if (!markSession) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Mark session does not belong to this story" } },
          { status: 400 },
        );
      }
    }

    if (parsed.data.sourceTurnId) {
      const sourceTurn = await db.query.campaignTurns.findFirst({
        where: eq(campaignTurns.id, parsed.data.sourceTurnId),
      });
      if (!sourceTurn) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Source turn not found" } },
          { status: 400 },
        );
      }
      const sourceSession = await db.query.campaignSessions.findFirst({
        where: and(
          eq(campaignSessions.id, sourceTurn.sessionId),
          eq(campaignSessions.storyId, storyId),
        ),
      });
      if (!sourceSession) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Source turn does not belong to this story" } },
          { status: 400 },
        );
      }
      if (sessionIdToStore && sourceTurn.sessionId !== sessionIdToStore) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Source turn does not belong to the mark session" } },
          { status: 400 },
        );
      }
      sessionIdToStore = sourceTurn.sessionId;
    }

    const [inserted] = await db
      .insert(characterMarks)
      .values({
        characterId,
        storyId,
        sessionId: sessionIdToStore,
        sourceTurnId: parsed.data.sourceTurnId ?? null,
        kind: parsed.data.kind,
        text: parsed.data.text,
      })
      .returning();

    return NextResponse.json({ data: inserted });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This moment is already marked" } },
        { status: 409 },
      );
    }
    console.error("POST character mark error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create mark" } },
      { status: 500 },
    );
  }
}
