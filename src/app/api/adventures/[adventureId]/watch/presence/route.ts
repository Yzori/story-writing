import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureAudiencePresence, adventures } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { adventurePresenceSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/watch/presence
 * Anonymous lantern heartbeat — a client-generated token, upserted.
 * Every lantern is a reader in the room right now.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = adventurePresenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const [adventure] = await db
      .select({ id: adventures.id })
      .from(adventures)
      .where(eq(adventures.id, adventureId));
    if (!adventure) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const now = new Date();
    await db
      .insert(adventureAudiencePresence)
      .values({ adventureId, token: parsed.data.token, lastHeartbeat: now })
      .onConflictDoUpdate({
        target: [
          adventureAudiencePresence.adventureId,
          adventureAudiencePresence.token,
        ],
        set: { lastHeartbeat: now },
      });

    return NextResponse.json({ data: { lit: true } });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/watch/presence",
      "Failed to light the lantern",
    );
  }
}
