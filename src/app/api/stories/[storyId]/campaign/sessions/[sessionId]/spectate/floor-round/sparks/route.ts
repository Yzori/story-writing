import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignFloorAudienceSparks, campaignFloorRounds, campaignSessions, stories } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createFloorAudienceSparkSchema } from "@/lib/validations";
import { transferDrops } from "@/server/services/ink-drops";
import { getOpenAudienceSparkFloorRound } from "@/server/services/floor-rounds";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

// Thrown inside the transaction so the spark insert is rolled back when the
// Ink Drop transfer fails — a committed-but-unpaid spark would otherwise sit
// in the GM's queue and permanently block the (round, token) slot.
class InsufficientBalanceError extends Error {
  constructor(public balance: number) {
    super("INSUFFICIENT_BALANCE");
  }
}

function deriveSparkKey(request: NextRequest, rawToken: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ua = request.headers.get("user-agent") ?? "";
  return createHash("sha256")
    .update(`${rawToken.trim()}|${ip}|${ua}`)
    .digest("hex");
}

async function getPublicStorySession(storyId: string, sessionId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.isPublic, true), isNull(stories.deletedAt)),
  });
  if (!story) return null;

  const campaignSession = await db.query.campaignSessions.findFirst({
    where: and(eq(campaignSessions.id, sessionId), eq(campaignSessions.storyId, storyId)),
  });
  if (!campaignSession) return null;
  return { story, campaignSession };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ data: null });
    }

    const { storyId, sessionId } = await params;
    if (!(await getPublicStorySession(storyId, sessionId))) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    return NextResponse.json({
      data: await getOpenAudienceSparkFloorRound(sessionId, session.user.id),
    });
  } catch (error) {
    console.error("GET /api/.../spectate/floor-round/sparks error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch Audience Sparks" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to send an Audience Spark" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write", { max: 6, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const verified = await getPublicStorySession(storyId, sessionId);
    if (!verified) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createFloorAudienceSparkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const round = await db.query.campaignFloorRounds.findFirst({
      where: and(
        eq(campaignFloorRounds.sessionId, sessionId),
        eq(campaignFloorRounds.mode, "vote"),
        eq(campaignFloorRounds.status, "open"),
      ),
    });
    if (!round) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Audience Sparks are only open while vote options are being collected" } }, { status: 403 });
    }

    const sparkKey = deriveSparkKey(request, parsed.data.token);
    let result: { duplicate: true } | { success: true; newBalance: number };
    try {
      result = await db.transaction(async (tx) => {
        // Insert first with conflict guard — if a row already exists for
        // (round, token) we must NOT debit a second time.
        const inserted = await tx
          .insert(campaignFloorAudienceSparks)
          .values({
            roundId: round.id,
            token: sparkKey,
            userId: session.user.id,
            content: parsed.data.content.trim(),
            amount: parsed.data.amount,
          })
          .onConflictDoNothing({
            target: [campaignFloorAudienceSparks.roundId, campaignFloorAudienceSparks.token],
          })
          .returning({ id: campaignFloorAudienceSparks.id });

        if (inserted.length === 0) {
          return { duplicate: true as const };
        }

        const transfer = await transferDrops(tx, {
          fromUserId: session.user.id,
          toUserId: verified.story.userId,
          amount: parsed.data.amount,
          type: "audience_spark",
          sessionId,
          message: `Audience Spark: ${parsed.data.content.trim().slice(0, 180)}`,
        });
        if ("error" in transfer) {
          // Throw to roll back the spark insert — the spectator keeps a
          // clean slate and can retry once they top up.
          throw new InsufficientBalanceError(transfer.balance);
        }

        return transfer;
      });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return NextResponse.json(
          { error: { code: "INSUFFICIENT_BALANCE", message: "Not enough Ink Drops", balance: error.balance } },
          { status: 400 },
        );
      }
      throw error;
    }

    if ("duplicate" in result) {
      return NextResponse.json({
        data: await getOpenAudienceSparkFloorRound(sessionId, session.user.id),
        duplicate: true,
      });
    }

    return NextResponse.json({
      data: await getOpenAudienceSparkFloorRound(sessionId, session.user.id),
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("POST /api/.../spectate/floor-round/sparks error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to send Audience Spark" } }, { status: 500 });
  }
}
