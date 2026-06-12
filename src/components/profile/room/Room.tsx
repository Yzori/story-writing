"use client";

import { createContext, useContext, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

// ── Parallax ────────────────────────────────────────────────
// The pointer is a slow draught through the room: zones drift a few pixels
// against it, scaled by their depth. Furniture near the walls moves least.

const ParallaxContext = createContext<{
  mx: MotionValue<number>;
  my: MotionValue<number>;
} | null>(null);

export function useRoomParallax(depth: number) {
  const ctx = useContext(ParallaxContext);
  const fallbackX = useMotionValue(0);
  const fallbackY = useMotionValue(0);
  const mx = ctx?.mx ?? fallbackX;
  const my = ctx?.my ?? fallbackY;
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return { x, y };
}

/** A zone's caption, written small on the room's surface. */
export function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.28em] text-amber/80">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-amber/25 to-transparent" />
    </div>
  );
}

interface RoomProps {
  children: React.ReactNode;
}

/**
 * The Composed Room: one continuous scene instead of a feed. Zones —
 * shelves, desk, side table, correspondence — sit on a shared surface
 * under a lamplight pool, with pointer parallax for depth.
 */
export default function Room({ children }: RoomProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 50, damping: 20 });
  const my = useSpring(rawY, { stiffness: 50, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  return (
    <ParallaxContext.Provider value={{ mx, my }}>
      <motion.section
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          rawX.set(0);
          rawY.set(0);
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mx-auto mt-10 max-w-6xl px-5 lg:px-8"
      >
        {/* Height follows content, capped by the viewport — a sparse study
            is a small room, not a cavern. Zones clip only past the cap. */}
        <div className="relative flex max-h-[calc(100svh-5.5rem)] flex-col overflow-hidden rounded-[2rem] border border-border bg-surface/55 shadow-[var(--t-shadow-modal)] backdrop-blur-xl">
          {/* Lamplight pool over the desk */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[38%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(226,172,74,0.10)_0%,rgba(226,172,74,0.04)_45%,transparent_70%)]"
          />
          {/* Faint second lamp by the side table */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-[40%] h-72 w-72 rounded-full bg-amber/[0.05] blur-3xl"
          />
          {/* Vignette so the corners fall into shadow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_45%_30%,transparent_45%,rgba(2,4,9,0.35)_100%)]"
          />

          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </motion.section>
    </ParallaxContext.Provider>
  );
}
