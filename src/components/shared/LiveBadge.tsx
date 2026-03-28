"use client";

import { motion } from "framer-motion";

interface LiveBadgeProps {
  spectatorCount?: number;
  size?: "sm" | "md";
  className?: string;
}

export default function LiveBadge({
  spectatorCount,
  size = "md",
  className = "",
}: LiveBadgeProps) {
  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-rose/10 border border-rose/20 backdrop-blur-sm rounded-full ${
        isSm ? "px-2 py-0.5" : "px-2.5 py-1"
      } ${className}`}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose/60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose" />
      </span>

      <span
        className={`uppercase tracking-wider font-bold text-rose ${
          isSm ? "text-[9px]" : "text-[11px]"
        }`}
      >
        LIVE
      </span>

      {spectatorCount !== undefined && spectatorCount > 0 && (
        <>
          <span className={`text-rose/40 ${isSm ? "text-[8px]" : "text-[10px]"}`}>
            &middot;
          </span>
          <motion.span
            key={spectatorCount}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-rose/70 tabular-nums ${
              isSm ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {spectatorCount} watching
          </motion.span>
        </>
      )}
    </div>
  );
}
