"use client";

import { useState, useMemo } from "react";
import type { Turn } from "@/types/campaign";

// ── Session Highlights ───────────────────────────────────────

interface Highlight {
  icon: string;
  label: string;
  text: string;
  color: string; // tailwind text color
}

export function extractHighlights(storyTurns: Turn[], logTurns: Turn[]): Highlight[] {
  const highlights: Highlight[] = [];

  // Single-pass through story turns: extract scene breaks, deaths, and count stats
  let playerTurnCount = 0;
  let gmTurnCount = 0;
  let sceneCount = 0;

  for (const t of storyTurns) {
    // Stats counting
    if (t.type === "narration" || t.type === "consequence") {
      gmTurnCount++;
    } else if (t.type === "scene-break") {
      sceneCount++;
    } else {
      playerTurnCount++;
    }

    // Scene break highlights (scenes, story moments, deaths)
    if (t.type === "scene-break" && t.metadata) {
      try {
        const meta = JSON.parse(t.metadata);
        if (meta.cinematic && meta.title) {
          highlights.push({
            icon: meta.mood === "death" ? "\uD83D\uDC80" : "\u2728",
            label: "Story Moment",
            text: meta.title,
            color: meta.mood === "death" ? "text-rose" : "text-amber",
          });
        } else if (meta.mood === "death" && !meta.cinematic) {
          highlights.push({
            icon: "\u2020",
            label: "Fallen",
            text: meta.title || "A hero has fallen",
            color: "text-rose",
          });
        } else if (meta.title) {
          highlights.push({
            icon: "\uD83C\uDFAC",
            label: "Scene",
            text: meta.title,
            color: "text-white/60",
          });
        }
      } catch { /* ignore */ }
    }
  }

  // Single-pass through log turns: dramatic rolls and roll count
  let rollCount = 0;
  for (const t of logTurns) {
    if (t.type !== "roll") continue;
    rollCount++;
    if (!t.metadata) continue;
    try {
      const meta = JSON.parse(t.metadata);
      const total = meta.total ?? 0;
      const tier = meta.tier ?? "";
      const charName = t.characterName ?? t.user?.displayName ?? "Someone";

      if (tier === "success" && total >= 11) {
        highlights.push({
          icon: "\uD83C\uDFB2",
          label: "Critical Roll",
          text: `${charName} rolled ${total} \u2014 a triumphant success`,
          color: "text-amber",
        });
      } else if (tier === "failure" && total <= 4) {
        highlights.push({
          icon: "\uD83C\uDFB2",
          label: "Dramatic Failure",
          text: `${charName} rolled ${total} \u2014 a devastating miss`,
          color: "text-red-400",
        });
      }
    } catch { /* ignore */ }
  }

  // Session stats summary
  const totalTurns = playerTurnCount + gmTurnCount;
  if (totalTurns > 0) {
    const parts: string[] = [];
    parts.push(`${totalTurns} turns written`);
    if (sceneCount > 0) parts.push(`${sceneCount} scene${sceneCount > 1 ? "s" : ""}`);
    if (rollCount > 0) parts.push(`${rollCount} roll${rollCount > 1 ? "s" : ""}`);

    highlights.push({
      icon: "\uD83D\uDCDC",
      label: "Session Stats",
      text: parts.join(" \u00B7 "),
      color: "text-white/50",
    });
  }

  return highlights;
}

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
          className={`text-white/30 transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
          Session Highlights
        </span>
        <span className="text-[9px] text-white/20">{highlights.length}</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl"
            >
              <span className="text-base leading-none mt-0.5 shrink-0">{h.icon}</span>
              <div className="min-w-0">
                <span className={`text-[9px] uppercase tracking-widest font-bold ${h.color}`}>
                  {h.label}
                </span>
                <p className="text-sm text-white/60 font-serif mt-0.5 leading-relaxed">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
