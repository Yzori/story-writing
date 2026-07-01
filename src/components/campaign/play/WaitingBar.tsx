"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

export const REACTIONS = [
  { emoji: "⚔️", label: "Tension", key: "tension" },
  { emoji: "😮", label: "Gasp", key: "gasp" },
  { emoji: "👏", label: "Bravo", key: "bravo" },
  { emoji: "😂", label: "Haha", key: "laugh" },
  { emoji: "💀", label: "Oh no", key: "dread" },
] as const;

interface WaitingBarProps {
  /** "«Kael» is writing…" / "The Director is narrating…" / crossroads status. */
  statusText: string;
  onReaction?: (reactionKey: string) => void;
  /** Hand-raise bid — hidden for the GM and during Crossroads. */
  showHandRaise?: boolean;
  myHandRaised?: boolean;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onViewChat?: () => void;
}

/**
 * The dock for everyone NOT holding the pen — presence + react + bid for the
 * spotlight + table talk, so no one is ever left without actions.
 */
export default function WaitingBar({
  statusText,
  onReaction,
  showHandRaise = false,
  myHandRaised = false,
  onRaiseHand,
  onLowerHand,
  onViewChat,
}: WaitingBarProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="flex min-w-0 flex-1 items-center gap-2 font-serif text-[13px] italic text-text-tertiary">
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber/70 [animation:pulse_1.4s_ease-in-out_infinite]" />
        <span className="truncate">{statusText}</span>
      </p>

      {onReaction && (
        <div className="flex items-center gap-1.5">
          {REACTIONS.map((r) => (
            <motion.button
              key={r.key}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReactionClick(r.key)}
              disabled={reactionCooldown}
              title={r.label}
              className={`flex items-center gap-1 rounded-full border border-border bg-subtle/30 px-2.5 py-1.5 transition-all cursor-pointer ${
                reactionCooldown ? "opacity-30 cursor-not-allowed" : "hover:bg-subtle/50 hover:border-border-active"
              }`}
            >
              <span className="text-sm leading-none">{r.emoji}</span>
            </motion.button>
          ))}
        </div>
      )}

      {showHandRaise && onRaiseHand && (
        <button
          type="button"
          onClick={() => (myHandRaised ? onLowerHand?.() : onRaiseHand())}
          title={myHandRaised ? "Lower your hand" : "Ask the Director for the spotlight"}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            myHandRaised
              ? "border-amber/45 bg-amber/15 text-amber"
              : "border-border bg-subtle/20 text-text-secondary hover:border-amber/30 hover:text-amber"
          }`}
        >
          <span className="text-sm leading-none">✋</span>
          {myHandRaised ? "Hand raised" : "Raise hand"}
        </button>
      )}

      {onViewChat && (
        <button
          type="button"
          onClick={onViewChat}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-subtle/20 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
          title="Table talk — out-of-character chat"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
          </svg>
          View chat
        </button>
      )}
    </div>
  );
}
