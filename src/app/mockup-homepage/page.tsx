"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

// ── Mock data ───────────────────────────────────────────────
// Mirrors the production homepage's brand voice. Replace with real
// data when wiring this layout up for production.

const FEATURED_STORY = {
  title: "The salt-keeper's daughter",
  author: "Maren Holt",
  genre: "Coastal fantasy",
  chapters: 24,
  readers: "12,400",
  synopsis:
    "A cursed lighthouse, a missing brother, and a coast that remembers every shipwreck it has ever taken.",
};

const FOR_YOU_TAGS = ["Fantasy", "Slow-burn", "Sapphic", "Novella", "Found family"];

const STREAK_DAYS = [
  { label: "Mon", done: true },
  { label: "Tue", done: true },
  { label: "Wed", done: true },
  { label: "Thu", done: true },
  { label: "Fri", done: true },
  { label: "Sat", done: true },
  { label: "Today", done: false, today: true },
];

const CO_WRITERS = [
  { initials: "MH", gradient: "from-gold/35 to-copper/25", text: "text-gold" },
  { initials: "SI", gradient: "from-amethyst/35 to-amethyst/15", text: "text-amethyst" },
  { initials: "C2", gradient: "from-teal/35 to-teal/15", text: "text-teal" },
];

const SHELF_STORIES = [
  { title: "The Obsidian Crown", author: "Kaelen Thorne", genre: "Fantasy", accent: "from-gold/30 via-copper/15 to-walnut/20" },
  { title: "Whispering Pines", author: "Sarah Imani", genre: "Mystery", accent: "from-amethyst/30 via-walnut/20 to-ink" },
  { title: "Neon Grifters", author: "Cyborg2088", genre: "Cyberpunk", accent: "from-teal/25 via-amethyst/15 to-ink" },
  { title: "Salt & Ruin", author: "Maren Holt", genre: "Fantasy", accent: "from-ruby/25 via-copper/15 to-walnut/20" },
  { title: "The Hollow Depths", author: "Abysswalker", genre: "Sci-Fi", accent: "from-teal/30 via-walnut/20 to-ink" },
];

// ── Decorative helpers ──────────────────────────────────────

// Brass corner ornaments — reserved for featured/important cards only.
// Same motif as the VideoShowcase frame in the production homepage,
// to create continuity across editorial moments.
function BrassCorners() {
  return (
    <>
      <div className="absolute top-0 left-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/45">
          <path d="M0 6V0h6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M0 0l4 4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/45">
          <path d="M24 6V0h-6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24 0l-4 4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/45">
          <path d="M0 18v6h6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M0 24l4-4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/45">
          <path d="M24 18v6h-6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24 24l-4-4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
    </>
  );
}

// Subtle parchment grain — reuses the same SVG-noise data URL from the
// production VideoShowcase. 3% opacity is enough to be felt, not seen.
function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:128px_128px]"
    />
  );
}

// ── Hero ────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-12 md:pb-16 px-6 text-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <motion.h1
        className="relative font-display text-5xl sm:text-6xl md:text-7xl font-medium leading-[1.08] tracking-tight text-paper max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Read, write, and{" "}
        <span className="text-gold italic">live in</span> stories.
      </motion.h1>
      <motion.p
        className="relative mt-6 text-text-secondary text-base md:text-lg max-w-lg mx-auto font-body leading-relaxed"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15 }}
      >
        A library, an editor, and a community — all in one place.
      </motion.p>
      <motion.div
        className="relative mt-10 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <Link
          href="/browse"
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-black font-body font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300 shadow-[var(--t-shadow-card-hover)]"
        >
          Browse stories
        </Link>
        <Link
          href="/demo/try"
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text font-body font-medium text-sm tracking-wide hover:text-paper hover:border-gold/30 transition-all duration-300"
        >
          Start writing
        </Link>
      </motion.div>
      <motion.p
        className="relative mt-6 text-text-tertiary text-[11px] tracking-[0.18em] uppercase font-display"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        Free to browse. No account needed to try the editor.
      </motion.p>
    </section>
  );
}

// ── Video band ──────────────────────────────────────────────

function VideoBand() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.3 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative px-6 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <motion.p
          className="text-center text-[11px] uppercase tracking-[0.2em] text-text-tertiary mb-6 font-display"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          Where imagination becomes story
        </motion.p>
        <motion.div
          className="relative rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/20 via-gold/8 to-gold/15 pointer-events-none z-0" />
          <div className="relative rounded-2xl overflow-hidden border border-gold/15 bg-ink">
            <video
              ref={videoRef}
              src="/hero-video.mp4"
              className="w-full h-auto block aspect-video object-cover"
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Quiloria — Where imagination becomes story"
            />
            <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.15),inset_0_-2px_12px_rgba(0,0,0,0.1)]" />
          </div>
        </motion.div>
        <motion.p
          className="text-center text-[12px] italic text-text-secondary mt-5 font-body"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          From the writer&apos;s imagination to the reader&apos;s world.
        </motion.p>
      </div>
    </section>
  );
}

// ── Bento cells ─────────────────────────────────────────────
// Five cells, five different anchor visuals. Content type determines
// chrome — featured stories get brass corners + cover band, stat cells
// get a metric + viz, social cells get avatar stacks.

function FeaturedStoryCell() {
  return (
    <Link
      href="/browse"
      className="group relative block rounded-2xl border border-gold/30 bg-surface/55 backdrop-blur-sm overflow-hidden hover:border-gold/45 hover:bg-surface/70 transition-all duration-500 h-full"
    >
      <BrassCorners />
      <GrainOverlay />
      <div className="relative grid grid-cols-1 sm:grid-cols-[200px_1fr] h-full">
        <div className="relative bg-gradient-to-br from-teal/25 via-amethyst/12 to-walnut/40 flex items-center justify-center p-8 min-h-[180px] sm:min-h-[260px] border-b sm:border-b-0 sm:border-r border-gold/15">
          <div className="absolute inset-0 bg-gradient-to-t from-void/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative text-center">
            <svg
              className="w-12 h-12 text-paper/45 mx-auto mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
            >
              <path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0" strokeLinecap="round" />
              <path d="M2 16c2-1 4-1 6 0s4 1 6 0 4-1 6 0" strokeLinecap="round" />
              <path d="M11 4l1.5 3 3 .5-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3-.5z" strokeLinejoin="round" />
            </svg>
            <p className="font-display text-[12px] italic text-text-secondary tracking-wide">
              Coastal fantasy
            </p>
          </div>
        </div>
        <div className="relative p-6 md:p-7 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/85 font-display mb-2.5">
              Featured this week
            </p>
            <h3 className="font-display text-2xl md:text-[26px] text-paper font-medium leading-[1.1] mb-3">
              {FEATURED_STORY.title}
            </h3>
            <p className="text-text-secondary text-[13.5px] leading-relaxed italic font-body mb-4 max-w-md">
              {FEATURED_STORY.synopsis}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary font-body">
              <span className="px-2.5 py-1 rounded-full bg-walnut/40 text-text-secondary border border-border">
                {FEATURED_STORY.author}
              </span>
              <span>{FEATURED_STORY.chapters} chapters</span>
              <span aria-hidden>·</span>
              <span>{FEATURED_STORY.readers} readers</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gold text-[13px] font-body mt-5 pt-4 border-t border-gold/15 group-hover:gap-3 transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 2h10v12H3z" />
              <path d="M6 2v12" />
            </svg>
            <span className="font-medium">Read first chapter — free</span>
            <svg className="ml-auto" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ForYouCell() {
  return (
    <Link
      href="/browse"
      className="group relative block rounded-2xl border border-teal/25 bg-surface/55 backdrop-blur-sm overflow-hidden hover:border-teal/40 hover:bg-surface/70 transition-all duration-500 p-6 h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-transparent opacity-80 pointer-events-none" />
      <div className="relative h-full flex flex-col">
        <div className="flex items-start justify-between mb-3 gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-teal/85 font-display">
            For you
          </p>
          <span className="text-[10px] text-teal/90 font-body px-2 py-0.5 rounded-full bg-teal/10 border border-teal/25 whitespace-nowrap">
            12 new this week
          </span>
        </div>
        <h3 className="font-display text-xl text-paper font-medium leading-[1.2] mb-5">
          A feed tuned to what you actually want
        </h3>
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {FOR_YOU_TAGS.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-1 rounded-full bg-walnut/30 text-text-secondary border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function StreakCell() {
  return (
    <div className="group relative rounded-2xl border border-gold/25 bg-surface/55 backdrop-blur-sm overflow-hidden p-6 hover:border-gold/40 hover:bg-surface/70 transition-all duration-500 h-full">
      <div className="absolute inset-0 bg-gold/5 opacity-50 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold/85 font-display">
            Reading streak
          </p>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-gold/70">
            <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" strokeLinejoin="round" />
            <path d="M6 10a2 2 0 004 0c0-1-2-2.5-2-2.5s-2 1.5-2 2.5z" opacity="0.6" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-display text-4xl text-paper font-medium leading-none">12</span>
          <span className="text-text-secondary text-[13px] font-body">days</span>
        </div>
        <div className="flex gap-1.5 mb-3">
          {STREAK_DAYS.map((d, i) => (
            <div
              key={i}
              className={`flex-1 h-7 rounded-md flex items-center justify-center text-[10px] font-body transition-colors ${
                d.today
                  ? "border border-dashed border-gold/45 text-gold/90 bg-gold/5"
                  : d.done
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "bg-walnut/20 text-text-tertiary border border-border"
              }`}
              title={d.label}
            >
              {d.today ? "Today" : (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
        <p className="text-text-secondary text-[12px] font-body leading-relaxed">
          Read today to keep it alive.
        </p>
      </div>
    </div>
  );
}

function CoWriteCell() {
  return (
    <div className="group relative rounded-2xl border border-amethyst/25 bg-surface/55 backdrop-blur-sm overflow-hidden p-6 hover:border-amethyst/40 hover:bg-surface/70 transition-all duration-500 h-full">
      <div className="absolute inset-0 bg-amethyst/5 opacity-50 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amethyst/85 font-display">
            Write together
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald font-body">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            Live
          </span>
        </div>
        <h3 className="font-display text-xl text-paper font-medium leading-tight mb-5">
          Three writers in this story
        </h3>
        <div className="flex items-center mb-4">
          {CO_WRITERS.map((w, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${w.gradient} border-2 border-surface flex items-center justify-center text-[11px] font-display font-medium ${w.text}`}
              style={{ marginLeft: i === 0 ? 0 : "-10px", zIndex: CO_WRITERS.length - i }}
            >
              {w.initials}
            </div>
          ))}
          <div
            className="w-8 h-8 rounded-full bg-walnut/40 border-2 border-surface flex items-center justify-center text-[10px] text-text-secondary font-body"
            style={{ marginLeft: "-10px" }}
          >
            +8
          </div>
        </div>
        <p className="text-text-secondary text-[12px] font-body leading-relaxed">
          Polls and reactions shape what happens next.
        </p>
      </div>
    </div>
  );
}

function EarnCell() {
  return (
    <div className="group relative rounded-2xl border border-sage/25 bg-surface/55 backdrop-blur-sm overflow-hidden p-6 hover:border-sage/40 hover:bg-surface/70 transition-all duration-500 h-full">
      <div className="absolute inset-0 bg-sage/5 opacity-50 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-sage/85 font-display">
            Earn
          </p>
          <span className="text-[10px] text-sage/90 font-body px-2 py-0.5 rounded-full bg-sage/10 border border-sage/25 whitespace-nowrap">
            92% to creator
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-display text-3xl text-paper font-medium leading-none">$284</span>
          <span className="text-text-secondary text-[13px] font-body">this month</span>
        </div>
        <svg
          className="w-full h-8 mb-3 text-sage/70"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path
            d="M0 18 L15 16 L30 14 L45 13 L60 9 L75 7 L100 4 L100 24 L0 24 Z"
            fill="currentColor"
            opacity="0.12"
          />
          <path
            d="M0 18 L15 16 L30 14 L45 13 L60 9 L75 7 L100 4"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary font-body">
          <span>Tips $84</span>
          <span aria-hidden>·</span>
          <span>Subs $147</span>
          <span aria-hidden>·</span>
          <span>Comms $53</span>
        </div>
      </div>
    </div>
  );
}

function Bento() {
  return (
    <section className="relative px-6 py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <FeaturedStoryCell />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <ForYouCell />
          </motion.div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <StreakCell />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <CoWriteCell />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <EarnCell />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Three rooms — illustrated triptych ─────────────────────
// Three arched windows looking into the library's three rooms.
// SVG line-art aesthetic with warm candlelight glows. Brand-
// aligned with the magical-library voice without needing
// external illustration assets.

function SoloRoomScene() {
  return (
    <g>
      <ellipse cx="125" cy="135" rx="95" ry="55" fill="currentColor" opacity="0.05" />
      <line x1="0" y1="195" x2="250" y2="195" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path d="M60 150 L190 150 L200 168 L50 168 Z" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <line x1="55" y1="168" x2="50" y2="190" stroke="currentColor" strokeWidth="0.6" />
      <line x1="195" y1="168" x2="200" y2="190" stroke="currentColor" strokeWidth="0.6" />
      <line x1="120" y1="148" x2="120" y2="115" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      <line x1="132" y1="148" x2="132" y2="115" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      <path d="M120 118 L132 118" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      <path d="M105 144 L155 144 L162 155 L98 155 Z" stroke="currentColor" strokeWidth="0.6" fill="currentColor" fillOpacity="0.05" />
      <line x1="130" y1="144" x2="130" y2="155" stroke="currentColor" strokeWidth="0.4" />
      <line x1="108" y1="147" x2="125" y2="147" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <line x1="108" y1="150" x2="125" y2="150" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <line x1="135" y1="147" x2="152" y2="147" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <line x1="135" y1="150" x2="152" y2="150" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <rect x="73" y="138" width="5" height="12" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <ellipse cx="75.5" cy="150" rx="5" ry="1.2" fill="currentColor" opacity="0.3" />
      <path d="M75.5 138 Q73.5 134 75.5 130 Q77.5 134 75.5 138 Z" fill="currentColor" />
      <circle cx="75.5" cy="133" r="14" fill="currentColor" opacity="0.06" />
      <circle cx="75.5" cy="133" r="7" fill="currentColor" opacity="0.1" />
      <path d="M170 145 L190 122" stroke="currentColor" strokeWidth="0.8" />
      <path d="M188 124 L192 120 M187 126 L184 122 M189 127 L186 124 M186 128 L183 125" stroke="currentColor" strokeWidth="0.4" />
    </g>
  );
}

function WritersRoomScene() {
  return (
    <g>
      <ellipse cx="125" cy="140" rx="100" ry="55" fill="currentColor" opacity="0.05" />
      <line x1="0" y1="195" x2="250" y2="195" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="125" y1="35" x2="125" y2="78" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
      <path d="M115 78 L135 78 L132 93 L118 93 Z" stroke="currentColor" strokeWidth="0.6" fill="currentColor" fillOpacity="0.2" />
      <line x1="120" y1="82" x2="130" y2="82" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
      <circle cx="125" cy="86" r="18" fill="currentColor" opacity="0.07" />
      <circle cx="125" cy="86" r="10" fill="currentColor" opacity="0.1" />
      <path d="M40 140 L210 140 L222 168 L28 168 Z" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <line x1="33" y1="168" x2="28" y2="190" stroke="currentColor" strokeWidth="0.6" />
      <line x1="217" y1="168" x2="222" y2="190" stroke="currentColor" strokeWidth="0.6" />
      <line x1="55" y1="140" x2="55" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <line x1="65" y1="140" x2="65" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <path d="M55 115 L65 115" stroke="currentColor" strokeWidth="0.5" />
      <line x1="100" y1="140" x2="100" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <line x1="110" y1="140" x2="110" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <path d="M100 115 L110 115" stroke="currentColor" strokeWidth="0.5" />
      <line x1="148" y1="140" x2="148" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <line x1="158" y1="140" x2="158" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <path d="M148 115 L158 115" stroke="currentColor" strokeWidth="0.5" />
      <line x1="193" y1="140" x2="193" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <line x1="203" y1="140" x2="203" y2="112" stroke="currentColor" strokeWidth="0.5" />
      <path d="M193 115 L203 115" stroke="currentColor" strokeWidth="0.5" />
      <rect x="73" y="132" width="3" height="8" stroke="currentColor" strokeWidth="0.4" fill="currentColor" fillOpacity="0.2" />
      <path d="M74.5 132 Q73.5 129 74.5 127 Q75.5 129 74.5 132 Z" fill="currentColor" />
      <circle cx="74.5" cy="129" r="6" fill="currentColor" opacity="0.08" />
      <rect x="170" y="132" width="3" height="8" stroke="currentColor" strokeWidth="0.4" fill="currentColor" fillOpacity="0.2" />
      <path d="M171.5 132 Q170.5 129 171.5 127 Q172.5 129 171.5 132 Z" fill="currentColor" />
      <circle cx="171.5" cy="129" r="6" fill="currentColor" opacity="0.08" />
      <path d="M85 138 L99 138 L100 142 L84 142 Z" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.6" transform="rotate(-4 92 140)" />
      <path d="M120 137 L134 137 L135 141 L119 141 Z" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.6" transform="rotate(2 127 139)" />
      <path d="M148 139 L162 139 L163 143 L147 143 Z" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.6" transform="rotate(-3 155 141)" />
    </g>
  );
}

function TableRoomScene() {
  return (
    <g>
      <ellipse cx="125" cy="145" rx="100" ry="55" fill="currentColor" opacity="0.05" />
      <line x1="0" y1="195" x2="250" y2="195" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="125" y1="32" x2="125" y2="68" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
      <path d="M117 68 L133 68 L130 96 L120 96 Z" stroke="currentColor" strokeWidth="0.6" fill="currentColor" fillOpacity="0.18" />
      <line x1="120" y1="76" x2="130" y2="76" stroke="currentColor" strokeWidth="0.35" opacity="0.5" />
      <line x1="120" y1="82" x2="130" y2="82" stroke="currentColor" strokeWidth="0.35" opacity="0.5" />
      <line x1="120" y1="88" x2="130" y2="88" stroke="currentColor" strokeWidth="0.35" opacity="0.5" />
      <circle cx="125" cy="83" r="20" fill="currentColor" opacity="0.07" />
      <circle cx="125" cy="83" r="11" fill="currentColor" opacity="0.1" />
      <ellipse cx="125" cy="155" rx="82" ry="20" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <path d="M43 155 Q43 165 60 170 L190 170 Q207 165 207 155" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.04" />
      <line x1="60" y1="170" x2="55" y2="188" stroke="currentColor" strokeWidth="0.5" />
      <line x1="190" y1="170" x2="195" y2="188" stroke="currentColor" strokeWidth="0.5" />
      <ellipse cx="125" cy="155" rx="38" ry="10" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.05" />
      <circle cx="125" cy="155" r="4.5" stroke="currentColor" strokeWidth="0.3" fill="none" opacity="0.5" />
      <line x1="120.5" y1="155" x2="129.5" y2="155" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
      <line x1="125" y1="150.5" x2="125" y2="159.5" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
      <path d="M111 152 L114 149 L117 152 L114 155 Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <path d="M114 149 L114 155" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <path d="M111 152 L117 152" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <path d="M153 154 L156 151 L159 154 L156 157 Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <path d="M156 151 L156 157" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <path d="M153 154 L159 154" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
      <path d="M70 175 Q70 168 73 168 Q76 168 76 175 L77 188 L69 188 Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="73" cy="166" r="2.2" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.25" />
      <path d="M174 175 Q174 168 177 168 Q180 168 180 175 L181 188 L173 188 Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="177" cy="166" r="2.2" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.25" />
      <path d="M122 178 Q122 172 125 172 Q128 172 128 178 L129 188 L121 188 Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="125" cy="170" r="2.2" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.25" />
    </g>
  );
}

interface RoomData {
  numeral: string;
  title: string;
  cta: string;
  href: string;
  accent: string;
  Scene: () => React.JSX.Element;
}

const ROOMS: RoomData[] = [
  {
    numeral: "I",
    title: "Alone at the Page",
    cta: "Open the editor",
    href: "/demo/try",
    accent: "text-gold",
    Scene: SoloRoomScene,
  },
  {
    numeral: "II",
    title: "The Writers' Room",
    cta: "Step inside a room",
    href: "/demo/writers-room",
    accent: "text-amethyst",
    Scene: WritersRoomScene,
  },
  {
    numeral: "III",
    title: "At the Table",
    cta: "Watch a session",
    href: "/demo/the-scroll",
    accent: "text-ruby",
  Scene: TableRoomScene,
  },
];

function RoomPanel({ numeral, title, cta, href, accent, Scene }: RoomData) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className={`group block ${accent}`}>
        <div className="relative">
          <svg viewBox="0 0 250 200" className="w-full h-auto block" aria-hidden>
            <Scene />
            <path
              d="M20 195 L20 60 Q20 25 125 25 Q230 25 230 60 L230 195"
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity="0.55"
              fill="none"
            />
            <circle cx="125" cy="27" r="3" stroke="currentColor" strokeWidth="0.6" fill="currentColor" fillOpacity="0.4" />
            <path d="M12 195 L20 195 M230 195 L238 195" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
          </svg>
        </div>
        <div className="text-center mt-6">
          <p className={`text-[10px] uppercase tracking-[0.3em] ${accent} opacity-80 mb-2 font-display`}>
            Chapter {numeral}
          </p>
          <h3 className="font-display text-xl md:text-2xl text-paper font-medium leading-tight italic mb-3">
            {title}
          </h3>
          <span className={`inline-flex items-center gap-1.5 ${accent} text-[13px] font-display italic group-hover:gap-2.5 transition-all duration-300`}>
            {cta}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function ThreeRooms() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
        >
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
            Three rooms · One library
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-tight italic">
            How stories happen here.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {ROOMS.map((room) => (
            <RoomPanel key={room.numeral} {...room} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Happening now shelf ─────────────────────────────────────

function HappeningNow() {
  return (
    <section className="relative px-6 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="flex items-end justify-between mb-8 md:mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-display mb-2">
              From the library
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-[1.1]">
              Happening <span className="text-gold italic">now</span>
            </h2>
          </div>
          <Link
            href="/browse"
            className="hidden sm:inline-flex items-center gap-2 text-text-secondary hover:text-gold text-sm transition-colors font-body"
          >
            See all
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {SHELF_STORIES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link href="/browse" className="group block">
                <div
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-gradient-to-br ${s.accent} mb-3 transition-all duration-500 group-hover:border-gold/30`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-void/85 via-void/15 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-display text-paper text-[14px] font-medium leading-tight">
                      {s.title}
                    </p>
                  </div>
                </div>
                <p className="text-text text-[13px] font-body">{s.author}</p>
                <p className="text-text-tertiary text-[11px] font-body mt-0.5">{s.genre}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative px-6 py-20 md:py-32 text-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative max-w-2xl mx-auto">
        <motion.h2
          className="font-display text-4xl sm:text-5xl text-paper font-medium leading-[1.1]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Your <span className="text-gold italic">next story</span> is waiting.
        </motion.h2>
        <motion.p
          className="mt-5 text-text-secondary text-base md:text-lg font-body leading-relaxed"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          Whether you write novels or read them, draw comics or devour them — there is a place for you here.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-black font-body font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300"
          >
            Browse stories
          </Link>
          <Link
            href="/demo/try"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text font-body font-medium text-sm tracking-wide hover:text-paper hover:border-gold/30 transition-all duration-300"
          >
            Start writing
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Mockup badge (floating, persistent) ─────────────────────

function MockupBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-elevated/95 backdrop-blur-md border border-gold/25 shadow-[var(--t-shadow-modal)]">
      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      <span className="text-[11px] text-text-secondary font-body">v1 · Rooms</span>
      <Link href="/mockup-homepage-v2" className="text-[11px] text-gold hover:text-gold-light transition-colors font-body underline-offset-2 hover:underline">v2</Link>
      <span className="text-text-tertiary text-[11px]" aria-hidden>·</span>
      <Link href="/mockup-homepage-v3" className="text-[11px] text-gold hover:text-gold-light transition-colors font-body underline-offset-2 hover:underline">v3</Link>
      <span className="text-text-tertiary text-[11px]" aria-hidden>·</span>
      <Link href="/" className="text-[11px] text-text-secondary hover:text-paper transition-colors font-body">Live</Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function MockupHomepage() {
  return (
    <main className="bg-void min-h-screen overflow-x-hidden font-body text-text">
      <Navbar />
      <Hero />
      <VideoBand />
      <Bento />
      <ThreeRooms />
      <HappeningNow />
      <FinalCTA />
      <MockupBadge />
    </main>
  );
}
