"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";
import {
  TIER_STAMP,
  TIER_TEXT_CLASS,
  type RollResult,
  type RollSlipMeta,
} from "./rolls";

/**
 * A roll is a printed slip at the live edge of the page — the ask and both
 * stakes above, the bones beside. Only the named player can roll; everyone
 * else watches the same slip. When the dice settle the result stamps here,
 * holds a beat, then the slip leaves the page and one line of set type
 * joins the story (the Open Book's law: mechanics never touch history).
 */

const PIP_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
  3: [{ x: 24, y: 24 }, { x: 50, y: 50 }, { x: 76, y: 76 }],
  4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
  5: [{ x: 24, y: 24 }, { x: 76, y: 24 }, { x: 50, y: 50 }, { x: 24, y: 76 }, { x: 76, y: 76 }],
  6: [{ x: 28, y: 26 }, { x: 72, y: 26 }, { x: 28, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 74 }, { x: 72, y: 74 }],
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Die({
  value,
  tumbling,
  tilt,
}: {
  value: number;
  tumbling: boolean;
  tilt: number;
}) {
  const pips = PIP_LAYOUTS[value] ?? [];
  return (
    <span
      className={`relative inline-block h-10 w-10 rounded-[8px] ${tumbling ? "die-tumbling" : ""}`}
      style={{
        transform: tumbling ? undefined : `rotate(${tilt}deg)`,
        background: "linear-gradient(145deg, #f4ecd8 0%, #e3d7ba 55%, #cfc19d 100%)",
        boxShadow:
          "0 4px 10px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(120,100,60,0.3)",
      }}
      aria-hidden="true"
    >
      {pips.map((pip, i) => (
        <span
          key={i}
          className="absolute h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${pip.x}%`,
            top: `${pip.y}%`,
            background: "radial-gradient(circle at 35% 30%, #3a3630, #17140f)",
          }}
        />
      ))}
    </span>
  );
}

type Phase = "waiting" | "casting" | "revealed";

const MIN_CAST_MS = 1400;
const RESULT_HOLD_MS = 2600;

export default function DiceSlip({
  meta,
  characters,
  allPlayerUserIds,
  canRoll,
  onRoll,
  onSettled,
  onCallOff,
}: {
  meta: RollSlipMeta;
  characters: PlayerCharacter[];
  allPlayerUserIds: string[];
  /** True for the named player only. */
  canRoll: boolean;
  /** Produce the result — server-authoritative on the real surface. */
  onRoll: () => Promise<RollResult> | RollResult;
  /** The result has been read; time to settle it into set type. */
  onSettled: (result: RollResult) => void;
  /** The Director takes the call back — a stale slip must never deadlock the page. */
  onCallOff?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [faces, setFaces] = useState<[number, number]>([5, 3]);
  const [result, setResult] = useState<RollResult | null>(null);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  const target = characters.find((c) => c.userId === meta.targetUserId) ?? null;
  const targetName = target?.name.split(" ")[0] ?? "someone";
  const targetInk = getPlayerInk(meta.targetUserId, allPlayerUserIds);

  // The tumble: faces churn while the bones are in the air.
  useEffect(() => {
    if (phase !== "casting" || prefersReducedMotion()) return;
    const id = setInterval(
      () =>
        setFaces([
          1 + Math.floor(Math.random() * 6),
          1 + Math.floor(Math.random() * 6),
        ]),
      90,
    );
    return () => clearInterval(id);
  }, [phase]);

  const cast = async () => {
    if (phase !== "waiting") return;
    setPhase("casting");
    try {
      const [r] = await Promise.all([
        Promise.resolve(onRoll()),
        new Promise((resolve) =>
          setTimeout(resolve, prefersReducedMotion() ? 200 : MIN_CAST_MS),
        ),
      ]);
      setFaces(r.dice);
      setResult(r);
      setPhase("revealed");
    } catch {
      setPhase("waiting");
    }
  };

  // Hold the stamp long enough to read, then let the page absorb it.
  useEffect(() => {
    if (phase !== "revealed" || !result) return;
    const t = setTimeout(
      () => onSettledRef.current(result),
      prefersReducedMotion() ? 900 : RESULT_HOLD_MS,
    );
    return () => clearTimeout(t);
  }, [phase, result]);

  // Once the dice have spoken, the stake that didn't happen fades.
  const dimmed = (line: "holds" | "breaks") =>
    result &&
    ((line === "holds" && result.tier === "breaks") ||
      (line === "breaks" && result.tier !== "breaks"))
      ? "opacity-30"
      : "";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-amber/25 bg-amber/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex-1">
        <p className="font-reading text-[15px] italic leading-relaxed text-paper/90">
          {meta.reason}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
          <span className="font-semibold" style={{ color: targetInk }}>
            {targetName}
          </span>{" "}
          rolls {meta.attribute}
          {meta.fatal && <span className="ml-2 font-bold text-rose">⚠ fatal stakes</span>}
        </p>
        {meta.onSuccess && (
          <p
            className={`mt-2 font-reading text-[13px] italic leading-snug text-text-secondary transition-opacity ${dimmed("holds")}`}
          >
            <span className="mr-1 font-mono text-[9.5px] font-bold uppercase not-italic tracking-[0.14em] text-sage">
              holds
            </span>
            · {meta.onSuccess}
          </p>
        )}
        {meta.onFailure && (
          <p
            className={`mt-1 font-reading text-[13px] italic leading-snug text-text-secondary transition-opacity ${dimmed("breaks")}`}
          >
            <span className="mr-1 font-mono text-[9.5px] font-bold uppercase not-italic tracking-[0.14em] text-rose">
              breaks
            </span>
            · {meta.onFailure}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <Die value={faces[0]} tumbling={phase === "casting"} tilt={-7} />
        <Die value={faces[1]} tumbling={phase === "casting"} tilt={9} />

        {phase === "waiting" &&
          (canRoll ? (
            <button
              type="button"
              onClick={() => void cast()}
              className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            >
              Roll
            </button>
          ) : (
            <span className="flex flex-col items-start gap-1">
              <span className="table-murmur">
                the dice are with{" "}
                <span className="font-semibold not-italic" style={{ color: targetInk }}>
                  {targetName}
                </span>
              </span>
              {onCallOff && (
                <button
                  type="button"
                  onClick={onCallOff}
                  className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Call it off
                </button>
              )}
            </span>
          ))}

        {phase === "revealed" && result && (
          <span role="status" className="flex flex-col">
            <span
              className={`hand-note text-[20px] leading-tight ${TIER_TEXT_CLASS[result.tier]}`}
            >
              {result.total} — {TIER_STAMP[result.tier]}
            </span>
            <span className="font-mono text-[10px] text-text-tertiary">
              {result.dice[0]} + {result.dice[1]}
              {result.modifier !== 0 &&
                ` ${result.modifier > 0 ? "+" : "−"} ${Math.abs(result.modifier)}`}{" "}
              = {result.total}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
