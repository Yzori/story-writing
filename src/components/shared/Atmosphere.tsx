"use client";

/*
 * Shared ambience from the homepage film — the drifting gold dust and the
 * grain. The same ink that carries the anon homepage follows members into
 * the studio, so the world doesn't change material at the login door.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface MotesProps {
  count?: number;
  seed?: number;
  /** dial the dust down on utility screens (1 = film strength) */
  opacityScale?: number;
  zClass?: string;
}

export function Motes({ count = 22, seed = 91, opacityScale = 1, zClass = "z-[5]" }: MotesProps) {
  const reduce = useReducedMotion();
  const motes = useMemo(() => {
    const rand = seededRandom(seed);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      startY: 80 + rand() * 30,
      size: 1.5 + rand() * 2.5,
      duration: 10 + rand() * 14,
      delay: rand() * 12,
      drift: (rand() - 0.5) * 30,
      opacity: (0.12 + rand() * 0.35) * opacityScale,
    }));
  }, [count, seed, opacityScale]);

  if (reduce) return null;
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${zClass}`} aria-hidden>
      {motes.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full bg-gold-light"
          style={{
            width: m.size,
            height: m.size,
            left: `${m.x}%`,
            filter: m.size > 3 ? "blur(1px)" : undefined,
          }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 110}vh`,
            x: [0, m.drift, m.drift * 0.4, 0],
            opacity: [0, m.opacity, m.opacity * 0.5, m.opacity, 0],
          }}
          transition={{ duration: m.duration, repeat: Infinity, delay: m.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export function Grain({ opacityClass = "opacity-[0.04]", zClass = "z-[60]" }: { opacityClass?: string; zClass?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 ${zClass} ${opacityClass} bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:128px_128px]`}
    />
  );
}
