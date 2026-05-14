"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { FeaturedStoryData, ShelfStoryData } from "@/lib/landing-data";

// ── Fallback fixtures ───────────────────────────────────────
// Used when the server passes null/[] (fresh install with no public
// stories yet). Production traffic should never see these once the
// platform has real content.
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

const FOR_YOU_TAGS = ["Fantasy", "Slow-burn", "Sapphic", "Novella", "Found family"];

const SHELF_FALLBACK: ShelfStoryData[] = [
  { slug: "", title: "The Obsidian Crown", author: "Kaelen Thorne", genres: ["Fantasy"], coverImageUrl: null },
  { slug: "", title: "Whispering Pines", author: "Sarah Imani", genres: ["Mystery"], coverImageUrl: null },
  { slug: "", title: "Neon Grifters", author: "Cyborg2088", genres: ["Cyberpunk"], coverImageUrl: null },
  { slug: "", title: "Salt & Ruin", author: "Maren Holt", genres: ["Fantasy"], coverImageUrl: null },
  { slug: "", title: "The Hollow Depths", author: "Abysswalker", genres: ["Sci-Fi"], coverImageUrl: null },
];

// Cycling accent gradients for shelf tiles when no cover image is
// available — keeps the row visually varied instead of five identical
// neutral placeholders.
const SHELF_ACCENTS = [
  "from-gold/30 via-copper/15 to-walnut/20",
  "from-amethyst/30 via-walnut/20 to-ink",
  "from-teal/25 via-amethyst/15 to-ink",
  "from-ruby/25 via-copper/15 to-walnut/20",
  "from-teal/30 via-walnut/20 to-ink",
];

// Compact integer formatter — "12,400" not "12400", "1.2k" optional.
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return n.toLocaleString();
}

// Pull a sensible display author when the join returns null (deleted
// user, anonymous import, etc.).
function authorOrAnon(author: string | null): string {
  return author?.trim() || "Anonymous";
}

function storyHref(slug: string): string {
  return slug ? `/story/${slug}` : "/browse";
}

// ── Seeded pseudo-random to avoid hydration mismatches ──────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Firefly / ember particles ───────────────────────────────
// The brand signature. Fixed-position layer behind content so the
// ambient drift carries through the whole page, not just the hero.
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
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden
    >
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
          style={{
            width: m.size,
            height: m.size,
            left: `${m.x}%`,
          }}
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

// ── Hero ────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-12 md:pb-16 px-6 text-center">
      {/* Faint warm radial glow — keeps the candlelight continuity */}
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

  // Autoplay muted on scroll into view, pause when offscreen.
  // Respects prefers-reduced-motion: leaves the poster frame static.
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
          <div className="relative rounded-2xl overflow-hidden border border-gold/10 bg-ink">
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
function FeaturedStoryCell({ story }: { story: FeaturedStoryData }) {
  const blurb = story.synopsis?.trim() ?? "";
  const genre = story.genres[0];
  const meta: string[] = [];
  if (genre) meta.push(genre);
  meta.push(authorOrAnon(story.author));
  if (story.chapterCount > 0) {
    meta.push(`${story.chapterCount} chapter${story.chapterCount === 1 ? "" : "s"}`);
  }
  if (story.sparkCount > 0) {
    meta.push(`${formatCount(story.sparkCount)} spark${story.sparkCount === 1 ? "" : "s"}`);
  }

  return (
    <Link
      href={storyHref(story.slug)}
      className="group relative block rounded-2xl border border-gold/15 bg-surface/40 backdrop-blur-sm overflow-hidden hover:border-gold/30 hover:bg-surface/60 transition-all duration-500 h-full"
    >
      {/* Real cover when present, gradient placeholder otherwise. */}
      {story.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.coverImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-teal/15 via-amethyst/8 to-walnut/30 opacity-90" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-void/95 via-void/40 to-void/10" />
      <div className="relative p-6 md:p-8 min-h-[260px] flex flex-col justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80 font-display mb-3">
            Featured this week
          </p>
          <h3 className="font-display text-2xl md:text-3xl text-paper font-medium leading-[1.1] mb-3">
            {story.title}
          </h3>
          {blurb && (
            <p className="text-text text-sm leading-relaxed max-w-md mb-4 font-body">
              {blurb}
            </p>
          )}
          <p className="text-text-tertiary text-[12px] font-body">
            {meta.join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-gold text-[13px] font-body mt-6 group-hover:gap-3 transition-all duration-300">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 2h10v12H3z" />
            <path d="M6 2v12" />
          </svg>
          Read first chapter — free
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function ForYouCell() {
  return (
    <Link
      href="/browse"
      className="group relative block rounded-2xl border border-teal/15 bg-surface/40 backdrop-blur-sm overflow-hidden hover:border-teal/30 hover:bg-surface/60 transition-all duration-500 p-6 h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-transparent opacity-80" />
      <div className="relative h-full flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.2em] text-teal/80 font-display mb-3">
          For you
        </p>
        <h3 className="font-display text-xl text-paper font-medium leading-[1.2] mb-4">
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

function StatCell({
  eyebrow,
  headline,
  body,
  tone,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  tone: "gold" | "amethyst" | "sage";
}) {
  const borderClass =
    tone === "gold"
      ? "border-gold/15 hover:border-gold/30"
      : tone === "amethyst"
        ? "border-amethyst/15 hover:border-amethyst/30"
        : "border-sage/15 hover:border-sage/30";
  const eyebrowClass =
    tone === "gold" ? "text-gold/80" : tone === "amethyst" ? "text-amethyst/80" : "text-sage/80";
  const glowClass =
    tone === "gold" ? "bg-gold/5" : tone === "amethyst" ? "bg-amethyst/5" : "bg-sage/5";

  return (
    <div
      className={`group relative rounded-2xl border bg-surface/40 backdrop-blur-sm overflow-hidden p-6 hover:bg-surface/60 transition-all duration-500 h-full ${borderClass}`}
    >
      <div className={`absolute inset-0 ${glowClass} opacity-40`} />
      <div className="relative">
        <p
          className={`text-[10px] uppercase tracking-[0.2em] font-display mb-3 ${eyebrowClass}`}
        >
          {eyebrow}
        </p>
        <p className="font-display text-2xl text-paper font-medium leading-tight mb-2">
          {headline}
        </p>
        <p className="text-text-secondary text-[12.5px] leading-relaxed font-body">
          {body}
        </p>
      </div>
    </div>
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
            <StatCell
              tone="gold"
              eyebrow="Reading streak"
              headline="12 days"
              body="Small habits, real stories. Track every day you read."
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <StatCell
              tone="amethyst"
              eyebrow="Write together"
              headline="Co-write, live"
              body="Polls, reactions, and a writers' room that lets readers shape what happens next."
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <StatCell
              tone="sage"
              eyebrow="Earn"
              headline="No middlemen"
              body="Tips, subscriptions, chapter unlocks, paid commissions — built in."
            />
          </motion.div>
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
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-border mb-3 transition-all duration-500 group-hover:border-gold/25 ${
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
  // Real data when the server passes it; mock fixtures otherwise so a
  // brand-new install still renders something coherent.
  const featuredDisplay = featured ?? FEATURED_FALLBACK;
  const shelfDisplay = shelf.length > 0 ? shelf : SHELF_FALLBACK;

  return (
    <div className="relative w-full bg-void font-body text-text selection:bg-gold/20 selection:text-paper">
      {/* Brand-signature ambient layer — fireflies + motes drift behind every
         section, gated by prefers-reduced-motion inside the component. */}
      <FireflyParticles />
      <div className="relative z-10">
        <Hero />
        <VideoBand />
        <Bento featured={featuredDisplay} />
        <HappeningNow stories={shelfDisplay} />
        <FinalCTA />
      </div>
    </div>
  );
}
