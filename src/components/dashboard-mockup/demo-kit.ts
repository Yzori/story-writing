// ─────────────────────────────────────────────────────────────────────────────
// Throwaway fixtures for the dashboard mockup pages: illustrative reading data
// and a seeded fake-series generator. Nothing here ships on production surfaces
// — the real Studio dashboard uses live data via useStudioData + /api/dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { arand, hash } from "@/components/dashboard/studio-kit";

export const READING_DEMO = {
  current: { id: "rd-salt-year", title: "The Salt Year", author: "Iris Vale", genre: "literary", chapter: 7, of: 12 },
  streak: 12,
  shelf: [
    { id: "rd-hollow", title: "Hollow Tide", author: "M. Okonkwo", genre: "fantasy", fresh: 2 },
    { id: "rd-neon", title: "Neon Liturgy", author: "A. Reyes", genre: "sci-fi", fresh: 1 },
    { id: "rd-quiet", title: "The Quiet House", author: "L. Brandt", genre: "horror", fresh: 0 },
    { id: "rd-saints", title: "Paper Saints", author: "J. Mercer", genre: "romance", fresh: 3 },
  ],
  follows: [
    { id: "fw1", emoji: "📖", who: "Iris Vale", text: "posted Chapter 8 of The Salt Year" },
    { id: "fw2", emoji: "✦", who: "M. Okonkwo", text: "started a new story — Hollow Tide" },
    { id: "fw3", emoji: "📖", who: "J. Mercer", text: "posted Chapter 22 of Paper Saints" },
  ],
};

export function genSeries(seed: string, n = 14): number[] {
  const out: number[] = [];
  let v = 0.2 + arand(hash(seed)) * 0.3;
  for (let i = 0; i < n; i++) {
    v = Math.min(1, Math.max(0.08, v + (arand(hash(`${seed}_${i}`)) - 0.4) * 0.32));
    out.push(v);
  }
  return out;
}
