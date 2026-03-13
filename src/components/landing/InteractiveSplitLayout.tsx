"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";

// ── Seeded pseudo-random to avoid hydration mismatches ──────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Firefly / ember particles ───────────────────────────────
const PARTICLE_COUNT = 28;
const PARTICLE_SEED = seededRandom(42);
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: PARTICLE_SEED() * 100, // percentage across viewport
  startY: 90 + PARTICLE_SEED() * 20, // start near bottom (percentage)
  endY: -(10 + PARTICLE_SEED() * 30), // drift above top
  size: 1.5 + PARTICLE_SEED() * 3,
  duration: 8 + PARTICLE_SEED() * 12,
  delay: PARTICLE_SEED() * 10,
  drift: (PARTICLE_SEED() - 0.5) * 40, // horizontal drift in px
  opacity: 0.15 + PARTICLE_SEED() * 0.4,
}));

// ── Secondary ambient motes (very small, very subtle) ───────
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

// ── Content Formats ─────────────────────────────────────────
const FORMATS = [
  {
    id: "novels",
    label: "Novels & Stories",
    desc: "Novels, novellas, short stories, serial fiction. The timeless art of prose, from first sentence to final page.",
    accent: "text-gold",
    bgAccent: "bg-gold/10",
    borderAccent: "border-gold/20",
    icon: "\u2728",
  },
  {
    id: "webtoon",
    label: "Webtoons & Comics",
    desc: "Vertical-scroll comics, manga, graphic novels. Where art and narrative become inseparable.",
    accent: "text-teal",
    bgAccent: "bg-teal/10",
    borderAccent: "border-teal/20",
    icon: "\u25A0",
  },
  {
    id: "poetry",
    label: "Poetry",
    desc: "Poems, collections, spoken word. Language distilled to its most potent form.",
    accent: "text-amethyst",
    bgAccent: "bg-amethyst/10",
    borderAccent: "border-amethyst/20",
    icon: "\u2756",
  },
  {
    id: "illustrated",
    label: "Illustrated Stories",
    desc: "Where text and art are equal partners. Stories that live in the space between word and image.",
    accent: "text-copper",
    bgAccent: "bg-copper/10",
    borderAccent: "border-copper/20",
    icon: "\u2741",
  },
  {
    id: "screenplay",
    label: "Screenplays & Scripts",
    desc: "Film, TV, stage plays, audio drama. The blueprint for worlds that will be performed.",
    accent: "text-ruby",
    bgAccent: "bg-ruby/10",
    borderAccent: "border-ruby/20",
    icon: "\u25C8",
  },
];

// ── Genres ───────────────────────────────────────────────────
const GENRES = [
  { id: "fantasy", label: "Fantasy", accent: "text-amethyst" },
  { id: "scifi", label: "Sci-Fi", accent: "text-teal" },
  { id: "romance", label: "Romance", accent: "text-ruby" },
  { id: "mystery", label: "Mystery", accent: "text-amethyst" },
  { id: "thriller", label: "Thriller", accent: "text-ruby" },
  { id: "horror", label: "Horror", accent: "text-ruby" },
  { id: "historical", label: "Historical", accent: "text-copper" },
  { id: "litfic", label: "Literary", accent: "text-text-secondary" },
  { id: "adventure", label: "Adventure", accent: "text-emerald" },
  { id: "cyberpunk", label: "Cyberpunk", accent: "text-teal" },
  { id: "darkfantasy", label: "Dark Fantasy", accent: "text-amethyst" },
  { id: "sliceoflife", label: "Slice of Life", accent: "text-copper" },
  { id: "wuxia", label: "Wuxia", accent: "text-ruby" },
  { id: "isekai", label: "Isekai", accent: "text-emerald" },
  { id: "litrpg", label: "LitRPG", accent: "text-emerald" },
  { id: "mythology", label: "Mythology", accent: "text-gold" },
];

// ── Floating Particles Component ────────────────────────────
function FireflyParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
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

// ── Hero Section ────────────────────────────────────────────
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const headlineY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const particleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
    >
      {/* Warm radial glow behind headline */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Firefly particles layer */}
      <motion.div className="absolute inset-0" style={{ opacity: particleOpacity }}>
        <FireflyParticles />
      </motion.div>

      {/* Central content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto"
        style={{ y: headlineY, opacity: headlineOpacity }}
      >
        {/* Quiloria wordmark */}
        <motion.p
          className="section-label mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        >
          Quiloria
        </motion.p>

        {/* Headline */}
        <motion.h1
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-paper font-medium leading-[1.05] tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
        >
          Every story begins{" "}
          <span className="text-gold italic">with a single word</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mt-6 md:mt-8 text-text-secondary text-base md:text-lg font-body leading-relaxed max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          A place for writers and readers who believe stories deserve
          more than a feed. Novels, comics, poetry, screenplays — all
          under one roof, written with care.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-5 w-full sm:w-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          <Link
            href="/create"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-void font-body font-semibold text-sm tracking-wide
              hover:bg-gold-light transition-all duration-300
              shadow-[0_0_30px_rgba(200,150,60,0.2),0_0_60px_rgba(200,150,60,0.08)]
              hover:shadow-[0_0_40px_rgba(200,150,60,0.3),0_0_80px_rgba(200,150,60,0.12)]"
          >
            Begin Writing
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text-secondary font-body font-medium text-sm tracking-wide
              hover:text-paper hover:border-gold/30 transition-all duration-300"
          >
            Explore Stories
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <span className="text-text-ghost text-[10px] uppercase tracking-[0.2em] font-display">
          Scroll to explore
        </span>
        <motion.div
          className="w-px h-6 bg-gradient-to-b from-gold/40 to-transparent"
          animate={{ scaleY: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}

// ── Video Showcase — autoplay on scroll ─────────────────────
function VideoShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.92, 1, 1, 0.96]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.3]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Autoplay when scrolled into view, pause when out
  useEffect(() => {
    const video = videoRef.current;
    const container = ref.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section ref={ref} className="relative py-16 md:py-24 px-6">
      {/* Warm ambient glow behind the video frame */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[1000px] aspect-video pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.08) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <motion.div
          className="flourish mb-12 md:mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1 }}
        >
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-text-ghost px-4">
            Words Come Alive
          </span>
        </motion.div>

        {/* Video frame */}
        <motion.div
          style={{ scale, opacity }}
          className="relative mx-auto max-w-4xl"
        >
          {/* Ornamental frame */}
          <div className="relative rounded-2xl overflow-hidden">
            {/* Outer gold border glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/20 via-gold/8 to-gold/15 pointer-events-none" />

            {/* Corner ornaments */}
            <div className="absolute top-0 left-0 w-8 h-8 z-20 pointer-events-none">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-gold/40">
                <path d="M0 8V0h8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M0 0l6 6" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute top-0 right-0 w-8 h-8 z-20 pointer-events-none">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-gold/40">
                <path d="M32 8V0h-8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M32 0l-6 6" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-8 h-8 z-20 pointer-events-none">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-gold/40">
                <path d="M0 24v8h8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M0 32l6-6" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 z-20 pointer-events-none">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-gold/40">
                <path d="M32 24v8h-8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M32 32l-6-6" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
              </svg>
            </div>

            {/* Video container */}
            <div
              className="relative aspect-video bg-ink rounded-2xl overflow-hidden border border-gold/10 cursor-pointer group"
              onClick={handlePlay}
            >
              <video
                ref={videoRef}
                src="/hero-video.mp4"
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Play/pause overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                  isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                }`}
              >
                <div className="absolute inset-0 bg-void/30" />
                <motion.div
                  className="relative z-10 w-20 h-20 rounded-full bg-void/60 backdrop-blur-sm border border-gold/25 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gold ml-1">
                      <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" />
                    </svg>
                  )}
                </motion.div>
              </div>

              {/* Mute/unmute button */}
              <button
                onClick={handleMute}
                className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-void/60 backdrop-blur-sm border border-gold/25 flex items-center justify-center hover:bg-void/80 transition-all duration-300"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M19.07 4.93a10 10 0 010 14.14" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                )}
              </button>

              {/* Inner shadow for depth */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.4),inset_0_-2px_20px_rgba(0,0,0,0.2)]" />

              {/* Film grain */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:128px_128px]" />
            </div>
          </div>

          {/* Caption */}
          <motion.p
            className="text-center mt-6 text-text-ghost text-[12px] font-body italic"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            From the writer&apos;s imagination to the reader&apos;s world — stories that come alive.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Format Carousel ─────────────────────────────────────────
function FormatShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FORMATS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fmt = FORMATS[activeIdx];

  return (
    <section className="relative py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <motion.div
          className="flourish mb-16 md:mb-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
        >
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-text-ghost px-4">
            Every Form of Story
          </span>
        </motion.div>

        {/* Active format spotlight */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* Left: big format name */}
          <motion.div
            className="flex-1 min-w-0"
            key={fmt.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className={`text-sm font-display uppercase tracking-[0.15em] ${fmt.accent} opacity-70`}>
              {fmt.icon}
            </span>
            <h2 className={`font-display text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.1] mt-3 ${fmt.accent}`}>
              {fmt.label}
            </h2>
            <p className="text-text-secondary text-base md:text-lg leading-relaxed mt-5 max-w-md font-body">
              {fmt.desc}
            </p>
          </motion.div>

          {/* Right: format cards as tabs */}
          <div className="flex flex-col gap-2.5 lg:w-72 w-full">
            {FORMATS.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveIdx(i)}
                className={`card-page text-left px-5 py-4 transition-all duration-300 group
                  ${i === activeIdx ? `${f.borderAccent} ${f.bgAccent}` : "opacity-50 hover:opacity-80"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-base ${f.accent}`}>{f.icon}</span>
                  <span className={`font-body text-sm font-medium ${i === activeIdx ? "text-paper" : "text-text-secondary"}`}>
                    {f.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex gap-2 mt-10 lg:mt-14">
          {FORMATS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActiveIdx(i)}
              className="py-2 group"
              aria-label={`Show ${f.label}`}
            >
              <div
                className={`h-[2px] rounded-full transition-all duration-500 ${
                  i === activeIdx ? `w-8 bg-gold` : "w-3 bg-walnut"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Genre Shelves ───────────────────────────────────────────
function GenreShelves() {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);

  return (
    <section className="relative py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <motion.div
          className="flourish mb-16 md:mb-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
        >
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-text-ghost px-4">
            The Shelves
          </span>
        </motion.div>

        {/* Genre grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {GENRES.map((genre, i) => (
            <motion.div
              key={genre.id}
              className="card-page group cursor-pointer px-5 py-4 flex items-center gap-3 transition-all duration-300"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              onMouseEnter={() => setHoveredGenre(genre.id)}
              onMouseLeave={() => setHoveredGenre(null)}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  hoveredGenre === genre.id ? "bg-gold scale-150" : "bg-walnut"
                }`}
              />
              <span
                className={`font-body text-sm transition-colors duration-300 ${
                  hoveredGenre === genre.id ? genre.accent : "text-text-secondary"
                }`}
              >
                {genre.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA Section ───────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative py-32 md:py-40 px-6">
      {/* Warm glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div
          className="flourish mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-text-ghost px-4">
            The Door Is Open
          </span>
        </motion.div>

        <motion.h2
          className="font-display text-4xl sm:text-5xl md:text-6xl text-paper font-medium leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Your story is waiting to be{" "}
          <span className="text-gold italic">told</span>
        </motion.h2>

        <motion.p
          className="mt-6 text-text-secondary text-base md:text-lg font-body leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Whether you write novels or read them, draw comics or devour them
          — there is a place for you here.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link
            href="/create"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-void font-body font-semibold text-sm tracking-wide
              hover:bg-gold-light transition-all duration-300
              shadow-[0_0_30px_rgba(200,150,60,0.2),0_0_60px_rgba(200,150,60,0.08)]
              hover:shadow-[0_0_40px_rgba(200,150,60,0.3),0_0_80px_rgba(200,150,60,0.12)]"
          >
            Begin Writing
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text-secondary font-body font-medium text-sm tracking-wide
              hover:text-paper hover:border-gold/30 transition-all duration-300"
          >
            Explore Stories
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function InteractiveSplitLayout() {
  return (
    <div className="relative w-full bg-void font-body text-text selection:bg-gold/20 selection:text-paper">
      <HeroSection />
      <VideoShowcase />
      <FormatShowcase />
      <GenreShelves />
      <FinalCTA />
    </div>
  );
}
