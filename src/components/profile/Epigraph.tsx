"use client";

import { motion } from "framer-motion";

interface EpigraphProps {
  bio: string | null;
  displayName: string;
}

export default function Epigraph({ bio, displayName }: EpigraphProps) {
  if (!bio) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="max-w-xl mx-auto text-center px-6 py-12"
    >
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-border-active to-transparent mx-auto mb-8" />
      <p className="font-reading italic text-text-secondary text-base leading-[1.9]">
        {bio}
      </p>
      <p className="font-display text-[13px] text-text-ghost mt-6">
        &mdash; {displayName}
      </p>
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-border-active to-transparent mx-auto mt-8" />
    </motion.section>
  );
}
