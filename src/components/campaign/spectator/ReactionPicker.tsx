"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

const REACTIONS = [
  { type: "gasped", emoji: "😱", label: "Gasped" },
  { type: "cried", emoji: "😢", label: "Cried" },
  { type: "laughed", emoji: "😂", label: "Laughed" },
  { type: "need-more", emoji: "📜", label: "More!" },
  { type: "saw-it-coming", emoji: "👁", label: "Called it" },
  { type: "heartbroken", emoji: "💔", label: "Heartbroken" },
  { type: "inspired", emoji: "✨", label: "Inspired" },
  { type: "terrified", emoji: "💀", label: "Terrified" },
] as const;

const COOLDOWN_MS = 2_000;

interface ReactionPickerProps {
  onReact: (type: string) => void;
}

export default function ReactionPicker({ onReact }: ReactionPickerProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleReact = (type: string) => {
    if (cooldowns[type]) return;

    onReact(type);
    setCooldowns((prev) => ({ ...prev, [type]: true }));

    timersRef.current[type] = setTimeout(() => {
      setCooldowns((prev) => ({ ...prev, [type]: false }));
    }, COOLDOWN_MS);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-void/70 backdrop-blur-xl border border-border/30 rounded-full"
    >
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          onClick={() => handleReact(r.type)}
          disabled={cooldowns[r.type]}
          title={r.label}
          className={`group relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all
            ${
              cooldowns[r.type]
                ? "opacity-40 cursor-not-allowed scale-90"
                : "hover:bg-surface/60 hover:scale-110 active:scale-95 cursor-pointer"
            }`}
        >
          <span className="text-lg sm:text-xl leading-none select-none">{r.emoji}</span>
          <span className="hidden sm:block text-[9px] text-text-ghost leading-none">
            {r.label}
          </span>

          {/* Cooldown ring */}
          {cooldowns[r.type] && (
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: COOLDOWN_MS / 1000 }}
              className="absolute inset-0 rounded-lg border border-gold/30"
            />
          )}
        </button>
      ))}
    </motion.div>
  );
}
