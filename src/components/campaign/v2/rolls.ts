import type { Turn } from "@/types/campaign";

/**
 * v2 dice — shared logic. A roll lives as two turns: an open "roll-request"
 * (the printed slip at the live edge) and, once cast, a "roll" turn whose
 * content is one line of set type. Mechanics never touch history: a closed
 * request renders nothing; only the set line remains on the page.
 */

export interface RollSlipMeta {
  targetUserId: string;
  /** The ask — what's at stake, one line, in the Director's words. */
  reason: string;
  onSuccess: string | null;
  onFailure: string | null;
  /** Legacy fatal-stakes flag: a failed roll ends the character. v2 doesn't
   *  author these, but the slip must show one when the data carries it. */
  fatal: boolean;
  status: "open" | "closed" | "cancelled";
}

export type RollTier = "holds" | "partial" | "breaks";

export interface RollResult {
  dice: [number, number];
  modifier: number;
  total: number;
  tier: RollTier;
}

export function parseRollSlip(turn: Turn): RollSlipMeta | null {
  if (turn.type !== "roll-request" || !turn.metadata) return null;
  try {
    const raw = JSON.parse(turn.metadata);
    if (!raw?.targetUserId) return null;
    return {
      targetUserId: raw.targetUserId,
      reason: raw.reason ?? "",
      onSuccess: raw.onSuccess ?? null,
      onFailure: raw.onFailure ?? null,
      fatal: raw.fatal === true,
      status: raw.status ?? "open",
    };
  } catch {
    return null;
  }
}

/**
 * The live slip, if any: the newest roll-request whose metadata still says
 * "open" AND that no roll turn has answered yet. (The server never flips the
 * request metadata on resolution — answered-ness lives in the roll turns.)
 */
export function findOpenRoll(
  turns: Turn[],
): { turn: Turn; meta: RollSlipMeta } | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.type !== "roll-request") continue;
    const meta = parseRollSlip(turn);
    if (!meta || meta.status !== "open") return null;
    const answered = turns.some(
      (t) =>
        t.type === "roll" &&
        !!t.metadata &&
        t.metadata.includes(`"rollRequestTurnId":"${turn.id}"`),
    );
    return answered ? null : { turn, meta };
  }
  return null;
}

/** Map the server's roll tier vocabulary onto the slip's. */
export function tierFromServer(tier: string): RollTier {
  return tier === "success" ? "holds" : tier === "partial" ? "partial" : "breaks";
}

export function tierFor(total: number): RollTier {
  if (total >= 10) return "holds";
  if (total >= 7) return "partial";
  return "breaks";
}

/**
 * Demo-only; the real surface gets its dice from the server. Flat 2d6 —
 * the dice are a shared dramatic device, identical odds for everyone
 * (audit D1).
 */
export function rollDice(): RollResult {
  const die = () => 1 + Math.floor(Math.random() * 6);
  const dice: [number, number] = [die(), die()];
  const total = dice[0] + dice[1];
  return { dice, modifier: 0, total, tier: tierFor(total) };
}

/** The stamp on the slip, in the written hand. Prefixed by "<total> — ",
 *  so the partial tier uses a comma to avoid a double em-dash. */
export const TIER_STAMP: Record<RollTier, string> = {
  holds: "it holds.",
  partial: "it holds, at a price.",
  breaks: "it breaks.",
};

export const TIER_TEXT_CLASS: Record<RollTier, string> = {
  holds: "text-sage",
  partial: "text-amber",
  breaks: "text-rose",
};

/** The one line of set type that joins the story once the slip resolves. */
export function composeSetLine(name: string, r: RollResult): string {
  const mod =
    r.modifier === 0
      ? ""
      : r.modifier > 0
        ? ` + ${r.modifier}`
        : ` − ${Math.abs(r.modifier)}`;
  const tier = {
    holds: "It holds.",
    partial: "It holds — at a price.",
    breaks: "It breaks.",
  }[r.tier];
  return `— ${name} rolled: ${r.dice[0]} + ${r.dice[1]}${mod} = ${r.total}. ${tier}`;
}
