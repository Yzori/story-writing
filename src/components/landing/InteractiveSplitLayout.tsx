"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeaturedStoryData, ShelfStoryData } from "@/lib/landing-data";

// ── Mock data (marketing illustration) ──────────────────────
// Used for cells whose claim ("12-day streak", "three writers in the room",
// "adventure previews") doesn't map to a single real user record on the anon
// homepage. Treat as art direction, not metrics.

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

// Real-data fallback fixtures — used when the server passes null/[]
// (fresh install with no public stories yet). Production traffic should
// never see these once the platform has real content.
const FEATURED_FALLBACK: FeaturedStoryData = {
  slug: "",
  title: "The salt-keeper's daughter",
  author: "Maren Holt",
  synopsis:
    "A cursed lighthouse, a missing brother, and a coast that remembers every shipwreck it has ever taken.",
  genres: ["Coastal fantasy"],
  chapterCount: 24,
  sparkCount: 12400,
  coverImageUrl: null,
};

const SHELF_FALLBACK: ShelfStoryData[] = [
  { slug: "", title: "The Obsidian Crown", author: "Kaelen Thorne", genres: ["Fantasy"], coverImageUrl: null },
  { slug: "", title: "Whispering Pines", author: "Sarah Imani", genres: ["Mystery"], coverImageUrl: null },
  { slug: "", title: "Neon Grifters", author: "Cyborg2088", genres: ["Cyberpunk"], coverImageUrl: null },
  { slug: "", title: "Salt & Ruin", author: "Maren Holt", genres: ["Fantasy"], coverImageUrl: null },
  { slug: "", title: "The Hollow Depths", author: "Abysswalker", genres: ["Sci-Fi"], coverImageUrl: null },
];

const SHELF_ACCENTS = [
  "from-gold/30 via-copper/15 to-walnut/20",
  "from-amethyst/30 via-walnut/20 to-ink",
  "from-teal/25 via-amethyst/15 to-ink",
  "from-ruby/25 via-copper/15 to-walnut/20",
  "from-teal/30 via-walnut/20 to-ink",
];

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return n.toLocaleString();
}

function authorOrAnon(author: string | null): string {
  return author?.trim() || "Anonymous";
}

function storyHref(slug: string): string {
  return slug ? `/story/${slug}` : "/browse";
}

// ── Seeded pseudo-random for hydration-safe particles ───────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PARTICLE_COUNT = 28;
const PARTICLE_SEED = seededRandom(42);
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: PARTICLE_SEED() * 100,
  startY: 90 + PARTICLE_SEED() * 20,
  endY: -(10 + PARTICLE_SEED() * 30),
  size: 1.5 + PARTICLE_SEED() * 3,
  duration: 8 + PARTICLE_SEED() * 12,
  delay: PARTICLE_SEED() * 10,
  drift: (PARTICLE_SEED() - 0.5) * 40,
  opacity: 0.15 + PARTICLE_SEED() * 0.4,
}));

const MOTE_SEED = seededRandom(137);
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: MOTE_SEED() * 100,
  startY: 70 + MOTE_SEED() * 40,
  size: 1 + MOTE_SEED() * 1.5,
  duration: 12 + MOTE_SEED() * 8,
  delay: MOTE_SEED() * 14,
  drift: (MOTE_SEED() - 0.5) * 20,
  opacity: 0.08 + MOTE_SEED() * 0.15,
}));

function FireflyParticles() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            filter: `blur(${p.size > 3 ? 1 : 0}px)`,
          }}
          initial={{ y: `${p.startY}vh`, x: 0, opacity: 0 }}
          animate={{
            y: `${p.endY}vh`,
            x: [0, p.drift, p.drift * 0.5, p.drift * 1.2, 0],
            opacity: [0, p.opacity, p.opacity * 0.6, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      {MOTES.map((m) => (
        <motion.div
          key={`mote-${m.id}`}
          className="absolute rounded-full bg-gold-light"
          style={{ width: m.size, height: m.size, left: `${m.x}%` }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 40}vh`,
            x: [0, m.drift, 0],
            opacity: [0, m.opacity, 0],
          }}
          transition={{
            duration: m.duration,
            repeat: Infinity,
            delay: m.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// ── Decorative helpers ──────────────────────────────────────
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
        Read, write, and <span className="text-gold italic">live in</span> stories.
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
  const frameRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Autoplay when scrolled into view, pause when out. Respects
  // prefers-reduced-motion: video stays paused on the poster frame so
  // the user can still press play manually via the controls below.
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

  // Mirror native play/pause state back into the controls so the icon
  // stays correct when autoplay/IntersectionObserver flips it.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolume = () => setIsMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVolume);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVolume);
    };
  }, []);

  // Track fullscreen state so the fullscreen icon swaps to "exit"
  // when the user enters fullscreen via the API or Escape key.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const toggleFullscreen = () => {
    const target = frameRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      target.requestFullscreen().catch(() => {});
    }
  };

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
          className="relative rounded-2xl overflow-hidden group"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/20 via-gold/8 to-gold/15 pointer-events-none z-0" />
          <div
            ref={frameRef}
            className="relative rounded-2xl overflow-hidden border border-gold/15 bg-ink"
          >
            <video
              ref={videoRef}
              src="/hero-video.mp4"
              className="w-full h-auto block aspect-video object-cover bg-ink"
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Quiloria — Where imagination becomes story"
              onClick={togglePlay}
            />
            <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.15),inset_0_-2px_12px_rgba(0,0,0,0.1)]" />

            {/* Controls. Visible on hover (desktop) and always on touch
               via focus-within. Bottom-right cluster keeps the editorial
               frame uncluttered while the user is just watching. */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                aria-pressed={isPlaying}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-void/70 backdrop-blur-md border border-gold/25 text-paper hover:bg-void/85 hover:border-gold/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void transition-colors"
              >
                {isPlaying ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                    <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" />
                    <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                    <path d="M3 2v8l7-4z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                aria-pressed={!isMuted}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-void/70 backdrop-blur-md border border-gold/25 text-paper hover:bg-void/85 hover:border-gold/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void transition-colors"
              >
                {isMuted ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6v4h2l3 2.5v-9L5 6H3z" fill="currentColor" />
                    <path d="M11 6l3 4M14 6l-3 4" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6v4h2l3 2.5v-9L5 6H3z" fill="currentColor" />
                    <path d="M10.5 5.5a3.5 3.5 0 010 5" />
                    <path d="M12.5 3.5a6 6 0 010 9" opacity="0.6" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                aria-pressed={isFullscreen}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-void/70 backdrop-blur-md border border-gold/25 text-paper hover:bg-void/85 hover:border-gold/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void transition-colors"
              >
                {isFullscreen ? (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 2v4H2M14 6h-4V2M2 10h4v4M10 14v-4h4" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                  </svg>
                )}
              </button>
            </div>
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
function FeaturedStoryCell({ story }: { story: FeaturedStoryData }) {
  const blurb = story.synopsis?.trim() ?? "";
  const genre = story.genres[0] ?? "Story";
  const meta: string[] = [];
  if (story.chapterCount > 0) {
    meta.push(`${story.chapterCount} chapter${story.chapterCount === 1 ? "" : "s"}`);
  }
  if (story.sparkCount > 0) {
    meta.push(`${formatCount(story.sparkCount)} spark${story.sparkCount === 1 ? "" : "s"}`);
  }

  return (
    <Link
      href={storyHref(story.slug)}
      className="group relative block rounded-2xl border border-gold/30 bg-surface/55 backdrop-blur-sm overflow-hidden hover:border-gold/45 hover:bg-surface/70 transition-all duration-500 h-full"
    >
      <BrassCorners />
      <GrainOverlay />
      <div className="relative grid grid-cols-1 sm:grid-cols-[200px_1fr] h-full">
        <div className="relative flex items-center justify-center p-8 min-h-[180px] sm:min-h-[260px] border-b sm:border-b-0 sm:border-r border-gold/15 overflow-hidden">
          {story.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.coverImageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-teal/25 via-amethyst/12 to-walnut/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-void/45 via-void/10 to-transparent pointer-events-none" />
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
            <p className="font-display text-[12px] italic text-paper/85 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {genre}
            </p>
          </div>
        </div>
        <div className="relative p-6 md:p-7 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/85 font-display mb-2.5">
              Featured this week
            </p>
            <h3 className="font-display text-2xl md:text-[26px] text-paper font-medium leading-[1.1] mb-3">
              {story.title}
            </h3>
            {blurb && (
              <p className="text-text-secondary text-[13.5px] leading-relaxed italic font-body mb-4 max-w-md">
                {blurb}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary font-body">
              <span className="px-2.5 py-1 rounded-full bg-walnut/40 text-text-secondary border border-border">
                {authorOrAnon(story.author)}
              </span>
              {meta.map((m, i) => (
                <span key={m} className="inline-flex items-center gap-2">
                  {i > 0 && <span aria-hidden>·</span>}
                  <span>{m}</span>
                </span>
              ))}
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

function AdventureCell() {
  return (
    <Link
      href="/demo-adventure"
      className="group relative block rounded-2xl border border-sage/25 bg-surface/55 backdrop-blur-sm overflow-hidden p-6 hover:border-sage/40 hover:bg-surface/70 transition-all duration-500 h-full"
    >
      <div className="absolute inset-0 bg-sage/5 opacity-50 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-sage/10 to-transparent pointer-events-none" />
      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-sage/85 font-display">
            Adventure mode
          </p>
          <span className="text-[10px] text-sage/90 font-body px-2 py-0.5 rounded-full bg-sage/10 border border-sage/25 whitespace-nowrap">
            Live table
          </span>
        </div>
        <h3 className="font-display text-xl text-paper font-medium leading-tight mb-4">
          Turn a story into a playable session
        </h3>
        <div className="relative mb-4 h-14 rounded-lg border border-sage/15 bg-void/25 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full text-sage/55" viewBox="0 0 220 72" fill="none" aria-hidden>
            <path d="M18 54 C52 20 82 24 110 42 S166 58 202 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="4 6" />
            <circle cx="18" cy="54" r="4" fill="currentColor" opacity="0.8" />
            <circle cx="110" cy="42" r="4" fill="currentColor" opacity="0.55" />
            <circle cx="202" cy="18" r="4" fill="currentColor" opacity="0.8" />
          </svg>
          <div className="absolute left-4 top-3 px-2 py-1 rounded-md bg-surface/80 border border-sage/20 text-[10px] text-sage font-mono">
            d20: 17
          </div>
          <div className="absolute right-4 bottom-3 px-2 py-1 rounded-md bg-walnut/40 border border-border text-[10px] text-text-secondary font-body">
            Next turn
          </div>
        </div>
        <p className="text-text-secondary text-[12px] font-body leading-relaxed mb-4">
          Maps, dice rolls, turns, and audience pulse keep the fiction moving.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary font-body mt-auto">
          <span className="px-2 py-1 rounded-full bg-walnut/30 border border-border">Map</span>
          <span className="px-2 py-1 rounded-full bg-walnut/30 border border-border">Rolls</span>
          <span className="px-2 py-1 rounded-full bg-walnut/30 border border-border">Session log</span>
        </div>
      </div>
    </Link>
  );
}

function Bento({ featured }: { featured: FeaturedStoryData }) {
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
            <FeaturedStoryCell story={featured} />
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
            <AdventureCell />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Interactive mode switcher ───────────────────────────────
// Three pills, one preview canvas. Each mode swaps an animated in-product
// moment so a 10-second visitor can SEE what authoring looks like in each
// mode instead of reading three feature paragraphs. Reduced-motion users
// still get the static frame of whichever mode is selected — only the
// auto-running animations inside (typing cursor, dice cycle) are gated.
type Mode = "solo" | "together" | "table";

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

const ROOM_CHAT_AVATAR: Record<"MH" | "SI" | "C2", { ring: string; text: string; bg: string }> = {
  MH: { ring: "border-gold/40", text: "text-gold", bg: "bg-gradient-to-br from-gold/40 to-copper/25" },
  SI: { ring: "border-amethyst/40", text: "text-amethyst", bg: "bg-gradient-to-br from-amethyst/40 to-amethyst/15" },
  C2: { ring: "border-teal/40", text: "text-teal", bg: "bg-gradient-to-br from-teal/40 to-teal/15" },
};

function SoloPreview() {
  const reduceMotion = useReducedMotion();
  const [chars, setChars] = useState(reduceMotion ? STORY_LIVE_LINE.length : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setChars((prev) => (prev >= STORY_LIVE_LINE.length + 25 ? 0 : prev + 1));
    }, 55);
    return () => clearInterval(interval);
  }, [reduceMotion]);
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
              <p className="text-[10px] text-text-tertiary">writing · The salt-keeper&apos;s daughter</p>
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
            {chars <= STORY_LIVE_LINE.length && !reduceMotion && (
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
              <div
                key={n}
                className={`flex items-center gap-2 text-[10.5px] font-body ${n === 12 ? "text-paper" : "text-text-tertiary"}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${n < 12 ? "bg-gold/50" : "bg-gold animate-pulse"}`}
                />
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/40 to-copper/25 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-gold">
                MH
              </div>
              <div className="-ml-2 w-7 h-7 rounded-full bg-gradient-to-br from-amethyst/40 to-amethyst/20 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-amethyst">
                SI
              </div>
              <div className="-ml-2 w-7 h-7 rounded-full bg-gradient-to-br from-teal/40 to-teal/20 border-2 border-surface flex items-center justify-center text-[10px] font-display font-medium text-teal">
                C2
              </div>
            </div>
            <div className="leading-tight">
              <p className="text-[12px] text-paper font-medium">3 writers in this room</p>
              <p className="text-[10px] text-amethyst/90 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                Live · 247 readers watching
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 md:px-7 py-5 font-reading text-paper text-[13px] leading-[1.85] overflow-hidden min-w-0">
          <p className="font-display text-paper text-[17px] italic mb-3.5">
            Chapter 12 — Beneath the Lighthouse
          </p>
          <p className="text-text mb-2.5">
            Lia opened the door. The candlelight stretched across the floor in a long, narrow blade.
          </p>
          <p className="text-text mb-2.5">
            She paused — listened — but the corridor was{" "}
            <span className="relative inline-block">
              <span className="bg-gold/15 px-0.5 rounded-sm">silent</span>
              <span className="absolute -top-[18px] left-0 inline-flex items-center gap-1 text-[9px] text-gold bg-gold/20 border border-gold/40 px-1.5 py-0.5 rounded-sm whitespace-nowrap font-body">
                <span className="w-0.5 h-2.5 bg-gold animate-pulse" />
                MH
              </span>
            </span>
            .
          </p>
          <p className="text-text mb-2.5">
            Beyond the threshold, the smell of{" "}
            <span className="bg-amethyst/20 px-0.5 rounded-sm">salt and old paper</span> drifted
            toward her. It was a smell she remembered from{" "}
            <span className="relative inline-block">
              before
              <span className="absolute -top-[18px] left-0 inline-flex items-center gap-1 text-[9px] text-amethyst bg-amethyst/20 border border-amethyst/40 px-1.5 py-0.5 rounded-sm whitespace-nowrap font-body">
                <span className="w-0.5 h-2.5 bg-amethyst animate-pulse" />
                SI
              </span>
            </span>{" "}
            her brother had gone.
          </p>
          <p className="text-text-secondary italic">
            <span className="inline-flex items-center gap-1 text-[10px] text-teal/85 mr-1.5">
              <span className="w-0.5 h-2.5 bg-teal animate-pulse" />
              C2 is writing
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
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full ${av.bg} border ${av.ring} flex items-center justify-center text-[9px] font-display font-medium ${av.text}`}
                >
                  {m.author}
                </div>
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
        <pattern id="stones" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="rgba(30, 29, 42, 0.5)" />
          <path d="M0 14 L14 14 M14 0 L14 14" stroke="rgba(58, 56, 80, 0.45)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="15" y="40" width="170" height="40" fill="url(#stones)" stroke="rgba(184, 145, 122, 0.55)" strokeWidth="1.4" />
      <rect x="185" y="20" width="80" height="75" fill="url(#stones)" stroke="rgba(184, 145, 122, 0.55)" strokeWidth="1.4" />
      <line x1="184.5" y1="40" x2="184.5" y2="50" stroke="rgba(17,14,9,1)" strokeWidth="2.6" />
      <line x1="184.5" y1="70" x2="184.5" y2="80" stroke="rgba(17,14,9,1)" strokeWidth="2.6" />
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
          <text x="216" y="74" fontSize="4" fill="#CE7186">~</text>
          <text x="234" y="73" fontSize="4" fill="#CE7186">·</text>
          <text x="231" y="78" fontSize="3" fill="#CE7186">~</text>
        </g>
      </g>
      <line x1="225" y1="20" x2="225" y2="30" stroke="rgba(224, 169, 62, 0.5)" strokeWidth="0.5" />
      <path d="M222 30 L228 30 L226.5 36 L223.5 36 Z" fill="rgba(224, 169, 62, 0.7)" />
      <circle cx="225" cy="33" r="22" fill="rgba(224, 169, 62, 0.07)" />
      <circle cx="225" cy="33" r="12" fill="rgba(224, 169, 62, 0.12)" />
      <circle cx="160" cy="60" r="20" fill="rgba(224, 169, 62, 0.09)" />
      <path d="M168 60 L182 60" stroke="rgba(224, 169, 62, 0.55)" strokeWidth="0.9" strokeDasharray="2.5 2.5" />
      <path d="M179 57.5 L182 60 L179 62.5" fill="none" stroke="rgba(224, 169, 62, 0.65)" strokeWidth="0.9" />
      <g>
        <circle cx="160" cy="60" r="6.5" fill="#E0A93E" stroke="#110E09" strokeWidth="1.5" />
        <text x="160" y="63" fontSize="7.5" fill="#110E09" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">L</text>
      </g>
      <g>
        <circle cx="135" cy="58" r="6.5" fill="#AC9CDE" stroke="#110E09" strokeWidth="1.5" />
        <text x="135" y="61" fontSize="7.5" fill="#110E09" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">K</text>
      </g>
      <g>
        <circle cx="115" cy="62" r="6.5" fill="#72B5B2" stroke="#110E09" strokeWidth="1.5" />
        <text x="115" y="65" fontSize="7.5" fill="#110E09" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">S</text>
      </g>
      <g>
        <circle cx="95" cy="58" r="6.5" fill="#CE7186" stroke="#110E09" strokeWidth="1.5" />
        <text x="95" y="61" fontSize="7.5" fill="#110E09" textAnchor="middle" fontWeight="700" fontFamily="system-ui, sans-serif">T</text>
      </g>
    </svg>
  );
}

function TablePreview() {
  const reduceMotion = useReducedMotion();
  const [latestRoll, setLatestRoll] = useState(17);
  const [rolling, setRolling] = useState(!reduceMotion);
  const [showOutcome, setShowOutcome] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
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
  }, [reduceMotion]);

  return (
    <motion.div
      key="table"
      className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1fr_200px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ruby/15">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ruby/40 to-ruby/20 border border-ruby/40 flex items-center justify-center text-[10px] font-display font-medium text-ruby">
              SI
            </div>
            <div className="leading-tight">
              <p className="text-[12px] text-paper font-medium">The Hollow Depths · Session 4</p>
              <p className="text-[10px] text-ruby/80">GM: Sarah Imani · Round 7</p>
            </div>
          </div>
          <span className="text-[10px] text-emerald inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            Live · 4 players
          </span>
        </div>

        <div className="relative bg-ink/40 border-b border-ruby/15 px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-text-tertiary uppercase tracking-[0.18em] font-display">Map · East corridor</p>
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
            <p className="text-[9px] text-ruby/85 uppercase tracking-[0.18em] font-display mb-1.5">
              The GM
            </p>
            <p className="text-[13px] text-paper italic font-reading leading-snug">
              &ldquo;The candlelight flickers at the far end of the corridor. Something moved. Roll for stealth.&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ruby/10 border border-ruby/35">
            <div
              className={`w-10 h-10 rounded border border-ruby/55 bg-ruby/15 flex items-center justify-center font-display text-paper text-[17px] font-medium ${rolling ? "animate-pulse" : ""}`}
            >
              {latestRoll}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-paper">
                <span className="font-medium text-gold">Lia</span> rolled <span className="font-medium">Stealth</span>
              </p>
              <p className="text-[10px] text-text-tertiary">
                d20 · {rolling ? "rolling…" : "17 vs DC 14 · Success"}
              </p>
            </div>
            <span className="text-[9px] text-emerald inline-flex items-center gap-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              Now
            </span>
          </div>

          <AnimatePresence>
            {showOutcome && (
              <motion.div
                className="relative pl-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
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
                <div
                  className={`w-7 h-7 rounded-full border text-[11px] flex items-center justify-center font-display font-medium ${p.avatar} ${p.active ? "ring-2 ring-gold/30 ring-offset-1 ring-offset-surface" : ""}`}
                >
                  {p.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-paper truncate font-medium">{p.name}</p>
                  <p className="text-[9px] text-text-tertiary">{p.role}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-text-tertiary">HP</span>
                  <span className="text-text-secondary tabular-nums">
                    {p.hp}/{p.max}
                  </span>
                </div>
                <div className="h-1 bg-walnut/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald/70 rounded-full"
                    style={{ width: `${(p.hp / p.max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const MODE_INFO: Record<
  Mode,
  {
    label: string;
    poeticLabel: string;
    description: string;
    accent: "gold" | "amethyst" | "ruby";
    cta: { label: string; href: string };
  }
> = {
  solo: {
    label: "Solo",
    poeticLabel: "Alone at the Page",
    description:
      "Write at your own pace. Five formats, autosave, prompts when you're stuck.",
    accent: "gold",
    cta: { label: "Try the editor", href: "/demo/try" },
  },
  together: {
    label: "Together",
    poeticLabel: "The Writers' Room",
    description:
      "Co-write live with collaborators. Polls and reactions let readers shape what happens next.",
    accent: "amethyst",
    cta: { label: "Step inside a room", href: "/demo/writers-room" },
  },
  table: {
    label: "At the table",
    poeticLabel: "At the Table",
    description:
      "Run live story games. You narrate, players roll, the story unfolds in real time.",
    accent: "ruby",
    cta: { label: "Watch a session", href: "/demo/the-scroll" },
  },
};

function ModeChip({
  mode,
  active,
  onClick,
}: {
  mode: Mode;
  active: boolean;
  onClick: () => void;
}) {
  const info = MODE_INFO[mode];
  const variants = {
    gold: { border: "border-gold/45", bg: "bg-gold/8", text: "text-gold" },
    amethyst: { border: "border-amethyst/45", bg: "bg-amethyst/8", text: "text-amethyst" },
    ruby: { border: "border-ruby/45", bg: "bg-ruby/8", text: "text-ruby" },
  };
  const v = variants[info.accent];
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-300 ${
        active
          ? `${v.border} ${v.bg}`
          : "border-border bg-surface/25 hover:border-border-active hover:bg-surface/40"
      }`}
    >
      <p
        className={`font-display text-[14px] font-medium mb-1 transition-colors duration-300 ${
          active ? v.text : "text-paper"
        }`}
      >
        {info.label}
      </p>
      <p className="text-[11.5px] text-text-secondary leading-snug font-body">
        {info.description}
      </p>
    </button>
  );
}

function InteractiveSwitcher() {
  const [mode, setMode] = useState<Mode>("solo");
  const info = MODE_INFO[mode];

  const borderByAccent = {
    gold: "border-gold/25",
    amethyst: "border-amethyst/25",
    ruby: "border-ruby/25",
  };

  const ctaTextByAccent = {
    gold: "text-gold hover:text-paper",
    amethyst: "text-amethyst hover:text-paper",
    ruby: "text-ruby hover:text-paper",
  };

  return (
    <section className="relative px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
            Three modes
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-tight italic">
            See how stories happen here.
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ModeChip mode="solo" active={mode === "solo"} onClick={() => setMode("solo")} />
          <ModeChip mode="together" active={mode === "together"} onClick={() => setMode("together")} />
          <ModeChip mode="table" active={mode === "table"} onClick={() => setMode("table")} />
        </motion.div>

        <motion.div
          className={`relative w-full min-h-[480px] md:min-h-[520px] rounded-2xl border ${borderByAccent[info.accent]} bg-surface/55 backdrop-blur-sm overflow-hidden transition-colors duration-500`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {mode === "solo" && <SoloPreview />}
            {mode === "together" && <TogetherPreview />}
            {mode === "table" && <TablePreview />}
          </AnimatePresence>
        </motion.div>

        <div className="text-center mt-8">
          <p className="font-display italic text-paper text-lg mb-3">{info.poeticLabel}</p>
          <Link
            href={info.cta.href}
            className={`group inline-flex items-center gap-1.5 text-[13px] font-display italic transition-colors duration-300 ${ctaTextByAccent[info.accent]}`}
          >
            {info.cta.label}
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Happening now shelf ─────────────────────────────────────
function HappeningNow({ stories }: { stories: ShelfStoryData[] }) {
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
          {stories.map((s, i) => {
            const accent = SHELF_ACCENTS[i % SHELF_ACCENTS.length];
            const genre = s.genres[0] ?? "Story";
            return (
              <motion.div
                key={`${s.slug || "fallback"}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link href={storyHref(s.slug)} className="group block">
                  <div
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-border mb-3 transition-all duration-500 group-hover:border-gold/30 ${
                      s.coverImageUrl ? "bg-ink" : `bg-gradient-to-br ${accent}`
                    }`}
                  >
                    {s.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.coverImageUrl}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="font-display text-paper text-[14px] font-medium leading-tight">
                        {s.title}
                      </p>
                    </div>
                  </div>
                  <p className="text-text text-[13px] font-body">{authorOrAnon(s.author)}</p>
                  <p className="text-text-tertiary text-[11px] font-body mt-0.5">{genre}</p>
                </Link>
              </motion.div>
            );
          })}
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

// ── Main ────────────────────────────────────────────────────
interface Props {
  featured?: FeaturedStoryData | null;
  shelf?: ShelfStoryData[];
}

export default function InteractiveSplitLayout({ featured = null, shelf = [] }: Props = {}) {
  const featuredDisplay = featured ?? FEATURED_FALLBACK;
  const shelfDisplay = shelf.length > 0 ? shelf : SHELF_FALLBACK;

  return (
    <div className="relative w-full bg-void font-body text-text selection:bg-gold/20 selection:text-paper">
      <FireflyParticles />
      <div className="relative z-10">
        <Hero />
        <VideoBand />
        <Bento featured={featuredDisplay} />
        <InteractiveSwitcher />
        <HappeningNow stories={shelfDisplay} />
        <FinalCTA />
      </div>
    </div>
  );
}
