"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { formatNumber } from "@/lib/format";
import { CoverArt } from "@/components/dashboard/studio-kit";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives for the Glass Stage: the jacket (a book as an object), the ink
// ring with its last-line watermark, stat tiles, the week's-ink bars, and the
// activity card. Everything renders from real snapshot data; nothing here
// invents a number.
// ─────────────────────────────────────────────────────────────────────────────

export const rise = (reduce: boolean | null, delay = 0) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 0.8, 0.3, 1] as const, delay },
      };

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-[10px] uppercase tracking-[0.14em] text-text-ghost ${className}`}>{children}</span>
  );
}

// ── stat tile ────────────────────────────────────────────────────────────────

export function Tile({
  label,
  value,
  sub,
  gold = false,
}: {
  label: string;
  value: string;
  sub?: string;
  gold?: boolean;
}) {
  if (gold) {
    return (
      <div className="rounded-xl bg-gold-fill p-3.5">
        <span className="block text-[10px] uppercase tracking-[0.12em] text-on-gold/70">{label}</span>
        <div className="mt-1 font-mono text-xl text-on-gold">{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-on-gold/70">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="glass-panel rounded-xl p-3.5 transition-all hover:border-border-active hover:shadow-[0_0_24px_rgba(226,172,74,0.1)]">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost">{label}</span>
      <div className="mt-1 font-mono text-xl text-paper">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-text-secondary">{sub}</div>}
    </div>
  );
}

// ── the jacket ───────────────────────────────────────────────────────────────

export function Jacket({
  seed,
  title,
  image,
  ribbon = false,
  className = "",
}: {
  seed: string;
  title: string;
  image?: string | null;
  ribbon?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className={`group relative aspect-[2/3] -rotate-[5deg] rounded-l-md rounded-r-2xl border border-border-active shadow-[-14px_24px_50px_rgba(3,4,10,0.6)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:-rotate-[3.5deg] hover:shadow-[-14px_28px_60px_rgba(3,4,10,0.65),0_0_50px_rgba(226,172,74,0.16)] ${className}`}
    >
      {/* candlelight behind the book, breathing slowly */}
      <motion.div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-amber/15 blur-3xl"
        aria-hidden
        animate={reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.7, 0.35] }}
        transition={reduce ? undefined : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <CoverArt
        seed={seed}
        title={title}
        image={image}
        className="h-full w-full rounded-l-md rounded-r-2xl"
        titleSize="text-2xl"
      />
      {/* blind-stamped gilt frame */}
      <div className="pointer-events-none absolute inset-[10px] rounded-l-sm rounded-r-xl border border-amber/25" />
      <div className="glass-jacket-pages" aria-hidden />
      {ribbon && (
        <div
          className="glass-ribbon origin-top transition-transform duration-500 ease-out group-hover:rotate-2"
          aria-hidden
        />
      )}
    </div>
  );
}

// ── the ink ring + watermark line ────────────────────────────────────────────

const RING_OUTER =
  "M100 14 C126 20 138 34 152 44 C170 56 184 74 178 100 C173 123 184 140 166 156 C148 172 128 164 106 182 C88 196 66 178 50 168 C30 156 24 138 22 116 C20 92 10 72 30 54 C48 38 62 40 78 26 C86 18 92 12 100 14 Z";
const RING_INNER =
  "M100 26 C122 30 132 42 144 52 C158 62 170 78 166 100 C162 119 170 134 156 146 C142 160 124 154 106 168 C92 178 76 164 62 156 C46 146 40 132 38 114 C36 94 28 78 44 64 C58 50 70 52 82 40 C88 32 94 24 100 26 Z";

export interface OrbitStat {
  label: string;
  value: string;
}

/**
 * The hero's centerpiece: a hand-drawn ink ring that draws itself on arrival,
 * holding the writer's (or reader's) own words as a faded watermark — never a
 * score. Orbit stats sit on its right shoulder.
 */
export function InkRing({
  quote,
  quoteFrom,
  orbits,
  reduce,
}: {
  quote: string | null;
  quoteFrom: string | null;
  orbits: OrbitStat[];
  reduce: boolean | null;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[46%] aspect-square w-[min(430px,78%)] -translate-x-[38%] -translate-y-1/2">
      <svg viewBox="0 0 200 200" fill="none" className="h-full w-full overflow-visible">
        {[
          { d: RING_OUTER, w: 1.1, o: 0.5 },
          { d: RING_INNER, w: 0.6, o: 0.22 },
        ].map((p) => (
          <motion.path
            key={p.w}
            d={p.d}
            className="stroke-amber"
            strokeWidth={p.w}
            opacity={p.o}
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: [0.5, 0, 0.2, 1], delay: 0.3 }}
          />
        ))}
        <circle cx="179" cy="50" r="1.6" className="fill-amber" opacity="0.45" />
        <circle cx="22" cy="152" r="1.8" className="fill-amber" opacity="0.35" />
        <circle cx="150" cy="184" r="1.3" className="fill-amber" opacity="0.3" />
      </svg>

      {quote && (
        <motion.div
          className="absolute inset-0 grid -rotate-[2.5deg] place-items-center pb-[16%] pl-[36%] pr-[7%] pt-[16%] text-center"
          {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1.4, delay: 0.9 } })}
        >
          <div className="font-display text-lg italic leading-relaxed text-paper/40 sm:text-xl">
            {quote}
            {quoteFrom && (
              <span className="mt-2.5 block font-body text-[10px] not-italic uppercase tracking-[0.14em] text-text-ghost">
                {quoteFrom}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {orbits.slice(0, 3).map((o, i) => (
        <div
          key={o.label}
          className="absolute text-center leading-tight"
          style={
            [
              { top: "4%", right: "2%" },
              { top: "38%", right: "-14%" },
              { bottom: "8%", right: "-4%" },
            ][i]
          }
        >
          <span className="block text-[10px] uppercase tracking-[0.14em] text-text-ghost">{o.label}</span>
          <span className="font-mono text-[15px] text-paper">{o.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── the week's ink — seven nights of real word counts ────────────────────────

export function WeekInk({ trend, label = "The week's ink" }: { trend: number[]; label?: string }) {
  const reduce = useReducedMotion();
  const week = trend.slice(-7);
  if (week.length < 7 || week.every((v) => v === 0)) return null;
  const max = Math.max(...week, 1);
  const today = new Date();
  const days = week.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toLocaleDateString(undefined, { weekday: "narrow" });
  });
  return (
    <div className="glass-panel rounded-xl p-3.5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 flex h-[52px] items-end gap-3.5 px-1.5">
        {week.map((v, i) => {
          const tonight = i === week.length - 1;
          return (
            <div key={i} className="group relative mx-auto flex w-full max-w-[34px] items-end self-stretch">
              {v > 0 && (
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-paper opacity-0 transition-opacity group-hover:opacity-100">
                  {formatNumber(v)}
                </span>
              )}
              <motion.div
                className={`w-full origin-bottom rounded-t rounded-b-sm ${
                  v === 0
                    ? "h-1 bg-subtle"
                    : tonight
                      ? "bg-gold-fill shadow-[0_0_16px_rgba(226,172,74,0.4)]"
                      : "bg-gradient-to-b from-amber/75 to-amber/40 group-hover:from-amber group-hover:to-amber/60"
                }`}
                style={v === 0 ? undefined : { height: `${Math.max(10, (v / max) * 100)}%` }}
                initial={reduce || v === 0 ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 0.8, 0.3, 1], delay: 0.35 + i * 0.06 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-3.5 px-1.5">
        {days.map((d, i) => (
          <span key={i} className="w-full text-center text-[9px] tracking-[0.08em] text-text-ghost">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── activity card ────────────────────────────────────────────────────────────

export function GlassCard({
  href,
  coverSeed,
  coverImage,
  title,
  meta,
  cta,
  live = false,
}: {
  href: string;
  coverSeed: string;
  coverImage?: string | null;
  title: React.ReactNode;
  meta: React.ReactNode;
  cta?: string;
  live?: boolean;
}) {
  const body = (
    <>
      <CoverArt seed={coverSeed} title="" image={coverImage} className="h-[54px] w-10 shrink-0 rounded-[3px_6px_6px_3px] border border-border-active transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-105" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-paper">
          <span className="truncate">{title}</span>
          {live && (
            <span className="shrink-0 rounded-full border border-amber/35 px-1.5 py-px text-[9px] uppercase tracking-[0.12em] text-amber">
              Live
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-text-secondary">{meta}</div>
      </div>
      {cta && <span className="shrink-0 text-[12px] font-semibold text-amber">{cta}</span>}
    </>
  );
  const cls = `group glass-panel flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:border-border-active hover:shadow-[0_0_24px_rgba(226,172,74,0.1)] ${
    live ? "border-amber/25" : ""
  }`;
  if (href === "#") return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

// ── panel shell for the tables ───────────────────────────────────────────────

export function Panel({
  title,
  moreHref,
  moreLabel,
  children,
}: {
  title: string;
  moreHref?: string;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[16px] text-paper">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-[12px] text-amber transition-colors hover:text-amber/80">
            {moreLabel} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
