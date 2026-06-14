"use client";

import { useState, useMemo } from "react";
import type { Turn } from "@/types/campaign";
import { extractHighlights } from "@/lib/campaign-recap";

// ── Session Highlights ───────────────────────────────────────
// The pure `extractHighlights` now lives in @/lib/campaign-recap so it can be
// shared with the Episode Card; this file is just the in-session rail UI.

export { extractHighlights };


export default function SessionHighlights({ storyTurns, logTurns }: { storyTurns: Turn[]; logTurns: Turn[] }) {
  const [expanded, setExpanded] = useState(true);
  const highlights = useMemo(() => extractHighlights(storyTurns, logTurns), [storyTurns, logTurns]);

  if (highlights.length === 0) return null;

  return (
    <div className="w-full max-w-[650px] mt-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 mb-3 cursor-pointer group"
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-text-tertiary transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary group-hover:text-text-secondary transition-colors">
          Session Highlights
        </span>
        <span className="text-[9px] text-text-ghost">{highlights.length}</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 bg-subtle/20 border border-border-subtle rounded-xl"
            >
              <span className="text-base leading-none mt-0.5 shrink-0">{h.icon}</span>
              <div className="min-w-0">
                <span className={`text-[9px] uppercase tracking-widest font-bold ${h.color}`}>
                  {h.label}
                </span>
                <p className="text-sm text-text-secondary font-serif mt-0.5 leading-relaxed">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
