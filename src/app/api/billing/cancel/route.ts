import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { stripe } from "@/server/stripe";
import { db } from "@/server/db";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/billing/cancel
 * Cancel a user's subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "write");
    if (limited) return limited;
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        stripeSubscriptionId: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: { message: "No active subscription found" } },
        { status: 400 }
      );
    }

    if (user.subscriptionTier === "free") {
      return NextResponse.json(
        { error: { message: "You don't have a paid subscription" } },
        { status: 400 }
      );
    }

    // Cancel the subscription at period end (not immediately)
    // This allows users to use the service until the end of their billing period
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update database
    await db
      .update(users)
      .set({
        subscriptionStatus: "cancelled",
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: "Subscription cancelled. You'll have access until the end of your billing period.",
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/billing/cancel", "Failed to cancel subscription");
  }
}
