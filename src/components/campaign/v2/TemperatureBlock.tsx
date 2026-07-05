"use client";

import type { CSSProperties } from "react";

/**
 * The temperature on the unlit page: the Director's question, 2–4 ways the
 * night could go, and the room leaning — the cast as warm ink dots, the
 * dark as grey drops. Warmth (a gold wash) gathers on the leaned option
 * with a plain count.
 *
 * DESIGN LAW: a temperature is NOT a vote. It is non-binding forever, it
 * never prints to the story, and no resolve affordance exists here or on
 * the server — the begin transaction simply closes it. It informs the
 * Director; it never enacts a winner.
 */

export interface TemperatureOption {
  id: string;
  content: string;
  /** Cast leans (warm dots). */
  castLeanCount: number;
  /** The dark's leans (grey drops). */
  audienceLeanCount: number;
  isMyLean: boolean;
}

export default function TemperatureBlock({
  prompt,
  options,
  canLean,
  onLean,
  canCallOff,
  onCallOff,
}: {
  prompt: string;
  options: TemperatureOption[];
  canLean: boolean;
  onLean: (optionId: string) => void;
  /** The Director. */
  canCallOff: boolean;
  onCallOff: () => void;
}) {
  const totalLeans = options.reduce(
    (sum, o) => sum + o.castLeanCount + o.audienceLeanCount,
    0,
  );

  return (
    <div className="paper-slip px-5 py-4 sm:px-6">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-ghost">
        <span className="text-amber/80">a temperature</span> · lean where you like
      </p>
      <p className="mt-2.5 font-reading text-[16px] italic leading-relaxed text-amber/90 sm:text-[17px]">
        ✦ {prompt}
      </p>

      <div className="mt-3 space-y-2">
        {options.map((o) => {
          const leans = o.castLeanCount + o.audienceLeanCount;
          const warmth = totalLeans > 0 ? leans / totalLeans : 0;
          const body = (
            <span className="flex items-start gap-3">
              <span className="block min-w-0 flex-1">
                <span className="block font-reading text-[15px] leading-relaxed text-text-secondary">
                  {o.content}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {/* The cast's warmth — one dot per lean. */}
                  {Array.from({ length: Math.min(o.castLeanCount, 8) }, (_, i) => (
                    <span key={`c${i}`} className="lean-dot" aria-hidden="true" />
                  ))}
                  {/* The dark's — grey drops. */}
                  {Array.from({ length: Math.min(o.audienceLeanCount, 8) }, (_, i) => (
                    <span key={`a${i}`} className="lean-drop" aria-hidden="true" />
                  ))}
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                    {leans === 0
                      ? "no one leans this way yet"
                      : `${leans} ${leans === 1 ? "lean" : "leans"} this way`}
                    {o.isMyLean && <span className="text-amber"> · your lean</span>}
                  </span>
                </span>
              </span>
              {canLean && (
                <span
                  className={`mt-1.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border transition-colors ${
                    o.isMyLean ? "border-amber bg-amber" : "border-border"
                  }`}
                  aria-hidden="true"
                />
              )}
            </span>
          );
          const rowClass = "lobby-warmth block w-full rounded-sm border-l-2 border-border py-1.5 pl-3 pr-2 text-left";
          const style = { "--warmth": warmth } as CSSProperties;
          return canLean ? (
            <button
              key={o.id}
              type="button"
              onClick={() => onLean(o.id)}
              className={`${rowClass} cursor-pointer transition-colors hover:bg-paper/[0.03]`}
              style={style}
              title="Lean this way"
              aria-pressed={o.isMyLean}
            >
              {body}
            </button>
          ) : (
            <div key={o.id} className={rowClass} style={style}>
              {body}
            </div>
          );
        })}
      </div>

      <p className="table-murmur mt-3">
        a temperature, not a vote — nothing is decided here
      </p>

      {canCallOff && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onCallOff}
            className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Call it off
          </button>
        </div>
      )}
    </div>
  );
}
