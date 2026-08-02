import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventures,
  adventureScenes,
  adventureSeats,
  users,
} from "@/server/db/schema";
import type {
  AdventureStatus,
  SpotlightSeat,
  SpotlightState,
} from "@/lib/adventure-spotlight";

/** Turn deadline per pace. 'live' keeps turns tight instead of scheduled. */
export const PACE_DUE_HOURS: Record<string, number> = {
  "turn-daily": 24,
  "turn-2-days": 48,
  "turn-weekly": 168,
  live: 1,
};

export type AdventureRow = typeof adventures.$inferSelect;
export type SeatRow = typeof adventureSeats.$inferSelect;
export type SceneRow = typeof adventureScenes.$inferSelect;

export interface SeatWithUser extends SeatRow {
  userName: string | null;
  userAvatarUrl: string | null;
}

export interface AdventureContext {
  adventure: AdventureRow;
  seats: SeatWithUser[];
  mySeat: SeatWithUser | null;
  directorSeat: SeatWithUser | null;
  openScene: SceneRow | null;
}

export async function loadAdventureContext(
  adventureId: string,
  userId: string | null
): Promise<AdventureContext | null> {
  const [adventure] = await db
    .select()
    .from(adventures)
    .where(eq(adventures.id, adventureId));
  if (!adventure) return null;

  const seatRows = await db
    .select({
      seat: adventureSeats,
      userName: users.displayName,
      userFallbackName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(adventureSeats)
    .leftJoin(users, eq(adventureSeats.userId, users.id))
    .where(eq(adventureSeats.adventureId, adventureId))
    .orderBy(asc(adventureSeats.createdAt));

  const seats: SeatWithUser[] = seatRows.map((row) => ({
    ...row.seat,
    userName: row.userName ?? row.userFallbackName ?? null,
    userAvatarUrl: row.userAvatarUrl ?? null,
  }));

  const [openScene] = await db
    .select()
    .from(adventureScenes)
    .where(
      and(
        eq(adventureScenes.adventureId, adventureId),
        eq(adventureScenes.status, "open")
      )
    );

  return {
    adventure,
    seats,
    mySeat: userId
      ? seats.find((s) => s.userId === userId && s.status === "seated") ?? null
      : null,
    directorSeat: seats.find((s) => s.role === "director") ?? null,
    openScene: openScene ?? null,
  };
}

export function toSpotlightState(
  adventure: Pick<
    AdventureRow,
    "status" | "actNo" | "spotlightSeatId" | "spotlightDueAt" | "turnDueHours"
  >,
  hasOpenScene: boolean
): SpotlightState {
  return {
    status: adventure.status as AdventureStatus,
    actNo: adventure.actNo,
    spotlightSeatId: adventure.spotlightSeatId,
    spotlightDueAt: adventure.spotlightDueAt,
    turnDueHours: adventure.turnDueHours,
    hasOpenScene,
  };
}

export function toSpotlightSeat(
  seat: Pick<SeatRow, "id" | "role" | "status" | "stepForwardAct">
): SpotlightSeat {
  return {
    id: seat.id,
    role: seat.role as SpotlightSeat["role"],
    status: seat.status as SpotlightSeat["status"],
    stepForwardAct: seat.stepForwardAct,
  };
}

// ── The board (Slice 2) ──────────────────────────────────────

export interface ShowUpRecord {
  /** Percent of turns signed on time, 0–100; null = no history yet. */
  onTimePct: number | null;
  finished: number;
}

/**
 * A user's show-up record, computed across every seat they've held:
 * % of turns signed on time + adventures finished. This is the
 * anti-ghosting axis the board matches on — no new table, always
 * derived from what actually happened.
 */
export async function showUpRecord(userId: string): Promise<ShowUpRecord> {
  const rows = await db
    .select({
      onTime: adventureSeats.turnsOnTime,
      late: adventureSeats.turnsLate,
      status: adventures.status,
    })
    .from(adventureSeats)
    .innerJoin(adventures, eq(adventureSeats.adventureId, adventures.id))
    .where(eq(adventureSeats.userId, userId));

  let onTime = 0;
  let late = 0;
  let finished = 0;
  for (const row of rows) {
    onTime += row.onTime;
    late += row.late;
    if (row.status === "finished") finished++;
  }
  const total = onTime + late;
  return {
    onTimePct: total === 0 ? null : Math.round((onTime / total) * 100),
    finished,
  };
}

/**
 * showUpRecord for a set of hosts in one query — the board renders up
 * to 60 cards and was paying one round-trip per card.
 */
export async function showUpRecords(
  userIds: string[]
): Promise<Map<string, ShowUpRecord>> {
  const records = new Map<string, ShowUpRecord>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return records;

  const rows = await db
    .select({
      userId: adventureSeats.userId,
      onTime: adventureSeats.turnsOnTime,
      late: adventureSeats.turnsLate,
      status: adventures.status,
    })
    .from(adventureSeats)
    .innerJoin(adventures, eq(adventureSeats.adventureId, adventures.id))
    .where(inArray(adventureSeats.userId, unique));

  const totals = new Map<string, { onTime: number; late: number; finished: number }>();
  for (const row of rows) {
    if (!row.userId) continue;
    const t = totals.get(row.userId) ?? { onTime: 0, late: 0, finished: 0 };
    t.onTime += row.onTime;
    t.late += row.late;
    if (row.status === "finished") t.finished++;
    totals.set(row.userId, t);
  }
  for (const id of unique) {
    const t = totals.get(id) ?? { onTime: 0, late: 0, finished: 0 };
    const total = t.onTime + t.late;
    records.set(id, {
      onTimePct: total === 0 ? null : Math.round((t.onTime / total) * 100),
      finished: t.finished,
    });
  }
  return records;
}
