import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { touchLastSeen } from "@/server/services/studio";

/**
 * POST /api/studio/seen
 *
 * Stamps "the studio saw you just now". Called by the client once the
 * greeting has already been rendered from the *previous* value — so the
 * narrator can say "six days away" and only then start the new clock.
 *
 * Server-side because the absence has to be true on a device you've never
 * opened before; localStorage greeted a month-long absence as a first night.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, userId, "write");
    if (limited) return limited;

    await touchLastSeen(userId);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleRouteError(error, "POST /api/studio/seen", "Failed to record the visit");
  }
}
