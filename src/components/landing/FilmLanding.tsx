"use client";

/*
 * The anon homepage — "the film is the page", six acts, one narrator.
 *
 * Gate (first frame + headline + sound choice) → the 17.6s film plays
 * ITSELF with copy beats synced to its timeline → Quiloria title card
 * (the Ink Drop falls in as the dot of the i) → IV · The Ways →
 * V · First Line + Ledger (real stories) → VI · write/read doors.
 * Scroll is never required for the arc — and never trapped either.
 *
 * Film timeline (probed from the asset):
 *   0.0–5.6s   split-screen: writer's ink rises / reader's book glows
 *   5.6–9.3s   the ink sweeps across the shelves — the crossing
 *   9.3–14.4s  the dragon fills the reader's room; she looks up
 *   14.4–17.6s fade to black, drifting gold dust  ← the handoff
 *
 * Server passes real tales via props; fixtures cover fresh installs.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QuillRingMark } from "@/components/shared/BrandLogo";
import { Grain, Motes } from "@/components/shared/Atmosphere";
import { bloomGradient, markCrossing } from "@/lib/crossing";

// ── Film beats (seconds into the video) ─────────────────────
const HANDOFF_AT = 14.4;
const BEATS = [
  { until: 5.6, label: "I · The Writer", line: "It starts at a desk like this one." },
  { until: 9.3, label: "II · The Crossing", line: "Then the ink leaves your hands." },
  { until: HANDOFF_AT, label: "III · The Reader", line: "Somewhere, someone looks up from the page." },
];

// Gentle camera drift per beat — toward the writer's half, back to
// center for the sweep, toward the reader's half. Slow tweens so it
// reads as cinematography, not UI.
const CAMERA = [
  { scale: 1.1, x: "4%" },
  { scale: 1.04, x: "0%" },
  { scale: 1.1, x: "-4%" },
  { scale: 1, x: "0%" },
];

type Phase = "gate" | "playing" | "brand" | "done";

// The wordmark, letter by letter — second "i" is dotless: its dot is
// the Ink Drop, which falls in from above once the letters have landed.
const BRAND_LETTERS = ["Q", "u", "i", "l", "o", "r", "ı", "a"];
const DROP_INDEX = 6;

// ── Data shape (filled by src/lib/landing-data.ts in production) ──
export interface LandingTale {
  slug: string;
  title: string;
  author: string;
  genre: string;
  sparks: string;
  mins: number;
  hook: string;
  firstLine: string;
}

// ── Fixtures (fresh-install fallback) ───────────────────────
// Each story leads with its actual opening line — the only asset on
// this page that's already at the film's quality bar.
const FALLBACK_TALES: LandingTale[] = [
  {
    slug: "",
    title: "Salt & Ruin",
    author: "Maren Holt",
    genre: "Coastal fantasy",
    sparks: "11.2k",
    mins: 12,
    hook: "A cursed lighthouse, a missing brother, and a coast that remembers every shipwreck.",
    firstLine:
      "The lighthouse went dark the night my brother stopped writing, and the sea has been apologizing ever since.",
  },
  {
    slug: "",
    title: "The Obsidian Crown",
    author: "Kaelen Thorne",
    genre: "Fantasy",
    sparks: "12.4k",
    mins: 14,
    hook: "The crown chooses its wearer. This time, it chose wrong.",
    firstLine:
      "The crown was warm when they set it on my head — the way a thing is warm when something else has just died in it.",
  },
  {
    slug: "",
    title: "Whispering Pines",
    author: "Sarah Imani",
    genre: "Mystery",
    sparks: "8.1k",
    mins: 11,
    hook: "Every town has secrets. This one buries them standing up.",
    firstLine:
      "Nobody in Whispering Pines locked their doors, which was exactly how the town liked its lies.",
  },
  {
    slug: "",
    title: "Neon Grifters",
    author: "Cyborg2088",
    genre: "Cyberpunk",
    sparks: "6.7k",
    mins: 9,
    hook: "Three con artists, one sentient city, zero exit plans.",
    firstLine: "The city knew we were lying before we did, and it loved us for trying.",
  },
  {
    slug: "",
    title: "The Hollow Depths",
    author: "Abysswalker",
    genre: "Sci-Fi",
    sparks: "5.9k",
    mins: 10,
    hook: "Six miles down, something answered the drill.",
    firstLine: "The drill had been silent for six hours when the singing started.",
  },
];

// ── IV · The Ways — told through the film's own frames ──────
const WAYS = [
  {
    word: "alone,",
    cls: "text-paper",
    act: "way I",
    still: "/landing/still-alone.png",
    sub: "One desk, one lamp, five formats — novels, poetry, screenplays, webtoons, illustrated tales.",
  },
  {
    word: "together,",
    cls: "text-gold-light",
    act: "way II",
    still: "/landing/still-together.png",
    sub: "Co-writers in the same draft. Suggestions, open calls, a shared lore book.",
  },
  {
    word: "or alive.",
    cls: "text-amethyst",
    act: "way III",
    still: "/landing/still-alive.png",
    sub: "Adventure mode — a GM, a party of writers, 2d6 dice, and chapters nobody planned.",
  },
];

const PROOF = [
  { figure: "5", label: "writing formats" },
  { figure: "24", label: "genres in the stacks" },
  { figure: "2d6", label: "adventure dice" },
];

// ── VI · the wormhole — hover a door, an aperture opens onto its world ──
// From the landing-experience portal doors: at rest the doors are pure
// typography. On hover an IRIS opens (clip-path circle — the world behind
// it is already full-size, so the aperture reveals rather than zooms), the
// world settles toward you (1.16 → 1, the "arrival approach"), a thin
// ignition ring runs ahead of the rim, and the word rises clear.
// Read = the archipelago at dusk; write = the film's own writer frame
// (island-writer.png replaces it once that art exists).
const PORTAL_STARS = [
  { x: 14, y: 16, s: 1.5, d: 0 },
  { x: 76, y: 10, s: 1.5, d: 1.3 },
  { x: 88, y: 34, s: 1, d: 2.4 },
  { x: 7, y: 42, s: 1, d: 0.7 },
  { x: 60, y: 22, s: 1, d: 1.9 },
  { x: 38, y: 9, s: 1, d: 3.1 },
];

const EMBERS = [
  { x: 22, d: 0, dur: 6.5 },
  { x: 55, d: 2.2, dur: 7.5 },
  { x: 78, d: 4.1, dur: 6 },
];

const PORTAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
// accelerating — falling INTO the hole, not gliding past it
const DIVE_EASE: [number, number, number, number] = [0.5, 0, 0.75, 0.6];

const PAR_SPRING = { type: "spring", stiffness: 60, damping: 20 } as const;

// The world seen through (and dived into) a door — shared by the hover peek
// and the click-dive so they are literally the same place.
function PortalWorld({
  kind,
  still,
  gazeNear,
  gazeFar,
}: {
  kind: "write" | "read";
  still: boolean;
  gazeNear?: { x: number; y: number };
  gazeFar?: { x: number; y: number };
}) {
  const rgb = kind === "write" ? "224,169,62" : "168,140,200";
  return (
    <>
      {kind === "read" ? (
        <>
          {/* far layer — sky, nebula, stars: barely answers your gaze */}
          <motion.div className="absolute -inset-2" animate={gazeFar} transition={PAR_SPRING}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(168deg, #0b0816 0%, #1c1232 48%, #31204e 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(60% 45% at 72% 20%, rgba(59,110,122,0.22), transparent 70%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(50% 40% at 20% 30%, rgba(126,94,158,0.18), transparent 70%)" }} />
            {PORTAL_STARS.map((st) => (
              <motion.span
                key={`${st.x}-${st.y}`}
                className="absolute rounded-full bg-paper"
                style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s }}
                animate={still ? undefined : { opacity: [0.15, 0.8, 0.15] }}
                transition={{ duration: 3.4, repeat: Infinity, delay: st.d, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
          {/* near layer — the worlds shift opposite your cursor, so you
              peer around the rim like a real porthole */}
          <motion.div className="absolute -inset-2" animate={gazeNear} transition={PAR_SPRING}>
            <motion.img
              src="/landing/world-pirate.png"
              alt=""
              draggable={false}
              className="absolute left-[5%] top-[13%] w-[24%] opacity-85"
              animate={still ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src="/landing/world-horror.png"
              alt=""
              draggable={false}
              className="absolute right-[4%] top-[27%] w-[19%] opacity-65"
              animate={still ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 11, repeat: Infinity, delay: 1.4, ease: "easeInOut" }}
            />
            {/* the tree library, arrived at */}
            <motion.img
              src="/landing/island-reader.png"
              alt=""
              draggable={false}
              className="absolute left-1/2 top-[62%] w-[92%] -translate-x-1/2 -translate-y-1/2"
              animate={still ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* mist at the sill */}
            <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to top, rgba(11,8,22,0.75), transparent)" }} />
          </motion.div>
        </>
      ) : (
        <motion.div className="absolute -inset-2" animate={gazeNear} transition={PAR_SPRING}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/still-alone.png" alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
          {/* warm grade */}
          <div className="absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-void/35" />
          {/* embers rising off the desk */}
          {EMBERS.map((e) => (
            <motion.span
              key={e.x}
              className="absolute h-[3px] w-[3px] rounded-full"
              style={{ left: `${e.x}%`, backgroundColor: `rgb(${rgb})`, filter: "blur(0.5px)" }}
              initial={{ bottom: "12%", opacity: 0 }}
              animate={still ? undefined : { bottom: ["12%", "72%"], opacity: [0, 0.85, 0] }}
              transition={{ duration: e.dur, repeat: Infinity, delay: e.d, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
      {/* depth vignette — you're looking through a hole, not at a sticker */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, transparent 52%, rgba(0,0,0,0.45) 100%)" }} />
    </>
  );
}

function PortalPeek({
  kind,
  hot,
  par,
  reduce,
  rootRef,
}: {
  kind: "write" | "read";
  hot: boolean;
  /** cursor offset over the door (-1..1) — the world shifts opposite, like
      peering around the edge of a porthole */
  par: { x: number; y: number };
  reduce: boolean | null;
  /** measured by the Door so the click-dive starts exactly here */
  rootRef?: React.Ref<HTMLDivElement>;
}) {
  const rgb = kind === "write" ? "224,169,62" : "168,140,200";
  const still = !!reduce;
  const open = hot;
  const gazeNear = still ? undefined : { x: par.x * -9, y: par.y * -5 };
  const gazeFar = still ? undefined : { x: par.x * -3, y: par.y * -2 };
  // closing snaps quicker than opening — doors should feel responsive shut
  const apertureT = still
    ? { duration: 0.45 }
    : { clipPath: { duration: open ? 0.95 : 0.45, ease: PORTAL_EASE }, opacity: { duration: open ? 0.3 : 0.4 } };

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-52 w-52 -translate-x-1/2 -translate-y-1/2 md:h-60 md:w-60">
      {/* the light spilling through the open door */}
      <motion.div
        className="absolute -inset-10 rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${rgb},0.22) 0%, transparent 62%)` }}
        initial={false}
        animate={{ opacity: open ? 1 : 0, scale: still ? 1 : open ? 1 : 0.55 }}
        transition={{ duration: open ? 0.9 : 0.45, ease: PORTAL_EASE }}
      />

      {/* ignition ripple — a thin ring runs ahead of the opening rim */}
      {!still && (
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: `rgba(${rgb},0.65)` }}
          initial={false}
          animate={open ? { scale: [0.12, 1.16], opacity: [0.9, 0] } : { scale: 0.12, opacity: 0 }}
          transition={open ? { duration: 0.95, ease: "easeOut" } : { duration: 0 }}
        />
      )}

      {/* the aperture — the world is full-size behind it; the iris opens */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full"
        initial={false}
        animate={
          still
            ? { opacity: open ? 1 : 0, clipPath: "circle(50% at 50% 50%)" }
            : { opacity: open ? 1 : 0, clipPath: open ? "circle(50% at 50% 50%)" : "circle(2% at 50% 50%)" }
        }
        transition={apertureT}
      >
        {/* arrival approach — the world settles toward you as the iris opens */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ scale: still ? 1 : open ? 1 : 1.16 }}
          transition={{ duration: open ? 1.2 : 0.45, ease: PORTAL_EASE }}
        >
          <PortalWorld kind={kind} still={still} gazeNear={gazeNear} gazeFar={gazeFar} />
        </motion.div>

        {/* the invitation, standing in the mist at the sill */}
        <motion.span
          className="absolute inset-x-0 bottom-[11%] z-10 text-center font-mono text-[9px] uppercase tracking-[0.32em]"
          style={{ color: "rgba(242,232,208,0.9)", textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}
          initial={false}
          animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ delay: open ? 0.45 : 0, duration: 0.5, ease: "easeOut" }}
        >
          <motion.span
            className="inline-block"
            animate={still || !open ? undefined : { opacity: [1, 0.55, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            step through
          </motion.span>
        </motion.span>
      </motion.div>

      {/* the rim — tracks the iris edge as it opens */}
      <motion.div
        className="absolute inset-0 rounded-full border-[1.5px]"
        style={{ borderColor: `rgba(${rgb},0.55)`, boxShadow: `0 0 34px rgba(${rgb},0.28), inset 0 0 26px rgba(${rgb},0.12)` }}
        initial={false}
        animate={{ scale: still ? 1 : open ? 1 : 0.04, opacity: open ? 1 : 0 }}
        transition={{ duration: open ? 0.95 : 0.45, ease: PORTAL_EASE }}
      />
    </div>
  );
}

// Pages whirling past as the book inhales you — deterministic trajectories
// (golden-angle spread) so every dive feels stormy but never random-glitchy.
const DIVE_PAGES = Array.from({ length: 13 }, (_, i) => {
  const a = (((i * 137.5) % 360) * Math.PI) / 180;
  return {
    a,
    delay: 0.05 + (i % 5) * 0.08 + (i % 3) * 0.03,
    dur: 0.62 + ((i * 7) % 4) * 0.07,
    w: 84 + ((i * 11) % 5) * 16,
    spin: (i % 2 ? 1 : -1) * (140 + ((i * 13) % 160)),
    tumble: (i % 3 === 0 ? -1 : 1) * (90 + ((i * 17) % 110)),
  };
});

// One manuscript sheet — written pages storm the read crossing; a single
// blank one waits in the write crossing.
function PageSheet({ lined = true }: { lined?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-[3px]"
      style={{
        background: "linear-gradient(115deg, #f5ecd6 0%, #e9ddc2 55%, #d8caa6 100%)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      {lined && (
        <div
          className="absolute"
          style={{
            inset: "11% 9%",
            background:
              "repeating-linear-gradient(180deg, transparent 0, transparent 6px, rgba(46,38,26,0.25) 7px, transparent 8px)",
          }}
        />
      )}
    </div>
  );
}

// THE crossing: fall through the door first — the world you peeked at
// rushes past, darkness closes behind you (read: a storm of written pages
// tumbles past too; write: nothing yet) — then, in the dark between worlds,
// the narrator writes one line of luminous ink with a glowing mote as the
// pen tip (read: page-ghosts drift far off; write: a single BLANK sheet
// floats down, waiting), and the period — the brand's Ink Drop — falls in
// at the end; its splash blooms into the light the destination then fades
// away (same CrossingVeil handoff).
function InkSentenceOverlay({
  kind,
  rect,
  rgb,
}: {
  kind: "write" | "read";
  rect: { cx: number; cy: number; r: number };
  rgb: string;
}) {
  const line = kind === "read" ? "…and she stepped into the story" : "…and the page was waiting";
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden" aria-hidden>
      {/* darkness closes behind you as you fall in */}
      <motion.div
        className="fixed inset-0"
        style={{ backgroundColor: "rgb(11,8,16)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.16, duration: 0.3, ease: "easeOut" }}
      />
      {/* the world you hovered rushes past first — continuity with the peek */}
      <motion.div
        className="fixed overflow-hidden rounded-full"
        style={{
          left: rect.cx - rect.r,
          top: rect.cy - rect.r,
          width: rect.r * 2,
          height: rect.r * 2,
          willChange: "transform",
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 3.6, opacity: 0 }}
        transition={{ duration: 0.5, ease: DIVE_EASE, opacity: { delay: 0.24, duration: 0.26 } }}
      >
        <PortalWorld kind={kind} still={false} />
      </motion.div>
      <motion.div
        className="fixed rounded-full border-2"
        style={{
          left: rect.cx - rect.r,
          top: rect.cy - rect.r,
          width: rect.r * 2,
          height: rect.r * 2,
          borderColor: `rgba(${rgb},0.6)`,
          boxShadow: `0 0 44px rgba(${rgb},0.35)`,
          willChange: "transform",
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 4.4, opacity: 0 }}
        transition={{ duration: 0.45, ease: DIVE_EASE }}
      />

      {/* read: other people's pages storm past as you plunge through */}
      {kind === "read" &&
        DIVE_PAGES.slice(0, 8).map((p, i) => {
          const endX = Math.cos(p.a) * 1500;
          const endY = Math.sin(p.a) * 1100;
          const midX = endX * 0.42 - Math.sin(p.a) * 140;
          const midY = endY * 0.42 + Math.cos(p.a) * 140;
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: rect.cx,
                top: rect.cy,
                width: p.w,
                height: p.w * 1.32,
                marginLeft: -p.w / 2,
                marginTop: -p.w * 0.66,
                transformPerspective: 700,
                willChange: "transform, opacity",
              }}
              initial={{ x: 0, y: 0, scale: 0.16, opacity: 0, rotateZ: 0, rotateY: 0 }}
              animate={{
                x: [0, midX, endX],
                y: [0, midY, endY],
                scale: [0.16, 1.3, 3],
                opacity: [0, 1, 1],
                rotateZ: [0, p.spin * 0.6, p.spin],
                rotateY: [0, p.tumble * 0.7, p.tumble],
              }}
              transition={{ delay: 0.04 + (i % 4) * 0.07, duration: 0.55, ease: [0.4, 0, 0.9, 0.6], times: [0, 0.45, 1] }}
            >
              <PageSheet />
            </motion.div>
          );
        })}

      {/* read: the storm settles — far-off pages still drifting in the dark */}
      {kind === "read" &&
        [
          { x: "14%", y: "26%", w: 150, rz: [-14, 6], d: 0.55 },
          { x: "76%", y: "18%", w: 120, rz: [10, -8], d: 0.7 },
          { x: "66%", y: "68%", w: 170, rz: [-6, 12], d: 0.62 },
        ].map((g, i) => (
          <motion.div
            key={`ghost-${i}`}
            className="absolute"
            style={{ left: g.x, top: g.y, width: g.w, height: g.w * 1.32, filter: "blur(1.5px)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, rotateZ: g.rz[0], y: 0 }}
            animate={{ opacity: [0, 0.13, 0.13, 0], rotateZ: g.rz[1], y: -26 }}
            transition={{ delay: g.d, duration: 1.35, ease: "linear", opacity: { delay: g.d, duration: 1.35, times: [0, 0.25, 0.75, 1] } }}
          >
            <PageSheet />
          </motion.div>
        ))}

      {/* write: one blank page floats down through the dark — waiting */}
      {kind === "write" && (
        <motion.div
          className="absolute"
          style={{ left: "63%", top: "30%", width: 120, height: 158, filter: "blur(0.6px)", transformPerspective: 700, willChange: "transform, opacity" }}
          initial={{ opacity: 0, y: -70, rotateZ: -9, rotateY: 18 }}
          animate={{ opacity: [0, 0.3, 0.3, 0], y: 46, rotateZ: [-9, 4, -2], rotateY: [18, -10, 6] }}
          transition={{ delay: 0.55, duration: 1.4, ease: "easeInOut", opacity: { delay: 0.55, duration: 1.4, times: [0, 0.2, 0.78, 1] } }}
        >
          <PageSheet lined={false} />
        </motion.div>
      )}

      {/* in the dark between worlds, the narrator speaks */}
      <div className="fixed inset-0 flex items-center justify-center px-6">
        <div className="relative">
          {/* the line, written by light */}
          <motion.p
            className="relative font-display italic font-medium text-3xl md:text-5xl whitespace-nowrap"
            style={{ color: "rgb(242,232,208)", textShadow: `0 0 26px rgba(${rgb},0.45)` }}
            initial={{ clipPath: "inset(-25% 100% -25% 0)" }}
            animate={{ clipPath: "inset(-25% -2% -25% 0)" }}
            transition={{ delay: 0.55, duration: 0.9, ease: "easeInOut" }}
          >
            {line}
          </motion.p>
          {/* the pen tip — a mote of ink-light */}
          <motion.span
            className="absolute top-1/2 h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: `rgb(${rgb})`,
              boxShadow: `0 0 14px 4px rgba(${rgb},0.8), 0 0 38px 12px rgba(${rgb},0.3)`,
            }}
            initial={{ left: "0%", opacity: 0, y: "-50%" }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0], y: "-50%" }}
            transition={{
              delay: 0.55,
              duration: 0.9,
              ease: "easeInOut",
              opacity: { delay: 0.55, duration: 0.9, times: [0, 0.06, 0.92, 1] },
            }}
          />
          {/* the period — the Ink Drop falls in */}
          <motion.svg
            viewBox="0 0 10 14"
            className="absolute bottom-[0.14em] w-[10px] md:w-[13px]"
            style={{ left: "100%", marginLeft: "0.45rem" }}
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.32, ease: "easeIn" }}
          >
            <path d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z" fill={`rgb(${rgb})`} />
          </motion.svg>
          {/* the splash where it lands */}
          <motion.span
            className="absolute bottom-[-0.35em] h-9 w-9 rounded-full border"
            style={{ left: "100%", marginLeft: "-0.35rem", borderColor: `rgba(${rgb},0.8)` }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.7, 2.4] }}
            transition={{ delay: 1.8, duration: 0.45, ease: "easeOut" }}
          />
        </div>
      </div>
      {/* the splash becomes the light on the other side */}
      <motion.div
        className="fixed inset-0"
        style={{ background: bloomGradient(rgb) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.82, duration: 0.34, ease: "easeIn" }}
      />
    </div>,
    document.body,
  );
}

// One door of Act VI: typography at rest, a wormhole on hover, a dive on
// click — hover lets you peek through; clicking takes you through.
function Door({
  kind,
  href,
  sub,
  reduce,
}: {
  kind: "write" | "read";
  href: string;
  sub: string;
  reduce: boolean | null;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(false);
  const [par, setPar] = useState({ x: 0, y: 0 });
  const [dive, setDive] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const gold = kind === "write";
  const rgb = gold ? "224,169,62" : "168,140,200";

  const beginCrossing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // modified clicks (new tab etc.) and reduced motion keep plain navigation
    if (reduce || dive || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    // the dive starts exactly where the hover portal stands
    const pr = portalRef.current?.getBoundingClientRect();
    const lr = ref.current?.getBoundingClientRect();
    setDive({
      cx: pr ? pr.left + pr.width / 2 : lr ? lr.left + lr.width / 2 : e.clientX,
      cy: pr ? pr.top + pr.height / 2 : lr ? lr.top + lr.height / 2 : e.clientY,
      r: pr ? pr.width / 2 : 120,
    });
    // the destination mounts under the same light and fades it off the
    // world — the route swap happens inside the bloom, so there is no seam
    markCrossing({ rgb });
    window.setTimeout(() => router.push(href), 2050);
  };

  return (
    <>
      <Link
        ref={ref}
        href={href}
        className="group relative block px-6 py-10 text-center md:py-14"
        onClick={beginCrossing}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          setPar({
            x: ((e.clientX - r.left) / r.width - 0.5) * 2,
            y: ((e.clientY - r.top) / r.height - 0.5) * 2,
          });
        }}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => {
          setHot(false);
          setPar({ x: 0, y: 0 });
        }}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      >
        <div
          className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse 70% 60% at center, ${gold ? "rgba(224,169,62,0.1)" : "rgba(172,156,222,0.1)"} 0%, transparent 70%)`,
          }}
          aria-hidden
        />
        <PortalPeek kind={kind} hot={hot} par={par} reduce={reduce} rootRef={portalRef} />
        {/* the word rises clear as the aperture opens */}
        <p
          className={`relative font-display italic font-medium text-5xl md:text-6xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            gold ? "text-gold-light group-hover:text-gold" : "text-amethyst group-hover:text-paper"
          } ${reduce ? "" : "group-hover:-translate-y-[6.5rem] md:group-hover:-translate-y-[8rem]"}`}
        >
          {kind}
        </p>
        <p className="relative mx-auto mt-4 max-w-[260px] text-[13px] leading-relaxed text-text-secondary transition-opacity duration-500 group-hover:opacity-0">
          {sub}
        </p>
      </Link>
      {/* the crossing — you go through the door, not past it */}
      {dive && <InkSentenceOverlay kind={kind} rect={dive} rgb={rgb} />}
    </>
  );
}

function ActLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] md:text-[11px] uppercase tracking-[0.32em] text-gold/80 font-body mb-4">
      {children}
    </p>
  );
}

// ── Main page ───────────────────────────────────────────────
interface Props {
  tales?: LandingTale[] | null;
  storyCount?: number | null;
}

export default function FilmLanding({ tales = null, storyCount = null }: Props = {}) {
  const data = tales && tales.length >= 2 ? tales : FALLBACK_TALES;
  // Stories beyond the five on the ledger; null hides the number.
  const moreInStacks =
    storyCount != null && storyCount > data.length ? storyCount - data.length : null;
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const afterFilmRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("gate");
  const [beat, setBeat] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [tale, setTale] = useState(0);
  const phaseRef = useRef<Phase>("gate");
  phaseRef.current = phase;

  // ── Begin: the click that starts cinema (and legally, audio) ──
  const begin = useCallback((withSound: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    setSoundOn(withSound);
    v.muted = !withSound;
    v.currentTime = 0;
    v.play().catch(() => {});
    setPhase("playing");
    setBeat(0);
  }, []);

  // ── Sync copy beats + handoff to the film's own clock ──
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || phaseRef.current === "gate") return;
    const t = v.currentTime;
    if (t >= HANDOFF_AT) {
      if (phaseRef.current === "playing") setPhase("brand");
      return;
    }
    const idx = BEATS.findIndex((b) => t < b.until);
    if (idx >= 0) setBeat(idx);
  }, []);

  // Brand card holds the screen alone for a beat, then the page arrives.
  useEffect(() => {
    if (phase !== "brand") return;
    const id = setTimeout(() => setPhase("done"), 2900);
    return () => clearTimeout(id);
  }, [phase]);

  // After the film's black ending, ambience takes over (if invited).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if ((phase === "brand" || phase === "done") && soundOn) {
      a.volume = 0.3;
      a.play().catch(() => {});
    }
  }, [phase, soundOn]);

  const toggleSound = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    const next = !soundOn;
    setSoundOn(next);
    if (v) v.muted = !next;
    if (a) {
      if (next && (phaseRef.current === "done" || phaseRef.current === "brand")) {
        a.volume = 0.3;
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    }
  }, [soundOn]);

  const replay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    audioRef.current?.pause();
    v.currentTime = 0;
    v.play().catch(() => {});
    setBeat(0);
    setPhase("playing");
  }, []);

  // Courtesy: pause the film if the user scrolls away mid-showing,
  // resume when they come back. Never trap the scroll.
  useEffect(() => {
    const v = videoRef.current;
    const hero = heroRef.current;
    if (!v || !hero) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (phaseRef.current !== "playing") return;
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const skipFilm = () => afterFilmRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });

  // First Line hero rotates on a slow clock; any manual pick resets it
  // (the interval re-arms whenever `tale` changes).
  useEffect(() => {
    const id = setInterval(() => setTale((t) => (t + 1) % data.length), 8000);
    return () => clearInterval(id);
  }, [tale, data.length]);

  const cam = CAMERA[phase === "done" || phase === "brand" ? 3 : beat];

  return (
    <main className="relative bg-void text-text font-body selection:bg-gold/20 selection:text-paper overflow-x-clip">
      <audio ref={audioRef} src="/quiloria-music.mp3" loop preload="none" />
      <Motes />
      <Grain />

      {/* Floating chrome: wordmark + sound + skip */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 md:px-8 py-5 pointer-events-none">
        <span className="flex items-center gap-2.5 text-paper/90 pointer-events-auto">
          <QuillRingMark className="w-6 h-6" />
          <span className="font-display text-[15px] tracking-[0.18em] uppercase">Quiloria</span>
        </span>
        <div className="flex items-center gap-2 pointer-events-auto">
          <AnimatePresence>
            {phase !== "gate" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleSound}
                aria-label={soundOn ? "Mute sound" : "Unmute sound"}
                aria-pressed={soundOn}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-void/60 backdrop-blur-md border border-gold/25 text-paper hover:border-gold/50 transition-colors"
              >
                {soundOn ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                    <path d="M3 6v4h2l3 2.5v-9L5 6H3z" fill="currentColor" />
                    <path d="M10.5 5.5a3.5 3.5 0 010 5" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                    <path d="M3 6v4h2l3 2.5v-9L5 6H3z" fill="currentColor" />
                    <path d="M11 6l3 4M14 6l-3 4" />
                  </svg>
                )}
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={skipFilm}
            className="text-[11px] text-text-ghost hover:text-text-secondary transition-colors px-3 py-2 whitespace-nowrap"
          >
            skip<span className="hidden sm:inline"> the film</span> ↓
          </button>
          <Link
            href="/login"
            className="text-[11px] text-text-secondary hover:text-paper transition-colors px-3 py-2 whitespace-nowrap border border-border-active rounded-full hover:border-gold/40"
          >
            sign in
          </Link>
        </div>
      </div>

      {/* ════════ THE FILM — one viewport, plays itself ════════ */}
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-void">
        <motion.video
          ref={videoRef}
          src="/hero-video.mp4"
          className="absolute inset-0 w-full h-full object-cover"
          animate={reduce ? undefined : { scale: cam.scale, x: cam.x }}
          transition={{ duration: 4, ease: "easeInOut" }}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={onTimeUpdate}
          aria-label="Quiloria — luminous ink leaves a writer's page, becomes a dragon, and lands in a reader's book"
        />

        {/* ── GATE · first frame, dimmed, the invitation ── */}
        <AnimatePresence>
          {phase === "gate" && (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center bg-void/60 backdrop-blur-[2px]"
              exit={{ opacity: 0, transition: { duration: 1.2 } }}
            >
              <motion.h1
                className="font-display font-medium text-paper text-[10vw] md:text-[5.5vw] leading-[1.04] max-w-[16ch] drop-shadow-[0_0_40px_rgba(224,169,62,0.3)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2 }}
              >
                Every story begins as a{" "}
                <span className="text-gold-light italic">drop of ink</span>.
              </motion.h1>
              <motion.p
                className="mt-5 text-text-secondary text-[13px] md:text-[15px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 1 }}
              >
                Seventeen seconds. Watch what one drop becomes.
              </motion.p>
              <motion.div
                className="mt-9 flex flex-col sm:flex-row items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
              >
                <button
                  onClick={() => begin(true)}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gold text-on-gold text-[13px] font-semibold tracking-wide hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(224,169,62,0.35)]"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                    <path d="M3 2v8l7-4z" />
                  </svg>
                  begin with sound
                </button>
                <button
                  onClick={() => begin(false)}
                  className="px-5 py-3 text-[13px] text-text-secondary hover:text-paper transition-colors"
                >
                  watch quietly
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COPY BEATS · synced to the film, words inking in one by one ── */}
        <div className="absolute inset-x-0 top-[11vh] z-10 flex justify-center px-6 pointer-events-none">
          <AnimatePresence mode="wait">
            {phase === "playing" && (
              <motion.div
                key={beat}
                className="relative text-center max-w-4xl"
                exit={{ opacity: 0, y: -14, filter: "blur(6px)", transition: { duration: 0.6 } }}
              >
                {/* soft scrim so the line owns its patch of sky */}
                <div
                  className="absolute -inset-x-24 -inset-y-10"
                  style={{ background: "radial-gradient(ellipse 75% 100% at center, rgba(10,8,5,0.62) 0%, transparent 70%)" }}
                  aria-hidden
                />
                <motion.p
                  className="relative text-[10px] md:text-[11px] uppercase text-gold mb-3"
                  initial={{ opacity: 0, letterSpacing: "0.7em" }}
                  animate={{ opacity: 1, letterSpacing: "0.34em" }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                >
                  {BEATS[beat].label}
                </motion.p>
                <p className="relative font-display text-paper text-3xl md:text-5xl italic font-medium leading-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.9),0_0_42px_rgba(0,0,0,0.7)]">
                  {BEATS[beat].line.split(" ").map((word, i) => (
                    <motion.span
                      key={i}
                      className="inline-block whitespace-pre"
                      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.55, delay: 0.25 + i * 0.11, ease: "easeOut" }}
                    >
                      {word}{" "}
                    </motion.span>
                  ))}
                </p>
                {/* an ink stroke draws itself beneath the line */}
                <motion.div
                  className="relative mx-auto mt-4 h-px w-44 md:w-56 bg-gradient-to-r from-transparent via-gold/80 to-transparent"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.7, ease: "easeOut" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* legibility floor over the film's caption band */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-void via-void/30 to-transparent pointer-events-none z-10" aria-hidden />

        {/* ── BRAND CARD + HANDOFF · out of the film's black ending,
              QUILORIA materializes letter by letter, the Ink Drop falls
              in as the dot of the i — then the page arrives beneath it ── */}
        {(phase === "brand" || phase === "done") && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
            {/* glow blooming behind the mark */}
            <motion.div
              className="absolute w-[70vmin] h-[70vmin] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(224,169,62,0.14) 0%, transparent 65%)" }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2.4, delay: 0.4 }}
              aria-hidden
            />

            <motion.h2
              className="relative font-display font-semibold text-[14vw] md:text-[8vw] leading-none"
              aria-label="Quiloria"
              animate={{ scale: phase === "done" ? 1 : 1.35 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {BRAND_LETTERS.map((ch, i) => (
                <motion.span
                  key={i}
                  className="relative inline-block bg-gradient-to-b from-gold-light via-gold to-copper bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.65, delay: 0.25 + i * 0.09, ease: "easeOut" }}
                >
                  {ch}
                  {i === DROP_INDEX && (
                    <>
                      {/* the falling Ink Drop — the dot of the i */}
                      <motion.svg
                        viewBox="0 0 10 14"
                        className="absolute left-1/2 w-[0.14em] -translate-x-1/2"
                        style={{ bottom: "0.72em" }}
                        initial={{ opacity: 0, y: "-1.2em" }}
                        animate={{ opacity: 1, y: "0em" }}
                        transition={{ delay: 1.5, duration: 0.5, ease: "easeIn" }}
                        aria-hidden
                      >
                        <path
                          d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z"
                          fill="var(--t-gold)"
                        />
                      </motion.svg>
                      {/* splash ring where the drop lands */}
                      <motion.span
                        className="absolute left-1/2 -translate-x-1/2 w-[0.5em] h-[0.5em] rounded-full border border-gold/70"
                        style={{ bottom: "0.6em" }}
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.5, 2.1] }}
                        transition={{ delay: 1.98, duration: 0.9, ease: "easeOut" }}
                        aria-hidden
                      />
                    </>
                  )}
                </motion.span>
              ))}
            </motion.h2>

            {/* handoff content — mounted from the start so the wordmark
               doesn't jump when it arrives; invisible during the card */}
            <motion.div
              className="flex flex-col items-center"
              animate={{ opacity: phase === "done" ? 1 : 0, y: phase === "done" ? 0 : 18 }}
              transition={{ duration: 1, delay: phase === "done" ? 0.35 : 0 }}
              style={{ pointerEvents: phase === "done" ? "auto" : "none" }}
            >
              <p className="mt-6 font-display text-paper text-xl md:text-2xl">
                The page is <span className="text-gold-light italic">yours</span> now.
              </p>
              <p className="mt-3 text-text-secondary text-[13px] md:text-[14px] max-w-md leading-relaxed">
                Everything you just watched happens here every night — writers
                at their desks, readers looking up from glowing pages.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/demo/try"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-gold text-on-gold text-[13px] font-semibold tracking-wide hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(224,169,62,0.3)]"
                >
                  pick up the quill →
                </Link>
                <Link
                  href="/landing-experience?world=reader"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-amethyst/40 text-amethyst text-[13px] font-medium tracking-wide hover:border-amethyst/70 hover:text-paper transition-all duration-300"
                >
                  step into a story →
                </Link>
              </div>
              <button
                onClick={replay}
                className="mt-7 text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
              >
                ↺ watch it again
              </button>
            </motion.div>

            {phase === "done" && (
              <motion.button
                onClick={skipFilm}
                className="absolute bottom-7 inset-x-0 mx-auto w-fit flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-text-ghost hover:text-gold/80 transition-colors"
                initial={{ opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, 6, 0] }}
                transition={{ opacity: { delay: 1, duration: 0.8 }, y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
              >
                the story continues
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </motion.button>
            )}
          </div>
        )}
      </section>

      {/* ════════ AFTER THE FILM ════════ */}
      <div className="relative">
        {/* ── IV · The Ways — the film keeps narrating. The features are
              explained through the film's own frames: you already saw
              all three ways; here they are, named. ── */}
        <section ref={afterFilmRef} className="relative z-10 px-6 pt-32 pb-24 md:pt-40">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
            >
              <ActLabel>IV · The Ways</ActLabel>
              <h2 className="font-display text-paper text-3xl md:text-5xl font-medium leading-[1.08]">
                You&apos;ve already seen all three.
              </h2>
              <p className="mt-4 text-text-secondary text-[14px] md:text-[15px] max-w-md mx-auto leading-relaxed">
                Every story here is written one of three ways.
              </p>
            </motion.div>

            <div className="mt-14 md:mt-16 grid md:grid-cols-3 gap-8 md:gap-6">
              {WAYS.map((way, i) => (
                <motion.div
                  key={way.word}
                  className="group max-w-[340px] mx-auto w-full"
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="relative rounded-xl overflow-hidden border border-gold/20 aspect-[3/4] shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={way.still}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-void via-void/45 to-transparent" />
                    <p className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-void/55 backdrop-blur-sm text-[9px] uppercase tracking-[0.28em] text-paper/80">
                      {way.act}
                    </p>
                    <p className={`absolute bottom-4 left-5 font-display italic text-3xl md:text-4xl ${way.cls} drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`}>
                      {way.word}
                    </p>
                  </div>
                  <p className="mt-4 text-[13px] text-text-secondary leading-relaxed">
                    {way.sub}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* proof, in passing */}
            <motion.div
              className="mt-14 flex justify-center gap-12 md:gap-20"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {PROOF.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-gold text-2xl md:text-3xl font-medium">{stat.figure}</p>
                  <p className="mt-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── V · What the ink became: the First Line, then the Ledger ──
              Cinema above, showroom below. One story owns the stage —
              its actual opening line, in the reading face. The rest is
              an austere index. Nothing floats. Stillness is the luxury. */}
        <section className="relative z-10 px-6 pt-16 pb-24 md:pt-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
            >
              <ActLabel>V · What the ink became</ActLabel>
            </motion.div>

            {/* ── The First Line ── */}
            <div className="relative mt-10 md:mt-14 min-h-[300px] md:min-h-[340px] text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tale}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <p className="font-reading text-paper text-2xl md:text-[2.6rem] leading-snug md:leading-[1.35] max-w-3xl mx-auto">
                    {data[tale].firstLine}
                  </p>
                  <p className="mt-7 text-[11px] md:text-[12px] uppercase tracking-[0.22em] text-text-secondary">
                    <span className="text-paper">{data[tale].title}</span>
                    <span className="mx-2 text-text-ghost">·</span>
                    {data[tale].author}
                    <span className="mx-2 text-text-ghost">·</span>
                    {data[tale].genre}
                    <span className="mx-2 text-text-ghost">·</span>
                    {data[tale].mins} min
                  </p>
                  <Link
                    href={data[tale].slug ? `/story/${data[tale].slug}` : "/browse"}
                    className="group inline-block mt-7 font-display italic text-gold-light text-lg md:text-xl hover:text-gold transition-colors"
                  >
                    keep reading
                    <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── The Ledger — the index doubles as the selector ── */}
            <motion.div
              className="mt-14 md:mt-20 border-t border-border"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              {data.map((book, i) => (
                <button
                  key={book.slug || book.title}
                  onClick={() => setTale(i)}
                  aria-pressed={i === tale}
                  className={`group/row w-full flex flex-col md:flex-row md:items-baseline gap-1 md:gap-6 text-left px-2 md:px-4 py-4 md:py-[18px] border-b border-border transition-colors duration-300 ${
                    i === tale ? "bg-gold/[0.04]" : "hover:bg-paper/[0.02]"
                  }`}
                >
                  <span className="flex items-baseline gap-3 md:w-56 shrink-0">
                    <span
                      className={`w-1 h-1 rounded-full shrink-0 translate-y-[-2px] transition-colors duration-300 ${
                        i === tale ? "bg-gold" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`font-display text-[17px] md:text-lg transition-colors duration-300 ${
                        i === tale ? "text-gold-light" : "text-paper group-hover/row:text-gold-light"
                      }`}
                    >
                      {book.title}
                    </span>
                  </span>
                  <span className="flex-1 text-[13px] text-text-secondary leading-relaxed md:truncate">
                    {book.hook}
                  </span>
                  <span className="font-mono text-[10px] md:text-[11px] text-text-ghost tracking-wide shrink-0 md:text-right">
                    {book.genre} · {book.mins} min · ✶ {book.sparks}
                  </span>
                </button>
              ))}
            </motion.div>

            {/* ── The receipt ── */}
            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Link
                href="/browse"
                className="font-display italic text-lg text-text-secondary hover:text-gold-light transition-colors"
              >
                {moreInStacks != null
                  ? `…and ${moreInStacks.toLocaleString()} more in the stacks →`
                  : "step into the stacks →"}
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── VI · Your page — the story's last chapter is the reader's
              first choice. Two doors as pure typography. ── */}
        <section className="relative z-10 px-6 py-28 md:py-36">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
            >
              <ActLabel>VI · Your page</ActLabel>
              <h2 className="font-display text-paper text-3xl md:text-5xl font-medium leading-[1.08] max-w-2xl mx-auto">
                Every story here started exactly where you&apos;re standing.
              </h2>
            </motion.div>

            <div className="relative mt-14 md:mt-20 grid md:grid-cols-2">
              {/* the threshold between the two */}
              <div
                className="hidden md:block absolute inset-y-4 left-1/2 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent"
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8 }}
              >
                <Door kind="write" href="/demo/try" sub="A blank page, right now — no account. The ink is already warm." reduce={reduce} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.12 }}
              >
                <Door kind="read" href="/landing-experience?world=reader" sub="Pick a first line that hooked you and follow it all the way in." reduce={reduce} />
              </motion.div>
            </div>

            <div className="mt-20 flex flex-col items-center gap-3">
              <QuillRingMark className="w-8 h-8 text-gold/50" />
              <p className="text-[11px] text-text-ghost">
                Quiloria — where imagination becomes story.
              </p>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
