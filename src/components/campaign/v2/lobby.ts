import type { FloorRound } from "@/types/campaign";

/**
 * The question on the unlit page — shared bits for the lobby's two modes.
 * "warmup": the Director leaves one question, the cast answers in a line of
 * their ink, and one lifted answer may open the story at begin.
 * "temperature": the Director poses 2–4 options and the room leans — cast
 * as ink dots, the dark as grey drops. A temperature is NOT a vote:
 * non-binding forever, prints nothing, closed by the begin transaction.
 */

export function isLobbyRound(round: Pick<FloorRound, "mode"> | null): boolean {
  return !!round && (round.mode === "warmup" || round.mode === "temperature");
}

/**
 * The default deck — questions a Director can leave with zero effort, each
 * answerable in a sentence. Rotated deterministically (no Math.random in
 * render); the Director can always write their own.
 */
export const QUESTION_DECK: string[] = [
  "what did your character dream last night?",
  "what is your character carrying that they shouldn't be?",
  "what's the lie your character tells most often?",
  "what does your character smell right now?",
  "who at this table does your character trust least tonight?",
  "what small comfort did your character leave behind?",
  "what does your character do with their hands when they're afraid?",
  "what name does your character never say aloud?",
  "what did your character eat last, and where?",
  "what would your character save first from a fire?",
];

export function nextDeckQuestion(current: string | null): string {
  const idx = current ? QUESTION_DECK.indexOf(current) : -1;
  return QUESTION_DECK[(idx + 1) % QUESTION_DECK.length];
}
