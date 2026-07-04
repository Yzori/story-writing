"use client";

import { motion } from "framer-motion";

/**
 * The pen, made visible — a nib glowing in the current writer's ink,
 * sitting beside their name on the signature line. One instance exists at
 * a time; when the pen passes, the shared layoutId lets it glide along the
 * table to the next hand (Concept III's one theatre moment).
 */
export default function PenMark({ ink }: { ink: string }) {
  return (
    <motion.span
      layoutId="traveling-pen"
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="pen-mark"
      style={{ color: ink }}
      aria-hidden="true"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.9 3.1c-4 .5-8.9 2.5-11.9 5.5-2.1 2.1-3.8 5-4.7 7.6l-2 5.3 1.2 1.2 5.3-2c2.6-.9 5.5-2.6 7.6-4.7 3-3 5-7.9 5.5-11.9l-1-1zM9.8 14.2l.9.9-4.2 4.2-.6-.3-.3-.6 4.2-4.2z" />
      </svg>
    </motion.span>
  );
}
