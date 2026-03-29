"use client";

import { motion, useScroll, useTransform, useMotionValue, AnimatePresence, animate } from "framer-motion";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StoryCard from "@/components/shared/StoryCard";

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

// ── Ink particle type ────────────────────────────────────────
type InkParticle = {
  id: number;
  left: number;
  lineY: number;
  offsetY: number;
  offsetX: number;
  size: number;
  hue: "dark" | "mid" | "light";
  elongated: boolean;
  fadeSpeed: number;
};

// ── Auth-aware "Begin Writing" CTA ──────────────────────────
function BeginWritingCTA() {
  const { data: session } = useSession();
  const href = session?.user ? "/create" : "/register?callbackUrl=/create";

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-void font-body font-semibold text-sm tracking-wide
        hover:bg-gold-light transition-all duration-300
        shadow-[0_0_30px_rgba(200,150,60,0.2),0_0_60px_rgba(200,150,60,0.08)]
        hover:shadow-[0_0_40px_rgba(200,150,60,0.3),0_0_80px_rgba(200,150,60,0.12)]"
    >
      Begin Writing
    </Link>
  );
}

// ── Hero Section with Quill Writing Animation ───────────────
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const headlineY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const particleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  // ── Quill writing animation state ──
  const progress = useMotionValue(0);
  const [writing, setWriting] = useState(false);
  const [writingDone, setWritingDone] = useState(false);
  const [inkParticles, setInkParticles] = useState<InkParticle[]>([]);
  const hasTriggered = useRef(false);
  const [shimmer, setShimmer] = useState(false);

  // Clip-path reveals for 3 text lines
  const line1Progress = useTransform(progress, [0, 33], [0, 100]);
  const line1Clip = useTransform(line1Progress, (p) =>
    `inset(0 ${100 - Math.max(0, Math.min(100, p))}% 0 0)`
  );
  const line2Progress = useTransform(progress, [33, 66], [0, 100]);
  const line2Clip = useTransform(line2Progress, (p) =>
    `inset(0 ${100 - Math.max(0, Math.min(100, p))}% 0 0)`
  );
  const line3Progress = useTransform(progress, [66, 100], [0, 100]);
  const line3Clip = useTransform(line3Progress, (p) =>
    `inset(0 ${100 - Math.max(0, Math.min(100, p))}% 0 0)`
  );

  // Quill position — tracks the writing edge
  const quillLeft = useTransform(progress, (p) => {
    if (p < 33) return `${(p / 33) * 100}%`;
    if (p < 66) return `${((p - 33) / 33) * 100}%`;
    return `${((p - 66) / 34) * 100}%`;
  });
  const quillTop = useTransform(progress, (p) => {
    if (p < 33) return "0%";
    if (p < 66) return "37%";
    return "70%";
  });

  // Handwriting micro-motion
  const bounceY = useTransform(progress, (p) =>
    Math.sin(p * 2.5) * 6 + Math.cos(p * 15) * 4
  );
  const tiltR = useTransform(progress, (p) =>
    Math.cos(p * 5) * 5 + Math.sin(p * 20) * 2
  );

  // Ink trail widths — glowing line that follows the quill on each text line
  const trail1Width = useTransform(progress, [0, 33], ["0%", "100%"]);
  const trail1Opacity = useTransform(progress, [0, 2, 33], [0, 0.6, 0.3]);
  const trail2Width = useTransform(progress, [33, 66], ["0%", "100%"]);
  const trail2Opacity = useTransform(progress, [33, 35, 66], [0, 0.6, 0.3]);
  const trail3Width = useTransform(progress, [66, 100], ["0%", "100%"]);
  const trail3Opacity = useTransform(progress, [66, 68, 100], [0, 0.6, 0.3]);
  const quillOpacity = useTransform(progress, (p) =>
    p > 0 && p < 99 ? 1 : 0
  );

  // Ink particle emitter — runs while writing
  useEffect(() => {
    if (!writing) return;
    let requestId: number;
    let lastEmit = 0;

    const loop = (time: number) => {
      if (time - lastEmit > 40) {
        const p = progress.get();
        if (p > 0 && p < 100) {
          let lineY = 0;
          let activeX = 0;
          if (p < 33) { lineY = 0; activeX = (p / 33) * 100; }
          else if (p < 66) { lineY = 37; activeX = ((p - 33) / 33) * 100; }
          else { lineY = 70; activeX = ((p - 66) / 34) * 100; }

          const hues: Array<"dark" | "mid" | "light"> = ["dark", "mid", "light"];
          const newParticles: InkParticle[] = [
            {
              id: Date.now() + Math.random(),
              left: activeX,
              lineY,
              offsetY: (Math.random() - 0.5) * 35,
              offsetX: (Math.random() - 0.5) * 25,
              size: Math.random() * 4 + 1,
              hue: hues[Math.floor(Math.random() * 3)],
              elongated: Math.random() > 0.65,
              fadeSpeed: 0.8 + Math.random() * 0.8,
            },
          ];
          // Occasional mist particle — very small, drifts further
          if (Math.random() > 0.5) {
            newParticles.push({
              id: Date.now() + Math.random() + 0.5,
              left: activeX + (Math.random() - 0.5) * 8,
              lineY,
              offsetY: (Math.random() - 0.5) * 50,
              offsetX: (Math.random() - 0.5) * 40,
              size: Math.random() * 2 + 0.5,
              hue: "light",
              elongated: false,
              fadeSpeed: 1.5 + Math.random() * 0.5,
            });
          }
          setInkParticles((prev) => [...prev, ...newParticles].slice(-60));
        }
        lastEmit = time;
      }
      requestId = requestAnimationFrame(loop);
    };

    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, [writing, progress]);

  // Auto-trigger writing when hero enters viewport
  useEffect(() => {
    const el = textContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          // Delay so the Quiloria label fades in first
          setTimeout(() => {
            setWriting(true);
            animate(progress, 100, {
              duration: 4.5,
              ease: [0.22, 0.1, 0.36, 1],
              onComplete: () => {
                setWriting(false);
                setWritingDone(true);
                setShimmer(true);
                setTimeout(() => setInkParticles([]), 1200);
                setTimeout(() => setShimmer(false), 2000);
              },
            });
          }, 800);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [progress]);

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

        {/* Headline with quill writing animation */}
        <h1
          ref={textContainerRef}
          className="relative font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-[1.15] tracking-tight"
        >
          {/* Line 1: "Every story" */}
          <div className="relative text-center">
            <motion.div className="text-paper whitespace-nowrap" style={{ clipPath: line1Clip }}>
              Every story
            </motion.div>
          </div>

          {/* Line 2: "begins with a" */}
          <div className="relative text-center">
            <motion.div className="whitespace-nowrap pr-2" style={{ clipPath: line2Clip }}>
              <span className="text-paper">begins </span>
              <span className="text-gold italic">with a</span>
            </motion.div>
          </div>

          {/* Line 3: "single word" */}
          <div className="relative text-center">
            <motion.div className="text-gold italic whitespace-nowrap" style={{ clipPath: line3Clip }}>
              single word
            </motion.div>
          </div>

          {/* Ink particles & quill overlay */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {/* Ink trails — glowing lines beneath each text line */}
            {[
              { width: trail1Width, opacity: trail1Opacity, top: "30%" },
              { width: trail2Width, opacity: trail2Opacity, top: "64%" },
              { width: trail3Width, opacity: trail3Opacity, top: "97%" },
            ].map((trail, i) => (
              <motion.div
                key={`trail-${i}`}
                className="absolute left-0 h-[2px] rounded-full"
                style={{
                  top: trail.top,
                  width: trail.width,
                  opacity: trail.opacity,
                  background:
                    "linear-gradient(90deg, rgba(200,150,60,0.05), rgba(200,150,60,0.5), rgba(240,210,140,0.8))",
                  boxShadow:
                    "0 0 12px rgba(200,150,60,0.3), 0 1px 4px rgba(200,150,60,0.2)",
                  filter: "blur(0.5px)",
                }}
              />
            ))}

            {/* Ink particles */}
            <AnimatePresence>
              {inkParticles.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ opacity: 0.9, scale: 0 }}
                  animate={{
                    opacity: 0,
                    scale: particle.elongated ? [0, 1.8, 2.2] : [0, 1.4, 1.6],
                    y: particle.offsetY + 15,
                    x: particle.offsetX,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: particle.fadeSpeed, ease: "easeOut" }}
                  className={`absolute ${particle.elongated ? "rounded-[40%]" : "rounded-full"}`}
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.lineY}%`,
                    width: particle.elongated ? particle.size * 2.5 : particle.size,
                    height: particle.size,
                    marginTop: "1.5em",
                    background:
                      particle.hue === "dark"
                        ? "rgba(140, 100, 30, 0.8)"
                        : particle.hue === "mid"
                          ? "var(--t-gold)"
                          : "rgba(240, 210, 140, 0.6)",
                    boxShadow:
                      particle.hue === "light"
                        ? "0 0 12px rgba(240, 210, 140, 0.4)"
                        : "0 0 6px rgba(200, 150, 60, 0.3)",
                  }}
                />
              ))}
            </AnimatePresence>

            {/* Quill pen */}
            <motion.div
              className="absolute pointer-events-none z-40"
              style={{
                left: quillLeft,
                top: quillTop,
                y: bounceY,
                rotate: tiltR,
                opacity: quillOpacity,
                marginTop: "0.2em",
              }}
            >
              <div className="relative -left-1 -top-[60px] origin-bottom-left w-[70px] h-[70px] md:w-[90px] md:h-[90px]">
                {/* Spark at tip — soft organic glow */}
                <motion.div
                  className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-paper"
                  style={{
                    boxShadow:
                      "0 0 8px var(--t-paper), 0 0 20px var(--t-gold), 0 0 40px rgba(200,150,60,0.3)",
                  }}
                  animate={{
                    scale: [1, 1.3, 1.1, 1.4, 1],
                    opacity: [0.7, 0.95, 0.8, 1, 0.7],
                  }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                />
                {/* Secondary warm halo */}
                <motion.div
                  className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(200,150,60,0.3) 0%, transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.5, 1.2, 1.6, 1],
                    opacity: [0.4, 0.7, 0.5, 0.8, 0.4],
                  }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                />
                {/* Feather SVG */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full text-gold drop-shadow-[0_4px_12px_var(--t-gold)]"
                  style={{ transform: "rotate(-10deg)" }}
                >
                  <path
                    d="M1 23C1 23 8.35858 20.806 12 15M1 23C1.65751 18.2709 3.01633 13.928 6.5 10C8.5 7.74712 11.4589 6.20815 14.5 5.5C18.6738 4.52802 23 4 23 4C23 4 22 8.5 20.5 12C19.5218 14.3175 17.6534 16.3262 15.5 17.5C12.5 19.1352 8 20 8 20L1 23Z"
                    fill="currentColor"
                    fillOpacity="0.2"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 4C23 4 19.5 5 17.5 7.5C15.5 10 14.5 13.5 12 15M23 4L20 8M21 5L17 9.5M18.5 6L14 11M16 8L12 13M12.5 11L9.5 15"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Completion shimmer — golden light sweeps across finished text */}
          <AnimatePresence>
            {shimmer && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="absolute top-0 h-full w-[30%]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(240,210,140,0.15), rgba(255,255,255,0.08), transparent)",
                    filter: "blur(16px)",
                  }}
                  initial={{ left: "-30%" }}
                  animate={{ left: "130%" }}
                  transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </h1>

        {/* Subheadline — visible immediately with subtle delay */}
        <motion.p
          className="mt-6 md:mt-8 text-text-secondary text-base md:text-lg font-body leading-relaxed max-w-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Write novels, poetry, screenplays &amp; comics. Read, react,
          and collaborate with fellow storytellers.
        </motion.p>

        {/* CTAs — visible immediately with subtle delay */}
        <motion.div
          className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-5 w-full sm:w-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <BeginWritingCTA />
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text-secondary font-body font-medium text-sm tracking-wide
              hover:text-paper hover:border-gold/30 transition-all duration-300"
          >
            Explore Stories
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll hint — appears with a delay */}
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
const FORMAT_COLORS: Record<string, string> = {
  novels: "200, 150, 60",
  webtoon: "45, 212, 191",
  poetry: "168, 85, 247",
  illustrated: "194, 120, 62",
  screenplay: "225, 29, 72",
};

function FormatShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timerKey, setTimerKey] = useState(0);

  const handleTabClick = useCallback((i: number) => {
    setActiveIdx(i);
    setPaused(true);
    setTimerKey((k) => k + 1);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setPaused(false);
      setTimerKey((k) => k + 1);
    }, 15000);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FORMATS.length);
      setTimerKey((k) => k + 1);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused]);

  const fmt = FORMATS[activeIdx];
  const rgb = FORMAT_COLORS[fmt.id] || FORMAT_COLORS.novels;

  return (
    <section className="relative py-24 md:py-32 px-6 overflow-hidden">
      {/* Ambient background orb — shifts color per format */}
      <motion.div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] pointer-events-none rounded-full"
        animate={{
          background: `radial-gradient(ellipse at center, rgba(${rgb}, 0.08) 0%, transparent 70%)`,
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        aria-hidden
      />

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
        <div
          className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => {
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
            setPaused(false);
            setTimerKey((k) => k + 1);
          }}
        >
          {/* Left: format showcase */}
          <motion.div
            className="flex-1 min-w-0"
            key={fmt.id}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Large format icon with ambient glow */}
            <div className="relative inline-block mb-4">
              <span className={`text-4xl md:text-5xl ${fmt.accent}`}>
                {fmt.icon}
              </span>
              <div
                className="absolute inset-0 -m-4 rounded-full blur-2xl pointer-events-none"
                style={{ background: `rgba(${rgb}, 0.25)` }}
              />
            </div>
            <h2 className={`font-display text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.1] mt-3 ${fmt.accent}`}>
              {fmt.label}
            </h2>
            <p className="text-text-secondary text-base md:text-lg leading-relaxed mt-5 max-w-md font-body">
              {fmt.desc}
            </p>
          </motion.div>

          {/* Right: format cards as tabs */}
          <div className="flex flex-col gap-2.5 lg:w-72 w-full">
            {FORMATS.map((f, i) => {
              const fRgb = FORMAT_COLORS[f.id] || FORMAT_COLORS.novels;
              const isActive = i === activeIdx;
              return (
                <button
                  key={f.id}
                  onClick={() => handleTabClick(i)}
                  className={`relative text-left px-5 py-4 rounded-xl border transition-all duration-300 group overflow-hidden
                    ${isActive
                      ? `${f.borderAccent} ${f.bgAccent}`
                      : "border-border bg-surface/30 opacity-50 hover:opacity-80 hover:bg-surface/50"
                    }`}
                >
                  {/* Active glow */}
                  {isActive && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at left center, rgba(${fRgb}, 0.1) 0%, transparent 70%)`,
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <span
                      className={`text-lg transition-transform duration-300 ${f.accent} ${isActive ? "scale-125" : "group-hover:scale-110"}`}
                    >
                      {f.icon}
                    </span>
                    <span className={`font-body text-sm font-medium transition-colors duration-300 ${isActive ? "text-paper" : "text-text-secondary"}`}>
                      {f.label}
                    </span>
                  </div>
                  {/* Active edge indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                      style={{ background: `rgb(${fRgb})` }}
                      layoutId="formatEdge"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bars with timer fill */}
        <div className="flex gap-2 mt-10 lg:mt-14 items-center">
          {FORMATS.map((f, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={f.id}
                onClick={() => handleTabClick(i)}
                className="py-2 group"
                aria-label={`Show ${f.label}`}
              >
                <div
                  className={`h-[2px] rounded-full transition-all duration-500 overflow-hidden ${
                    isActive ? "w-10 bg-elevated" : "w-3 bg-walnut"
                  }`}
                >
                  {isActive && !paused && (
                    <motion.div
                      key={timerKey}
                      className="h-full rounded-full"
                      style={{ background: `rgb(${FORMAT_COLORS[f.id] || FORMAT_COLORS.novels})` }}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 7, ease: "linear" }}
                    />
                  )}
                  {isActive && paused && (
                    <div
                      className="h-full rounded-full w-full"
                      style={{ background: `rgb(${FORMAT_COLORS[f.id] || FORMAT_COLORS.novels})` }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Genre Shelves ───────────────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  fantasy: "168, 85, 247",
  scifi: "45, 212, 191",
  romance: "225, 29, 72",
  mystery: "168, 85, 247",
  thriller: "225, 29, 72",
  horror: "200, 40, 40",
  historical: "194, 120, 62",
  litfic: "160, 160, 170",
  adventure: "16, 185, 129",
  cyberpunk: "45, 212, 191",
  darkfantasy: "130, 60, 200",
  sliceoflife: "194, 140, 80",
  wuxia: "225, 29, 72",
  isekai: "16, 185, 129",
  litrpg: "16, 185, 129",
  mythology: "200, 150, 60",
};

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
          {GENRES.map((genre, i) => {
            const rgb = GENRE_COLORS[genre.id] || "200, 150, 60";
            const isHovered = hoveredGenre === genre.id;

            return (
              <motion.div
                key={genre.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <Link
                  href={`/browse?genre=${genre.id}`}
                  className="group relative block overflow-hidden rounded-xl border border-border bg-surface/30 px-5 py-5 transition-all duration-300 hover:bg-surface/50"
                  onMouseEnter={() => setHoveredGenre(genre.id)}
                  onMouseLeave={() => setHoveredGenre(null)}
                  style={{
                    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: isHovered
                      ? `0 8px 30px rgba(${rgb}, 0.15), 0 0 0 1px rgba(${rgb}, 0.15)`
                      : "none",
                    borderColor: isHovered ? `rgba(${rgb}, 0.3)` : undefined,
                  }}
                >
                  {/* Ambient gradient on hover */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                    style={{
                      opacity: isHovered ? 1 : 0,
                      background: `radial-gradient(ellipse at bottom right, rgba(${rgb}, 0.1) 0%, transparent 70%)`,
                    }}
                  />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1.5 h-1.5 rounded-full transition-all duration-300 bg-walnut"
                        style={isHovered ? {
                          background: `rgb(${rgb})`,
                          transform: "scale(1.8)",
                          boxShadow: `0 0 10px rgba(${rgb}, 0.5)`,
                        } : undefined}
                      />
                      <span
                        className={`font-body text-sm transition-colors duration-300 ${
                          isHovered ? genre.accent : "text-text-secondary"
                        }`}
                      >
                        {genre.label}
                      </span>
                    </div>

                    {/* Explore arrow — slides in on hover */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`transition-all duration-300 ${
                        isHovered ? `${genre.accent} opacity-100 translate-x-0` : "opacity-0 -translate-x-1"
                      }`}
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Featured Stories Section ─────────────────────────────────
interface FeaturedStory {
  id: string;
  title: string;
  authorName: string | null;
  coverImageUrl: string | null;
  genres: string[];
  totalWords: number;
  chapterCount: number;
  sparkCount: number;
  contentRating: string | null;
  status: string;
  slug: string;
  synopsis: string | null;
  writingMode: string | null;
}

function FeaturedStories() {
  const [stories, setStories] = useState<FeaturedStory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stories?public=true&limit=4&sort=most-sparked")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const items = data.stories || data;
        if (Array.isArray(items) && items.length > 0) {
          setStories(items.slice(0, 4));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Hide section entirely if no stories
  if (loaded && stories.length === 0) return null;
  if (!loaded) return null;

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
            From the Library
          </span>
        </motion.div>

        <motion.h2
          className="font-display text-3xl sm:text-4xl text-paper font-medium leading-[1.1] text-center mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Stories being written <span className="text-gold italic">right now</span>
        </motion.h2>

        {/* Story cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <StoryCard
                title={story.title}
                author={story.authorName || undefined}
                coverUrl={story.coverImageUrl || undefined}
                genres={story.genres || []}
                wordCount={story.totalWords}
                chapterCount={story.chapterCount}
                sparkCount={story.sparkCount}
                contentRating={story.contentRating || undefined}
                status={story.status as "draft" | "in-progress" | "on-hiatus" | "complete"}
                slug={story.slug}
                writingMode={story.writingMode || undefined}
                variant="featured"
              />
            </motion.div>
          ))}
        </div>

        {/* Browse link */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-gold font-body text-sm transition-colors duration-300"
          >
            Browse all stories
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>
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
          <BeginWritingCTA />
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
