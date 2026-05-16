"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRotatedPrompts } from "@/lib/writing-prompts";

interface WritingPromptsBarProps {
  /** Story format — drives which prompt set is shown. */
  format?: string | null;
  /** Active chapter ID — used as a seed so prompts are stable per chapter. */
  chapterKey: string;
  /** Current word count — bar hides once the writer has momentum. */
  wordCount: number;
  /** Called with the prompt text when the user picks one. */
  onPick: (prompt: string) => void;
  /** Hide threshold (default 50). */
  showBelowWords?: number;
}

/**
 * Compact opening-assist bar that sits above the editor and offers 3
 * format-aware first-move scaffolds. Hides once the chapter has 50+ words.
 * Dismissable per chapter for the current editing session.
 */
export default function WritingPromptsBar({
  format,
  chapterKey,
  wordCount,
  onPick,
  showBelowWords = 50,
}: WritingPromptsBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  if (wordCount >= showBelowWords) return null;
  if (dismissed) return null;

  const prompts = getRotatedPrompts(format, chapterKey, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mx-auto mb-6 max-w-[680px] rounded-xl border border-amber/15 bg-amber/[0.04] px-4 py-3"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-amber/70 font-medium">
              Begin with
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {prompts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onPick(p.insert)}
                  onMouseEnter={() => setHovered(p.label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(p.label)}
                  onBlur={() => setHovered(null)}
                  title={p.hint}
                  className="px-2.5 py-1 rounded-full border border-border-subtle text-[11px] text-text-secondary hover:text-paper hover:border-amber/30 hover:bg-amber/[0.06] transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {hovered && (
              <p className="text-[11px] text-text-ghost mt-2 leading-snug">
                {prompts.find((p) => p.label === hovered)?.hint}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 text-text-ghost hover:text-paper transition-colors p-1 -m-1 rounded"
            aria-label="Hide prompts"
            title="Hide"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="3" x2="11" y2="11" />
              <line x1="11" y1="3" x2="3" y2="11" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
