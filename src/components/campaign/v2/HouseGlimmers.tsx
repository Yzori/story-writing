"use client";

/**
 * The felt audience — Concept IV's second layer. The dark around the page
 * glimmers with the house: one gold mote per watcher (capped), twinkling
 * at the room's edges, never over the sheet. No count, no names — the
 * number in the header says how many; this says they're *here*.
 *
 * Positions are a fixed constellation (no Math.random — the room must
 * render the same on server and client); the cap keeps a full house from
 * becoming a light show.
 */

const CONSTELLATION: Array<{ top: number; left: number; delay: number; dur: number }> = [
  { top: 18, left: 5, delay: 0, dur: 6.5 },
  { top: 64, left: 93, delay: 1.8, dur: 7.2 },
  { top: 38, left: 9, delay: 3.1, dur: 5.8 },
  { top: 80, left: 4, delay: 0.9, dur: 7.8 },
  { top: 24, left: 95, delay: 2.4, dur: 6.1 },
  { top: 55, left: 3, delay: 4.2, dur: 6.9 },
  { top: 88, left: 91, delay: 1.2, dur: 5.6 },
  { top: 10, left: 90, delay: 3.7, dur: 7.5 },
  { top: 72, left: 8, delay: 2.9, dur: 6.3 },
  { top: 45, left: 96, delay: 0.5, dur: 7.0 },
  { top: 92, left: 7, delay: 4.8, dur: 6.6 },
  { top: 31, left: 92, delay: 1.5, dur: 5.9 },
  { top: 8, left: 6, delay: 2.1, dur: 7.3 },
  { top: 60, left: 89, delay: 3.4, dur: 6.0 },
];

export default function HouseGlimmers({ count }: { count: number }) {
  const lit = Math.min(count, CONSTELLATION.length);
  if (lit <= 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {CONSTELLATION.slice(0, lit).map((g, i) => (
        <span
          key={i}
          className="house-glimmer"
          style={{
            top: `${g.top}%`,
            left: `${g.left}%`,
            animationDelay: `${g.delay}s`,
            animationDuration: `${g.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
