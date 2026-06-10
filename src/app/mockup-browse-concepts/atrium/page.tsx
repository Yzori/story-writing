"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORIES, MOODS, type Mood, type MockStory } from "../_data";

// ── Mood-first Atrium ───────────────────────────────────────
// Entry is emotion, not metadata. "What do you want to feel tonight?" — pick a
// feeling and the shelves assemble around it. Genre / length / format demote to
// quiet refinements. Built for the thing readers actually have: a mood.

function Spark({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber/85">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
      </svg>
      {n}
    </span>
  );
}

function StoryTile({ story, i }: { story: MockStory; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
    >
      <Link href="#" className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border transition-all duration-300 group-hover:border-amber/35 group-hover:shadow-[0_0_34px_-6px_rgba(212,168,67,0.4)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.cover} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-void/95 via-void/15 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
            <span className="rounded-full border border-white/10 bg-void/55 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-paper/80 backdrop-blur-sm">{story.format}</span>
            {story.sparks > 0 && (
              <span className="rounded-full border border-white/10 bg-void/55 px-2 py-0.5 backdrop-blur-sm"><Spark n={story.sparks} /></span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="mb-1 text-[9px] uppercase tracking-[0.12em] text-paper/55">{story.genre}</p>
            <h3 className="font-display text-[16px] leading-tight text-paper line-clamp-2 group-hover:text-amber-light">{story.title}</h3>
            <p className="mt-0.5 truncate text-[11px] text-paper/60">{story.author}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function AtriumMockup() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [genre, setGenre] = useState("All");
  const [length, setLength] = useState("Any");

  const moodMeta = MOODS.find((m) => m.mood === mood);

  const matched = useMemo(() => {
    if (!mood) return [];
    let pool = STORIES.filter((s) => s.moods.includes(mood));
    if (genre !== "All") pool = pool.filter((s) => s.genre === genre);
    if (length === "Short") pool = pool.filter((s) => !s.readTime.includes("h") || s.readTime.startsWith("1h") || s.readTime.startsWith("2h"));
    if (length === "Long") pool = pool.filter((s) => s.readTime.includes("h") && !s.readTime.startsWith("1h") && !s.readTime.startsWith("40"));
    return pool;
  }, [mood, genre, length]);

  const genresForMood = useMemo(() => {
    if (!mood) return [];
    return ["All", ...Array.from(new Set(STORIES.filter((s) => s.moods.includes(mood)).map((s) => s.genre)))];
  }, [mood]);

  function reset() {
    setMood(null);
    setGenre("All");
    setLength("Any");
  }

  return (
    <main className="min-h-screen bg-void text-text">
      {/* mood-tinted ambient wash */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-1000"
        style={{
          background: moodMeta
            ? `radial-gradient(ellipse at 50% -10%, rgba(${moodMeta.rgb},0.16), transparent 60%)`
            : "radial-gradient(ellipse at 50% -10%, rgba(212,168,67,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {!mood ? (
            // ── The question ──
            <motion.section
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex min-h-screen flex-col justify-center py-20"
            >
              <div className="mb-3 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-text-ghost">
                <span className="h-px w-8 bg-amber/40" />
                The Atrium · Quiloria
              </div>
              <h1 className="max-w-3xl font-display text-[40px] leading-[1.02] text-paper sm:text-[58px]">
                What do you want to <span className="text-amber">feel</span> tonight?
              </h1>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-text-secondary">
                You rarely arrive knowing you want “Urban Fantasy, Teen+, under 20k words.”
                You arrive with a mood. Start there.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MOODS.map((m, i) => (
                  <motion.button
                    key={m.mood}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setMood(m.mood)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 text-left transition-all hover:border-amber/30"
                    style={{ minHeight: 150 }}
                  >
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
                      style={{ background: `rgba(${m.rgb},0.5)` }}
                    />
                    <div className="relative">
                      <h2 className={`font-display text-[24px] leading-tight ${m.accent}`}>{m.mood}</h2>
                      <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{m.tagline}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-text-ghost transition-colors group-hover:text-amber">
                        Open this shelf
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </motion.button>
                ))}
                <Link
                  href="#"
                  className="group flex items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center transition-colors hover:border-amber/30"
                  style={{ minHeight: 150 }}
                >
                  <span className="text-[13px] text-text-secondary group-hover:text-paper">
                    Or just show me<br />everything →
                  </span>
                </Link>
              </div>
            </motion.section>
          ) : (
            // ── The assembled shelf ──
            <motion.section
              key="shelf"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-16"
            >
              <button
                onClick={reset}
                className="mb-8 inline-flex items-center gap-2 text-[12px] text-text-secondary transition-colors hover:text-amber"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: "rotate(180deg)" }}>
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                A different feeling
              </button>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">Tonight you want to feel</p>
                  <h1 className={`mt-1 font-display text-[40px] leading-tight ${moodMeta?.accent}`}>{mood}</h1>
                  <p className="mt-1 text-[14px] italic text-text-secondary">{moodMeta?.tagline}</p>
                </div>
              </div>

              {/* quiet refinements */}
              <div className="mt-7 flex flex-wrap items-center gap-2 border-y border-border py-4">
                <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-text-ghost">Refine</span>
                {genresForMood.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                      genre === g ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border text-text-secondary hover:text-paper"
                    }`}
                  >
                    {g}
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-border" />
                {["Any", "Short", "Long"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                      length === l ? "border-amber/40 bg-amber/[0.08] text-amber" : "border-border text-text-secondary hover:text-paper"
                    }`}
                  >
                    {l === "Any" ? "Any length" : l}
                  </button>
                ))}
              </div>

              {matched.length > 0 ? (
                <motion.div layout className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {matched.map((s, i) => (
                    <StoryTile key={s.id} story={s} i={i} />
                  ))}
                </motion.div>
              ) : (
                <div className="mt-10 rounded-xl border border-border bg-surface/50 px-6 py-20 text-center">
                  <p className="font-display text-[18px] text-paper">Nothing matches that exact mix.</p>
                  <p className="mt-2 text-[13px] text-text-secondary">Loosen a refinement, or pick a different feeling.</p>
                  <button onClick={() => { setGenre("All"); setLength("Any"); }} className="mt-5 rounded-full border border-amber/30 bg-amber/[0.06] px-5 py-2.5 text-[13px] text-amber hover:text-paper">
                    Clear refinements
                  </button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
