"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────

interface StoryMomentProps {
  mood: string;
  text: string;
  subtext?: string;
  onComplete: () => void;
}

type Phase = "entering" | "text" | "holding" | "exiting" | "done";

// ── Mood Preset Configuration ──────────────────────────────────

interface MoodPreset {
  /** CSS background layers */
  bg: string;
  /** Extra ambient elements rendered as children */
  atmosphere?: "particles" | "bloom" | "crack" | "fog" | "rotating-gradient";
  /** Vignette intensity (inset shadow spread in px) */
  vignette: number;
  /** Main text classes */
  textClass: string;
  /** Subtext classes */
  subtextClass: string;
  /** Text entrance variant key */
  textEffect: "drift-down" | "slam" | "bloom-reveal" | "standard" | "pulse";
  /** Hold-phase animation on text wrapper */
  holdAnimation?: { scale: number[]; transition: { duration: number; ease: string; repeat?: number } };
  /** Whether the whole content drifts downward during hold */
  contentDrift?: boolean;
}

const MOOD_PRESETS: Record<string, MoodPreset> = {
  death: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(120, 20, 30, 0.15) 0%, rgba(0,0,0,0.98) 70%)",
    atmosphere: "particles",
    vignette: 120,
    textClass: "font-display uppercase tracking-[0.25em] text-[#c45a5a]/80",
    subtextClass: "font-serif italic text-[#9E3B42]/40",
    textEffect: "drift-down",
  },
  triumph: {
    bg: "radial-gradient(ellipse at 50% 45%, rgba(200, 150, 60, 0.25) 0%, rgba(0,0,0,0.95) 65%)",
    vignette: 80,
    textClass: "font-display font-bold text-amber",
    subtextClass: "font-serif italic text-amber/50",
    textEffect: "standard",
    holdAnimation: { scale: [1, 1.05, 1.05], transition: { duration: 1.5, ease: "easeInOut" } },
  },
  betrayal: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(80, 50, 140, 0.2) 0%, rgba(10, 5, 25, 0.98) 60%)",
    atmosphere: "crack",
    vignette: 100,
    textClass: "font-display text-violet-300",
    subtextClass: "font-serif text-violet-400/50",
    textEffect: "slam",
  },
  revelation: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.95) 70%)",
    atmosphere: "bloom",
    vignette: 60,
    textClass: "font-display text-paper",
    subtextClass: "font-serif text-text-secondary",
    textEffect: "bloom-reveal",
  },
  loss: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(40, 60, 100, 0.1) 0%, rgba(5, 5, 15, 0.98) 70%)",
    vignette: 90,
    textClass: "font-reading italic text-text-secondary",
    subtextClass: "font-serif text-text-tertiary",
    textEffect: "standard",
    contentDrift: true,
  },
  ominous: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(60, 20, 80, 0.15) 0%, rgba(5, 0, 10, 0.98) 65%)",
    atmosphere: "fog",
    vignette: 110,
    textClass: "font-display tracking-[0.3em] text-violet-200/80",
    subtextClass: "font-serif text-violet-300/40",
    textEffect: "pulse",
  },
  tense: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.95) 40%, rgba(80, 20, 20, 0.2) 100%)",
    vignette: 100,
    textClass: "font-display text-paper",
    subtextClass: "font-serif text-red-300/40",
    textEffect: "standard",
  },
  mysterious: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(20, 80, 80, 0.12) 0%, rgba(0, 5, 10, 0.98) 70%)",
    atmosphere: "rotating-gradient",
    vignette: 90,
    textClass: "font-display text-cyan-200/80",
    subtextClass: "font-serif text-cyan-300/40",
    textEffect: "standard",
  },
  calm: {
    bg: "radial-gradient(ellipse at 50% 45%, rgba(60, 120, 90, 0.08) 0%, rgba(200, 150, 60, 0.04) 40%, rgba(0,0,0,0.95) 75%)",
    vignette: 60,
    textClass: "font-serif italic text-text",
    subtextClass: "font-serif text-text-tertiary",
    textEffect: "standard",
    holdAnimation: { scale: [1, 1.02, 1, 1.02, 1], transition: { duration: 3, ease: "easeInOut", repeat: 0 } },
  },
  // Aliases and extended moods for ContextPanel compatibility
  triumphant: {
    bg: "radial-gradient(ellipse at 50% 45%, rgba(200, 150, 60, 0.25) 0%, rgba(0,0,0,0.95) 65%)",
    vignette: 80,
    textClass: "font-display font-bold text-amber",
    subtextClass: "font-serif italic text-amber/50",
    textEffect: "standard",
    holdAnimation: { scale: [1, 1.05, 1.05], transition: { duration: 1.5, ease: "easeInOut" } },
  },
  melancholy: {
    bg: "radial-gradient(ellipse at 50% 55%, rgba(60, 60, 120, 0.12) 0%, rgba(5, 5, 15, 0.98) 70%)",
    vignette: 100,
    textClass: "font-reading italic text-indigo-300/70",
    subtextClass: "font-serif text-indigo-400/35",
    textEffect: "drift-down",
    contentDrift: true,
  },
  chaotic: {
    bg: "radial-gradient(ellipse at 50% 50%, rgba(180, 80, 20, 0.15) 0%, rgba(10, 5, 0, 0.98) 65%)",
    vignette: 110,
    textClass: "font-display uppercase tracking-[0.2em] text-orange-300/80",
    subtextClass: "font-serif text-orange-400/40",
    textEffect: "slam",
  },
  romantic: {
    bg: "radial-gradient(ellipse at 50% 45%, rgba(160, 60, 100, 0.1) 0%, rgba(10, 0, 5, 0.97) 70%)",
    vignette: 70,
    textClass: "font-serif italic text-pink-300/80",
    subtextClass: "font-serif text-pink-400/40",
    textEffect: "standard",
    holdAnimation: { scale: [1, 1.02, 1, 1.02, 1], transition: { duration: 3, ease: "easeInOut", repeat: 0 } },
  },
};

// ── Particle Effect (CSS-only falling particles) ───────────────

function FallingParticles() {
  // Generate deterministic particle data
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 4.3 + 7) % 100}%`,
    delay: `${(i * 0.3) % 3}s`,
    duration: `${3 + (i % 4) * 0.8}s`,
    size: 1.5 + (i % 3) * 0.5,
    opacity: 0.15 + (i % 5) * 0.06,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: "-4px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: `rgba(158, 59, 66, ${p.opacity})`,
            animation: `storyMomentFall ${p.duration} ${p.delay} linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes storyMomentFall {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── White Bloom Effect ─────────────────────────────────────────

function BloomEffect({ phase }: { phase: Phase }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "entering" || phase === "text" ? 1 : 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)",
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width: phase === "entering" ? "150vw" : phase === "text" ? "80vw" : "0",
          height: phase === "entering" ? "150vh" : phase === "text" ? "80vh" : "0",
          opacity: phase === "entering" ? 0.9 : phase === "text" ? 0.15 : 0,
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}

// ── Crack Effect (Betrayal) ────────────────────────────────────

function CrackEffect({ phase }: { phase: Phase }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase !== "entering" ? 1 : 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Diagonal slash line */}
      <motion.div
        className="absolute"
        style={{
          top: "10%",
          left: "15%",
          width: "70%",
          height: "80%",
          background: "linear-gradient(135deg, transparent 47%, rgba(126, 94, 158, 0.25) 49%, rgba(126, 94, 158, 0.4) 50%, rgba(126, 94, 158, 0.25) 51%, transparent 53%)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut", delay: 0.3 }}
      />
      {/* Secondary fracture */}
      <motion.div
        className="absolute"
        style={{
          top: "20%",
          left: "40%",
          width: "50%",
          height: "60%",
          background: "linear-gradient(160deg, transparent 46%, rgba(126, 94, 158, 0.15) 49%, rgba(126, 94, 158, 0.2) 50%, rgba(126, 94, 158, 0.15) 51%, transparent 54%)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.12, ease: "easeOut", delay: 0.45 }}
      />
    </motion.div>
  );
}

// ── Fog Effect (Ominous) ───────────────────────────────────────

function FogEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(60, 20, 80, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 40%, rgba(80, 30, 100, 0.06) 0%, transparent 50%)",
          animation: "storyMomentFog 8s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes storyMomentFog {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

// ── Rotating Gradient (Mysterious) ─────────────────────────────

function RotatingGradient() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      <div
        className="w-[120vmax] h-[120vmax] opacity-[0.07]"
        style={{
          background: "conic-gradient(from 0deg, rgba(20, 140, 140, 0.4), transparent 30%, rgba(20, 100, 140, 0.3), transparent 60%, rgba(20, 140, 140, 0.2), transparent 90%)",
          animation: "storyMomentRotate 12s linear infinite",
          borderRadius: "50%",
        }}
      />
      <style>{`
        @keyframes storyMomentRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Pulsing Glow (Triumph) ─────────────────────────────────────

function PulsingGlow() {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60vw",
        height: "60vh",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200, 150, 60, 0.15) 0%, transparent 70%)",
        filter: "blur(40px)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

// ── Word-by-Word Text Reveal ───────────────────────────────────

function WordReveal({
  text,
  textClass,
  effect,
  phase,
}: {
  text: string;
  textClass: string;
  effect: MoodPreset["textEffect"];
  phase: Phase;
}) {
  const words = text.split(" ");

  // Per-word animation variants based on mood effect
  const getWordVariants = (i: number): import("framer-motion").Variants => {
    const baseDelay = 0.08 * i;

    switch (effect) {
      case "drift-down":
        return {
          hidden: { opacity: 0, y: -15, filter: "blur(4px)" },
          visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.5, delay: baseDelay, ease: "easeOut" },
          },
        };
      case "slam":
        return {
          hidden: { opacity: 0, scale: 1.3, filter: "blur(2px)" },
          visible: {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            transition: { duration: 0.15, delay: baseDelay * 0.6, ease: [0.16, 1, 0.3, 1] },
          },
        };
      case "bloom-reveal":
        return {
          hidden: { opacity: 0, filter: "blur(12px) brightness(3)" },
          visible: {
            opacity: 1,
            filter: "blur(0px) brightness(1)",
            transition: { duration: 0.8, delay: baseDelay + 0.3, ease: "easeOut" },
          },
        };
      case "pulse":
        return {
          hidden: { opacity: 0, letterSpacing: "0.5em" },
          visible: {
            opacity: 0.8,
            letterSpacing: "0.3em",
            transition: { duration: 0.6, delay: baseDelay, ease: "easeOut" },
          },
        };
      default:
        return {
          hidden: { opacity: 0, y: 8, filter: "blur(3px)" },
          visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.45, delay: baseDelay, ease: "easeOut" },
          },
        };
    }
  };

  return (
    <motion.div
      className={`text-3xl sm:text-4xl md:text-5xl leading-tight text-center px-8 ${textClass}`}
      initial={false}
      animate={phase === "text" || phase === "holding" ? "visible" : "hidden"}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.3em]"
          variants={getWordVariants(i)}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

// ── Tense Vibration (text shake) ───────────────────────────────

function TenseShake({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{
        x: [0, -1.5, 1, -0.5, 1.5, 0, -1, 0.5, 0],
      }}
      transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.8 }}
    >
      {children}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function StoryMoment({ mood, text, subtext, onComplete }: StoryMomentProps) {
  const [phase, setPhase] = useState<Phase>("entering");

  const preset = MOOD_PRESETS[mood] ?? MOOD_PRESETS.ominous;

  // Phase timeline
  const advancePhase = useCallback(() => {
    setPhase((current) => {
      switch (current) {
        case "entering": return "text";
        case "text": return "holding";
        case "holding": return "exiting";
        case "exiting": return "done";
        default: return current;
      }
    });
  }, []);

  useEffect(() => {
    const durations: Record<Phase, number> = {
      entering: 500,    // fade in + atmosphere
      text: 2000,       // word reveal + subtext fade
      holding: 1500,    // hold everything visible
      exiting: 800,     // fade out
      done: 0,
    };

    if (phase === "done") {
      onComplete();
      return;
    }

    const timer = setTimeout(advancePhase, durations[phase]);
    return () => clearTimeout(timer);
  }, [phase, advancePhase, onComplete]);

  // Escape skips the moment (a11y + impatience)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  // Determine which atmosphere element to render
  const renderAtmosphere = () => {
    switch (preset.atmosphere) {
      case "particles": return <FallingParticles />;
      case "bloom": return <BloomEffect phase={phase} />;
      case "crack": return <CrackEffect phase={phase} />;
      case "fog": return <FogEffect />;
      case "rotating-gradient": return <RotatingGradient />;
      default: return null;
    }
  };

  // Triumph gets a pulsing glow
  const showPulsingGlow = mood === "triumph";

  // Tense gets text vibration
  const wrapTense = (node: React.ReactNode) =>
    mood === "tense" ? <TenseShake>{node}</TenseShake> : node;

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="story-moment-overlay"
          role="status"
          aria-live="polite"
          aria-label={`Story moment: ${text}${subtext ? `. ${subtext}` : ""}. Press Escape to skip.`}
          // Cinematics sit ABOVE modals (z-90) so a fatal-roll death cinematic
          // visibly overlays the dice ritual that just resolved. Order:
          // 50 chrome → 80 focus mode → 90 modals → 100 cinematics.
          className="fixed inset-0 flex items-center justify-center pointer-events-auto"
          style={{ zIndex: 100 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: phase === "entering" ? 0.5 : phase === "exiting" ? 0.8 : 0.3,
            ease: "easeInOut",
          }}
        >
          {/* Background layer */}
          <div
            className="absolute inset-0"
            style={{ background: preset.bg }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 ${preset.vignette}px ${preset.vignette / 2}px rgba(0,0,0,0.7)`,
            }}
          />

          {/* Atmosphere */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase !== "entering" ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            {renderAtmosphere()}
            {showPulsingGlow && <PulsingGlow />}
          </motion.div>

          {/* Content wrapper — drift effect for 'loss' mood */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center gap-6 max-w-4xl"
            animate={
              preset.contentDrift && (phase === "holding" || phase === "text")
                ? { y: [0, 20] }
                : preset.holdAnimation && phase === "holding"
                  ? (preset.holdAnimation as import("framer-motion").TargetAndTransition)
                  : {}
            }
            transition={
              preset.contentDrift
                ? { duration: 4, ease: "easeInOut" }
                : undefined
            }
          >
            {/* Main text */}
            {wrapTense(
              <WordReveal
                text={text}
                textClass={preset.textClass}
                effect={preset.textEffect}
                phase={phase}
              />
            )}

            {/* Subtext */}
            {subtext && (
              <motion.p
                className={`text-base sm:text-lg text-center px-8 ${preset.subtextClass}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: phase === "text" || phase === "holding" ? 1 : 0,
                  y: phase === "text" || phase === "holding" ? 0 : 10,
                }}
                transition={{
                  duration: 0.5,
                  delay: phase === "text" ? 1.2 : 0,
                  ease: "easeOut",
                }}
              >
                {subtext}
              </motion.p>
            )}

            {/* Decorative line beneath text */}
            <motion.div
              className="h-px w-32 mx-auto"
              style={{
                background: `linear-gradient(to right, transparent, ${
                  mood === "death" ? "rgba(158,59,66,0.3)"
                  : mood === "triumph" ? "rgba(200,150,60,0.3)"
                  : mood === "betrayal" ? "rgba(126,94,158,0.3)"
                  : mood === "revelation" ? "rgba(255,255,255,0.3)"
                  : mood === "loss" ? "rgba(255,255,255,0.1)"
                  : mood === "mysterious" ? "rgba(100,200,200,0.2)"
                  : mood === "calm" ? "rgba(200,150,60,0.15)"
                  : mood === "tense" ? "rgba(200,60,60,0.2)"
                  : "rgba(126,94,158,0.2)"
                }, transparent)`,
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{
                scaleX: phase === "text" || phase === "holding" ? 1 : 0,
                opacity: phase === "text" || phase === "holding" ? 1 : 0,
              }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
