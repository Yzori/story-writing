import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { inkDropTransactions, users } from "@/server/db/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

/**
 * GET /api/user/earnings
 * Returns creator earnings stats and recent tip history.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "read");
    if (rl) return rl;

    const userId = session.user.id;

    // Aggregate stats
    const [stats] = await db
      .select({
        totalEarned: sql<number>`coalesce(sum(${inkDropTransactions.amount}), 0)`,
        tipCount: sql<number>`count(*)`,
      })
      .from(inkDropTransactions)
      .where(
        and(
          eq(inkDropTransactions.toUserId, userId),
          inArray(inkDropTransactions.type, ["tip", "unlock", "circle", "commission", "donation", "crossroads"])
        )
      );

    // This month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthStats] = await db
      .select({
        tipsThisMonth: sql<number>`coalesce(sum(${inkDropTransactions.amount}), 0)`,
      })
      .from(inkDropTransactions)
      .where(
        and(
          eq(inkDropTransactions.toUserId, userId),
          inArray(inkDropTransactions.type, ["tip", "unlock", "circle", "commission", "donation", "crossroads"]),
          gte(inkDropTransactions.createdAt, monthStart)
        )
      );

    // Top supporter (by total drops sent to this user)
    const [topSupporter] = await db
      .select({
        userId: inkDropTransactions.fromUserId,
        displayName: users.displayName,
        name: users.name,
        totalSent: sql<number>`sum(${inkDropTransactions.amount})`,
      })
      .from(inkDropTransactions)
      .leftJoin(users, eq(inkDropTransactions.fromUserId, users.id))
      .where(
        and(
          eq(inkDropTransactions.toUserId, userId),
          inArray(inkDropTransactions.type, ["tip", "unlock", "circle", "commission", "donation", "crossroads"])
        )
      )
      .groupBy(inkDropTransactions.fromUserId, users.displayName, users.name)
      .orderBy(sql`sum(${inkDropTransactions.amount}) desc`)
      .limit(1);

    // Recent tips (last 30)
    const recentTips = await db
      .select({
        id: inkDropTransactions.id,
        fromDisplayName: users.displayName,
        fromName: users.name,
        amount: inkDropTransactions.amount,
        message: inkDropTransactions.message,
        type: inkDropTransactions.type,
        createdAt: inkDropTransactions.createdAt,
      })
      .from(inkDropTransactions)
      .leftJoin(users, eq(inkDropTransactions.fromUserId, users.id))
      .where(
        and(
          eq(inkDropTransactions.toUserId, userId),
          inArray(inkDropTransactions.type, ["tip", "unlock", "circle", "commission", "donation", "crossroads"])
        )
      )
      .orderBy(desc(inkDropTransactions.createdAt))
      .limit(30);

    // Breakdown by source
    const breakdownRows = await db
      .select({
        type: inkDropTransactions.type,
        total: sql<number>`coalesce(sum(${inkDropTransactions.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(inkDropTransactions)
      .where(
        and(
          eq(inkDropTransactions.toUserId, userId),
          inArray(inkDropTransactions.type, ["tip", "unlock", "circle", "commission", "donation", "crossroads"])
        )
      )
      .groupBy(inkDropTransactions.type);

    const breakdown: Record<string, { total: number; count: number }> = {};
    for (const row of breakdownRows) {
      breakdown[row.type] = { total: Number(row.total), count: Number(row.count) };
    }

    return NextResponse.json({
      totalEarned: Number(stats.totalEarned),
      tipCount: Number(stats.tipCount),
      tipsThisMonth: Number(monthStats.tipsThisMonth),
      breakdown,
      topSupporter: topSupporter?.userId
        ? {
            name: topSupporter.displayName || topSupporter.name || "Anonymous",
            totalSent: Number(topSupporter.totalSent),
          }
        : null,
      recentTips: recentTips.map((t) => ({
        id: t.id,
        from: t.fromDisplayName || t.fromName || "Anonymous",
        amount: t.amount,
        message: t.message,
        type: (t as any).type,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET earnings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch earnings" } },
      { status: 500 }
    );
  }
}
