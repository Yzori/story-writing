"use client";

import { motion, useReducedMotion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// The studio's living ambience — a cocoa cup steaming on the desk, and a few
// ink-spirits (luminous butterflies and swallows) drifting in the page
// margins, the same creatures the film's ink becomes. Sparse and small:
// cozy comes from objects that are CRAFTED and ALIVE, never from clutter.
// Colors run through --t-sprite-* tokens so they read in both themes.
// ─────────────────────────────────────────────────────────────────────────────

const STEAM = [
  "M37,50 C33,42 41,36 37,28 C34,22 39,15 37,9",
  "M46,52 C42,44 50,38 46,30 C43,23 48,16 46,9",
  "M54,50 C51,43 58,37 54,29 C51,23 56,16 54,11",
];

/** A cup of hot chocolate, still steaming — the desk was never left for long. */
export function CocoaCup({ reduce, className = "" }: { reduce: boolean | null; className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <svg viewBox="0 0 90 112" className="w-full overflow-visible">
        <defs>
          <linearGradient id="cup-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4a3520" />
            <stop offset="45%" stopColor="#2a2014" />
            <stop offset="100%" stopColor="#181109" />
          </linearGradient>
          <radialGradient id="cup-glow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="rgba(224,169,62,0.16)" />
            <stop offset="100%" stopColor="rgba(224,169,62,0)" />
          </radialGradient>
        </defs>

        {/* the warmth it gives off */}
        <ellipse cx="45" cy="82" rx="44" ry="26" fill="url(#cup-glow)" />

        {/* steam, drifting */}
        {STEAM.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="rgba(242,232,208,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            style={{ filter: "blur(1.3px)" }}
            initial={{ opacity: reduce ? 0.22 : 0 }}
            animate={reduce ? undefined : { opacity: [0, 0.5, 0], y: [6, -10] }}
            transition={{ duration: 3.8, repeat: Infinity, delay: i * 1.25, ease: "easeInOut" }}
          />
        ))}

        {/* saucer */}
        <ellipse cx="45" cy="99" rx="27" ry="5.5" fill="#221a10" />
        <path d="M19,98.5 C23,95.5 33,93.8 45,93.8 C57,93.8 67,95.5 71,98.5" stroke="rgba(224,169,62,0.25)" strokeWidth="1" fill="none" />

        {/* handle */}
        <path d="M62.5,66 C74.5,63 76.5,79 61.5,81.5" stroke="#2e2316" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M63,67.5 C72.5,65.5 74,77.5 61.5,79.5" stroke="rgba(224,169,62,0.3)" strokeWidth="1" fill="none" />

        {/* the cup */}
        <path d="M27,60 C27,62 29,86 30,89 C31.5,94 37,96.5 45,96.5 C53,96.5 58.5,94 60,89 C61,86 63,62 63,60 Z" fill="url(#cup-body)" />
        {/* lamplight catching the left side */}
        <path d="M28.2,63 C28.8,73 30.2,86 31.8,90" stroke="rgba(224,169,62,0.45)" strokeWidth="1.4" fill="none" strokeLinecap="round" />

        {/* cocoa, with marshmallows */}
        <ellipse cx="45" cy="60" rx="18" ry="4.8" fill="#150f08" />
        <ellipse cx="45" cy="60.4" rx="15.5" ry="3.8" fill="#6e4526" />
        <rect x="39" y="57.2" width="6.5" height="4.8" rx="2" fill="#efe5cc" transform="rotate(-8 42 59.5)" />
        <rect x="47" y="58" width="5.5" height="4.2" rx="2" fill="#e3d6b6" transform="rotate(11 50 60)" />
        <path d="M33,59.5 C37,57.7 53,57.7 57,59.5" stroke="rgba(224,169,62,0.3)" strokeWidth="1" fill="none" />
        <ellipse cx="45" cy="60" rx="18" ry="4.8" fill="none" stroke="rgba(224,169,62,0.35)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ── the ink-spirits ──────────────────────────────────────────

type SpriteColor = "gold" | "violet";
const SPRITE_VAR: Record<SpriteColor, string> = {
  gold: "var(--t-sprite-gold)",
  violet: "var(--t-sprite-violet)",
};

function SpriteButterfly({ color, reduce, flapDur = 0.9 }: { color: SpriteColor; reduce: boolean | null; flapDur?: number }) {
  const c = SPRITE_VAR[color];
  return (
    <svg viewBox="0 0 40 36" className="w-full overflow-visible" style={{ filter: `drop-shadow(0 0 7px rgba(${c},0.7))` }}>
      {/* wings fold toward the body — the flap */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        animate={reduce ? undefined : { scaleX: [1, 0.32, 1] }}
        transition={{ duration: flapDur, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M19,17 C10,2 0,7 7,17 Z" fill={`rgba(${c},0.75)`} />
        <path d="M19,19 C9,32 2,26 8,19 Z" fill={`rgba(${c},0.55)`} />
        <path d="M21,17 C30,2 40,7 33,17 Z" fill={`rgba(${c},0.75)`} />
        <path d="M21,19 C31,32 38,26 32,19 Z" fill={`rgba(${c},0.55)`} />
        <circle cx="9.5" cy="12" r="1.1" fill="rgba(255,255,255,0.65)" />
        <circle cx="30.5" cy="12" r="1.1" fill="rgba(255,255,255,0.65)" />
      </motion.g>
      <ellipse cx="20" cy="18" rx="1.3" ry="5" fill={`rgba(${c},0.95)`} />
      <path d="M19,13 C17,10 15,9 13,9 M21,13 C23,10 25,9 27,9" stroke={`rgba(${c},0.8)`} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SpriteBird({ color, reduce }: { color: SpriteColor; reduce: boolean | null }) {
  const c = SPRITE_VAR[color];
  const flap = { duration: 1.15, times: [0, 0.3, 0.6, 1] as number[], repeat: Infinity, ease: "easeInOut" as const };
  return (
    <svg viewBox="0 0 48 26" className="w-full overflow-visible" style={{ filter: `drop-shadow(0 0 7px rgba(${c},0.7))` }}>
      <motion.path
        d="M21,13 C14,2 5,3 2,9 C8,9 15,12 21,15 Z"
        fill={`rgba(${c},0.8)`}
        style={{ transformBox: "fill-box", transformOrigin: "100% 85%" }}
        animate={reduce ? undefined : { rotate: [0, -16, 0, 0] }}
        transition={flap}
      />
      <motion.path
        d="M25,13 C32,2 41,3 44,9 C38,9 31,12 25,15 Z"
        fill={`rgba(${c},0.8)`}
        style={{ transformBox: "fill-box", transformOrigin: "0% 85%" }}
        animate={reduce ? undefined : { rotate: [0, 16, 0, 0] }}
        transition={flap}
      />
      <path
        d="M19,14 C20,10.5 26,10.5 27,13.5 C27.5,15 26,16.5 24,17 C22,17.5 20,20 17,22 C18.5,19.5 19,17 19,14 Z"
        fill={`rgba(${c},0.95)`}
      />
      <circle cx="25.4" cy="12.6" r="0.9" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

// a few motes shaken loose as the spirit moves
const TRAIL = [
  { dx: -9, dy: 12, delay: 0 },
  { dx: 7, dy: 16, delay: 0.9 },
  { dx: -2, dy: 22, delay: 1.7 },
];

function SparkleTrail({ color }: { color: SpriteColor }) {
  const c = SPRITE_VAR[color];
  return (
    <>
      {TRAIL.map((t, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-[3px] w-[3px] rounded-full"
          style={{ backgroundColor: `rgba(${c},0.9)`, boxShadow: `0 0 6px rgba(${c},0.7)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0], x: [0, t.dx], y: [0, t.dy], scale: [0.4, 1, 0.2] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: t.delay, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

interface SpiritSpec {
  kind: "butterfly" | "bird";
  color: SpriteColor;
  /** tailwind positioning within the page */
  pos: string;
  drift: { x: number[]; y: number[]; rotate: number[] };
  dur: number;
  delay: number;
  flapDur?: number;
}

// hugging the content column — close company, never over the words
const SPIRITS: SpiritSpec[] = [
  {
    kind: "butterfly",
    color: "gold",
    pos: "-left-20 top-[26%] w-8",
    drift: { x: [0, 16, -10, 8, 0], y: [0, -52, -16, -70, 0], rotate: [0, 7, -5, 4, 0] },
    dur: 34,
    delay: 0,
    flapDur: 0.85,
  },
  {
    kind: "bird",
    color: "violet",
    pos: "-left-24 top-[64%] w-10",
    drift: { x: [0, 22, -6, 12, 0], y: [0, -64, -110, -40, 0], rotate: [0, -6, 4, -3, 0] },
    dur: 42,
    delay: 6,
  },
  {
    kind: "bird",
    color: "gold",
    pos: "-right-24 top-[12%] w-11",
    drift: { x: [0, -18, 8, -10, 0], y: [0, 56, 110, 40, 0], rotate: [0, 5, -4, 3, 0] },
    dur: 46,
    delay: 12,
  },
  {
    kind: "butterfly",
    color: "violet",
    pos: "-right-14 top-[58%] w-7",
    drift: { x: [0, -14, 8, -6, 0], y: [0, -44, -12, -60, 0], rotate: [0, -8, 5, -4, 0] },
    dur: 30,
    delay: 3,
    flapDur: 1.05,
  },
];

/** Ink-spirits beside the studio's column — the film's creatures, at home. */
export function SparkleFauna() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] hidden xl:block" aria-hidden>
      <div className="relative mx-auto h-full max-w-5xl">
      {SPIRITS.map((s, i) => (
        <motion.div
          key={i}
          className={`absolute ${s.pos}`}
          animate={reduce ? undefined : { x: s.drift.x, y: s.drift.y, rotate: s.drift.rotate }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        >
          <div className="relative">
            {s.kind === "butterfly" ? (
              <SpriteButterfly color={s.color} reduce={reduce} flapDur={s.flapDur} />
            ) : (
              <SpriteBird color={s.color} reduce={reduce} />
            )}
            {!reduce && <SparkleTrail color={s.color} />}
          </div>
        </motion.div>
      ))}
      </div>
    </div>
  );
}
