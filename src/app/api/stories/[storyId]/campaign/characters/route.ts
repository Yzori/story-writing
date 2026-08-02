import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { characterMarks, playerCharacters, users } from "@/server/db/schema";
import { asc, eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createPlayerCharacterSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

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

    // Attach marks per character via a single story-scoped query. Mark counts
    // per story stay small (a handful per character) so this is cheaper than
    // a per-character roundtrip.
    const allMarks = await db.query.characterMarks.findMany({
      where: eq(characterMarks.storyId, storyId),
      orderBy: [asc(characterMarks.createdAt)],
    });
    const marksByChar = new Map<string, typeof allMarks>();
    for (const m of allMarks) {
      const list = marksByChar.get(m.characterId);
      if (list) list.push(m);
      else marksByChar.set(m.characterId, [m]);
    }
    const enriched = result.map((c) => ({ ...c, marks: marksByChar.get(c.id) ?? [] }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/campaign/characters",
      "Failed to fetch player characters",
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

    // Check if the user already has an active character in this story
    const existingActive = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.userId, session.user.id),
        eq(playerCharacters.status, "active")
      ),
    });

    if (existingActive) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "You already have an active character in this campaign",
          },
        },
        { status: 409 }
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
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/campaign/characters",
      "Failed to create player character",
    );
  }
}
