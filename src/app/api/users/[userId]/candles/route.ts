import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profileCandles, users } from "@/server/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ userId: string }> };

/** A candle burns for 7 days, then gutters out (re-lightable any time). */
const BURN_DAYS = 7;

function burnCutoff(): Date {
  return new Date(Date.now() - BURN_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/users/[userId]/candles
 * The mantel: candles lit for this writer in the last 7 days.
 * Public; includes whether the current visitor's candle is burning.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();
    const cutoff = burnCutoff();

    const [host] = await db
      .select({ profileHearth: users.profileHearth })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!host) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!host.profileHearth) {
      return NextResponse.json({
        data: { enabled: false, count: 0, candles: [], hasLit: false },
      });
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileCandles)
      .where(
        and(
          eq(profileCandles.profileUserId, userId),
          gte(profileCandles.litAt, cutoff)
        )
      );

    const recent = await db
      .select({
        id: profileCandles.id,
        litAt: profileCandles.litAt,
        visitorId: users.id,
        visitorName: users.displayName,
        visitorAvatar: users.avatarUrl,
      })
      .from(profileCandles)
      .innerJoin(users, eq(profileCandles.visitorId, users.id))
      .where(
        and(
          eq(profileCandles.profileUserId, userId),
          gte(profileCandles.litAt, cutoff)
        )
      )
      .orderBy(desc(profileCandles.litAt))
      .limit(14);

    let hasLit = false;
    if (session?.user?.id) {
      const [mine] = await db
        .select({ litAt: profileCandles.litAt })
        .from(profileCandles)
        .where(
          and(
            eq(profileCandles.profileUserId, userId),
            eq(profileCandles.visitorId, session.user.id),
            gte(profileCandles.litAt, cutoff)
          )
        )
        .limit(1);
      hasLit = !!mine;
    }

    return NextResponse.json({
      data: {
        enabled: true,
        count: Number(countRow?.count ?? 0),
        candles: recent.map((c) => ({
          id: c.id,
          litAt: c.litAt,
          visitor: {
            id: c.visitorId,
            displayName: c.visitorName,
            avatarUrl: c.visitorAvatar,
          },
        })),
        hasLit,
      },
    });
  } catch (error) {
    console.error("GET /api/users/[userId]/candles error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch candles" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[userId]/candles
 * Light (or re-light) a candle at this writer's study. Idempotent per
 * visitor — re-lighting refreshes the burn window.
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

    const { userId } = await params;
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You can't light a candle for yourself" } },
        { status: 400 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const [host] = await db
      .select({ profileHearth: users.profileHearth })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!host) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    if (!host.profileHearth) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This writer's hearth is unlit" } },
        { status: 403 }
      );
    }

    // Was this visitor's candle already burning? (Decides whether to notify.)
    const [existing] = await db
      .select({ litAt: profileCandles.litAt })
      .from(profileCandles)
      .where(
        and(
          eq(profileCandles.profileUserId, userId),
          eq(profileCandles.visitorId, session.user.id)
        )
      )
      .limit(1);
    const wasBurning = !!existing && existing.litAt >= burnCutoff();

    await db
      .insert(profileCandles)
      .values({ profileUserId: userId, visitorId: session.user.id })
      .onConflictDoUpdate({
        target: [profileCandles.profileUserId, profileCandles.visitorId],
        set: { litAt: new Date() },
      });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileCandles)
      .where(
        and(
          eq(profileCandles.profileUserId, userId),
          gte(profileCandles.litAt, burnCutoff())
        )
      );

    // Notify only on a fresh lighting, not on a refresh of a burning candle.
    if (!wasBurning) {
      const [visitor] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.user.id));
      createNotification(
        userId,
        "candle",
        `${visitor?.displayName || "A visitor"} lit a candle at your study`,
        `/profile/${userId}`
      );
    }

    return NextResponse.json({
      data: { lit: true, count: Number(countRow?.count ?? 0) },
    });
  } catch (error) {
    console.error("POST /api/users/[userId]/candles error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to light candle" } },
      { status: 500 }
    );
  }
}
