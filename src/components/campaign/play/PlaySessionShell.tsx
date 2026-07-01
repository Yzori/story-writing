"use client";

import type { ReactNode } from "react";

/**
 * The play surface's three-zone stage: a real grid, not floating fragments.
 *
 * ┌──────────────────────────────────────┬────────────┐
 * │ header (col-span-full)               │            │
 * ├──────────────────────────────────────┤            │
 * │ phase banner                         │  the Table │
 * ├──────────────────────────────────────┤   (rail,   │
 * │ stage — the story page (own scroll)  │    lg+)    │
 * ├──────────────────────────────────────┤            │
 * │ action dock (in-flow, never fixed)   │            │
 * └──────────────────────────────────────┴────────────┘
 *
 * ── Z-SCALE (the only z-indexes allowed on the play surface) ──
 *   z-0   stage backdrop (cinematic glow, mood tint/vignette)
 *   z-10  stage content (page sheet, prose, floor round panel)
 *   z-20  stage floaters (floating reactions, ↓ New turn, Places)
 *   z-30  shell chrome (header, banner, rail, dock, ritual popover)
 *   z-40  drawers + scrims (chat drawer, deck sheet, map overlay)
 *   z-50  modals (dice ritual, end session, open floor)
 *   z-60  cinematic (story moment full-bleed)
 *   z-70  toast
 *   z-80  focus-mode root (above the global navbar)
 */
export default function PlaySessionShell({
  focusMode,
  header,
  banner,
  stage,
  rail,
  dock,
  children,
}: {
  focusMode: boolean;
  header: ReactNode;
  banner?: ReactNode;
  stage: ReactNode;
  /** The Table — desktop-only docked rail. Caller controls mounting. */
  rail?: ReactNode;
  dock?: ReactNode;
  /** Overlays that escape the grid: drawers, modals, toast, cinematics. */
  children?: ReactNode;
}) {
  return (
    <div
      className={`adventure-mode w-screen overflow-hidden bg-void text-paper selection:bg-amber/30 ${
        focusMode ? "fixed inset-0 z-[80] h-dvh" : "mt-14 h-[calc(100dvh-3.5rem)]"
      }`}
    >
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_332px]">
        <div className="z-30 col-span-full row-start-1">{header}</div>
        {banner && <div className="z-30 col-start-1 row-start-2">{banner}</div>}
        <div className="relative col-start-1 row-start-3 min-h-0">{stage}</div>
        {dock && <div className="z-30 col-start-1 row-start-4">{dock}</div>}
        {rail && (
          <div className="z-30 col-start-2 row-start-2 row-end-5 hidden min-h-0 lg:block">
            {rail}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
