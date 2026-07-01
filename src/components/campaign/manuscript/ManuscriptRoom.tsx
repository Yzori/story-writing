"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The manuscript is the room: a fixed full-viewport candlelit table with one
 * lit page on it. There is no app chrome — no navbar, no header, no dock.
 * Everything mechanical is expressed as something happening to the page
 * (marginalia, ink, stamps, forks) or around it (seats, pen, candle, the dark).
 *
 * Layout:
 *   desktop (lg+)          mobile
 *   ┌─┬──────────────┬─┐   ┌──────────────┐
 *   │S│  the dark  🕯 │ │   │ seat strip 🕯 │ 52px fixed
 *   │E│ ┌──────────┐  │ │   ├──────────────┤
 *   │A│ │ the page │  │ │   │   the page   │ edge-to-edge
 *   │T│ │ (scrolls)│  │ │   │              │
 *   │S│ └──────────┘  │ │   │        [seal]│ GM FAB
 *   │ │        [quill]│ │   └──────────────┘
 *   └─┴──────────────┴─┘
 *
 * ── Z-SCALE (the only z-indexes allowed on the manuscript surface) ──
 *   z-0   the dark (table backdrop, candlelight radial, mood washes)
 *   z-10  the page (sheet, prose, fork, quill)
 *   z-20  page floaters (margin notes, new-ink hint, reaction wisps)
 *   z-30  table furniture (seats, candle, quill station, bookmark, whispers)
 *   z-40  drawers + scrims (table talk, map overlay, deck sheets)
 *   z-50  modals (dice ritual, close-the-book, open-crossroads)
 *   z-60  cinematic (story moment full-bleed)
 *   z-70  toast
 */
export default function ManuscriptRoom({
  leaveHref,
  isDesktop,
  seats,
  candle,
  station,
  whispers,
  page,
  children,
}: {
  /** Back to the campaign hub — rendered as a hanging bookmark ribbon. */
  leaveHref?: string;
  /** JS-gated at page level; chooses seat rim vs strip POSITIONING only. */
  isDesktop: boolean;
  /** TableSeats — the room positions it (left rim on lg+, top strip below). */
  seats?: ReactNode;
  /** CandleTimer — top-right of the frame (desktop; the strip has its own). */
  candle?: ReactNode;
  /** QuillStation — bottom-right (GM only; renders its own mobile FAB). */
  station?: ReactNode;
  /** TableWhispers — the audience at the edge of the light. */
  whispers?: ReactNode;
  /** ManuscriptPage — the scroll stage. */
  page: ReactNode;
  /** Overlays that escape the table: drawers, modals, cinematics, toast. */
  children?: ReactNode;
}) {
  return (
    <div className="adventure-mode manuscript-room fixed inset-0 z-[80] overflow-hidden text-paper selection:bg-amber/30">
      {/* The dark — candlelight pooled on the table, lantern-edge vignette. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="adventure-cinematic-shadow absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]" />
      </div>

      {/* Leave the table — a bookmark ribbon hanging over the frame's edge. */}
      {leaveHref && (
        <Link
          href={leaveHref}
          aria-label="Leave the table"
          className={`group absolute top-0 z-30 flex flex-col items-center ${
            isDesktop ? "left-[104px]" : "left-3"
          }`}
        >
          <span className="block h-10 w-6 rounded-b-sm bg-gradient-to-b from-amber/70 to-amber/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:translate-y-1 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />
          <span className="table-action mt-1 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
            Leave
          </span>
        </Link>
      )}

      {/* The table around the page. */}
      {seats &&
        (isDesktop ? (
          <div className="absolute bottom-0 left-0 top-0 z-30 flex w-[84px] flex-col items-center justify-center">
            {seats}
          </div>
        ) : (
          <div className="absolute inset-x-0 top-0 z-30 h-[52px]">{seats}</div>
        ))}

      {candle && isDesktop && (
        <div className="absolute right-5 top-5 z-30">{candle}</div>
      )}

      {whispers && <div className="pointer-events-none absolute inset-x-0 top-0 z-30">{whispers}</div>}

      {/* The page — owns its own scroll inside the frame. */}
      <div
        className={`absolute inset-0 z-10 ${
          isDesktop ? "pl-[84px] pr-0" : "pt-[52px]"
        }`}
      >
        {page}
      </div>

      {station && (
        <div className={isDesktop ? "absolute bottom-4 right-4 z-30" : "contents"}>
          {station}
        </div>
      )}

      {children}
    </div>
  );
}
