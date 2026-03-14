import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playerCharacters, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPlayerCharacterSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/lib/collaboration";
import { applyRateLimit } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/characters
 * List all player characters for this story, with user info.
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

    const { storyId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const result = await db
      .select({
        id: playerCharacters.id,
        storyId: playerCharacters.storyId,
        userId: playerCharacters.userId,
        name: playerCharacters.name,
        portrait: playerCharacters.portrait,
        description: playerCharacters.description,
        traits: playerCharacters.traits,
        backstory: playerCharacters.backstory,
        stats: playerCharacters.stats,
        status: playerCharacters.status,
        createdAt: playerCharacters.createdAt,
        updatedAt: playerCharacters.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(playerCharacters)
      .leftJoin(users, eq(playerCharacters.userId, users.id))
      .where(eq(playerCharacters.storyId, storyId));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/campaign/characters error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch player characters" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/characters
 * Create a player character. One per user per story (unique constraint).
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

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createPlayerCharacterSchema.safeParse(body);

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
      .insert(playerCharacters)
      .values({
        storyId,
        userId: session.user.id,
        name: parsed.data.name,
        portrait: parsed.data.portrait,
        description: parsed.data.description ?? "",
        traits: parsed.data.traits ?? "",
        backstory: parsed.data.backstory ?? "",
        stats: parsed.data.stats ?? null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation (one character per user per story)
    if (
      error instanceof Error &&
      error.message.includes("player_characters_story_user_unique")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "You already have a character in this campaign",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/stories/[storyId]/campaign/characters error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create player character" } },
      { status: 500 }
    );
  }
}
