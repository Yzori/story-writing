import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, campaignWagerHolds, campaignWagers } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createWagerHoldSchema } from "@/lib/validations";
import { deriveAudienceKey, verifyPublicSession } from "@/server/services/audience-input";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string; wagerId: string }>;
};

/**
 * POST /api/.../wagers/[wagerId]/holds — hold someone's wager (+1). One tap,
 * anonymous (token-keyed like audience pulses), no unhold. Draft only —
 * begin seals the book.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "write", { max: 30, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId, wagerId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const [campaignSession, wager] = await Promise.all([
      db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) }),
      db.query.campaignWagers.findFirst({
        where: and(eq(campaignWagers.id, wagerId), eq(campaignWagers.sessionId, sessionId)),
      }),
    ]);
    if (!campaignSession || campaignSession.storyId !== storyId || !wager) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Wager not found" } },
        { status: 404 },
      );
    }
    if (campaignSession.status !== "draft") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "The book is sealed — holds close when the session begins" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createWagerHoldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const session = await auth();
    await db
      .insert(campaignWagerHolds)
      .values({
        wagerId,
        token: deriveAudienceKey(request, parsed.data.token),
        userId: session?.user?.id ?? null,
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/.../wagers/[wagerId]/holds error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to hold the wager" } },
      { status: 500 },
    );
  }
}
