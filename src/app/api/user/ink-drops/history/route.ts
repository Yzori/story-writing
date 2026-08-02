import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { inkDropTransactions } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/user/ink-drops/history
 * Returns the authenticated user's purchase history (type = 'purchase').
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

    const rows = await db
      .select({
        amount: inkDropTransactions.amount,
        createdAt: inkDropTransactions.createdAt,
      })
      .from(inkDropTransactions)
      .where(
        and(
          eq(inkDropTransactions.toUserId, session.user.id),
          eq(inkDropTransactions.type, "purchase")
        )
      )
      .orderBy(desc(inkDropTransactions.createdAt))
      .limit(20);

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/ink-drops/history", "Failed to fetch history");
  }
}
