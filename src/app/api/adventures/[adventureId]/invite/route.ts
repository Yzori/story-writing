import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventures } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createSecureToken, sha256Hex } from "@/server/auth-utils";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/invite
 * Mint (or re-mint) the invite link. Owner or Director only. The raw
 * token is returned once and only its hash is stored — same posture
 * as password reset tokens. Re-minting revokes the previous link.
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
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    const isOwner = ctx?.adventure.ownerId === session.user.id;
    const isDirector = ctx?.mySeat?.role === "director";
    if (!ctx || (!isOwner && !isDirector)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (ctx.adventure.status === "finished" || ctx.adventure.status === "abandoned") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "This adventure has ended." } },
        { status: 409 }
      );
    }

    const token = createSecureToken();
    await db
      .update(adventures)
      .set({ inviteTokenHash: await sha256Hex(token), updatedAt: new Date() })
      .where(eq(adventures.id, adventureId));

    return NextResponse.json({
      data: { joinPath: `/adventures/join/${token}` },
    });
  } catch (error) {
    console.error("POST /api/adventures/[adventureId]/invite error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to mint the invite" } },
      { status: 500 }
    );
  }
}
