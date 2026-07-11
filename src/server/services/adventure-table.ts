import "server-only";
import { and, asc, eq } from "drizzle-orm";
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
