/**
 * v2 The Stranger — shared logic. An opt-in chair for the dark: a recurring
 * character in the fiction that the audience plays together. The Director
 * wakes it and frames two to four deeds; the house — the watchers — chooses
 * one; the chosen deed joins the story in the Stranger's moon-silver ink
 * (--ink-strange). Choosing is free: gold never buys the story. The
 * Director's veto ("Call it off") is absolute.
 *
 * Mechanically the ballot is the crossroads machinery wearing a hood: a
 * floor round in mode "stranger" whose lines are Director-written and whose
 * votes are the audience pulse. Like the table's vote, the ballot never
 * touches history — it resolves into one record line of set type ("ooc",
 * kind "stranger-record", excluded from compile) plus the deed itself, a
 * narration turn carrying kind "stranger" so every surface inks it silver.
 */

import type { Turn } from "@/types/campaign";

export const STRANGER_ROUND_MODE = "stranger";
export const STRANGER_TURN_KIND = "stranger";
export const STRANGER_RECORD_KIND = "stranger-record";

/** The deed printed on the page is written in the Stranger's hand. */
export function isStrangerTurn(turn: Pick<Turn, "metadata">): boolean {
  // Cheap check, same idiom as isSetLine. The full `"kind":"stranger"` token
  // never matches the record rows — their kind is "stranger-record" (a
  // hyphen follows where this token requires the closing quote).
  return !!turn.metadata?.includes('"kind":"stranger"');
}

/** The one line of set type that records how the house chose. */
export function composeStrangerLine(
  name: string,
  voicesFor: number,
  voicesOthers: number,
): string {
  return `— ${name} stirred: the house chose its deed, ${voicesFor} ${
    voicesFor === 1 ? "voice" : "voices"
  } to ${voicesOthers}.`;
}
