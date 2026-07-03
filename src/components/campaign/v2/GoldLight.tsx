"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The dark answers gold with light — a slow warm flare around the sheet,
 * seen by everyone in the room at once. No amount, no name: just light.
 * `flareCount` is a monotonic counter from the gold hook; each increment
 * restarts the flare (via the element key).
 */
export default function GoldLight({ flareCount }: { flareCount: number }) {
  const [burst, setBurst] = useState(0);
  const lastRef = useRef(flareCount);

  useEffect(() => {
    if (flareCount <= lastRef.current) {
      lastRef.current = flareCount;
      return;
    }
    lastRef.current = flareCount;
    // Async flush — React 19 forbids synchronous setState in an effect body.
    const t = setTimeout(() => setBurst((b) => b + 1), 0);
    return () => clearTimeout(t);
  }, [flareCount]);

  if (burst === 0) return null;
  return (
    <div
      key={burst}
      className="gold-flare pointer-events-none fixed inset-0 z-[45]"
      aria-hidden="true"
    />
  );
}
