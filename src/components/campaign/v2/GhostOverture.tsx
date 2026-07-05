"use client";

import type { CSSProperties } from "react";

/**
 * The ghost overture — before the session begins, lines from past nights
 * drift up the unlit sheet as ghost ink. Gilded lines (the audience's gold
 * from earlier sessions) glow faintly warm. Renders inside the sheet via
 * PageRoom's `sheetVeil` (absolute, pointer-events-none), so the ghosts
 * paint above the paper without fighting the room's dark layer.
 *
 * Positions and delays come from a fixed table (SSR rule: no Math.random
 * in render — same law HouseGlimmers obeys with its CONSTELLATION).
 */

export interface OvertureLine {
  id: string;
  content: string;
  gilded: boolean;
  sessionTitle: string;
}

/** Fixed drift slots: left offset (%), animation delay (s), duration (s). */
const DRIFT_SLOTS: Array<{ left: number; delay: number; duration: number }> = [
  { left: 8, delay: 0, duration: 16 },
  { left: 46, delay: 4.5, duration: 19 },
  { left: 22, delay: 9, duration: 17 },
  { left: 58, delay: 13.5, duration: 20 },
  { left: 14, delay: 18, duration: 18 },
  { left: 38, delay: 22.5, duration: 16 },
];

export default function GhostOverture({ lines }: { lines: OvertureLine[] }) {
  if (lines.length === 0) return null;
  const shown = lines.slice(0, DRIFT_SLOTS.length);
  return (
    <div
      aria-hidden
      // Confined to the sheet's middle — ghosts never drift over the title
      // plate or the signature.
      className="pointer-events-none absolute inset-x-0 bottom-[18%] top-[16%] z-[3] overflow-hidden"
    >
      {shown.map((line, i) => {
        const slot = DRIFT_SLOTS[i];
        return (
          <p
            key={line.id}
            className={`ghost-line font-reading text-[13px] italic${line.gilded ? " ghost-line--gilded" : ""}`}
            style={
              {
                left: `${slot.left}%`,
                animationDelay: `${slot.delay}s`,
                animationDuration: `${slot.duration}s`,
                // Where this line rests when reduced motion disables the drift.
                "--ghost-rest": `${18 + i * 9}vh`,
              } as CSSProperties
            }
          >
            {line.content}
          </p>
        );
      })}
    </div>
  );
}
