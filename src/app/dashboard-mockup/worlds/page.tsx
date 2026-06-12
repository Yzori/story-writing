"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import { PhaseClock, phaseInfo, PHASES, hash, arand, CLOCK_FALLBACK } from "@/components/dashboard/studio-kit";
import { READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import { greeting, type Zone, ZoneTip, Flame, Steam, Rise, InkHeadline } from "@/components/dashboard-mockup/room-kit";

// ─────────────────────────────────────────────────────────────────────────────
// "Two Worlds" — the hero video made into geography. Your reading life and
// your writing life are different, separate worlds; the only thing that
// connects them is the river of luminous ink (from the writer's imagination
// to the reader's world). You arrive at the threshold — both worlds lit on
// the horizon, your likely one already glowing — and you walk into ONE of
// them. Inside, the other world is only ever a window: distant lights across
// the river. Palette straight from docs/VIDEO_BRIEF.md — mahogany, firelight
// gold, amethyst, teal, ruby. Magical, quiet, nothing screams.
// Reader-side data is illustrative (see demo-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;

// the video brief's exact palette
const MAHOG = "rgb(17,14,10)";
const MAHOG2 = "rgb(26,21,16)";
const WALNUT = "rgb(46,39,32)";
const GOLD = "200,150,60";
const GOLDL = "224,178,96";
const AMETH = "126,94,158";
const TEALV = "59,110,122";
const PARCH = "242,232,208";
const RUBY = "158,59,66";
const P = (a: number) => `rgba(${PARCH},${a})`;

type View = "threshold" | "write" | "read";

interface XZone extends Zone { onClick?: () => void }

// hotspot layer that supports both links (hrefs) and actions (enter a world)
function HotLayer({ zones, setHot }: { zones: XZone[]; setHot: (k: string | null) => void }) {
  return (
    <>
      {zones.map((z) => {
        const style = {
          left: `${(z.rect[0] / 1200) * 100}%`,
          top: `${(z.rect[1] / 640) * 100}%`,
          width: `${(z.rect[2] / 1200) * 100}%`,
          height: `${(z.rect[3] / 640) * 100}%`,
        };
        const handlers = {
          onMouseEnter: () => setHot(z.key),
          onMouseLeave: () => setHot(null),
          onFocus: () => setHot(z.key),
          onBlur: () => setHot(null),
        };
        if (z.href) {
          return <Link key={z.key} href={z.href} aria-label={`${z.title} — ${z.sub}`} className="absolute z-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber/60" style={style} {...handlers} />;
        }
        if (z.onClick) {
          return <button key={z.key} type="button" onClick={z.onClick} aria-label={`${z.title} — ${z.sub}`} className="absolute z-20 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber/60" style={style} {...handlers} />;
        }
        return <div key={z.key} role="img" aria-label={`${z.title} — ${z.sub}`} tabIndex={0} className="absolute z-20 cursor-default rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber/40" style={style} {...handlers} />;
      })}
    </>
  );
}

// luminous ink particles travelling a path, gold fading to amethyst (SMIL)
function InkStream({ path, count = 12, dur = [9, 15], reverse = false, reduce }: { path: string; count?: number; dur?: [number, number]; reverse?: boolean; reduce: boolean | null }) {
  if (reduce) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const d = dur[0] + arand(hash(`ink-d-${path.length}-${i}`)) * (dur[1] - dur[0]);
        const r = 1.2 + arand(hash(`ink-r-${path.length}-${i}`)) * 1.8;
        const begin = `${(-arand(hash(`ink-b-${path.length}-${i}`)) * d).toFixed(2)}s`;
        const from = reverse ? `rgb(${AMETH})` : `rgb(${GOLDL})`;
        const to = reverse ? `rgb(${GOLDL})` : `rgb(${AMETH})`;
        return (
          <circle key={i} r={r} fill={from} opacity="0.85">
            <animateMotion dur={`${d.toFixed(2)}s`} repeatCount="indefinite" begin={begin} path={path} keyPoints={reverse ? "1;0" : "0;1"} keyTimes="0;1" />
            <animate attributeName="fill" values={`${from};${to}`} dur={`${d.toFixed(2)}s`} repeatCount="indefinite" begin={begin} />
            <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.15;0.85;1" dur={`${d.toFixed(2)}s`} repeatCount="indefinite" begin={begin} />
          </circle>
        );
      })}
    </>
  );
}

// a distant glowing world-light on the horizon (a reader's nest / a writer's desk)
function FarLight({ x, y, color, s = 1, reduce }: { x: number; y: number; color: string; s?: number; reduce: boolean | null }) {
  return (
    <g>
      <motion.circle cx={x} cy={y} r={26 * s} fill={`rgba(${color},0.14)`} animate={reduce ? {} : { opacity: [0.6, 1, 0.7] }} transition={reduce ? {} : { duration: 4 + s, repeat: Infinity, ease: "easeInOut" }} />
      <circle cx={x} cy={y} r={10 * s} fill={`rgba(${color},0.25)`} />
      <circle cx={x} cy={y} r={3 * s} fill={`rgb(${color})`} style={{ filter: `drop-shadow(0 0 ${6 * s}px rgba(${color},0.9))` }} />
    </g>
  );
}

export default function TwoWorlds() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const { loaded, error, allStories, activeStory, activeHref, notifs } = useDashboardData(POLL_MS);
  const firstName = session?.user?.name?.split(" ")[0];

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;

  const [view, setView] = useState<View>("threshold");
  const comments = notifs.filter((n) => n.type === "comment" && !n.read);
  const totalWords = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
  // which world is warm for you tonight — evenings lean toward reading
  const hour = clockNow.getHours();
  const hotWorld: Exclude<View, "threshold"> = activeStory && !(hour >= 20 || hour < 5) ? "write" : "read";

  return (
    <div className="relative min-h-screen overflow-hidden text-text" style={{ backgroundColor: MAHOG }}>
      {/* quiet, starless dark around the scene — the worlds carry all the light */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: `radial-gradient(110% 80% at 50% 10%, rgba(${GOLD},0.05), transparent 60%)` }} />

      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          style={{ background: `radial-gradient(115% 115% at 50% 45%, transparent 0%, ${MAHOG} 58%)` }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Worlds` : "Your Worlds"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <ConceptSwitcher current="worlds" />

        {!loaded ? (
          <div className="mt-7 aspect-[1200/640] animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The river is dark right now — try again in a moment.</p>
        ) : (
          <>
            <div className="mt-8">
              <InkHeadline
                text={view === "threshold" ? `${greeting(clockNow)}${firstName ? `, ${firstName}` : ""}.` : view === "write" ? "The writing world." : "The reading world."}
                reduce={reduce}
              />
              <motion.p
                key={view}
                className="mt-1 font-reading text-[15px] italic text-text-secondary"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
              >
                {view === "threshold"
                  ? `${PHASES[phaseKey].mood} — two worlds are lit for you.`
                  : view === "write"
                    ? "Your readers are the lights across the river."
                    : "Everything flowing toward you was written by someone, somewhere."}
              </motion.p>
            </div>

            <Rise delay={0.2} reduce={reduce}>
              <section className="relative mt-7">
                <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ aspectRatio: "1200/640", backgroundColor: MAHOG }}>
                  <AnimatePresence mode="wait">
                    {view === "threshold" && (
                      <motion.div key="threshold" className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 1.04 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
                        <Threshold hotWorld={hotWorld} enter={setView} reduce={reduce} activeTitle={activeStory?.title ?? null} />
                      </motion.div>
                    )}
                    {view === "write" && (
                      <motion.div key="write" className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 1.02 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
                        <WriteWorld
                          reduce={reduce}
                          storyTitle={activeStory?.title ?? "Your first story"}
                          chapterLabel={activeStory ? (activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1") : "Chapter 1"}
                          words={activeStory?.totalWords ?? 0}
                          href={activeStory ? activeHref : "/create"}
                          commentCount={comments.length}
                          latestComment={comments[0]?.message ?? null}
                          back={() => setView("threshold")}
                        />
                      </motion.div>
                    )}
                    {view === "read" && (
                      <motion.div key="read" className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 1.02 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
                        <ReadWorld reduce={reduce} back={() => setView("threshold")} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.p key={`cap-${view}`} className="mt-2.5 text-center font-reading text-[13px] italic text-text-ghost" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  {view === "threshold"
                    ? "Walk toward a world — the river will still be here."
                    : view === "write"
                      ? `${totalWords.toLocaleString()} words have crossed the river from this desk.`
                      : "Cross back whenever the ink calls."}
                </motion.p>
              </section>
            </Rise>
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE THRESHOLD — two worlds on the horizon, the river of ink between them
// ═════════════════════════════════════════════════════════════════════════════

const RIVER = "M 252 442 C 380 520 480 556 600 556 C 720 556 830 516 948 446";

function Threshold({ hotWorld, enter, reduce, activeTitle }: { hotWorld: "write" | "read"; enter: (v: View) => void; reduce: boolean | null; activeTitle: string | null }) {
  const [hot, setHot] = useState<string | null>(null);
  const writeHot = hotWorld === "write";

  const zones: XZone[] = [
    { key: "write", rect: [60, 280, 350, 230], onClick: () => enter("write"), eyebrow: writeHot ? "Your candle is already lit" : "The writing world", title: activeTitle ?? "Your desk", sub: writeHot ? "the ink hasn't dried — this world is waiting for you tonight" : "the desk keeps your place, whenever you're ready", cta: "Walk in →" },
    { key: "read", rect: [800, 280, 350, 230], onClick: () => enter("read"), eyebrow: !writeHot ? "The lamp is already on" : "The reading world", title: READING_DEMO.current.title, sub: !writeHot ? "your bookmark is holding the page — this world is waiting tonight" : "the nest keeps your page, whenever you're ready", cta: "Curl up →" },
    { key: "river", rect: [420, 480, 360, 120], eyebrow: "The river of ink", title: "Stories crossing over", sub: "every light is a story leaving a writer and reaching a reader — yours among them" },
    { key: "dragon", rect: [480, 50, 280, 150], eyebrow: "In the stars", title: "Something is taking form", sub: "when enough ink crosses, it becomes something alive" },
  ];

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id="tw-river" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={`rgba(${GOLDL},0.8)`} />
            <stop offset="55%" stopColor={`rgba(${GOLD},0.55)`} />
            <stop offset="100%" stopColor={`rgba(${AMETH},0.8)`} />
          </linearGradient>
          <radialGradient id="tw-gold"><stop offset="0%" stopColor={`rgba(${GOLD},0.4)`} /><stop offset="100%" stopColor={`rgba(${GOLD},0)`} /></radialGradient>
          <radialGradient id="tw-ameth"><stop offset="0%" stopColor={`rgba(${AMETH},0.4)`} /><stop offset="100%" stopColor={`rgba(${AMETH},0)`} /></radialGradient>
        </defs>

        {/* night air, faint stars */}
        <rect x="0" y="0" width="1200" height="640" fill={MAHOG} />
        {Array.from({ length: 26 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={40 + arand(hash(`tws-x-${i}`)) * 1120}
            cy={24 + arand(hash(`tws-y-${i}`)) * 270}
            r={0.7 + arand(hash(`tws-r-${i}`)) * 1.1}
            fill={P(0.8)}
            animate={reduce ? { opacity: 0.4 } : { opacity: [0.1, 0.7, 0.1] }}
            transition={reduce ? {} : { duration: 2.5 + arand(hash(`tws-d-${i}`)) * 4, delay: arand(hash(`tws-t-${i}`)) * 5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* the dragon, hinted as a constellation — subtle, almost missable */}
        <g style={{ filter: hot === "dragon" ? "brightness(1.6)" : "none", transition: "filter .4s" }}>
          <path d="M 500 150 C 540 120 570 130 600 110 C 630 90 660 100 690 86 C 712 76 730 80 744 70 M 620 104 L 596 70 M 596 70 L 572 92 M 660 92 L 688 56 M 688 56 L 712 80" stroke={P(0.1)} strokeWidth="1" />
          {[[500, 150], [556, 124], [600, 110], [648, 95], [690, 86], [744, 70], [596, 70], [572, 92], [688, 56], [712, 80]].map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r={i === 5 ? 2.2 : 1.5} fill={i === 5 ? `rgb(${RUBY})` : P(0.85)} animate={reduce ? { opacity: 0.5 } : { opacity: [0.25, 0.9, 0.25] }} transition={reduce ? {} : { duration: 3 + arand(hash(`twd-${i}`)) * 3, delay: arand(hash(`twdt-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </g>

        {/* dark valley */}
        <path d="M 0 470 C 150 420 280 400 360 430 C 460 470 540 520 600 520 C 660 520 740 470 840 432 C 920 402 1060 420 1200 466 L 1200 640 L 0 640 Z" fill={MAHOG2} />
        <path d="M 0 560 C 200 520 420 600 600 600 C 780 600 1000 520 1200 556 L 1200 640 L 0 640 Z" fill="rgb(13,11,8)" />

        {/* the river of ink */}
        <path d={RIVER} stroke="url(#tw-river)" strokeWidth="9" strokeLinecap="round" opacity="0.16" style={{ filter: "blur(6px)" }} />
        <path d={RIVER} stroke="url(#tw-river)" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
        <g style={{ filter: hot === "river" ? "brightness(1.4)" : "none", transition: "filter .4s" }}>
          <InkStream path={RIVER} count={14} dur={[8, 14]} reduce={reduce} />
        </g>

        {/* ── THE WRITING WORLD, far left — a desk, a candle, a figure of light ── */}
        <g style={{ filter: hot === "write" ? "brightness(1.35)" : "none", transition: "filter .4s" }}>
          <motion.circle cx="232" cy="394" r={writeHot ? 96 : 70} fill="url(#tw-gold)" animate={reduce ? { opacity: writeHot ? 1 : 0.55 } : { opacity: writeHot ? [0.7, 1, 0.8] : [0.4, 0.6, 0.45] }} transition={reduce ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          {/* hill */}
          <path d="M 80 470 C 140 420 320 414 392 452 L 392 520 L 80 520 Z" fill={WALNUT} opacity="0.6" />
          {/* desk + chair silhouette */}
          <rect x="180" y="402" width="104" height="7" rx="2" fill="rgb(34,27,20)" stroke={`rgba(${GOLD},0.5)`} strokeWidth="1" />
          <rect x="188" y="409" width="6" height="34" fill="rgb(34,27,20)" />
          <rect x="270" y="409" width="6" height="34" fill="rgb(34,27,20)" />
          {/* seated figure, silhouette */}
          <circle cx="160" cy="376" r="9" fill="rgb(34,27,20)" stroke={`rgba(${GOLD},0.35)`} strokeWidth="1" />
          <path d="M 150 414 q 0 -22 10 -28 q 12 4 12 18 l 0 10 Z" fill="rgb(34,27,20)" stroke={`rgba(${GOLD},0.3)`} strokeWidth="1" />
          {/* the page, glowing */}
          <rect x="214" y="390" width="30" height="10" rx="1.5" fill={P(0.85)} transform="rotate(-3 229 395)" style={{ filter: `drop-shadow(0 0 6px rgba(${GOLD},0.5))` }} />
          {/* candle */}
          <rect x="258" y="384" width="5" height="16" rx="1.5" fill={P(0.85)} />
          <Flame cx={260.5} base={382} s={0.5} reduce={reduce} />
          {/* ink rising off the page into the river */}
          <InkStream path="M 232 392 C 240 420 246 432 252 442" count={4} dur={[3, 5]} reduce={reduce} />
        </g>

        {/* ── THE READING WORLD, far right — a nest, a lamp, a glowing book ── */}
        <g style={{ filter: hot === "read" ? "brightness(1.35)" : "none", transition: "filter .4s" }}>
          <motion.circle cx="972" cy="392" r={!writeHot ? 96 : 70} fill="url(#tw-ameth)" animate={reduce ? { opacity: !writeHot ? 1 : 0.55 } : { opacity: !writeHot ? [0.7, 1, 0.8] : [0.4, 0.6, 0.45] }} transition={reduce ? {} : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
          <path d="M 820 452 C 900 412 1080 418 1130 468 L 1130 520 L 820 520 Z" fill={WALNUT} opacity="0.6" />
          {/* armchair silhouette */}
          <path d="M 932 366 q -14 0 -14 16 v 30 q 0 8 9 8 h 64 q 9 0 9 -8 v -30 q 0 -16 -14 -16 q 2 -16 -27 -16 q -29 0 -27 16 Z" fill="rgb(34,27,20)" stroke={`rgba(${AMETH},0.4)`} strokeWidth="1" />
          {/* curled figure + blanket */}
          <circle cx="948" cy="362" r="8" fill="rgb(34,27,20)" stroke={`rgba(${AMETH},0.35)`} strokeWidth="1" />
          <path d="M 936 412 q 4 -18 22 -18 q 20 0 24 18 Z" fill={`rgba(${RUBY},0.45)`} />
          {/* the open book, glowing from within */}
          <path d="M 950 388 q 9 -7 18 0 q 9 -7 18 0 l -2 6 q -8 -5 -16 0 q -8 -5 -16 0 Z" fill={P(0.9)} style={{ filter: `drop-shadow(0 0 8px rgba(${AMETH},0.7))` }} />
          {/* floor lamp */}
          <line x1="1022" y1="354" x2="1022" y2="432" stroke="rgb(34,27,20)" strokeWidth="4" />
          <path d="M 1012 354 l 5 -12 h 11 l 5 12 Z" fill="rgb(34,27,20)" stroke={`rgba(${AMETH},0.45)`} strokeWidth="1" />
          <circle cx="1022" cy="352" r="4" fill={`rgba(${GOLDL},0.9)`} style={{ filter: `drop-shadow(0 0 6px rgba(${GOLDL},0.8))` }} />
          {/* ink arriving from the river into the book */}
          <InkStream path="M 948 446 C 956 428 962 412 968 396" count={4} dur={[3, 5]} reduce={reduce} />
        </g>

        {/* mist over the valley floor */}
        <rect x="0" y="560" width="1200" height="80" fill="rgb(11,9,7)" opacity="0.7" />
      </svg>

      <HotLayer zones={zones} setHot={setHot} />
      <ZoneTip zones={zones} hot={hot} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE WRITING WORLD — your page, your candle; readers are lights out the window
// ═════════════════════════════════════════════════════════════════════════════

// illustrative — the real build would show the user's actual last paragraph
const LAST_LINES = [
  "Mira counted the lights along the harbor and found one missing —",
  "the one that mattered. The bell tower stood against the early dark",
  "like a held breath. She told herself she would not look back at the",
  "window, and looked anyway. Someone had lit the lamp she left cold",
  "for nine years. She was halfway over the railing when the bell",
];

const FAR_READERS = [
  { x: 940, y: 196, s: 1.1, when: "just now", what: "Someone in Tokyo just reached your newest chapter", emoji: "🔥" },
  { x: 1030, y: 270, s: 0.85, when: "2h ago", what: "A reader in São Paulo left 💔 where the letter burns", emoji: "💔" },
  { x: 880, y: 312, s: 0.7, when: "tonight", what: "Someone in Berlin underlined “the one that mattered”", emoji: "✨" },
];

function WriteWorld({ reduce, storyTitle, chapterLabel, words, href, commentCount, latestComment, back }: {
  reduce: boolean | null;
  storyTitle: string;
  chapterLabel: string;
  words: number;
  href: string;
  commentCount: number;
  latestComment: string | null;
  back: () => void;
}) {
  const [hot, setHot] = useState<string | null>(null);

  const zones: XZone[] = [
    { key: "page", rect: [220, 110, 440, 420], href, eyebrow: "Still warm", title: storyTitle, sub: `${chapterLabel} · ${words.toLocaleString()} words — you stopped mid-sentence`, cta: "Pick up the pen →" },
    ...FAR_READERS.map((r, i): Zone => ({ key: `reader-${i}`, rect: [r.x - 34, r.y - 34, 68, 68], eyebrow: `Across the river · ${r.when}`, title: r.what, sub: "your ink reached them — that light is your story, being lived", cta: undefined })),
    { key: "letters", rect: [700, 432, 110, 90], href: "/notifications", eyebrow: "Letters from across", title: commentCount > 0 ? `${commentCount} reader note${commentCount === 1 ? "" : "s"}` : "No new letters", sub: commentCount > 0 ? (latestComment ?? "carried over the river while you were away") : "the river is quiet tonight", cta: commentCount > 0 ? "Read them →" : undefined },
    { key: "scrap", rect: [60, 150, 150, 110], href: "/notifications", eyebrow: "Pinned at the desk", title: "2 suggestions to review", sub: "a collaborator left thoughts on your pages", cta: "Look them over →" },
    { key: "back", rect: [20, 540, 240, 80], onClick: back, eyebrow: "The river", title: "Back to the crossing", sub: "the reading world waits on the other side" },
  ];

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <radialGradient id="ww-gold"><stop offset="0%" stopColor={`rgba(${GOLD},0.45)`} /><stop offset="100%" stopColor={`rgba(${GOLD},0)`} /></radialGradient>
          <linearGradient id="ww-page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgb(${PARCH})`} />
            <stop offset="100%" stopColor="rgb(222,208,180)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1200" height="640" fill={MAHOG} />
        {/* desk surface */}
        <rect x="0" y="520" width="1200" height="120" fill={MAHOG2} />
        <line x1="0" y1="520" x2="1200" y2="520" stroke={`rgba(${GOLD},0.18)`} strokeWidth="1.5" />

        {/* ── the window — night, river, your readers as distant lights ── */}
        <g>
          <rect x="790" y="92" width="368" height="338" rx="10" fill="rgb(11,9,7)" />
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.circle key={i} cx={812 + arand(hash(`wws-x-${i}`)) * 320} cy={112 + arand(hash(`wws-y-${i}`)) * 110} r={0.8 + arand(hash(`wws-r-${i}`)) * 1} fill={P(0.8)} animate={reduce ? { opacity: 0.4 } : { opacity: [0.1, 0.7, 0.1] }} transition={reduce ? {} : { duration: 2.5 + arand(hash(`wws-d-${i}`)) * 3, delay: arand(hash(`wws-t-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }} />
          ))}
          {/* far ridge */}
          <path d="M 790 348 q 90 -28 184 -10 q 100 -22 184 6 v 86 h -368 Z" fill="rgb(16,13,10)" />
          {/* the river leaving you, carrying ink to the lights */}
          <path d="M 798 408 C 860 380 920 330 1000 290 C 1060 260 1110 240 1150 228" stroke={`rgba(${GOLD},0.35)`} strokeWidth="2" strokeLinecap="round" />
          <InkStream path="M 660 330 C 730 360 770 390 798 408 C 860 380 940 320 1000 290 C 1060 260 1110 240 1150 228" count={10} dur={[7, 12]} reduce={reduce} />
          {/* your readers, glowing on the far shore */}
          {FAR_READERS.map((r, i) => (
            <g key={i} style={{ filter: hot === `reader-${i}` ? "brightness(1.5)" : "none", transition: "filter .35s" }}>
              <FarLight x={r.x} y={r.y} color={AMETH} s={r.s} reduce={reduce} />
            </g>
          ))}
          {/* frame on top */}
          <rect x="782" y="84" width="384" height="354" rx="12" stroke={WALNUT} strokeWidth="10" />
          <rect x="782" y="84" width="384" height="354" rx="12" stroke="rgb(20,16,12)" strokeWidth="2" />
          <line x1="974" y1="88" x2="974" y2="434" stroke={WALNUT} strokeWidth="5" />
        </g>

        {/* ── the page — huge, luminous, yours ── */}
        <g style={{ filter: hot === "page" ? "brightness(1.06)" : "none", transition: "filter .3s" }}>
          <motion.ellipse cx="440" cy="330" rx="290" ry="240" fill="url(#ww-gold)" animate={reduce ? { opacity: 0.7 } : { opacity: [0.55, 0.85, 0.62] }} transition={reduce ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <g transform="rotate(-1 440 320)">
            <rect x="238" y="132" width="404" height="392" rx="4" fill="rgb(216,200,170)" transform="translate(7,8)" opacity="0.5" />
            <rect x="238" y="132" width="404" height="392" rx="4" fill="url(#ww-page)" />
            <text x="276" y="178" className="font-mono" fontSize="10" letterSpacing="2.5" fill="rgba(98,74,46,0.75)">{`${storyTitle.toUpperCase().slice(0, 30)} — ${chapterLabel.toUpperCase()}`}</text>
            {LAST_LINES.map((line, i) => (
              <text key={i} x="276" y={224 + i * 31} className="font-reading" fontSize="15.5" fill="rgb(58,44,30)">{line}</text>
            ))}
            {/* the caret, where you stopped */}
            <motion.rect x={276 + 8 * LAST_LINES[LAST_LINES.length - 1].length * 0.92} y={224 + (LAST_LINES.length - 1) * 31 - 13} width="2.5" height="17" fill="rgb(58,44,30)" animate={reduce ? {} : { opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
            <text x="276" y={224 + LAST_LINES.length * 31 + 18} className="font-reading" fontSize="12" fontStyle="italic" fill="rgba(98,74,46,0.65)">— the ink hasn&apos;t dried.</text>
          </g>
          {/* ink lifting off the page, drifting toward the window */}
          <InkStream path="M 600 280 C 660 290 720 310 790 330" count={5} dur={[5, 8]} reduce={reduce} />
        </g>

        {/* candle on the desk */}
        <ellipse cx="706" cy="520" rx="16" ry="4" fill="rgb(30,24,18)" />
        <rect x="699" y="488" width="14" height="30" rx="3" fill={P(0.9)} />
        <Flame cx={706} base={486} s={0.9} reduce={reduce} />
        <motion.circle cx="706" cy="478" r="44" fill="url(#ww-gold)" animate={reduce ? { opacity: 0.6 } : { opacity: [0.45, 0.8, 0.5] }} transition={reduce ? {} : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />

        {/* letters waiting on the desk */}
        <g style={{ filter: hot === "letters" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
          {commentCount > 0 ? (
            <>
              {Array.from({ length: Math.min(commentCount, 3) }).map((_, i) => (
                <g key={i} transform={`rotate(${[-7, 4, -2][i]} ${746 + i * 10} ${500 - i * 7})`}>
                  <rect x={726 + i * 10} y={490 - i * 7} width="40" height="26" rx="2" fill={P(0.92)} stroke="rgb(150,120,90)" strokeWidth="1" />
                  <path d={`M${726 + i * 10} ${492 - i * 7} l20 11 l20 -11`} stroke="rgb(160,130,100)" strokeWidth="1" />
                  <circle cx={746 + i * 10} cy={506 - i * 7} r="3" fill={`rgb(${RUBY})`} />
                </g>
              ))}
              <circle cx="782" cy="462" r="10" fill={`rgb(${GOLDL})`} />
              <text x="782" y="466" textAnchor="middle" className="font-mono" fontSize="11" fontWeight="bold" fill="rgb(40,26,12)">{commentCount}</text>
            </>
          ) : (
            <rect x="730" y="494" width="38" height="24" rx="2" fill={P(0.18)} stroke={P(0.15)} strokeWidth="1" transform="rotate(-4 749 506)" />
          )}
        </g>

        {/* pinned scrap from a collaborator */}
        <g style={{ filter: hot === "scrap" ? "brightness(1.3)" : "none", transition: "filter .3s" }} transform="rotate(-2 134 200)">
          <rect x="72" y="162" width="124" height="84" rx="3" fill={`rgba(${TEALV},0.16)`} stroke={`rgba(${TEALV},0.5)`} strokeWidth="1.2" />
          <circle cx="134" cy="166" r="4" fill={`rgb(${TEALV})`} style={{ filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.6))` }} />
          <path d="M86 186 h96 M86 200 h78 M86 214 h88 M86 228 h60" stroke={P(0.35)} strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* the river glinting at the floor's edge — the way back */}
        <g style={{ filter: hot === "back" ? "brightness(1.5)" : "none", transition: "filter .4s" }}>
          <path d="M 30 596 C 90 586 160 590 240 600" stroke={`rgba(${AMETH},0.5)`} strokeWidth="2.5" strokeLinecap="round" />
          <InkStream path="M 240 600 C 160 590 90 586 30 596" count={4} dur={[5, 8]} reduce={reduce} />
          <text x="48" y="580" className="font-mono" fontSize="9" letterSpacing="2" fill={P(0.4)}>← THE CROSSING</text>
        </g>
      </svg>

      <HotLayer zones={zones} setHot={setHot} />
      <ZoneTip zones={zones} hot={hot} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE READING WORLD — the nest; everything flows toward your glowing book
// ═════════════════════════════════════════════════════════════════════════════

const FAR_WRITERS = [
  { x: 130, y: 200, s: 1.1, what: "Iris Vale posted Chapter 8 of The Salt Year", when: "tonight" },
  { x: 240, y: 282, s: 0.8, what: "M. Okonkwo started something new — Hollow Tide", when: "yesterday" },
  { x: 86, y: 310, s: 0.65, what: "J. Mercer posted Chapter 22 of Paper Saints", when: "2d ago" },
];

function ReadWorld({ reduce, back }: { reduce: boolean | null; back: () => void }) {
  const [hot, setHot] = useState<string | null>(null);
  const cur = READING_DEMO.current;

  const zones: XZone[] = [
    { key: "book", rect: [470, 230, 420, 280], href: "/read", eyebrow: "Your bookmark is holding the page", title: cur.title, sub: `by ${cur.author} · Ch. ${cur.chapter} of ${cur.of} — the lamp is on, the tea is warm`, cta: "Slip back in →" },
    ...FAR_WRITERS.map((w, i): Zone => ({ key: `writer-${i}`, rect: [w.x - 36, w.y - 36, 72, 72], eyebrow: `Across the river · ${w.when}`, title: w.what, sub: "a light on the writers' shore — their ink is on its way to you" })),
    { key: "company", rect: [560, 150, 220, 80], eyebrow: "Reading beside you", title: "11 readers are in Ch. 7 tonight", sub: "you're not reading alone — their lamps are lit too" },
    { key: "starred", rect: [904, 414, 120, 90], href: "/notifications", eyebrow: "Tucked between the pages", title: "Iris starred your note ✦", sub: "the author read your marginalia — and kept it", cta: "See it →" },
    { key: "back", rect: [940, 540, 240, 80], onClick: back, eyebrow: "The river", title: "Back to the crossing", sub: "the writing world waits on the other side" },
  ];

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <radialGradient id="rw-ameth"><stop offset="0%" stopColor={`rgba(${AMETH},0.42)`} /><stop offset="100%" stopColor={`rgba(${AMETH},0)`} /></radialGradient>
          <radialGradient id="rw-gold"><stop offset="0%" stopColor={`rgba(${GOLD},0.4)`} /><stop offset="100%" stopColor={`rgba(${GOLD},0)`} /></radialGradient>
        </defs>

        <rect x="0" y="0" width="1200" height="640" fill={MAHOG} />
        <rect x="0" y="530" width="1200" height="110" fill={MAHOG2} />
        <line x1="0" y1="530" x2="1200" y2="530" stroke={`rgba(${AMETH},0.18)`} strokeWidth="1.5" />

        {/* ── the window — the writers' shore, lights sending ink your way ── */}
        <g>
          <rect x="46" y="92" width="350" height="338" rx="10" fill="rgb(11,9,7)" />
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.circle key={i} cx={66 + arand(hash(`rws-x-${i}`)) * 306} cy={110 + arand(hash(`rws-y-${i}`)) * 100} r={0.8 + arand(hash(`rws-r-${i}`)) * 1} fill={P(0.8)} animate={reduce ? { opacity: 0.4 } : { opacity: [0.1, 0.7, 0.1] }} transition={reduce ? {} : { duration: 2.5 + arand(hash(`rws-d-${i}`)) * 3, delay: arand(hash(`rws-t-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }} />
          ))}
          <path d="M 46 344 q 84 -26 172 -10 q 96 -20 178 8 v 88 h -350 Z" fill="rgb(16,13,10)" />
          {FAR_WRITERS.map((w, i) => (
            <g key={i} style={{ filter: hot === `writer-${i}` ? "brightness(1.5)" : "none", transition: "filter .35s" }}>
              <FarLight x={w.x} y={w.y} color={GOLD} s={w.s} reduce={reduce} />
            </g>
          ))}
          {/* the river arriving */}
          <path d="M 96 236 C 180 280 280 340 388 404" stroke={`rgba(${AMETH},0.3)`} strokeWidth="2" strokeLinecap="round" />
          <InkStream path="M 96 236 C 180 280 280 340 388 404 C 460 430 560 410 640 386" count={10} dur={[7, 12]} reduce={reduce} />
          <rect x="38" y="84" width="366" height="354" rx="12" stroke={WALNUT} strokeWidth="10" />
          <rect x="38" y="84" width="366" height="354" rx="12" stroke="rgb(20,16,12)" strokeWidth="2" />
          <line x1="221" y1="88" x2="221" y2="434" stroke={WALNUT} strokeWidth="5" />
        </g>

        {/* fellow readers' lamps, soft in the dark above your nest */}
        <g style={{ filter: hot === "company" ? "brightness(1.5)" : "none", transition: "filter .4s" }}>
          {[{ x: 600, y: 188, s: 0.55 }, { x: 668, y: 168, s: 0.7 }, { x: 736, y: 192, s: 0.5 }].map((l, i) => (
            <FarLight key={i} x={l.x} y={l.y} color={GOLDL} s={l.s} reduce={reduce} />
          ))}
        </g>

        {/* ── the nest — armchair, blanket, the glowing book ── */}
        <g style={{ filter: hot === "book" ? "brightness(1.08)" : "none", transition: "filter .3s" }}>
          <motion.ellipse cx="680" cy="390" rx="280" ry="220" fill="url(#rw-ameth)" animate={reduce ? { opacity: 0.7 } : { opacity: [0.55, 0.85, 0.62] }} transition={reduce ? {} : { duration: 6.4, repeat: Infinity, ease: "easeInOut" }} />
          {/* armchair */}
          <path d="M 540 330 q -26 0 -26 30 v 110 q 0 16 18 16 h 250 q 18 0 18 -16 v -110 q 0 -30 -26 -30 q 6 -38 -107 -38 q -113 0 -107 38 Z" fill="rgb(38,29,24)" stroke={`rgba(${AMETH},0.3)`} strokeWidth="1.5" />
          <rect x="540" y="430" width="234" height="34" rx="14" fill="rgb(48,37,30)" />
          {/* blanket spilling over */}
          <path d="M 760 360 q 36 -8 48 10 l -10 96 q -22 -12 -44 -8 Z" fill={`rgba(${RUBY},0.5)`} />
          <path d="M 770 380 q 14 40 6 74" stroke={`rgba(${RUBY},0.7)`} strokeWidth="1.5" />
          {/* the open book, lit from within */}
          <g transform="rotate(-3 660 396)">
            <motion.ellipse cx="660" cy="398" rx="86" ry="34" fill="url(#rw-gold)" animate={reduce ? { opacity: 0.85 } : { opacity: [0.65, 1, 0.72] }} transition={reduce ? {} : { duration: 4.6, repeat: Infinity, ease: "easeInOut" }} />
            <path d="M 590 396 q 35 -26 70 0 q 35 -26 70 0 l -7 22 q -29 -19 -63 0 q -34 -19 -63 0 Z" fill={P(0.95)} />
            <line x1="660" y1="372" x2="660" y2="396" stroke="rgb(170,140,105)" strokeWidth="2" />
            <path d="M 612 390 h40 M 614 397 h36 M 686 390 h40 M 688 397 h36" stroke="rgba(120,92,64,0.5)" strokeWidth="1.2" />
            {/* ribbon */}
            <path d="M 652 414 l 6 22 l 6 -22" fill={`rgb(${RUBY})`} />
          </g>
          {/* ink rising from the book like turning pages */}
          <InkStream path="M 660 370 C 670 330 690 290 720 250" count={4} dur={[4, 7]} reduce={reduce} />
        </g>

        {/* side table: tea, still warm */}
        <ellipse cx="470" cy="478" rx="40" ry="7" fill="rgb(34,27,20)" />
        <rect x="466" y="478" width="8" height="52" fill="rgb(34,27,20)" />
        <rect x="452" y="448" width="24" height="22" rx="5" fill={`rgba(${TEALV},0.65)`} stroke="rgb(30,24,18)" strokeWidth="1.5" />
        <path d="M476 454 a8 8 0 0 1 0 13" stroke={`rgba(${TEALV},0.8)`} strokeWidth="2" />
        <Steam x={460} y={444} reduce={reduce} />
        <Steam x={469} y={444} reduce={reduce} delay={1.3} />

        {/* the starred note, tucked by the chair */}
        <g style={{ filter: hot === "starred" ? "brightness(1.35)" : "none", transition: "filter .3s" }} transform="rotate(4 962 458)">
          <rect x="922" y="432" width="82" height="54" rx="3" fill={P(0.9)} stroke="rgb(150,120,90)" strokeWidth="1.2" />
          <path d="M934 448 h58 M934 460 h44 M934 472 h52" stroke="rgba(120,92,64,0.55)" strokeWidth="1.4" />
          <motion.path d="M 996 426 l 3.2 6.6 7.2 1 -5.2 5 1.2 7.2 -6.4 -3.4 -6.4 3.4 1.2 -7.2 -5.2 -5 7.2 -1 Z" fill={`rgb(${GOLDL})`} style={{ filter: `drop-shadow(0 0 5px rgba(${GOLDL},0.8))` }} animate={reduce ? { opacity: 0.9 } : { opacity: [0.6, 1, 0.6] }} transition={reduce ? {} : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
        </g>

        {/* the river glinting at the floor's edge — the way back */}
        <g style={{ filter: hot === "back" ? "brightness(1.5)" : "none", transition: "filter .4s" }}>
          <path d="M 960 600 C 1030 590 1100 592 1170 600" stroke={`rgba(${GOLD},0.5)`} strokeWidth="2.5" strokeLinecap="round" />
          <InkStream path="M 960 600 C 1030 590 1100 592 1170 600" count={4} dur={[5, 8]} reduce={reduce} />
          <text x="1014" y="582" className="font-mono" fontSize="9" letterSpacing="2" fill={P(0.4)}>THE CROSSING →</text>
        </g>
      </svg>

      <HotLayer zones={zones} setHot={setHot} />
      <ZoneTip zones={zones} hot={hot} />
    </div>
  );
}
