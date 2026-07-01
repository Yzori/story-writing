"use client";

import type { TurnTimerUrgency } from "@/hooks/use-turn-timer";

const RING_COLOR: Record<TurnTimerUrgency, string> = {
  calm: "text-amber/70",
  warn: "text-amber",
  critical: "text-rose",
};

const TIME_COLOR: Record<TurnTimerUrgency, string> = {
  calm: "text-text-secondary",
  warn: "text-amber",
  critical: "text-rose",
};

export interface SeatTimer {
  progress: number; // 0..1 remaining
  timeStr: string;
  urgency: TurnTimerUrgency;
}

interface CastSeatProps {
  variant?: "rail" | "compact";
  /** Character name — or "The Director". */
  name: string;
  /** The player behind the character (rail variant caption). */
  playerName?: string | null;
  portrait?: string | null;
  /** Replaces the initial — the Director's ✦. */
  glyph?: string;
  holdsPen: boolean;
  isYou: boolean;
  /** "active" | "dead" | "retired" — gone seats dim with a † */
  status?: string;
  handRaised?: boolean;
  /** GM affordance: tap the seat to pass the pen. */
  canPass: boolean;
  onPass?: () => void;
  /** Countdown ring — only supplied for the seat holding the pen. */
  timer?: SeatTimer | null;
  /** Seat owner's "Extend +3 min" (mirrors the timer hook's window). */
  showExtend?: boolean;
  onExtend?: () => void;
}

/**
 * One seat at the table: avatar, pen-holder glow, countdown ring, hand-raise
 * badge. Rendered as a rail row on desktop and a compact chip in the mobile
 * cast strip.
 */
export default function CastSeat({
  variant = "rail",
  name,
  playerName,
  portrait,
  glyph,
  holdsPen,
  isYou,
  status = "active",
  handRaised = false,
  canPass,
  onPass,
  timer = null,
  showExtend = false,
  onExtend,
}: CastSeatProps) {
  const gone = status === "dead" || status === "retired";
  const compact = variant === "compact";

  // Ring geometry — drawn just outside the avatar.
  const box = compact ? 34 : 48;
  const r = compact ? 15 : 22;
  const circumference = 2 * Math.PI * r;
  const avatarSize = compact ? "h-[26px] w-[26px] text-[10px]" : "h-9 w-9 text-[13px]";

  const avatar = (
    <span className={`relative flex items-center justify-center ${gone ? "opacity-45 grayscale" : ""}`} style={{ width: box, height: box }}>
      {/* Countdown ring — the turn draining in real time */}
      {timer && (
        <svg
          className="absolute inset-0 -rotate-90"
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          aria-hidden
        >
          <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - timer.progress)}`}
            className={RING_COLOR[timer.urgency]}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      )}
      <span
        className={`flex items-center justify-center overflow-hidden rounded-full border font-display ${avatarSize} ${
          holdsPen
            ? "border-amber/60 bg-elevated text-amber shadow-[0_0_16px_-2px_rgba(216,178,90,0.55)]"
            : "border-border bg-elevated text-text-secondary"
        }`}
      >
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait} alt="" className="h-full w-full object-cover" />
        ) : (
          glyph ?? name.charAt(0).toUpperCase()
        )}
      </span>
      {/* Hand raised badge */}
      {handRaised && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-amber/50 bg-void text-[9px]"
          title={`${name} is asking for the spotlight`}
        >
          ✋
        </span>
      )}
      {gone && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-void text-[9px] text-text-tertiary" title={status === "dead" ? "Fallen" : "Retired"}>
          †
        </span>
      )}
    </span>
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={canPass ? onPass : undefined}
        disabled={!canPass}
        title={canPass ? `Pass the pen to ${name}` : `${name}${holdsPen ? " — holds the pen" : ""}`}
        aria-label={`${name}${holdsPen ? " — holds the pen" : ""}${handRaised ? " — hand raised" : ""}`}
        className={`shrink-0 rounded-full transition-transform ${canPass ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
      >
        {avatar}
      </button>
    );
  }

  return (
    <div
      className={`group/seat flex items-center gap-2.5 rounded-xl border px-2 py-1.5 transition-colors ${
        holdsPen
          ? "border-amber/40 bg-amber/[0.08]"
          : "border-transparent hover:border-border hover:bg-subtle/20"
      }`}
    >
      <button
        type="button"
        onClick={canPass ? onPass : undefined}
        disabled={!canPass}
        title={canPass ? `Pass the pen to ${name}` : name}
        aria-label={`${name}${holdsPen ? " — holds the pen" : ""}`}
        className={`shrink-0 ${canPass ? "cursor-pointer" : "cursor-default"}`}
      >
        {avatar}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 truncate text-[12.5px] ${holdsPen ? "text-amber" : gone ? "text-text-tertiary" : "text-text"}`}>
          <span className="truncate">{name}</span>
          {isYou && (
            <span className="shrink-0 rounded-full bg-lavender/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] text-lavender">
              You
            </span>
          )}
        </p>
        <p className="truncate text-[10px] text-text-ghost">
          {holdsPen ? (
            <span className="text-amber/75">holds the pen ✍</span>
          ) : gone ? (
            status === "dead" ? "has fallen" : "has retired"
          ) : (
            playerName ?? " "
          )}
        </p>
      </div>

      {/* Countdown + extend, on the penned seat */}
      {timer && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`font-mono text-[11px] font-bold tabular-nums ${TIME_COLOR[timer.urgency]}`}>
            {timer.timeStr}
          </span>
          {showExtend && onExtend && (
            <button
              type="button"
              onClick={onExtend}
              className="rounded-full border border-amber/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-amber/70 transition-colors hover:border-amber/45 hover:text-amber"
              title="Add 3 more minutes"
            >
              +3 min
            </button>
          )}
        </div>
      )}
    </div>
  );
}
