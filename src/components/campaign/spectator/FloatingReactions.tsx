"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SpectatorReaction } from "@/hooks/use-spectator-reactions";

const EMOJI_MAP: Record<string, string> = {
  gasped: "😱",
  cried: "😢",
  laughed: "😂",
  "need-more": "📜",
  "saw-it-coming": "👁",
  heartbroken: "💔",
  inspired: "✨",
  terrified: "💀",
};

interface FloatingReactionsProps {
  reactions: SpectatorReaction[];
}

export default function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      <AnimatePresence>
        {reactions.map((r) => {
          // Deterministic but varied horizontal position based on id
          const hash = r.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const xPercent = 10 + (hash % 80);
          const drift = ((hash % 60) - 30); // -30 to +30 px horizontal drift

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0, x: drift, scale: 0.5 }}
              animate={{ opacity: 0, y: -280, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.5 + (hash % 10) / 10,
                ease: "easeOut",
              }}
              style={{ left: `${xPercent}%`, bottom: "60px", position: "absolute" }}
              className="text-2xl sm:text-3xl select-none"
            >
              {EMOJI_MAP[r.type] || "✨"}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
