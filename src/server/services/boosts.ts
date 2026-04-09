import "server-only";
import { db } from "@/server/db";
import { storyBoosts } from "@/server/db/schema";
import { and, eq, gt, lte, sql } from "drizzle-orm";

/**
 * Boost tier configuration.
 *
 * Standard: sponsored strip on home (unlimited concurrent), 50 drops / 24h
 * Hero:     rotating hero carousel on home, hard cap 5 concurrent, 300 drops / 24h
 */
export const BOOST_TIERS = {
  standard: {
    cost: 50,
    durationMs: 24 * 60 * 60 * 1000,
    concurrentCap: null as number | null,
    perStoryQueueCap: 3,
  },
  hero: {
    cost: 300,
    durationMs: 24 * 60 * 60 * 1000,
    concurrentCap: 5,
    perStoryQueueCap: 3,
  },
} as const;

export type BoostTier = keyof typeof BOOST_TIERS;

/**
 * Lazily promote any pending boosts whose `startsAt` has arrived to `active`,
 * and mark expired ones as `expired`. Safe to call on every read.
 */
export async function reconcileBoosts(): Promise<void> {
  const now = new Date();
  // Promote pending → active
  await db
    .update(storyBoosts)
    .set({ status: "active" })
    .where(
      and(
        eq(storyBoosts.status, "pending"),
        lte(storyBoosts.startsAt, now),
        gt(storyBoosts.expiresAt, now),
      ),
    );
  // Expire active rows whose expiresAt has passed
  await db
    .update(storyBoosts)
    .set({ status: "expired" })
    .where(
      and(eq(storyBoosts.status, "active"), lte(storyBoosts.expiresAt, now)),
    );
}

/**
 * Figure out when a new hero boost would start, given the cap and existing
 * active + pending rows. Returns:
 *   - { startsAt: now } if a slot is free
 *   - { startsAt: <future>, queuePosition: n } if we'd be pre-booked
 *   - null if the per-story queue cap is reached
 */
export async function computeNextHeroSlot(
  storyId: string,
): Promise<
  | { startsAt: Date; expiresAt: Date; queuePosition: number; isImmediate: boolean }
  | { blocked: "story-queue-full" }
> {
  const cap = BOOST_TIERS.hero.concurrentCap!;
  const duration = BOOST_TIERS.hero.durationMs;

  // Pull all non-expired hero rows, sorted by startsAt.
  const rows = await db
    .select({
      id: storyBoosts.id,
      storyId: storyBoosts.storyId,
      startsAt: storyBoosts.startsAt,
      expiresAt: storyBoosts.expiresAt,
      status: storyBoosts.status,
    })
    .from(storyBoosts)
    .where(
      and(
        eq(storyBoosts.tier, "hero"),
        sql`${storyBoosts.status} IN ('active','pending')`,
      ),
    )
    .orderBy(storyBoosts.startsAt);

  // Per-story queue cap check
  const forStory = rows.filter((r) => r.storyId === storyId);
  if (forStory.length >= BOOST_TIERS.hero.perStoryQueueCap) {
    return { blocked: "story-queue-full" };
  }

  // Walk the timeline: find the earliest moment when the number of overlapping
  // boosts drops below the cap. We know every row occupies [startsAt, expiresAt).
  const now = new Date();
  const startPoint = now;

  // Count how many are currently active at `now`
  const activeNow = rows.filter(
    (r) => r.startsAt <= now && r.expiresAt > now,
  ).length;

  if (activeNow < cap) {
    const startsAt = startPoint;
    const expiresAt = new Date(startPoint.getTime() + duration);
    return {
      startsAt,
      expiresAt,
      queuePosition: 0,
      isImmediate: true,
    };
  }

  // Otherwise, find the earliest expiresAt among the currently-active batch.
  // That's the next opening moment — but we also need to account for pending
  // rows that might fill that slot first.
  //
  // Simpler correct approach: simulate. Walk time through each boost's
  // start/end events and track concurrent count. The first time count drops
  // below cap after `now`, that's our slot.
  const events: { t: Date; delta: 1 | -1 }[] = [];
  for (const r of rows) {
    events.push({ t: r.startsAt, delta: 1 });
    events.push({ t: r.expiresAt, delta: -1 });
  }
  events.sort((a, b) => a.t.getTime() - b.t.getTime());

  let concurrent = 0;
  let openAt: Date | null = null;
  for (const e of events) {
    concurrent += e.delta;
    if (e.t <= now) continue;
    if (concurrent < cap) {
      openAt = e.t;
      break;
    }
  }

  if (!openAt) {
    // Shouldn't happen because rows are finite, but guard
    openAt = new Date(startPoint.getTime() + duration);
  }

  return {
    startsAt: openAt,
    expiresAt: new Date(openAt.getTime() + duration),
    queuePosition: forStory.length,
    isImmediate: false,
  };
}
