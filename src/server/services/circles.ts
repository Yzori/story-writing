import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { circleSubscriptions } from "@/server/db/schema";

/**
 * Whether `readerId` holds an active Circle subscription to `creatorId`.
 * Early access is the Circle's headline perk — reader gates that honor
 * `earlyAccessUntil` must call this before locking a subscriber out.
 * Status transitions (lapsed/cancelled) are owned by the renewal cron,
 * so `status = 'active'` is the whole check.
 */
export async function hasActiveCircleSubscription(
  readerId: string,
  creatorId: string
): Promise<boolean> {
  const [sub] = await db
    .select({ id: circleSubscriptions.id })
    .from(circleSubscriptions)
    .where(
      and(
        eq(circleSubscriptions.readerId, readerId),
        eq(circleSubscriptions.creatorId, creatorId),
        eq(circleSubscriptions.status, "active")
      )
    )
    .limit(1);
  return Boolean(sub);
}
