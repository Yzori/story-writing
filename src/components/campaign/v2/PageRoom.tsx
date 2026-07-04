"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import HouseGlimmers from "./HouseGlimmers";

/**
 * Adventure v2 — "Set in Ink". The bare page: one lit sheet in the dark,
 * nothing else. No seats, no station, no margin rail. Presence is a
 * signature line at the page's foot; every control lives at the end of
 * the page, inside the sheet. The layout physically enforces the v2 spec:
 * there is nowhere to put a fourteenth control.
 *
 * The room is candlelit, not merely dark: warm air rises behind the sheet,
 * the pool of light on the paper breathes, and the house glimmers at the
 * edges of the dark (one mote per watcher). Money never appears here —
 * gold arrives as light (GoldLight goes through `overlays`).
 *
 * Z-scale: 0 the dark · 10 the sheet · 40 drawers/scrims · 50 modals · 70 toast.
 */
export default function PageRoom({
  leaveHref,
  header,
  signature,
  children,
  overlays,
  houseCount = 0,
}: {
  /** Back to the campaign hub — a small bookmark ribbon over the frame. */
  leaveHref?: string;
  /** The title plate above the story: the tale's name, then one whispered status line. */
  header?: ReactNode;
  /** The signature line at the page's foot — the only presence UI. */
  signature?: ReactNode;
  /** The story column: prose, then whatever the end of the page holds. */
  children: ReactNode;
  /** Escapes the sheet: modals, toasts. */
  overlays?: ReactNode;
  /** How many watch from the dark — the dark glimmers with them. */
  houseCount?: number;
}) {
  return (
    <div className="adventure-mode manuscript-room fixed inset-0 z-[80] overflow-y-auto text-paper selection:bg-amber/30">
      {/* The dark — warm air behind the sheet, vignette pooled at the edges,
          and the house glimmering in it. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="candle-air absolute inset-0" />
        <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(0,0,0,0.88)]" />
      </div>
      <HouseGlimmers count={houseCount} />

      {leaveHref && (
        <Link
          href={leaveHref}
          aria-label="Leave the session"
          className="group fixed left-4 top-0 z-40 flex flex-col items-center sm:left-8"
        >
          <span className="block h-10 w-6 rounded-b-sm bg-gradient-to-b from-amber/70 to-amber/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:translate-y-1 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />
          <span className="table-action mt-1 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
            Leave
          </span>
        </Link>
      )}

      {/* The sheet — a single centered column of story. */}
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[720px] flex-col px-4 pt-10 sm:px-8">
        <div className="manuscript-sheet flex flex-1 flex-col rounded-t-md px-6 pb-6 pt-8 sm:px-12 sm:pt-10">
          {header && (
            <div className="mb-8 border-b border-border/60 pb-5 text-center">
              {header}
            </div>
          )}

          <div className="flex-1">{children}</div>

          {signature && (
            <div className="mt-12 border-t border-border/60 pt-4 font-reading text-[12.5px] italic leading-loose text-text-tertiary">
              {signature}
            </div>
          )}
        </div>
      </div>

      {overlays}
    </div>
  );
}
