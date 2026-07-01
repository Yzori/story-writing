"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * First-run coaching as notes from the binder — hand-written slips with a
 * wax Got-it seal, gated by localStorage. The player slip pins near the end
 * of the page (where the caret will live); the GM slip pins to the station.
 */
const KEYS = {
  player: "quiloria.manuscript.coach.player",
  gm: "quiloria.manuscript.coach.gm",
} as const;

// The old dock coach key counts as seen — don't re-teach cutover users.
const LEGACY_PLAYER_KEY = "quiloria.player.coachSeen";

export function useCoachSlip(kind: keyof typeof KEYS) {
  const [seen, setSeen] = useState(true); // default true so SSR never flashes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const already =
          localStorage.getItem(KEYS[kind]) === "1" ||
          (kind === "player" && localStorage.getItem(LEGACY_PLAYER_KEY) === "1");
        setSeen(already);
      } catch {
        /* storage blocked — skip the coach */
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [kind]);
  const dismiss = useCallback(() => {
    setSeen(true);
    try {
      localStorage.setItem(KEYS[kind], "1");
    } catch {
      /* ignore */
    }
  }, [kind]);
  return { show: !seen, dismiss };
}

export function CoachSlip({
  show,
  onDismiss,
  title,
  children,
}: {
  show: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          exit={{ opacity: 0, y: 8 }}
          className="relative mb-3 rounded-md border border-amber/30 bg-gradient-to-b from-amber/[0.10] to-elevated/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
        >
          <p className="hand-note text-amber">{title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{children}</p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
