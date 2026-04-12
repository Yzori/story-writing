import "server-only";
import { db } from "@/server/db";
import {
  circleSubscriptions,
  creatorCircles,
  users,
  inkDropTransactions,
  commissions,
  offerings,
} from "@/server/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { createNotification } from "./notifications";

/**
 * Process Circle subscription renewals.
 * Finds all active subscriptions past their renewal date,
 * attempts to charge the reader, and lapses if insufficient balance.
 */
export async function processCircleRenewals(): Promise<{
  renewed: number;
  lapsed: number;
  errors: number;
}> {
  let renewed = 0;
  let lapsed = 0;
  let errors = 0;

  try {
    // Find subscriptions due for renewal
    const dueSubs = await db
      .select()
      .from(circleSubscriptions)
      .where(
        and(
          eq(circleSubscriptions.status, "active"),
          lte(circleSubscriptions.renewalDate, new Date())
        )
      )
      .limit(100); // Process in batches

    for (const sub of dueSubs) {
      try {
        const price = sub.priceAtSubscription;
        const creatorShare = Math.floor(price * 0.7);

        const result = await db.transaction(async (tx) => {
          // Lock reader row and check balance
          const [reader] = await tx.execute(
            sql`SELECT ink_drop_balance FROM users WHERE id = ${sub.readerId} FOR UPDATE`
          );
          const balance = Number((reader as any)?.ink_drop_balance ?? 0);

          if (balance < price) {
            // Insufficient balance — lapse the subscription
            await tx
              .update(circleSubscriptions)
              .set({ status: "lapsed" })
              .where(eq(circleSubscriptions.id, sub.id));

            return { status: "lapsed" as const };
          }

          // Debit reader
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${price} WHERE id = ${sub.readerId}`
          );

          // Credit creator (70%)
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${sub.creatorId}`
          );

          // Log transaction
          await tx.insert(inkDropTransactions).values({
            fromUserId: sub.readerId,
            toUserId: sub.creatorId,
            amount: price,
            type: "circle",
            message: "Circle subscription renewal — Confidant tier",
          });

          // Set next renewal date (30 days from now)
          const nextRenewal = new Date();
          nextRenewal.setDate(nextRenewal.getDate() + 30);

          await tx
            .update(circleSubscriptions)
            .set({ renewalDate: nextRenewal })
            .where(eq(circleSubscriptions.id, sub.id));

          return { status: "renewed" as const };
        });

        if (result.status === "renewed") {
          renewed++;
        } else {
          lapsed++;
          // Notify reader that their subscription lapsed
          createNotification(
            sub.readerId,
            "circle",
            "Your Circle subscription lapsed due to insufficient Ink Drops. Top up to re-subscribe.",
            "/settings/ink-drops"
          );
          // Notify creator
          createNotification(
            sub.creatorId,
            "circle",
            "A subscriber's Circle membership has lapsed.",
            "/creator/circle"
          );
        }
      } catch (err) {
        console.error(`Failed to process renewal for subscription ${sub.id}:`, err);
        errors++;
      }
    }
  } catch (error) {
    console.error("processCircleRenewals error:", error);
  }

  return { renewed, lapsed, errors };
}

/**
 * Auto-complete commissions that have been in "delivered" status for 7+ days.
 * This protects artisans from unresponsive patrons.
 */
export async function processCommissionAutoComplete(): Promise<{
  completed: number;
  errors: number;
}> {
  let completed = 0;
  let errors = 0;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find delivered commissions older than 7 days
    const staleCommissions = await db
      .select()
      .from(commissions)
      .where(
        and(
          eq(commissions.status, "delivered"),
          lte(commissions.deliveredAt!, sevenDaysAgo)
        )
      )
      .limit(50);

    for (const commission of staleCommissions) {
      try {
        if (!commission.agreedPrice) continue;

        const payout = commission.agreedPrice;
        const creatorShare = Math.floor(payout * 0.7);

        await db.transaction(async (tx) => {
          // Release vault to artisan (70%)
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${commission.artisanId}`
          );

          // Log transaction
          await tx.insert(inkDropTransactions).values({
            fromUserId: commission.patronId,
            toUserId: commission.artisanId,
            amount: payout,
            type: "commission",
            message: "Commission auto-completed after 7 days",
          });

          // Update offering completed count
          await tx.execute(
            sql`UPDATE offerings SET completed_count = completed_count + 1 WHERE id = ${commission.offeringId}`
          );

          await tx
            .update(commissions)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(commissions.id, commission.id));
        });

        // Notify both parties
        createNotification(
          commission.artisanId,
          "circle",
          `Commission auto-completed. ${creatorShare} drops released to you.`,
          `/scriptorium`
        );
        createNotification(
          commission.patronId,
          "circle",
          "A commission was auto-completed after 7 days without response.",
          `/scriptorium`
        );

        completed++;
      } catch (err) {
        console.error(`Failed to auto-complete commission ${commission.id}:`, err);
        errors++;
      }
    }
  } catch (error) {
    console.error("processCommissionAutoComplete error:", error);
  }

  return { completed, errors };
}

/**
 * Reset AI usage counters for all users (runs daily at midnight).
 */
export async function resetAIUsageCounters(): Promise<{
  reset: number;
  errors: number;
}> {
  let reset = 0;
  let errors = 0;

  try {
    // Reset all users with non-free subscription tiers
    const nextReset = new Date();
    nextReset.setHours(24, 0, 0, 0); // Next midnight

    const result = await db
      .update(users)
      .set({
        aiRequestsThisMonth: 0,
        aiRequestsResetAt: nextReset,
      })
      .where(sql`${users.subscriptionTier} != 'free'`)
      .returning({ id: users.id });

    reset = result.length;
  } catch (error) {
    console.error("resetAIUsageCounters error:", error);
    errors = 1;
  }

  return { reset, errors };
}
