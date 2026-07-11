import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureHands,
  adventures,
  adventureScenes,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { passAdventureSpotlightSchema } from "@/lib/validations";
import {
  canPassSpotlight,
  passSpotlightEffects,
} from "@/lib/adventure-spotlight";
import {
  loadAdventureContext,
  toSpotlightSeat,
  toSpotlightState,
} from "@/server/services/adventure-table";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ adventureId: string }> };
const CONFLICT = "SPOTLIGHT_CONFLICT";

/**
 * POST /api/adventures/[adventureId]/spotlight
 * Director passes the spotlight to a seated writer. Resolves the
 * writer's raised hand (if any) as 'spotlight'.
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
    const body = await request.json();
    const parsed = passAdventureSpotlightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || !ctx.mySeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    const toSeat = ctx.seats.find((s) => s.id === parsed.data.toSeatId);
    if (!toSeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No such seat at this table" } },
        { status: 404 }
      );
    }
    const mySeat = ctx.mySeat;

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(adventures)
        .where(eq(adventures.id, adventureId))
        .for("update");
      if (!locked) throw new Error(CONFLICT);

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
      const decision = canPassSpotlight(
        state,
        toSpotlightSeat(mySeat),
        toSpotlightSeat(toSeat)
      );
      if (!decision.allowed) {
        denyReason = decision.reason;
        throw new Error(CONFLICT);
      }

      const now = new Date();
      await tx
        .update(adventures)
        .set({ ...passSpotlightEffects(state, toSeat.id, now), updatedAt: now })
        .where(eq(adventures.id, adventureId));

      await tx
        .update(adventureHands)
        .set({ resolvedAt: now, resolution: "spotlight" })
        .where(
          and(
            eq(adventureHands.seatId, toSeat.id),
            isNull(adventureHands.resolvedAt)
          )
        );
    });

    if (toSeat.userId) {
      createNotification(
        toSeat.userId,
        "adventure",
        "You have the spotlight — the page is yours",
        `/adventures/${adventureId}`
      );
    }

    return NextResponse.json({ data: { spotlightSeatId: toSeat.id } });
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
    console.error("POST /api/adventures/[adventureId]/spotlight error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to pass the spotlight" } },
      { status: 500 }
    );
  }
}
