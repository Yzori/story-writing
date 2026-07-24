import "server-only";
import { db } from "@/server/db";
import {
  circleSubscriptions,
  users,
  inkDropTransactions,
  commissions,
  notifications,
  campaignSessions,
  campaignTurns,
  campaignCastPresence,
  stories,
  adventures,
  adventureSeats,
} from "@/server/db/schema";
import { eq, and, lte, sql, isNull, inArray, gte, or, desc } from "drizzle-orm";
import { createNotification } from "./notifications";
import { sendEmail, digestEmail, type DigestItem } from "./email";
import { CREATOR_SHARE } from "@/lib/constants";
import { isAbandoned, SESSION_ABANDON_MS } from "@/lib/campaign-stall";
import { compileSessionToChapter } from "./compile-session-to-chapter";
import { compileAdventure } from "./compile-adventure";

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
        const result = await db.transaction(async (tx) => {
          const [lockedSub] = await tx
            .select({
              status: circleSubscriptions.status,
              readerId: circleSubscriptions.readerId,
              creatorId: circleSubscriptions.creatorId,
              price: circleSubscriptions.priceAtSubscription,
              renewalDate: circleSubscriptions.renewalDate,
            })
            .from(circleSubscriptions)
            .where(eq(circleSubscriptions.id, sub.id))
            .for("update");

          if (
            !lockedSub ||
            lockedSub.status !== "active" ||
            lockedSub.renewalDate.getTime() > Date.now()
          ) {
            return { status: "skipped" as const };
          }

          if (!Number.isInteger(lockedSub.price) || lockedSub.price <= 0) {
            throw new Error("Invalid subscription renewal price");
          }

          const creatorShare = Math.floor(lockedSub.price * CREATOR_SHARE);
          const [reader] = await tx.execute(
            sql`SELECT ink_drop_balance FROM users WHERE id = ${lockedSub.readerId} FOR UPDATE`
          );
          const balance = Number((reader as { ink_drop_balance?: number | string } | undefined)?.ink_drop_balance ?? 0);

          if (balance < lockedSub.price) {
            await tx
              .update(circleSubscriptions)
              .set({ status: "lapsed" })
              .where(eq(circleSubscriptions.id, sub.id));

            return {
              status: "lapsed" as const,
              readerId: lockedSub.readerId,
              creatorId: lockedSub.creatorId,
            };
          }

          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${lockedSub.price} WHERE id = ${lockedSub.readerId}`
          );
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${lockedSub.creatorId}`
          );

          await tx.insert(inkDropTransactions).values({
            fromUserId: lockedSub.readerId,
            toUserId: lockedSub.creatorId,
            amount: lockedSub.price,
            type: "circle",
            message: "Circle subscription renewal — Confidant tier",
          });

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
        } else if (result.status === "lapsed") {
          lapsed++;
          createNotification(
            result.readerId,
            "circle",
            "Your Circle subscription lapsed due to insufficient Ink Drops. Top up to re-subscribe.",
            "/settings/ink-drops"
          );
          createNotification(
            result.creatorId,
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
        const result = await db.transaction(async (tx) => {
          const [lockedCommission] = await tx
            .select({
              status: commissions.status,
              deliveredAt: commissions.deliveredAt,
              agreedPrice: commissions.agreedPrice,
              artisanId: commissions.artisanId,
              patronId: commissions.patronId,
              offeringId: commissions.offeringId,
            })
            .from(commissions)
            .where(eq(commissions.id, commission.id))
            .for("update");

          if (
            !lockedCommission ||
            lockedCommission.status !== "delivered" ||
            !lockedCommission.deliveredAt ||
            lockedCommission.deliveredAt > sevenDaysAgo ||
            !Number.isInteger(lockedCommission.agreedPrice) ||
            (lockedCommission.agreedPrice ?? 0) <= 0
          ) {
            return { processed: false as const };
          }

          const payout = lockedCommission.agreedPrice as number;
          const creatorShare = Math.floor(payout * CREATOR_SHARE);

          await tx
            .update(commissions)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(commissions.id, commission.id));

          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${lockedCommission.artisanId}`
          );

          await tx.insert(inkDropTransactions).values({
            fromUserId: lockedCommission.patronId,
            toUserId: lockedCommission.artisanId,
            amount: payout,
            type: "commission",
            message: "Commission auto-completed after 7 days",
          });

          await tx.execute(
            sql`UPDATE offerings SET completed_count = completed_count + 1 WHERE id = ${lockedCommission.offeringId}`
          );

          return {
            processed: true as const,
            artisanId: lockedCommission.artisanId,
            patronId: lockedCommission.patronId,
            creatorShare,
          };
        });

        if (!result.processed) continue;

        createNotification(
          result.artisanId,
          "circle",
          `Commission auto-completed. ${result.creatorShare} drops released to you.`,
          `/commissions`
        );
        createNotification(
          result.patronId,
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
          // Claim the user BEFORE sending: the conditional update only
          // succeeds if lastDigestSentAt is still what we read, so two
          // overlapping cron runs can't both email the same user. If the
          // send below then fails, the digest waits one interval — cheaper
          // than duplicates.
          const [claimed] = await db
            .update(users)
            .set({ lastDigestSentAt: now })
            .where(
              and(
                eq(users.id, user.id),
                user.lastDigestSentAt === null
                  ? isNull(users.lastDigestSentAt)
                  : eq(users.lastDigestSentAt, user.lastDigestSentAt),
              ),
            )
            .returning({ id: users.id });

          if (!claimed) continue;

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

          if (pending.length === 0) continue;

          const items: DigestItem[] = pending.map((p) => ({
            type: p.type,
            message: p.message,
            href: p.href.startsWith("http") ? p.href : `${APP_URL}${p.href}`,
          }));

          // Mark items as emailed under the claim before the actual send so
          // a concurrent run's pending-query can't pick them up again.
          await db
            .update(notifications)
            .set({ emailedAt: now })
            .where(
              inArray(
                notifications.id,
                pending.map((p) => p.id),
              ),
            );

          const tpl = digestEmail(items, cadence);
          await sendEmail(user.email, tpl.subject, tpl.html, user.id);

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

/**
 * Closure guarantee (anti-stall Slice C). Sweep live campaign sessions that
 * have been abandoned — nothing has happened and nobody has a heartbeat for
 * the whole abandon window — and seal them: flip active → completed and
 * compile whatever story exists into a DRAFT chapter. A ghosted session must
 * never rot in `active` forever; the makers leave with the book even when the
 * room went dark. Nothing is generated and nothing is published — this only
 * closes rooms and saves drafts. See ~/.claude/plans/anti-stall-reliability-spec.md.
 */
export async function processCampaignAbandonment(): Promise<{
  sealed: number;
  compiled: number;
  errors: number;
}> {
  let sealed = 0;
  let compiled = 0;
  let errors = 0;

  // Only sessions whose last touch is already past the window are candidates —
  // a cheap pre-filter before we look at each one's heartbeats.
  const cutoff = new Date(Date.now() - SESSION_ABANDON_MS);
  const candidates = await db
    .select()
    .from(campaignSessions)
    .where(
      and(
        eq(campaignSessions.status, "active"),
        lte(campaignSessions.updatedAt, cutoff),
      ),
    );

  for (const session of candidates) {
    try {
      const [lastTurn] = await db
        .select({ createdAt: campaignTurns.createdAt })
        .from(campaignTurns)
        .where(eq(campaignTurns.sessionId, session.id))
        .orderBy(desc(campaignTurns.createdAt))
        .limit(1);

      const [freshest] = await db
        .select({ lastHeartbeat: campaignCastPresence.lastHeartbeat })
        .from(campaignCastPresence)
        .where(eq(campaignCastPresence.sessionId, session.id))
        .orderBy(desc(campaignCastPresence.lastHeartbeat))
        .limit(1);

      const lastEventMs = Math.max(
        lastTurn?.createdAt.getTime() ?? 0,
        session.createdAt.getTime(),
      );
      const abandoned = isAbandoned({
        now: Date.now(),
        lastEventMs,
        lastHeartbeatMs: freshest?.lastHeartbeat.getTime() ?? null,
      });
      if (!abandoned) continue;

      // Seal first (closure), then compile — an empty room still closes even
      // if there is no story to keep. Sealing removes it from the one-active-
      // per-story set, so a fresh session can start cleanly.
      await db
        .update(campaignSessions)
        .set({ status: "completed", closingMood: "sealed-by-quiet", updatedAt: new Date() })
        .where(and(eq(campaignSessions.id, session.id), eq(campaignSessions.status, "active")));
      sealed++;

      const result = await compileSessionToChapter(session.storyId, {
        ...session,
        status: "completed",
      });
      if (result.status === "compiled") compiled++;

      // Tell the maker they weren't stranded: the room went quiet, but the
      // book is saved. Only when there's actually a draft to point them to —
      // an empty abandoned session seals silently. Recipient = whoever was
      // running it (acting GM, else the story owner).
      if (result.status === "compiled" || result.status === "already") {
        const [story] = await db
          .select({ userId: stories.userId })
          .from(stories)
          .where(eq(stories.id, session.storyId))
          .limit(1);
        const recipient = session.actingGmId ?? story?.userId;
        if (recipient) {
          await createNotification(
            recipient,
            "sealed",
            `The table went quiet in "${session.title}" — the session is sealed and your chapter is saved as a draft`,
            `/write/${session.storyId}`,
          );
        }
      }
    } catch (err) {
      console.error(`processCampaignAbandonment session ${session.id} error:`, err);
      errors++;
    }
  }

  return { sealed, compiled, errors };
}

// ── Adventures ("the table") deadlines ──────────────────────

const ADVENTURE_IDLE_ABANDON_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Pace enforcement for Adventures. Overdue spotlight → nudge the
 * holder ("the table is waiting"); past twice the turn window → tell
 * the Director so they can pass the spotlight on; idle 14 days →
 * abandoned + compile what exists. Nudges dedupe against the
 * notifications table (one per spotlight grant), so the cron cadence
 * doesn't matter.
 */
export async function processAdventureDeadlines(): Promise<{
  nudgedWriters: number;
  nudgedDirectors: number;
  abandoned: number;
  errors: number;
}> {
  let nudgedWriters = 0;
  let nudgedDirectors = 0;
  let abandoned = 0;
  let errors = 0;
  const now = Date.now();

  const overdue = await db
    .select()
    .from(adventures)
    .where(
      and(
        eq(adventures.status, "running"),
        lte(adventures.spotlightDueAt, new Date(now)),
      ),
    );

  for (const adventure of overdue) {
    try {
      if (!adventure.spotlightSeatId || !adventure.spotlightDueAt || !adventure.spotlightSince) continue;
      const seatRows = await db
        .select()
        .from(adventureSeats)
        .where(eq(adventureSeats.adventureId, adventure.id));
      const holder = seatRows.find((s) => s.id === adventure.spotlightSeatId);
      const director = seatRows.find((s) => s.role === "director");
      const href = `/adventures/${adventure.id}`;

      // One nudge per spotlight grant: skip anyone already told since
      // the spotlight landed on this holder.
      const since = adventure.spotlightSince;
      const nudge = async (userId: string, message: string) => {
        const [already] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.href, href),
              eq(notifications.message, message),
              gte(notifications.createdAt, since),
            ),
          )
          .limit(1);
        if (already) return false;
        await createNotification(userId, "adventure", message, href);
        return true;
      };

      if (holder?.userId) {
        if (
          await nudge(
            holder.userId,
            "The table is waiting — your turn is overdue",
          )
        ) {
          nudgedWriters++;
        }
      }

      const dueMs = adventure.spotlightDueAt.getTime();
      const grantedMs = adventure.spotlightSince.getTime();
      const doubleWindow = grantedMs + 2 * (dueMs - grantedMs);
      if (
        now > doubleWindow &&
        director?.userId &&
        director.userId !== holder?.userId
      ) {
        if (
          await nudge(
            director.userId,
            "A turn has gone quiet — you can pass the spotlight on",
          )
        ) {
          nudgedDirectors++;
        }
      }
    } catch (error) {
      console.error(`Adventure nudge failed for ${adventure.id}:`, error);
      errors++;
    }
  }

  // Idle tables close themselves and keep what was written.
  const idleCutoff = new Date(now - ADVENTURE_IDLE_ABANDON_MS);
  const idle = await db
    .select({ id: adventures.id })
    .from(adventures)
    .where(
      and(
        eq(adventures.status, "running"),
        lte(adventures.updatedAt, idleCutoff),
      ),
    );
  for (const adventure of idle) {
    try {
      const result = await compileAdventure(adventure.id, "abandoned");
      if (result.status === "no-content") {
        // Nothing written — close the empty table without a book.
        await db
          .update(adventures)
          .set({ status: "abandoned", updatedAt: new Date() })
          .where(and(eq(adventures.id, adventure.id), eq(adventures.status, "running")));
      }
      abandoned++;
    } catch (error) {
      console.error(`Adventure abandonment failed for ${adventure.id}:`, error);
      errors++;
    }
  }

  return { nudgedWriters, nudgedDirectors, abandoned, errors };
}
