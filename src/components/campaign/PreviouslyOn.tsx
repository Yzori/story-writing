"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CharacterMarkKind } from "@/types/campaign";

interface PreviouslyMark {
  kind: CharacterMarkKind;
  text: string;
  characterName: string;
}

interface PreviouslyHighlight {
  kind: "story-moment" | "scene-break";
  text: string;
  mood: string | null;
}

interface PreviouslyData {
  sessionId: string;
  title: string;
  cliffhanger: string | null;
  closingMood: string | null;
  epilogue: string | null;
  storyTitle: string;
  highlights: PreviouslyHighlight[];
  marks: PreviouslyMark[];
}

const MARK_GLYPHS: Record<CharacterMarkKind, { glyph: string; cls: string }> = {
  scar: { glyph: "†", cls: "text-rose" },
  vow: { glyph: "✶", cls: "text-amber" },
  debt: { glyph: "∞", cls: "text-lavender" },
  memory: { glyph: "✦", cls: "text-sage" },
};

interface Props {
  storyId: string;
  sessionId: string;
  /** Where to render: above the title (full card) vs collapsed (chip). */
  variant?: "full" | "compact";
}

/**
 * "Previously, on…" — opens a fresh session by anchoring the player in last
 * week's emotional state. Loads on mount from the previously-on endpoint;
 * dismissible per-session via localStorage.
 */
export default function PreviouslyOn({ storyId, sessionId, variant = "full" }: Props) {
  const [data, setData] = useState<PreviouslyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = `previouslyOn:dismissed:${sessionId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(dismissKey)) {
      // SSR-safe localStorage read; setState on mount is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, [dismissKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/previously`);
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, sessionId]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey, "1");
    }
  };

  if (loading || dismissed || !data) return null;

  const hasContent =
    !!data.cliffhanger || data.highlights.length > 0 || data.marks.length > 0;
  if (!hasContent) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        aria-label={`Previously on ${data.storyTitle}`}
        className={`mx-auto mb-8 w-full max-w-[650px] rounded-2xl border border-amber/20 bg-gradient-to-b from-amber/[0.04] to-transparent p-5 shadow-[0_14px_40px_rgba(0,0,0,0.35)] sm:p-6 ${
          variant === "compact" ? "" : ""
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.24em] text-amber/75">
              Previously, on
            </p>
            <h2 className="mt-1 font-display text-base text-paper sm:text-lg">
              {data.storyTitle}{" "}
              <span className="text-text-tertiary">— {data.title}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="min-h-9 min-w-9 rounded-full text-text-ghost transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>

        {data.cliffhanger && (
          <blockquote className="relative my-4 border-l-2 border-amber/40 pl-4 font-serif text-[15px] italic leading-relaxed text-paper/90 sm:text-[17px]">
            {data.cliffhanger}
          </blockquote>
        )}

        {data.highlights.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {data.highlights.map((h, i) => (
              <li
                key={`${h.kind}-${i}`}
                className="flex items-start gap-2 text-[12px] leading-snug text-text-secondary sm:text-[13px]"
              >
                <span aria-hidden="true" className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-amber/50" />
                <span className="font-serif italic">{h.text}</span>
              </li>
            ))}
          </ul>
        )}

        {data.marks.length > 0 && (
          <div className="mt-4 border-t border-amber/10 pt-3">
            <p className="mb-1.5 font-display text-[9px] uppercase tracking-[0.2em] text-text-ghost">
              What they carry
            </p>
            <ul className="space-y-1">
              {data.marks.map((m, i) => {
                const g = MARK_GLYPHS[m.kind];
                return (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                    <span aria-hidden="true" className={`shrink-0 ${g.cls}`}>{g.glyph}</span>
                    <span className="text-text-tertiary">
                      <span className="text-text-secondary">{m.characterName}</span>
                      {" — "}
                      <span className="font-serif italic">{m.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
