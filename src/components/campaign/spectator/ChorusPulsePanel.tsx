"use client";

import { useEffect, useMemo, useState } from "react";
import type { SpectatorReaction } from "@/hooks/use-spectator-reactions";

const PULSE_WINDOW_MS = 90_000;

const PULSE_GROUPS: Record<string, { label: string; tone: string; types: string[] }> = {
  dread: {
    label: "The Chorus is afraid",
    tone: "border-rose/30 bg-rose/10 text-rose",
    types: ["gasped", "terrified", "heartbroken", "cried"],
  },
  wonder: {
    label: "The Chorus is spellbound",
    tone: "border-amber/30 bg-amber/10 text-amber",
    types: ["inspired", "need-more"],
  },
  mirth: {
    label: "The Chorus breaks into laughter",
    tone: "border-sage/30 bg-sage/10 text-sage",
    types: ["laughed"],
  },
  omen: {
    label: "The Chorus saw the shape of it",
    tone: "border-lavender/30 bg-lavender/10 text-lavender",
    types: ["saw-it-coming"],
  },
};

interface ChorusPulsePanelProps {
  reactions: SpectatorReaction[];
}

export default function ChorusPulsePanel({ reactions }: ChorusPulsePanelProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const timeout = setTimeout(updateNow, 0);
    const interval = setInterval(updateNow, 5_000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const pulse = useMemo(() => {
    if (!now) {
      return { leader: null, total: 0, scored: [] };
    }

    const cutoff = now - PULSE_WINDOW_MS;
    const recent = reactions.filter((reaction) => reaction.receivedAt >= cutoff);
    const scored = Object.entries(PULSE_GROUPS)
      .map(([key, group]) => ({
        key,
        ...group,
        count: recent.filter((reaction) => group.types.includes(reaction.type)).length,
      }))
      .filter((group) => group.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      leader: scored[0] ?? null,
      total: recent.length,
      scored,
    };
  }, [now, reactions]);

  if (!pulse.leader || pulse.total < 2) return null;

  return (
    <div className="absolute right-4 top-20 z-30 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-border bg-ink/90 p-3 shadow-[0_14px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <p className="text-[9px] font-display uppercase tracking-[0.22em] text-text-ghost">Chorus Pulse</p>
      <div className={`mt-2 rounded-xl border px-3 py-2 ${pulse.leader.tone}`}>
        <p className="font-display text-[12px] uppercase tracking-[0.16em]">{pulse.leader.label}</p>
        <p className="mt-1 text-[11px] text-text-tertiary">
          {pulse.total} recent reactions · {pulse.leader.count} in the leading mood
        </p>
      </div>
      {pulse.scored.length > 1 && (
        <div className="mt-2 flex gap-1.5">
          {pulse.scored.slice(0, 4).map((group) => (
            <div
              key={group.key}
              className="h-1.5 rounded-full bg-amber/25"
              style={{ width: `${Math.max(18, (group.count / pulse.total) * 100)}%` }}
              title={`${group.label}: ${group.count}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
