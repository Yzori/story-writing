"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export const REACTION_EMOJI_MAP: Record<string, string> = {
  tension: "⚔️",
  gasp: "😮",
  bravo: "👏",
  laugh: "😂",
  dread: "💀",
};

/**
 * The audience at the edge of the light: glimmer dots for everyone watching
 * from the dark, and reaction wisps drifting up over the page's head. Each
 * reaction id floats exactly once (ported from StoryStage's float-once set).
 */
export default function TableWhispers({
  houseCount = 0,
  reactionFloats,
}: {
  /** Spectators in the dark (presence poll). */
  houseCount?: number;
  /** Every reaction to float — incoming + the user's own clicks. */
  reactionFloats?: Array<{ id: string; type: string }>;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [wisps, setWisps] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const floatedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!reactionFloats?.length) return;
    const fresh = reactionFloats.filter((r) => !floatedIdsRef.current.has(r.id));
    if (fresh.length === 0) return;
    setWisps((prev) => [
      ...prev,
      ...fresh.map((r) => {
        floatedIdsRef.current.add(r.id);
        return {
          id: `wisp-${r.id}`,
          emoji: REACTION_EMOJI_MAP[r.type] ?? "✨",
          x: 25 + Math.random() * 50,
        };
      }),
    ]);
  }, [reactionFloats]);

  const removeWisp = useCallback((id: string) => {
    setWisps((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const glimmers = Math.min(houseCount, 12);

  return (
    <div className="relative h-10">
      {/* Glimmers in the dark. */}
      {glimmers > 0 && (
        <div
          className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-2"
          title={`${houseCount} in the dark`}
        >
          {Array.from({ length: glimmers }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-amber/50"
              style={{
                boxShadow: "0 0 6px rgba(226,172,74,0.5)",
                animation: reducedMotion ? undefined : `flicker ${1.4 + (i % 5) * 0.3}s ease-in-out infinite`,
              }}
            />
          ))}
          <span className="ml-1 text-[10px] uppercase tracking-[0.14em] text-text-ghost">{houseCount} in the dark</span>
        </div>
      )}

      {/* Reaction wisps rise from the page's head. */}
      <AnimatePresence>
        {wisps.map((wisp) => (
          <motion.span
            key={wisp.id}
            initial={{ opacity: 1, y: 24, scale: 0.6 }}
            animate={{ opacity: 0, y: reducedMotion ? 24 : -40, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.6 : 2, ease: "easeOut" }}
            onAnimationComplete={() => removeWisp(wisp.id)}
            className="pointer-events-none absolute top-4 select-none text-2xl"
            style={{ left: `${wisp.x}%` }}
          >
            {wisp.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
