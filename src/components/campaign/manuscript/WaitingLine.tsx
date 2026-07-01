"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";

// The table's five whispers — keys match REACTION_EMOJI_MAP in TableWhispers
// and the reactions API's accepted types.
const REACTIONS = [
  { emoji: "⚔️", label: "Tension", key: "tension" },
  { emoji: "😮", label: "Gasp", key: "gasp" },
  { emoji: "👏", label: "Bravo", key: "bravo" },
  { emoji: "😂", label: "Haha", key: "laugh" },
  { emoji: "💀", label: "Oh no", key: "dread" },
] as const;

/**
 * The end of the page when the pen is elsewhere: a hand-written line saying
 * whose ink flows next, with the two gestures a waiting player always has —
 * whisper (react) and reach for the page (raise a hand). Both are visible,
 * labeled marks; nothing hides behind hover.
 */
export default function WaitingLine({
  penHolderName,
  directorWriting,
  onReaction,
  showHandRaise = false,
  myHandRaised = false,
  onRaiseHand,
  onLowerHand,
  rollPending = false,
  rollAttribute,
  rollReason,
  rollFatal = false,
  onOpenDiceRoller,
  goneNotice,
}: {
  penHolderName?: string | null;
  directorWriting?: boolean;
  onReaction?: (reactionKey: string) => void;
  showHandRaise?: boolean;
  myHandRaised?: boolean;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  /** The dice trump the quill — "cast the bones" nudge. */
  rollPending?: boolean;
  rollAttribute?: string | null;
  rollReason?: string | null;
  rollFatal?: boolean;
  onOpenDiceRoller?: () => void;
  /** Dead/retired notice replaces the waiting line entirely. */
  goneNotice?: "dead" | "retired" | null;
}) {
  const [reactionCooldown, setReactionCooldown] = useState(false);
  const handleReactionClick = useCallback(
    (reactionKey: string) => {
      if (reactionCooldown) return;
      onReaction?.(reactionKey);
      setReactionCooldown(true);
      setTimeout(() => setReactionCooldown(false), 2000);
    },
    [reactionCooldown, onReaction],
  );

  if (goneNotice) {
    return (
      <p className="table-murmur text-center">
        {goneNotice === "dead"
          ? "The page falls silent for you — you watch from beyond the light. The story remembers."
          : "Your character has stepped away from the table."}
      </p>
    );
  }

  if (rollPending) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="table-murmur !text-[14px]">
          The dice are waiting — a{" "}
          <strong className="not-italic text-amber">{rollAttribute || "fate"}</strong> check
          {rollFatal && <strong className="ml-1.5 not-italic text-rose">at fatal stakes</strong>}
          {rollReason ? <span> · {rollReason}</span> : null}
        </p>
        {onOpenDiceRoller && (
          <button
            type="button"
            onClick={onOpenDiceRoller}
            className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
          >
            Cast the bones
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      <p className="table-murmur flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber/70 [animation:pulse_1.4s_ease-in-out_infinite]" />
        {directorWriting
          ? "The Director's quill moves…"
          : penHolderName
            ? `The pen is with ${penHolderName}…`
            : "The table waits…"}
      </p>

      {onReaction && (
        <div className="flex items-center gap-1">
          {REACTIONS.map((r) => (
            <motion.button
              key={r.key}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => handleReactionClick(r.key)}
              disabled={reactionCooldown}
              title={r.label}
              className={`cursor-pointer rounded-full px-1.5 py-1 text-sm leading-none transition-all ${
                reactionCooldown ? "cursor-not-allowed opacity-30" : "hover:scale-110"
              }`}
            >
              {r.emoji}
            </motion.button>
          ))}
        </div>
      )}

      {showHandRaise && onRaiseHand && (
        <button
          type="button"
          onClick={() => (myHandRaised ? onLowerHand?.() : onRaiseHand())}
          title={myHandRaised ? "Lower your hand" : "Ask the Director for the pen"}
          className={`table-action flex cursor-pointer items-center gap-1.5 transition-colors ${
            myHandRaised ? "text-amber" : "text-text-tertiary hover:text-amber"
          }`}
        >
          <span aria-hidden="true">✋</span>
          {myHandRaised ? "Hand raised" : "Raise hand"}
        </button>
      )}
    </div>
  );
}
