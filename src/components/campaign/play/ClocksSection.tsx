"use client";

import ProgressClock, { type ProgressClockData } from "@/components/campaign/ProgressClock";
import StakesTracker from "@/components/campaign/StakesTracker";

interface ClocksSectionProps {
  clocks: ProgressClockData[];
  isGM: boolean;
  onClocksChange?: (clocks: ProgressClockData[]) => void;
}

/**
 * The Pressure — tension clocks, always visible in the rail. The GM manages
 * them (StakesTracker); players feel them rising, read-only.
 */
export default function ClocksSection({ clocks, isGM, onClocksChange }: ClocksSectionProps) {
  // Players with no clocks see nothing — pressure that doesn't exist
  // shouldn't take up room. The GM always sees the section (to start one).
  if (!isGM && clocks.length === 0) return null;

  if (isGM) {
    return (
      <section aria-label="Pressure clocks">
        <StakesTracker clocks={clocks} onClocksChange={onClocksChange} />
      </section>
    );
  }

  return (
    <section aria-label="Pressure clocks">
      <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">
        The Pressure
      </p>
      <div className="flex flex-wrap justify-center gap-3 px-2">
        {clocks.map((clock) => (
          <ProgressClock key={clock.id} clock={clock} size={48} interactive={false} />
        ))}
      </div>
    </section>
  );
}
