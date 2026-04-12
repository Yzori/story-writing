import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { stripe, getStripePriceId, type BillingInterval } from "@/server/stripe";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/billing/subscribe
 * Create a Stripe Checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const { tier, interval } = body as { tier: "pro" | "premium"; interval: BillingInterval };

    // Validate input
    if (!tier || !interval) {
      return NextResponse.json(
        { error: { message: "Missing tier or interval" } },
        { status: 400 }
      );
    }

    if (tier !== "pro" && tier !== "premium") {
      return NextResponse.json(
        { error: { message: "Invalid tier. Must be 'pro' or 'premium'" } },
        { status: 400 }
      );
    }

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json(
        { error: { message: "Invalid interval. Must be 'monthly' or 'yearly'" } },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
    }

    // Check if user already has this tier
    if (user.subscriptionTier === tier) {
      return NextResponse.json(
        { error: { message: `You already have a ${tier} subscription` } },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }

    // Get the price ID for the selected tier and interval
    const priceId = getStripePriceId(tier, interval);

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
      // Optional: Add a trial period
      // subscription_data: {
      //   trial_period_days: 7,
      // },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: { message: "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
