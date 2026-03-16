import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaignSessions, campaignTurns, playerCharacters, sessionRoster } from "@/lib/db/schema";
import { eq, and, ne, asc, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createCampaignSessionSchema } from "@/lib/validations";
import { verifyCollaboratorAccess, verifyStoryOwnership } from "@/lib/collaboration";
import { applyRateLimit } from "@/lib/api-utils";
import { createBulkNotifications } from "@/lib/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/sessions
 * List all campaign sessions for this story, with turn counts.
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

    const sessions = await db
      .select({
        id: campaignSessions.id,
        storyId: campaignSessions.storyId,
        title: campaignSessions.title,
        summary: campaignSessions.summary,
        sortOrder: campaignSessions.sortOrder,
        status: campaignSessions.status,
        epilogue: campaignSessions.epilogue,
        closingMood: campaignSessions.closingMood,
        createdAt: campaignSessions.createdAt,
        updatedAt: campaignSessions.updatedAt,
        turnCount: count(campaignTurns.id).as("turn_count"),
      })
      .from(campaignSessions)
      .leftJoin(campaignTurns, eq(campaignSessions.id, campaignTurns.sessionId))
      .where(eq(campaignSessions.storyId, storyId))
      .groupBy(campaignSessions.id)
      .orderBy(asc(campaignSessions.sortOrder));

    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/campaign/sessions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch sessions" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/sessions
 * Create a new campaign session. Requires story ownership (GM).
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

    const check = await verifyStoryOwnership(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can create sessions" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCampaignSessionSchema.safeParse(body);

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

    const existing = await db
      .select({ maxOrder: sql<number>`coalesce(max(${campaignSessions.sortOrder}), -1)` })
      .from(campaignSessions)
      .where(eq(campaignSessions.storyId, storyId));

    const nextOrder = (existing[0]?.maxOrder ?? -1) + 1;

    const [created] = await db
      .insert(campaignSessions)
      .values({
        storyId,
        title: parsed.data.title,
        summary: parsed.data.summary ?? "",
        opening: parsed.data.opening ?? null,
        status: "draft",
        sortOrder: nextOrder,
      })
      .returning();

    // Auto-populate the roster with active characters
    const activeCharacters = await db
      .select({ id: playerCharacters.id, userId: playerCharacters.userId })
      .from(playerCharacters)
      .where(
        and(
          eq(playerCharacters.storyId, storyId),
          eq(playerCharacters.status, "active")
        )
      );

    if (activeCharacters.length > 0) {
      // Check which characters have been in any prior session roster (to detect 'introduced' vs 'present')
      const priorRosterEntries = await db
        .select({ characterId: sessionRoster.characterId })
        .from(sessionRoster)
        .innerJoin(
          campaignSessions,
          eq(sessionRoster.sessionId, campaignSessions.id)
        )
        .where(
          and(
            eq(campaignSessions.storyId, storyId),
            ne(sessionRoster.sessionId, created.id),
            eq(sessionRoster.status, "present")
          )
        );

      const priorCharacterIds = new Set(
        priorRosterEntries.map((e) => e.characterId)
      );

      const rosterValues = activeCharacters.map((char) => ({
        sessionId: created.id,
        characterId: char.id,
        userId: char.userId,
        status: priorCharacterIds.has(char.id) ? "present" : "introduced",
      }));

      await db.insert(sessionRoster).values(rosterValues);
    }

    // Notify players that a new session is available
    const players = await db.query.playerCharacters.findMany({
      where: eq(playerCharacters.storyId, storyId),
    });
    const playerUserIds = [...new Set(
      players.map((p) => p.userId).filter((id) => id !== session.user.id)
    )];
    if (playerUserIds.length > 0) {
      await createBulkNotifications(
        playerUserIds,
        "collaboration",
        `New session "${created.title}" created in ${check.story?.title ?? "a campaign"}`,
        `/campaign/${storyId}`
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/campaign/sessions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create session" } },
      { status: 500 }
    );
  }
}
