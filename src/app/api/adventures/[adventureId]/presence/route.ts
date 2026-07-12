import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { adventureSeatPresence } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { adventureSeatPresenceSchema } from "@/lib/validations";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/presence
 * A seated player's heartbeat: "I'm at the table" every few seconds
 * the page is open, plus a writing pulse while they're actually
 * typing. Each beat carries the current truth, so a beat with
 * writing=false retires the pulse. Counted against the read budget —
 * beats are chatty by design and must never crowd out real writes.
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
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = adventureSeatPresenceSchema.safeParse(body);
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

    const now = new Date();
    const writingAt = parsed.data.writing ? now : null;
    await db
      .insert(adventureSeatPresence)
      .values({
        adventureId,
        seatId: ctx.mySeat.id,
        lastSeen: now,
        writingAt,
      })
      .onConflictDoUpdate({
        target: [adventureSeatPresence.adventureId, adventureSeatPresence.seatId],
        set: { lastSeen: now, writingAt },
      });

    return NextResponse.json({ data: { present: true } });
  } catch (error) {
    console.error("POST /api/adventures/[adventureId]/presence error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to keep your seat warm" } },
      { status: 500 }
    );
  }
}
