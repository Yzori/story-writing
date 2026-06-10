"use client";

// Quiloria logo — the Q is an inkwell; the quill rises from it and sweeps
// out as the Q's tail. Ring in gold (candle flame / bronze ink per theme),
// feather in paper ink, a drop of gold ink at the nib.
//
// Exports:
//   <QuiloriaMark />          — static mark (icon only)
//   <QuiloriaLogo />          — static mark + wordmark
//   <QuiloriaLogoAnimated />  — draw-on sequence: ring inks itself, quill
//                               springs in, ink drop falls, letters settle
//
// Colors ride the theme tokens (text-amber / text-paper), so the logo is
// correct in both Lamplight and Daybreak. See docs/COLOR_SYSTEM.md.

import { motion } from "framer-motion";

/* ------------------------------------------------------------ geometry */
// Bowl: circle c(29,29) r17 with a 40° gap at the lower-right (25°–65°)
// where the tail exits. Drawn from the gap's lower edge, the long way
// around, to the gap's upper edge.
const RING_D = "M 36.2 44.4 A 17 17 0 1 1 44.4 36.2";

// Feather (mirrored from the legacy navbar quill, nib to the lower-right),
// sized so the plume reaches well inside the bowl — the quill visibly
// stands IN the inkwell and crosses the ring at the gap. Keeping the
// feather long is what stops the mark reading as a magnifying glass.
const FEATHER_TX = "translate(14 14) scale(1.5)";
const FEATHER_BODY =
  "M6 3C10 7 14 11 18 16C22 21 24 25 25 28L27 29L28 27C27 24 24 18 20 13C16 8 11 5 6 3Z";
const FEATHER_SPINE = "M6 3C6 3 5 4 6 6C7 8 10 12 14 16";
const FEATHER_NIB = "M25 28L27 29L28 27L25 28Z";

function MarkPaths({ ringClass, featherClass }: { ringClass: string; featherClass: string }) {
  return (
    <>
      <path
        d={RING_D}
        className={ringClass}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <g transform={FEATHER_TX} className={featherClass}>
        <path d={FEATHER_BODY} fill="currentColor" opacity="0.92" />
        <path d={FEATHER_SPINE} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
        <path d={FEATHER_NIB} fill="currentColor" />
      </g>
      {/* ink drop below the nib — always gold */}
      <circle cx="58" cy="59.5" r="1.6" className={ringClass} fill="currentColor" opacity="0.85" />
    </>
  );
}

/* ------------------------------------------------------------- static */

export function QuiloriaMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Quiloria"
      role="img"
    >
      <MarkPaths ringClass="text-amber" featherClass="text-paper" />
    </svg>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-bold tracking-wide ${className}`}
      style={{
        background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      Quiloria
    </span>
  );
}

export function QuiloriaLogo({
  size = 30,
  className = "",
  textClassName = "text-xl",
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <QuiloriaMark size={size} />
      <Wordmark className={textClassName} />
    </span>
  );
}

/* ----------------------------------------------------------- animated */
// Sequence (≈2s, then idle):
//   0.0–1.15s  ring draws itself like a stroke of ink
//   0.95s      quill springs up out of the well (origin at the nib)
//   1.45s      a drop of ink swells at the nib, falls, and lands as the dot
//   1.2s+      letters of the wordmark settle in, one by one
//   idle       the ring breathes a faint candle-glow pulse

const LETTERS = "Quiloria".split("");

/* -------------------------------------------------------- worldquill */
// "Quil" is the quill; "loria" is the world it writes. The Q bowl is an
// ORBIT: a tiny ringed world rides it, stars float inside the bowl, the
// orbit dissolves into stardust at the gap, and the quill — the comet
// that traced it — sweeps out as the tail. From the nib falls a star,
// not a drop.

const WQ_FEATHER_TX = "translate(31.6 32.2) scale(0.85)";
const WQ_PLANET = { x: 15.1, y: 19.25 };
const WQ_DUST: [number, number, number][] = [
  [45.5, 38.5, 1.4],
  [48.2, 42, 1.05],
  [50.4, 45.3, 0.75],
];

function WorldquillStatic() {
  return (
    <>
      {/* the orbit */}
      <path d={RING_D} className="text-amber" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      {/* the little ringed world riding it */}
      <g transform={`translate(${WQ_PLANET.x} ${WQ_PLANET.y})`}>
        <circle r="3" className="text-amber" fill="currentColor" />
        <ellipse rx="5.4" ry="1.7" transform="rotate(-24)" className="text-paper" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.85" />
      </g>
      {/* stars inside the bowl */}
      <path d="M 33 16.5 V 25.5 M 28.5 21 H 37.5" className="text-paper" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="24" cy="31" r="1.2" className="text-amber" fill="currentColor" opacity="0.9" />
      <circle cx="37" cy="30" r="0.9" className="text-paper" fill="currentColor" opacity="0.6" />
      {/* orbit dissolving into stardust at the gap */}
      {WQ_DUST.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} className="text-amber" fill="currentColor" opacity={0.9 - i * 0.2} />
      ))}
      {/* the comet-quill */}
      <g transform={WQ_FEATHER_TX} className="text-paper">
        <path d={FEATHER_BODY} fill="currentColor" opacity="0.92" />
        <path d={FEATHER_SPINE} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
        <path d={FEATHER_NIB} fill="currentColor" />
      </g>
      {/* a star falls from the nib */}
      <path d="M 58 56.6 V 61 M 55.8 58.8 H 60.2" className="text-amber" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  );
}

export function QuiloriaWorldMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="Quiloria" role="img">
      <WorldquillStatic />
    </svg>
  );
}

// Sequence: the orbit is traced · the world pops onto it and gains its
// ring · stars wake inside the bowl · the orbit scatters into dust ·
// the comet-quill sweeps in · a star falls from the nib and keeps
// twinkling. Idle: the bowl-star breathes.
export function QuiloriaWorldAnimated({
  size = 56,
  withWordmark = true,
  textClassName = "text-4xl",
  className = "",
  replayKey = 0,
}: {
  size?: number;
  withWordmark?: boolean;
  textClassName?: string;
  className?: string;
  replayKey?: number;
}) {
  return (
    <span key={replayKey} className={`inline-flex items-center gap-3.5 ${className}`}>
      <span className="relative inline-block" style={{ width: size, height: size }}>
        <motion.span
          className="absolute inset-[-20%] rounded-full"
          style={{ background: "radial-gradient(circle, var(--t-gold-glow), transparent 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.5, 0.9] }}
          transition={{ delay: 2.1, duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Quiloria" role="img" className="relative">
          {/* orbit traced */}
          <motion.path
            d={RING_D}
            className="text-amber"
            stroke="currentColor"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* the world arrives on its orbit */}
          <motion.g
            transform={`translate(${WQ_PLANET.x} ${WQ_PLANET.y})`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 380, damping: 17 }}
            style={{ transformOrigin: `${WQ_PLANET.x}px ${WQ_PLANET.y}px` }}
          >
            <circle r="3" className="text-amber" fill="currentColor" />
          </motion.g>
          <motion.ellipse
            cx={WQ_PLANET.x}
            cy={WQ_PLANET.y}
            rx="5.4"
            ry="1.7"
            transform={`rotate(-24 ${WQ_PLANET.x} ${WQ_PLANET.y})`}
            className="text-paper"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            opacity="0.85"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.95, duration: 0.4, ease: "easeOut" }}
          />
          {/* stars wake inside the bowl; the big one keeps breathing */}
          <motion.path
            d="M 33 16.5 V 25.5 M 28.5 21 H 37.5"
            className="text-paper"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.45, 1], scale: 1 }}
            transition={{
              opacity: { delay: 1.05, duration: 4.5, times: [0, 0.1, 0.55, 1], repeat: Infinity, repeatDelay: 0.5 },
              scale: { delay: 1.05, type: "spring", stiffness: 400, damping: 16 },
            }}
            style={{ transformOrigin: "33px 21px" }}
          />
          {[
            { cx: 24, cy: 31, r: 1.2, cls: "text-amber", o: 0.9, d: 1.2 },
            { cx: 37, cy: 30, r: 0.9, cls: "text-paper", o: 0.6, d: 1.3 },
          ].map((s, i) => (
            <motion.circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              className={s.cls}
              fill="currentColor"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: s.o, scale: 1 }}
              transition={{ delay: s.d, type: "spring", stiffness: 400, damping: 16 }}
              style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}
            />
          ))}
          {/* orbit scatters into stardust */}
          {WQ_DUST.map(([x, y, r], i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              className="text-amber"
              fill="currentColor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 - i * 0.2 }}
              transition={{ delay: 1.15 + i * 0.12, duration: 0.25 }}
            />
          ))}
          {/* the comet-quill sweeps in */}
          <motion.g
            initial={{ opacity: 0, scale: 0.4, rotate: -28 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 1.35, type: "spring", stiffness: 230, damping: 16 }}
            style={{ transformOrigin: "55px 56px" }}
          >
            <g transform={WQ_FEATHER_TX} className="text-paper">
              <path d={FEATHER_BODY} fill="currentColor" opacity="0.92" />
              <path d={FEATHER_SPINE} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
              <path d={FEATHER_NIB} fill="currentColor" />
            </g>
          </motion.g>
          {/* a star falls from the nib and keeps twinkling */}
          <motion.g
            initial={{ opacity: 0, y: -4, scale: 0.3 }}
            animate={{ opacity: [0, 1, 0.5, 1], y: 0, scale: 1 }}
            transition={{
              y: { delay: 1.85, duration: 0.35, ease: "easeIn" },
              scale: { delay: 1.85, type: "spring", stiffness: 400, damping: 15 },
              opacity: { delay: 1.85, duration: 3.8, times: [0, 0.15, 0.6, 1], repeat: Infinity, repeatDelay: 0.4 },
            }}
            style={{ transformOrigin: "58px 58.8px" }}
          >
            <path d="M 58 56.6 V 61 M 55.8 58.8 H 60.2" className="text-amber" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </motion.g>
        </svg>
      </span>
      {withWordmark && (
        <span
          className={`font-display font-bold tracking-wide ${textClassName}`}
          style={{
            background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          aria-hidden
        >
          {"Quiloria".split("").map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.55 + i * 0.055, duration: 0.4, ease: "easeOut" }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      )}
    </span>
  );
}

/* --------------------------------------------------------- signature */
// Creative cut: the brand "signs itself". Italic wordmark, then a
// calligraphic swash draws beneath it — a loop under the Q (the tail)
// flowing into an underline that lifts at the end — and two specks of
// ink land where the pen left the page. Ink motes drift off the capital.

const SWASH_D =
  "M 22 10 C 10 22 22 28 30 20 C 36 14 28 6 21 10 C 50 26 110 28 170 22 C 220 17 262 18 292 8";

export function QuiloriaSignature({
  textClassName = "text-5xl",
  className = "",
  replayKey = 0,
}: {
  textClassName?: string;
  className?: string;
  replayKey?: number;
}) {
  return (
    <span key={replayKey} className={`relative inline-block ${className}`}>
      {/* ink motes drifting off the capital Q */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-amber"
          style={{ width: 3 - i * 0.5, height: 3 - i * 0.5, left: 8 + i * 9, top: 4 + i * 5 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], y: [-2, -14 - i * 5], x: [0, 4 + i * 3] }}
          transition={{ delay: 1.9 + i * 0.5, duration: 2.6, repeat: Infinity, repeatDelay: 2.2, ease: "easeOut" }}
        />
      ))}

      {/* the name, written quickly left to right */}
      <span
        className={`font-display italic font-bold tracking-tight ${textClassName}`}
        style={{
          background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 5, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: i * 0.07, duration: 0.28, ease: "easeOut" }}
          >
            {ch}
          </motion.span>
        ))}
      </span>

      {/* the flourish, signed beneath */}
      <svg
        viewBox="0 0 300 30"
        preserveAspectRatio="none"
        className="absolute -bottom-4 left-0 h-[0.42em] w-full text-amber"
        style={{ fontSize: "1em" }}
        aria-hidden
      >
        <motion.path
          d={SWASH_D}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.75, duration: 0.95, ease: [0.55, 0, 0.3, 1] }}
        />
        {/* specks where the pen left the page */}
        <motion.circle
          cx="295" cy="6" r="2"
          fill="currentColor"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 500, damping: 18 }}
        />
        <motion.circle
          cx="287" cy="13" r="1.1"
          fill="currentColor"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 1.78, type: "spring", stiffness: 500, damping: 18 }}
        />
      </svg>
    </span>
  );
}

export function QuiloriaLogoAnimated({
  size = 56,
  withWordmark = true,
  textClassName = "text-4xl",
  className = "",
  replayKey = 0,
}: {
  size?: number;
  withWordmark?: boolean;
  textClassName?: string;
  className?: string;
  replayKey?: number; // bump to replay the sequence
}) {
  return (
    <span key={replayKey} className={`inline-flex items-center gap-3.5 ${className}`}>
      <span className="relative inline-block" style={{ width: size, height: size }}>
        {/* candle-glow pulse behind the mark */}
        <motion.span
          className="absolute inset-[-20%] rounded-full"
          style={{ background: "radial-gradient(circle, var(--t-gold-glow), transparent 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.55, 0.9] }}
          transition={{ delay: 1.6, duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Quiloria" role="img" className="relative">
          {/* ring inks itself on */}
          <motion.path
            d={RING_D}
            className="text-amber"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.15, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* quill springs out of the inkwell */}
          <motion.g
            initial={{ opacity: 0, scale: 0.4, rotate: -28 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.95, type: "spring", stiffness: 230, damping: 16 }}
            style={{ transformOrigin: "55px 56px" }}
          >
            <g transform={FEATHER_TX} className="text-paper">
              <path d={FEATHER_BODY} fill="currentColor" opacity="0.92" />
              <path d={FEATHER_SPINE} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
              <path d={FEATHER_NIB} fill="currentColor" />
            </g>
          </motion.g>
          {/* ink drop: swells at the nib, falls, lands as the dot */}
          <motion.circle
            cx="58"
            r="1.6"
            className="text-amber"
            fill="currentColor"
            initial={{ cy: 56.5, opacity: 0, scale: 0.4 }}
            animate={{ cy: [56.5, 56.5, 59.5], opacity: [0, 0.95, 0.85], scale: [0.4, 1.15, 1] }}
            transition={{ delay: 1.45, duration: 0.5, times: [0, 0.45, 1], ease: "easeIn" }}
          />
        </svg>
      </span>
      {withWordmark && (
        <span
          className={`font-display font-bold tracking-wide ${textClassName}`}
          style={{
            background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          aria-hidden
        >
          {LETTERS.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.055, duration: 0.4, ease: "easeOut" }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      )}
    </span>
  );
}
