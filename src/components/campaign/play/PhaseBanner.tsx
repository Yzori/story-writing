"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PhaseState, PhaseKey } from "@/lib/campaign-play-derive";

// Each phase gets a glyph + ink so the table reads the state at a glance.
const PHASE_STYLE: Record<PhaseKey, { glyph: string; text: string; chip: string }> = {
  draft: { glyph: "◦", text: "text-text-secondary", chip: "border-border bg-subtle/20" },
  ended: { glyph: "❦", text: "text-text-secondary", chip: "border-border bg-subtle/20" },
  director: { glyph: "✦", text: "text-amber", chip: "border-amber/30 bg-amber/[0.07]" },
  spotlight: { glyph: "✍", text: "text-amber", chip: "border-amber/35 bg-amber/[0.10]" },
  check: { glyph: "⚀", text: "text-amber", chip: "border-amber/40 bg-amber/[0.12]" },
  crossroads_open: { glyph: "☍", text: "text-lavender", chip: "border-lavender/35 bg-lavender/10" },
  crossroads_voting: { glyph: "☍", text: "text-lavender", chip: "border-lavender/35 bg-lavender/10" },
  crossroads_closed: { glyph: "☍", text: "text-lavender", chip: "border-lavender/35 bg-lavender/10" },
};

// Mood-tinted inks for the scene aspect pills (moved from StoryCanvas).
const ASPECT_MOOD_COLORS: Record<string, string> = {
  tense: "border-rose/30 text-rose/60",
  calm: "border-sage/30 text-sage/60",
  ominous: "border-violet/30 text-violet/60",
  triumphant: "border-amber/30 text-amber/60",
  melancholy: "border-indigo-400/30 text-indigo-400/60",
  chaotic: "border-orange-400/30 text-orange-400/60",
  mysterious: "border-cyan-400/30 text-cyan-400/60",
  romantic: "border-pink-400/30 text-pink-400/60",
};

interface PhaseBannerProps {
  phase: PhaseState;
  sceneMood: string;
  sceneAspects: string[];
  /** The Acting-GM continuity strip (D2) — rendered as the banner's tail. */
  actingGmSlot?: ReactNode;
}

/**
 * The table's state, said out loud — who holds the pen, what everyone is
 * waiting on. First-class, not a truncated header whisper.
 */
export default function PhaseBanner({
  phase,
  sceneMood,
  sceneAspects,
  actingGmSlot,
}: PhaseBannerProps) {
  const style = PHASE_STYLE[phase.key] ?? PHASE_STYLE.director;

  return (
    <div className="border-b border-border bg-gradient-to-b from-ink/70 to-transparent">
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-5">
        {/* Phase chip */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={phase.key + phase.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 ${style.chip}`}
          >
            <span className={`text-[11px] leading-none ${style.text}`} aria-hidden>
              {style.glyph}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${style.text}`}>
              {phase.label}
            </span>
          </motion.span>
        </AnimatePresence>

        {/* Hint — what the table is waiting on */}
        <p
          className="min-w-0 flex-1 truncate text-[12px] text-text-secondary"
          aria-live="polite"
        >
          {phase.hint}
        </p>

        {/* Scene aspects — the truths in play right now */}
        {sceneAspects.length > 0 && (
          <div className="hidden items-center gap-1.5 md:flex">
            {sceneAspects.map((aspect) => (
              <span
                key={aspect}
                className={`rounded-full border bg-black/25 px-2.5 py-0.5 font-serif text-[10px] italic backdrop-blur-sm ${
                  ASPECT_MOOD_COLORS[sceneMood] ?? "border-border-active text-text-tertiary"
                }`}
              >
                {aspect}
              </span>
            ))}
          </div>
        )}

        {actingGmSlot && <div className="shrink-0">{actingGmSlot}</div>}
      </div>
    </div>
  );
}
