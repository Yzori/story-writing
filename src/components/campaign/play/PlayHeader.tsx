"use client";

import type { ProgressClockData } from "@/components/campaign/ProgressClock";

interface PlayHeaderProps {
  storyTitle: string;
  sceneTitle: string;
  sessionStatus: string;
  houseCount: number;
  /** First pressure clock — rendered as a compact chip below lg (the rail
   *  owns the full clocks section on desktop). */
  firstClock: ProgressClockData | null;
  isGM: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
  onEndSession: () => void;
  /** Player-only: opens the character drawer (until the mobile deck lands). */
  onOpenCharacter?: () => void;
}

/**
 * The slim top bar: identity + scene on the left, session controls on the
 * right. Game state lives in the PhaseBanner below; the cast lives in the
 * Table rail — the header carries neither.
 */
export default function PlayHeader({
  storyTitle,
  sceneTitle,
  sessionStatus,
  houseCount,
  firstClock,
  isGM,
  focusMode,
  onToggleFocus,
  onEndSession,
  onOpenCharacter,
}: PlayHeaderProps) {
  return (
    <header className="border-b border-border bg-void/92 backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate font-display text-[16px] text-paper sm:text-[19px]">
            {storyTitle}
          </h1>
          {sessionStatus === "active" && (
            <span className="hidden shrink-0 rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-amber sm:inline-flex">
              Live Canon
            </span>
          )}
          <span className="hidden min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost md:inline">
            Scene · <span className="text-text-secondary normal-case tracking-normal font-body text-[12px]">{sceneTitle}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* House count — the table feels the audience */}
          {houseCount > 0 && (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-border bg-subtle/20 px-2.5 py-1 text-[10px] text-text-secondary sm:flex"
              title={`${houseCount} watching`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet [animation:pulse_1.8s_ease-in-out_infinite]" />
              {houseCount} in the house
            </span>
          )}

          {/* First clock chip — mobile only; the rail owns clocks on lg+ */}
          {firstClock && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.06] px-2.5 py-1 lg:hidden"
              title={`${firstClock.name} — ${firstClock.filled}/${firstClock.segments}`}
            >
              <span className="text-[10px] leading-none text-amber/80">⛓</span>
              <span className="font-mono text-[10px] tabular-nums text-amber/80">
                {firstClock.filled}/{firstClock.segments}
              </span>
            </span>
          )}

          {isGM && (
            <button
              type="button"
              onClick={onEndSession}
              className="hidden min-h-9 items-center rounded-full border border-border bg-subtle/20 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-rose/30 hover:text-rose sm:inline-flex"
            >
              End Session
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFocus}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
            aria-label={focusMode ? "Show platform navigation" : "Enter focus mode"}
            title={focusMode ? "Show platform navigation" : "Enter focus mode"}
          >
            {focusMode ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M8 3v5H3" />
                <path d="M16 3v5h5" />
                <path d="M8 21v-5H3" />
                <path d="M16 21v-5h5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 9V3h6" />
                <path d="M21 9V3h-6" />
                <path d="M3 15v6h6" />
                <path d="M21 15v6h-6" />
              </svg>
            )}
          </button>

          {onOpenCharacter && (
            <button
              type="button"
              onClick={onOpenCharacter}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
              aria-label="Your character"
              title="Your character"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
