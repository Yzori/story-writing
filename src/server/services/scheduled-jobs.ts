import "server-only";
import { db } from "@/server/db";
import {
  circleSubscriptions,
  creatorCircles,
  users,
  inkDropTransactions,
  commissions,
  offerings,
  notifications,
} from "@/server/db/schema";
import { eq, and, lte, sql, isNull, inArray, gte, or } from "drizzle-orm";
import { createNotification } from "./notifications";
import { sendEmail, digestEmail, type DigestItem } from "./email";

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
          const balance = Number((reader as { ink_drop_balance?: number | string } | undefined)?.ink_drop_balance ?? 0);

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
          `/commissions`
        );
        createNotification(
          commission.patronId,
          "circle",
          "A commission was auto-completed after 7 days without response.",
          `/commissions`
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

const APP_URL = process.env.NEXTAUTH_URL || "https://quiloria.app";
const DAILY_INTERVAL_MS = 23 * 60 * 60 * 1000;
const WEEKLY_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Process email digests for users in daily/weekly mode.
 *
 * For each eligible user:
 * - Fetch unemailed notifications (emailed_at IS NULL) since their last digest
 * - If any exist, send a single digest email
 * - Mark all included notifications as emailed
 * - Stamp last_digest_sent_at on the user
 *
 * Run this hourly via your cron platform — the function self-rate-limits via
 * lastDigestSentAt so it's safe to run more often than the cadence.
 */
export async function processEmailDigests(): Promise<{
  daily: number;
  weekly: number;
  itemsSent: number;
  errors: number;
}> {
  let dailyCount = 0;
  let weeklyCount = 0;
  let itemsSent = 0;
  let errors = 0;
  const now = new Date();

  for (const cadence of ["daily", "weekly"] as const) {
    const intervalMs = cadence === "daily" ? DAILY_INTERVAL_MS : WEEKLY_INTERVAL_MS;
    const cutoff = new Date(now.getTime() - intervalMs);

    try {
      const eligible = await db
        .select({
          id: users.id,
          email: users.email,
          lastDigestSentAt: users.lastDigestSentAt,
        })
        .from(users)
        .where(
          and(
            eq(users.emailDigestMode, cadence),
            eq(users.emailNotifications, true),
            // user has never had a digest, or last digest was at least one
            // interval ago — `or` is imported from drizzle-orm
            or(
              isNull(users.lastDigestSentAt),
              lte(users.lastDigestSentAt, cutoff),
            ),
          ),
        );

      for (const user of eligible) {
        if (!user.email) continue;
        try {
          const pending = await db
            .select({
              id: notifications.id,
              type: notifications.type,
              message: notifications.message,
              href: notifications.href,
            })
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, user.id),
                isNull(notifications.emailedAt),
                gte(notifications.createdAt, cutoff),
              ),
            )
            .limit(50);

          if (pending.length === 0) {
            // Nothing to send — still update lastDigestSentAt so we don't
            // re-scan this user every hour.
            await db
              .update(users)
              .set({ lastDigestSentAt: now })
              .where(eq(users.id, user.id));
            continue;
          }

          const items: DigestItem[] = pending.map((p) => ({
            type: p.type,
            message: p.message,
            href: p.href.startsWith("http") ? p.href : `${APP_URL}${p.href}`,
          }));

          const tpl = digestEmail(items, cadence);
          await sendEmail(user.email, tpl.subject, tpl.html, user.id);

          await db
            .update(notifications)
            .set({ emailedAt: now })
            .where(
              inArray(
                notifications.id,
                pending.map((p) => p.id),
              ),
            );

          await db
            .update(users)
            .set({ lastDigestSentAt: now })
            .where(eq(users.id, user.id));

          itemsSent += pending.length;
          if (cadence === "daily") dailyCount++;
          else weeklyCount++;
        } catch (err) {
          console.error(`processEmailDigests user ${user.id} error:`, err);
          errors++;
        }
      }
    } catch (err) {
      console.error(`processEmailDigests ${cadence} sweep error:`, err);
      errors++;
    }
  }

  return { daily: dailyCount, weekly: weeklyCount, itemsSent, errors };
}
