import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureHands, adventureScenes, stories } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]
 * Full table state for a seated player: adventure, seats, scenes,
 * spotlight, and hands. Whispers are only included for the Director;
 * other writers see that a hand is up, never what it holds.
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
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    // Slice 1: the table is for the seated. The audience gets its own
    // read-only watch surface in Slice 3.
    if (!ctx || !ctx.mySeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const [story] = await db
      .select({ id: stories.id, title: stories.title })
      .from(stories)
      .where(eq(stories.id, ctx.adventure.storyId));

    const scenes = await db
      .select()
      .from(adventureScenes)
      .where(eq(adventureScenes.adventureId, adventureId))
      .orderBy(adventureScenes.openedAt);

    const isDirector = ctx.mySeat.role === "director";
    const activeHands = await db
      .select()
      .from(adventureHands)
      .where(
        and(
          eq(adventureHands.adventureId, adventureId),
          isNull(adventureHands.resolvedAt)
        )
      )
      .orderBy(adventureHands.raisedAt);

    return NextResponse.json({
      data: {
        adventure: {
          id: ctx.adventure.id,
          storyId: ctx.adventure.storyId,
          ownerId: ctx.adventure.ownerId,
          title: story?.title ?? "",
          premise: ctx.adventure.premise,
          genre: ctx.adventure.genre,
          pace: ctx.adventure.pace,
          turnDueHours: ctx.adventure.turnDueHours,
          status: ctx.adventure.status,
          actNo: ctx.adventure.actNo,
          sceneNo: ctx.adventure.sceneNo,
          spotlightSeatId: ctx.adventure.spotlightSeatId,
          spotlightSince: ctx.adventure.spotlightSince,
          spotlightDueAt: ctx.adventure.spotlightDueAt,
          boardVisibility: ctx.adventure.boardVisibility,
          updatedAt: ctx.adventure.updatedAt,
        },
        seats: ctx.seats.map((seat) => ({
          id: seat.id,
          userId: seat.userId,
          role: seat.role,
          characterName: seat.characterName,
          characterBrief: seat.characterBrief,
          inkColor: seat.inkColor,
          status: seat.status,
          stepForwardAct: seat.stepForwardAct,
          userName: seat.userName,
          userAvatarUrl: seat.userAvatarUrl,
        })),
        scenes,
        hands: activeHands.map((hand) => ({
          id: hand.id,
          seatId: hand.seatId,
          raisedAt: hand.raisedAt,
          // Whispers are for the Director's eyes (and your own hand).
          whisper:
            isDirector || hand.seatId === ctx.mySeat!.id ? hand.whisper : "",
        })),
        mySeatId: ctx.mySeat.id,
      },
    });
  } catch (error) {
    console.error("GET /api/adventures/[adventureId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load adventure" } },
      { status: 500 }
    );
  }
}
