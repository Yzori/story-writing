"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { formatNumber } from "@/lib/format";
import { inkStroke } from "@/lib/ink-stroke";
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

/**
 * Counts from zero to the real figure as the stage wakes. `final` is the
 * exactly-formatted resting string (prefixes, abbreviations, "+" signs), so
 * the animation can never end on a number the snapshot didn't say. Runs once
 * per mount: when a background poll moves the figure later, the tile updates
 * in place — a minute-old refresh isn't an arrival.
 */
function CountUp({ to, prefix = "", final }: { to: number; prefix?: string; final: string }) {
  const reduce = useReducedMotion();
  const ran = useRef(false);
  const [v, setV] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (ran.current || reduce || to === 0) {
      ran.current = true;
      setDone(true);
      return;
    }
    ran.current = true;
    const ctrl = animate(0, to, {
      duration: 1.1,
      ease: [0.22, 0.8, 0.3, 1],
      onUpdate: (x) => setV(Math.round(x)),
      onComplete: () => setDone(true),
    });
    return () => ctrl.stop();
  }, [to, reduce]);
  return <>{done ? final : `${prefix}${formatNumber(v)}`}</>;
}

export function Tile({
  label,
  value,
  sub,
  gold = false,
  n,
  prefix,
}: {
  label: string;
  value: string;
  sub?: string;
  gold?: boolean;
  /** when set, the tile counts up to n and rests on `value` */
  n?: number;
  prefix?: string;
}) {
  const display = n !== undefined ? <CountUp to={n} prefix={prefix} final={value} /> : value;
  if (gold) {
    return (
      <div className="rounded-xl bg-gold-fill p-3.5">
        <span className="block text-[10px] uppercase tracking-[0.12em] text-on-gold/70">{label}</span>
        <div className="mt-1 font-mono text-xl text-on-gold">{display}</div>
        {sub && <div className="mt-0.5 text-[11px] text-on-gold/70">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="glass-panel rounded-xl p-3.5 transition-all hover:border-border-active hover:shadow-[0_0_24px_rgba(226,172,74,0.1)]">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost">{label}</span>
      <div className="mt-1 font-mono text-xl text-paper">{display}</div>
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
  const bookRef = useRef<HTMLDivElement>(null);
  // the book leans toward the light: pointer position → a few degrees of tilt
  const rotX = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    const el = bookRef.current;
    if (!el || reduce || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotY.set((px - 0.5) * 9);
    rotX.set((0.5 - py) * 9);
    // the glare on the glass tracks the same light
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  return (
    <div className={`relative ${className}`} style={{ perspective: 900 }}>
      <motion.div
        ref={bookRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rotX, rotateY: rotY }}
        className="group relative aspect-[2/3] w-full -rotate-[5deg] rounded-l-md rounded-r-2xl border border-border-active shadow-[-14px_24px_50px_rgba(3,4,10,0.6)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[-14px_28px_60px_rgba(3,4,10,0.65),0_0_50px_rgba(226,172,74,0.16)]"
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
        {/* the vitrine's glare, following the pointer */}
        <div className="glass-jacket-sheen" aria-hidden />
        <div className="glass-jacket-pages" aria-hidden />
        {ribbon && (
          <div
            className="glass-ribbon origin-top transition-transform duration-500 ease-out group-hover:rotate-2"
            aria-hidden
          />
        )}
      </motion.div>
    </div>
  );
}

// ── the circling stroke + watermark line ─────────────────────────────────────

// One stroke, generated once — the same ink on server and client.
const STROKE = inkStroke();

/**
 * The hero's centerpiece: a single tapered pen stroke — an editor circling a
 * line worth keeping — that draws itself on arrival around the writer's (or
 * reader's) own words. Never a score, and nothing else inside the circle:
 * the numbers live in the tiles. The taper is real (a filled ribbon, not a
 * stroked path); the reveal follows the pen via a mask along the centerline.
 * Ink spatter lands where the pen lifts.
 */
export function InkRing({
  quote,
  quoteFrom,
  reduce,
}: {
  quote: string | null;
  quoteFrom: string | null;
  reduce: boolean | null;
}) {
  const words = quote ? quote.split(/\s+/) : [];
  const settled = 1.0 + words.length * 0.045; // when the last word lands
  return (
    <div className="pointer-events-none absolute left-1/2 top-[46%] aspect-square w-[min(430px,78%)] -translate-x-[30%] -translate-y-1/2 sm:-translate-x-[38%]">
      <svg viewBox="0 0 200 200" fill="none" className="h-full w-full overflow-visible">
        <defs>
          <mask id="ink-reveal">
            <motion.path
              d={STROKE.guide}
              stroke="#fff"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.9, ease: [0.45, 0.05, 0.25, 1], delay: 0.3 }}
            />
          </mask>
        </defs>
        {/* wet-ink glow under the stroke */}
        <path d={STROKE.fill} className="fill-amber" opacity={0.2} mask="url(#ink-reveal)" style={{ filter: "blur(3.5px)" }} />
        <path d={STROKE.fill} className="fill-amber" opacity={0.6} mask="url(#ink-reveal)" />
        {/* spatter where the pen lifted */}
        {[
          { dx: 6, dy: -3, r: 1.5, o: 0.45 },
          { dx: 11, dy: 3, r: 1.0, o: 0.35 },
          { dx: 4, dy: 7, r: 0.8, o: 0.3 },
        ].map((sp, i) => (
          <motion.circle
            key={i}
            cx={STROKE.tail.x + sp.dx}
            cy={STROKE.tail.y + sp.dy}
            r={sp.r}
            className="fill-amber"
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            animate={{ opacity: sp.o, scale: 1 }}
            transition={{ duration: 0.25, delay: 2.15 + i * 0.05 }}
          />
        ))}
      </svg>

      {quote && (
        <div className="absolute inset-0 grid -rotate-[2.5deg] place-items-center pb-[16%] pl-[40%] pr-[8%] pt-[16%] text-center sm:pl-[34%]">
          <div className="font-display text-lg italic leading-relaxed text-paper/40 sm:text-xl">
            {reduce ? (
              quote
            ) : (
              /* the line settles word by word, like ink drying */
              <motion.span
                initial="hide"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.045, delayChildren: 1.0 } } }}
              >
                {words.map((w, i) => (
                  <motion.span
                    key={i}
                    className="inline-block whitespace-pre"
                    variants={{
                      hide: { opacity: 0, filter: "blur(6px)" },
                      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.5 } },
                    }}
                  >
                    {i < words.length - 1 ? `${w} ` : w}
                  </motion.span>
                ))}
              </motion.span>
            )}
            {quoteFrom && (
              <motion.span
                className="mt-2.5 block font-body text-[10px] not-italic uppercase tracking-[0.14em] text-text-ghost"
                {...(reduce
                  ? {}
                  : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6, delay: settled + 0.3 } })}
              >
                {quoteFrom}
              </motion.span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── the week's ink — seven nights of real word counts ────────────────────────

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekInk({ trend, label = "The week's ink" }: { trend: number[]; label?: string }) {
  const reduce = useReducedMotion();
  // a short trend is a young trend, not a missing one — pad the quiet nights
  const tail = trend.slice(-7);
  const week = tail.length < 7 ? [...Array<number>(7 - tail.length).fill(0), ...tail] : tail;
  if (week.every((v) => v === 0)) return null;
  const max = Math.max(...week, 1);
  const today = new Date();
  const days = week.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return DAY_LETTERS[d.getDay()];
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
                transition={{ type: "spring", stiffness: 260, damping: 19, delay: 0.35 + i * 0.06 }}
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
