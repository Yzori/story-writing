"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GENRES } from "@/config/genres";
import { formatReadTime } from "@/lib/format";
import type { ApiStory } from "@/types/api";

// ── Browse — "Tonight's Page" in the lamplit shop ───────────
// A reading ritual: the library sets one story aside, staged on the mantel
// with firelight on its cover and its opening lines on paper. "Deal another"
// flips the deck. Below, the stacks are real shelves — tilted covers standing
// on wood planks — instead of a poster grid. A slim toolbar scopes everything;
// searching flips the shelves to results.

const LIBRARIAN_NOTES = [
  "The kind you stay up too late with.",
  "A quiet one, for a loud week.",
  "Stories like this never stay shelved for long.",
  "Set aside the moment it arrived. It felt like yours.",
  "Short enough for tonight, long enough to stay with you.",
  "Picked off the shelf while no one was looking.",
];

// Physical materials stay physical in every theme: paper is paper, wood is wood.
const PAPER_BG = "#F6EFE0";
const PAPER_INK = "#43382B";
const PLANK_FACE = "linear-gradient(180deg, rgba(128,89,58,0.85), rgba(70,47,30,0.95))";
const PLANK_SHADOW = "0 14px 26px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(243,236,221,0.12)";

// Single source of truth for format + rating options; all lookups derive from these.
const FORMATS: { label: string; value: string }[] = [
  { label: "Novel", value: "novel" },
  { label: "Serial", value: "serial" },
  { label: "Poetry", value: "poetry" },
  { label: "Script", value: "screenplay" },
  { label: "Webtoon", value: "webtoon" },
  { label: "Illustrated", value: "illustrated" },
  { label: "Adventure", value: "campaign" },
];
const RATINGS: { label: string; value: string; level: number }[] = [
  { label: "All", value: "all", level: 3 },
  { label: "All Ages", value: "everyone", level: 0 },
  { label: "Teen+", value: "teen", level: 1 },
  { label: "Mature", value: "mature", level: 2 },
  { label: "Explicit", value: "explicit", level: 3 },
];
const SORTS: { label: string; value: string }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Most sparked", value: "most-sparked" },
  { label: "Newest", value: "latest" },
];

// Natural phrasings for the sentence toolbar's chosen values.
const LENGTH_WORDS: Record<string, string> = { Short: "short reads", Medium: "medium reads", Long: "long reads" };
const STATUS_WORDS: Record<string, string> = { Ongoing: "ongoing", Complete: "complete", Hiatus: "on hiatus" };

const FORMAT_FILTERS = ["All", ...FORMATS.map((f) => f.label)];
const STATUS_FILTERS = ["All", "Ongoing", "Complete", "Hiatus"];
const LENGTHS = ["Any", "Short", "Medium", "Long"];
const RATING_FILTERS = RATINGS.map((r) => r.label);
const SORT_FILTERS = SORTS.map((s) => s.label);

const ratingByLabel = (label: string) => RATINGS.find((r) => r.label === label);
const ratingByValue = (value: string) => RATINGS.find((r) => r.value === value);
const sortByLabel = (label: string) => SORTS.find((s) => s.label === label);
const sortByValue = (value: string) => SORTS.find((s) => s.value === value);

type FKey = "genre" | "format" | "status" | "length" | "rating" | "sort";
type Filters = Record<FKey, string>;
// genre/format/status/length are stored as labels; rating + sort as canonical values.
const DEFAULT_FILTERS: Filters = { genre: "All", format: "All", status: "All", length: "Any", rating: "all", sort: "recommended" };
// sort changes which 60-story slice we fetch — it never narrows the pool.
const NARROWING_KEYS: FKey[] = ["genre", "format", "status", "length", "rating"];

// Old browse quick-filter deep links (?filter=) mapped onto the new filter state.
const QUICK_FILTER_MAP: Record<string, Partial<Filters>> = {
  "For You": {},
  Rising: { sort: "most-sparked" },
  Complete: { status: "Complete" },
  "Short Reads": { length: "Short" },
  Adventures: { format: "Adventure" },
  New: { sort: "latest" },
};

type Group = { key: FKey; label: string; value: string; base: string; options: string[]; searchable?: boolean; columns?: number };
type BoostedStory = ApiStory & { boosted?: boolean };
type LiveTable = {
  storyId: string;
  slug: string | null;
  title: string;
  coverImageUrl: string | null;
  contentRating: string;
  authorName: string | null;
  sessionId: string;
  sessionTitle: string;
  /** "active" = playing now; "draft" = the table is gathering. */
  sessionStatus: string;
  spectatorCount: number;
  /** Server-built watch link — campaign sessions and adventure tables live in different rooms. */
  watchHref?: string;
};

// ── helpers ─────────────────────────────────────────────────

function storyHref(s: ApiStory) { return `/story/${s.slug || s.id}`; }
function storyFormatLabel(s: ApiStory) {
  if (s.writingMode === "campaign") return "Adventure";
  return FORMATS.find((f) => f.value === s.format)?.label ?? "Novel";
}
function storyExcerpt(s: ApiStory): string | null {
  return s.hook?.trim() || s.synopsis?.trim() || null;
}

// Every story gets an accent from the palette (hashed off its id) — it colors
// the fallback cover, the shelf-hover glow, and the hero's ambient bloom, so
// the room isn't lit wall-to-wall amber. Warm hues only: the tint covers the
// whole book face, and cool inks (teal, lapis) at that scale become blue
// surfaces, which the color system bans.
const SPINE_HUES = [
  "var(--color-amber)",
  "var(--color-rose)",
  "var(--color-sage)",
  "var(--color-copper)",
];
function spineHue(s: ApiStory) {
  const key = s.id || s.title;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SPINE_HUES[h % SPINE_HUES.length];
}

function matchesFormat(s: ApiStory, label: string) {
  if (label === "All") return true;
  if (label === "Adventure") return s.writingMode === "campaign";
  return s.format === FORMATS.find((f) => f.label === label)?.value && s.writingMode !== "campaign";
}
function matchesStatus(s: ApiStory, label: string) {
  if (label === "All") return true;
  if (label === "Ongoing") return s.status === "in-progress" || s.status === "published";
  if (label === "Complete") return s.status === "complete";
  if (label === "Hiatus") return s.status === "on-hiatus";
  return true;
}
function matchesLength(s: ApiStory, length: string) {
  if (length === "Any") return true;
  const w = s.totalWords || 0;
  if (length === "Short") return w > 0 && w < 10_000;
  if (length === "Medium") return w >= 10_000 && w < 40_000;
  if (length === "Long") return w >= 40_000;
  return true;
}
function passesRating(s: ApiStory, maxValue: string) {
  if (maxValue === "all") return true;
  const max = ratingByValue(maxValue)?.level ?? 3;
  const lvl = ratingByValue(s.contentRating)?.level ?? 0;
  return lvl <= max;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── small UI atoms ──────────────────────────────────────────

function Spark({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
      </svg>
      {n}
    </span>
  );
}
function Caret({ open }: { open?: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
    </svg>
  );
}

function CoverArt({ story, sizes, large = false }: { story: ApiStory; sizes: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!story.coverImageUrl || failed) {
    // A coverless story becomes a cloth-bound book in its accent color with a
    // gilt frame — a shelf of fallbacks reads as a designed set, not missing art.
    const hue = spineHue(story);
    return (
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${hue} 40%, var(--color-ink)), color-mix(in srgb, ${hue} 16%, var(--color-void)) 75%)` }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "repeating-linear-gradient(45deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 3px)" }}
        />
        <div className={`absolute rounded-[2px] border border-amber/35 ${large ? "inset-[10px]" : "inset-[7px]"}`} />
        <div className={`absolute inset-0 flex items-center justify-center text-center ${large ? "p-6" : "p-4"}`}>
          <p className={`font-display leading-snug text-paper/90 line-clamp-5 ${large ? "text-[19px]" : "text-[13px]"}`}>{story.title}</p>
        </div>
        <div className={`absolute inset-x-0 flex justify-center ${large ? "bottom-6" : "bottom-4"}`}>
          <span className="h-px w-6 bg-amber/50" />
        </div>
      </div>
    );
  }
  return (
    <Image src={story.coverImageUrl} alt="" fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} unoptimized />
  );
}

// ── reusable option list (genre supports search) ────────────

function OptionList({ value, options, onPick, searchable = false, columns = 1 }: { value: string; options: string[]; onPick: (v: string) => void; searchable?: boolean; columns?: number }) {
  const [q, setQ] = useState("");
  const shown = searchable && q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div>
      {searchable && (
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a genre…"
          className="mb-2 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/40"
        />
      )}
      <div className={`max-h-60 overflow-y-auto no-scrollbar ${columns === 2 ? "grid grid-cols-2 gap-1" : "space-y-0.5"}`}>
        {shown.map((o) => {
          const active = o === value;
          return (
            <button key={o} onClick={() => onPick(o)}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${active ? "bg-amber/[0.1] text-amber" : "text-text-secondary hover:bg-elevated hover:text-paper"}`}>
              <span className="truncate">{o}</span>
              {active && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── popover toolbar ─────────────────────────────────────────

type Bag = {
  filters: Filters;
  genres: string[];
  set: (key: FKey, v: string) => void;
  reset: () => void;
  activeCount: number;
  poolLength: number;
};

function ToolbarFilters({ f }: { f: Bag }) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape. (A fixed inset-0 overlay doesn't work
  // here: the sticky header's backdrop-blur makes it a containing block, so
  // the overlay only covers the toolbar strip.)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The bar reads as a request to the librarian — "Show me … sorted by …" —
  // each blank a dotted fill-in slot. Same popovers underneath; only the
  // chrome became a sentence.
  const ratingLabel = ratingByValue(f.filters.rating)?.label ?? "All";
  const sortLabel = sortByValue(f.filters.sort)?.label ?? "Recommended";
  const slots: (Group & { display: string; alignRight?: boolean })[] = [
    { key: "genre", label: "Genre", value: f.filters.genre, base: "All", options: ["All", ...f.genres], searchable: true, columns: 2, display: f.filters.genre === "All" ? "every genre" : f.filters.genre },
    { key: "format", label: "Format", value: f.filters.format, base: "All", options: FORMAT_FILTERS, columns: 1, display: f.filters.format === "All" ? "any format" : f.filters.format },
    { key: "length", label: "Length", value: f.filters.length, base: "Any", options: LENGTHS, columns: 1, display: LENGTH_WORDS[f.filters.length] ?? "any length" },
    { key: "status", label: "Status", value: f.filters.status, base: "All", options: STATUS_FILTERS, columns: 1, display: STATUS_WORDS[f.filters.status] ?? "ongoing or complete" },
    { key: "rating", label: "Comfort", value: ratingLabel, base: "All", options: RATING_FILTERS, columns: 1, display: ratingLabel === "All" ? "every comfort level" : `${ratingLabel} comfort` },
    { key: "sort", label: "Sort", value: sortLabel, base: "Recommended", options: SORT_FILTERS, columns: 1, display: sortLabel.toLowerCase(), alignRight: true },
  ];
  return (
    <div ref={rootRef} className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-[13.5px]">
      <span className="font-display italic text-text-ghost">Show me</span>
      {slots.map((g, i) => {
        const active = g.value !== g.base;
        const isOpen = open === g.key;
        return (
          <span key={g.key} className="flex items-baseline gap-x-2">
            {i > 0 && <span className="select-none text-text-ghost/60">·</span>}
            {g.key === "sort" && <span className="font-display italic text-text-ghost">sorted by</span>}
            <span className="relative">
              <button
                onClick={() => setOpen(isOpen ? null : g.key)}
                className={`underline decoration-dotted underline-offset-[5px] transition-colors ${
                  isOpen || active ? "text-amber decoration-amber/60" : "text-paper decoration-text-ghost/50 hover:text-amber hover:decoration-amber/60"
                }`}
              >
                {g.display}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                    className={`absolute top-[calc(100%+8px)] z-30 rounded-xl border border-border bg-surface p-2 shadow-2xl ${g.alignRight ? "right-0" : "left-0"} ${g.columns === 2 ? "w-72" : "w-48"}`}>
                    <OptionList value={g.value} options={g.options} searchable={g.searchable} columns={g.columns} onPick={(v) => { f.set(g.key, v); setOpen(null); }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
          </span>
        );
      })}
      {f.activeCount > 0 && (
        <button onClick={f.reset} className="font-display italic text-text-ghost transition-colors hover:text-amber">— start over</button>
      )}
      {/* count lives in the collapsed row on mobile */}
      <span className="ml-auto hidden text-[12px] text-text-secondary sm:inline"><span className="text-paper">{f.poolLength}</span> {f.poolLength === 1 ? "story" : "stories"}</span>
    </div>
  );
}

// ── atmosphere ──────────────────────────────────────────────

// Dust motes drifting through the lamplight over the dealt book.
const MOTES = [
  { left: "8%", top: "24%", dur: 9, delay: 0 },
  { left: "22%", top: "62%", dur: 11, delay: 2.2 },
  { left: "38%", top: "18%", dur: 8, delay: 4.1 },
  { left: "55%", top: "70%", dur: 12, delay: 1.3 },
  { left: "72%", top: "30%", dur: 10, delay: 3.4 },
  { left: "88%", top: "55%", dur: 9, delay: 5.2 },
];

function DustMotes() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
      {MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute h-[3px] w-[3px] rounded-full bg-amber/50 blur-[1px]"
          style={{ left: m.left, top: m.top }}
          animate={{ y: [0, -28], x: [0, i % 2 ? 10 : -10], opacity: [0, 0.7, 0] }}
          transition={{ repeat: Infinity, duration: m.dur, delay: m.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function SleepingCat() {
  return (
    <motion.svg
      width="74"
      height="34"
      viewBox="0 0 74 34"
      className="absolute -top-[30px] right-8 text-text-secondary"
      animate={{ scaleY: [1, 1.035, 1] }}
      transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
      style={{ transformOrigin: "50% 100%" }}
      fill="currentColor"
      opacity={0.85}
      aria-hidden
    >
      <ellipse cx="34" cy="24" rx="24" ry="10" />
      <circle cx="53" cy="19" r="8.5" />
      <path d="M47 13 l2.4 -5 l3.4 3.4 Z M59 13 l-2.4 -5 l-3.4 3.4 Z" />
      <path d="M12 26 q -7 -1 -4 -8 q 1.6 -3.6 6 -3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 19 q 1.6 1.4 3.2 0" fill="none" stroke="rgba(16,13,10,0.8)" strokeWidth="1.1" strokeLinecap="round" />
    </motion.svg>
  );
}

// ── dealt card ──────────────────────────────────────────────

function BoostedChip({ overlay = false }: { overlay?: boolean }) {
  return (
    <span className={`rounded-full border border-amber/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-amber ${overlay ? "bg-void/70 backdrop-blur-sm" : "bg-amber/[0.08]"}`}>
      Boosted
    </span>
  );
}

function PickCard({ story, note, dir }: { story: BoostedStory; note: string; dir: number }) {
  const excerpt = storyExcerpt(story);
  const hue = spineHue(story);
  return (
    <motion.div
      key={story.id}
      initial={{ opacity: 0, x: dir * 60, rotateY: dir * 16 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: dir * -90, rotateY: dir * -12, scale: 0.97 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid w-full gap-6 md:grid-cols-[300px_1fr] md:grid-rows-[auto_auto] md:gap-x-11 md:gap-y-0"
    >
      {/* Title block first in DOM so the dealt story is never below the fold on mobile. */}
      <div className="md:col-start-2 md:self-end">
        {story.boosted ? (
          <div className="flex items-center gap-2.5">
            <BoostedChip />
            <p className="font-display text-[14px] italic text-amber/80">Placed in the window by its creator.</p>
          </div>
        ) : (
          <p className="font-display text-[15px] italic text-amber/80">{note}</p>
        )}
        <Link href={storyHref(story)}>
          <h2 className="mt-2 font-display text-[32px] leading-[1.03] text-paper transition-colors hover:text-amber-light sm:text-[44px]">{story.title}</h2>
        </Link>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
          <span className="text-paper/80">{story.authorName || "Anonymous"}</span><span className="text-text-ghost">·</span>
          <span>{story.genres[0] || storyFormatLabel(story)}</span><span className="text-text-ghost">·</span>
          <span>{storyFormatLabel(story)}</span>
          {story.totalWords > 0 && (<><span className="text-text-ghost">·</span><span>{formatReadTime(story.totalWords)}</span></>)}
          <span className="text-text-ghost">·</span><Spark n={story.sparkCount || 0} />
        </div>
      </div>

      {/* The book, staged on its mantel: firelight on the cover, glow pooling
          beneath, a wood plank grounding it. */}
      <div className="justify-self-center md:col-start-1 md:row-start-1 md:row-span-2 md:self-center">
        <Link href={storyHref(story)} className="block">
          <div className="relative w-[176px] md:w-[248px]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-r-md rounded-l-[3px] border border-amber/20 shadow-[0_30px_60px_-18px_rgba(0,0,0,0.9)]">
              <CoverArt story={story} sizes="(min-width:768px) 248px, 176px" large />
              <div className="absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/55 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/[0.07]" />
              {/* firelight breathing across the cover */}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber/25 via-transparent to-transparent"
                animate={{ opacity: [0.5, 0.9, 0.6, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut" }}
              />
            </div>
            {/* mantel plank */}
            <div className="-mx-4 mt-0 h-3 rounded-[2px]" style={{ background: PLANK_FACE, boxShadow: PLANK_SHADOW }} />
            {/* candle glow pooling under the book, tinted by the story */}
            <div
              className="pointer-events-none absolute -bottom-5 left-1/2 -z-10 h-16 w-[150%] -translate-x-1/2 rounded-[50%] blur-2xl"
              style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)` }}
            />
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-3xl"
              style={{ background: `color-mix(in srgb, ${hue} 10%, transparent)` }}
            />
          </div>
        </Link>
      </div>

      <div className="md:col-start-2 md:self-start">
        {excerpt ? (
          // Its opening, on real paper — paper stays paper in every theme.
          <div className="relative mt-2 max-w-lg -rotate-[0.5deg] rounded-[3px] p-4 shadow-[0_12px_26px_-10px_rgba(0,0,0,0.55)] md:mt-6" style={{ background: PAPER_BG, color: PAPER_INK }}>
            <p className="text-[9px] uppercase tracking-[0.16em] opacity-50">from its pages —</p>
            <p className="font-reading mt-1.5 text-[14.5px] leading-[1.8] line-clamp-6">{excerpt}</p>
          </div>
        ) : (
          <p className="max-w-lg text-[14px] italic leading-relaxed text-text-ghost md:mt-6">
            No synopsis yet — but every shelf holds a surprise. Open it and see.
          </p>
        )}

        <div className="mt-7">
          <Link href={storyHref(story)} className="rounded-full bg-amber px-6 py-3 text-[13px] font-medium text-void transition-all hover:brightness-110">
            Begin reading
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── the shelves ─────────────────────────────────────────────

function Plank() {
  return (
    <div className="relative mt-3 h-2.5 rounded-[2px]" style={{ background: PLANK_FACE, boxShadow: PLANK_SHADOW }} />
  );
}

function ShelfBook({ story, index, onPick }: { story: BoostedStory; index: number; onPick?: () => void }) {
  const tilt = index % 3 === 1 ? 1.4 : index % 3 === 2 ? -1.4 : 0;
  const hue = spineHue(story);
  const ongoing = story.status === "in-progress" || story.status === "published";
  const inner = (
    <>
      <div
        className="relative overflow-hidden rounded-r-md rounded-l-[3px] border border-border shadow-[0_14px_28px_-10px_rgba(0,0,0,0.65)] transition-shadow duration-300 group-hover:shadow-[0_18px_38px_-10px_var(--book-glow)]"
        style={{ "--book-glow": `color-mix(in srgb, ${hue} 45%, rgba(0,0,0,0.6))` } as React.CSSProperties}
      >
        <div className="relative aspect-[2/3] w-full">
          <CoverArt story={story} sizes="(min-width:640px) 132px, 116px" />
        </div>
        {/* spine shadow + page gloss */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/[0.07]" />
        {story.boosted && (
          <span className="absolute left-1.5 top-2"><BoostedChip overlay /></span>
        )}
        {ongoing && !story.boosted && (
          // a live ember, tucked in the corner: this one's still being written
          <span className="absolute bottom-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-void/70 backdrop-blur-sm" title="Still being written">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-amber"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-[11.5px] text-text transition-colors group-hover:text-amber">{story.title}</p>
      <p className="truncate text-[9.5px] text-text-ghost">
        {story.authorName || "Anonymous"}{story.sparkCount > 0 && <> · ✦ {story.sparkCount}</>}
      </p>
    </>
  );
  const cls = "group relative w-[116px] shrink-0 text-left sm:w-[132px]";
  if (onPick) {
    return (
      <motion.button onClick={onPick} initial={false} whileHover={{ y: -8, rotate: 0 }} style={{ rotate: tilt }} className={cls}>
        {inner}
      </motion.button>
    );
  }
  return (
    <motion.div initial={false} whileHover={{ y: -8, rotate: 0 }} style={{ rotate: tilt }} className={cls}>
      <Link href={storyHref(story)} className="block">{inner}</Link>
    </motion.div>
  );
}

// A story's hook on a paper card, propped between the books — breaks the
// poster-wall monotony with type.
function HookCard({ story }: { story: ApiStory }) {
  const hook = storyExcerpt(story);
  if (!hook) return null;
  return (
    <div className="relative mb-9 w-[156px] shrink-0 -rotate-2">
      <div
        className="absolute -top-2 left-1/2 h-3.5 w-10 -translate-x-1/2 rotate-2 rounded-[1px] opacity-70"
        style={{ background: "rgba(243,236,221,0.28)" }}
      />
      <div className="rounded-[3px] p-3 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.55)]" style={{ background: PAPER_BG, color: PAPER_INK }}>
        <p className="text-[8.5px] font-medium uppercase tracking-[0.16em] opacity-60">✦ tucked inside</p>
        <p className="mt-1 font-display text-[11.5px] italic leading-snug line-clamp-5">{hook}</p>
      </div>
    </div>
  );
}

const BOOKS_PER_SHELF = 7;

function Shelves({ pool, onPick }: { pool: BoostedStory[]; onPick?: (index: number) => void }) {
  const rows = chunk(pool.map((s, i) => ({ s, i })), BOOKS_PER_SHELF);
  return (
    <div className="space-y-10">
      {rows.map((row, r) => {
        // one paper hook-card per alternating shelf, after the second book
        const talker = r % 2 === 1 ? row.find((e, j) => j >= 1 && storyExcerpt(e.s)) : undefined;
        return (
          <div key={r}>
            <div className="flex items-end gap-5 overflow-x-auto pb-1 pt-2 no-scrollbar">
              {row.map((e, j) => (
                <div key={e.s.id} className="flex shrink-0 items-end gap-5">
                  <ShelfBook story={e.s} index={r + j} onPick={onPick ? () => onPick(e.i) : undefined} />
                  {talker?.s.id === e.s.id && j > 0 && <HookCard story={e.s} />}
                </div>
              ))}
            </div>
            <div className="relative">
              {r === rows.length - 1 && <SleepingCat />}
              <Plank />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-end gap-5 overflow-hidden pt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-[116px] shrink-0 sm:w-[132px]">
            <div className="aspect-[2/3] rounded-r-md rounded-l-[3px] bg-elevated" />
            <div className="mt-2 h-3 w-3/4 rounded bg-elevated" />
          </div>
        ))}
      </div>
      <Plank />
    </div>
  );
}

// ── live now ────────────────────────────────────────────────
// Adventures being played at this moment. The watch page only exists while
// the table sits — this row is how an audience finds it in time.

function LiveTableCard({ table }: { table: LiveTable }) {
  const live = table.sessionStatus !== "draft";
  return (
    <Link
      href={table.watchHref ?? `/campaign/${table.storyId}/watch/${table.sessionId}`}
      className={`group flex w-[264px] shrink-0 items-center gap-3.5 rounded-xl border bg-ink p-3 transition-all hover:border-rose/40 ${
        live ? "border-rose/20 shadow-[0_0_24px_-12px_rgba(200,80,100,0.5)]" : "border-border"
      }`}
    >
      <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-md border border-border">
        {table.coverImageUrl ? (
          <Image src={table.coverImageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-elevated to-void" />
        )}
        {live && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-rose/25 via-transparent to-transparent"
            animate={{ opacity: [0.4, 0.9, 0.5, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-[14px] leading-snug text-paper transition-colors group-hover:text-rose">
          {table.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-text-secondary">{table.authorName || "Anonymous"}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-ghost">
          {table.sessionStatus === "draft" ? (
            // Gathering — a steady ember, not yet the live ping.
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
            </span>
          ) : (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose" />
            </span>
          )}
          {table.sessionStatus === "draft"
            ? "About to begin · Watch"
            : table.spectatorCount > 0
              ? `${table.spectatorCount} watching · Watch`
              : "Playing now · Watch"}
        </p>
      </div>
    </Link>
  );
}

function LiveNowRow({ tables }: { tables: LiveTable[] }) {
  return (
    <section className="pt-7">
      <div className="mb-3.5 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] text-text-ghost">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose/50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose" />
        </span>
        Live now · adventures being written at this moment
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {tables.map((t) => (
          <LiveTableCard key={t.sessionId} table={t} />
        ))}
      </div>
    </section>
  );
}

// ── page ────────────────────────────────────────────────────

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
          <p className="text-[12px] uppercase tracking-[0.15em] text-text-ghost">Opening the library…</p>
        </div>
      </div>
    }>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") || "");

  // ?filter= deep links carry the old quick-filter values (e.g. /browse?filter=Adventures
  // from dashboards/emails); unknown values fall through to the defaults.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    ...(QUICK_FILTER_MAP[searchParams.get("filter") ?? ""] ?? {}),
  }));

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [stories, setStories] = useState<ApiStory[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [boosted, setBoosted] = useState<BoostedStory[]>([]);
  const [liveTables, setLiveTables] = useState<LiveTable[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // comfort rating persists (real safety filter, shared key across the app)
  useEffect(() => {
    const saved = localStorage.getItem("quiloria-comfort-rating");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setFilters((f) => ({ ...f, rating: saved }));
  }, []);
  useEffect(() => { localStorage.setItem("quiloria-comfort-rating", filters.rating); }, [filters.rating]);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // Every filter is pushed down to the API — the shelf draws from the whole
  // library, not from whichever 60 stories arrived first.
  const filterParams = useCallback((f: Filters) => {
    const params = new URLSearchParams({ public: "true", limit: "60" });
    params.set("sort", f.sort);
    if (f.genre !== "All") params.set("genre", f.genre);
    if (f.format !== "All") {
      if (f.format === "Adventure") params.set("writingMode", "campaign");
      else {
        const value = FORMATS.find((fmt) => fmt.label === f.format)?.value;
        if (value) params.set("format", value);
      }
    }
    if (f.status === "Ongoing") params.set("status", "in-progress,published");
    else if (f.status === "Complete") params.set("status", "complete");
    else if (f.status === "Hiatus") params.set("status", "on-hiatus");
    if (f.length === "Short") { params.set("minWords", "1"); params.set("maxWords", "10000"); }
    else if (f.length === "Medium") { params.set("minWords", "10000"); params.set("maxWords", "40000"); }
    else if (f.length === "Long") params.set("minWords", "40000");
    if (f.rating !== "all") {
      const max = ratingByValue(f.rating)?.level ?? 3;
      params.set("ratings", RATINGS.filter((r) => r.value !== "all" && r.level <= max).map((r) => r.value).join(","));
    }
    return params;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchStories() {
      setLoading(true);
      try {
        const params = filterParams(filters);
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        const res = await fetch(`/api/stories?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (res.ok) {
          setStories(json.data?.stories || []);
          setNextCursor(json.data?.nextCursor ?? null);
        }
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStories([]);
        setNextCursor(null);
        setLoading(false);
      }
    }
    fetchStories();
    return () => controller.abort();
  }, [debouncedQuery, filters, filterParams]);

  // Deal further into the library as the deck runs low — the same filtered
  // stream, one cursor page at a time, invisible to the layout.
  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const params = filterParams(filters);
      if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
      params.set("cursor", nextCursor);
      const res = await fetch(`/api/stories?${params}`);
      const json = await res.json();
      if (res.ok) {
        const fresh: ApiStory[] = json.data?.stories || [];
        setStories((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          return [...prev, ...fresh.filter((s) => !seen.has(s.id))];
        });
        setNextCursor(json.data?.nextCursor ?? null);
      }
    } catch {
      // The deck simply stops growing; the current cards stand.
    } finally {
      loadingMoreRef.current = false;
    }
  }, [nextCursor, filters, debouncedQuery, filterParams]);

  // Paid placements (/creator/boost) — up to two, always labeled, filter-safe.
  useEffect(() => {
    const controller = new AbortController();
    async function fetchBoosts() {
      try {
        const res = await fetch("/api/boosts", { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        setBoosted(
          ((json.data || []) as Record<string, unknown>[]).map((b) => ({
            id: String(b.storyId || b.id || ""),
            title: String(b.title || "Untitled"),
            slug: typeof b.slug === "string" ? b.slug : null,
            synopsis: typeof b.synopsis === "string" ? b.synopsis : null,
            hook: typeof b.hook === "string" ? b.hook : null,
            coverImageUrl: typeof b.coverImageUrl === "string" ? b.coverImageUrl : null,
            genres: Array.isArray(b.genres) ? (b.genres as string[]) : [],
            format: typeof b.format === "string" ? b.format : "novel",
            writingMode: typeof b.writingMode === "string" ? b.writingMode : undefined,
            contentRating: typeof b.contentRating === "string" ? b.contentRating : "everyone",
            status: typeof b.status === "string" ? b.status : "in-progress",
            createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
            updatedAt: typeof b.updatedAt === "string" ? b.updatedAt : new Date().toISOString(),
            authorName: typeof b.authorName === "string" ? b.authorName : null,
            chapterCount: typeof b.chapterCount === "number" ? b.chapterCount : 0,
            totalWords: typeof b.totalWords === "number" ? b.totalWords : 0,
            sparkCount: typeof b.sparkCount === "number" ? b.sparkCount : 0,
            boosted: true,
          }))
        );
      } catch {
        // boosts are optional placements — fail quietly
      }
    }
    fetchBoosts();
    return () => controller.abort();
  }, []);

  // Adventures live at this moment — fetched once per visit; the row simply
  // doesn't render when no table is sitting.
  useEffect(() => {
    const controller = new AbortController();
    async function fetchLive() {
      try {
        const res = await fetch("/api/campaigns/live", { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        setLiveTables(Array.isArray(json.data) ? (json.data as LiveTable[]) : []);
      } catch {
        // discovery strip is optional — fail quietly
      }
    }
    fetchLive();
    return () => controller.abort();
  }, []);

  const presentGenres = useMemo(() => {
    // Results are already genre-filtered on the server — deriving chips
    // from them would collapse the toolbar to the selected genre. Show
    // the full list while one is picked so switching stays possible.
    if (filters.genre !== "All") return [...GENRES];
    const counts: Record<string, number> = {};
    stories.forEach((s) => s.genres.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    return GENRES.filter((g) => (counts[g] || 0) > 0);
  }, [stories, filters.genre]);

  const searching = debouncedQuery.trim().length > 0;

  const passesFilters = useCallback((s: ApiStory) => {
    if (filters.genre !== "All" && !s.genres.includes(filters.genre)) return false;
    if (!matchesFormat(s, filters.format)) return false;
    if (!matchesStatus(s, filters.status)) return false;
    if (!matchesLength(s, filters.length)) return false;
    if (!passesRating(s, filters.rating)) return false;
    return true;
  }, [filters.genre, filters.format, filters.status, filters.length, filters.rating]);

  // Boosted placements respect the same filters as organic results.
  const sponsored = useMemo(() => boosted.filter(passesFilters).slice(0, 2), [boosted, passesFilters]);

  // Live tables honor the comfort rating (a real safety filter) but ignore the
  // browsing filters — a live session is a moment, not a shelf.
  const liveVisible = useMemo(
    () =>
      liveTables.filter((t) => {
        if (filters.rating === "all") return true;
        const max = ratingByValue(filters.rating)?.level ?? 3;
        const lvl = ratingByValue(t.contentRating)?.level ?? 0;
        return lvl <= max;
      }),
    [liveTables, filters.rating]
  );

  const pool: BoostedStory[] = useMemo(() => {
    const sponsoredIds = new Set(sponsored.map((s) => s.id));
    const organic = stories.filter((s) => !sponsoredIds.has(s.id) && passesFilters(s));
    // Boosted leads the deck + shelves (clearly labeled); search results stay organic.
    return searching ? organic : [...sponsored, ...organic];
  }, [stories, sponsored, passesFilters, searching]);

  const set = useCallback((key: FKey, v: string) => {
    setFilters((f) => ({
      ...f,
      [key]: key === "rating" ? ratingByLabel(v)?.value ?? "all" : key === "sort" ? sortByLabel(v)?.value ?? "recommended" : v,
    }));
    setIndex(0); setDir(1);
  }, []);

  const reset = useCallback(() => {
    setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort }));
    setIndex(0); setDir(1);
  }, []);

  const next = useCallback(() => {
    setDir(1);
    setIndex((i) => {
      // Reach for the next cursor page before the deck wraps around.
      if (pool.length && pool.length - i < 6) loadMore();
      return pool.length ? (i + 1) % pool.length : 0;
    });
  }, [pool.length, loadMore]);
  const prev = useCallback(() => { setDir(-1); setIndex((i) => (pool.length ? (i - 1 + pool.length) % pool.length : 0)); }, [pool.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (searching) return;
      // Never hijack keys aimed at interactive elements (buttons lose Space otherwise).
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('button, a, input, textarea, select, [contenteditable], [role="button"]')) return;
      if (e.key === " ") {
        // Only claim Space when nothing is focused; otherwise leave scroll/activation alone.
        if (document.activeElement !== document.body) return;
        e.preventDefault();
        next();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, searching]);

  const activeCount = NARROWING_KEYS.filter((k) => filters[k] !== DEFAULT_FILTERS[k]).length;

  const f: Bag = { filters, genres: presentGenres, set, reset, activeCount, poolLength: pool.length };

  const safeIndex = pool.length ? index % pool.length : 0;
  const story = pool[safeIndex];
  const note = LIBRARIAN_NOTES[safeIndex % LIBRARIAN_NOTES.length];

  return (
    <main className="min-h-screen bg-void text-text">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(224,169,62,0.10),transparent_65%)]" />

      {/* ── search + toolbar (sticky) ── */}
      <div className="sticky top-14 z-30 border-b border-border bg-void/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6">
          {/* inked underline field — the one non-pill input on the page */}
          <div className="flex items-center gap-2.5 border-b border-border transition-colors focus-within:border-amber/40">
            <span className="text-text-ghost"><SearchIcon /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, authors, worlds…"
              className="w-full bg-transparent py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost"
            />
          </div>
          {/* mobile: one compact row; the full chip set expands on demand */}
          <div className="flex items-center justify-between sm:hidden">
            <button
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[12px] transition-colors ${
                activeCount > 0 ? "border-amber/40 bg-amber/[0.07] text-amber" : "border-border bg-surface text-text-secondary"
              }`}
            >
              Filters{activeCount > 0 && <span>· {activeCount}</span>}
              <Caret open={mobileFiltersOpen} />
            </button>
            <span className="text-[12px] text-text-secondary"><span className="text-paper">{pool.length}</span> {pool.length === 1 ? "story" : "stories"}</span>
          </div>
          <div className={mobileFiltersOpen ? "" : "hidden sm:block"}>
            <ToolbarFilters f={f} />
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {searching ? (
          // ── search results, on the same shelves ──
          <section className="pt-8">
            <div className="mb-8">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Results for “{debouncedQuery}”</p>
              <h1 className="font-display text-[28px] text-paper">
                {loading ? "Searching the stacks…" : `${pool.length} ${pool.length === 1 ? "story" : "stories"}`}
              </h1>
            </div>
            {loading ? (
              <div className="space-y-10">
                <ShelfSkeleton />
                <ShelfSkeleton />
              </div>
            ) : pool.length > 0 ? (
              <Shelves pool={pool} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-ink/60 px-6 py-24 text-center">
                <h3 className="mb-2 font-display text-[19px] text-paper">Nothing on that shelf</h3>
                <p className="max-w-sm text-[13px] leading-relaxed text-text-secondary">No stories match your search and filters. Try a broader term or loosen a filter.</p>
                <button onClick={() => { setQuery(""); reset(); }} className="mt-6 rounded-full border border-amber/30 bg-amber/[0.06] px-5 py-2.5 text-[13px] text-amber transition-colors hover:text-paper">
                  Clear search & filters
                </button>
              </div>
            )}
          </section>
        ) : (
          // ── the reading ritual ──
          <>
            {liveVisible.length > 0 && <LiveNowRow tables={liveVisible} />}

            <div className="mb-5 flex items-center gap-2.5 pt-7 text-[10px] uppercase tracking-[0.22em] text-text-ghost">
              <span className="h-px w-8 bg-amber/40" />
              Set aside for you · tonight
            </div>

            <section className="relative flex min-h-[62vh] flex-col justify-center pb-8">
              <DustMotes />
              <div className="min-h-[440px] [perspective:1200px]">
                {loading ? (
                  <div className="grid w-full animate-pulse gap-8 md:grid-cols-[300px_1fr] md:gap-11">
                    <div className="mx-auto aspect-[2/3] w-[248px] rounded-md bg-elevated" />
                    <div className="flex flex-col justify-center gap-3">
                      <div className="h-3 w-40 rounded bg-elevated" />
                      <div className="h-9 w-2/3 rounded bg-elevated" />
                      <div className="h-3 w-1/2 rounded bg-elevated" />
                      <div className="mt-3 h-24 w-full rounded bg-elevated" />
                    </div>
                  </div>
                ) : story ? (
                  <AnimatePresence mode="wait">
                    <PickCard key={story.id} story={story} note={note} dir={dir} />
                  </AnimatePresence>
                ) : (
                  <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                    <p className="font-display text-[22px] text-paper">No story fits that exactly.</p>
                    <p className="mt-2 max-w-sm text-[13px] text-text-secondary">The shelves came up empty for this combination. Loosen a filter and the librarian will find you something.</p>
                    <button onClick={reset} className="mt-6 rounded-full border border-amber/30 bg-amber/[0.06] px-5 py-2.5 text-[13px] text-amber hover:text-paper">Clear filters</button>
                  </div>
                )}
              </div>

              {!loading && pool.length > 1 && (
                <>
                  <div className="mt-10 flex items-center justify-center gap-4">
                    <button onClick={prev} className="grid h-11 w-11 place-items-center rounded-full border border-border text-text-secondary transition-colors hover:border-amber/30 hover:text-amber" aria-label="Previous">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: "rotate(180deg)" }}><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={next} className="inline-flex items-center gap-2.5 rounded-full border border-amber/25 bg-amber/[0.05] px-6 py-3 text-[13px] text-text-secondary transition-colors hover:border-amber/45 hover:text-paper">
                      Not tonight — deal another
                      <motion.svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" whileTap={{ rotate: 360 }} transition={{ duration: 0.4 }}><path d="M13 8a5 5 0 11-1.5-3.5M13 2v3h-3" strokeLinecap="round" strokeLinejoin="round" /></motion.svg>
                    </button>
                  </div>
                  <p className="mt-4 hidden text-center text-[11px] text-text-ghost sm:block">
                    <kbd className="rounded border border-border px-1.5 py-0.5">←</kbd> <kbd className="rounded border border-border px-1.5 py-0.5">→</kbd> or <kbd className="rounded border border-border px-1.5 py-0.5">space</kbd> to flip through tonight&apos;s picks
                  </p>
                </>
              )}
            </section>

            {!loading && pool.length > 0 && (
              <section className="border-t border-border pt-14">
                <div className="mb-9 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-display text-[30px] text-paper">{activeCount > 0 ? "The matching stacks" : "Or wander the full stacks"}</h2>
                  <p className="text-[13px] italic text-text-ghost">
                    {activeCount > 0 ? `${pool.length} ${pool.length === 1 ? "story" : "stories"} match your filters — choose for yourself.` : "when you'd rather choose for yourself."}
                  </p>
                </div>
                <Shelves pool={pool} onPick={(i) => { setDir(1); setIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                <p className="mt-10 text-center text-[11.5px] italic text-text-ghost">The shelves restock nightly. Stay as long as you like.</p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
