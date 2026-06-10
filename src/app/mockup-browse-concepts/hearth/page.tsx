"use client";

// THE HEARTH — browse concept 06
// The fireplace wall of the bookstore IS the browse surface. A fire crackles
// in a hearth built into the shelving; firelight flickers across a wall of
// book spines (every real story is a brighter, labelled spine you can pull);
// this week's picks stand face-out on the mantel; the armchair is free.

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { byId, type MockStory } from "../_data";

const PAPER_BG = "#F6EFE0";
const PAPER_INK = "#43382B";

const FORMATS = ["Novel", "Serial", "Poetry", "Script", "Webtoon", "Illustrated", "Adventure"] as const;
const RATINGS = ["All Ages", "Teen+", "Mature"] as const;

const MANTEL = [4, 6, 11]; // tonight, by the fire
const SHELF_ROWS: { side: "left" | "right"; label: string; ids: number[] }[] = [
  { side: "left", label: "Far places", ids: [1, 9] },
  { side: "left", label: "The midnight shelf", ids: [3, 10, 12] },
  { side: "right", label: "Tomorrow", ids: [2, 5] },
  { side: "right", label: "The heart", ids: [7, 8] },
];

// leather spine colours by genre
const SPINE: Record<string, string> = {
  Fantasy: "#6E3B2C",
  "Dark Fantasy": "#4A2E33",
  Mystery: "#2E4636",
  "Science Fiction": "#2C3A55",
  Cyberpunk: "#23424A",
  Romance: "#7A3B49",
  Poetry: "#6B5A86",
  "Slice of Life": "#8A6A3B",
  "Literary Fiction": "#5A4A36",
  Thriller: "#3F3344",
};

function prn(n: number) {
  let t = n + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ---------- scene pieces ---------- */

function FillerSpine({ seed }: { seed: number }) {
  const h = 96 + prn(seed) * 44;
  const w = 16 + prn(seed + 1) * 12;
  const tones = ["#33261C", "#2C2218", "#3A2A20", "#27201A", "#352A1E"];
  return (
    <div
      className="shrink-0 self-end rounded-t-[2px]"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(90deg, rgba(0,0,0,0.4), ${tones[seed % tones.length]} 30%, rgba(0,0,0,0.35))`,
        opacity: 0.75,
      }}
    />
  );
}

function StorySpine({
  story,
  dim,
  onPick,
}: {
  story: MockStory;
  dim: boolean;
  onPick: (id: number) => void;
}) {
  const h = 128 + (story.sparks % 5) * 8;
  const w = 30 + (story.id % 3) * 3;
  const color = SPINE[story.genre] ?? "#5A4A36";
  return (
    <motion.button
      onClick={() => onPick(story.id)}
      whileHover={dim ? undefined : { y: -12 }}
      className="group relative shrink-0 self-end rounded-t-[3px] text-left"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(90deg, rgba(0,0,0,0.45), ${color} 28%, ${color} 72%, rgba(0,0,0,0.4))`,
        boxShadow: "0 6px 14px -4px rgba(0,0,0,0.6)",
        opacity: dim ? 0.18 : 1,
        filter: dim ? "saturate(0.3)" : undefined,
        transition: "opacity 0.4s, filter 0.4s",
      }}
      title={`${story.title} — ${story.author}`}
    >
      {/* gilt bands */}
      <span className="absolute inset-x-[3px] top-[7px] h-px bg-[rgba(212,168,67,0.55)]" />
      <span className="absolute inset-x-[3px] bottom-[9px] h-px bg-[rgba(212,168,67,0.45)]" />
      {/* title down the spine */}
      <span
        className="absolute inset-x-0 top-[14px] bottom-[16px] mx-auto overflow-hidden font-display"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: 9.5,
          letterSpacing: "0.04em",
          color: "rgba(246,239,224,0.92)",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {story.title}
      </span>
      {story.status === "Ongoing" && !dim && (
        <motion.span
          className="absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </motion.button>
  );
}

function MantelBook({
  story,
  dim,
  onPick,
}: {
  story: MockStory;
  dim: boolean;
  onPick: (id: number) => void;
}) {
  return (
    <motion.button
      onClick={() => onPick(story.id)}
      whileHover={dim ? undefined : { y: -7 }}
      className="group relative shrink-0 text-left"
      style={{ width: 88, opacity: dim ? 0.2 : 1, transition: "opacity 0.4s" }}
    >
      <div className="relative overflow-hidden rounded-r-[5px] rounded-l-[2px] border border-[rgba(243,236,221,0.12)] shadow-[0_12px_22px_-8px_rgba(0,0,0,0.8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.cover} alt="" className="aspect-[2/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[5px] bg-gradient-to-r from-black/50 to-transparent" />
        {/* firelight on the cover */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(224,142,60,0.28)] via-transparent to-transparent"
          animate={{ opacity: [0.5, 0.9, 0.6, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-1.5 truncate text-center text-[9.5px] text-text-secondary transition-colors group-hover:text-amber">
        {story.title}
      </p>
    </motion.button>
  );
}

function Trinket({ kind }: { kind: "plant" | "candle" | "frame" }) {
  if (kind === "plant")
    return (
      <svg width="26" height="34" viewBox="0 0 26 34" className="shrink-0 self-end" aria-hidden>
        <path d="M13 18 q -7 -7 -10 -14 q 9 2 11 12 q 2 -10 10 -13 q -2 9 -10 15" fill="#3E5740" opacity="0.9" />
        <path d="M8 19 h10 l-1.6 12 h-6.8 Z" fill="#7A4A2E" />
      </svg>
    );
  if (kind === "candle")
    return (
      <svg width="18" height="36" viewBox="0 0 18 36" className="shrink-0 self-end" aria-hidden>
        <motion.ellipse
          cx="9"
          cy="7"
          rx="3"
          ry="5"
          fill="#F4B941"
          animate={{ scaleY: [1, 1.18, 0.94, 1.1, 1], opacity: [0.85, 1, 0.8, 1, 0.85] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          style={{ transformOrigin: "9px 12px" }}
        />
        <rect x="5.5" y="13" width="7" height="19" rx="1.5" fill="#D9CBB2" />
      </svg>
    );
  return (
    <svg width="30" height="36" viewBox="0 0 30 36" className="shrink-0 self-end" aria-hidden>
      <rect x="3" y="4" width="24" height="28" rx="2" fill="none" stroke="#8A6A3B" strokeWidth="2.5" />
      <path d="M8 24 l5 -7 l4 4 l3 -5 l2 8 Z" fill="#5A4A36" />
    </svg>
  );
}

function Fire() {
  return (
    <div className="absolute bottom-2 left-1/2 w-[150px] -translate-x-1/2">
      <svg viewBox="0 0 120 120" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="flame-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0742F" />
            <stop offset="100%" stopColor="#9C2F10" />
          </linearGradient>
          <linearGradient id="flame-inner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4B941" />
            <stop offset="100%" stopColor="#E0742F" />
          </linearGradient>
        </defs>
        {/* embers */}
        {[28, 44, 58, 72, 86, 50].map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            r={1.2 + (i % 3) * 0.5}
            fill="#F4B941"
            initial={{ cy: 96, opacity: 0 }}
            animate={{ cy: [96, 28 - i * 3], opacity: [0, 0.9, 0], cx: [x, x + (i % 2 ? 7 : -7)] }}
            transition={{ repeat: Infinity, duration: 2.6 + (i % 3) * 0.8, delay: i * 0.7, ease: "easeOut" }}
          />
        ))}
        {/* outer flame */}
        <motion.path
          d="M60 22 C 40 54 33 66 37 86 C 40 101 50 108 60 110 C 70 108 80 101 83 86 C 87 66 80 54 60 22"
          fill="url(#flame-outer)"
          animate={{ scaleY: [1, 1.09, 0.95, 1.06, 1], skewX: [0, -2.5, 2, -1.5, 0] }}
          transition={{ repeat: Infinity, duration: 2.1, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 110px" }}
        />
        {/* inner flame */}
        <motion.path
          d="M60 46 C 49 64 45 73 48 88 C 50 99 55 105 60 107 C 65 105 70 99 72 88 C 75 73 71 64 60 46"
          fill="url(#flame-inner)"
          animate={{ scaleY: [1, 0.92, 1.12, 0.97, 1], skewX: [0, 2, -2.5, 1.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 108px" }}
        />
        {/* core */}
        <motion.ellipse
          cx="60"
          cy="98"
          rx="7"
          ry="10"
          fill="#FBE6A2"
          animate={{ opacity: [0.7, 1, 0.75, 1, 0.7], scaleY: [1, 1.15, 0.95, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 106px" }}
        />
        {/* logs */}
        <rect x="26" y="103" width="68" height="9" rx="4.5" fill="#4A3120" transform="rotate(-5 60 107)" />
        <rect x="30" y="107" width="60" height="9" rx="4.5" fill="#3A2618" transform="rotate(4 60 111)" />
      </svg>
    </div>
  );
}

function Armchair({ onSit }: { onSit: () => void }) {
  return (
    <motion.button
      onClick={onSit}
      whileHover={{ scale: 1.02 }}
      className="group absolute -bottom-1 right-[6%] hidden w-[230px] md:block"
      title="The chair’s free — tonight’s pick"
    >
      <svg viewBox="0 0 230 170" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="chair-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(224,142,60,0.55)" />
            <stop offset="60%" stopColor="rgba(224,142,60,0.06)" />
          </linearGradient>
        </defs>
        {/* back */}
        <path d="M48 30 q 60 -26 120 0 l 6 76 h-132 Z" fill="#1E1813" />
        <path d="M48 30 q 60 -26 120 0 l 1.5 16 q -61 -22 -123 0 Z" fill="url(#chair-rim)" />
        {/* arms */}
        <rect x="30" y="84" width="34" height="58" rx="14" fill="#241C15" />
        <rect x="166" y="84" width="34" height="58" rx="14" fill="#191410" />
        {/* cushion */}
        <rect x="58" y="104" width="114" height="34" rx="12" fill="#2A2118" />
        {/* blanket over the arm */}
        <path d="M30 96 q 18 -8 34 0 l 0 34 q -17 7 -34 0 Z" fill="#7A3B49" opacity="0.85" />
        <path d="M30 110 h34 M30 120 h34" stroke="rgba(246,239,224,0.25)" strokeWidth="1.4" />
        {/* legs */}
        <rect x="44" y="142" width="9" height="16" rx="3" fill="#15100C" />
        <rect x="177" y="142" width="9" height="16" rx="3" fill="#15100C" />
        {/* cat, curled on the cushion */}
        <motion.g
          animate={{ scaleY: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
          style={{ transformOrigin: "115px 104px" }}
          fill="#3A322B"
        >
          <ellipse cx="112" cy="96" rx="26" ry="11" />
          <circle cx="133" cy="90" r="9" />
          <path d="M127 84 l2.4 -5.4 l3.6 3.6 Z M139 84 l-2.4 -5.4 l-3.6 3.6 Z" />
          <path d="M88 99 q -8 -1 -5 -9 q 1.8 -4 6.4 -3.4" fill="none" stroke="#3A322B" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M130 90 q 1.8 1.6 3.6 0" fill="none" stroke="rgba(12,9,6,0.9)" strokeWidth="1.2" strokeLinecap="round" />
        </motion.g>
      </svg>
      <p className="mt-1 text-center text-[10px] italic text-text-ghost opacity-0 transition-opacity group-hover:opacity-100">
        the chair’s free — sit with tonight’s pick
      </p>
    </motion.button>
  );
}

function SideTable() {
  return (
    <div className="absolute bottom-2 left-[8%] hidden lg:block" aria-hidden>
      <svg width="86" height="120" viewBox="0 0 86 120">
        {/* steam */}
        {[0, 1].map((i) => (
          <motion.path
            key={i}
            d={`M${36 + i * 9} 34 q 3 -7 0 -13 q -3 -6 0 -12`}
            fill="none"
            stroke="rgba(246,239,224,0.4)"
            strokeWidth="1.6"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0], y: [-0, -7] }}
            transition={{ repeat: Infinity, duration: 3, delay: i * 1.4, ease: "easeInOut" }}
          />
        ))}
        {/* mug */}
        <rect x="28" y="36" width="26" height="22" rx="4" fill="#7A5A3B" />
        <path d="M54 41 q 10 1 0 13" fill="none" stroke="#7A5A3B" strokeWidth="4" />
        {/* a small stack of books */}
        <rect x="14" y="58" width="58" height="7" rx="2" fill="#6B5A86" />
        <rect x="18" y="65" width="50" height="7" rx="2" fill="#2E4636" />
        {/* table */}
        <ellipse cx="43" cy="76" rx="40" ry="7" fill="#33261C" />
        <rect x="39" y="78" width="8" height="32" fill="#241B12" />
        <ellipse cx="43" cy="112" rx="18" ry="4" fill="#1B140E" />
      </svg>
    </div>
  );
}

/* ---------- page ---------- */

export default function Hearth() {
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Set<string>>(new Set(RATINGS));

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const ok = (s: MockStory) =>
      (formats.size === 0 || formats.has(s.format)) &&
      ratings.has(s.rating) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.hook.toLowerCase().includes(q));
    const set = new Set<number>();
    for (let id = 1; id <= 12; id++) if (ok(byId(id))) set.add(id);
    return set;
  }, [q, formats, ratings]);

  const toggleFormat = (f: string) =>
    setFormats((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  const toggleRating = (r: string) =>
    setRatings((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        if (next.size > 1) next.delete(r);
      } else next.add(r);
      return next;
    });

  const picked = pickedId ? byId(pickedId) : null;
  const tonight = byId(MANTEL[0]);

  const renderRow = (row: (typeof SHELF_ROWS)[number], rowIdx: number) => (
    <div key={row.label}>
      <div className="flex items-end gap-2.5 px-3" style={{ minHeight: 172 }}>
        {/* filler + real spines, interleaved like a full shelf */}
        <FillerSpine seed={rowIdx * 31 + 1} />
        <FillerSpine seed={rowIdx * 31 + 5} />
        {row.ids.map((id, i) => (
          <span key={id} className="contents">
            <StorySpine story={byId(id)} dim={!visible.has(id)} onPick={setPickedId} />
            <FillerSpine seed={rowIdx * 31 + 9 + i * 4} />
            {i === 0 && <FillerSpine seed={rowIdx * 31 + 11 + i * 4} />}
          </span>
        ))}
        {rowIdx === 0 && <Trinket kind="plant" />}
        {rowIdx === 2 && <Trinket kind="candle" />}
        {rowIdx === 3 && <Trinket kind="frame" />}
        <FillerSpine seed={rowIdx * 31 + 23} />
        <FillerSpine seed={rowIdx * 31 + 27} />
      </div>
      {/* shelf plank */}
      <div
        className="h-3 rounded-[2px]"
        style={{
          background: "linear-gradient(180deg, #5C4026, #3A2818)",
          boxShadow: "0 10px 18px -8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(243,236,221,0.1)",
        }}
      />
      <p className="mt-1.5 px-3 text-[8px] uppercase tracking-[0.22em] text-[rgba(201,168,106,0.55)]">{row.label}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-void pb-24 text-text">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_50%_-12%,rgba(224,142,60,0.10),transparent_65%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* header */}
        <header className="pt-24 text-center">
          <Link href="/mockup-browse-concepts" className="text-[11px] text-text-ghost transition-colors hover:text-amber">
            ← All concepts
          </Link>
          <h1 className="mt-4 font-display text-[40px] leading-none text-paper sm:text-[50px]">The Hearth</h1>
          <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-text-secondary">
            The fire’s been going all evening. Every brighter spine on the wall is a story someone is
            telling — pull one out. The chair’s free.
          </p>
        </header>

        {/* the counter */}
        <div className="sticky top-16 z-30 mt-8 -mx-4 border-y border-border bg-void/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[190px] flex-1 items-center gap-2 rounded-full border border-border bg-elevated px-3.5 py-2 transition-colors focus-within:border-amber/30 sm:max-w-[260px] sm:flex-none">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="shrink-0 text-text-ghost">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you in the mood for?"
                className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-ghost"
              />
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFormat(f)}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] transition-all ${
                    formats.has(f) ? "bg-amber/15 text-amber" : "bg-elevated text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRating(r)}
                  className={`rounded-full border border-dashed px-2.5 py-1 text-[9.5px] uppercase tracking-wide transition-all ${
                    ratings.has(r) ? "border-amber/40 text-amber" : "border-border text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {q && visible.size === 0 && (
            <p className="mt-2 text-[12px] italic text-text-ghost">
              Nothing on the wall under “{query}” — the fire doesn’t mind if you just sit a while instead.
            </p>
          )}
        </div>

        {/* THE FIREPLACE WALL */}
        <section
          className="relative mt-10 overflow-hidden rounded-2xl border border-[rgba(92,64,38,0.5)]"
          style={{ background: "linear-gradient(180deg, #1C1510, #120D09)" }}
        >
          {/* firelight flicker across the whole wall */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ background: "radial-gradient(ellipse at 50% 88%, rgba(224,142,60,0.20), transparent 58%)" }}
            animate={{ opacity: [0.55, 0.85, 0.6, 1, 0.55] }}
            transition={{ repeat: Infinity, duration: 4.6, ease: "easeInOut" }}
          />

          <div className="relative grid gap-0 px-4 pt-8 sm:px-6 md:grid-cols-[1fr_minmax(300px,360px)_1fr] md:gap-6">
            {/* left bookcase */}
            <div className="hidden space-y-7 md:block">{SHELF_ROWS.filter((r) => r.side === "left").map((r, i) => renderRow(r, i))}</div>

            {/* the chimney breast */}
            <div className="relative flex flex-col items-center">
              {/* framed picture over the mantel */}
              <div className="mb-3 rounded-md border-[3px] border-[#8A6A3B] bg-[#241B12] px-4 py-2 shadow-lg">
                <p className="font-display text-[11px] italic tracking-wide text-[rgba(246,239,224,0.75)]">tonight, by the fire</p>
              </div>
              {/* mantel display */}
              <div className="flex items-end gap-4">
                {MANTEL.map((id) => (
                  <MantelBook key={id} story={byId(id)} dim={!visible.has(id)} onPick={setPickedId} />
                ))}
              </div>
              {/* mantel plank */}
              <div
                className="mt-3 h-4 w-full rounded-[3px]"
                style={{
                  background: "linear-gradient(180deg, #6B4A2C, #3F2B1A)",
                  boxShadow: "0 14px 26px -8px rgba(0,0,0,0.85), inset 0 1px 0 rgba(243,236,221,0.14)",
                }}
              />
              {/* firebox */}
              <div
                className="relative mt-0 h-[210px] w-[82%] overflow-hidden rounded-b-[6px] rounded-t-[130px] border-[7px] border-[#3A2A1C]"
                style={{ background: "radial-gradient(ellipse at 50% 95%, #2A1409 0%, #0C0805 70%)" }}
              >
                <Fire />
                {/* inner glow on the brick */}
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(224,116,47,0.35), transparent 62%)" }}
                  animate={{ opacity: [0.6, 1, 0.7, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.3, ease: "easeInOut" }}
                />
              </div>
              {/* hearth stone */}
              <div
                className="h-3.5 w-[96%] rounded-[3px]"
                style={{ background: "linear-gradient(180deg, #4A4038, #2E2620)", boxShadow: "0 8px 18px -6px rgba(0,0,0,0.8)" }}
              />
              {/* rug */}
              <div
                className="mb-6 mt-3 h-[26px] w-[88%] rounded-[50%] border border-[rgba(122,59,73,0.5)]"
                style={{ background: "radial-gradient(ellipse, rgba(122,59,73,0.4), rgba(74,46,51,0.25) 70%)" }}
              />
            </div>

            {/* right bookcase */}
            <div className="hidden space-y-7 md:block">{SHELF_ROWS.filter((r) => r.side === "right").map((r, i) => renderRow(r, i + 2))}</div>

            {/* mobile: all shelves stacked under the fireplace */}
            <div className="space-y-7 pb-6 md:hidden">{SHELF_ROWS.map((r, i) => renderRow(r, i))}</div>
          </div>

          <SideTable />
          <Armchair onSit={() => setPickedId(tonight.id)} />
        </section>

        <p className="mt-6 text-center text-[11.5px] italic text-text-ghost">
          A flickering spine is still being written. The booksellers tend the fire — and the wall — nightly.
        </p>

        {/* footer */}
        <footer className="mt-16 text-center">
          <p className="font-display text-[15px] italic text-text-secondary">Stay as long as you like. The last log goes on at midnight.</p>
          <p className="mt-2 text-[11px] text-text-ghost">
            Writing something? <span className="cursor-pointer text-amber hover:underline">There’s room on the mantel.</span>
          </p>
        </footer>
      </div>

      {/* PICKED UP */}
      <AnimatePresence>
        {picked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-void/75 p-4 backdrop-blur-sm"
            onClick={() => setPickedId(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 14 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative shrink-0 sm:w-[180px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={picked.cover} alt="" className="h-44 w-full object-cover sm:h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface/70 to-transparent sm:bg-gradient-to-r" />
                </div>
                <div className="flex-1 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-text-ghost">pulled from the wall</p>
                      <h2 className="mt-1 font-display text-[24px] leading-tight text-paper">{picked.title}</h2>
                      <p className="mt-0.5 text-[12px] text-text-secondary">
                        by {picked.author}
                        {picked.status === "Ongoing" && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber">
                            <motion.span
                              className="h-1 w-1 rounded-full bg-amber"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            />
                            still being written
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setPickedId(null)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-ghost transition-colors hover:text-paper"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <p className="mt-3 text-[13px] leading-relaxed text-text">{picked.hook}</p>

                  <div className="relative mt-4 -rotate-[0.6deg] rounded-[3px] p-3.5 shadow" style={{ background: PAPER_BG, color: PAPER_INK }}>
                    <p className="text-[8.5px] uppercase tracking-[0.16em] opacity-50">read by firelight —</p>
                    <p className="font-reading mt-1.5 text-[13px] leading-relaxed">{picked.opening}</p>
                  </div>

                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                    {picked.format} · {picked.chapters} ch · {picked.readTime} · {picked.rating} ·{" "}
                    <span className="text-amber">✦ {picked.sparks}</span>
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button className="flex-1 rounded-full bg-amber py-2.5 text-[13px] font-medium text-void transition-all hover:brightness-110">
                      Settle in
                    </button>
                    <button
                      onClick={() => setPickedId(null)}
                      className="rounded-full border border-border px-4 py-2.5 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                    >
                      Back on the wall
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
