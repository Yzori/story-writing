import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { circleSubscriptions, users } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

// GET — list current user's active circle subscriptions
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

    const subs = await db
      .select({
        id: circleSubscriptions.id,
        tier: circleSubscriptions.tier,
        status: circleSubscriptions.status,
        priceAtSubscription: circleSubscriptions.priceAtSubscription,
        startedAt: circleSubscriptions.startedAt,
        renewalDate: circleSubscriptions.renewalDate,
        creator: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(circleSubscriptions)
      .innerJoin(users, eq(circleSubscriptions.creatorId, users.id))
      .where(eq(circleSubscriptions.readerId, session.user.id))
      .orderBy(desc(circleSubscriptions.startedAt))
      .limit(50);

    return NextResponse.json({ subscriptions: subs });
  } catch (error) {
    console.error("GET /api/circles/subscriptions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch subscriptions" } },
      { status: 500 }
    );
  }
}
