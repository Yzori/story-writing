"use client";

import type { RollStampAnnotation } from "@/lib/manuscript-annotations";
import NoteShell from "./NoteShell";

const TIER_GLYPH: Record<string, { glyph: string; className: string; word: string }> = {
  success: { glyph: "✦", className: "text-sage", word: "held" },
  partial: { glyph: "◐", className: "text-amber", word: "cost" },
  failure: { glyph: "✕", className: "text-rose", word: "refused" },
};

/**
 * A resolved roll, stamped in ink beside the passage it interrupted:
 * tier glyph, the dice as thrown, and whether an aspect turned the miss.
 */
export default function RollStampNote({ annotation }: { annotation: RollStampAnnotation }) {
  const { meta, turn } = annotation;
  const tier = meta.tier ? TIER_GLYPH[meta.tier] : null;
  return (
    <NoteShell rotate={1.1}>
      <div className="flex items-center gap-2.5">
        {tier && (
          <span className={`text-xl leading-none ${tier.className}`} aria-hidden="true">
            {tier.glyph}
          </span>
        )}
        <div className="min-w-0">
          <p className="hand-note text-base text-paper/80">
            {turn.characterName ?? "The dice"}{" "}
            <span className={tier?.className ?? "text-text-secondary"}>
              {meta.fatal && meta.tier === "failure" ? "fell" : (tier?.word ?? "rolled")}
            </span>
            {meta.attribute ? <span className="opacity-70"> · {meta.attribute}</span> : null}
          </p>
          {meta.dice && (
            <p className="font-mono text-[11px] text-text-tertiary">
              {meta.dice[0]} + {meta.dice[1]}
              {typeof meta.modifier === "number" && meta.modifier !== 0
                ? ` ${meta.modifier > 0 ? "+" : "−"} ${Math.abs(meta.modifier)}`
                : ""}
              {typeof meta.total === "number" ? ` = ${meta.total}` : ""}
            </p>
          )}
          {meta.aspectSaved && (
            <p className="hand-note text-sm text-lavender/90">— their truth held them up</p>
          )}
        </div>
      </div>
    </NoteShell>
  );
}
