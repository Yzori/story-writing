"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORIES, type MockStory } from "../_data";

// ── Tonight's Page ──────────────────────────────────────────
// Browse as a reading ritual, not a catalog. The library sets ONE story aside,
// shown large with its real opening lines set as type you can start reading in
// place. "Not tonight?" deals the next card. Filters live in a slim popover
// toolbar that scopes both the dealt deck and the full stacks below.

const LIBRARIAN_NOTES = [
  "Because you stayed up too late with the last one.",
  "A quiet one, for a loud week.",
  "You've been circling stories like this — here's the real thing.",
  "Set aside the moment it arrived. It felt like yours.",
  "Short enough for tonight, long enough to stay with you.",
  "Someone returned this and said only: \"finally.\"",
];

const ALL_GENRES = Array.from(new Set(STORIES.map((s) => s.genre)));
const ALL_FORMATS = Array.from(new Set(STORIES.map((s) => s.format)));
const STATUSES = ["All", "Complete", "Ongoing", "New"];
const LENGTHS = ["Any", "Short", "Medium", "Long"];
const RATINGS = ["All", "All Ages", "Teen+", "Mature"];
const RATING_LEVEL: Record<string, number> = { "All Ages": 0, "Teen+": 1, "Mature": 2 };

type FKey = "genre" | "format" | "status" | "length" | "rating";
type Group = { key: FKey; label: string; value: string; base: string; options: string[]; searchable?: boolean; columns?: number };

function parseMinutes(readTime: string): number {
  let mins = 0;
  const h = readTime.match(/(\d+)\s*h/);
  const m = readTime.match(/(\d+)\s*m(?:in)?/);
  if (h) mins += parseInt(h[1], 10) * 60;
  if (m) mins += parseInt(m[1], 10);
  return mins;
}

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
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
      className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// reusable option list (genre supports search)
function OptionList({
  value, options, onPick, searchable = false, columns = 1,
}: { value: string; options: string[]; onPick: (v: string) => void; searchable?: boolean; columns?: number }) {
  const [q, setQ] = useState("");
  const shown = searchable && q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div>
      {searchable && (
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a genre…"
          className="mb-2 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/40"
        />
      )}
      <div className={`max-h-60 overflow-y-auto no-scrollbar ${columns === 2 ? "grid grid-cols-2 gap-1" : "space-y-0.5"}`}>
        {shown.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              onClick={() => onPick(o)}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                active ? "bg-amber/[0.1] text-amber" : "text-text-secondary hover:bg-elevated hover:text-paper"
              }`}
            >
              <span className="truncate">{o}</span>
              {active && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── popover toolbar ─────────────────────────────────────────

type Bag = {
  genre: string; format: string; status: string; length: string; rating: string;
  set: (key: FKey, v: string) => void;
  reset: () => void;
  activeCount: number;
  poolLength: number;
};

function ToolbarFilters({ f }: { f: Bag }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups: Group[] = [
    { key: "genre", label: "Genre", value: f.genre, base: "All", options: ["All", ...ALL_GENRES], searchable: true, columns: 2 },
    { key: "format", label: "Format", value: f.format, base: "All", options: ["All", ...ALL_FORMATS], columns: 1 },
    { key: "length", label: "Length", value: f.length, base: "Any", options: LENGTHS, columns: 1 },
    { key: "status", label: "Status", value: f.status, base: "All", options: STATUSES, columns: 1 },
    { key: "rating", label: "Comfort", value: f.rating, base: "All", options: RATINGS, columns: 1 },
  ];

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />}
      {groups.map((g) => {
        const active = g.value !== g.base;
        return (
          <div key={g.key} className="relative z-20">
            <button
              onClick={() => setOpen(open === g.key ? null : g.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] transition-colors ${
                active ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border bg-surface text-text-secondary hover:text-paper"
              }`}
            >
              <span className="text-text-ghost">{g.label}</span>
              <span className={active ? "text-amber" : "text-paper"}>{active ? g.value : g.base}</span>
              <Caret open={open === g.key} />
            </button>
            <AnimatePresence>
              {open === g.key && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute left-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border bg-surface p-2 shadow-2xl ${g.columns === 2 ? "w-72" : "w-48"}`}
                >
                  <OptionList
                    value={g.value}
                    options={g.options}
                    searchable={g.searchable}
                    columns={g.columns}
                    onPick={(v) => { f.set(g.key, v); setOpen(null); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {f.activeCount > 0 && (
        <button onClick={f.reset} className="ml-1 text-[12px] text-text-ghost transition-colors hover:text-amber">Reset</button>
      )}
      <span className="ml-auto text-[12px] text-text-secondary"><span className="text-paper">{f.poolLength}</span> {f.poolLength === 1 ? "story" : "stories"}</span>
    </div>
  );
}

// ── the dealt card ──────────────────────────────────────────

function PickCard({ story, note, dir }: { story: MockStory; note: string; dir: number }) {
  return (
    <motion.div
      key={story.id}
      initial={{ opacity: 0, x: dir * 70, rotate: dir * 3 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: dir * -110, rotate: dir * -4, scale: 0.95 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid w-full gap-8 md:grid-cols-[280px_1fr] md:gap-11"
    >
      <div className="justify-self-center">
        <div className="relative w-[244px]">
          <div className="relative overflow-hidden rounded-r-md rounded-l-sm border border-amber/20 shadow-[0_30px_60px_-18px_rgba(0,0,0,0.9)]">
            <div className="absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/55 to-transparent" />
            <div className="aspect-[2/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.cover} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-void/40 to-transparent" />
          </div>
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-amber/10 blur-3xl" />
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="font-display text-[13px] italic text-amber/80">{note}</p>
        <h2 className="mt-2 font-display text-[32px] leading-[1.03] text-paper sm:text-[42px]">{story.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
          <span className="text-paper/80">{story.author}</span><span className="text-text-ghost">·</span>
          <span>{story.genre}</span><span className="text-text-ghost">·</span>
          <span>{story.format}</span><span className="text-text-ghost">·</span>
          <span>{story.readTime}</span><span className="text-text-ghost">·</span><Spark n={story.sparks} />
        </div>

        <div className="relative mt-6 max-w-lg border-l-2 border-amber/30 pl-5">
          <span className="absolute -left-3 -top-3 font-display text-[40px] leading-none text-amber/25">“</span>
          <p className="novel-reader whitespace-pre-line text-[16px] leading-[1.85] text-text">{story.opening}</p>
        </div>

        <div className="mt-8">
          <Link href="#" className="rounded-full bg-paper px-6 py-3 text-[13px] font-medium text-void transition-transform hover:translate-x-0.5">
            Start reading
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── page ────────────────────────────────────────────────────

export default function TonightsPageMockup() {
  const [genre, setGenre] = useState("All");
  const [format, setFormat] = useState("All");
  const [status, setStatus] = useState("All");
  const [length, setLength] = useState("Any");
  const [rating, setRating] = useState("All");
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const pool = useMemo(() => STORIES.filter((s) => {
    if (genre !== "All" && s.genre !== genre) return false;
    if (format !== "All" && s.format !== format) return false;
    if (status !== "All" && s.status !== status) return false;
    if (rating !== "All" && (RATING_LEVEL[s.rating] ?? 0) > (RATING_LEVEL[rating] ?? 0)) return false;
    if (length !== "Any") {
      const m = parseMinutes(s.readTime);
      if (length === "Short" && m >= 120) return false;
      if (length === "Medium" && (m < 120 || m >= 180)) return false;
      if (length === "Long" && m < 180) return false;
    }
    return true;
  }), [genre, format, status, length, rating]);

  // changing a filter re-deals from the top of the new pool
  const set = useCallback((key: FKey, v: string) => {
    if (key === "genre") setGenre(v);
    else if (key === "format") setFormat(v);
    else if (key === "status") setStatus(v);
    else if (key === "length") setLength(v);
    else if (key === "rating") setRating(v);
    setIndex(0);
    setDir(1);
  }, []);

  const reset = useCallback(() => {
    setGenre("All"); setFormat("All"); setStatus("All"); setLength("Any"); setRating("All");
    setIndex(0); setDir(1);
  }, []);

  const next = useCallback(() => {
    setDir(1);
    setIndex((i) => (pool.length ? (i + 1) % pool.length : 0));
  }, [pool.length]);
  const prev = useCallback(() => {
    setDir(-1);
    setIndex((i) => (pool.length ? (i - 1 + pool.length) % pool.length : 0));
  }, [pool.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const activeCount = (genre !== "All" ? 1 : 0) + (format !== "All" ? 1 : 0) + (status !== "All" ? 1 : 0) + (length !== "Any" ? 1 : 0) + (rating !== "All" ? 1 : 0);

  const f: Bag = { genre, format, status, length, rating, set, reset, activeCount, poolLength: pool.length };

  const safeIndex = pool.length ? index % pool.length : 0;
  const story = pool[safeIndex];
  const note = LIBRARIAN_NOTES[safeIndex % LIBRARIAN_NOTES.length];

  return (
    <main className="min-h-screen bg-void text-text">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(212,168,67,0.10),transparent_65%)]" />

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        {/* header */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] text-text-ghost">
            <span className="h-px w-8 bg-amber/40" />
            Set aside for you · tonight
          </div>
          {pool.length > 0 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {pool.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === safeIndex % Math.min(pool.length, 6) ? "w-6 bg-amber" : "w-2 bg-paper/15"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* popover toolbar */}
        <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3.5">
          <ToolbarFilters f={f} />
        </div>

        {/* ── the ritual stage ── */}
        <section className="flex min-h-[68vh] flex-col justify-center py-10">
          <div className="min-h-[440px]">
            {story ? (
              <AnimatePresence mode="wait">
                <PickCard key={story.id} story={story} note={note} dir={dir} />
              </AnimatePresence>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                <p className="font-display text-[22px] text-paper">No story fits that exactly.</p>
                <p className="mt-2 max-w-sm text-[13px] text-text-secondary">
                  The shelves came up empty for this combination. Loosen a filter and the librarian will find you something.
                </p>
                <button onClick={reset} className="mt-6 rounded-full border border-amber/30 bg-amber/[0.06] px-5 py-2.5 text-[13px] text-amber hover:text-paper">
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {pool.length > 1 && (
            <>
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  onClick={prev}
                  className="grid h-11 w-11 place-items-center rounded-full border border-border text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                  aria-label="Previous"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: "rotate(180deg)" }}>
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-6 py-3 text-[13px] text-text-secondary transition-colors hover:border-amber/30 hover:text-paper"
                >
                  Not tonight — deal another
                  <motion.svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" whileTap={{ rotate: 360 }} transition={{ duration: 0.4 }}>
                    <path d="M13 8a5 5 0 11-1.5-3.5M13 2v3h-3" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                </button>
              </div>
              <p className="mt-4 text-center text-[11px] text-text-ghost">
                <kbd className="rounded border border-border px-1.5 py-0.5">←</kbd> <kbd className="rounded border border-border px-1.5 py-0.5">→</kbd> or <kbd className="rounded border border-border px-1.5 py-0.5">space</kbd> to flip through tonight&apos;s picks
              </p>
            </>
          )}
        </section>

        {/* ── the matching stacks ── */}
        {pool.length > 0 && (
          <section className="border-t border-border pt-12">
            <div className="mb-7">
              <h2 className="font-display text-[24px] text-paper">
                {activeCount > 0 ? "The matching stacks" : "Or wander the full stacks"}
              </h2>
              <p className="mt-1 text-[13px] text-text-secondary">
                {activeCount > 0
                  ? `${pool.length} ${pool.length === 1 ? "story" : "stories"} match your filters — choose for yourself.`
                  : "When you'd rather choose for yourself."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {pool.map((s, i) => (
                <Link
                  key={s.id}
                  href="#"
                  className="group"
                  onClick={(e) => { e.preventDefault(); setDir(1); setIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border transition-all group-hover:border-amber/30 group-hover:shadow-[0_0_28px_-8px_rgba(212,168,67,0.4)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.cover} alt="" className="h-full w-full object-cover brightness-90 transition-all duration-500 group-hover:brightness-100 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-void/90 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="font-display text-[13px] leading-tight text-paper line-clamp-2">{s.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-paper/55">{s.author}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
