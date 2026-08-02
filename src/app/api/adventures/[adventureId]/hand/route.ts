import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureHands } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { raiseAdventureHandSchema } from "@/lib/validations";
import { canLowerHand, canRaiseHand } from "@/lib/adventure-spotlight";
import {
  loadAdventureContext,
  toSpotlightSeat,
  toSpotlightState,
} from "@/server/services/adventure-table";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/hand
 * Raise your hand — anytime, one live hand per seat, optional whisper
 * that only the Director reads.
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
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = raiseAdventureHandSchema.safeParse(body);
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

    const [activeHand] = await db
      .select({ id: adventureHands.id })
      .from(adventureHands)
      .where(
        and(
          eq(adventureHands.seatId, ctx.mySeat.id),
          isNull(adventureHands.resolvedAt)
        )
      );

    const decision = canRaiseHand(
      toSpotlightState(ctx.adventure, !!ctx.openScene),
      toSpotlightSeat(ctx.mySeat),
      !!activeHand
    );
    if (!decision.allowed) {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: decision.reason } },
        { status: 409 }
      );
    }

    // The partial unique index (one live hand per seat) backstops a
    // double-tap race; treat the violation as "already up".
    try {
      const [hand] = await db
        .insert(adventureHands)
        .values({
          adventureId,
          seatId: ctx.mySeat.id,
          whisper: parsed.data.whisper ?? "",
        })
        .returning();
      if (ctx.directorSeat?.userId) {
        const writerName = ctx.mySeat.userName ?? ctx.mySeat.characterName;
        createNotification(
          ctx.directorSeat.userId,
          "adventure",
          `${writerName} raised a hand — they have the next move`,
          `/adventures/${adventureId}`
        );
      }
      return NextResponse.json({ data: hand }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "Your hand is already up." } },
        { status: 409 }
      );
    }
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/hand",
      "Failed to raise your hand",
    );
  }
}

/**
 * DELETE /api/adventures/[adventureId]/hand
 * Lower your hand (withdraw).
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

    const [activeHand] = await db
      .select({ id: adventureHands.id })
      .from(adventureHands)
      .where(
        and(
          eq(adventureHands.seatId, ctx.mySeat.id),
          isNull(adventureHands.resolvedAt)
        )
      );

    const decision = canLowerHand(!!activeHand);
    if (!decision.allowed) {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: decision.reason } },
        { status: 409 }
      );
    }

    await db
      .update(adventureHands)
      .set({ resolvedAt: new Date(), resolution: "withdrawn" })
      .where(eq(adventureHands.id, activeHand.id));

    return NextResponse.json({ data: { lowered: true } });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/adventures/[adventureId]/hand",
      "Failed to lower your hand",
    );
  }
}
