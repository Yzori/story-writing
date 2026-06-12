"use client";

import { motion } from "framer-motion";

interface TipEntryProps {
  fromDisplayName: string | null;
  amount: number;
  message: string | null;
}

export default function TipEntry({
  fromDisplayName,
  amount,
  message,
}: TipEntryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 px-3 py-2 bg-gold/5 border border-gold/10 rounded-lg"
    >
      {/* Ink drop icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-gold mt-0.5 flex-shrink-0"
      >
        <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
      </svg>

      <div className="min-w-0">
        <p className="text-xs text-gold">
          <span className="font-medium">{fromDisplayName || "A spectator"}</span>
          {" sent "}
          <span className="font-bold tabular-nums">{amount}</span>
          {" drops of ink"}
        </p>
        {message && (
          <p className="text-[11px] text-text-secondary italic mt-0.5 truncate">
            &ldquo;{message}&rdquo;
          </p>
        )}
      </div>
    </motion.div>
  );
}
