"use client";

import { motion } from "framer-motion";
import { useId } from "react";

// Animated Quill Ring lockup. Geometry is kept in sync with the static
// QuillRingMark in BrandLogo.tsx and design/build-brand.mjs — edit all three
// together. Lives in its own "use client" module so BrandLogo.tsx stays
// server-importable (Footer etc.).
const VANE =
  "M -26 -1 C -20 -8.5 -8 -10.8 3 -9.8 C 12 -9 18.5 -6.2 23.5 -2.5 L 24.5 -0.5 C 19 4.8 9 7.8 -1 7.2 C -11.5 6.6 -20.5 4.2 -26 -1 Z";
const RACHIS = "M -22.5 -0.7 C -10 -1.8 6 -1 21 -0.6";
const BARB_CUTS = "M 13 -0.8 L 6.5 7.5 M 3 -0.9 L -3.5 7.4 M -7 -1 L -13 6.2";
const SHAFT = "M 22 0 L 30 0";
const NIB = "M 28 -1.9 Q 36 -1.2 39.5 0.6 Q 34.5 1.5 28 1.9 Z";
const DROP =
  "M 79.5 76.5 C 79.5 76.5 75.1 82.4 75.1 85.1 a 4.4 4.4 0 0 0 8.8 0 C 83.9 82.4 79.5 76.5 79.5 76.5 Z";
const SPARK =
  "M 54.5 22.5 C 55.6 26.7 57.6 28.7 61.8 29.8 C 57.6 30.9 55.6 32.9 54.5 37.1 C 53.4 32.9 51.4 30.9 47.2 29.8 C 51.4 28.7 53.4 26.7 54.5 22.5 Z";

// "Quiloria" — the second "i" (index 6) carries the falling Ink Drop.
const LETTERS: { ch: string; drop?: boolean }[] = [
  { ch: "Q" },
  { ch: "u" },
  { ch: "i" },
  { ch: "l" },
  { ch: "o" },
  { ch: "r" },
  { ch: "ı", drop: true },
  { ch: "a" },
];

/**
 * The Quill Ring assembling itself: the ring inks on, the quill settles onto
 * it, an Ink Drop drips from the nib, and the Spark ignites — while the
 * wordmark writes in letter by letter. Drop-in replacement API for the old
 * QuiloriaLogoAnimated (size / withWordmark / textClassName / replayKey).
 */
export function QuillRingLogoAnimated({
  size = 56,
  withWordmark = true,
  textClassName = "text-4xl",
  className = "",
  replayKey = 0,
  markClassName = "text-paper",
}: {
  size?: number;
  withWordmark?: boolean;
  textClassName?: string;
  className?: string;
  replayKey?: number; // bump to replay the sequence
  markClassName?: string; // color of the feather + ring (spark/drop stay gold)
}) {
  const maskId = `qra-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <span key={replayKey} className={`inline-flex items-center gap-3.5 ${className}`}>
      <span className="relative inline-block" style={{ width: size, height: size }}>
        {/* candle-glow pulse behind the mark */}
        <motion.span
          className="absolute inset-[-18%] rounded-full"
          style={{ background: "radial-gradient(circle, var(--t-gold-glow), transparent 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.55, 0.9] }}
          transition={{ delay: 1.6, duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          role="img"
          aria-label="Quiloria"
          className={`relative ${markClassName}`}
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect width="100" height="100" fill="white" />
              <g transform="translate(46 44) rotate(45)">
                <path d={RACHIS} fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                <path d={BARB_CUTS} fill="none" stroke="black" strokeWidth="1.5" />
              </g>
            </mask>
          </defs>
          {/* ring inks itself on */}
          <motion.circle
            cx="46"
            cy="44"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            transform="rotate(45 46 44)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.05, ease: [0.55, 0.06, 0.35, 1] }}
          />
          {/* quill settles onto the ring */}
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={{ opacity: 0, scale: 0.9, x: -5, y: -5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
            transition={{ delay: 0.95, type: "spring", stiffness: 200, damping: 18 }}
          >
            <g mask={`url(#${maskId})`}>
              <path d={VANE} fill="currentColor" transform="translate(46 44) rotate(45)" />
            </g>
            <g transform="translate(46 44) rotate(45)">
              <path d={SHAFT} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d={NIB} fill="currentColor" />
            </g>
          </motion.g>
          {/* ink drop drips from the nib */}
          <motion.path
            d={DROP}
            fill="var(--t-gold)"
            style={{ transformBox: "fill-box", transformOrigin: "top center" }}
            initial={{ opacity: 0, y: -9, scale: 0.25 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.7, duration: 0.6, ease: [0.3, 1.4, 0.5, 1] }}
          />
          {/* spark ignites where the feather touched */}
          <motion.path
            d={SPARK}
            fill="var(--t-gold)"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={{ opacity: 0, scale: 0, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 2.05, duration: 0.5, ease: [0.2, 0.9, 0.3, 1.3] }}
          />
        </svg>
      </span>
      {withWordmark && (
        <span
          // leading-none: the drop's bottom-0.66em offset is calibrated against
          // line-height 1 (design/quiloria-logo-concepts.html) — inherited
          // leading makes the inline-block letter boxes taller and the drop
          // sinks onto the ı stem
          className={`font-display font-bold leading-none tracking-wide ${textClassName}`}
          style={{
            background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          aria-hidden
        >
          {LETTERS.map((l, i) => (
            <motion.span
              key={i}
              className="relative inline-block"
              // inline-block boxes don't inherit the parent's clipped gradient,
              // so re-inherit + re-clip it per letter (same trick as the static
              // wordmark) — otherwise the text-fill:transparent renders invisible
              style={{ background: "inherit", WebkitBackgroundClip: "text" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.055, duration: 0.4, ease: "easeOut" }}
            >
              {l.ch}
              {l.drop && (
                <svg
                  viewBox="0 0 10 14"
                  aria-hidden
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
              )}
            </motion.span>
          ))}
        </span>
      )}
    </span>
  );
}
