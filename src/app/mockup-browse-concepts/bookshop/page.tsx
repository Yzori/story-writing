"use client";

// THE LAMPLIGHT BOOKSHOP — browse concept 05
// A warm little indie bookshop, open late. Familiar bookshop browsing —
// a front-window display, tables of new stock, shelves by mood, handwritten
// staff-pick cards — so it's instantly usable, with the cozy dressed on top:
// string lights, rain on the window, a cat asleep on the last shelf.

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { byId, type MockStory } from "../_data";

const PAPER_BG = "#F6EFE0"; // physical paper stays paper in every theme
const PAPER_INK = "#43382B";

const FORMATS = ["Novel", "Serial", "Poetry", "Script", "Webtoon", "Illustrated", "Adventure"] as const;
const RATINGS = ["All Ages", "Teen+", "Mature"] as const;

const SHELVES: { name: string; note: string; ids: number[]; talker?: number }[] = [
  { name: "Fantasy & Far Places", note: "Worlds with their own weather, their own gods.", ids: [1, 4, 9], talker: 1 },
  { name: "Crime, Dread & Midnight", note: "Lock the door first.", ids: [3, 10, 12], talker: 10 },
  { name: "Tomorrow & the Stars", note: "Futures bright enough to burn.", ids: [2, 5, 11], talker: 11 },
  { name: "Love & the Everyday", note: "Quiet rooms, real ache, ordinary magic.", ids: [6, 7, 8], talker: 6 },
];

const TABLE_NEW = { title: "New on the table", note: "Unpacked this week — some still being written.", ids: [3, 11, 9, 7, 5], talker: 3 };
const TABLE_ASKED = { title: "Everyone’s been asking for", note: "The ones readers spark the most.", ids: [6, 11, 1, 7, 4], talker: 6 };

const WINDOW_FEATURED = 4; // Salt & Ruin
const WINDOW_COMPANIONS = [6, 11];

/* ---------- little pieces ---------- */

function StaffCard({ story, className = "" }: { story: MockStory; className?: string }) {
  return (
    <div className={`relative w-[156px] shrink-0 -rotate-2 ${className}`}>
      <div
        className="absolute -top-2 left-1/2 h-3.5 w-10 -translate-x-1/2 rotate-2 rounded-[1px] opacity-70"
        style={{ background: "rgba(243,236,221,0.28)" }}
      />
      <div className="rounded-[3px] p-3 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.55)]" style={{ background: PAPER_BG, color: PAPER_INK }}>
        <p className="text-[8.5px] font-medium uppercase tracking-[0.16em] opacity-60">✦ Staff pick</p>
        <p className="mt-1 font-display text-[11.5px] italic leading-snug">{story.hook}</p>
        <p className="mt-1.5 text-right text-[9px] opacity-60">— the booksellers</p>
      </div>
    </div>
  );
}

function BookCover({
  story,
  onPick,
  tilt = 0,
  width = 124,
}: {
  story: MockStory;
  onPick: (id: number) => void;
  tilt?: number;
  width?: number;
}) {
  return (
    <motion.button
      onClick={() => onPick(story.id)}
      initial={false}
      whileHover={{ y: -8, rotate: 0 }}
      style={{ rotate: tilt, width }}
      className="group relative shrink-0 text-left"
    >
      <div className="relative overflow-hidden rounded-r-md rounded-l-[3px] border border-border shadow-[0_14px_28px_-10px_rgba(0,0,0,0.65)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.cover} alt="" className="aspect-[2/3] w-full object-cover" />
        {/* spine shadow + page gloss */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/[0.07]" />
        {story.status === "New" && (
          <span className="absolute -right-1.5 top-2 rotate-3 rounded-l-md bg-amber px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-void shadow">
            New
          </span>
        )}
        {story.status === "Ongoing" && (
          <span className="absolute bottom-0 inset-x-0 flex items-center gap-1 bg-void/70 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-amber backdrop-blur-sm">
            <motion.span
              className="h-1 w-1 rounded-full bg-amber"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            still being written
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-[11.5px] text-text transition-colors group-hover:text-amber">{story.title}</p>
      <p className="truncate text-[9.5px] text-text-ghost">
        {story.author} · ✦ {story.sparks}
      </p>
    </motion.button>
  );
}

function Plank() {
  return (
    <div
      className="relative mt-3 h-2.5 rounded-[2px]"
      style={{
        background: "linear-gradient(180deg, rgba(128,89,58,0.85), rgba(70,47,30,0.95))",
        boxShadow: "0 14px 26px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(243,236,221,0.12)",
      }}
    />
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
    >
      {/* curled body */}
      <ellipse cx="34" cy="24" rx="24" ry="10" />
      {/* head */}
      <circle cx="53" cy="19" r="8.5" />
      {/* ears */}
      <path d="M47 13 l2.4 -5 l3.4 3.4 Z M59 13 l-2.4 -5 l-3.4 3.4 Z" />
      {/* tail wrapped around */}
      <path d="M12 26 q -7 -1 -4 -8 q 1.6 -3.6 6 -3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* closed eye */}
      <path d="M50 19 q 1.6 1.4 3.2 0" fill="none" stroke="rgba(16,13,10,0.8)" strokeWidth="1.1" strokeLinecap="round" />
    </motion.svg>
  );
}

function StringLights() {
  const bulbs = [
    { x: 80, y: 21 }, { x: 205, y: 30 }, { x: 330, y: 34 }, { x: 455, y: 27 },
    { x: 580, y: 18 }, { x: 705, y: 23 }, { x: 830, y: 29 }, { x: 955, y: 26 }, { x: 1085, y: 17 },
  ];
  return (
    <svg viewBox="0 0 1200 52" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      <path d="M-10 10 Q 300 46 600 16 T 1210 12" stroke="rgba(243,236,221,0.16)" strokeWidth="1" fill="none" />
      {bulbs.map((b, i) => (
        <g key={i}>
          <motion.circle
            cx={b.x}
            cy={b.y + 6}
            r="7"
            fill="rgba(212,168,67,0.22)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.4 + (i % 4) * 0.7, ease: "easeInOut", delay: i * 0.3 }}
          />
          <circle cx={b.x} cy={b.y + 6} r="2.4" fill="rgba(228,191,98,0.95)" />
          <line x1={b.x} y1={b.y} x2={b.x} y2={b.y + 4} stroke="rgba(243,236,221,0.25)" strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  );
}

function Row({
  data,
  visible,
  onPick,
}: {
  data: { title: string; note: string; ids: number[]; talker?: number };
  visible: Set<number>;
  onPick: (id: number) => void;
}) {
  const ids = data.ids.filter((id) => visible.has(id));
  return (
    <section className="mt-14">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[22px] text-paper">{data.title}</h2>
        <p className="hidden text-[12px] italic text-text-ghost sm:block">{data.note}</p>
      </div>
      {ids.length === 0 ? (
        <p className="mt-5 text-[12.5px] italic text-text-ghost">
          This table’s been picked clean — try loosening a tag, or ask the bookseller for something else.
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-end gap-5 overflow-x-auto pb-1 pt-2">
            {ids.map((id, i) => (
              <div key={id} className="flex shrink-0 items-end gap-5">
                <BookCover story={byId(id)} onPick={onPick} tilt={i % 3 === 1 ? 1.5 : i % 3 === 2 ? -1.5 : 0} />
                {data.talker === id && <StaffCard story={byId(id)} className="mb-9" />}
              </div>
            ))}
          </div>
          <Plank />
        </>
      )}
    </section>
  );
}

/* ---------- page ---------- */

export default function LamplightBookshop() {
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
    for (const shelf of SHELVES) for (const id of shelf.ids) if (ok(byId(id))) set.add(id);
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
  const pickedShelf = pickedId ? SHELVES.find((s) => s.ids.includes(pickedId)) : null;

  const featured = byId(WINDOW_FEATURED);
  const featuredVisible = visible.has(WINDOW_FEATURED);

  return (
    <main className="min-h-screen bg-void pb-24 text-text">
      {/* warm lamp glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_50%_-12%,rgba(212,168,67,0.13),transparent_65%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* string lights */}
        <div className="pt-16">
          <StringLights />
        </div>

        {/* shop sign */}
        <header className="mt-4 text-center">
          <Link href="/mockup-browse-concepts" className="text-[11px] text-text-ghost transition-colors hover:text-amber">
            ← All concepts
          </Link>
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-text-ghost">est. wherever stories live</p>
          <h1 className="mt-2 font-display text-[40px] leading-none text-paper sm:text-[52px]">The Lamplight Bookshop</h1>
          <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-text-secondary">
            Every book in this shop is being written by someone real, somewhere, possibly right now.
            Come in — it’s raining out, and the kettle’s on.
          </p>
        </header>

        {/* the counter: bookseller + tags */}
        <div className="sticky top-16 z-30 mt-10 -mx-4 border-y border-border bg-void/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-border bg-elevated px-3.5 py-2 transition-colors focus-within:border-amber/30 sm:max-w-[280px] sm:flex-none">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="shrink-0 text-text-ghost">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask the bookseller…"
                className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-ghost"
              />
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f, i) => (
                <button
                  key={f}
                  onClick={() => toggleFormat(f)}
                  className={`relative rounded-[4px] py-1 pl-4 pr-2.5 text-[10.5px] transition-all ${
                    formats.has(f) ? "bg-amber/15 text-amber" : "bg-elevated text-text-ghost hover:text-text-secondary"
                  } ${i % 2 === 0 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
                  style={{ clipPath: "polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%)" }}
                >
                  <span className="absolute left-[6px] top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-void/80" />
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
                    ratings.has(r)
                      ? "border-amber/40 text-amber"
                      : "border-border text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {q && visible.size === 0 && (
            <p className="mt-2 text-[12px] italic text-text-ghost">
              Hm — nothing on the shelves under “{query}”. We restock nightly; try “fantasy”, or a different word for it.
            </p>
          )}
        </div>

        {/* THE FRONT WINDOW */}
        <section className="relative mt-12 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-ink to-void">
          {/* rain on the glass */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={4 + i * 7.2} y1="-5" x2={1 + i * 7.2} y2="105" stroke="#F3ECDD" strokeWidth="0.35" />
            ))}
          </svg>
          {/* OPEN sign */}
          <div className="absolute right-5 top-0 hidden sm:block">
            <div className="mx-auto h-4 w-px bg-border" />
            <div className="-rotate-2 rounded-md border border-amber/30 bg-void/60 px-3 py-1.5 shadow-[0_0_24px_rgba(212,168,67,0.25)]">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-amber">Open ’til late</p>
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-ghost">In the window this week</p>

            {featuredVisible ? (
              <div className="mt-6 flex flex-col items-start gap-8 md:flex-row md:items-end">
                {/* featured book */}
                <div className="relative flex items-end gap-5">
                  <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(212,168,67,0.16),transparent_70%)]" />
                  <BookCover story={featured} onPick={setPickedId} width={172} tilt={-1} />
                  <StaffCard story={featured} className="mb-10 hidden sm:block" />
                </div>
                {/* companions + blurb */}
                <div className="flex-1">
                  <h2 className="font-display text-[28px] leading-tight text-paper">{featured.title}</h2>
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    by {featured.author} · {featured.format} · {featured.readTime}
                  </p>
                  <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-text">{featured.hook}</p>
                  <button
                    onClick={() => setPickedId(featured.id)}
                    className="mt-5 rounded-full bg-amber px-5 py-2.5 text-[13px] font-medium text-void transition-all hover:brightness-110"
                  >
                    Pick it up
                  </button>
                  <div className="mt-8 flex items-end gap-5">
                    <p className="mb-8 hidden text-[10px] uppercase tracking-[0.18em] text-text-ghost sm:block">also in the window —</p>
                    {WINDOW_COMPANIONS.filter((id) => visible.has(id)).map((id) => (
                      <BookCover key={id} story={byId(id)} onPick={setPickedId} width={104} tilt={id % 2 ? 1.5 : -1.5} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-[13px] italic text-text-ghost">The window’s being redressed — your filters hid this week’s display.</p>
            )}
          </div>
          <Plank />
        </section>

        {/* tables */}
        <Row data={TABLE_NEW} visible={visible} onPick={setPickedId} />
        <Row data={TABLE_ASKED} visible={visible} onPick={setPickedId} />

        {/* shelves */}
        <div className="mt-20">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-[26px] text-paper">The shelves</h2>
            <p className="text-[12px] italic text-text-ghost">arranged by feeling, not by the alphabet.</p>
          </div>

          {SHELVES.map((shelf, si) => {
            const ids = shelf.ids.filter((id) => visible.has(id));
            return (
              <section key={shelf.name} className="relative mt-10">
                <div className="flex items-baseline gap-3">
                  <span
                    className="rounded-[2px] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ background: PAPER_BG, color: PAPER_INK }}
                  >
                    {shelf.name}
                  </span>
                  <p className="hidden text-[11.5px] italic text-text-ghost sm:block">{shelf.note}</p>
                </div>
                {ids.length === 0 ? (
                  <p className="mt-4 text-[12px] italic text-text-ghost">Nothing here matches — the booksellers are rearranging.</p>
                ) : (
                  <>
                    <div className="mt-4 flex items-end gap-5 overflow-x-auto pb-1 pt-2">
                      {ids.map((id, i) => (
                        <div key={id} className="flex shrink-0 items-end gap-5">
                          <BookCover story={byId(id)} onPick={setPickedId} tilt={i % 2 ? -1.2 : 1.2} />
                          {shelf.talker === id && <StaffCard story={byId(id)} className="mb-9" />}
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      {si === SHELVES.length - 1 && <SleepingCat />}
                      <Plank />
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>

        {/* shop door */}
        <footer className="mt-20 text-center">
          <p className="font-display text-[15px] italic text-text-secondary">The shop restocks nightly. Leave the lamp on.</p>
          <p className="mt-2 text-[11px] text-text-ghost">
            Written something yourself? <span className="cursor-pointer text-amber hover:underline">There’s a spot in the window for it.</span>
          </p>
        </footer>
      </div>

      {/* PICKED UP — the book in your hands */}
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
                      {pickedShelf && (
                        <p className="text-[9px] uppercase tracking-[0.18em] text-text-ghost">from the {pickedShelf.name} shelf</p>
                      )}
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

                  {/* first page, on paper */}
                  <div className="relative mt-4 -rotate-[0.6deg] rounded-[3px] p-3.5 shadow" style={{ background: PAPER_BG, color: PAPER_INK }}>
                    <p className="text-[8.5px] uppercase tracking-[0.16em] opacity-50">the first page —</p>
                    <p className="font-reading mt-1.5 text-[13px] leading-relaxed">{picked.opening}</p>
                  </div>

                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                    {picked.format} · {picked.chapters} ch · {picked.readTime} · {picked.rating} ·{" "}
                    <span className="text-amber">✦ {picked.sparks}</span>
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button className="flex-1 rounded-full bg-amber py-2.5 text-[13px] font-medium text-void transition-all hover:brightness-110">
                      Keep reading
                    </button>
                    <button
                      onClick={() => setPickedId(null)}
                      className="rounded-full border border-border px-4 py-2.5 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                    >
                      Back on the shelf
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
