import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { creatorCircles, circleSubscriptions, users } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

// GET — public circle info for a creator
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    // Key the limiter on the CALLER, never the path param — keying on
    // creatorId let anyone burn a victim's global read budget by
    // hammering their circle URL.
    const session = await auth();
    const rl = applyRateLimit(request, session?.user?.id, "read");
    if (rl) return rl;

    const [circle] = await db
      .select()
      .from(creatorCircles)
      .where(and(eq(creatorCircles.creatorId, creatorId), eq(creatorCircles.isActive, true)));

    if (!circle) {
      return NextResponse.json({ circle: null, subscriberCount: 0, isSubscribed: false });
    }

    // Get subscriber count
    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(circleSubscriptions)
      .where(
        and(
          eq(circleSubscriptions.creatorId, creatorId),
          eq(circleSubscriptions.status, "active")
        )
      );

    // Get creator info
    const [creator] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, creatorId));

    // Check if current user is subscribed
    let isSubscribed = false;
    let subscription = null;
    if (session?.user?.id) {
      const [sub] = await db
        .select()
        .from(circleSubscriptions)
        .where(
          and(
            eq(circleSubscriptions.readerId, session.user.id),
            eq(circleSubscriptions.creatorId, creatorId),
            eq(circleSubscriptions.status, "active")
          )
        );
      if (sub) {
        isSubscribed = true;
        subscription = sub;
      }
    }

    return NextResponse.json({
      circle,
      creator,
      subscriberCount: Number(stats?.count ?? 0),
      isSubscribed,
      subscription,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/circles/[creatorId]", "Failed to fetch circle");
  }
}
