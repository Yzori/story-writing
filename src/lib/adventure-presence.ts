// Cast presence at the table — pure window math, shared by the
// heartbeat route, the stream payloads, and the client beats.
// A seat is "at the table" while its heartbeat is fresh, and
// "writing" only while keystroke pulses are fresh — the cast bar
// never claims someone is writing when they walked away.

/** A seat counts as at the table while last_seen is this fresh. */
export const AT_TABLE_WINDOW_MS = 45_000;

/** "writing…" is honest only while writing_at is this fresh. */
export const WRITING_WINDOW_MS = 12_000;

/** Client: heartbeat cadence while the play page is open. */
export const PRESENCE_BEAT_MS = 20_000;

/** Client: minimum gap between keystroke-triggered beats. */
export const TYPING_BEAT_MS = 8_000;

/** Client: a keystroke this recent means "I am writing" on any beat. */
export const TYPING_FRESH_MS = 10_000;

export interface SeatPresenceView {
  seatId: string;
  atTable: boolean;
  writing: boolean;
}

export function presenceView(
  seatId: string,
  lastSeen: Date | string | null,
  writingAt: Date | string | null,
  now: number
): SeatPresenceView {
  const seen = lastSeen ? new Date(lastSeen).getTime() : 0;
  const wrote = writingAt ? new Date(writingAt).getTime() : 0;
  const atTable = now - seen < AT_TABLE_WINDOW_MS;
  return {
    seatId,
    atTable,
    // A stale heartbeat retires the writing pulse with it.
    writing: atTable && now - wrote < WRITING_WINDOW_MS,
  };
}

export function presenceMap(
  views: SeatPresenceView[] | undefined
): Map<string, SeatPresenceView> {
  return new Map((views ?? []).map((v) => [v.seatId, v] as const));
}
