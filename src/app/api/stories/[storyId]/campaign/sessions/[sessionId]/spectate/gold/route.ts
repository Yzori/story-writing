import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  campaignSessions,
  campaignTurns,
  campaignGold,
  playerCharacters,
  users,
} from "@/server/db/schema";
import { eq, and, gt, isNull, isNotNull, sql } from "drizzle-orm";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { houseGoldSchema } from "@/lib/validations";
import { isStoryTurnType } from "@/lib/campaign-turns";
import { auth } from "@/server/auth";
import { createNotification } from "@/server/services/notifications";
import { distributeEarnings } from "@/server/services/ink-drops";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * The House's one gesture: give gold, make light.
 *
 * POST leaves gold — for the whole table, or on one line (turnId), which
 * sets that line in gold. The gross amount splits evenly across the cast
 * (Director + players); each share is paid at the standard creator rate.
 * Gold never votes and never buys an outcome; the room shows the shimmer
 * and the flare, never amounts or names.
 */

async function verifyPublicSession(storyId: string, sessionId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story || !story.isPublic) return { error: "STORY" as const };

  const campaignSession = await db.query.campaignSessions.findFirst({
    where: and(
      eq(campaignSessions.id, sessionId),
      eq(campaignSessions.storyId, storyId)
    ),
  });
  if (!campaignSession) return { error: "SESSION" as const };
  return { story, campaignSession };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 10,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const body = await request.json();
    const { amount, turnId } = houseGoldSchema.parse(body);

    const checked = await verifyPublicSession(storyId, sessionId);
    if ("error" in checked) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }
    const { story, campaignSession } = checked;

    if (campaignSession.status !== "active") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Gold can only be left while the session is live",
          },
        },
        { status: 400 }
      );
    }

    // A gilded line must be real story ink in this session — set lines,
    // slips, and other sessions' pages can't take gold leaf.
    if (turnId) {
      const turn = await db.query.campaignTurns.findFirst({
        where: and(
          eq(campaignTurns.id, turnId),
          eq(campaignTurns.sessionId, sessionId)
        ),
        columns: { id: true, type: true },
      });
      if (!turn || !isStoryTurnType(turn.type)) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "That line can't be set in gold" } },
          { status: 400 }
        );
      }
    }

    // The cast at this table: the Director plus every active player.
    const cast = await db
      .select({ userId: playerCharacters.userId })
      .from(playerCharacters)
      .where(
        and(
          eq(playerCharacters.storyId, storyId),
          eq(playerCharacters.status, "active")
        )
      );
    const recipients = [...new Set([story.userId, ...cast.map((c) => c.userId)])];

    if (recipients.includes(session.user.id)) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "The cast can't leave gold at their own table",
          },
        },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [sender] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, session.user.id))
        .for("update");

      if (!sender || sender.inkDropBalance < amount) {
        return { error: "INSUFFICIENT_BALANCE" as const };
      }

      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} - ${amount}` })
        .where(eq(users.id, session.user.id));

      // Gold honors the story's signed agreement when one is active; with no
      // agreement it falls back to an even split across the cast (remainder to
      // the Director). Either way each share pays out at the standard rate, so
      // the earnings ledger reads gold rows exactly like tips and gifts.
      const { shares } = await distributeEarnings(tx, {
        storyId,
        ownerId: story.userId,
        fromUserId: session.user.id,
        gross: amount,
        type: "gold",
        message: turnId ? "a line set in gold" : null,
        sessionId,
        fallbackRecipients: recipients,
      });

      const [gold] = await tx
        .insert(campaignGold)
        .values({
          sessionId,
          storyId,
          turnId: turnId ?? null,
          fromUserId: session.user.id,
          amount,
        })
        .returning();

      const [updated] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, session.user.id));

      return { newBalance: updated.inkDropBalance, goldId: gold.id, shares };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_BALANCE", message: "Not enough Ink Drops" } },
        { status: 400 }
      );
    }

    // Fire-and-forget: the cast learns the house left gold. No sender name —
    // gold from the dark is anonymous light.
    for (const share of result.shares) {
      if (share.credited <= 0) continue;
      createNotification(
        share.userId,
        "tip",
        turnId
          ? `The audience set a line in gold in "${campaignSession.title}" — ${share.credited} Ink Drops to you`
          : `The audience left gold at the table in "${campaignSession.title}" — ${share.credited} Ink Drops to you`,
        `/campaign/${storyId}/watch/${sessionId}`
      );
    }

    return NextResponse.json({
      ok: true,
      newBalance: result.newBalance,
      goldId: result.goldId,
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/gold",
      "Failed to leave gold",
    );
  }
}

/**
 * GET — the light in the room, for anyone's eyes: which lines are gilded
 * (ids only, no amounts) and recent gestures since ?after (for the flare).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const checked = await verifyPublicSession(storyId, sessionId);
    if ("error" in checked) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const afterParam = url.searchParams.get("after");
    const after = afterParam
      ? new Date(afterParam)
      : new Date(Date.now() - 30_000);

    const [gildedRows, recent] = await Promise.all([
      db
        .selectDistinct({ turnId: campaignGold.turnId })
        .from(campaignGold)
        .where(
          and(eq(campaignGold.sessionId, sessionId), isNotNull(campaignGold.turnId))
        ),
      db
        .select({
          id: campaignGold.id,
          turnId: campaignGold.turnId,
          createdAt: campaignGold.createdAt,
        })
        .from(campaignGold)
        .where(
          and(
            eq(campaignGold.sessionId, sessionId),
            gt(campaignGold.createdAt, after)
          )
        )
        .orderBy(campaignGold.createdAt)
        .limit(50),
    ]);

    return NextResponse.json({
      data: {
        gildedTurnIds: gildedRows.map((r) => r.turnId).filter(Boolean),
        recent,
      },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/gold",
      "Failed to fetch the light",
    );
  }
}
