"use client";

import ProgressClock from "@/components/campaign/ProgressClock";
import type { ClockAnnotation } from "@/lib/manuscript-annotations";
import NoteShell from "./NoteShell";

/**
 * A pressure clock drawn in the margin beside the scene it threatens,
 * visibly filling. The Director ticks it by hand.
 */
export default function ClockNote({
  annotation,
  isGM,
  onToggleSegment,
}: {
  annotation: ClockAnnotation;
  isGM: boolean;
  onToggleSegment?: (clockId: string, segmentIndex: number) => void;
}) {
  const { clock } = annotation;
  return (
    <NoteShell tone={clock.type === "danger" ? "rose" : "default"} rotate={-0.8}>
      <div className="flex items-center gap-2.5">
        <ProgressClock
          clock={clock}
          size={44}
          interactive={isGM && !!onToggleSegment}
          onToggleSegment={
            isGM && onToggleSegment ? (index) => onToggleSegment(clock.id, index) : undefined
          }
        />
        <div className="min-w-0">
          <p className="hand-note leading-tight text-paper/85">{clock.name}</p>
          <p className="font-mono text-[10px] text-text-tertiary">
            {clock.filled}/{clock.segments}
          </p>
        </div>
      </div>
    </NoteShell>
  );
}
