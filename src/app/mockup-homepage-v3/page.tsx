"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Mock data ───────────────────────────────────────────────

const FEATURED_STORY = {
  title: "The salt-keeper's daughter",
  author: "Maren Holt",
  genre: "Coastal fantasy",
  chapters: 24,
  readers: "12,400",
  synopsis:
    "A cursed lighthouse, a missing brother, and a coast that remembers every shipwreck it has ever taken.",
};

const SHELF_STORIES = [
  { title: "The Obsidian Crown", author: "Kaelen Thorne", genre: "Fantasy", accent: "from-gold/30 via-copper/15 to-walnut/20" },
  { title: "Whispering Pines", author: "Sarah Imani", genre: "Mystery", accent: "from-amethyst/30 via-walnut/20 to-ink" },
  { title: "Neon Grifters", author: "Cyborg2088", genre: "Cyberpunk", accent: "from-teal/25 via-amethyst/15 to-ink" },
  { title: "Salt & Ruin", author: "Maren Holt", genre: "Fantasy", accent: "from-ruby/25 via-copper/15 to-walnut/20" },
  { title: "The Hollow Depths", author: "Abysswalker", genre: "Sci-Fi", accent: "from-teal/30 via-walnut/20 to-ink" },
];

const STORY_PARAGRAPHS = [
  "Lia opened the door. The candlelight stretched across the floor in a long, narrow blade.",
  "She paused — listened — but the corridor was silent.",
  "Beyond the threshold, the smell of salt and old paper drifted toward her. It was a smell she remembered from before her brother had gone.",
];
const STORY_LIVE_LINE =
  "She stepped inside. The door clicked shut behind her, and the corridor went dark.";

const ROOM_CHAT = [
  { author: "MH" as const, time: "4m", message: "Should Lia go in? I want her to want to, but feel the dread." },
  { author: "SI" as const, time: "2m", message: "Yes — but make her hesitate first. The reader needs to feel it too." },
  { author: "C2" as const, time: "1m", message: "Add the smell of paper again as the trigger. It's the brother's signal." },
  { author: "MH" as const, time: "just now", message: "Writing that now." },
];

type Role = "Mage" | "Rogue" | "Cleric" | "Warrior";

const ROOM_CHAT_AVATAR: Record<"MH" | "SI" | "C2", { ring: string; text: string; bg: string }> = {
  MH: { ring: "border-gold/40", text: "text-gold", bg: "bg-gradient-to-br from-gold/40 to-copper/25" },
  SI: { ring: "border-amethyst/40", text: "text-amethyst", bg: "bg-gradient-to-br from-amethyst/40 to-amethyst/15" },
  C2: { ring: "border-teal/40", text: "text-teal", bg: "bg-gradient-to-br from-teal/40 to-teal/15" },
};

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

// ── Editorial spread (replaces the bento) ──────────────────
// Featured story as a literary cover-story moment on the left;
// four short editorial mentions on the right, separated by
// asterism dividers. Pure typography — no cards, no chrome.

function Asterism() {
  return (
    <div className="flex justify-center my-1" aria-hidden>
      <span className="font-display text-gold/35 text-[14px] tracking-[0.5em] select-none">⁂</span>
    </div>
  );
}

function FeaturedSpread() {
  return (
    <section className="relative px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-14 md:mb-18"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9 }}
        >
          <svg
            className="w-10 h-10 text-gold/55 mx-auto mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            aria-hidden
          >
            <path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0" strokeLinecap="round" />
            <path d="M2 16c2-1 4-1 6 0s4 1 6 0 4-1 6 0" strokeLinecap="round" />
            <path
              d="M11 4l1.5 3 3 .5-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3-.5z"
              strokeLinejoin="round"
            />
          </svg>
          <p className="font-display italic text-text-tertiary text-[13.5px]">
            From the library, this week
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-12 md:gap-20">
          {/* Left — featured story as editorial cover */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-display italic text-gold/85 text-[13.5px] mb-3">
              featured this week
            </p>
            <h2 className="font-display text-paper text-[40px] md:text-5xl leading-[1.08] font-medium mb-6">
              {FEATURED_STORY.title}
            </h2>
            <p className="font-reading italic text-text text-[17px] md:text-[18px] leading-[1.65] mb-7 max-w-lg">
              &ldquo;{FEATURED_STORY.synopsis}&rdquo;
            </p>
            <p className="font-display italic text-text-secondary text-[14px] mb-1.5">
              by {FEATURED_STORY.author}
            </p>
            <p className="font-body text-text-tertiary text-[12.5px] mb-9">
              {FEATURED_STORY.genre} &middot; {FEATURED_STORY.chapters} chapters &middot;{" "}
              {FEATURED_STORY.readers} readers
            </p>
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 font-display italic text-gold text-[15.5px] hover:text-paper transition-colors duration-300"
            >
              Read the first chapter, free
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="transition-transform group-hover:translate-x-1"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </motion.article>

          {/* Right — editorial mentions, ornament-divided */}
          <motion.aside
            className="space-y-5 md:pt-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <p className="font-display italic text-teal/85 text-[12.5px] mb-2">
                tuned to your shelf
              </p>
              <p className="font-reading text-text text-[14px] leading-[1.65] italic">
                Fantasy with a slow burn, sapphic novellas, found family stories, and a few you didn&apos;t know you were looking for.
              </p>
            </div>

            <Asterism />

            <div>
              <p className="font-display italic text-gold/85 text-[12.5px] mb-2">
                reading streaks
              </p>
              <p className="font-reading text-text text-[14px] leading-[1.65] italic">
                Twelve days running. Read tonight to keep it alive — small habits, real stories.
              </p>
            </div>

            <Asterism />

            <div>
              <p className="font-display italic text-amethyst/85 text-[12.5px] mb-2">
                writers&apos; rooms
              </p>
              <p className="font-reading text-text text-[14px] leading-[1.65] italic">
                Live co-writing rooms where polls and reactions let your readers help shape what happens next.
              </p>
            </div>

            <Asterism />

            <div>
              <p className="font-display italic text-sage/85 text-[12.5px] mb-2">
                earning
              </p>
              <p className="font-reading text-text text-[14px] leading-[1.65] italic">
                Tips, subscriptions, chapter unlocks, paid commissions. Built in, no middlemen between you and your readers.
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

// ── Interactive mode-switcher (kept from v2) ───────────────

type Mode = "solo" | "together" | "table";

function SoloPreview() {
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setChars((prev) => (prev >= STORY_LIVE_LINE.length + 25 ? 0 : prev + 1));
    }, 55);
    return () => clearInterval(interval);
  }, []);
  return (
    <motion.div
      key="solo"
      className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1fr_220px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gold/15">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/45 to-copper/30 border border-gold/40 flex items-center justify-center text-[11px] font-display font-medium text-gold">
              MH
            </div>
            <div className="leading-tight">
              <p className="text-[12px] text-paper font-medium">Maren Holt</p>
              <p className="text-[10px] text-text-tertiary">writing &middot; The salt-keeper&apos;s daughter</p>
            </div>
          </div>
          <span className="text-[10px] text-gold/80 font-body inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Autosaved
          </span>
        </div>
        <div className="flex-1 px-6 md:px-8 py-5 font-reading text-[13.5px] leading-[1.85] overflow-hidden min-w-0">
          <p className="font-display text-paper text-[17px] italic mb-3.5">
            Chapter 12 — Beneath the Lighthouse
          </p>
          {STORY_PARAGRAPHS.map((p, i) => (
            <p key={i} className="mb-2.5 text-text">
              {p}
            </p>
          ))}
          <p className="text-paper">
            {STORY_LIVE_LINE.slice(0, Math.min(chars, STORY_LIVE_LINE.length))}
            {chars <= STORY_LIVE_LINE.length && (
              <span className="inline-block w-[2px] h-[1.1em] bg-gold align-text-bottom ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
      </div>
      <div className="hidden md:flex flex-col border-l border-gold/15 px-4 py-4 gap-4">
        <div>
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.18em] mb-2.5 font-display">Today</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11.5px]">
              <span className="text-text-secondary">Words</span>
              <span className="text-paper font-medium tabular-nums">1,247</span>
            </div>
            <div className="flex justify-between text-[11.5px]">
              <span className="text-text-secondary">Session</span>
              <span className="text-paper font-medium tabular-nums">1h 47m</span>
            </div>
            <div className="flex justify-between text-[11.5px]">
              <span className="text-text-secondary">Streak</span>
              <span className="text-gold font-medium tabular-nums">12 days</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gold/10 pt-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.18em] mb-2.5 font-display">Chapters</p>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <div key={n} className={`flex items-center gap-2 text-[10.5px] font-body ${n === 12 ? "text-paper" : "text-text-tertiary"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${n < 12 ? "bg-gold/50" : "bg-gold animate-pulse"}`} />
                <span>Ch {n}</span>
                {n < 12 && <span className="ml-auto text-text-tertiary/60 text-[9.5px]">done</span>}
                {n === 12 && <span className="ml-auto text-gold/70 text-[9.5px]">writing</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TogetherPreview() {
  return (
    <motion.div
      key="together"
      className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1fr_240px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amethyst/15">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/40 to-copper/25 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-gold">MH</div>
              <div className="-ml-2 w-7 h-7 rounded-full bg-gradient-to-br from-amethyst/40 to-amethyst/20 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-amethyst">SI</div>
              <div className="-ml-2 w-7 h-7 rounded-full bg-gradient-to-br from-teal/40 to-teal/20 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-teal">C2</div>
            </div>
            <div className="leading-tight">
              <p className="text-[12px] text-paper font-medium">3 writers in this room</p>
              <p className="text-[10px] text-amethyst/90 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                Live &middot; 247 readers watching
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 md:px-7 py-5 font-reading text-paper text-[13px] leading-[1.85] overflow-hidden min-w-0">
          <p className="font-display text-paper text-[17px] italic mb-3.5">Chapter 12 — Beneath the Lighthouse</p>
          <p className="text-text mb-2.5">Lia opened the door. The candlelight stretched across the floor in a long, narrow blade.</p>
          <p className="text-text mb-2.5">
            She paused — listened — but the corridor was{" "}
            <span className="relative inline-block">
              <span className="bg-gold/15 px-0.5 rounded-sm">silent</span>
              <span className="absolute -top-[18px] left-0 inline-flex items-center gap-1 text-[9px] text-gold bg-gold/20 border border-gold/40 px-1.5 py-0.5 rounded-sm whitespace-nowrap font-body">
                <span className="w-0.5 h-2.5 bg-gold animate-pulse" />MH
              </span>
            </span>.
          </p>
          <p className="text-text mb-2.5">
            Beyond the threshold, the smell of{" "}
            <span className="bg-amethyst/20 px-0.5 rounded-sm">salt and old paper</span> drifted toward her. It was a smell she remembered from{" "}
            <span className="relative inline-block">
              before
              <span className="absolute -top-[18px] left-0 inline-flex items-center gap-1 text-[9px] text-amethyst bg-amethyst/20 border border-amethyst/40 px-1.5 py-0.5 rounded-sm whitespace-nowrap font-body">
                <span className="w-0.5 h-2.5 bg-amethyst animate-pulse" />SI
              </span>
            </span>{" "}her brother had gone.
          </p>
          <p className="text-text-secondary italic">
            <span className="inline-flex items-center gap-1 text-[10px] text-teal/85 mr-1.5">
              <span className="w-0.5 h-2.5 bg-teal animate-pulse" />C2 is writing
            </span>
            She took a single step inside — then the door…
          </p>
        </div>
      </div>
      <div className="hidden md:flex flex-col border-l border-amethyst/15 min-h-0 min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amethyst/15">
          <p className="text-[10px] text-amethyst/85 uppercase tracking-[0.18em] font-display">Room chat</p>
          <span className="text-[9px] text-text-tertiary">3 online</span>
        </div>
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-2.5">
          {ROOM_CHAT.map((m, i) => {
            const av = ROOM_CHAT_AVATAR[m.author];
            return (
              <div key={i} className="flex gap-2">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full ${av.bg} border ${av.ring} flex items-center justify-center text-[9px] font-display font-medium ${av.text}`}>{m.author}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-[10px] font-medium ${av.text}`}>{m.author}</span>
                    <span className="text-[9px] text-text-tertiary">{m.time}</span>
                  </div>
                  <p className="text-[11px] text-text leading-snug mt-0.5">{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-amethyst/15 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] text-amethyst/85 uppercase tracking-[0.15em] font-display">Reader poll</p>
            <span className="text-[9px] text-text-tertiary">2h left</span>
          </div>
          <p className="text-[11px] text-paper mb-2 font-body leading-tight">What does Lia do?</p>
          <div className="space-y-1.5">
            <div>
              <div className="text-[10px] text-paper flex justify-between mb-0.5">
                <span>Step inside</span>
                <span className="text-amethyst font-medium">67%</span>
              </div>
              <div className="h-1 bg-walnut/30 rounded-full overflow-hidden">
                <div className="h-full bg-amethyst rounded-full" style={{ width: "67%" }} />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-secondary flex justify-between mb-0.5">
                <span>Walk away</span>
                <span className="text-text-secondary">33%</span>
              </div>
              <div className="h-1 bg-walnut/30 rounded-full overflow-hidden">
                <div className="h-full bg-text-secondary/40 rounded-full" style={{ width: "33%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DungeonMap() {
  return (
    <svg
      viewBox="0 0 280 110"
      className="block mx-auto"
      style={{ height: "100px", width: "auto", maxWidth: "100%" }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <pattern id="stones-v3" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="rgba(30, 29, 42, 0.5)" />
          <path d="M0 14 L14 14 M14 0 L14 14" stroke="rgba(58, 56, 80, 0.45)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="15" y="40" width="170" height="40" fill="url(#stones-v3)" stroke="rgba(184, 145, 122, 0.55)" strokeWidth="1.4" />
      <rect x="185" y="20" width="80" height="75" fill="url(#stones-v3)" stroke="rgba(184, 145, 122, 0.55)" strokeWidth="1.4" />
      <line x1="184.5" y1="40" x2="184.5" y2="50" stroke="rgba(15,14,19,1)" strokeWidth="2.6" />
      <line x1="184.5" y1="70" x2="184.5" y2="80" stroke="rgba(15,14,19,1)" strokeWidth="2.6" />
      <rect x="207" y="42" width="40" height="32" fill="rgba(58, 56, 80, 0.55)" stroke="rgba(184, 145, 122, 0.45)" strokeWidth="0.8" />
      <line x1="213" y1="50" x2="218" y2="54" stroke="rgba(184, 105, 122, 0.45)" strokeWidth="0.5" />
      <line x1="222" y1="48" x2="226" y2="52" stroke="rgba(184, 105, 122, 0.45)" strokeWidth="0.5" />
      <line x1="230" y1="56" x2="234" y2="60" stroke="rgba(184, 105, 122, 0.45)" strokeWidth="0.5" />
      <line x1="218" y1="64" x2="224" y2="62" stroke="rgba(184, 105, 122, 0.45)" strokeWidth="0.5" />
      <g>
        <path d="M225 78 L233 94 L217 94 Z" fill="rgba(91, 36, 50, 0.8)" stroke="rgba(184, 105, 122, 0.55)" strokeWidth="0.4" strokeLinejoin="round" />
        <ellipse cx="225" cy="76" rx="3" ry="3.5" fill="rgba(91, 36, 50, 0.9)" stroke="rgba(184, 105, 122, 0.55)" strokeWidth="0.4" />
        <path d="M225 72 L223 76 L227 76 Z" fill="rgba(91, 36, 50, 0.95)" />
        <g opacity="0.55" fontFamily="serif" fontStyle="italic">
          <text x="216" y="74" fontSize="4" fill="#B8697A">~</text>
          <text x="234" y="73" fontSize="4" fill="#B8697A">·</text>
          <text x="231" y="78" fontSize="3" fill="#B8697A">~</text>
        </g>
      </g>
      <line x1="225" y1="20" x2="225" y2="30" stroke="rgba(212, 168, 67, 0.5)" strokeWidth="0.5" />
      <path d="M222 30 L228 30 L226.5 36 L223.5 36 Z" fill="rgba(212, 168, 67, 0.7)" />
      <circle cx="225" cy="33" r="22" fill="rgba(212, 168, 67, 0.07)" />
      <circle cx="225" cy="33" r="12" fill="rgba(212, 168, 67, 0.12)" />
      <circle cx="160" cy="60" r="20" fill="rgba(212, 168, 67, 0.09)" />
      <path d="M168 60 L182 60" stroke="rgba(212, 168, 67, 0.55)" strokeWidth="0.9" strokeDasharray="2.5 2.5" />
      <path d="M179 57.5 L182 60 L179 62.5" fill="none" stroke="rgba(212, 168, 67, 0.65)" strokeWidth="0.9" />
      <g>
        <circle cx="160" cy="60" r="6.5" fill="#D4A843" stroke="#0F0E13" strokeWidth="1.5" />
        <text x="160" y="63" fontSize="7.5" fill="#0F0E13" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">L</text>
      </g>
      <g>
        <circle cx="135" cy="58" r="6.5" fill="#9B8EC4" stroke="#0F0E13" strokeWidth="1.5" />
        <text x="135" y="61" fontSize="7.5" fill="#0F0E13" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">K</text>
      </g>
      <g>
        <circle cx="115" cy="62" r="6.5" fill="#6BA5A5" stroke="#0F0E13" strokeWidth="1.5" />
        <text x="115" y="65" fontSize="7.5" fill="#0F0E13" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">S</text>
      </g>
      <g>
        <circle cx="95" cy="58" r="6.5" fill="#B8697A" stroke="#0F0E13" strokeWidth="1.5" />
        <text x="95" y="61" fontSize="7.5" fill="#0F0E13" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">T</text>
      </g>
    </svg>
  );
}

function TablePreview() {
  const [latestRoll, setLatestRoll] = useState(17);
  const [rolling, setRolling] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);

  useEffect(() => {
    setShowOutcome(false);
    setRolling(true);
    let cycles = 0;
    let outcomeTimer: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      if (cycles < 10) {
        setLatestRoll(Math.floor(Math.random() * 20) + 1);
        cycles++;
      } else {
        setLatestRoll(17);
        setRolling(false);
        clearInterval(interval);
        outcomeTimer = setTimeout(() => setShowOutcome(true), 1100);
      }
    }, 90);
    return () => {
      clearInterval(interval);
      clearTimeout(outcomeTimer);
    };
  }, []);

  return (
    <motion.div key="table" className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1fr_200px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ruby/15">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ruby/40 to-ruby/20 border border-ruby/40 flex items-center justify-center text-[10px] font-display font-medium text-ruby">SI</div>
            <div className="leading-tight">
              <p className="text-[12px] text-paper font-medium">The Hollow Depths &middot; Session 4</p>
              <p className="text-[10px] text-ruby/80">GM: Sarah Imani &middot; Round 7</p>
            </div>
          </div>
          <span className="text-[10px] text-emerald inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            Live &middot; 4 players
          </span>
        </div>
        <div className="relative bg-ink/40 border-b border-ruby/15 px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-text-tertiary uppercase tracking-[0.18em] font-display">Map &middot; East corridor</p>
            <p className="text-[9px] text-gold/80 inline-flex items-center gap-1.5">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" aria-hidden><circle cx="4.5" cy="4.5" r="2.5" /></svg>
              Lia is moving
            </p>
          </div>
          <DungeonMap />
        </div>
        <div className="flex-1 px-5 md:px-6 py-4 space-y-3 overflow-hidden min-w-0 flex flex-col justify-center">
          <div className="relative pl-4">
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-ruby/0 via-ruby/45 to-ruby/0" />
            <p className="text-[9px] text-ruby/85 uppercase tracking-[0.18em] font-display mb-1.5">The GM</p>
            <p className="text-[13px] text-paper italic font-reading leading-snug">
              &ldquo;The candlelight flickers at the far end of the corridor. Something moved. Roll for stealth.&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ruby/10 border border-ruby/35">
            <div className={`w-10 h-10 rounded border border-ruby/55 bg-ruby/15 flex items-center justify-center font-display text-paper text-[17px] font-medium ${rolling ? "animate-pulse" : ""}`}>{latestRoll}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-paper">
                <span className="font-medium text-gold">Lia</span> rolled <span className="font-medium">Stealth</span>
              </p>
              <p className="text-[10px] text-text-tertiary">d20 &middot; {rolling ? "rolling…" : "17 vs DC 14 · Success"}</p>
            </div>
            <span className="text-[9px] text-emerald inline-flex items-center gap-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              Now
            </span>
          </div>
          <AnimatePresence>
            {showOutcome && (
              <motion.div className="relative pl-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-ruby/0 via-ruby/55 to-ruby/0" />
                <p className="text-[9px] text-ruby/85 uppercase tracking-[0.18em] font-display mb-1.5 inline-flex items-center gap-1.5">
                  The GM
                  <span className="text-text-tertiary normal-case tracking-normal italic font-body text-[9.5px]">responds</span>
                </p>
                <p className="text-[13px] text-paper italic font-reading leading-snug">
                  &ldquo;She slips into the chamber unseen. A hooded figure stands at the stone table, muttering low over the runes — they don&apos;t look up.&rdquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="hidden md:flex flex-col border-l border-ruby/15 min-w-0">
        <div className="px-4 py-3 border-b border-ruby/15 flex items-center justify-between">
          <p className="text-[10px] text-ruby/85 uppercase tracking-[0.18em] font-display">Party</p>
          <span className="text-[9px] text-text-tertiary">Lia&apos;s turn</span>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[
            { initial: "L", name: "Lia", role: "Rogue", hp: 24, max: 30, avatar: "bg-gold/20 border-gold/35 text-gold", active: true },
            { initial: "K", name: "Kael", role: "Mage", hp: 18, max: 22, avatar: "bg-amethyst/20 border-amethyst/35 text-amethyst" },
            { initial: "S", name: "Sera", role: "Cleric", hp: 26, max: 28, avatar: "bg-teal/20 border-teal/35 text-teal" },
            { initial: "T", name: "Torr", role: "Warrior", hp: 31, max: 36, avatar: "bg-ruby/20 border-ruby/35 text-ruby" },
          ].map((p) => (
            <div key={p.name} className={`space-y-1.5 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full border text-[11px] flex items-center justify-center font-display font-medium ${p.avatar} ${p.active ? "ring-2 ring-gold/30 ring-offset-1 ring-offset-surface" : ""}`}>{p.initial}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-paper truncate font-medium">{p.name}</p>
                  <p className="text-[9px] text-text-tertiary">{p.role}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-text-tertiary">HP</span>
                  <span className="text-text-secondary tabular-nums">{p.hp}/{p.max}</span>
                </div>
                <div className="h-1 bg-walnut/30 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald/70 rounded-full" style={{ width: `${(p.hp / p.max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const MODE_INFO: Record<Mode, { label: string; poeticLabel: string; description: string; accent: "gold" | "amethyst" | "ruby"; cta: { label: string; href: string } }> = {
  solo: { label: "Solo", poeticLabel: "Alone at the Page", description: "Write at your own pace. Five formats, autosave, prompts when you're stuck.", accent: "gold", cta: { label: "Try the editor", href: "/demo/try" } },
  together: { label: "Together", poeticLabel: "The Writers' Room", description: "Co-write live with collaborators. Polls and reactions let readers shape what happens next.", accent: "amethyst", cta: { label: "Step inside a room", href: "/demo/writers-room" } },
  table: { label: "At the table", poeticLabel: "At the Table", description: "Run live story games. You narrate, players roll, the story unfolds in real time.", accent: "ruby", cta: { label: "Watch a session", href: "/demo/the-scroll" } },
};

function ModeChip({ mode, active, onClick }: { mode: Mode; active: boolean; onClick: () => void }) {
  const info = MODE_INFO[mode];
  const variants = {
    gold: { border: "border-gold/45", bg: "bg-gold/8", text: "text-gold" },
    amethyst: { border: "border-amethyst/45", bg: "bg-amethyst/8", text: "text-amethyst" },
    ruby: { border: "border-ruby/45", bg: "bg-ruby/8", text: "text-ruby" },
  };
  const v = variants[info.accent];
  return (
    <button onClick={onClick} className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-300 ${active ? `${v.border} ${v.bg}` : "border-border bg-surface/25 hover:border-border-active hover:bg-surface/40"}`}>
      <p className={`font-display text-[14px] font-medium mb-1 transition-colors duration-300 ${active ? v.text : "text-paper"}`}>{info.label}</p>
      <p className="text-[11.5px] text-text-secondary leading-snug font-body">{info.description}</p>
    </button>
  );
}

function InteractiveSwitcher() {
  const [mode, setMode] = useState<Mode>("solo");
  const info = MODE_INFO[mode];
  const borderByAccent = { gold: "border-gold/25", amethyst: "border-amethyst/25", ruby: "border-ruby/25" };
  const ctaTextByAccent = { gold: "text-gold hover:text-paper", amethyst: "text-amethyst hover:text-paper", ruby: "text-ruby hover:text-paper" };

  return (
    <section className="relative px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div className="text-center mb-10 md:mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}>
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">Three modes</p>
          <h2 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-tight italic">See how stories happen here.</h2>
        </motion.div>
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, delay: 0.1 }}>
          <ModeChip mode="solo" active={mode === "solo"} onClick={() => setMode("solo")} />
          <ModeChip mode="together" active={mode === "together"} onClick={() => setMode("together")} />
          <ModeChip mode="table" active={mode === "table"} onClick={() => setMode("table")} />
        </motion.div>
        <motion.div className={`relative w-full min-h-[480px] md:min-h-[520px] rounded-2xl border ${borderByAccent[info.accent]} bg-surface/55 backdrop-blur-sm overflow-hidden transition-colors duration-500`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.2 }}>
          <AnimatePresence mode="wait">
            {mode === "solo" && <SoloPreview />}
            {mode === "together" && <TogetherPreview />}
            {mode === "table" && <TablePreview />}
          </AnimatePresence>
        </motion.div>
        <div className="text-center mt-8">
          <p className="font-display italic text-paper text-lg mb-3">{info.poeticLabel}</p>
          <Link href={info.cta.href} className={`group inline-flex items-center gap-1.5 text-[13px] font-display italic transition-colors duration-300 ${ctaTextByAccent[info.accent]}`}>
            {info.cta.label}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </Link>
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
        <motion.div className="flex items-end justify-between mb-8 md:mb-10" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-display mb-2">From the library</p>
            <h2 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-[1.1]">
              Happening <span className="text-gold italic">now</span>
            </h2>
          </div>
          <Link href="/browse" className="hidden sm:inline-flex items-center gap-2 text-text-secondary hover:text-gold text-sm transition-colors font-body">
            See all
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {SHELF_STORIES.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <Link href="/browse" className="group block">
                <div className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-gradient-to-br ${s.accent} mb-3 transition-all duration-500 group-hover:border-gold/30`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-void/85 via-void/15 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-display text-paper text-[14px] font-medium leading-tight">{s.title}</p>
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)" }} aria-hidden />
      <div className="relative max-w-2xl mx-auto">
        <motion.h2 className="font-display text-4xl sm:text-5xl text-paper font-medium leading-[1.1]" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          Your <span className="text-gold italic">next story</span> is waiting.
        </motion.h2>
        <motion.p className="mt-5 text-text-secondary text-base md:text-lg font-body leading-relaxed" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}>
          Whether you write novels or read them, draw comics or devour them — there is a place for you here.
        </motion.p>
        <motion.div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}>
          <Link href="/browse" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-black font-body font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300">Browse stories</Link>
          <Link href="/demo/try" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text font-body font-medium text-sm tracking-wide hover:text-paper hover:border-gold/30 transition-all duration-300">Start writing</Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Mockup badge ────────────────────────────────────────────

function MockupBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-elevated/95 backdrop-blur-md border border-gold/25 shadow-[var(--t-shadow-modal)]">
      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      <span className="text-[11px] text-text-secondary font-body">v3 · Editorial</span>
      <Link href="/mockup-homepage" className="text-[11px] text-gold hover:text-gold-light transition-colors font-body underline-offset-2 hover:underline">v1</Link>
      <span className="text-text-tertiary text-[11px]" aria-hidden>·</span>
      <Link href="/mockup-homepage-v2" className="text-[11px] text-gold hover:text-gold-light transition-colors font-body underline-offset-2 hover:underline">v2</Link>
      <span className="text-text-tertiary text-[11px]" aria-hidden>·</span>
      <Link href="/" className="text-[11px] text-text-secondary hover:text-paper transition-colors font-body">Live</Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function MockupHomepageV3() {
  return (
    <main className="bg-void min-h-screen overflow-x-hidden font-body text-text">
      <Hero />
      <VideoBand />
      <FeaturedSpread />
      <InteractiveSwitcher />
      <HappeningNow />
      <FinalCTA />
      <MockupBadge />
    </main>
  );
}
