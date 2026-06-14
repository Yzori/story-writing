"use client";

import { motion, AnimatePresence } from "framer-motion";

type ConsoleFocus = "roll" | "scene" | "story" | "illustration" | "bargain" | "pressure" | null;

interface DirectorsHandProps {
  handOpen: boolean;
  directHintSeen: boolean;
  /** Toggle the fan open/closed; also records the first-run hint as seen. */
  onToggle: () => void;
  /** "Open the floor" gesture — closes the fan and opens the Crossroads form. */
  onOpenFloor: () => void;
  /** A console gesture — closes the fan and opens the Director Console at `focus`. */
  onConsoleGesture: (focus: ConsoleFocus) => void;
}

/**
 * The Director's hand — GM-only floating summoner for stage-gestures. The fan is
 * the discoverable affordance; each gesture opens the Director Console (or the
 * floor form) where its ritual lives. Presentational — state + handlers live in
 * the play page. Lifted verbatim to slim the page.
 */
export default function DirectorsHand({
  handOpen,
  directHintSeen,
  onToggle,
  onOpenFloor,
  onConsoleGesture,
}: DirectorsHandProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-44 z-30 px-3 sm:bottom-48 sm:px-6">
      <div className="pointer-events-none mx-auto flex max-w-5xl flex-col items-end gap-2">
        <AnimatePresence>
          {handOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="pointer-events-auto flex w-60 flex-col items-stretch gap-2"
            >
              <button
                type="button"
                onClick={onOpenFloor}
                className="group flex items-center gap-3 rounded-2xl border border-amber/45 bg-gradient-to-b from-amber/[0.10] to-ink/95 px-4 py-2.5 text-left shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:border-amber/70"
              >
                <span className="w-4 text-center text-sm text-amber">☍</span>
                <span className="leading-tight">
                  <span className="block text-[12.5px] text-amber">Open the floor</span>
                  <span className="block text-[9px] text-text-ghost">let the house decide</span>
                </span>
              </button>
              {([
                { label: "Story moment", hint: "a held, full-bleed beat", icon: "✦", focus: "story" },
                { label: "Scene break", hint: "cut, move time on", icon: "⁂", focus: "scene" },
                { label: "Raise the pressure", hint: "tick the scene clock", icon: "⛓", focus: "pressure" },
                { label: "Call a roll", hint: "let the dice decide", icon: "⚀", focus: "roll" },
                { label: "Offer a bargain", hint: "a price for a gain", icon: "⚖", focus: "bargain" },
                { label: "Illustration", hint: "drop an image into the page", icon: "▦", focus: "illustration" },
                { label: "Cast & clocks", hint: "the table & its pressure", icon: "☰", focus: null },
              ] as const).map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => onConsoleGesture(m.focus)}
                  className="group flex items-center gap-3 rounded-2xl border border-amber/20 bg-gradient-to-b from-elevated/95 to-ink/95 px-4 py-2.5 text-left shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:border-amber/50"
                >
                  <span className="w-4 text-center text-sm text-amber">{m.icon}</span>
                  <span className="leading-tight">
                    <span className="block text-[12.5px] text-text transition-colors group-hover:text-amber">{m.label}</span>
                    <span className="block text-[9px] text-text-ghost">{m.hint}</span>
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* First-run cue: a labeled callout so a new GM learns the fan holds
            all their stage moves. Disappears for good once they open it. */}
        <AnimatePresence>
          {!handOpen && !directHintSeen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none mb-1 flex w-60 flex-col items-end"
            >
              <div className="rounded-2xl border border-amber/40 bg-gradient-to-b from-amber/[0.12] to-ink/95 px-3.5 py-2.5 text-right shadow-[0_10px_30px_-14px_rgba(0,0,0,0.85)] backdrop-blur-md">
                <span className="block text-[12px] font-medium text-amber">Your stage moves live here</span>
                <span className="block text-[10px] leading-snug text-text-ghost">
                  Rolls, scene cuts, bargains, pressure — tap Direct to begin.
                </span>
              </div>
              <span className="mr-5 -mt-px h-2 w-2 rotate-45 border-b border-r border-amber/40 bg-ink/95" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onToggle}
          aria-label="The Director's hand — your stage moves (rolls, scenes, bargains, clocks)"
          className="pointer-events-auto relative flex items-center gap-2.5 rounded-full border border-amber/55 bg-[radial-gradient(circle_at_50%_30%,rgba(255,230,171,0.18),rgba(216,178,90,0.10))] py-1.5 pl-4 pr-1.5 text-amber shadow-[0_12px_38px_-12px_rgba(216,178,90,0.7)] backdrop-blur-md transition-colors hover:border-amber/80"
        >
          {/* Attention pulse — only until first opened */}
          {!handOpen && !directHintSeen && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border border-amber/60"
              animate={{ boxShadow: ["0 0 0 0 rgba(216,178,90,0.5)", "0 0 0 12px rgba(216,178,90,0)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
            {handOpen ? "Close" : "Direct"}
          </span>
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border border-amber/60 bg-[radial-gradient(circle_at_50%_32%,#ffe6ab,#d8b25a_72%)] text-[18px] text-[#241c08] shadow-[inset_0_0_14px_rgba(255,255,255,0.35)] transition-transform ${handOpen ? "rotate-45" : ""}`}
          >
            ✦
          </span>
        </button>
      </div>
    </div>
  );
}
