"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlayerCharacter } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import DirectorRituals, { type RitualFocus } from "@/components/campaign/manuscript/DirectorMoves";

const MOVES: ReadonlyArray<{ label: string; hint: string; icon: string; focus: RitualFocus }> = [
  { label: "Story moment", hint: "a held, full-bleed beat", icon: "✦", focus: "story" },
  { label: "Scene break", hint: "cut, move time on", icon: "⁂", focus: "scene" },
  { label: "Pressure", hint: "tick the scene clock", icon: "⛓", focus: "pressure" },
  { label: "Call a roll", hint: "let the dice decide", icon: "⚀", focus: "roll" },
  { label: "Bargain", hint: "a price for a gain", icon: "⚖", focus: "bargain" },
  { label: "Illustration", hint: "an image on the page", icon: "▦", focus: "illustration" },
];

interface DirectRowProps {
  activeChars: PlayerCharacter[];
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
  onPushEvent: (content: string) => void;
  onSceneBreak?: (title: string, mood: string, aspects?: string[]) => void;
  onStoryMoment?: (
    text: string,
    mood: string,
    subtext?: string,
    options?: { importance?: "normal" | "major"; leavesMark?: boolean },
  ) => void;
  onAddIllustration?: (imageUrl: string, caption?: string) => void;
  onOfferBargain?: (body: { targetUserId: string; targetLabel: string; gain: string; price: string }) => Promise<void> | void;
  clocks?: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
  /** "Open the floor" — the Crossroads form is a page-level modal. */
  onOpenFloor: () => void;
  /** Interim: opens the cast/clock management drawer (rail v2 replaces it). */
  onOpenCast?: () => void;
}

/**
 * The Director's stage moves — a labeled row IN the dock, replacing the old
 * floating "Direct ✦" fan. Every move is visible at all times (the audit's
 * "unclarity of options" root cause was a single-glyph summoner); selecting
 * one opens its focused ritual as a popover above the row.
 */
export default function DirectRow({
  activeChars,
  onRequestRoll,
  onPushEvent,
  onSceneBreak,
  onStoryMoment,
  onAddIllustration,
  onOfferBargain,
  clocks = [],
  onClocksChange,
  onOpenFloor,
  onOpenCast,
}: DirectRowProps) {
  const [focus, setFocus] = useState<RitualFocus | null>(null);

  return (
    <div className="relative">
      {/* The focused ritual — a popover held above the row */}
      <AnimatePresence>
        {focus && (
          <motion.div
            key={focus}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="absolute bottom-full left-0 z-30 mb-3 max-h-[62dvh] w-[min(440px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-amber/25 bg-gradient-to-b from-elevated/97 to-ink/97 p-5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin]"
          >
            <DirectorRituals
              focus={focus}
              onClose={() => setFocus(null)}
              activeChars={activeChars}
              onRequestRoll={onRequestRoll}
              onPushEvent={onPushEvent}
              onSceneBreak={onSceneBreak}
              onStoryMoment={onStoryMoment}
              onAddIllustration={onAddIllustration}
              onOfferBargain={onOfferBargain}
              clocks={clocks}
              onClocksChange={onClocksChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        <span
          className="mr-1 hidden shrink-0 select-none items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber/60 md:flex"
          title="The Director's hand — your stage moves"
        >
          <span className="text-[11px]">✦</span> Direct
        </span>

        {MOVES.map((m) => (
          <button
            key={m.focus}
            type="button"
            onClick={() => setFocus((cur) => (cur === m.focus ? null : m.focus))}
            title={m.hint}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              focus === m.focus
                ? "border-amber/50 bg-amber/15 text-amber"
                : "border-amber/20 bg-gradient-to-b from-elevated/80 to-ink/80 text-text-secondary hover:border-amber/45 hover:text-amber"
            }`}
          >
            <span className="text-[12px] leading-none text-amber/80">{m.icon}</span>
            {m.label}
          </button>
        ))}

        {/* Crossroads — hand the beat to the house */}
        <button
          type="button"
          onClick={() => {
            setFocus(null);
            onOpenFloor();
          }}
          title="Let the house decide"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender/[0.06] px-3 py-1.5 text-[11px] text-lavender/90 transition-colors hover:border-lavender/50 hover:text-lavender"
        >
          <span className="text-[12px] leading-none">☍</span>
          Open the floor
        </button>

        {onOpenCast && (
          <button
            type="button"
            onClick={() => {
              setFocus(null);
              onOpenCast();
            }}
            title="The cast & its pressure"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-subtle/20 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
          >
            <span className="text-[12px] leading-none">☰</span>
            Cast
          </button>
        )}
      </div>
    </div>
  );
}
