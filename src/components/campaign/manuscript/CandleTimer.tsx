"use client";

import type { TurnTimerUrgency } from "@/hooks/use-turn-timer";

/**
 * The turn timer as a candle burning down. Pure presentation — the ONE
 * useTurnTimer mount lives at page level and only its outputs travel here,
 * so the candle can render in the rim or the strip without a second timer.
 *
 * Wax height = time remaining. The flame flickers faster as it runs low and
 * turns ember-red at the end; "feed the flame" is the +3 minute extension.
 */
export default function CandleTimer({
  progress,
  timeStr,
  urgency,
  lit = true,
  burning = true,
  showExtend = false,
  onExtend,
  compact = false,
}: {
  progress: number; // 0..1 remaining
  timeStr: string;
  urgency: TurnTimerUrgency;
  /** Snuffed when the session ends. */
  lit?: boolean;
  /** False while the Director holds the pen — the candle stands full and calm. */
  burning?: boolean;
  showExtend?: boolean;
  onExtend?: () => void;
  compact?: boolean;
}) {
  const waxHeight = burning ? Math.max(0.08, progress) : 1;
  const height = compact ? 26 : 72;
  const width = compact ? 10 : 22;

  return (
    <div className={`flex ${compact ? "flex-row items-end gap-1.5" : "flex-col items-center gap-1"}`}>
      <div className="relative flex flex-col justify-end" style={{ height, width }}>
        {lit && (
          <span
            className="candle-flame"
            data-urgency={burning ? urgency : "calm"}
            style={{
              width: compact ? 8 : 14,
              height: compact ? 10 : 18,
              top: `${(1 - waxHeight) * 100}%`,
            }}
            aria-hidden="true"
          />
        )}
        {lit && burning && urgency === "critical" && !compact && (
          <span className="candle-drip left-1" style={{ top: `${(1 - waxHeight) * 100}%` }} aria-hidden="true" />
        )}
        <div
          className={`candle-wax w-full ${lit ? "" : "opacity-40"}`}
          style={{ height: `${waxHeight * 100}%` }}
        />
      </div>
      {lit && burning && (
        <span
          className={`hand-note ${compact ? "text-sm" : "text-base"} ${
            urgency === "critical" ? "text-rose" : urgency === "warn" ? "text-amber" : ""
          }`}
        >
          {timeStr}
        </span>
      )}
      {showExtend && onExtend && (
        <button
          type="button"
          onClick={onExtend}
          className="hand-note cursor-pointer text-sm text-amber/80 underline decoration-amber/50 decoration-wavy underline-offset-2 transition-opacity hover:opacity-100"
          title="Feed the flame — three more minutes"
        >
          feed the flame
        </button>
      )}
    </div>
  );
}
