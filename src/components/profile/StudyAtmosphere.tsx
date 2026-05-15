"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Sunrise, Sunset, Moon } from "lucide-react";

type Phase = "morning" | "day" | "dusk" | "night";

const PHASE_CONFIG = {
  morning: {
    label: "Morning light",
    image: "/dashboard/study-morning.png",
    wash: "from-amber/[0.16] via-void/88 to-void",
    beam: "bg-amber/[0.16]",
    icon: Sunrise,
  },
  day: {
    label: "Day",
    image: "/dashboard/study-afternoon.png",
    wash: "from-sage/[0.12] via-void/90 to-void",
    beam: "bg-sage/[0.12]",
    icon: Sun,
  },
  dusk: {
    label: "Dusk",
    image: "/dashboard/study-night.png",
    wash: "from-rose/[0.11] via-void/88 to-void",
    beam: "bg-amber/[0.14]",
    icon: Sunset,
  },
  night: {
    label: "Night",
    image: "/dashboard/study-night.png",
    wash: "from-lavender/[0.08] via-void/94 to-void",
    beam: "bg-lavender/[0.08]",
    icon: Moon,
  },
} as const;

// Optional warm tint layered over the room so the author's most-written genre
// subtly perfumes the atmosphere.
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

const marginalia = [
  { text: "the pen remembers", className: "left-[6%] top-[28%] -rotate-6" },
  { text: "margin notes", className: "right-[7%] top-[34%] rotate-3" },
  { text: "ink dried here", className: "left-[40%] bottom-[18%] rotate-[-3deg]" },
] as const;

interface StudyAtmosphereProps {
  genre: string | null;
}

export default function StudyAtmosphere({ genre }: StudyAtmosphereProps) {
  const [phase, setPhase] = useState<Phase>(() => phaseFromDate(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setPhase(phaseFromDate(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const config = PHASE_CONFIG[phase];
  const tint = (genre && GENRE_TINT[genre]) || GENRE_TINT.Fantasy;

  return (
    <>
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

        {(phase === "morning" || phase === "day") && (
          <motion.div
            aria-hidden
            className="absolute -left-32 top-0 h-[44rem] w-[70rem] -rotate-12 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.10)_0_2px,transparent_2px_64px)] blur-sm"
            animate={{ opacity: [0.08, 0.18, 0.08], x: [-14, 12, -14] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {phase === "night" && (
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(105deg,rgba(237,232,216,0.55)_0_1px,transparent_1px_22px)]"
            animate={{ y: [0, 24] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        )}

        <motion.div
          aria-hidden
          className={`absolute -left-20 top-0 h-[34rem] w-[56rem] origin-top-left -rotate-12 blur-3xl transition-colors duration-1000 ${config.beam}`}
          animate={{ opacity: [0.14, 0.32, 0.14], x: [-8, 8, -8] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-void via-void/80 to-transparent" />
        <div className="absolute inset-0 opacity-[0.025] mix-blend-screen [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden lg:block">
        {marginalia.map((note, index) => (
          <motion.span
            key={note.text}
            className={`absolute font-display text-sm italic tracking-[0.16em] text-amber/30 ${note.className}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0.12, 0.28, 0.12], y: [8, 0, 8] }}
            transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.9 }}
          >
            {note.text}
          </motion.span>
        ))}
      </div>
    </>
  );
}
