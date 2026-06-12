"use client";

/*
 * The arrival half of a portal dive (see lib/crossing.ts). The door's
 * overlay ends by breaking through into light; this mounts in the
 * destination's very first client render painted with that same light,
 * then lets it fade off the world — finishing the pass-through. Renders
 * nothing when no crossing happened.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { bloomGradient, consumeCrossing, type CrossingBloom } from "@/lib/crossing";

export default function CrossingVeil({ bloom }: { bloom?: CrossingBloom | null }) {
  const reduce = useReducedMotion();
  // prop wins (callers that already consumed the flag); otherwise self-consume
  const [veil, setVeil] = useState<CrossingBloom | null>(() => {
    if (bloom !== undefined) return bloom;
    if (typeof window === "undefined") return null;
    return consumeCrossing();
  });

  if (!veil) return null;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[9500]"
      style={{ background: bloomGradient(veil.rgb) }}
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 0, scale: reduce ? 1 : 1.08 }}
      transition={{ delay: 0.12, duration: reduce ? 0.3 : 0.85, ease: "easeOut" }}
      onAnimationComplete={() => setVeil(null)}
      aria-hidden
    />
  );
}
