"use client";

import { PACE_LABELS, type AdventureView } from "@/types/adventure";

/**
 * The playbill top of the table: eyebrow (act · scene), title, chips.
 */
export default function AdvHeader({
  adventure,
  live,
}: {
  adventure: AdventureView;
  /** The SSE wire is open — the page updates the moment ink lands. */
  live?: boolean;
}) {
  const eyebrow =
    adventure.status === "casting"
      ? "An adventure · the table is casting"
      : adventure.sceneNo > 0
        ? `An adventure · Act ${roman(adventure.actNo)}, Scene ${adventure.sceneNo}`
        : `An adventure · Act ${roman(adventure.actNo)}`;

  return (
    <div className="text-center px-6 pt-24">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dark mb-3">
        {eyebrow}
      </p>
      <h1 className="font-display font-medium text-paper text-[clamp(30px,5vw,50px)] [text-wrap:balance] [text-shadow:0_0_44px_var(--color-gold-glow)]">
        {adventure.title}
      </h1>
      <div className="mt-3.5 flex gap-2.5 justify-center flex-wrap">
        <span className="text-[12px] text-text border border-border rounded-full px-3 py-1 bg-ink/70 whitespace-nowrap">
          {PACE_LABELS[adventure.pace]}
        </span>
        {adventure.genre && (
          <span className="text-[12px] text-text border border-border rounded-full px-3 py-1 bg-ink/70 whitespace-nowrap capitalize">
            {adventure.genre}
          </span>
        )}
        {adventure.status === "finished" && (
          <span className="text-[12px] text-gold-light border border-gold/40 rounded-full px-3 py-1 bg-ink/70 whitespace-nowrap">
            The book is closed
          </span>
        )}
        {live && adventure.status === "running" && (
          <span className="flex items-center gap-1.5 text-[12px] text-teal border border-teal/40 rounded-full px-3 py-1 bg-ink/70 whitespace-nowrap">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_2px_rgba(87,210,203,0.5)] animate-pulse"
            />
            live
          </span>
        )}
      </div>
    </div>
  );
}

function roman(n: number): string {
  const numerals: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let rest = Math.max(1, Math.floor(n));
  for (const [value, glyph] of numerals) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}
