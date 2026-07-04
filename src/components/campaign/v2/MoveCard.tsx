"use client";

import type { ReactNode } from "react";

/**
 * The Director's moves, offered as a card written on the page's own paper —
 * summoned by "/" or by the Moves chip under the quill. Each move gets a
 * drawn sigil, its plain name, and one whispered line saying what it does,
 * so the card teaches itself every time it opens: no tour, no first-run
 * state to forget.
 */

function DieSigil() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.4" cy="8.4" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A crossroads — one path divides. */
function ForkSigil() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 21v-8" />
      <path d="M12 13c0-4-3.5-4.5-5.5-8" />
      <path d="M12 13c0-4 3.5-4.5 5.5-8" />
      <circle cx="6.5" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoonSigil() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M19 14.5A8 8 0 0 1 9.5 5 8 8 0 1 0 19 14.5Z" />
    </svg>
  );
}

/** A pressed seal — the session closed. */
function SealSigil() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

const MOVE_ART: Record<string, { sigil: ReactNode; gloss: string; silver?: boolean }> = {
  roll: {
    sigil: <DieSigil />,
    gloss: "one of the cast rolls 2d6 against stakes you set",
  },
  vote: {
    sigil: <ForkSigil />,
    gloss: "everyone writes a line, the table votes, the winner joins the story",
  },
  stranger: {
    sigil: <MoonSigil />,
    gloss: "the audience chooses what it does next",
    silver: true,
  },
  end: {
    sigil: <SealSigil />,
    gloss: "closes this session for everyone at the table",
  },
};

export default function MoveCard({
  moves,
  highlight,
  onPick,
  onHover,
}: {
  moves: Array<{ key: string; label: string }>;
  /** The row the keyboard is on. */
  highlight: number;
  onPick: (key: string) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div className="move-card mt-2 overflow-hidden">
      <div className="p-1.5">
        {moves.map((m, i) => {
          const art = MOVE_ART[m.key];
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onPick(m.key)}
              onMouseEnter={() => onHover(i)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded px-3 py-2 text-left transition-colors ${
                i === highlight ? "bg-amber/[0.09]" : "hover:bg-amber/[0.06]"
              }`}
            >
              <span
                className="mt-0.5 shrink-0 text-amber"
                style={art?.silver ? { color: "var(--ink-strange)" } : undefined}
                aria-hidden="true"
              >
                {art?.sigil ?? (
                  <span className="inline-block w-[15px] text-center">·</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="table-action block text-paper">{m.label}</span>
                {art?.gloss && (
                  <span className="mt-0.5 block font-reading text-[12.5px] italic leading-snug text-text-tertiary">
                    {art.gloss}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-border/40 px-4 py-1.5 font-mono text-[9.5px] tracking-[0.08em] text-text-ghost">
        ↑↓ then Enter, or click · Esc closes
      </div>
    </div>
  );
}
