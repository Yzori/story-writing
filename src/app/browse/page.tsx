"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GENRES } from "@/config/genres";
import { formatReadTime } from "@/lib/format";
import type { ApiStory } from "@/types/api";

// ── Browse — "Tonight's Page" ───────────────────────────────
// A reading ritual: the library sets one story aside, shown large with its
// hook/synopsis as type. "Deal another" flips the deck. A slim popover toolbar
// scopes the deck and the stacks below; searching flips to a results grid.

const LIBRARIAN_NOTES = [
  "Because you stayed up too late with the last one.",
  "A quiet one, for a loud week.",
  "You've been circling stories like this — here's the real thing.",
  "Set aside the moment it arrived. It felt like yours.",
  "Short enough for tonight, long enough to stay with you.",
  "Picked off the shelf while no one was looking.",
];

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

// Coverless stories get a spine color from the accent palette (hashed off the
// story id) so a shelf of fallbacks reads as designed, not missing.
const SPINE_HUES = [
  "var(--color-amber)",
  "var(--color-rose)",
  "var(--color-sage)",
  "var(--color-lavender)",
  "var(--color-teal)",
  "var(--color-copper)",
  "var(--color-lapis)",
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

function CoverArt({ story, sizes }: { story: ApiStory; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (!story.coverImageUrl || failed) {
    const hue = spineHue(story);
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-void">
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 30% 18%, color-mix(in srgb, ${hue} 22%, transparent), transparent 55%)` }}
        />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-2 h-px w-8" style={{ background: `color-mix(in srgb, ${hue} 45%, transparent)` }} />
          <p className="font-display text-[14px] leading-tight text-paper/85 line-clamp-4">{story.title}</p>
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

  const groups: Group[] = [
    { key: "genre", label: "Genre", value: f.filters.genre, base: "All", options: ["All", ...f.genres], searchable: true, columns: 2 },
    { key: "format", label: "Format", value: f.filters.format, base: "All", options: FORMAT_FILTERS, columns: 1 },
    { key: "length", label: "Length", value: f.filters.length, base: "Any", options: LENGTHS, columns: 1 },
    { key: "status", label: "Status", value: f.filters.status, base: "All", options: STATUS_FILTERS, columns: 1 },
    { key: "rating", label: "Comfort", value: ratingByValue(f.filters.rating)?.label ?? "All", base: "All", options: RATING_FILTERS, columns: 1 },
    { key: "sort", label: "Sort", value: sortByValue(f.filters.sort)?.label ?? "Recommended", base: "Recommended", options: SORT_FILTERS, columns: 1 },
  ];
  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      {groups.map((g) => {
        const active = g.value !== g.base;
        return (
          <div key={g.key} className="relative z-20">
            <button
              onClick={() => setOpen(open === g.key ? null : g.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] transition-colors ${active ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border bg-surface text-text-secondary hover:text-paper"}`}
            >
              <span className="text-text-ghost">{g.label}</span>
              <span className={active ? "text-amber" : "text-paper"}>{active ? g.value : g.base}</span>
              <Caret open={open === g.key} />
            </button>
            <AnimatePresence>
              {open === g.key && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className={`absolute left-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border bg-surface p-2 shadow-2xl ${g.columns === 2 ? "w-72" : "w-48"}`}>
                  <OptionList value={g.value} options={g.options} searchable={g.searchable} columns={g.columns} onPick={(v) => { f.set(g.key, v); setOpen(null); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {f.activeCount > 0 && <button onClick={f.reset} className="ml-1 text-[12px] text-text-ghost transition-colors hover:text-amber">Reset</button>}
      {/* count lives in the collapsed row on mobile */}
      <span className="ml-auto hidden text-[12px] text-text-secondary sm:inline"><span className="text-paper">{f.poolLength}</span> {f.poolLength === 1 ? "story" : "stories"}</span>
    </div>
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
  return (
    <motion.div
      key={story.id}
      initial={{ opacity: 0, x: dir * 70, rotate: dir * 3 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: dir * -110, rotate: dir * -4, scale: 0.95 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid w-full gap-6 md:grid-cols-[280px_1fr] md:grid-rows-[auto_auto] md:gap-x-11 md:gap-y-0"
    >
      {/* Title block first in DOM so the dealt story is never below the fold on mobile. */}
      <div className="md:col-start-2 md:self-end">
        {story.boosted ? (
          <div className="flex items-center gap-2.5">
            <BoostedChip />
            <p className="font-display text-[13px] italic text-amber/80">Placed in the window by its creator.</p>
          </div>
        ) : (
          <p className="font-display text-[13px] italic text-amber/80">{note}</p>
        )}
        <Link href={storyHref(story)}>
          <h2 className="mt-2 font-display text-[32px] leading-[1.03] text-paper transition-colors hover:text-amber-light sm:text-[42px]">{story.title}</h2>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
          <span className="text-paper/80">{story.authorName || "Anonymous"}</span><span className="text-text-ghost">·</span>
          <span>{story.genres[0] || storyFormatLabel(story)}</span><span className="text-text-ghost">·</span>
          <span>{storyFormatLabel(story)}</span>
          {story.totalWords > 0 && (<><span className="text-text-ghost">·</span><span>{formatReadTime(story.totalWords)}</span></>)}
          <span className="text-text-ghost">·</span><Spark n={story.sparkCount || 0} />
        </div>
      </div>

      <div className="justify-self-center md:col-start-1 md:row-start-1 md:row-span-2 md:self-center">
        <Link href={storyHref(story)} className="block">
          <div className="relative w-[176px] md:w-[244px]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-r-md rounded-l-sm border border-amber/20 shadow-[0_30px_60px_-18px_rgba(0,0,0,0.9)]">
              <CoverArt story={story} sizes="(min-width:768px) 244px, 176px" />
              <div className="absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/55 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-void/40 to-transparent" />
            </div>
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-amber/10 blur-3xl" />
          </div>
        </Link>
      </div>

      <div className="md:col-start-2 md:self-start">
        {excerpt ? (
          <div className="relative max-w-lg border-l-2 border-amber/30 pl-5 md:mt-6">
            <span className="absolute -left-3 -top-3 font-display text-[40px] leading-none text-amber/25">“</span>
            <p className="novel-reader text-[16px] leading-[1.85] text-text line-clamp-6">{excerpt}</p>
          </div>
        ) : (
          <p className="max-w-lg text-[14px] italic leading-relaxed text-text-ghost md:mt-6">
            No synopsis yet — but every shelf holds a surprise. Open it and see.
          </p>
        )}

        <div className="mt-7">
          <Link href={storyHref(story)} className="rounded-full bg-paper px-6 py-3 text-[13px] font-medium text-void transition-transform hover:translate-x-0.5">
            Begin reading
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── stacks tile ─────────────────────────────────────────────

function StackTile({ story, onPick }: { story: BoostedStory; onPick?: () => void }) {
  const inner = (
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border transition-all group-hover:border-amber/30 group-hover:shadow-[0_0_28px_-8px_rgba(224,169,62,0.4)]">
      <CoverArt story={story} sizes="(min-width:1024px) 200px, 45vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-void/90 to-transparent" />
      {story.boosted && (
        <span className="absolute left-2 top-2"><BoostedChip overlay /></span>
      )}
      {story.sparkCount > 0 && (
        <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-void/55 px-2 py-0.5 backdrop-blur-sm"><Spark n={story.sparkCount} /></span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="font-display text-[13px] leading-tight text-paper line-clamp-2">{story.title}</p>
        <p className="mt-0.5 truncate text-[10px] text-paper/55">{story.authorName || "Anonymous"}</p>
      </div>
    </div>
  );
  if (onPick) {
    return <button onClick={onPick} className="group block w-full text-left">{inner}</button>;
  }
  return <Link href={storyHref(story)} className="group block">{inner}</Link>;
}

function StackSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-elevated" />
      <div className="mt-2 h-3 w-3/4 rounded bg-elevated" />
    </div>
  );
}

// ── live now ────────────────────────────────────────────────
// Adventures being played at this moment. The watch page only exists while
// the table sits — this row is how an audience finds it in time.

function LiveTableCard({ table }: { table: LiveTable }) {
  return (
    <Link
      href={`/campaign/${table.storyId}/watch/${table.sessionId}`}
      className="group flex w-[264px] shrink-0 items-center gap-3.5 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-rose/35"
    >
      <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-md border border-border">
        {table.coverImageUrl ? (
          <Image src={table.coverImageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-elevated to-void" />
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

  useEffect(() => {
    const controller = new AbortController();
    async function fetchStories() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ public: "true", limit: "60" });
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        if (filters.sort === "most-sparked" || filters.sort === "latest") params.set("sort", filters.sort);
        const res = await fetch(`/api/stories?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (res.ok) setStories(json.data?.stories || []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStories([]);
        setLoading(false);
      }
    }
    fetchStories();
    return () => controller.abort();
  }, [debouncedQuery, filters.sort]);

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
    const counts: Record<string, number> = {};
    stories.forEach((s) => s.genres.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    return GENRES.filter((g) => (counts[g] || 0) > 0);
  }, [stories]);

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
    // Boosted leads the deck + stacks (clearly labeled); search results stay organic.
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

  const next = useCallback(() => { setDir(1); setIndex((i) => (pool.length ? (i + 1) % pool.length : 0)); }, [pool.length]);
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
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-ghost"><SearchIcon /></div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, authors, worlds…"
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-[13px] text-text outline-none transition-colors placeholder:text-text-ghost focus:border-amber/35"
            />
          </div>
          {/* mobile: one compact row; the full chip set expands on demand */}
          <div className="flex items-center justify-between sm:hidden">
            <button
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] transition-colors ${
                activeCount > 0 ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border bg-surface text-text-secondary"
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

      <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {searching ? (
          // ── search results grid ──
          <section className="pt-8">
            <div className="mb-6">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Results for “{debouncedQuery}”</p>
              <h1 className="font-display text-[24px] text-paper">
                {loading ? "Searching the stacks…" : `${pool.length} ${pool.length === 1 ? "story" : "stories"}`}
              </h1>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => <StackSkeleton key={i} />)}
              </div>
            ) : pool.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {pool.map((s) => <StackTile key={s.id} story={s} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/50 px-6 py-24 text-center">
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

            <section className="flex min-h-[62vh] flex-col justify-center pb-8">
              <div className="min-h-[440px]">
                {loading ? (
                  <div className="grid w-full animate-pulse gap-8 md:grid-cols-[280px_1fr] md:gap-11">
                    <div className="mx-auto aspect-[2/3] w-[244px] rounded-md bg-elevated" />
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
                    <button onClick={next} className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-6 py-3 text-[13px] text-text-secondary transition-colors hover:border-amber/30 hover:text-paper">
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
              <section className="border-t border-border pt-12">
                <div className="mb-7">
                  <h2 className="font-display text-[24px] text-paper">{activeCount > 0 ? "The matching stacks" : "Or wander the full stacks"}</h2>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    {activeCount > 0 ? `${pool.length} ${pool.length === 1 ? "story" : "stories"} match your filters — choose for yourself.` : "When you'd rather choose for yourself."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {pool.map((s, i) => (
                    <StackTile key={s.id} story={s} onPick={() => { setDir(1); setIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
