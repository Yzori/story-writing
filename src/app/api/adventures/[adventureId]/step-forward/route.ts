import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureHands,
  adventures,
  adventureScenes,
  adventureSeats,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import {
  canStepForward,
  stepForwardEffects,
} from "@/lib/adventure-spotlight";
import {
  loadAdventureContext,
  toSpotlightSeat,
  toSpotlightState,
} from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };
const CONFLICT = "SPOTLIGHT_CONFLICT";

/**
 * POST /api/adventures/[adventureId]/step-forward
 * Spend the once-per-act token: take the spotlight outright from the
 * Director's desk. The Director's next passage must weave with what
 * you write (soft rule — the table enforces it, not the code).
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
    if (!ctx || !ctx.mySeat || !ctx.directorSeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    const mySeat = ctx.mySeat;
    const directorSeatId = ctx.directorSeat.id;

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(adventures)
        .where(eq(adventures.id, adventureId))
        .for("update");
      if (!locked) throw new Error(CONFLICT);

      // Re-read my seat under the lock — the token spend must not race
      // a concurrent step-forward in the same act.
      const [lockedSeat] = await tx
        .select()
        .from(adventureSeats)
        .where(eq(adventureSeats.id, mySeat.id));
      if (!lockedSeat) throw new Error(CONFLICT);

      const [openScene] = await tx
        .select({ id: adventureScenes.id })
        .from(adventureScenes)
        .where(
          and(
            eq(adventureScenes.adventureId, adventureId),
            eq(adventureScenes.status, "open")
          )
        );

      const state = toSpotlightState(locked, !!openScene);
      const seat = toSpotlightSeat(lockedSeat);
      const decision = canStepForward(state, seat, directorSeatId);
      if (!decision.allowed) {
        denyReason = decision.reason;
        throw new Error(CONFLICT);
      }

      const now = new Date();
      const effects = stepForwardEffects(state, seat, now);
      await tx
        .update(adventures)
        .set({
          spotlightSeatId: effects.spotlightSeatId,
          spotlightSince: effects.spotlightSince,
          spotlightDueAt: effects.spotlightDueAt,
          updatedAt: now,
        })
        .where(eq(adventures.id, adventureId));
      await tx
        .update(adventureSeats)
        .set({ stepForwardAct: effects.stepForwardAct })
        .where(eq(adventureSeats.id, mySeat.id));

      // A raised hand is resolved by the step itself.
      await tx
        .update(adventureHands)
        .set({ resolvedAt: now, resolution: "stepped-forward" })
        .where(
          and(
            eq(adventureHands.seatId, mySeat.id),
            isNull(adventureHands.resolvedAt)
          )
        );
    });

    return NextResponse.json({ data: { spotlightSeatId: mySeat.id } });
  } catch (error) {
    if (error instanceof Error && error.message === CONFLICT) {
      return NextResponse.json(
        {
          error: {
            code: "SPOTLIGHT_CONFLICT",
            message: denyReason ?? "The spotlight moved — refresh the table.",
          },
        },
        { status: 409 }
      );
    }
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/step-forward",
      "Failed to step forward",
    );
  }
}
