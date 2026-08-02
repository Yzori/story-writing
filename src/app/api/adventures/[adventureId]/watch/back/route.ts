import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureBackings, adventureSeats } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { adventureBackingSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/watch/back
 * Back a character — one per adventure, switching allowed. Free; it's
 * a fanbase, not a wager.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to back a character" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = adventureBackingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const [seat] = await db
      .select({ id: adventureSeats.id, role: adventureSeats.role })
      .from(adventureSeats)
      .where(
        and(
          eq(adventureSeats.id, parsed.data.seatId),
          eq(adventureSeats.adventureId, adventureId),
          eq(adventureSeats.status, "seated")
        )
      );
    if (!seat || seat.role !== "writer") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "You can only back a character" } },
        { status: 404 }
      );
    }

    await db
      .insert(adventureBackings)
      .values({ adventureId, seatId: seat.id, userId: session.user.id })
      .onConflictDoUpdate({
        target: [adventureBackings.adventureId, adventureBackings.userId],
        set: { seatId: seat.id, createdAt: new Date() },
      });

    return NextResponse.json({ data: { backing: seat.id } });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/watch/back",
      "Failed to back the character",
    );
  }
}
