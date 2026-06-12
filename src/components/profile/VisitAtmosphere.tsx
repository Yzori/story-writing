"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Phase = "morning" | "day" | "dusk" | "night";

const PHASE_CONFIG = {
  morning: {
    image: "/dashboard/study-morning.png",
    wash: "from-amber/[0.14] via-void/88 to-void",
    beam: "bg-amber/[0.15]",
  },
  day: {
    image: "/dashboard/study-afternoon.png",
    wash: "from-sage/[0.10] via-void/90 to-void",
    beam: "bg-sage/[0.11]",
  },
  dusk: {
    image: "/dashboard/study-night.png",
    wash: "from-rose/[0.10] via-void/88 to-void",
    beam: "bg-amber/[0.13]",
  },
  night: {
    image: "/dashboard/study-night.png",
    wash: "from-lavender/[0.07] via-void/94 to-void",
    beam: "bg-lavender/[0.07]",
  },
} as const;

const GENRE_TINT: Record<string, string> = {
  Fantasy: "from-amber/[0.06] via-transparent to-transparent",
  "Science Fiction": "from-lavender/[0.06] via-transparent to-transparent",
  Romance: "from-rose/[0.06] via-transparent to-transparent",
  Mystery: "from-violet/[0.05] via-transparent to-transparent",
  Thriller: "from-rose/[0.05] via-transparent to-transparent",
  Horror: "from-rose/[0.06] via-transparent to-transparent",
  Adventure: "from-teal/[0.06] via-transparent to-transparent",
  Contemporary: "from-sage/[0.06] via-transparent to-transparent",
};

function phaseFromDate(date: Date): Phase {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

interface VisitAtmosphereProps {
  genre: string | null;
  /**
   * 0..1 — how many candles are burning at this study. The room itself
   * warms: a visited writer's profile glows gold from the lower hearth.
   */
  warmth: number;
}

export default function VisitAtmosphere({ genre, warmth }: VisitAtmosphereProps) {
  const [phase, setPhase] = useState<Phase>(() => phaseFromDate(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setPhase(phaseFromDate(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const config = PHASE_CONFIG[phase];
  const tint = (genre && GENRE_TINT[genre]) || GENRE_TINT.Fantasy;
  const clamped = Math.max(0, Math.min(1, warmth));

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-70 saturate-[0.9] transition-opacity duration-1000"
        style={{
          backgroundImage: `url('${config.image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className={`absolute inset-0 bg-gradient-to-b transition-colors duration-1000 ${config.wash}`} />
      <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
      <div className="absolute inset-0 bg-gradient-to-r from-void/88 via-void/46 to-void/86" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,transparent_0%,transparent_36%,var(--t-void)_90%)] opacity-55" />

      {/* Window light */}
      <motion.div
        aria-hidden
        className={`absolute -left-20 top-0 h-[34rem] w-[56rem] origin-top-left -rotate-12 blur-3xl transition-colors duration-1000 ${config.beam}`}
        animate={{ opacity: [0.14, 0.3, 0.14], x: [-8, 8, -8] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The hearth — candle warmth rising from below, scaled to how many
          visitors have lit candles. An unvisited room stays cool. */}
      {clamped > 0 && (
        <>
          <motion.div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[42vh] bg-[radial-gradient(ellipse_at_50%_115%,rgba(226,172,74,0.5)_0%,rgba(226,172,74,0.12)_45%,transparent_72%)]"
            animate={{ opacity: [0.5 * clamped, 0.9 * clamped, 0.5 * clamped] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[-6rem] left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-amber/20 blur-3xl"
            animate={{ opacity: [0.3 * clamped, 0.6 * clamped, 0.3 * clamped], scale: [1, 1.06, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-void via-void/80 to-transparent" />
      <div className="absolute inset-0 opacity-[0.025] mix-blend-screen [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  );
}
