"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// The studio's shared grammar — the homepage film's standing act, in parts.
// These used to live inside dashboard/page.tsx; they moved out so every beat
// can speak the same language (see beats/).
//
// Colour rule: inks are theme tokens, never literals. `--t-accent-*` are raw
// triplets so a mote can set its own alpha, and they drop to ink strength on
// vellum — which hardcoded constants never did.
// ─────────────────────────────────────────────────────────────────────────────

export const INK = {
  gold: "var(--t-accent-gold)",
  rose: "var(--t-accent-rose)",
  amethyst: "var(--t-accent-amethyst)",
  amber: "var(--t-accent-amber)",
  sage: "var(--t-accent-sage)",
  teal: "var(--t-accent-teal)",
  /** iron-gall — the ink that reads on paper */
  onPaper: "var(--t-accent-ink)",
} as const;

export type InkName = keyof typeof INK;

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <h2 className="font-body text-[10px] uppercase tracking-[0.32em] text-gold/80">{children}</h2>
      <motion.span
        aria-hidden
        className="h-px flex-1 origin-left self-center bg-gradient-to-r from-gold/25 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      {right && <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">{right}</span>}
    </div>
  );
}

/** A narrator line, inking in word by word (the film's beat treatment). */
export function NarratorLine({ text, reduce }: { text: string; reduce: boolean | null }) {
  return (
    <p className="font-display text-3xl font-medium italic leading-tight text-paper sm:text-4xl md:text-[2.6rem]">
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          // The line is in the HTML at full opacity before React arrives; the
          // reveal only ever *lifts* it, so it can be the LCP element without
          // waiting on hydration.
          initial={reduce ? false : { opacity: 0.001, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: "easeOut" }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </p>
  );
}

/** Words that write themselves when the reader's eye arrives. */
export function InkWords({ text, className, reduce }: { text: string; className: string; reduce: boolean | null }) {
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <motion.p
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.022 } } }}
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          variants={{
            hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
          }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </motion.p>
  );
}

/** The wet-ink mote — the cursor where the writing stopped (void variant). */
export function InkMote({ ink = INK.gold, reduce }: { ink?: string; reduce: boolean | null }) {
  return (
    <motion.span
      aria-hidden
      className="ml-2 inline-block h-2 w-2 translate-y-[-2px] rounded-full align-middle"
      style={{ backgroundColor: `rgb(${ink})`, boxShadow: `0 0 12px 3px rgba(${ink},0.55)` }}
      animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/**
 * The same mote on paper — but first, the brand's Ink Drop falls onto the
 * exact spot where the writing stopped, splashes, and stays wet.
 */
export function PaperMote({ reduce }: { reduce: boolean | null }) {
  const ink = INK.onPaper;
  if (reduce) {
    return (
      <span
        aria-hidden
        className="ml-1.5 inline-block h-2 w-2 translate-y-[-1px] rounded-full align-middle"
        style={{ backgroundColor: `rgb(${ink})`, boxShadow: `0 0 8px 2px rgba(${ink},0.4)` }}
      />
    );
  }
  return (
    <span aria-hidden className="relative ml-1.5 inline-block h-2.5 w-2.5 translate-y-[1px] align-baseline">
      {/* the falling drop */}
      <motion.svg
        viewBox="0 0 10 14"
        className="absolute bottom-[1px] left-1/2 w-[9px] -translate-x-1/2"
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: [0, 1, 1, 0] }}
        transition={{
          delay: 1.7,
          duration: 0.38,
          ease: "easeIn",
          opacity: { delay: 1.7, duration: 0.38, times: [0, 0.2, 0.92, 1] },
        }}
      >
        {/* style, not the fill attribute — CSS vars don't resolve in attributes */}
        <path d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z" style={{ fill: `rgb(${ink})` }} />
      </motion.svg>
      {/* the splash where it lands */}
      <motion.span
        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `rgba(${ink},0.7)` }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.85, 0], scale: [0.2, 1.6, 2.3] }}
        transition={{ delay: 2.04, duration: 0.5, ease: "easeOut" }}
      />
      {/* the wet mote it leaves behind */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: `rgb(${ink})`, boxShadow: `0 0 10px 2px rgba(${ink},0.5)` }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.02, duration: 0.25 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `rgb(${ink})` }}
          animate={{ opacity: [0, 0.0, 1, 0.4, 1] }}
          transition={{ delay: 2.4, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.span>
    </span>
  );
}

/** A gold rule that draws itself beneath the hero, like the film's underline. */
export function InkRule({ ink = INK.gold, reduce }: { ink?: string; reduce: boolean | null }) {
  return (
    <motion.div
      aria-hidden
      className="mt-6 h-px w-44 origin-left md:w-56"
      style={{ background: `linear-gradient(to right, rgba(${ink},0.7), transparent)` }}
      initial={reduce ? false : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
    />
  );
}

export function HeroMeta({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-[11px] uppercase tracking-[0.22em] leading-relaxed text-text-secondary">{children}</p>
  );
}

export function HeroLine({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  return (
    <motion.p
      className="max-w-3xl font-display text-2xl font-medium italic leading-snug text-paper sm:text-3xl md:text-[2.1rem]"
      initial={reduce ? false : { opacity: 0.001, y: 10, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.p>
  );
}

export function HeroCta({
  href,
  color,
  children,
}: {
  href: string;
  color: "gold" | "rose" | "amethyst";
  children: React.ReactNode;
}) {
  const cls =
    color === "gold"
      ? "text-gold-light hover:text-gold"
      : color === "rose"
        ? "text-rose hover:text-paper"
        : "text-amethyst hover:text-paper";
  return (
    <Link href={href} className={`group mt-6 inline-block font-display text-lg italic transition-colors md:text-xl ${cls}`}>
      {children}
      <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

/** The lamp follows your hand across the desk. */
export function CursorLamp({ reduce }: { reduce: boolean | null }) {
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 55, damping: 18 });
  const sy = useSpring(y, { stiffness: 55, damping: 18 });
  const glow = useMotionTemplate`radial-gradient(540px circle at ${sx}px ${sy}px, rgba(${INK.gold},0.05), transparent 70%)`;

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y]);

  if (reduce) return null;
  return <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[2]" style={{ background: glow }} />;
}

/** The page leans toward your hand, like paper about to be picked up. */
export function LeanPaper({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [4, -4]), { stiffness: 130, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-4.5, 4.5]), { stiffness: 130, damping: 18 });
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** A ledger row (Act V grammar) — shared by asks, arrivals and the stacks. */
export function LedgerRow({
  href,
  ink,
  title,
  sub,
  meta,
  idx = 0,
  reduce,
}: {
  href: string;
  ink: string;
  title: string;
  sub?: string | null;
  meta?: string;
  idx?: number;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.55, delay: idx * 0.07, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="group/row flex flex-col gap-1 border-b border-border px-2 py-4 transition-colors duration-300 first:border-t hover:bg-paper/[0.02] md:flex-row md:items-baseline md:gap-6 md:px-4"
      >
        <span className="flex min-w-0 items-baseline gap-3 md:w-72 md:shrink-0">
          <span
            className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full transition-shadow duration-300 group-hover/row:shadow-[0_0_8px_2px_rgba(var(--t-accent-gold),0.4)]"
            style={{ backgroundColor: `rgb(${ink})` }}
            aria-hidden
          />
          <span className="truncate font-display text-[16px] text-paper transition-colors duration-300 group-hover/row:text-gold-light">
            {title}
          </span>
        </span>
        {sub && <span className="min-w-0 flex-1 truncate text-[13px] leading-relaxed text-text-secondary">{sub}</span>}
        {meta && <span className="shrink-0 font-mono text-[10px] tracking-wide text-text-ghost md:text-right">{meta}</span>}
      </Link>
    </motion.div>
  );
}
