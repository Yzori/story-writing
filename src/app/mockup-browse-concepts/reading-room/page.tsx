"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORIES, HALLS, FEATURED, byId, type MockStory } from "../_data";

// ── The Reading Room ────────────────────────────────────────
// Browse as a cinematic descent through a candlelit library. No sidebar,
// no top filter bar — you scroll DOWN through halls where covers hang like
// framed portraits. Filters are *summoned* (press / or ⌘K), never in your face.

function Spark({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber/85">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
      </svg>
      {n}
    </span>
  );
}

// drifting dust motes in the lamplight
function Motes() {
  const motes = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      left: `${(i * 37) % 100}%`,
      delay: (i % 7) * 1.3,
      dur: 9 + (i % 5) * 2,
      size: 1 + (i % 3),
    })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-amber/40"
          style={{ left: m.left, top: "105%", width: m.size, height: m.size }}
          animate={{ y: ["0%", "-120vh"], opacity: [0, 0.7, 0] }}
          transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function HangingCover({ story, index }: { story: MockStory; index: number }) {
  const tilt = (index % 2 === 0 ? -1 : 1) * (1.5 + (index % 3));
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: tilt * 1.8 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ rotate: 0, y: -8, scale: 1.03 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay: (index % 4) * 0.06 }}
      className="group relative"
    >
      {/* picture hook */}
      <div className="mx-auto mb-2 h-3 w-px bg-gradient-to-b from-amber/50 to-transparent" />
      <Link href="#" className="block">
        <div className="relative w-[150px] overflow-hidden rounded-sm border border-amber/20 bg-elevated shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] ring-1 ring-black/40 transition-all duration-500 group-hover:border-amber/45 group-hover:shadow-[0_0_50px_-8px_rgba(212,168,67,0.5)] sm:w-[176px]">
          <div className="aspect-[2/3] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.cover} alt="" className="h-full w-full object-cover brightness-[0.62] saturate-[0.85] transition-all duration-700 group-hover:brightness-100 group-hover:scale-105" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 translate-y-1 p-3 opacity-90 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-[9px] uppercase tracking-[0.14em] text-amber/70">{story.genre}</p>
            <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper line-clamp-2">{story.title}</h3>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-paper/55">
              <span className="truncate">{story.author}</span>
              <span>·</span>
              <Spark n={story.sparks} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return STORIES.slice(0, 5);
    return STORIES.filter(
      (s) => s.title.toLowerCase().includes(t) || s.author.toLowerCase().includes(t) || s.genre.toLowerCase().includes(t),
    ).slice(0, 6);
  }, [q]);

  const genres = Array.from(new Set(STORIES.map((s) => s.genre)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-void/80 px-4 pt-[12vh] backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the stacks — titles, authors, worlds…"
                className="flex-1 bg-transparent text-[15px] text-paper outline-none placeholder:text-text-ghost"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-ghost">esc</kbd>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {results.map((s) => (
                <Link key={s.id} href="#" className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.cover} alt="" className="h-12 w-9 flex-shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14px] text-paper">{s.title}</p>
                    <p className="truncate text-[12px] text-text-secondary">{s.author} · {s.genre}</p>
                  </div>
                  <Spark n={s.sparks} />
                </Link>
              ))}
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-[13px] text-text-ghost">Nothing on these shelves… yet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
              {genres.map((g) => (
                <button key={g} onClick={() => setQ(g)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber">
                  {g}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ReadingRoomMockup() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !paletteOpen) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  return (
    <main className="relative min-h-screen bg-void text-text">
      <Motes />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* summon-filters affordance */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="fixed right-4 top-20 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-[12px] text-text-secondary backdrop-blur-md transition-colors hover:border-amber/30 hover:text-amber sm:right-6"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
        Search the stacks
        <kbd className="rounded border border-border px-1 text-[10px] text-text-ghost">/</kbd>
      </button>

      {/* ── Hero: the librarian's pick ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[60vh] w-[80vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,168,67,0.16),transparent_70%)]" />
        <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-10 py-24 md:grid-cols-[260px_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="justify-self-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[230px] overflow-hidden rounded-md border border-amber/25 shadow-[0_0_70px_-10px_rgba(212,168,67,0.45)]"
            >
              <div className="aspect-[2/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FEATURED.cover} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-void/60 to-transparent" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          >
            <div className="mb-5 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-text-ghost">
              <span className="relative grid h-4 w-4 place-items-center">
                <motion.span className="absolute h-1.5 w-1.5 rounded-full bg-amber" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
                <span className="absolute h-4 w-4 rounded-full bg-amber/20 blur-sm" />
              </span>
              The reading room is open
            </div>
            <p className="font-display text-[15px] italic text-amber/80">The librarian set this aside for you tonight—</p>
            <h1 className="mt-2 font-display text-[44px] leading-[0.98] text-paper sm:text-[60px]">{FEATURED.title}</h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">{FEATURED.hook}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-text-secondary">
              <span className="text-paper/80">by {FEATURED.author}</span>
              <span className="text-text-ghost">·</span>
              <span>{FEATURED.genre}</span>
              <span className="text-text-ghost">·</span>
              <span>{FEATURED.readTime}</span>
              <span className="text-text-ghost">·</span>
              <Spark n={FEATURED.sparks} />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#" className="rounded-full bg-paper px-6 py-3 text-[13px] font-medium text-void transition-transform hover:translate-x-0.5">
                Begin reading
              </Link>
              <button onClick={() => setPaletteOpen(true)} className="rounded-full border border-border px-5 py-3 text-[13px] text-text-secondary transition-colors hover:border-amber/30 hover:text-paper">
                Show me another
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.2em] text-text-ghost"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, 6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          descend into the stacks
          <div className="mt-2 text-amber/60">↓</div>
        </motion.div>
      </section>

      {/* ── Halls: descend ── */}
      <div className="relative z-10 mx-auto max-w-6xl space-y-28 px-4 pb-32 sm:px-6">
        {HALLS.map((hall, hi) => (
          <section key={hall.name} className="relative">
            <div className="mb-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="mx-auto mb-4 flex w-fit items-center gap-3 text-amber/50">
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber/40" />
                  <span className="text-[10px] uppercase tracking-[0.22em]">Floor {hi + 1}</span>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber/40" />
                </div>
                <h2 className="font-display text-[30px] text-paper sm:text-[38px]">{hall.name}</h2>
                <p className="mt-2 text-[14px] italic text-text-secondary">{hall.subtitle}</p>
              </motion.div>
            </div>
            <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-12">
              {hall.storyIds.map((id, i) => (
                <HangingCover key={id} story={byId(id)} index={i} />
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <span className="font-display text-[15px] italic text-text-secondary">…the stacks go deeper than one night allows.</span>
          <button onClick={() => setPaletteOpen(true)} className="rounded-full border border-amber/30 bg-amber/[0.06] px-6 py-3 text-[13px] text-amber transition-colors hover:text-paper">
            Search for something specific
          </button>
        </div>
      </div>
    </main>
  );
}
