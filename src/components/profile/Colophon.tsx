"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/format";

interface ColophonProps {
  storyCount: number;
  totalWords: number;
  totalSparks: number;
  topGenre: string | null;
  memberSince: string;
}


export default function Colophon({
  storyCount,
  totalWords,
  totalSparks,
  topGenre,
  memberSince,
}: ColophonProps) {
  const date = new Date(memberSince);
  const monthYear = date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const lines = [
    storyCount > 0 ? `${storyCount} ${storyCount === 1 ? "story" : "stories"} published` : null,
    totalWords > 0 ? `${formatNumber(totalWords)} words written` : null,
    totalSparks > 0 ? `${formatNumber(totalSparks)} sparks received` : null,
    topGenre ? `Most at home in ${topGenre}` : null,
    `Writing since ${monthYear}`,
  ].filter(Boolean);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="max-w-3xl mx-auto px-6 py-20 text-center"
    >
      <p className="font-mono text-text-ghost text-[14px] mb-6 select-none">
        &#8258;
      </p>
      <div className="space-y-1.5">
        {lines.map((line) => (
          <p key={line} className="font-mono text-[11px] text-text-ghost tracking-wide">
            {line}
          </p>
        ))}
      </div>
      <p className="font-mono text-text-ghost text-[14px] mt-6 select-none">
        &#8258;
      </p>
    </motion.section>
  );
}
