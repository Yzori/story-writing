import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventures, adventureSeats } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { canStartAdventure } from "@/lib/adventure-spotlight";
import { loadAdventureContext } from "@/server/services/adventure-table";
import type { AdventureStatus } from "@/lib/adventure-spotlight";

type RouteParams = { params: Promise<{ adventureId: string }> };
const CONFLICT = "START_CONFLICT";

/**
 * POST /api/adventures/[adventureId]/start
 * The Director starts the adventure once the table is cast: any still
 * open writer seats are folded away, the spotlight lands on the
 * Director's desk, and the first scene can be opened.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let denyReason: string | null = null;
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

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || !ctx.mySeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (ctx.mySeat.role !== "director") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the Director starts the adventure." } },
        { status: 403 }
      );
    }
    const directorSeatId = ctx.mySeat.id;

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(adventures)
        .where(eq(adventures.id, adventureId))
        .for("update");
      if (!locked) throw new Error(CONFLICT);

      const seats = await tx
        .select()
        .from(adventureSeats)
        .where(eq(adventureSeats.adventureId, adventureId));
      const seatedWriters = seats.filter(
        (s) => s.role === "writer" && s.status === "seated"
      ).length;
      const directorSeated = seats.some(
        (s) => s.role === "director" && s.status === "seated"
      );

      const decision = canStartAdventure(
        locked.status as AdventureStatus,
        seatedWriters,
        directorSeated
      );
      if (!decision.allowed) {
        denyReason = decision.reason;
        throw new Error(CONFLICT);
      }

      const now = new Date();
      await tx
        .update(adventures)
        .set({
          status: "running",
          spotlightSeatId: directorSeatId,
          spotlightSince: now,
          spotlightDueAt: null,
          updatedAt: now,
        })
        .where(eq(adventures.id, adventureId));

      // Fold away seats nobody claimed — the cast is set.
      for (const seat of seats) {
        if (seat.role === "writer" && seat.status === "open") {
          await tx
            .update(adventureSeats)
            .set({ status: "left" })
            .where(eq(adventureSeats.id, seat.id));
        }
      }
    });

    return NextResponse.json({ data: { started: true } });
  } catch (error) {
    if (error instanceof Error && error.message === CONFLICT) {
      return NextResponse.json(
        {
          error: {
            code: "START_CONFLICT",
            message: denyReason ?? "The table changed — refresh and try again.",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/adventures/[adventureId]/start error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to start the adventure" } },
      { status: 500 }
    );
  }
}
