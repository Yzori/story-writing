"use client";

// Logo preview lab — the Quiloria mark (inkwell-Q with rising quill) shown
// static + animated, on both themes side by side, at navbar/hero/favicon
// sizes. Not linked from anywhere; visit /mockup-logo directly.

import { useState } from "react";
import {
  QuiloriaMark,
  QuiloriaLogo,
  QuiloriaLogoAnimated,
  QuiloriaSignature,
  QuiloriaWorldMark,
  QuiloriaWorldAnimated,
} from "@/components/shared/QuiloriaLogo";

function ThemePanel({ theme, children }: { theme: "dark" | "light"; children: React.ReactNode }) {
  return (
    <div className={`theme-${theme} rounded-2xl border border-border overflow-hidden`}>
      <div className="bg-void px-8 py-10">
        <p className="text-[10px] uppercase tracking-[0.24em] text-text-ghost mb-8">
          {theme === "dark" ? "Lamplight" : "Daybreak"}
        </p>
        {children}
      </div>
    </div>
  );
}

function Specimens() {
  return (
    <div className="space-y-10">
      {/* hero lockup */}
      <QuiloriaLogo size={56} textClassName="text-4xl" />

      {/* navbar-size lockup on a navbar strip */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 h-14">
        <QuiloriaLogo size={26} textClassName="text-lg" />
        <div className="flex items-center gap-4 text-[12px] text-text-secondary">
          <span>Browse</span>
          <span>Write</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-amber text-void text-[11px] font-semibold">F</span>
        </div>
      </div>

      {/* signature on this theme's paper */}
      <div className="pb-5 pt-1">
        <QuiloriaSignature textClassName="text-4xl" />
      </div>

      {/* mark only, descending sizes */}
      <div className="flex items-end gap-7">
        {[64, 48, 32, 24, 16].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <QuiloriaMark size={s} />
            <span className="font-mono text-[10px] text-text-ghost">{s}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── idea wall — 10 alternative marks ───────────── */
/* Hand-built explorations of the user's concept list. Static; the winner
   gets the full animation treatment like the inkwell-Q. */

function Icon({ children, size = 64 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

/* 1 · Library Door — Q with a doorway in the bowl, light spilling out */
function MarkDoor() {
  return (
    <>
      <circle cx="30" cy="30" r="17" className="text-amber" stroke="currentColor" strokeWidth="4" />
      <path d="M 42 42 L 52 52" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M 24 40 L 24 29 A 6 6 0 0 1 36 29 L 36 40 Z"
        className="text-amber"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M 24 40 L 24 29 A 6 6 0 0 1 36 29 L 36 40"
        className="text-paper"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="33" cy="34" r="1.2" className="text-paper" fill="currentColor" />
    </>
  );
}

/* 2 · Endless Path — the Q's tail is a winding road */
function MarkPath() {
  return (
    <>
      <path d="M 36.2 44.4 A 17 17 0 1 1 44.4 36.2" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M 38 40 C 46 44 41 50 47 53 C 52 56 56 58 59 60" className="text-amber" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M 38 40 C 46 44 41 50 47 53 C 52 56 56 58 59 60" className="text-paper" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 3.5" strokeLinecap="round" />
    </>
  );
}

/* 3 · Story Constellation — connected stars forming an abstract Q */
function MarkConstellation() {
  const pts: [number, number][] = [
    [18, 26],
    [27, 13],
    [41, 17],
    [45, 32],
    [33, 43],
  ];
  return (
    <>
      <path
        d={`M ${pts.map((p) => p.join(" ")).join(" L ")} Z`}
        className="text-paper"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.45"
        fill="none"
      />
      <path d="M 45 32 L 53 50" className="text-paper" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 1 ? 0 : 2.1} className="text-amber" fill="currentColor" />
      ))}
      {/* one star twinkles as a 4-point sparkle */}
      <g className="text-amber" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M 27 8.5 V 17.5 M 22.5 13 H 31.5" />
      </g>
      <circle cx="53" cy="50" r="2.6" className="text-amber" fill="currentColor" />
    </>
  );
}

/* 4 · Bookshelf Monogram — spines on a shelf inside the Q, one leans out as the tail */
function MarkShelf() {
  return (
    <>
      <path d="M 36.2 44.4 A 17 17 0 1 1 44.4 36.2" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <g className="text-paper" fill="currentColor">
        <rect x="21" y="22" width="4" height="18" rx="0.8" opacity="0.9" />
        <rect x="27" y="19" width="4.5" height="21" rx="0.8" />
        <rect x="33.5" y="23" width="4" height="17" rx="0.8" opacity="0.9" />
      </g>
      {/* the leaning book becomes the tail */}
      <rect
        x="40"
        y="27"
        width="4.5"
        height="24"
        rx="0.8"
        className="text-amber"
        fill="currentColor"
        transform="rotate(24 42 39)"
      />
    </>
  );
}

/* 5 · The Lantern — round lantern glass as the Q bowl, flame inside */
function MarkLantern() {
  return (
    <>
      {/* hanging ring + cap */}
      <circle cx="30" cy="7" r="2.8" className="text-paper" stroke="currentColor" strokeWidth="1.8" />
      <path d="M 26 14.5 H 34 L 32 10.5 H 28 Z" className="text-paper" fill="currentColor" />
      {/* glass ring with gap for the foot */}
      <path d="M 35.5 41.8 A 13 13 0 1 1 41.8 35.5" className="text-amber" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
      {/* flame */}
      <path d="M 30 23.5 C 26 28.5 26 32.5 30 35.8 C 34 32.5 34 28.5 30 23.5 Z" className="text-amber" fill="currentColor" />
      {/* base + the foot that makes it a Q */}
      <path d="M 24.5 46.5 H 35.5" className="text-paper" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 41 41 L 51 51" className="text-amber" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
    </>
  );
}

/* 6 · Writers' Room — a room from above, door at the corner, storyteller inside */
function MarkRoom() {
  return (
    <>
      <path
        d="M 44 35 V 23 Q 44 19 40 19 H 25 Q 21 19 21 23 V 39 Q 21 43 25 43 H 35"
        className="text-paper"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="30.5" cy="30" r="2.6" className="text-amber" fill="currentColor" />
      <path d="M 26 26 H 34" className="text-amber" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M 41 41 L 51 51" className="text-amber" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
    </>
  );
}

/* 7 · Quill Flame — a flame whose inner lines are a feather */
function MarkQuillFlame() {
  // asymmetric flame: tip licks to the right, inner notch on the upper-right
  const FLAME =
    "M 32 56 C 29 49 25 46 22 40 C 17 30 21 17 35 6 C 31 13 32 17 37 21 C 43 26 45 33 42 40 C 39 46 35 49 32 56 Z";
  return (
    <>
      <path d={FLAME} className="text-amber" fill="currentColor" opacity="0.14" />
      <path d={FLAME} className="text-amber" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
      <g className="text-paper" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M 34 20 C 30.5 28 29.5 37 31 47" />
        <path d="M 32.5 26 C 29 27.5 27.5 30 26.5 33.5" />
        <path d="M 31.5 34 C 28.5 35.5 27.5 37.5 27 41" />
        <path d="M 34.5 29 C 37.5 31 38.5 33 39 36.5" />
      </g>
    </>
  );
}

/* 8 · Open Portal — two gates parting, light between, a step out */
function MarkPortal() {
  return (
    <>
      <path d="M 27 9 A 22 22 0 0 0 27 51" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M 37 9 A 22 22 0 0 1 37 51" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M 32 20 V 40" className="text-amber" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.16" />
      <g className="text-paper" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M 32 26 V 34 M 28 30 H 36" />
      </g>
      <path d="M 44 44 L 53 53" className="text-amber" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/* 9 · Story Tree — canopy curling into the Q, a root as the tail */
function MarkTree() {
  return (
    <>
      <path d="M 31 57 C 30 50 29 46 29 40" className="text-paper" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M 31 57 L 25 61 M 31 57 L 37 60" className="text-paper" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M 29 40 C 14 34 13 16 28 11 C 43 6 53 18 47 28 C 42 36 31 34 32 26"
        className="text-amber"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 47.5 29 C 51 33 53 36 56 39" className="text-amber" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g className="text-amber" fill="currentColor">
        <circle cx="19" cy="17" r="1.6" />
        <circle cx="37" cy="8" r="1.6" />
        <circle cx="50" cy="20" r="1.6" />
      </g>
    </>
  );
}

/* 10 · Bookmark Crest — a bookmark with the Q engraved */
function MarkCrest() {
  return (
    <>
      <path
        d="M 22 8 H 42 V 52 L 32 43.5 L 22 52 Z"
        className="text-amber"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M 22 8 H 42 V 52 L 32 43.5 L 22 52 Z"
        className="text-amber"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="24" r="7.5" className="text-paper" stroke="currentColor" strokeWidth="2.4" />
      <path d="M 37 29 L 41 33" className="text-paper" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

const CONCEPTS: { name: string; meaning: string; verdict: string; strong?: boolean; mark: () => React.ReactNode }[] = [
  { name: "The Lantern", meaning: "Guiding readers to hidden stories — discovery, warmth.", verdict: "Brand-perfect — it IS Lamplight. Strongest contender.", strong: true, mark: MarkLantern },
  { name: "Bookshelf Monogram", meaning: "A living library; the leaning book is the tail.", verdict: "Strong — cozy, premium, scales well.", strong: true, mark: MarkShelf },
  { name: "Story Constellation", meaning: "Writers, readers, worlds connected.", verdict: "Strong — collaboration story; pairs with the Night Atlas browse concept.", strong: true, mark: MarkConstellation },
  { name: "The Library Door", meaning: "Every story is a doorway into another world.", verdict: "Solid but quiet; door reads small at 16px.", mark: MarkDoor },
  { name: "The Endless Path", meaning: "Stories are journeys.", verdict: "Charming tail, but the bowl is generic without it.", mark: MarkPath },
  { name: "Bookmark Crest", meaning: "Collecting and preserving stories.", verdict: "Prestigious, a little static — good for seals/badges.", mark: MarkCrest },
  { name: "The Quill Flame", meaning: "Creativity as fire; the feather lives inside it.", verdict: "Emotional, but negative space needs flat backgrounds.", mark: MarkQuillFlame },
  { name: "The Open Portal", meaning: "Enter new worlds.", verdict: "Great for Adventure Mode as a sub-brand, niche as THE brand.", mark: MarkPortal },
  { name: "The Story Tree", meaning: "Stories growing from shared imagination.", verdict: "Lovely idea; the spiral fights the Q at small sizes.", mark: MarkTree },
  { name: "The Writers' Room", meaning: "A place where stories are made together.", verdict: "Too abstract — reads as a generic 'room' icon.", mark: MarkRoom },
];

export default function LogoLab() {
  const [replay, setReplay] = useState(0);

  return (
    <main className="min-h-screen bg-void px-5 py-16 text-text">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-text-ghost">
          <span className="h-px w-8 bg-amber/40" />
          Brand · logo lab
        </div>
        <h1 className="font-display text-[38px] leading-tight text-paper">The inkwell Q</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-secondary">
          The Q is an inkwell; the quill stands in it and sweeps out as the tail. Ring in
          gold, feather in paper ink, one drop of gold at the nib. Same mark, both rooms.
        </p>

        {/* animated specimen */}
        <section className="mt-10 rounded-2xl border border-border bg-surface/60 px-8 py-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <QuiloriaLogoAnimated size={72} textClassName="text-5xl" replayKey={replay} />
            <button
              onClick={() => setReplay((n) => n + 1)}
              className="rounded-full border border-border px-4 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/40 hover:text-amber"
            >
              Replay ↺
            </button>
          </div>
          <p className="mt-6 text-[12px] text-text-ghost">
            Sequence: the ring inks itself on · the quill springs out of the well · a drop
            falls from the nib · the letters settle. Then a faint candle-glow breathes.
          </p>
        </section>

        {/* the worldquill */}
        <section className="mt-8 rounded-2xl border border-amber/30 bg-amber/[0.02] px-8 py-12">
          <div className="mb-6 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-amber/80">
            <span className="h-px w-8 bg-amber/50" />
            New — the Worldquill
          </div>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <QuiloriaWorldAnimated size={72} textClassName="text-5xl" replayKey={replay} />
            <button
              onClick={() => setReplay((n) => n + 1)}
              className="rounded-full border border-border px-4 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/40 hover:text-amber"
            >
              Replay ↺
            </button>
          </div>
          <p className="mt-7 max-w-2xl text-[12.5px] leading-relaxed text-text-ghost">
            Quil + loria: the quill, and the world it writes. The Q bowl is an <em>orbit</em> —
            a tiny ringed world rides it, stars wake inside, the orbit scatters into stardust
            at the gap, and the quill is the comet that traced it. From the nib falls a star,
            not a drop — and it keeps twinkling.
          </p>
          <div className="mt-7 flex items-end gap-7">
            {[64, 48, 32, 24, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <QuiloriaWorldMark size={s} />
                <span className="font-mono text-[10px] text-text-ghost">{s}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* creative cut — the signature */}
        <section className="mt-8 rounded-2xl border border-border bg-surface/60 px-8 py-14">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <QuiloriaSignature textClassName="text-6xl" replayKey={replay} />
            <button
              onClick={() => setReplay((n) => n + 1)}
              className="rounded-full border border-border px-4 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/40 hover:text-amber"
            >
              Replay ↺
            </button>
          </div>
          <p className="mt-10 text-[12px] text-text-ghost">
            Creative cut — the brand signs itself: the name is written, a flourish sweeps
            beneath it (looping under the Q like the tail), two specks of ink land where the
            pen lifts, and ink motes drift off the capital. For the landing hero, loading
            moments, and anywhere the brand gets a full breath.
          </p>
        </section>

        {/* both themes side by side */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <ThemePanel theme="dark">
            <Specimens />
          </ThemePanel>
          <ThemePanel theme="light">
            <Specimens />
          </ThemePanel>
        </div>

        {/* the idea wall */}
        <section className="mt-12">
          <h2 className="font-display text-[26px] text-text-secondary">The idea wall (rejected)</h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-text-ghost">
            Ten alternative directions, built and dismissed — kept here for the record.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {CONCEPTS.map((c) => (
              <div
                key={c.name}
                className={`rounded-xl border p-5 ${
                  c.strong ? "border-amber/35 bg-amber/[0.03]" : "border-border bg-surface/50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon size={72}>{c.mark()}</Icon>
                  {c.strong && (
                    <span className="rounded-full bg-amber/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-amber">
                      Contender
                    </span>
                  )}
                </div>
                {/* mini lockup */}
                <div className="mt-3 flex items-center gap-2">
                  <Icon size={22}>{c.mark()}</Icon>
                  <span
                    className="font-display text-[16px] font-bold tracking-wide"
                    style={{
                      background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 115%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Quiloria
                  </span>
                </div>
                <h3 className="mt-3 font-display text-[17px] text-paper">{c.name}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{c.meaning}</p>
                <p className="mt-2 text-[12px] italic leading-relaxed text-text-ghost">{c.verdict}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-[12px] text-text-ghost">
          Component: <code className="font-mono">src/components/shared/QuiloriaLogo.tsx</code> — exports{" "}
          <code className="font-mono">QuiloriaMark</code>, <code className="font-mono">QuiloriaLogo</code>,{" "}
          <code className="font-mono">QuiloriaLogoAnimated</code>. Not wired into the navbar yet.
        </p>
      </div>
    </main>
  );
}
