import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureSeats } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { adventureSeatSetupSchema } from "@/lib/validations";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * PATCH /api/adventures/[adventureId]/seat
 * Update your own character (name, brief, ink color). Writers only —
 * the Director has no character by design.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const parsed = adventureSeatSetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
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
    if (ctx.mySeat.role !== "writer") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "The Director plays the world, not a character." } },
        { status: 409 }
      );
    }

    const [seat] = await db
      .update(adventureSeats)
      .set({
        characterName: parsed.data.characterName,
        characterBrief: parsed.data.characterBrief,
        inkColor: parsed.data.inkColor,
      })
      .where(eq(adventureSeats.id, ctx.mySeat.id))
      .returning();

    return NextResponse.json({ data: seat });
  } catch (error) {
    console.error("PATCH /api/adventures/[adventureId]/seat error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update your seat" } },
      { status: 500 }
    );
  }
}
