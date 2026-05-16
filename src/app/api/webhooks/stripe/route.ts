import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/server/stripe";
import { db } from "@/server/db";
import { inkDropTransactions, users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: You must configure this webhook in your Stripe Dashboard:
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/stripe
 * 3. Select events: checkout.session.completed, customer.subscription.updated,
 *    customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
 * 4. Copy the signing secret and add it to .env as STRIPE_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: { message: "No signature" } }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: { message: "Invalid signature" } }, { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { error: { message: "Webhook handler failed" } },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * This fires when a user successfully completes checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    await handleInkDropCheckoutCompleted(session);
    return;
  }

  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as "pro" | "premium";

  if (!userId || !tier) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const subscriptionId = session.subscription as string;

  // Fetch the subscription to get the end date
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Calculate trial end or subscription end
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;
  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Update user in database
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: subscription.status === "trialing" ? "trialing" : "active",
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: session.customer as string,
      subscriptionEndsAt: periodEnd,
      trialEndsAt: trialEnd,
      aiRequestsThisMonth: 0, // Reset AI usage on new subscription
    })
    .where(eq(users.id, userId));

  console.log(`User ${userId} subscribed to ${tier}`);
}

/**
 * Handle one-time Ink Drop purchases.
 */
async function handleInkDropCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const dropAmount = Number(session.metadata?.dropAmount ?? 0);

  if (!userId || !Number.isInteger(dropAmount) || dropAmount <= 0) {
    console.error("Missing or invalid Ink Drop metadata in checkout session:", session.id);
    return;
  }

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(inkDropTransactions)
      .values({
        fromUserId: null,
        toUserId: userId,
        amount: dropAmount,
        type: "purchase",
        message: `Purchased ${dropAmount} Ink Drops`,
        stripeSessionId: session.id,
      })
      .onConflictDoNothing()
      .returning({ id: inkDropTransactions.id });

    if (inserted.length === 0) {
      console.log(`Ink Drop purchase already processed for session ${session.id}`);
      return;
    }

    await tx
      .update(users)
      .set({
        inkDropBalance: sql`${users.inkDropBalance} + ${dropAmount}`,
      })
      .where(eq(users.id, userId));
  });

  console.log(`Credited ${dropAmount} Ink Drops to user ${userId}`);
}

/**
 * Handle customer.subscription.updated
 * This fires when a subscription is updated (plan change, cancellation, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata:", subscription.id);
    return;
  }

  const tier = subscription.metadata?.tier as "pro" | "premium" | undefined;
  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Determine subscription status
  let status: string = subscription.status;
  if (subscription.cancel_at_period_end) {
    status = "cancelled";
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      subscriptionEndsAt: periodEnd,
      ...(tier && { subscriptionTier: tier }),
    })
    .where(eq(users.id, userId));

  console.log(`Subscription updated for user ${userId}: ${status}`);
}

/**
 * Handle customer.subscription.deleted
 * This fires when a subscription is cancelled/deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata:", subscription.id);
    return;
  }

  // Downgrade user to free tier
  await db
    .update(users)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "active",
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
      aiRequestsThisMonth: 0,
    })
    .where(eq(users.id, userId));

  console.log(`Subscription deleted for user ${userId}, downgraded to free`);
}

/**
 * Handle invoice.payment_succeeded
 * This fires when a payment succeeds (recurring billing)
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata:", subscription.id);
    return;
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Update subscription status and end date
  await db
    .update(users)
    .set({
      subscriptionStatus: "active",
      subscriptionEndsAt: periodEnd,
    })
    .where(eq(users.id, userId));

  console.log(`Payment succeeded for user ${userId}`);
}

/**
 * Handle invoice.payment_failed
 * This fires when a payment fails
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata:", subscription.id);
    return;
  }

  // Mark subscription as past_due
  await db
    .update(users)
    .set({
      subscriptionStatus: "past_due",
    })
    .where(eq(users.id, userId));

  console.log(`Payment failed for user ${userId}, marked as past_due`);

  // TODO: Send email notification to user about failed payment
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const periodEnd = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  return new Date((periodEnd ?? Math.floor(Date.now() / 1000)) * 1000);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (invoice as unknown as { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (typeof legacySubscription === "string") return legacySubscription;
  if (legacySubscription?.id) return legacySubscription.id;

  const parentSubscription = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  }).parent?.subscription_details?.subscription;
  return parentSubscription ?? null;
}
