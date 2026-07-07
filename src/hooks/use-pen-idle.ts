"use client";

import { useEffect, useState } from "react";
import { penTierFor, type PenTier } from "@/lib/campaign-stall";

/**
 * The soft clock (anti-stall Slice A). Given the last thing that happened at
 * the table, returns how long the pen has sat idle and which stall tier that
 * is. Ticks on its own so the tier escalates without waiting for a poll. Pure
 * detection — it moves no pen and writes nothing; the page decides what to
 * surface. See ~/.claude/plans/anti-stall-reliability-spec.md.
 */
export function usePenIdle(
  lastEventAt: string | number | Date | null | undefined,
  enabled: boolean,
): { idleMs: number; tier: PenTier } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    // 15s cadence is plenty — the thresholds are minutes apart.
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled || lastEventAt == null) {
    return { idleMs: 0, tier: "quiet" };
  }

  const lastMs = new Date(lastEventAt).getTime();
  if (Number.isNaN(lastMs)) return { idleMs: 0, tier: "quiet" };

  const idleMs = Math.max(0, now - lastMs);
  return { idleMs, tier: penTierFor(idleMs) };
}
