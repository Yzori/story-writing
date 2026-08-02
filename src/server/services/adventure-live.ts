import "server-only";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureAudiencePresence,
  adventureBackings,
  adventureHands,
  adventurePassages,
  adventurePassageSparks,
  adventures,
  adventureScenes,
  adventureSeatPresence,
  adventureSuggestions,
  crossroads,
  crossroadsVotes,
  stories,
  users,
} from "@/server/db/schema";
import { presenceView, type SeatPresenceView } from "@/lib/adventure-presence";
import { loadAdventureContext } from "@/server/services/adventure-table";

const AUDIENCE_PRESENCE_WINDOW_MS = 45_000;

/**
 * State payloads for the table and the watch room, built once and
 * served two ways: the plain GET routes (the polling fallback) and
 * the SSE streams (the live path). One builder per payload so the
 * two transports can never drift apart.
 */

export async function loadSeatPresence(
  adventureId: string
): Promise<SeatPresenceView[]> {
  const rows = await db
    .select()
    .from(adventureSeatPresence)
    .where(eq(adventureSeatPresence.adventureId, adventureId));
  const now = Date.now();
  return rows.map((row) =>
    presenceView(row.seatId, row.lastSeen, row.writingAt, now)
  );
}

/**
 * Full table state for a seated player — adventure, seats, scenes,
 * hands (whispers redacted for non-Directors), presence. Returns null
 * unless the caller holds a seat.
 */
export async function loadTableStatePayload(
  adventureId: string,
  userId: string
) {
  const ctx = await loadAdventureContext(adventureId, userId);
  if (!ctx || !ctx.mySeat) return null;

  const [story] = await db
    .select({ id: stories.id, title: stories.title })
    .from(stories)
    .where(eq(stories.id, ctx.adventure.storyId));

  const scenes = await db
    .select()
    .from(adventureScenes)
    .where(eq(adventureScenes.adventureId, adventureId))
    .orderBy(adventureScenes.openedAt);

  const isDirector = ctx.mySeat.role === "director";
  const activeHands = await db
    .select()
    .from(adventureHands)
    .where(
      and(
        eq(adventureHands.adventureId, adventureId),
        isNull(adventureHands.resolvedAt)
      )
    )
    .orderBy(adventureHands.raisedAt);

  const presence = await loadSeatPresence(adventureId);

  return {
    adventure: {
      id: ctx.adventure.id,
      storyId: ctx.adventure.storyId,
      ownerId: ctx.adventure.ownerId,
      title: story?.title ?? "",
      premise: ctx.adventure.premise,
      genre: ctx.adventure.genre,
      pace: ctx.adventure.pace,
      turnDueHours: ctx.adventure.turnDueHours,
      status: ctx.adventure.status,
      actNo: ctx.adventure.actNo,
      sceneNo: ctx.adventure.sceneNo,
      spotlightSeatId: ctx.adventure.spotlightSeatId,
      spotlightSince: ctx.adventure.spotlightSince,
      spotlightDueAt: ctx.adventure.spotlightDueAt,
      boardVisibility: ctx.adventure.boardVisibility,
      updatedAt: ctx.adventure.updatedAt,
    },
    seats: ctx.seats.map((seat) => ({
      id: seat.id,
      userId: seat.userId,
      role: seat.role,
      characterName: seat.characterName,
      characterBrief: seat.characterBrief,
      inkColor: seat.inkColor,
      status: seat.status,
      stepForwardAct: seat.stepForwardAct,
      userName: seat.userName,
      userAvatarUrl: seat.userAvatarUrl,
    })),
    scenes,
    hands: activeHands.map((hand) => ({
      id: hand.id,
      seatId: hand.seatId,
      raisedAt: hand.raisedAt,
      // Whispers are for the Director's eyes (and your own hand).
      whisper:
        isDirector || hand.seatId === ctx.mySeat!.id ? hand.whisper : "",
    })),
    presence,
    mySeatId: ctx.mySeat.id,
  };
}

/** Passages in page order, optionally after a sort cursor. */
export async function loadPassagesAfter(adventureId: string, afterSort: number | null) {
  const conditions = [eq(adventurePassages.adventureId, adventureId)];
  if (afterSort !== null && Number.isFinite(afterSort)) {
    conditions.push(gt(adventurePassages.sortOrder, afterSort));
  }
  return db
    .select()
    .from(adventurePassages)
    .where(and(...conditions))
    .orderBy(asc(adventurePassages.sortOrder));
}

/**
 * The public watch state: the table as the audience sees it. No
 * hands, no whispers. Lantern counts, backings, the open house vote,
 * and cast presence. Returns null when the adventure doesn't exist.
 *
 * Deliberately does NOT check boardVisibility (decided 2026-08-02):
 * `private` means "not listed on the matchmaking board", not "no
 * spectators" — the live audience is core to the format, and the
 * adventure id is an unguessable capability URL only the cast can
 * hand out. If a no-spectators mode is ever wanted, that's a new
 * setting, not a reinterpretation of this one.
 */
export async function loadWatchStatePayload(
  adventureId: string,
  userId: string | null
) {
  const ctx = await loadAdventureContext(adventureId, userId);
  if (!ctx) return null;

  const [story] = await db
    .select({ title: stories.title })
    .from(stories)
    .where(eq(stories.id, ctx.adventure.storyId));

  const scenes = await db
    .select()
    .from(adventureScenes)
    .where(eq(adventureScenes.adventureId, adventureId))
    .orderBy(adventureScenes.openedAt);

  const cutoff = new Date(Date.now() - AUDIENCE_PRESENCE_WINDOW_MS);
  const [present] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adventureAudiencePresence)
    .where(
      and(
        eq(adventureAudiencePresence.adventureId, adventureId),
        gt(adventureAudiencePresence.lastHeartbeat, cutoff)
      )
    );
  const [allTime] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adventureAudiencePresence)
    .where(eq(adventureAudiencePresence.adventureId, adventureId));

  const backingRows = await db
    .select({
      seatId: adventureBackings.seatId,
      count: sql<number>`count(*)::int`,
    })
    .from(adventureBackings)
    .where(eq(adventureBackings.adventureId, adventureId))
    .groupBy(adventureBackings.seatId);
  let myBackingSeatId: string | null = null;
  if (userId) {
    const [mine] = await db
      .select({ seatId: adventureBackings.seatId })
      .from(adventureBackings)
      .where(
        and(
          eq(adventureBackings.adventureId, adventureId),
          eq(adventureBackings.userId, userId)
        )
      );
    myBackingSeatId = mine?.seatId ?? null;
  }

  // The open house vote, drop-weighted.
  const [vote] = await db
    .select()
    .from(crossroads)
    .where(
      and(
        eq(crossroads.adventureId, adventureId),
        eq(crossroads.status, "open")
      )
    )
    .orderBy(sql`${crossroads.createdAt} desc`)
    .limit(1);
  let houseVote = null;
  if (vote) {
    const tallies = await db
      .select({
        optionIndex: crossroadsVotes.optionIndex,
        totalDrops: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)::int`,
      })
      .from(crossroadsVotes)
      .where(eq(crossroadsVotes.crossroadId, vote.id))
      .groupBy(crossroadsVotes.optionIndex);
    let options: Array<{ label: string }> = [];
    try {
      options = JSON.parse(vote.options);
    } catch {
      options = [];
    }
    const totals = options.map(
      (_, i) => tallies.find((t) => t.optionIndex === i)?.totalDrops ?? 0
    );
    const grand = totals.reduce((a, b) => a + b, 0);
    houseVote = {
      id: vote.id,
      storyId: ctx.adventure.storyId,
      question: vote.question,
      closesAt: vote.closesAt,
      options: options.map((option, i) => ({
        label: option.label,
        drops: totals[i],
        pct: grand === 0 ? 0 : Math.round((totals[i] / grand) * 100),
      })),
    };
  }

  const presence = await loadSeatPresence(adventureId);

  return {
    adventure: {
      id: ctx.adventure.id,
      storyId: ctx.adventure.storyId,
      title: story?.title ?? "",
      premise: ctx.adventure.premise,
      genre: ctx.adventure.genre,
      pace: ctx.adventure.pace,
      status: ctx.adventure.status,
      actNo: ctx.adventure.actNo,
      sceneNo: ctx.adventure.sceneNo,
      spotlightSeatId: ctx.adventure.spotlightSeatId,
      updatedAt: ctx.adventure.updatedAt,
    },
    seats: ctx.seats
      .filter((s) => s.status === "seated")
      .map((seat) => ({
        id: seat.id,
        role: seat.role,
        characterName: seat.characterName,
        characterBrief: seat.characterBrief,
        inkColor: seat.inkColor,
        userName: seat.userName,
        backers: backingRows.find((b) => b.seatId === seat.id)?.count ?? 0,
      })),
    scenes,
    audience: {
      present: present?.count ?? 0,
      allTime: allTime?.count ?? 0,
    },
    presence,
    myBackingSeatId,
    houseVote,
    signedIn: !!userId,
  };
}

/**
 * The page for the audience: passages with spark counts, whether the
 * caller sparked each one, and reader-credit lines for canonized
 * suggestions.
 */
export async function loadWatchPassagesPayload(
  adventureId: string,
  userId: string | null,
  afterSort: number | null
) {
  const passages = await loadPassagesAfter(adventureId, afterSort);
  if (passages.length === 0) return [];
  const passageIds = passages.map((p) => p.id);

  const sparkRows = await db
    .select({
      passageId: adventurePassageSparks.passageId,
      count: sql<number>`count(*)::int`,
    })
    .from(adventurePassageSparks)
    .where(inArray(adventurePassageSparks.passageId, passageIds))
    .groupBy(adventurePassageSparks.passageId);

  const mySparks = new Set<string>();
  if (userId) {
    const mine = await db
      .select({ passageId: adventurePassageSparks.passageId })
      .from(adventurePassageSparks)
      .where(
        and(
          inArray(adventurePassageSparks.passageId, passageIds),
          eq(adventurePassageSparks.userId, userId)
        )
      );
    for (const row of mine) mySparks.add(row.passageId);
  }

  // "detail from reader ⟨name⟩" — canonized suggestions credit lines.
  const credits = await db
    .select({
      passageId: adventureSuggestions.canonizedPassageId,
      readerName: users.displayName,
      readerFallback: users.name,
    })
    .from(adventureSuggestions)
    .leftJoin(users, eq(adventureSuggestions.userId, users.id))
    .where(
      and(
        eq(adventureSuggestions.adventureId, adventureId),
        eq(adventureSuggestions.status, "canonized"),
        inArray(adventureSuggestions.canonizedPassageId, passageIds)
      )
    );

  return passages.map((passage) => ({
    ...passage,
    sparks: sparkRows.find((s) => s.passageId === passage.id)?.count ?? 0,
    sparkedByMe: mySparks.has(passage.id),
    readerCredit:
      credits
        .filter((c) => c.passageId === passage.id)
        .map((c) => c.readerName ?? c.readerFallback ?? "a reader")[0] ?? null,
  }));
}

/**
 * Spark totals for every passage at the table, as a compact
 * `{ passageId: count }` map. One aggregate query, no content columns —
 * this is what lets the watch stream push spark movement on old
 * passages without re-reading the whole page.
 */
export async function loadSparkTotals(
  adventureId: string
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      passageId: adventurePassageSparks.passageId,
      count: sql<number>`count(*)::int`,
    })
    .from(adventurePassageSparks)
    .innerJoin(
      adventurePassages,
      eq(adventurePassageSparks.passageId, adventurePassages.id)
    )
    .where(eq(adventurePassages.adventureId, adventureId))
    .groupBy(adventurePassageSparks.passageId);
  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.passageId] = row.count;
  return totals;
}

export async function adventureExists(adventureId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: adventures.id })
    .from(adventures)
    .where(eq(adventures.id, adventureId));
  return !!row;
}
