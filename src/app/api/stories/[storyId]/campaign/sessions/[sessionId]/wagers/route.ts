import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, campaignWagerHolds, campaignWagers } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createWagerSchema } from "@/lib/validations";
import { deriveAudienceKey, verifyPublicSession } from "@/server/services/audience-input";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

const MAX_WAGERS_PER_USER = 3;

/**
 * The audience's wagers — short predictions pinned at the rim of the dark
 * before a session begins. Glory, never gold: no payout, and no author
 * names ever leave the server (the room shows only content + held count).
 * Begin seals the book: writing and holding are draft-only; the Director
 * settles slips at session end (which came true stamps gold).
 */

async function listWagers(
  sessionId: string,
  currentUserId: string | null,
  holdKey: string | null,
) {
  const rows = await db
    .select({
      id: campaignWagers.id,
      content: campaignWagers.content,
      status: campaignWagers.status,
      userId: campaignWagers.userId,
      createdAt: campaignWagers.createdAt,
      holdCount: sql<number>`coalesce(count(${campaignWagerHolds.id}), 0)::int`,
      myHold: holdKey
        ? sql<number>`coalesce(sum(case when ${campaignWagerHolds.token} = ${holdKey} then 1 else 0 end), 0)::int`
        : sql<number>`0`,
    })
    .from(campaignWagers)
    .leftJoin(campaignWagerHolds, eq(campaignWagerHolds.wagerId, campaignWagers.id))
    .where(eq(campaignWagers.sessionId, sessionId))
    .groupBy(campaignWagers.id)
    .orderBy(asc(campaignWagers.createdAt));

  // The author's identity stays server-side — only "is it mine" crosses.
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    holdCount: Number(row.holdCount ?? 0),
    isMine: !!currentUserId && row.userId === currentUserId,
    myHold: Number(row.myHold ?? 0) > 0,
  }));
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 120, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const token = request.nextUrl.searchParams.get("token");
    const holdKey = token ? deriveAudienceKey(request, token) : null;
    const session = await auth();

    return NextResponse.json({
      data: await listWagers(sessionId, session?.user?.id ?? null, holdKey),
    });
  } catch (error) {
    console.error("GET /api/.../wagers error:", error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to leave a wager" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 10,
      windowSeconds: 3600,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }
    if (campaignSession.status !== "draft") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "The book is sealed — wagers close when the session begins" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createWagerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const [mineCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignWagers)
      .where(
        and(
          eq(campaignWagers.sessionId, sessionId),
          eq(campaignWagers.userId, session.user.id),
        ),
      );
    if (Number(mineCount?.count ?? 0) >= MAX_WAGERS_PER_USER) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Three slips is plenty" } },
        { status: 403 },
      );
    }

    await db.insert(campaignWagers).values({
      sessionId,
      storyId,
      userId: session.user.id,
      content: parsed.data.content.trim(),
    });

    return NextResponse.json(
      { data: await listWagers(sessionId, session.user.id, null) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/.../wagers error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to pin the wager" } },
      { status: 500 },
    );
  }
}
