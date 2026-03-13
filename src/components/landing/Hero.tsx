"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

function InkParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 25 + 15,
        delay: Math.random() * 8,
        opacity: Math.random() * 0.25 + 0.05,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.size > 2.5 ? "#D4A574" : "#E8E0D4",
          }}
          animate={{
            y: [0, -40 - Math.random() * 30, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const headline = "Every great story begins with a single word";
  const words = headline.split(" ");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-charcoal/80 to-ink" />

      {/* Warm central glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-amber/[0.04] blur-[160px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] rounded-full bg-teal/[0.03] blur-[120px]" />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,#0F0D0B_100%)]" />

      {/* Particles */}
      <InkParticles />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <motion.p
          className="text-amber/70 text-sm tracking-[0.25em] uppercase font-medium mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          A collaborative writing platform
        </motion.p>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight">
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-[0.28em] last:mr-0"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.9,
                delay: 0.4 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word === "single" || word === "word" ? (
                <span className="text-amber">{word}</span>
              ) : (
                word
              )}
            </motion.span>
          ))}
          <motion.span
            className="text-amber"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.6 }}
          >
            .
          </motion.span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className="mt-8 text-lg md:text-xl text-linen/60 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        >
          Write together, branch narratives, let readers shape your plot. Quiloria
          is where writers, artists, and readers craft stories that matter.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.1 }}
        >
          <a
            href="/create"
            className="group relative px-8 py-3.5 bg-amber text-ink font-semibold rounded-full transition-all duration-300 hover:bg-amber-light hover:shadow-lg hover:shadow-amber/20 hover:scale-[1.03] text-base overflow-hidden"
          >
            <span className="relative z-10">Start Writing</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-light to-amber opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
          <a
            href="/browse"
            className="px-8 py-3.5 border border-cream/15 text-cream/80 rounded-full hover:border-cream/30 hover:bg-cream/[0.04] transition-all duration-300 text-base"
          >
            Explore Stories
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
      >
        <span className="text-xs text-linen/30 tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="w-4 h-4 text-linen/30"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
