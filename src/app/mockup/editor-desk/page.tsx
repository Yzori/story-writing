"use client";

/**
 * MOCKUP — "The Desk" editor layout concept.
 *
 * Two views, one camera move:
 *   – Writing: a bare page. No rails. Chapter ticks live in the left
 *     margin like a thumb-index; comments sit in the right margin as
 *     marginalia. The only resident chrome is the status pill.
 *   – The Desk: zoom out (⌘E or the breadcrumb) and the page shrinks
 *     into its place among the other chapters, laid out as sheets on
 *     the desk. Outline, story bible and publish live here as objects.
 *
 * The desk is always mounted; the writing page is an overlay sharing a
 * layoutId with its chapter card, so the page physically shrinks into
 * its place on the desk (and grows back out of it) — the card-expand
 * pattern, run in reverse.
 *
 * Throwaway prototype — fake data, no persistence.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

type Chapter = {
  id: string;
  n: number;
  title: string;
  words: number;
  status: "published" | "draft";
  paras: string[];
};

const STORY = {
  title: "The Cartographer of Drowned Cities",
  genre: "Fantasy",
};

const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    n: 1,
    title: "The Salt Archive",
    words: 2480,
    status: "published",
    paras: [
      "The archive smelled of kelp and old candle smoke, and Maren had learned to read its moods the way sailors read the sky.",
      "She unrolled the last chart across the table and weighted its corners with whatever the sea had given up that morning. The drowned city was there, of course — it was always there — but tonight its streets had moved again, the ink rearranging itself the way it did when somebody, somewhere below, was still alive enough to dream. She dipped her pen, and the water in the inkwell went dark.",
      "Below the surface, the bells were ringing again. Maren counted the peals against her pulse — seven, then a pause, then seven more. Someone was mapping back.",
    ],
  },
  {
    id: "c2",
    n: 2,
    title: "Seven Bells Below",
    words: 3105,
    status: "published",
    paras: [
      "The diving bell had a name, because everything that keeps you alive at depth earns one. Hers was called Forgiveness, and Maren had never asked why.",
      "Forty fathoms down, the city's light began — not sunlight, which had given up long ago, but the slow green burning of streets that refused to believe they were drowned. Lanterns still hung from their hooks. Somebody was still trimming the wicks.",
    ],
  },
  {
    id: "c3",
    n: 3,
    title: "The Ink That Remembers",
    words: 2871,
    status: "draft",
    paras: [
      "Every cartographer is taught the first rule on their first day: the map is not the territory. Nobody had told the ink.",
      "It remembered the city as it had been — markets, bell towers, the avenue of fig trees — and it fought her corrections the way a body fights a fever. By midnight her hands were stained to the wrist, and the chart showed a street she had never drawn.",
    ],
  },
  {
    id: "c4",
    n: 4,
    title: "Charts for the Living",
    words: 956,
    status: "draft",
    paras: [
      "Maren had drawn maps for the dead all her life. It had not occurred to her, until the boy knocked, that the drowned might want one for getting out.",
    ],
  },
];

// Marginalia: chapterId → paragraph index → note
const COMMENTS: Record<string, Record<number, { who: string; note: string }>> = {
  c1: {
    1: {
      who: "Tess — editor",
      note: "Does the ink moving read as magic or madness here? Worth one more beat of doubt from Maren.",
    },
  },
  c3: {
    1: {
      who: "Tess — editor",
      note: "Love this. Name the street — we can pay it off in ch. 7.",
    },
  },
};

const sheetSpring = { type: "spring" as const, stiffness: 300, damping: 34 };

export default function EditorDeskMockup() {
  const [view, setView] = useState<"write" | "desk">("write");
  const [activeId, setActiveId] = useState(CHAPTERS[0].id);
  const active = CHAPTERS.find((c) => c.id === activeId) ?? CHAPTERS[0];
  const totalWords = CHAPTERS.reduce((sum, c) => sum + c.words, 0);
  const writing = view === "write";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setView((v) => (v === "write" ? "desk" : "write"));
      }
      if (e.key === "Escape") setView("write");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* lamp glow — the desk's light source, present in both views */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[130px]"
        aria-hidden
      />

      <LayoutGroup>
        {/* ── the desk — always mounted, dims while writing ── */}
        <motion.div
          initial={false}
          animate={{ opacity: writing ? 0 : 1 }}
          transition={writing ? { duration: 0.25 } : { duration: 0.4, delay: 0.05 }}
          className={`relative z-10 flex min-h-screen flex-col items-center px-6 pb-28 pt-16 ${
            writing ? "pointer-events-none" : ""
          }`}
          aria-hidden={writing}
        >
          <header className="mb-10 text-center">
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-text-ghost">
              Your desk
            </p>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-paper">
              {STORY.title}
            </h1>
            <p className="mt-2 font-mono text-[11px] text-text-ghost">
              {CHAPTERS.length} chapters · {totalWords.toLocaleString()} words ·{" "}
              {STORY.genre}
            </p>
          </header>

          {/* the chapters, laid out as sheets */}
          <div className="flex flex-wrap items-stretch justify-center gap-5">
            {CHAPTERS.map((c) => (
              <motion.button
                key={c.id}
                type="button"
                layoutId={`sheet-${c.id}`}
                transition={sheetSpring}
                onClick={() => {
                  setActiveId(c.id);
                  setView("write");
                }}
                whileHover={{ y: -6, rotate: c.n % 2 ? -0.6 : 0.6 }}
                className={`group flex w-44 flex-col rounded-2xl border bg-ink p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-colors ${
                  c.id === activeId
                    ? "border-amber/30"
                    : "border-border hover:border-border-active"
                }`}
              >
                <span className="mb-2 font-mono text-[10px] text-text-ghost">
                  {String(c.n).padStart(2, "0")}
                </span>
                <span className="mb-2.5 font-display text-[15px] font-semibold leading-snug text-paper">
                  {c.title}
                </span>
                <span className="mb-4 line-clamp-4 font-reading text-[10px] leading-[1.7] text-text-ghost">
                  {c.paras[0]}
                </span>
                <span className="mt-auto flex items-center gap-2 font-mono text-[10px] text-text-secondary">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      c.status === "published" ? "bg-sage" : "bg-amber/70"
                    }`}
                    aria-hidden
                  />
                  {c.words.toLocaleString()}
                  <span className="text-text-ghost">·</span>
                  <span
                    className={c.status === "published" ? "text-sage" : "text-amber/80"}
                  >
                    {c.status}
                  </span>
                </span>
              </motion.button>
            ))}

            {/* a fresh sheet */}
            <button
              type="button"
              className="flex w-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-text-ghost transition-colors hover:-translate-y-1.5 hover:border-amber/30 hover:text-amber"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14 M5 12h14" />
              </svg>
              <span className="text-[12px]">New chapter</span>
            </button>
          </div>

          {/* the other things on the desk */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {DESK_OBJECTS.map((o) => (
              <button
                key={o.id}
                type="button"
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-amber/25 hover:bg-amber/[0.04]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-ghost transition-colors group-hover:text-amber"
                  aria-hidden
                >
                  <path d={o.icon} />
                </svg>
                <span className="text-left">
                  <span className="block text-[13px] text-paper">{o.label}</span>
                  <span className="block text-[11px] text-text-ghost">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── the page — an overlay that grows out of its card ── */}
        <AnimatePresence initial={false}>
          {writing && (
            <motion.div
              key={`page-${active.id}`}
              className="fixed inset-0 z-20 overflow-y-auto"
              exit={{ opacity: 1 }}
            >
              {/* thumb-index: chapter ticks in the far left margin */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
              >
                {CHAPTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className="group relative flex h-4 items-center"
                    aria-label={`Chapter ${c.n}: ${c.title}`}
                  >
                    <span
                      className={`block h-[2px] rounded-full transition-all ${
                        c.id === active.id
                          ? "w-6 bg-amber"
                          : "w-3.5 bg-text-ghost/40 group-hover:w-5 group-hover:bg-text-secondary"
                      }`}
                    />
                    <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-elevated px-2.5 py-1 text-[11px] text-text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      <span className="mr-1.5 font-mono text-[10px] text-text-ghost">
                        {String(c.n).padStart(2, "0")}
                      </span>
                      {c.title}
                    </span>
                  </button>
                ))}
              </motion.div>

              <div className="flex min-h-full flex-col items-center px-6 pb-28 pt-14">
                <motion.article
                  layoutId={`sheet-${active.id}`}
                  transition={sheetSpring}
                  className="relative w-full max-w-[720px] rounded-2xl border border-border bg-ink px-10 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:px-16 md:py-14"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    {/* breadcrumb — clicking it is the zoom-out gesture */}
                    <button
                      type="button"
                      onClick={() => setView("desk")}
                      className="group mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-amber/80 transition-colors hover:text-amber"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      >
                        <path d="M19 12H5 M11 18l-6-6 6-6" />
                      </svg>
                      {STORY.title}
                      <span className="text-text-ghost normal-case tracking-normal">
                        · chapter {active.n}
                      </span>
                    </button>

                    <h1 className="mb-8 font-display text-[34px] font-semibold leading-tight text-paper">
                      {active.title}
                    </h1>

                    <div className="space-y-6">
                      {active.paras.map((p, i) => {
                        const note = COMMENTS[active.id]?.[i];
                        return (
                          <div key={i} className="relative">
                            <p className="font-reading text-[17px] leading-[1.85] text-text">
                              {p}
                            </p>
                            {/* marginalia — a note pinned beside its line */}
                            {note && (
                              <div className="group absolute -right-7 top-1.5 md:-right-12">
                                <button
                                  type="button"
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-amber/30 bg-amber/10 transition-colors hover:bg-amber/20"
                                  aria-label="Margin note"
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-amber"
                                    aria-hidden
                                  />
                                </button>
                                <div className="pointer-events-none absolute right-0 top-7 z-30 w-60 rounded-xl border border-border bg-elevated p-3.5 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                                    {note.who}
                                  </p>
                                  <p className="text-[12px] leading-relaxed text-text-secondary">
                                    {note.note}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-10 font-mono text-[11px] text-text-ghost">
                      {active.words.toLocaleString()} words · {active.status}
                    </p>
                  </motion.div>
                </motion.article>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* status pill — the one piece of chrome that never leaves */}
      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-border bg-ink/85 px-4 py-2 shadow-[0_10px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden />
            00:12
          </span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span className="font-mono text-[11px] text-text-secondary">
            412 <span className="text-text-ghost">words tonight</span>
          </span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span className="text-[11px] text-text-ghost">Saved</span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-ghost">
              ⌘E
            </kbd>
            {writing ? "the desk" : "back to the page"}
          </span>
        </div>
      </div>
    </div>
  );
}

const DESK_OBJECTS = [
  {
    id: "outline",
    label: "Outline",
    hint: "the shape of the whole",
    icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  },
  {
    id: "bible",
    label: "Story Bible",
    hint: "names, places, rules",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  },
  {
    id: "publish",
    label: "Publish",
    hint: "send chapters into the world",
    icon: "M12 19V5 M5 12l7-7 7 7",
  },
];
