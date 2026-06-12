import { useId, type CSSProperties } from "react";

/**
 * The Quill Ring — Quiloria's primary mark. A feather laid across the world
 * it writes: the ring is a hidden Q, the nib slips out as its tail shedding
 * one Ink Drop, and a Spark rises where the feather touched.
 *
 * Feather + ring render in currentColor; the Spark and Ink Drop are always
 * candle-gold via the theme token. Static SVG assets (including an animated
 * variant) live in /public/brand — regenerate with `node design/build-brand.mjs`.
 */
export function QuillRingMark({ className }: { className?: string }) {
  const maskId = `qr-cuts-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          <g transform="translate(46 44) rotate(45)">
            <path
              d="M -22.5 -0.7 C -10 -1.8 6 -1 21 -0.6"
              fill="none"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 13 -0.8 L 6.5 7.5 M 3 -0.9 L -3.5 7.4 M -7 -1 L -13 6.2"
              fill="none"
              stroke="black"
              strokeWidth="1.5"
            />
          </g>
        </mask>
      </defs>
      <circle cx="46" cy="44" r="30" fill="none" stroke="currentColor" strokeWidth="3.2" />
      <g mask={`url(#${maskId})`}>
        <path
          d="M -26 -1 C -20 -8.5 -8 -10.8 3 -9.8 C 12 -9 18.5 -6.2 23.5 -2.5 L 24.5 -0.5 C 19 4.8 9 7.8 -1 7.2 C -11.5 6.6 -20.5 4.2 -26 -1 Z"
          fill="currentColor"
          transform="translate(46 44) rotate(45)"
        />
      </g>
      <g transform="translate(46 44) rotate(45)">
        <path d="M 22 0 L 30 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M 28 -1.9 Q 36 -1.2 39.5 0.6 Q 34.5 1.5 28 1.9 Z" fill="currentColor" />
      </g>
      <path
        d="M 79.5 76.5 C 79.5 76.5 75.1 82.4 75.1 85.1 a 4.4 4.4 0 0 0 8.8 0 C 83.9 82.4 79.5 76.5 79.5 76.5 Z"
        fill="var(--t-gold)"
      />
      <path
        d="M 54.5 22.5 C 55.6 26.7 57.6 28.7 61.8 29.8 C 57.6 30.9 55.6 32.9 54.5 37.1 C 53.4 32.9 51.4 30.9 47.2 29.8 C 51.4 28.7 53.4 26.7 54.5 22.5 Z"
        fill="var(--t-gold)"
      />
    </svg>
  );
}

/**
 * The Quiloria wordmark: the dot of the "i" is a falling Ink Drop (dotless ı
 * plus a positioned gold drop). All sizing is em-relative, so it scales with
 * font-size. Pass gradient text styles via `style` if desired.
 */
export function QuiloriaWordmark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // leading-none + inline-block wrapper: the drop's bottom-0.66em offset is
    // calibrated against line-height 1 (design/quiloria-logo-concepts.html)
    <span className={`leading-none ${className ?? ""}`} style={style} aria-hidden="true">
      Quilor
      {/* positioned elements paint in their own layer, outside the parent's
          background-clip:text — so re-inherit the gradient and clip it here */}
      <span
        className="relative inline-block"
        style={{ background: "inherit", WebkitBackgroundClip: "text" }}
      >
        ı
        <svg
          viewBox="0 0 10 14"
          aria-hidden="true"
          className="absolute"
          style={{
            left: "50%",
            transform: "translateX(-54%)",
            bottom: "0.66em",
            width: "0.19em",
            height: "auto",
          }}
        >
          <path
            d="M 5 0.5 C 5 0.5 1.2 6 1.2 8.8 a 3.8 3.8 0 0 0 7.6 0 C 8.8 6 5 0.5 5 0.5 Z"
            fill="var(--t-gold)"
          />
        </svg>
      </span>
      a
    </span>
  );
}
