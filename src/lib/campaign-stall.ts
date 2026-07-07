/**
 * Anti-stall reliability — the soft clock. Pure, no React, no DB, so the
 * thresholds and predicates are unit-testable and shared by the client hook
 * (`use-pen-idle`) and the server sweep (`processCampaignAbandonment`).
 *
 * The law (see ~/.claude/plans/anti-stall-reliability-spec.md): the pen never
 * waits on one person. Detection is arithmetic — a clock over turn timestamps
 * and presence heartbeats. Nothing here writes a word; it only decides when to
 * surface a choice to the humans, and when an abandoned session may seal itself.
 *
 * These numbers are a starting line, not gospel — the session readout's real
 * gap distribution tunes them after the playtest.
 */

// Thresholds are tunable — the spec calls for the playtest's real gap
// distribution to set them (and a playtest needs to trip these paths in
// seconds, not minutes). Defaults are the production values; an env override
// only ever shortens a test run. The pen thresholds carry NEXT_PUBLIC_ so the
// client hook sees them; the abandon window is server-only (the cron sweep).
const envMs = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Below this, silence is just thinking — invisible. */
export const PEN_NUDGE_MS = envMs(process.env.NEXT_PUBLIC_PEN_NUDGE_MS, 2 * 60 * 1000);
/** Past this, the pen is stalled: the present Director is told to route around it. */
export const PEN_STALL_MS = envMs(process.env.NEXT_PUBLIC_PEN_STALL_MS, 5 * 60 * 1000);
/**
 * Past this with the whole table gone, a session is abandoned and may seal
 * itself (closure guarantee). Deliberately long — we seal dead rooms, never
 * interrupt a slow scene.
 */
export const SESSION_ABANDON_MS = envMs(process.env.SESSION_ABANDON_MS, 20 * 60 * 1000);

export type PenTier = "quiet" | "nudge" | "stall";

/** Which stall tier a pen that has sat idle `idleMs` is in. */
export function penTierFor(
  idleMs: number,
  opts: { nudgeMs?: number; stallMs?: number } = {}
): PenTier {
  const nudgeMs = opts.nudgeMs ?? PEN_NUDGE_MS;
  const stallMs = opts.stallMs ?? PEN_STALL_MS;
  if (idleMs >= stallMs) return "stall";
  if (idleMs >= nudgeMs) return "nudge";
  return "quiet";
}

/**
 * Whether a live session has been abandoned — nothing has happened for the
 * abandon window AND nobody has a heartbeat inside it. A session with no
 * heartbeat at all (`lastHeartbeatMs` null) whose last event is old counts as
 * abandoned; a fresh heartbeat from anyone keeps it alive.
 */
export function isAbandoned(input: {
  now: number;
  /** Last real event: max(last turn, session creation) in ms since epoch. */
  lastEventMs: number;
  /** Freshest cast heartbeat in ms since epoch, or null if none exists. */
  lastHeartbeatMs: number | null;
  abandonMs?: number;
}): boolean {
  const abandonMs = input.abandonMs ?? SESSION_ABANDON_MS;
  const eventStale = input.now - input.lastEventMs >= abandonMs;
  const tableGone =
    input.lastHeartbeatMs === null ||
    input.now - input.lastHeartbeatMs >= abandonMs;
  return eventStale && tableGone;
}
