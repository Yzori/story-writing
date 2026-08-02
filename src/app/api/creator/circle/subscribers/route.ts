import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { circleSubscriptions, users } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

// GET — list subscribers to current user's circle
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
        startedAt: circleSubscriptions.startedAt,
        renewalDate: circleSubscriptions.renewalDate,
        priceAtSubscription: circleSubscriptions.priceAtSubscription,
        reader: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(circleSubscriptions)
      .innerJoin(users, eq(circleSubscriptions.readerId, users.id))
      .where(eq(circleSubscriptions.creatorId, session.user.id))
      .orderBy(desc(circleSubscriptions.startedAt))
      .limit(100);

    return NextResponse.json({ subscribers: subs });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/creator/circle/subscribers",
      "Failed to fetch subscribers",
    );
  }
}
