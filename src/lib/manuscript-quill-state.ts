import type { SessionInteractionMode } from "@/lib/campaign-interaction-state";

/**
 * What lives at the end of the manuscript page. Exactly one of these renders
 * below the last paragraph — the single switch that replaced the ActionDock.
 * Pure so it can be unit-tested; mirrors ActionDock's precedence exactly:
 * inactive → last-words/gone → pending dice → crossroads → quill → waiting.
 */
export type QuillState =
  | { kind: "quill"; gm: boolean }
  | { kind: "last-words" }
  | { kind: "gone"; dead: boolean }
  | { kind: "roll-pending" }
  | { kind: "fork" }
  | { kind: "waiting"; directorWriting: boolean }
  | { kind: "none" };

export interface ResolveQuillStateInput {
  mode: SessionInteractionMode;
  isGM: boolean;
  myCharacterStatus: string | null;
  hasPendingRollRequest: boolean;
  /** One-shot: the dead character already set their last words down. */
  lastWordsSent: boolean;
  /** No active player holds the pen (the Director is writing). */
  directorWriting: boolean;
}

export function resolveQuillState({
  mode,
  isGM,
  myCharacterStatus,
  hasPendingRollRequest,
  lastWordsSent,
  directorWriting,
}: ResolveQuillStateInput): QuillState {
  if (mode === "inactive") return { kind: "none" };

  if (mode === "last_words") {
    return lastWordsSent ? { kind: "gone", dead: true } : { kind: "last-words" };
  }

  if (!isGM && myCharacterStatus === "retired") {
    return { kind: "gone", dead: false };
  }

  // The dice are calling — everything else waits.
  if (hasPendingRollRequest && !isGM) return { kind: "roll-pending" };

  if (
    mode === "crossroads_collecting" ||
    mode === "crossroads_voting" ||
    mode === "crossroads_closed"
  ) {
    return { kind: "fork" };
  }

  if (isGM) return { kind: "quill", gm: true };

  if (mode === "your_turn") return { kind: "quill", gm: false };

  return { kind: "waiting", directorWriting };
}
