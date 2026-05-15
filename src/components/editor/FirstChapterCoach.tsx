"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "quiloria-first-chapter-coach-dismissed";

export interface FirstChapterCoachState {
  hasTitle: boolean;
  hasGenre: boolean;
  hasCover: boolean;
  hasContent: boolean;
}

interface FirstChapterCoachProps {
  state: FirstChapterCoachState;
  /** Open the metadata panel so the writer can fill in title/genre/cover. */
  onOpenSetup?: () => void;
  /** Total story word count — used to suppress the coach for established stories. */
  totalWords: number;
  variant?: "floating" | "inline";
}

/**
 * A small floating coach that nudges first-time writers through the four
 * micro-tasks that turn a blank draft into a publishable first chapter.
 *
 * Visibility rules:
 * - Only renders when at least one item is incomplete.
 * - Permanently dismissable per-browser (localStorage).
 * - Auto-suppresses for established stories (>500 words written) to avoid
 *   nagging returning writers.
 * - Self-dismisses with a celebratory state when all four items are checked.
 */
export default function FirstChapterCoach({
  state,
  onOpenSetup,
  totalWords,
  variant = "floating",
}: FirstChapterCoachProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [celebrated, setCelebrated] = useState(false);

  const items = [
    { key: "hasTitle", label: "Add a title", done: state.hasTitle, action: onOpenSetup },
    { key: "hasGenre", label: "Pick a genre", done: state.hasGenre, action: onOpenSetup },
    { key: "hasCover", label: "Upload a cover", done: state.hasCover, action: onOpenSetup },
    { key: "hasContent", label: "Write 100 words", done: state.hasContent },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Show a brief celebration when the user just completed everything.
  useEffect(() => {
    if (allDone && !celebrated) {
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) {
          setCelebrated(true);
        }
      });

      const t = setTimeout(() => {
        if (cancelled) return;
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
        setDismissed(true);
      }, 4000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [allDone, celebrated]);

  if (dismissed === null) return null;
  if (dismissed) return null;
  // Suppress for established stories (returning writers don't need a checklist)
  if (totalWords > 500 && !allDone) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  const containerClass =
    variant === "inline"
      ? "w-full bg-elevated/45 border border-amber/15 rounded-xl overflow-hidden"
      : "fixed bottom-6 left-6 z-40 max-w-[280px] bg-surface/95 border border-amber/15 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/30 overflow-hidden";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={containerClass}
      >
        {/* Compact header — clickable to expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber/[0.04] transition-colors cursor-pointer"
          aria-expanded={expanded}
        >
          {/* Progress ring */}
          <div className="relative w-8 h-8 shrink-0">
            <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-paper/[0.06]" />
              <motion.circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={allDone ? "text-emerald-400/80" : "text-amber"}
                strokeDasharray={2 * Math.PI * 13}
                animate={{ strokeDashoffset: 2 * Math.PI * 13 * (1 - completedCount / items.length) }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            {allDone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80">
                  <path d="M3 7l3 3 5-5" />
                </svg>
              </motion.div>
            )}
            {!allDone && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-amber tabular-nums">
                {completedCount}/{items.length}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-paper text-[12px] font-semibold tracking-wide truncate">
              {allDone ? "First chapter ready" : "Get to your first chapter"}
            </p>
            <p className="text-text-ghost text-[10px] truncate">
              {allDone
                ? "Nicely done — you can publish whenever you're ready."
                : `${items.length - completedCount} step${items.length - completedCount === 1 ? "" : "s"} left`}
            </p>
          </div>
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-text-ghost transition-transform ${expanded ? "" : "rotate-180"}`}
          >
            <path d="M4 10l4-4 4 4" />
          </svg>
        </button>

        {/* Expanded checklist */}
        <AnimatePresence initial={false}>
          {expanded && !allDone && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="px-2 pb-2 space-y-0.5">
                {items.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={item.action ?? undefined}
                      disabled={!item.action || item.done}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[12px] transition-colors ${
                        item.done
                          ? "text-text-ghost"
                          : item.action
                          ? "text-text-secondary hover:bg-amber/[0.06] hover:text-paper cursor-pointer"
                          : "text-text-secondary"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                          item.done
                            ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400"
                            : "border-border text-transparent"
                        }`}
                      >
                        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M3 7l3 3 5-5" />
                        </svg>
                      </span>
                      <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-3 pb-2 pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleDismiss}
                className="text-[10px] text-text-ghost hover:text-text-secondary transition-colors"
              >
                  Hide checklist
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
