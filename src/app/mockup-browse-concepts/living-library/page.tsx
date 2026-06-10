"use client";

// THE LIVING LIBRARY — browse concept 07
// The only daylight concept. A sunlit reading room: warm wood shelves, soft
// paper, dust drifting in a window beam. No grids, no sidebars — you walk
// along shelves. Themed cases ("Being written right now", "Cozy evening
// reads", "Adventure rooms", "Hidden gems"), a reading nook with a page left
// open, and every book opens to its actual first lines. Premium-bookstore ×
// Airbnb/Apple restraint: few colors, generous space, everything tactile.

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { byId, type MockStory } from "../_data";

/* ---------------------------------------------------------------- palette */
// Daylight palette is local to this mockup — the app tokens are night-tuned.
const INK = "#382C1E"; // warm umber ink
const INK_SOFT = "#7A6A52";
const INK_GHOST = "#A8987E";
const PAPER = "#F4ECDB";
const PAPER_HI = "#FAF5E9";
const WOOD_HI = "#A4753F";
const WOOD = "#7C5530";
const WOOD_DK = "#5C3D20";
const COPPER = "#A85B22"; // single accent

// cloth-bound spine colours by genre — daylight saturations
const CLOTH: Record<string, string> = {
  Fantasy: "#8A4B33",
  "Dark Fantasy": "#5E4049",
  Mystery: "#44604C",
  "Science Fiction": "#46587A",
  Cyberpunk: "#3D6068",
  Romance: "#A05A66",
  Poetry: "#7A6B9E",
  "Slice of Life": "#B08847",
  "Literary Fiction": "#806A4E",
  Thriller: "#5A4D63",
};

const NOW = [11, 1, 9]; // ink still wet
const COZY = [6, 7, 8]; // evening reads
const ROOMS = [3, 5]; // adventure rooms
const GEMS = [2, 10, 12]; // hidden gems
const FEATURED = byId(4); // front table
const NOOK = byId(12); // page left open in the nook

function prn(n: number) {
  let t = n + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------ atmosphere */

function SunMotes({ count = 14, seed = 1 }: { count?: number; seed?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const s = seed * 100 + i;
        return (
          <span
            key={i}
            className="ll-mote absolute rounded-full"
            style={{
              left: `${8 + prn(s) * 84}%`,
              top: `${prn(s + 1) * 90}%`,
              width: 2 + prn(s + 2) * 3,
              height: 2 + prn(s + 2) * 3,
              background: "rgba(255,214,140,0.9)",
              animationDuration: `${9 + prn(s + 3) * 10}s`,
              animationDelay: `-${prn(s + 4) * 12}s`,
              opacity: 0,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ shelf wood */

function ShelfRail() {
  return (
    <div aria-hidden>
      {/* top of the plank, catching light */}
      <div
        className="h-[10px] rounded-[2px]"
        style={{
          background: `linear-gradient(180deg, ${WOOD_HI}, ${WOOD} 70%)`,
          boxShadow: "inset 0 1px 0 rgba(255,230,180,0.45)",
        }}
      />
      {/* front edge */}
      <div
        className="h-[14px] rounded-b-[3px]"
        style={{
          background: `linear-gradient(180deg, ${WOOD_DK}, #4A2F17)`,
          boxShadow: "0 16px 22px -12px rgba(72,46,20,0.55)",
        }}
      />
    </div>
  );
}

function FillerSpine({ seed }: { seed: number }) {
  const h = 104 + prn(seed) * 52;
  const w = 15 + prn(seed + 1) * 12;
  const tones = ["#B7A887", "#A6906C", "#97805F", "#C0AD8C", "#8E7A5C"];
  return (
    <div
      className="hidden shrink-0 self-end rounded-t-[2px] sm:block"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(90deg, rgba(72,50,28,0.35), ${tones[seed % tones.length]} 30%, rgba(72,50,28,0.3))`,
        opacity: 0.55,
      }}
    />
  );
}

/* ----------------------------------------------------------------- books */

function FaceOutBook({
  story,
  note,
  tag,
  dim,
  onOpen,
  index = 0,
}: {
  story: MockStory;
  note?: string;
  tag?: string;
  dim?: boolean;
  onOpen: (s: MockStory) => void;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.09, duration: 0.5, ease: "easeOut" }}
      className="flex w-[150px] shrink-0 snap-start flex-col items-center self-end sm:w-[164px]"
    >
      <motion.button
        onClick={() => onOpen(story)}
        whileHover={{ y: -10, rotate: -0.6 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="group relative block text-left"
        style={{ perspective: 700 }}
        aria-label={`Open ${story.title}`}
      >
        <div
          className="relative h-[208px] w-[146px] overflow-hidden rounded-[3px] transition-shadow duration-300 sm:h-[224px] sm:w-[158px]"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,240,210,0.5) inset, 0 18px 26px -14px rgba(72,46,20,0.55), 0 3px 6px rgba(72,46,20,0.25)",
            filter: dim ? "saturate(0.45) brightness(0.92)" : undefined,
            transition: "filter 0.4s",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.cover} alt="" className="h-full w-full object-cover" />
          {/* spine shadow on the left, page block on the right */}
          <span className="absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/35 to-transparent" />
          <span
            className="absolute inset-y-[2px] right-0 w-[4px]"
            style={{ background: "repeating-linear-gradient(180deg, #EFE6D2 0 2px, #D9CCAF 2px 3px)" }}
          />
          {/* sun sheen on hover */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(255,224,160,0)] to-[rgba(255,224,160,0.35)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {/* title plate */}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent px-2.5 pb-2 pt-8">
            <span className="block font-display text-[14px] leading-snug text-[#F6EFE0]">{story.title}</span>
            <span className="mt-0.5 block text-[10px] tracking-wide text-[#D8CBAE]">{story.author}</span>
          </span>
          {dim && (
            <span className="pointer-events-none absolute inset-0 bg-[#3A2C18]/20 transition-opacity duration-300 group-hover:opacity-0" />
          )}
        </div>
        {tag && (
          <span
            className="absolute -right-2 -top-2 flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[9.5px] font-medium tracking-wide"
            style={{ background: PAPER_HI, color: COPPER, boxShadow: "0 2px 8px rgba(72,46,20,0.25)" }}
          >
            <motion.span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: COPPER }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            />
            {tag}
          </span>
        )}
        {/* contact shadow */}
        <span className="mx-auto mt-0 block h-[6px] w-[80%] rounded-full bg-[#4A2F17]/30 blur-[3px] transition-all duration-300 group-hover:translate-y-2 group-hover:opacity-60" />
      </motion.button>
      {note && (
        <p
          className="mt-2.5 -rotate-[0.8deg] font-display text-[11.5px] italic leading-snug"
          style={{ color: INK_SOFT }}
        >
          “{note}”
        </p>
      )}
    </motion.div>
  );
}

function Spine({ story, onOpen }: { story: MockStory; onOpen: (s: MockStory) => void }) {
  const h = 138 + (story.sparks % 5) * 11;
  const w = 30 + (story.id % 3) * 4;
  const color = CLOTH[story.genre] ?? "#806A4E";
  return (
    <motion.button
      onClick={() => onOpen(story)}
      whileHover={{ y: -14 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="group relative shrink-0 self-end rounded-t-[3px]"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(90deg, rgba(60,38,18,0.4), ${color} 26%, ${color} 74%, rgba(60,38,18,0.35))`,
        boxShadow: "0 10px 16px -8px rgba(72,46,20,0.5)",
      }}
      title={`${story.title} — ${story.author}`}
      aria-label={`Open ${story.title}`}
    >
      <span className="absolute inset-x-[4px] top-[8px] h-px bg-[rgba(244,226,180,0.6)]" />
      <span className="absolute inset-x-[4px] bottom-[10px] h-px bg-[rgba(244,226,180,0.45)]" />
      <span
        className="absolute inset-x-0 bottom-[18px] top-[16px] mx-auto overflow-hidden whitespace-nowrap font-display"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: 10,
          letterSpacing: "0.05em",
          color: "rgba(250,243,226,0.95)",
        }}
      >
        {story.title}
      </span>
      {story.status === "Ongoing" && (
        <motion.span
          className="absolute bottom-[4px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full"
          style={{ background: "#E8B563" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------- section heading */

function CaseHeading({
  index,
  title,
  blurb,
  href = "#",
}: {
  index: string;
  title: string;
  blurb: string;
  href?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.26em]" style={{ color: INK_GHOST }}>
          <span className="h-px w-7" style={{ background: `${COPPER}66` }} />
          Case {index}
        </div>
        <h2 className="mt-1.5 font-display text-[27px] leading-tight sm:text-[32px]" style={{ color: INK }}>
          {title}
        </h2>
        <p className="mt-1 max-w-md text-[13.5px] leading-relaxed" style={{ color: INK_SOFT }}>
          {blurb}
        </p>
      </div>
      <Link
        href={href}
        className="group mb-1 flex items-center gap-2 text-[12.5px] font-medium transition-colors"
        style={{ color: COPPER }}
      >
        Walk the whole shelf
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </div>
  );
}

/* --------------------------------------------------------- adventure door */

function RoomDoor({ story, seats, onOpen }: { story: MockStory; seats: string; onOpen: (s: MockStory) => void }) {
  const playing = story.status !== "Complete";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-[220px] shrink-0 snap-start"
    >
      <button onClick={() => onOpen(story)} className="group block w-full text-left" style={{ perspective: 900 }}>
        <div className="relative">
          {/* light spilling from inside the room */}
          <div
            className="absolute inset-x-3 bottom-0 top-6 rounded-t-[110px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(255,196,110,0.55), transparent 70%)" }}
          />
          <motion.div
            whileHover={{ rotateY: -13 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative h-[268px] overflow-hidden rounded-t-[110px] rounded-b-[6px]"
            style={{
              transformOrigin: "left center",
              background: `linear-gradient(165deg, ${WOOD_HI} 0%, ${WOOD} 45%, ${WOOD_DK} 100%)`,
              boxShadow:
                "inset 0 2px 0 rgba(255,230,180,0.35), inset 0 0 0 6px rgba(60,38,18,0.28), 0 22px 30px -16px rgba(72,46,20,0.6)",
            }}
          >
            {/* porthole window into the story */}
            <div
              className="absolute left-1/2 top-9 h-[88px] w-[88px] -translate-x-1/2 overflow-hidden rounded-full"
              style={{ boxShadow: "0 0 0 5px #4A2F17, 0 0 0 7px rgba(232,181,99,0.5), inset 0 2px 8px rgba(0,0,0,0.5)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.cover}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            {/* brass plaque */}
            <div
              className="absolute inset-x-7 top-[150px] rounded-[3px] px-2 py-2 text-center"
              style={{
                background: "linear-gradient(180deg, #D9B36A, #B98F47)",
                boxShadow: "inset 0 1px 0 rgba(255,244,210,0.7), 0 2px 4px rgba(60,38,18,0.45)",
              }}
            >
              <div className="font-display text-[13.5px] leading-tight" style={{ color: "#4A2F12" }}>
                {story.title}
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: "#6E5524" }}>
                {story.author}
              </div>
            </div>
            {/* handle */}
            <span
              className="absolute right-5 top-[210px] h-[10px] w-[10px] rounded-full"
              style={{ background: "linear-gradient(135deg, #E5C078, #A87E36)", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            />
            {/* door grain */}
            <span
              className="pointer-events-none absolute inset-0 opacity-[0.16]"
              style={{ background: "repeating-linear-gradient(95deg, transparent 0 9px, rgba(46,28,12,0.7) 9px 10px)" }}
            />
          </motion.div>
        </div>
        <div className="mt-3 px-1">
          <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: playing ? COPPER : INK_SOFT }}>
            {playing && (
              <motion.span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: COPPER }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              />
            )}
            {playing ? "A session is playing now" : "Between sessions"}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: INK_SOFT }}>
            {story.hook}
          </p>
          <p className="mt-1.5 text-[11px]" style={{ color: INK_GHOST }}>
            {seats}
          </p>
        </div>
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------- first-page modal */

function FirstPage({ story, onClose }: { story: MockStory; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#2A1E10]/55 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 26, rotate: -0.8 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-[4px] px-7 py-8 sm:px-10 sm:py-10"
        style={{
          background: `linear-gradient(180deg, ${PAPER_HI}, ${PAPER})`,
          boxShadow: "0 40px 80px -24px rgba(40,24,8,0.6), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {/* deckled top edge */}
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "repeating-linear-gradient(90deg, #D9CCAF 0 7px, transparent 7px 13px)" }}
        />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[#3A2C18]/8"
          style={{ color: INK_GHOST }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-[10px] uppercase tracking-[0.26em]" style={{ color: INK_GHOST }}>
          {story.genre} · {story.format} · {story.readTime}
        </div>
        <h3 className="mt-2 font-display text-[30px] leading-tight" style={{ color: INK }}>
          {story.title}
        </h3>
        <div className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
          by {story.author}
        </div>
        <div className="my-5 h-px w-16" style={{ background: `${COPPER}55` }} />
        <p className="font-reading text-[16.5px] leading-[1.85] whitespace-pre-line" style={{ color: "#473A28" }}>
          {story.opening}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full px-5 py-2.5 text-[13px] font-medium text-[#FAF3E0] transition-transform hover:scale-[1.02]"
            style={{ background: COPPER, boxShadow: "0 10px 20px -8px rgba(168,91,34,0.6)" }}
          >
            Keep reading
          </button>
          <button
            className="rounded-full border px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[#3A2C18]/5"
            style={{ borderColor: "#D8C9A8", color: INK_SOFT }}
          >
            Save to your shelf
          </button>
          <span className="ml-auto text-[11px]" style={{ color: INK_GHOST }}>
            {story.chapters} chapters · {story.sparks} sparks
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ page */

export default function LivingLibrary() {
  const [open, setOpen] = useState<MockStory | null>(null);

  return (
    <main className="min-h-screen font-body" style={{ background: PAPER, color: INK }}>
      <style>{`
        @keyframes ll-drift {
          0% { transform: translate3d(0, 12px, 0); opacity: 0; }
          15% { opacity: .8; }
          60% { opacity: .45; }
          100% { transform: translate3d(26px, -110px, 0); opacity: 0; }
        }
        .ll-mote { animation-name: ll-drift; animation-iteration-count: infinite; animation-timing-function: linear; }
        .ll-shelf-scroll { scrollbar-width: none; }
        .ll-shelf-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* paper grain + ambient light, fixed behind everything */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 78% -8%, rgba(255,196,110,0.32), transparent 62%), radial-gradient(ellipse 50% 40% at 8% 30%, rgba(255,224,170,0.16), transparent 70%), linear-gradient(180deg, transparent 65%, rgba(110,74,38,0.10))",
        }}
      />

      {/* ------------------------------------------------------------ nav */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ background: "rgba(244,236,219,0.82)", borderColor: "rgba(110,74,38,0.14)" }}
      >
        <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-7 px-5">
          <Link href="/mockup-browse-concepts" className="font-display text-[20px] italic tracking-tight" style={{ color: INK }}>
            Quiloria
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] md:flex" style={{ color: INK_SOFT }}>
            <span className="relative cursor-pointer font-medium" style={{ color: INK }}>
              The Stacks
              <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] rounded-full" style={{ background: COPPER }} />
            </span>
            <span className="cursor-pointer transition-colors hover:text-[#382C1E]">Reading Rooms</span>
            <span className="cursor-pointer transition-colors hover:text-[#382C1E]">Your Shelf</span>
            <span className="cursor-pointer transition-colors hover:text-[#382C1E]">Write</span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <label
              className="flex h-9 w-44 cursor-text items-center gap-2 rounded-full border px-3.5 transition-all focus-within:w-56 sm:w-56 sm:focus-within:w-72"
              style={{ borderColor: "rgba(110,74,38,0.22)", background: PAPER_HI }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={INK_GHOST} strokeWidth="1.4">
                <circle cx="6" cy="6" r="4.5" />
                <path d="M9.5 9.5L13 13" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Ask the librarian…"
                className="w-full bg-transparent text-[12.5px] outline-none placeholder:italic"
                style={{ color: INK }}
              />
            </label>
            <span
              className="grid h-9 w-9 place-items-center rounded-full font-display text-[13px] text-[#FAF3E0]"
              style={{ background: `linear-gradient(140deg, ${WOOD_HI}, ${WOOD_DK})` }}
            >
              F
            </span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------- front table */}
      <section className="relative overflow-hidden">
        {/* window beam */}
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-[640px] w-[480px] rotate-[24deg]"
          style={{ background: "linear-gradient(195deg, rgba(255,206,120,0.4), rgba(255,206,120,0.06) 60%, transparent)" }}
        />
        <SunMotes count={16} seed={3} />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em]"
              style={{ color: INK_GHOST }}
            >
              <span className="h-px w-8" style={{ background: `${COPPER}66` }} />
              Open today, as every day
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-3 font-display text-[40px] leading-[1.08] sm:text-[54px]"
              style={{ color: INK }}
            >
              Come in.
              <br />
              The light is good
              <span className="italic" style={{ color: COPPER }}>
                {" "}
                in the stacks{" "}
              </span>
              today.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-4 max-w-md text-[15px] leading-relaxed"
              style={{ color: INK_SOFT }}
            >
              Every book here is alive — being written, being read, being argued over in the margins. Walk the shelves.
              Pull anything down.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-7 flex items-center gap-4"
            >
              <button
                onClick={() => setOpen(FEATURED)}
                className="rounded-full px-6 py-3 text-[13.5px] font-medium text-[#FAF3E0] transition-transform hover:scale-[1.03]"
                style={{ background: COPPER, boxShadow: "0 14px 26px -10px rgba(168,91,34,0.55)" }}
              >
                Read the first page
              </button>
              <span className="text-[12px]" style={{ color: INK_GHOST }}>
                {FEATURED.readTime} · {FEATURED.chapters} chapters
              </span>
            </motion.div>
          </div>

          {/* the book on the front table */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto w-fit"
            style={{ perspective: 1000 }}
          >
            <div className="mb-3 text-center text-[10px] uppercase tracking-[0.24em]" style={{ color: INK_GHOST }}>
              On the front table
            </div>
            <motion.button
              onClick={() => setOpen(FEATURED)}
              whileHover={{ rotateY: -7, y: -6 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="group relative block"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="relative h-[300px] w-[208px] overflow-hidden rounded-[4px] sm:h-[340px] sm:w-[236px]"
                style={{ boxShadow: "0 34px 50px -20px rgba(72,46,20,0.6), 0 6px 12px rgba(72,46,20,0.3)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FEATURED.cover} alt={FEATURED.title} className="h-full w-full object-cover" />
                <span className="absolute inset-y-0 left-0 w-[10px] bg-gradient-to-r from-black/40 to-transparent" />
                <span
                  className="absolute inset-y-[3px] right-0 w-[6px]"
                  style={{ background: "repeating-linear-gradient(180deg, #EFE6D2 0 2px, #D9CCAF 2px 3px)" }}
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 pb-4 pt-12">
                  <span className="block font-display text-[20px] leading-tight text-[#F6EFE0]">{FEATURED.title}</span>
                  <span className="mt-1 block text-[11.5px] text-[#D8CBAE]">{FEATURED.author}</span>
                </span>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent to-[rgba(255,224,160,0.3)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              {/* librarian's card under the book */}
              <div
                className="absolute -bottom-7 -right-9 w-[168px] -rotate-[4deg] rounded-[2px] px-3 py-2.5 text-left"
                style={{ background: PAPER_HI, boxShadow: "0 10px 20px -8px rgba(72,46,20,0.4)" }}
              >
                <p className="font-display text-[11px] italic leading-snug" style={{ color: INK_SOFT }}>
                  “Maps that open only for the grieving. I read it twice.” — the librarian
                </p>
              </div>
              {/* table edge */}
              <span
                className="absolute -bottom-[18px] left-1/2 -z-10 h-[14px] w-[140%] -translate-x-1/2 rounded-[3px]"
                style={{ background: `linear-gradient(180deg, ${WOOD_HI}, ${WOOD_DK})`, boxShadow: "0 18px 24px -10px rgba(72,46,20,0.5)" }}
              />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* --------------------------------- case I — being written right now */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-4 md:pb-24">
        <CaseHeading
          index="I"
          title="Stories being written right now"
          blurb="The ink is still wet. Authors are at their desks this very evening — follow along as the chapters land."
        />
        <div className="ll-shelf-scroll -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max items-end gap-6 px-2 pb-1 sm:gap-9">
            <FillerSpine seed={21} />
            {NOW.map((id, i) => {
              const s = byId(id);
              return (
                <FaceOutBook
                  key={id}
                  story={s}
                  index={i}
                  tag={i === 0 ? "New chapter · 2h ago" : i === 1 ? "Writing now" : "Updated yesterday"}
                  onOpen={setOpen}
                />
              );
            })}
            <FillerSpine seed={22} />
            <FillerSpine seed={23} />
            <div className="self-center pb-6 pl-2 pr-4 text-[12px] leading-relaxed" style={{ color: INK_GHOST }}>
              …and 14 more
              <br />
              being written tonight
            </div>
          </div>
          <div className="min-w-max px-0">
            <ShelfRail />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the reading nook */}
      <section className="relative overflow-hidden py-16 md:py-20" style={{ background: "rgba(110,74,38,0.06)" }}>
        <div
          className="pointer-events-none absolute -left-20 top-0 h-full w-[380px] rotate-[14deg]"
          style={{ background: "linear-gradient(110deg, rgba(255,206,120,0.25), transparent 65%)" }}
        />
        <SunMotes count={10} seed={9} />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: INK_GHOST }}>
            The reading nook · someone left this open
          </div>
          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mt-6 font-reading text-[19px] italic leading-[1.9] sm:text-[22px]"
            style={{ color: "#4A3C28" }}
          >
            “{NOOK.opening}”
          </motion.blockquote>
          <div className="mt-5 text-[13px]" style={{ color: INK_SOFT }}>
            — the first page of <span className="font-display italic" style={{ color: INK }}>{NOOK.title}</span> by {NOOK.author}
          </div>
          <button
            onClick={() => setOpen(NOOK)}
            className="mt-6 rounded-full border px-5 py-2.5 text-[12.5px] font-medium transition-all hover:scale-[1.02]"
            style={{ borderColor: `${COPPER}55`, color: COPPER, background: "rgba(250,245,233,0.6)" }}
          >
            Sit awhile — keep reading
          </button>
        </div>
      </section>

      {/* ------------------------------------------ case II — cozy evenings */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:pb-24 md:pt-20">
        {/* lamp glow over this shelf */}
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[300px] w-[560px] -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,189,99,0.22), transparent 65%)" }}
        />
        <CaseHeading
          index="II"
          title="Cozy evening reads"
          blurb="Small stakes, warm rooms, endings that land softly. For the last hour before sleep."
        />
        <div className="ll-shelf-scroll -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max items-end gap-6 px-2 pb-1 sm:gap-9">
            <FillerSpine seed={31} />
            <FaceOutBook story={byId(COZY[0])} index={0} note="for a rainy Sunday" onOpen={setOpen} />
            <FaceOutBook story={byId(COZY[1])} index={1} note="warm hands, old grudges" onOpen={setOpen} />
            <FillerSpine seed={32} />
            <FaceOutBook story={byId(COZY[2])} index={2} note="read it aloud, slowly" onOpen={setOpen} />
            <FillerSpine seed={33} />
            <FillerSpine seed={34} />
          </div>
          <div className="min-w-max">
            <ShelfRail />
          </div>
        </div>
      </section>

      {/* --------------------------------------- case III — adventure rooms */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 md:pb-24">
        <CaseHeading
          index="III"
          title="Adventure rooms"
          blurb="Behind these doors, stories are played, not just read. A GM narrates; the table writes. Knock, or take a seat."
        />
        <div className="ll-shelf-scroll -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max items-end gap-8 px-2 pb-2">
            <RoomDoor story={byId(ROOMS[0])} seats="3 of 5 seats filled · plays Thursday evenings" onOpen={setOpen} />
            <RoomDoor story={byId(ROOMS[1])} seats="Spectators welcome · 8 chapters so far" onOpen={setOpen} />
            {/* the empty room — start your own */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="w-[220px] shrink-0 snap-start"
            >
              <button className="group block w-full text-left">
                <div
                  className="grid h-[268px] place-items-center rounded-t-[110px] rounded-b-[6px] border-2 border-dashed transition-colors group-hover:border-[#A85B22]"
                  style={{ borderColor: "rgba(110,74,38,0.3)" }}
                >
                  <div className="px-6 text-center">
                    <span
                      className="mx-auto grid h-11 w-11 place-items-center rounded-full text-[20px] transition-all group-hover:scale-110"
                      style={{ background: "rgba(168,91,34,0.1)", color: COPPER }}
                    >
                      +
                    </span>
                    <div className="mt-3 font-display text-[15px]" style={{ color: INK }}>
                      An empty room
                    </div>
                    <div className="mt-1 text-[11.5px] leading-relaxed" style={{ color: INK_GHOST }}>
                      Hang your own sign on the door. Gather a table.
                    </div>
                  </div>
                </div>
                <p className="mt-3 px-1 text-[11px]" style={{ color: INK_GHOST }}>
                  Start an adventure →
                </p>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- case IV — hidden gems */}
      <section className="relative overflow-hidden py-16 md:py-20" style={{ background: "linear-gradient(180deg, rgba(58,44,24,0.10), rgba(58,44,24,0.05))" }}>
        <div className="mx-auto max-w-6xl px-5">
          <CaseHeading
            index="IV"
            title="Hidden gems"
            blurb="The quiet end of the stacks, where the light barely reaches. Few sparks, remarkable first lines. Bring one into the sun."
          />
          <div className="ll-shelf-scroll -mx-5 overflow-x-auto px-5">
            <div className="flex min-w-max items-end gap-6 px-2 pb-1 sm:gap-9">
              <FillerSpine seed={41} />
              <FillerSpine seed={42} />
              {GEMS.map((id, i) => (
                <FaceOutBook key={id} story={byId(id)} index={i} dim tag={i === 0 ? "Only 189 sparks" : undefined} onOpen={setOpen} />
              ))}
              <FillerSpine seed={43} />
              <div className="self-center pb-6 pl-2 pr-4 text-[12px] italic leading-relaxed" style={{ color: INK_GHOST }}>
                hover to bring
                <br />
                them into the light
              </div>
            </div>
            <div className="min-w-max">
              <ShelfRail />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- the long shelf */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 md:pt-20">
        <div className="mb-7 text-center">
          <h2 className="font-display text-[26px]" style={{ color: INK }}>
            Or just wander
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
            The whole collection, spine by spine. Run your finger along it.
          </p>
        </div>
        <div className="ll-shelf-scroll -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max items-end gap-[10px] px-3 pb-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id, i) => (
              <div key={id} className="contents">
                {i % 3 === 1 && <FillerSpine seed={50 + i} />}
                <Spine story={byId(id)} onOpen={setOpen} />
              </div>
            ))}
            <FillerSpine seed={61} />
            <FillerSpine seed={62} />
          </div>
          <div className="min-w-max">
            <ShelfRail />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- footer */}
      <footer className="border-t py-10 text-center" style={{ borderColor: "rgba(110,74,38,0.14)" }}>
        <p className="font-display text-[15px] italic" style={{ color: INK_SOFT }}>
          The library never closes. Someone is always writing.
        </p>
        <p className="mt-2 text-[11px]" style={{ color: INK_GHOST }}>
          Quiloria · concept mockup 07 — The Living Library ·{" "}
          <Link href="/mockup-browse-concepts" className="underline underline-offset-2 hover:text-[#A85B22]">
            back to all concepts
          </Link>
        </p>
      </footer>

      <AnimatePresence>{open && <FirstPage story={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </main>
  );
}
