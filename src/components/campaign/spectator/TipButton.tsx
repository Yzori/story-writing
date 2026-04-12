"use client";

import { motion } from "framer-motion";

interface TipButtonProps {
  balance: number | null;
  onClick: () => void;
}

export default function TipButton({ balance, onClick }: TipButtonProps) {
  // Only show for authenticated users (balance !== null)
  if (balance === null) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 border border-gold/20 backdrop-blur-sm rounded-full hover:bg-gold/20 transition-colors cursor-pointer"
    >
      {/* Ink drop icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-gold"
      >
        <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
      </svg>

      <span className="text-[11px] font-medium text-gold tabular-nums">
        {balance}
      </span>
    </motion.button>
  );
}
