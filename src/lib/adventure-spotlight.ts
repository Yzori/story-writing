// Adventures ("the table") — spotlight state machine.
//
// Pure decision + transition logic for who may write, raise a hand,
// step forward, or pass the spotlight. The API routes evaluate these
// under a row lock on the adventure and apply the returned effects;
// the client uses the same checks to decide what controls to show.
// Keeping every transition here (with unit tests) is what stops the
// server gate and the client UI from drifting apart.

export type SeatRole = "director" | "writer";
export type SeatStatus = "open" | "seated" | "left";
export type AdventureStatus = "casting" | "running" | "finished" | "abandoned";
export type PassageKind = "scene-open" | "direction" | "character";

export interface SpotlightSeat {
  id: string;
  role: SeatRole;
  status: SeatStatus;
  /** Last act this seat spent its step-forward token in (0 = never). */
  stepForwardAct: number;
}

export interface SpotlightState {
  status: AdventureStatus;
  actNo: number;
  spotlightSeatId: string | null;
  /** Deadline for the current holder; null while the Director holds it. */
  spotlightDueAt: Date | null;
  turnDueHours: number;
  hasOpenScene: boolean;
}

export type Decision =
  | { allowed: true }
  | { allowed: false; reason: string };

const deny = (reason: string): Decision => ({ allowed: false, reason });
const allow: Decision = { allowed: true };

function seatedWriter(seat: SpotlightSeat): Decision {
  if (seat.role !== "writer") return deny("Only a writer at the table can do that.");
  if (seat.status !== "seated") return deny("Take a seat at the table first.");
  return allow;
}

function running(state: SpotlightState): Decision {
  if (state.status === "casting") return deny("The adventure hasn't started yet.");
  if (state.status !== "running") return deny("This adventure has ended.");
  return allow;
}

// ── Pass the spotlight (Director → writer) ──────────────────

export function canPassSpotlight(
  state: SpotlightState,
  directorSeat: SpotlightSeat,
  toSeat: SpotlightSeat
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  if (directorSeat.role !== "director")
    return deny("Only the Director can pass the spotlight.");
  if (state.spotlightSeatId !== directorSeat.id)
    return deny("The spotlight is out at the table — wait for it to come back.");
  const writer = seatedWriter(toSeat);
  if (!writer.allowed) return writer;
  if (!state.hasOpenScene) return deny("Open a scene before passing the spotlight.");
  return allow;
}

export function passSpotlightEffects(
  state: SpotlightState,
  toSeatId: string,
  now: Date
): { spotlightSeatId: string; spotlightSince: Date; spotlightDueAt: Date } {
  return {
    spotlightSeatId: toSeatId,
    spotlightSince: now,
    spotlightDueAt: spotlightDue(now, state.turnDueHours),
  };
}

export function spotlightDue(now: Date, turnDueHours: number): Date {
  return new Date(now.getTime() + turnDueHours * 60 * 60 * 1000);
}

// ── Raise / lower a hand ─────────────────────────────────────

export function canRaiseHand(
  state: SpotlightState,
  seat: SpotlightSeat,
  hasActiveHand: boolean
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  const writer = seatedWriter(seat);
  if (!writer.allowed) return writer;
  if (state.spotlightSeatId === seat.id)
    return deny("You have the spotlight — write.");
  if (hasActiveHand) return deny("Your hand is already up.");
  return allow;
}

export function canLowerHand(hasActiveHand: boolean): Decision {
  if (!hasActiveHand) return deny("Your hand isn't up.");
  return allow;
}

// ── Step forward (once per act) ──────────────────────────────

export function canStepForward(
  state: SpotlightState,
  seat: SpotlightSeat,
  directorSeatId: string
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  const writer = seatedWriter(seat);
  if (!writer.allowed) return writer;
  if (state.spotlightSeatId === seat.id)
    return deny("You already have the spotlight.");
  // No yanking mid-write: the spotlight can only be taken from the
  // Director's desk, never from another writer who is writing.
  if (state.spotlightSeatId !== directorSeatId)
    return deny("Someone is writing — you can step forward once the spotlight returns to the Director.");
  if (seat.stepForwardAct >= state.actNo)
    return deny("You've already stepped forward this act.");
  if (!state.hasOpenScene) return deny("There's no open scene to step into.");
  return allow;
}

export function stepForwardEffects(
  state: SpotlightState,
  seat: SpotlightSeat,
  now: Date
): {
  spotlightSeatId: string;
  spotlightSince: Date;
  spotlightDueAt: Date;
  stepForwardAct: number;
} {
  return {
    ...passSpotlightEffects(state, seat.id, now),
    stepForwardAct: state.actNo,
  };
}

// ── Signing a passage ────────────────────────────────────────

export function canSignPassage(
  state: SpotlightState,
  seat: SpotlightSeat,
  kind: PassageKind
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  if (seat.status !== "seated") return deny("Take a seat at the table first.");
  if (state.spotlightSeatId !== seat.id)
    return deny("The spotlight isn't on you.");
  if (kind === "character") {
    if (seat.role !== "writer")
      return deny("The Director never writes the cast's characters.");
  } else {
    // 'direction' and 'scene-open' belong to the Director's desk.
    if (seat.role !== "director")
      return deny("Only the Director writes direction.");
  }
  if (kind !== "scene-open" && !state.hasOpenScene)
    return deny("There's no open scene — the Director opens the next one.");
  return allow;
}

/**
 * What happens to the spotlight after a passage is signed. A writer's
 * signature returns the spotlight to the Director's desk (no deadline
 * while the Director holds it); the Director keeps it and writes freely.
 */
export function signPassageEffects(
  seat: SpotlightSeat,
  directorSeatId: string,
  now: Date
):
  | { spotlightSeatId: string; spotlightSince: Date; spotlightDueAt: null }
  | null {
  if (seat.role !== "writer") return null;
  return {
    spotlightSeatId: directorSeatId,
    spotlightSince: now,
    spotlightDueAt: null,
  };
}

/** Stamp a writer's signature on-time or late against the turn deadline. */
export function signTiming(
  spotlightDueAt: Date | null,
  now: Date
): "on-time" | "late" {
  if (!spotlightDueAt) return "on-time";
  return now.getTime() <= spotlightDueAt.getTime() ? "on-time" : "late";
}

// ── Scenes (Director's desk) ─────────────────────────────────

export function canOpenScene(
  state: SpotlightState,
  seat: SpotlightSeat
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  if (seat.role !== "director") return deny("Only the Director opens scenes.");
  if (seat.status !== "seated") return deny("Take a seat at the table first.");
  if (state.spotlightSeatId !== seat.id)
    return deny("Wait for the spotlight to return before changing scenes.");
  if (state.hasOpenScene)
    return deny("Close the current scene before opening the next.");
  return allow;
}

export function canCloseScene(
  state: SpotlightState,
  seat: SpotlightSeat
): Decision {
  const live = running(state);
  if (!live.allowed) return live;
  if (seat.role !== "director") return deny("Only the Director closes scenes.");
  if (seat.status !== "seated") return deny("Take a seat at the table first.");
  if (state.spotlightSeatId !== seat.id)
    return deny("Wait for the spotlight to return before changing scenes.");
  if (!state.hasOpenScene) return deny("There's no open scene to close.");
  return allow;
}

/**
 * Position of the next scene. Closing an act rolls the scene counter
 * over and hands every writer a fresh step-forward token (tokens are
 * per act: seat.stepForwardAct < actNo means unspent).
 */
export function nextScenePosition(
  actNo: number,
  sceneNo: number,
  newAct: boolean
): { actNo: number; sceneNo: number } {
  if (newAct) return { actNo: actNo + 1, sceneNo: 1 };
  return { actNo, sceneNo: sceneNo + 1 };
}

// ── Starting the adventure ───────────────────────────────────

export const MIN_WRITERS = 2;
export const MAX_WRITERS = 4;

export function canStartAdventure(
  status: AdventureStatus,
  seatedWriterCount: number,
  directorSeated: boolean
): Decision {
  if (status !== "casting") return deny("This adventure has already started.");
  if (!directorSeated) return deny("The table needs a Director.");
  if (seatedWriterCount < MIN_WRITERS)
    return deny(`The table needs at least ${MIN_WRITERS} writers.`);
  if (seatedWriterCount > MAX_WRITERS)
    return deny(`The table seats at most ${MAX_WRITERS} writers.`);
  return allow;
}
