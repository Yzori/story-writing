"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORIES, type MockStory } from "../_data";

// ── Filter-style lab ────────────────────────────────────────
// The same Tonight's Page deck, with four different ways to apply filters.
// Flip between them with the switcher up top and see which feels right.

type Treatment = "toolbar" | "drawer" | "accordion" | "chips";

const TREATMENTS: { key: Treatment; label: string; blurb: string }[] = [
  { key: "toolbar", label: "Popover toolbar", blurb: "A slim row of filter buttons; each opens a small popover. Compact, modern, almost no vertical footprint." },
  { key: "drawer", label: "Refine drawer", blurb: "One button opens a slide-over with everything. The page stays clean and centred on the ritual." },
  { key: "accordion", label: "Compact rail", blurb: "A left rail, but each category collapses to its current value — genres no longer dominate." },
  { key: "chips", label: "Smart chips", blurb: "A single wrapping line of dropdown chips. Picks become removable tokens. Playful and tiny." },
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
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
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

// ── filter state hook (shared across all treatments) ────────

type FilterState = {
  genre: string; format: string; status: string; length: string; rating: string;
  set: (key: FKey, v: string) => void;
  reset: () => void;
  activeCount: number;
  pool: MockStory[];
};

function useFilters(): FilterState {
  const [genre, setGenre] = useState("All");
  const [format, setFormat] = useState("All");
  const [status, setStatus] = useState("All");
  const [length, setLength] = useState("Any");
  const [rating, setRating] = useState("All");

  const set = useCallback((key: FKey, v: string) => {
    if (key === "genre") setGenre(v);
    else if (key === "format") setFormat(v);
    else if (key === "status") setStatus(v);
    else if (key === "length") setLength(v);
    else if (key === "rating") setRating(v);
  }, []);

  const reset = useCallback(() => {
    setGenre("All"); setFormat("All"); setStatus("All"); setLength("Any"); setRating("All");
  }, []);

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

  const activeCount = (genre !== "All" ? 1 : 0) + (format !== "All" ? 1 : 0) + (status !== "All" ? 1 : 0) + (length !== "Any" ? 1 : 0) + (rating !== "All" ? 1 : 0);

  return { genre, format, status, length, rating, set, reset, activeCount, pool };
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

// ── Treatment 1: popover toolbar ────────────────────────────

function ToolbarFilters({ f }: { f: FilterState }) {
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
      <span className="ml-auto text-[12px] text-text-secondary"><span className="text-paper">{f.pool.length}</span> stories</span>
    </div>
  );
}

// ── Treatment 2: slide-over drawer ──────────────────────────

function ChipRow({ f, keyName, options, value }: { f: FilterState; keyName: FKey; options: string[]; value: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => f.set(keyName, o)}
          className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
            value === o ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border text-text-secondary hover:text-paper"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function DrawerFilters({ f }: { f: FilterState }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors ${
            f.activeCount > 0 ? "border-amber/40 bg-amber/[0.06] text-amber" : "border-border bg-surface text-text-secondary hover:text-paper"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M2 8h12M2 12h12" /><circle cx="6" cy="4" r="1.3" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r="1.3" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          Refine{f.activeCount > 0 ? ` · ${f.activeCount}` : ""}
        </button>
        <span className="text-[12px] text-text-secondary"><span className="text-paper">{f.pool.length}</span> stories on the shelves</span>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-[18px] text-paper">Refine the shelves</h2>
                <button onClick={() => setOpen(false)} className="text-text-ghost hover:text-paper">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <div><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Genre</p><ChipRow f={f} keyName="genre" value={f.genre} options={["All", ...ALL_GENRES]} /></div>
                <div><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Format</p><ChipRow f={f} keyName="format" value={f.format} options={["All", ...ALL_FORMATS]} /></div>
                <div><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Length</p><ChipRow f={f} keyName="length" value={f.length} options={LENGTHS} /></div>
                <div><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Status</p><ChipRow f={f} keyName="status" value={f.status} options={STATUSES} /></div>
                <div><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Comfort</p><ChipRow f={f} keyName="rating" value={f.rating} options={RATINGS} /></div>
              </div>
              <div className="flex items-center gap-3 border-t border-border px-5 py-4">
                <button onClick={f.reset} className="text-[13px] text-text-secondary hover:text-paper">Reset</button>
                <button onClick={() => setOpen(false)} className="ml-auto rounded-full bg-paper px-5 py-2.5 text-[13px] font-medium text-void">
                  Show {f.pool.length} stories
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Treatment 3: compact accordion rail ─────────────────────

function AccordionRail({ f }: { f: FilterState }) {
  const [open, setOpen] = useState<string | null>("genre");
  const rows: Group[] = [
    { key: "genre", label: "Genre", value: f.genre, base: "All", options: ["All", ...ALL_GENRES], searchable: true },
    { key: "format", label: "Format", value: f.format, base: "All", options: ["All", ...ALL_FORMATS] },
    { key: "length", label: "Length", value: f.length, base: "Any", options: LENGTHS },
    { key: "status", label: "Status", value: f.status, base: "All", options: STATUSES },
    { key: "rating", label: "Comfort", value: f.rating, base: "All", options: RATINGS },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-2.5">
      <div className="flex items-center justify-between px-1.5 pb-2">
        <h2 className="font-display text-[15px] text-paper">Filters</h2>
        {f.activeCount > 0 && <button onClick={f.reset} className="text-[11px] text-amber hover:text-paper">Reset</button>}
      </div>
      <div className="space-y-0.5">
        {rows.map((r) => {
          const active = r.value !== r.base;
          const isOpen = open === r.key;
          return (
            <div key={r.key} className="rounded-lg">
              <button
                onClick={() => setOpen(isOpen ? null : r.key)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-elevated"
              >
                <span className="text-text-ghost">{r.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className={active ? "text-amber" : "text-paper"}>{active ? r.value : r.base}</span>
                  <span className="text-text-ghost"><Caret open={isOpen} /></span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-1.5 pb-2 pt-1">
                      <OptionList value={r.value} options={r.options} searchable={r.searchable} onPick={(v) => f.set(r.key, v)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="px-1.5 pt-2 text-[11px] text-text-secondary"><span className="text-paper">{f.pool.length}</span> stories tonight</p>
    </div>
  );
}

// ── Treatment 4: smart chips ────────────────────────────────

function ChipFilters({ f }: { f: FilterState }) {
  const [open, setOpen] = useState<string | null>(null);
  const dropdowns: Group[] = [
    { key: "genre", label: "Genre", value: f.genre, base: "All", options: ["All", ...ALL_GENRES], searchable: true, columns: 2 },
    { key: "format", label: "Format", value: f.format, base: "All", options: ["All", ...ALL_FORMATS], columns: 1 },
    { key: "length", label: "Length", value: f.length, base: "Any", options: LENGTHS, columns: 1 },
    { key: "status", label: "Status", value: f.status, base: "All", options: STATUSES, columns: 1 },
    { key: "rating", label: "Comfort", value: f.rating, base: "All", options: RATINGS, columns: 1 },
  ];
  const active = dropdowns.filter((d) => d.value !== d.base);

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />}
      {/* active tokens */}
      {active.map((d) => (
        <span key={`tok-${d.key}`} className="inline-flex items-center gap-1.5 rounded-full bg-amber/[0.12] px-3 py-1.5 text-[12px] text-amber">
          {d.value}
          <button onClick={() => f.set(d.key, d.base)} className="text-amber/70 hover:text-amber">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
          </button>
        </span>
      ))}
      {active.length > 0 && <span className="h-4 w-px bg-border" />}

      {/* add-filter dropdown chips (only inactive ones) */}
      {dropdowns.filter((d) => d.value === d.base).map((d) => (
        <div key={d.key} className="relative z-20">
          <button
            onClick={() => setOpen(open === d.key ? null : d.key)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-paper"
          >
            <span className="text-text-ghost">+</span>{d.label}
            <Caret open={open === d.key} />
          </button>
          <AnimatePresence>
            {open === d.key && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                className={`absolute left-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border bg-surface p-2 shadow-2xl ${d.columns === 2 ? "w-72" : "w-44"}`}
              >
                <OptionList value={d.value} options={d.options} searchable={d.searchable} columns={d.columns} onPick={(v) => { f.set(d.key, v); setOpen(null); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {f.activeCount > 0 && <button onClick={f.reset} className="text-[12px] text-text-ghost transition-colors hover:text-amber">Clear all</button>}
      <span className="ml-auto text-[12px] text-text-secondary"><span className="text-paper">{f.pool.length}</span> stories</span>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

function Deck({ pool }: { pool: MockStory[] }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const safe = pool.length ? index % pool.length : 0;
  const story = pool[safe];
  const next = () => { setDir(1); setIndex((i) => (pool.length ? (i + 1) % pool.length : 0)); };
  const prev = () => { setDir(-1); setIndex((i) => (pool.length ? (i - 1 + pool.length) % pool.length : 0)); };

  if (!story) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <p className="font-display text-[20px] text-paper">No story fits that exactly.</p>
        <p className="mt-2 text-[13px] text-text-secondary">Loosen a filter and the librarian will find you something.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={{ opacity: 0, x: dir * 60, rotate: dir * 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: dir * -90, rotate: dir * -3, scale: 0.96 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid gap-8 md:grid-cols-[230px_1fr] md:gap-10"
          >
            <div className="justify-self-center">
              <div className="relative w-[210px] overflow-hidden rounded-r-md rounded-l-sm border border-amber/20 shadow-[0_28px_56px_-18px_rgba(0,0,0,0.9)]">
                <div className="absolute inset-y-0 left-0 z-10 w-3.5 bg-gradient-to-r from-black/55 to-transparent" />
                <div className="aspect-[2/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.cover} alt="" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-display text-[13px] italic text-amber/80">Set aside for you tonight—</p>
              <h2 className="mt-1.5 font-display text-[30px] leading-[1.03] text-paper sm:text-[38px]">{story.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-text-secondary">
                <span className="text-paper/80">{story.author}</span><span className="text-text-ghost">·</span>
                <span>{story.genre}</span><span className="text-text-ghost">·</span>
                <span>{story.format}</span><span className="text-text-ghost">·</span>
                <span>{story.readTime}</span><span className="text-text-ghost">·</span><Spark n={story.sparks} />
              </div>
              <div className="relative mt-5 max-w-lg border-l-2 border-amber/30 pl-5">
                <p className="novel-reader whitespace-pre-line text-[15px] leading-[1.8] text-text line-clamp-4">{story.opening}</p>
              </div>
              <div className="mt-6">
                <Link href="#" className="rounded-full bg-paper px-5 py-2.5 text-[13px] font-medium text-void">Start reading</Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {pool.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={prev} className="grid h-10 w-10 place-items-center rounded-full border border-border text-text-secondary hover:border-amber/30 hover:text-amber">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: "rotate(180deg)" }}><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={next} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-[13px] text-text-secondary hover:border-amber/30 hover:text-paper">
            Not tonight — deal another
          </button>
        </div>
      )}
    </div>
  );
}

// ── page ────────────────────────────────────────────────────

export default function FilterStylesLab() {
  const [treatment, setTreatment] = useState<Treatment>("toolbar");
  const f = useFilters();
  const meta = TREATMENTS.find((t) => t.key === treatment)!;
  // remounting the deck on any filter change re-deals from the top of the new pool
  const deckKey = `${f.genre}|${f.format}|${f.status}|${f.length}|${f.rating}`;

  return (
    <main className="min-h-screen bg-void text-text">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(212,168,67,0.10),transparent_65%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* switcher */}
        <div className="mb-2 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] text-text-ghost">
          <span className="h-px w-8 bg-amber/40" />
          Filter style lab · Tonight&apos;s Page
        </div>
        <h1 className="font-display text-[28px] text-paper sm:text-[34px]">Four ways to filter</h1>
        <p className="mt-1.5 max-w-xl text-[13px] text-text-secondary">Same deck, same filters — different mechanism. Flip between them.</p>

        <div className="mt-5 inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface/60 p-1">
          {TREATMENTS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTreatment(t.key)}
              className={`rounded-full px-4 py-2 text-[12px] transition-all ${
                treatment === t.key ? "bg-amber text-void" : "text-text-secondary hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[12px] italic text-text-secondary">{meta.blurb}</p>

        {/* the filter mechanism + deck */}
        <div className="mt-8">
          {treatment === "accordion" ? (
            <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
              <div className="h-fit lg:sticky lg:top-20"><AccordionRail f={f} /></div>
              <div><Deck key={deckKey} pool={f.pool} /></div>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3.5">
                {treatment === "toolbar" && <ToolbarFilters f={f} />}
                {treatment === "drawer" && <DrawerFilters f={f} />}
                {treatment === "chips" && <ChipFilters f={f} />}
              </div>
              <Deck key={deckKey} pool={f.pool} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
