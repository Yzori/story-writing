"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpen, Swords, MessageSquareText, Users, Heart, Coins, PenLine } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import {
  CoverArt,
  PhaseClock,
  ScenesRail,
  phaseInfo,
  PHASES,
  paletteFor,
  hash,
  arand,
  CLOCK_FALLBACK,
  type PhaseKey,
} from "@/components/dashboard/studio-kit";
import { READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import { formatTimeAgo } from "@/lib/format";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Hearth" — your studio drawn as an actual room, dollhouse cross-section.
// The furniture IS the dashboard: the writing desk is your WIP (or the live
// table when a session burns), the bed is your current read, the bookshelf
// holds your real works as spines, letters in the wall rack are reader notes,
// the wood stove keeps your reading streak, a jar of fireflies holds your
// sparks — and the cat and dog react if you bother them. Hover anything to
// hear what it has to say; click to go there. Same hierarchy as canon: the
// desk is the protagonist, everything else is the supporting cast.
// Reading / collab data is illustrative (see demo-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Kind = "table" | "wip" | "reading" | "notes" | "collab" | "follows" | "creator" | "cold";
interface Life { key: string; kind: Kind; accent: string; href: string; title: string; sub: string }

// warm room palette — honey wood on plum-dark walls, cream ink, full-strength fabrics
const WOOD = { light: "rgb(176,126,76)", mid: "rgb(140,98,58)", dark: "rgb(98,66,40)", deep: "rgb(64,42,26)" };
const CREAM = (a: number) => `rgba(242,229,206,${a})`;
const GLOW = "240,196,120";
const ROSE = "184,105,122";
const SAGE = "124,160,116";
const LAV = "154,122,208";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HearthStudio() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories, liveCampaigns, notifs } = data;
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

  const liveTable = liveCampaigns.find((c) => c.activeSession) ?? null;
  const yourMove = !!liveTable?.myCharacter && liveTable.activeSession!.activePlayerId === liveTable.myCharacter.id;
  // the desk holds your hottest manuscript — campaigns live at the table instead
  const manuscript = useMemo(() => {
    const m = allStories.filter((s) => s.writingMode !== "campaign");
    return m.length ? [...m].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] : null;
  }, [allStories]);
  const manuscriptHref = manuscript ? storyHref(manuscript) : "/create";
  const unread = useMemo(() => notifs.filter((n) => !n.read), [notifs]);
  const comments = useMemo(() => unread.filter((n) => n.type === "comment"), [unread]);
  // "while you were away" — assembled from real notifications
  const awaySummary = useMemo(() => {
    const c = { spark: 0, comment: 0, follow: 0, chapter: 0 } as Record<string, number>;
    for (const n of unread) if (c[n.type] !== undefined) c[n.type]++;
    const parts: string[] = [];
    if (c.spark) parts.push(`${c.spark} spark${c.spark === 1 ? "" : "s"}`);
    if (c.comment) parts.push(`${c.comment} note${c.comment === 1 ? "" : "s"}`);
    if (c.follow) parts.push(`${c.follow} new follower${c.follow === 1 ? "" : "s"}`);
    if (c.chapter) parts.push(`${c.chapter} chapter${c.chapter === 1 ? "" : "s"} to read`);
    return parts.length ? parts.join(" · ") : null;
  }, [unread]);
  // lamps across the way — readers active on your stories right now
  const lamps = Math.min(3, Math.max(1, unread.filter((n) => n.type === "spark" || n.type === "comment").length || 1));
  const totalWords = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
  const totalSparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
  const focusAccent = liveTable ? ROSE : GLOW;

  // the quieter signals that live outside the room — supporting cast only
  const rail = useMemo<Life[]>(() => {
    if (!loaded || error) return [];
    return [
      { key: "collab", kind: "collab", accent: "94,139,130", href: "/notifications", title: "2 suggestions to review", sub: `on ${manuscript?.title ?? "your story"}` },
      { key: "follows", kind: "follows", accent: LAV, href: "/read", title: "Writers you follow", sub: READING_DEMO.follows[0].text },
      { key: "creator", kind: "creator", accent: "208,136,88", href: "/creator/earnings", title: "240 drops this week", sub: "tips, unlocks and gifts" },
    ];
  }, [loaded, error, manuscript?.title]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* warm wash + breathing lamplight + drifting motes behind everything */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(72,42,52,0.45), transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(135% 100% at 50% 0%, transparent 50%, rgba(12,6,14,0.5) 100%)" }} />
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        animate={reduce ? { opacity: 0.9 } : { opacity: [0.72, 1, 0.8, 0.96, 0.75, 1, 0.85] }}
        transition={reduce ? {} : { duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(58% 44% at 16% 10%, rgba(${focusAccent},0.16), transparent 62%), radial-gradient(46% 36% at 86% 26%, rgba(${PHASES[phaseKey].rgb},0.1), transparent 58%)` }}
      />
      <Motes accent={focusAccent} reduce={reduce} />

      {/* the lamp blooms on as you walk in */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ background: "radial-gradient(115% 115% at 50% 42%, transparent 0%, rgba(7,4,2,0.96) 55%)" }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Room` : "Your Room"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <ConceptSwitcher current="hearth" />

        {!loaded ? (
          <div className="mt-7 aspect-[1200/640] animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : (
          <>
            <div className="mt-8">
              <InkHeadline text={`${greeting(clockNow)}${firstName ? `, ${firstName}` : ""}.`} reduce={reduce} />
              <motion.p
                className="mt-1 font-reading text-[15px] italic text-text-secondary"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.7 }}
              >
                {PHASES[phaseKey].label} — {PHASES[phaseKey].mood}. Everything is where you left it.
              </motion.p>
            </div>

            <Rise delay={0.25} reduce={reduce}>
              <Room
                phaseKey={phaseKey}
                reduce={reduce}
                stories={allStories}
                activeStory={manuscript}
                activeHref={manuscriptHref}
                liveTableTitle={liveTable?.title ?? null}
                liveTableHref={liveTable ? `/campaign/${liveTable.id}/play/${liveTable.activeSession!.id}` : null}
                liveTableStoryId={liveTable?.id ?? null}
                yourMove={yourMove}
                commentCount={comments.length}
                latestComment={comments[0] ? `“${comments[0].message}” · ${formatTimeAgo(comments[0].createdAt)}` : null}
                awaySummary={awaySummary}
                lamps={lamps}
                totalWords={totalWords}
                totalSparks={totalSparks}
              />
            </Rise>

            {rail.length > 0 && (
              <Rise delay={0.5} reduce={reduce}>
                <section className="mt-8">
                  <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Beyond the room</h2>
                  <ScenesRail>
                    {rail.map((l, i) => <DeskNote key={l.key} life={l} i={i} reduce={reduce} />)}
                  </ScenesRail>
                </section>
              </Rise>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE ROOM — one SVG diorama, HTML hotspots over each piece of furniture
// ═════════════════════════════════════════════════════════════════════════════

interface ShelfBook { story: ApiStory; x: number; y: number; w: number; h: number; color: string }

function layoutBooks(stories: ApiStory[]): ShelfBook[] {
  const rows = [218, 328, 438];
  const out: ShelfBook[] = [];
  let idx = 0;
  for (const bottom of rows) {
    let x = 956;
    while (idx < stories.length) {
      const s = stories[idx];
      const w = 21 + (hash(s.id + "w") % 11);
      const h = 58 + (hash(s.id + "h") % 28);
      if (x + w > 1158) break;
      out.push({ story: s, x, y: bottom - h, w, h, color: paletteFor(s.id)[1] });
      x += w + 6;
      idx++;
    }
    if (idx >= stories.length) break;
  }
  return out;
}

interface Zone {
  key: string;
  rect: [number, number, number, number];
  href?: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta?: string;
  cover?: { seed: string; title: string; image?: string | null };
}

function Room({ phaseKey, reduce, stories, activeStory, activeHref, liveTableTitle, liveTableHref, liveTableStoryId, yourMove, commentCount, latestComment, awaySummary, lamps, totalWords, totalSparks }: {
  phaseKey: PhaseKey;
  reduce: boolean | null;
  stories: ApiStory[];
  activeStory: ApiStory | null;
  activeHref: string;
  liveTableTitle: string | null;
  liveTableHref: string | null;
  liveTableStoryId: string | null;
  yourMove: boolean;
  commentCount: number;
  latestComment: string | null;
  awaySummary: string | null;
  lamps: number;
  totalWords: number;
  totalSparks: number;
}) {
  const [hot, setHot] = useState<string | null>(null);
  const isDark = phaseKey === "night" || phaseKey === "dusk";
  const gl = isDark ? 1 : 0.45; // indoor glows soften in daylight
  const phaseRgb = PHASES[phaseKey].rgb;
  const books = useMemo(() => layoutBooks(stories.slice(0, 15)), [stories]);
  const cur = READING_DEMO.current;

  const deskZone: Zone = liveTableTitle
    ? { key: "desk", rect: [348, 350, 348, 210], href: liveTableHref!, eyebrow: yourMove ? "Your move" : "Live · the table is lit", title: liveTableTitle, sub: yourMove ? "the table is holding its breath for you" : "pull up a chair — the session is on", cta: yourMove ? "Take your turn →" : "Sit down →" }
    : activeStory
      ? { key: "desk", rect: [348, 350, 348, 210], href: activeHref, eyebrow: "Still warm", title: activeStory.title, sub: `${activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1"} · ${(activeStory.totalWords || 0).toLocaleString()} words — the ink hasn't dried`, cta: "Pick up the pen →" }
      : { key: "desk", rect: [348, 350, 348, 210], href: "/create", eyebrow: "A clean page", title: "The desk is ready", sub: "nothing on it yet but candlelight", cta: "Start your first story →" };

  const zones: Zone[] = [
    { key: "sampler", rect: [112, 110, 150, 108], eyebrow: "Stitched above the bed", title: `${totalWords.toLocaleString()} words`, sub: "every word on your shelf, counted with pride" },
    { key: "bed", rect: [34, 328, 282, 228], href: "/read", eyebrow: "Open on the quilt", title: cur.title, sub: `by ${cur.author} · Ch. ${cur.chapter} of ${cur.of} — your bookmark is holding the page`, cta: "Slip back in →" },
    deskZone,
    { key: "window", rect: [378, 64, 274, 270], eyebrow: "Through the glass", title: lamps === 1 ? "A lamp is lit across the way" : `${lamps} lamps are lit across the way`, sub: "readers with your stories open tonight — their sparks find their way back here" },
    { key: "letters", rect: [686, 168, 92, 118], href: "/notifications", eyebrow: "While you were away", title: awaySummary ?? (commentCount > 0 ? `${commentCount} reader note${commentCount === 1 ? "" : "s"}` : "No new letters"), sub: latestComment ?? "the rack waits by the window", cta: awaySummary || commentCount > 0 ? "Read them →" : undefined },
    { key: "stove", rect: [794, 332, 118, 185], href: "/read", eyebrow: "The stove", title: `${READING_DEMO.streak}-day reading streak`, sub: "the fire stays lit as long as you read", cta: "Add a log →" },
    { key: "jar", rect: [1000, 474, 58, 80], href: "/creator/earnings", eyebrow: "A jar of sparks", title: `${totalSparks.toLocaleString()} sparks`, sub: "caught from readers who lit up", cta: "Hold it to the light →" },
    { key: "newbook", rect: [942, 474, 48, 78], href: "/create", eyebrow: "An empty slot", title: "Room for one more", sub: "every shelf keeps a space for the next story", cta: "Begin a new tale →" },
    ...books.map((b): Zone => ({
      key: `book-${b.story.id}`,
      rect: [b.x - 2, b.y - 5, b.w + 4, b.h + 5],
      href: storyHref(b.story),
      eyebrow: b.story.writingMode === "campaign" ? (b.story.id === liveTableStoryId ? "Live table" : "Campaign") : b.story.status === "draft" ? "Draft" : "On the shelf",
      title: b.story.title,
      sub: `${b.story.chapterCount > 0 ? `${b.story.chapterCount} chapter${b.story.chapterCount === 1 ? "" : "s"} · ` : ""}${(b.story.totalWords || 0).toLocaleString()} words`,
      cta: "Take it down →",
      cover: { seed: b.story.id, title: b.story.title, image: b.story.coverImageUrl },
    })),
    { key: "cat", rect: [222, 390, 78, 50], eyebrow: "The cat", title: "Mrrp.", sub: "the muse is asleep — do not disturb" },
    { key: "dog", rect: [778, 546, 128, 58], eyebrow: "The dog", title: "Thump. Thump.", sub: "guarding your words, mostly by napping" },
  ];

  const tip = hot ? zones.find((z) => z.key === hot) : null;
  const tipAbove = tip ? tip.rect[1] > 150 : true;
  const tipX = tip ? Math.min(Math.max(((tip.rect[0] + tip.rect[2] / 2) / 1200) * 100, 13), 87) : 50;
  const tipY = tip ? ((tipAbove ? tip.rect[1] : tip.rect[1] + tip.rect[3]) / 640) * 100 : 0;

  return (
    <section className="relative mt-7">
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ aspectRatio: "1200/640", background: "rgb(40,26,36)" }}>
        <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="hr-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(46,30,42)" />
              <stop offset="100%" stopColor="rgb(64,42,56)" />
            </linearGradient>
            <linearGradient id="hr-sky" x1="0" y1="0" x2="0" y2="1">
              {phaseKey === "dusk" ? (
                <>
                  <stop offset="0%" stopColor="rgba(236,146,92,0.5)" />
                  <stop offset="100%" stopColor="rgba(132,74,98,0.28)" />
                </>
              ) : isDark ? (
                <>
                  <stop offset="0%" stopColor="rgba(126,98,192,0.45)" />
                  <stop offset="100%" stopColor="rgba(58,42,92,0.22)" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="rgba(246,216,152,0.6)" />
                  <stop offset="100%" stopColor="rgba(218,172,106,0.25)" />
                </>
              )}
            </linearGradient>
            <radialGradient id="hr-glow">
              <stop offset="0%" stopColor={`rgba(${GLOW},0.55)`} />
              <stop offset="100%" stopColor={`rgba(${GLOW},0)`} />
            </radialGradient>
            <radialGradient id="hr-fireglow">
              <stop offset="0%" stopColor="rgba(240,150,60,0.62)" />
              <stop offset="100%" stopColor="rgba(240,150,60,0)" />
            </radialGradient>
            <clipPath id="hr-window"><rect x="392" y="82" width="246" height="240" rx="12" /></clipPath>
            <clipPath id="hr-quilt"><rect x="52" y="428" width="252" height="64" rx="12" /></clipPath>
          </defs>

          {/* ── walls & floor ── */}
          <rect x="0" y="0" width="1200" height="562" fill="url(#hr-wall)" />
          <rect x="0" y="548" width="1200" height="14" fill={WOOD.dark} />
          <rect x="0" y="562" width="1200" height="78" fill="rgb(118,80,48)" />
          {[0, 150, 310, 470, 640, 800, 960, 1110].map((x, i) => (
            <line key={i} x1={x + (i % 2) * 70} y1={i % 2 ? 562 : 600} x2={x + (i % 2) * 70} y2={i % 2 ? 600 : 640} stroke="rgb(88,58,34)" strokeWidth="2" />
          ))}
          <line x1="0" y1="600" x2="1200" y2="600" stroke="rgb(88,58,34)" strokeWidth="2" />

          {/* ── string lights along the ceiling ── */}
          <path d="M0 16 Q600 80 1200 16" stroke={CREAM(0.22)} strokeWidth="1.4" />
          {[80, 195, 310, 425, 540, 660, 780, 895, 1010, 1120].map((x, i) => {
            const t = x / 1200;
            const y = (1 - t) ** 2 * 16 + 2 * (1 - t) * t * 80 + t ** 2 * 16;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x} y2={y + 8} stroke={CREAM(0.25)} strokeWidth="1" />
                <motion.circle cx={x} cy={y + 12} r="3.4" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 6px rgba(${GLOW},${0.8 * gl}))` }} animate={reduce ? { opacity: 0.55 } : { opacity: [0.3, 0.55 + 0.35 * gl, 0.3] }} transition={reduce ? {} : { duration: 2.6 + arand(hash(`bulb-${i}`)) * 2.6, delay: arand(hash(`bd-${i}`)) * 3, repeat: Infinity, ease: "easeInOut" }} />
              </g>
            );
          })}

          {/* ── braided rug under the desk ── */}
          <ellipse cx="540" cy="598" rx="205" ry="26" fill="rgb(156,82,94)" />
          <ellipse cx="540" cy="598" rx="168" ry="20" stroke={`rgba(${SAGE},0.8)`} strokeWidth="3" strokeDasharray="7 5" />
          <ellipse cx="540" cy="598" rx="124" ry="14.5" stroke={`rgba(${LAV},0.7)`} strokeWidth="3" strokeDasharray="7 5" />
          <ellipse cx="540" cy="598" rx="80" ry="9" stroke={CREAM(0.5)} strokeWidth="3" strokeDasharray="7 5" />

          {/* ── sampler + tiny framed moon above the bed ── */}
          <g style={{ filter: hot === "sampler" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
            <rect x="118" y="116" width="138" height="96" rx="4" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2.5" />
            <rect x="127" y="125" width="120" height="78" rx="2" fill={CREAM(0.1)} stroke={CREAM(0.25)} strokeWidth="1" strokeDasharray="3 3" />
            <text x="187" y="166" textAnchor="middle" className="font-display" fontSize="25" fill={`rgb(${GLOW})`}>{totalWords > 0 ? totalWords.toLocaleString() : "· · ·"}</text>
            <text x="187" y="186" textAnchor="middle" className="font-mono" fontSize="7.5" letterSpacing="2.5" fill={CREAM(0.55)}>WORDS &amp; COUNTING</text>
          </g>
          <g>
            <rect x="278" y="132" width="48" height="60" rx="3" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="285" y="139" width="34" height="46" rx="1.5" fill="rgb(34,24,18)" />
            <circle cx="307" cy="152" r="6" fill={CREAM(0.55)} />
            <path d="M285 175 q10 -10 17 -4 q8 -8 17 -2 v16 h-34 Z" fill={WOOD.dark} />
          </g>

          {/* ── THE BED — your current read, open on the quilt ── */}
          <g style={{ filter: hot === "bed" ? "brightness(1.18)" : "none", transition: "filter .3s" }}>
            {/* sconce reading lamp */}
            <path d="M60 296 h22 v6 h-22 Z" fill={WOOD.dark} />
            <path d="M64 296 l5 -14 h8 l5 14" fill={CREAM(0.16)} stroke={CREAM(0.35)} strokeWidth="1.2" />
            <motion.circle cx="73" cy="294" r="22" fill="url(#hr-glow)" animate={reduce ? { opacity: 0.6 * gl } : { opacity: [0.45 * gl, 0.8 * gl, 0.55 * gl] }} transition={reduce ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }} />
            {/* frame */}
            <rect x="40" y="318" width="16" height="222" rx="6" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="300" y="396" width="14" height="144" rx="5" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="52" y="436" width="252" height="56" rx="10" fill={CREAM(0.2)} />
            {/* patchwork quilt */}
            <g clipPath="url(#hr-quilt)">
              <rect x="52" y="428" width="252" height="64" fill="rgb(182,94,108)" />
              {Array.from({ length: 8 }).map((_, c) =>
                Array.from({ length: 2 }).map((_, r) => {
                  const colors = [`rgba(${ROSE},0.92)`, `rgba(${SAGE},0.85)`, `rgba(${LAV},0.85)`, `rgba(${GLOW},0.7)`];
                  return <rect key={`${c}-${r}`} x={52 + c * 32} y={428 + r * 32} width="32" height="32" fill={colors[(c + r) % 4]} />;
                })
              )}
              {Array.from({ length: 7 }).map((_, c) => <line key={c} x1={84 + c * 32} y1={428} x2={84 + c * 32} y2={492} stroke={CREAM(0.18)} strokeWidth="1" strokeDasharray="3 3" />)}
              <line x1="52" y1="460" x2="304" y2="460" stroke={CREAM(0.18)} strokeWidth="1" strokeDasharray="3 3" />
            </g>
            {/* pillow */}
            <rect x="60" y="410" width="72" height="26" rx="12" fill={CREAM(0.85)} />
            <path d="M66 423 q30 6 60 0" stroke="rgba(120,90,60,0.25)" strokeWidth="1.5" />
            {/* the open book, face-down on the quilt */}
            <g transform="rotate(-4 180 430)">
              <path d="M150 430 q15 -10 30 0 q15 -10 30 0 l-4 8 q-13 -8 -26 0 q-13 -8 -26 0 Z" fill={CREAM(0.9)} stroke="rgb(120,90,60)" strokeWidth="1" />
              <line x1="180" y1="421" x2="180" y2="430" stroke="rgb(150,110,80)" strokeWidth="1.2" />
              <path d="M177 438 l3 8 l3 -8" fill={`rgb(${ROSE})`} />
            </g>
            {/* legs + slippers underneath */}
            <rect x="58" y="492" width="10" height="64" fill={WOOD.dark} />
            <rect x="288" y="492" width="10" height="64" fill={WOOD.dark} />
            <g>
              <path d="M150 548 a8 6 0 0 1 16 0 h-16" fill={`rgba(${ROSE},0.7)`} />
              <path d="M172 548 a8 6 0 0 1 16 0 h-16" fill={`rgba(${ROSE},0.7)`} />
            </g>
          </g>

          {/* ── THE CAT — asleep at the foot of the bed (until you hover) ── */}
          <g>
            {/* sleeping */}
            <motion.g animate={{ opacity: hot === "cat" ? 0 : 1 }} transition={{ duration: 0.2 }}>
              <ellipse cx="255" cy="422" rx="25" ry="11" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
              <path d="M242 415 q4 6 0 12 M252 413 q4 7 0 14" stroke="rgb(88,66,50)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="237" cy="419" r="8.5" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
              <path d="M231 413 l1 -6 l5 4 M239 411 l4 -5 l2 6" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M233 420 q2 1.5 4 0 M240 420 q2 1.5 4 0" stroke="rgb(60,44,33)" strokeWidth="1" strokeLinecap="round" />
              <path d="M278 426 q12 -2 10 -12 q-1 -6 -8 -6" stroke="rgb(88,66,50)" strokeWidth="5" strokeLinecap="round" />
            </motion.g>
            {/* awake — ears up, eyes open, a small remark */}
            <motion.g animate={{ opacity: hot === "cat" ? 1 : 0 }} transition={{ duration: 0.2 }}>
              <ellipse cx="258" cy="424" rx="23" ry="10" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
              <circle cx="238" cy="404" r="9" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
              <path d="M231 398 l0 -8 l7 5 M242 395 l6 -6 l3 8" fill="rgb(134,104,80)" stroke="rgb(80,60,45)" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="235" cy="403" r="1.3" fill="rgb(40,28,20)" />
              <circle cx="241" cy="403" r="1.3" fill="rgb(40,28,20)" />
              <path d="M236 408 q2 1.5 4 0" stroke="rgb(60,44,33)" strokeWidth="1" strokeLinecap="round" />
              <path d="M280 424 q14 -6 8 -20" stroke="rgb(88,66,50)" strokeWidth="5" strokeLinecap="round" />
              <text x="258" y="384" textAnchor="middle" className="font-reading" fontSize="11" fontStyle="italic" fill={CREAM(0.75)}>mrrp.</text>
            </motion.g>
          </g>

          {/* ── THE WINDOW — keeps the hour, and your readers' lamps ── */}
          <g style={{ filter: hot === "window" ? "brightness(1.15)" : "none", transition: "filter .3s" }}>
            <g clipPath="url(#hr-window)">
              <rect x="392" y="82" width="246" height="240" fill="url(#hr-sky)" />
              <WindowSky phaseKey={phaseKey} lamps={lamps} reduce={reduce} />
            </g>
            {/* muntins + frame */}
            <line x1="515" y1="84" x2="515" y2="320" stroke={WOOD.mid} strokeWidth="6" />
            <line x1="394" y1="200" x2="636" y2="200" stroke={WOOD.mid} strokeWidth="6" />
            <rect x="386" y="76" width="258" height="252" rx="14" stroke={WOOD.light} strokeWidth="9" />
            <rect x="386" y="76" width="258" height="252" rx="14" stroke={WOOD.deep} strokeWidth="2" />
            {/* curtain rod + curtains */}
            <line x1="358" y1="62" x2="672" y2="62" stroke={WOOD.dark} strokeWidth="5" strokeLinecap="round" />
            <circle cx="356" cy="62" r="5" fill={WOOD.dark} />
            <circle cx="674" cy="62" r="5" fill={WOOD.dark} />
            <path d="M384 66 C 372 150 392 250 376 332 L 352 332 C 364 240 354 150 366 66 Z" fill={`rgba(${ROSE},0.8)`} />
            <path d="M646 66 C 658 150 638 250 654 332 L 678 332 C 666 240 676 150 664 66 Z" fill={`rgba(${ROSE},0.8)`} />
            <path d="M368 90 q4 110 -2 220 M652 90 q-4 110 2 220" stroke="rgba(140,66,82,0.8)" strokeWidth="1.5" />
            {/* sill + plant */}
            <rect x="376" y="326" width="278" height="11" rx="3" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
            <path d="M412 326 v-10 h17 v10" fill="rgb(150,90,70)" stroke={WOOD.deep} strokeWidth="1.2" />
            <path d="M420 316 q-7 -12 -16 -14 M420 316 q0 -14 2 -18 M420 316 q8 -11 16 -13" stroke={`rgba(${SAGE},0.9)`} strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* daylight falls across the desk */}
          {!isDark && <path d="M396 100 L634 100 L720 560 L330 560 Z" fill={`rgba(${GLOW},0.1)`} />}

          {/* ── THE DESK — the protagonist ── */}
          <g style={{ filter: hot === "desk" ? "brightness(1.18)" : "none", transition: "filter .3s" }}>
            <motion.ellipse cx="540" cy="430" rx="170" ry="60" fill="url(#hr-glow)" animate={reduce ? { opacity: 0.5 * gl } : { opacity: [0.35 * gl, 0.7 * gl, 0.45 * gl] }} transition={reduce ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }} />
            {/* desktop + skirt + drawers */}
            <rect x="355" y="414" width="332" height="15" rx="4" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="372" y="429" width="298" height="46" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <line x1="521" y1="431" x2="521" y2="473" stroke={WOOD.deep} strokeWidth="2" />
            <circle cx="446" cy="452" r="4" fill={`rgb(${GLOW})`} />
            <circle cx="596" cy="452" r="4" fill={`rgb(${GLOW})`} />
            <rect x="372" y="475" width="13" height="82" fill={WOOD.dark} />
            <rect x="657" y="475" width="13" height="82" fill={WOOD.dark} />
            {/* manuscript */}
            <g transform="rotate(-2 470 400)">
              <rect x="424" y="398" width="94" height="16" rx="2" fill={CREAM(0.55)} />
              <rect x="428" y="392" width="90" height="14" rx="2" fill={CREAM(0.75)} />
              <rect x="426" y="384" width="92" height="12" rx="2" fill={CREAM(0.92)} />
              <path d="M434 389 h56 M434 392.5 h70" stroke="rgb(130,100,72)" strokeWidth="1.1" />
            </g>
            {/* inkwell + quill */}
            <rect x="556" y="400" width="17" height="15" rx="3" fill="rgb(28,19,14)" stroke={WOOD.deep} strokeWidth="1" />
            <path d="M564 402 C 572 380 584 364 600 356 C 588 374 578 390 570 404 Z" fill={CREAM(0.85)} stroke="rgb(150,120,90)" strokeWidth="1" />
            {/* candle */}
            <ellipse cx="630" cy="414" rx="13" ry="4" fill={WOOD.dark} />
            <rect x="624" y="390" width="12" height="22" rx="2.5" fill={CREAM(0.9)} />
            <line x1="630" y1="390" x2="630" y2="386" stroke="rgb(40,28,20)" strokeWidth="1.5" />
            <Flame cx={630} base={386} s={0.85} reduce={reduce} />
            <motion.circle cx="630" cy="380" r="34" fill="url(#hr-glow)" animate={reduce ? { opacity: 0.6 * gl } : { opacity: [0.4 * gl, 0.8 * gl, 0.5 * gl] }} transition={reduce ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            {/* tea, still warm */}
            <rect x="390" y="398" width="19" height="17" rx="4" fill={`rgba(${SAGE},0.65)`} stroke={WOOD.deep} strokeWidth="1.2" />
            <path d="M409 402 a6 6 0 0 1 0 10" stroke={`rgba(${SAGE},0.8)`} strokeWidth="1.6" />
            <Steam x={397} y={394} reduce={reduce} />
            <Steam x={404} y={394} reduce={reduce} delay={1.4} />
            {/* a live table sets dice + a GM screen on the desk */}
            {liveTableTitle && (
              <g>
                <motion.path d="M662 392 l9 -14 l9 14 l-9 14 Z M662 392 l18 0" fill={`rgba(${ROSE},0.9)`} stroke="rgb(120,60,72)" strokeWidth="1.2" animate={reduce ? {} : { opacity: [0.75, 1, 0.75] }} transition={reduce ? {} : { duration: 1.8, repeat: Infinity }} style={{ filter: `drop-shadow(0 0 8px rgba(${ROSE},0.8))` }} />
                <path d="M350 380 l22 -10 v40 l-22 10 Z M372 370 l20 8 v40 l-20 -8" fill={WOOD.dark} stroke={WOOD.deep} strokeWidth="1.5" />
              </g>
            )}
            {/* chair */}
            <rect x="700" y="464" width="68" height="10" rx="3" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
            <rect x="700" y="450" width="64" height="14" rx="6" fill={`rgba(${ROSE},0.5)`} />
            <rect x="758" y="370" width="11" height="100" rx="4" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="1.5" />
            <path d="M758 386 h-46 q-6 0 -6 8" stroke={WOOD.mid} strokeWidth="6" strokeLinecap="round" />
            <rect x="704" y="474" width="9" height="84" fill={WOOD.dark} />
            <rect x="754" y="474" width="9" height="84" fill={WOOD.dark} />
            {/* a page that didn't make the cut */}
            <g transform="rotate(14 716 588)"><rect x="700" y="582" width="32" height="22" rx="2" fill={CREAM(0.45)} /><path d="M706 589 h18 M706 594 h12" stroke="rgb(120,92,66)" strokeWidth="1" /></g>
            <circle cx="668" cy="592" r="8" fill={CREAM(0.4)} />
            <path d="M662 590 q5 -4 10 0 q-4 4 -8 1" stroke="rgb(130,100,72)" strokeWidth="1" />
          </g>

          {/* ── THE LETTER RACK — reader notes by the window ── */}
          <g style={{ filter: hot === "letters" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <rect x="692" y="186" width="80" height="94" rx="4" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="692" y="232" width="80" height="9" fill={WOOD.dark} />
            <rect x="692" y="271" width="80" height="9" fill={WOOD.dark} />
            {commentCount > 0 ? (
              <>
                {Array.from({ length: Math.min(commentCount, 3) }).map((_, i) => (
                  <g key={i} transform={`rotate(${[-7, 4, -2][i]} ${712 + i * 18} 222)`}>
                    <rect x={700 + i * 18} y={206} width="30" height="22" rx="2" fill={CREAM(0.88)} stroke="rgb(150,120,90)" strokeWidth="1" />
                    <path d={`M${700 + i * 18} 208 l15 9 l15 -9`} stroke="rgb(160,130,100)" strokeWidth="1" />
                    <circle cx={715 + i * 18} cy={221} r="2.6" fill={`rgb(${ROSE})`} />
                  </g>
                ))}
                <circle cx="768" cy="190" r="10" fill={`rgb(${GLOW})`} />
                <text x="768" y="194" textAnchor="middle" className="font-mono" fontSize="11" fontWeight="bold" fill="rgb(40,26,12)">{commentCount}</text>
              </>
            ) : (
              <g transform="rotate(-4 720 260)"><rect x="704" y="250" width="30" height="20" rx="2" fill={CREAM(0.25)} stroke={CREAM(0.2)} strokeWidth="1" /></g>
            )}
          </g>

          {/* ── THE STOVE — your streak keeps it burning ── */}
          <g style={{ filter: hot === "stove" ? "brightness(1.2)" : "none", transition: "filter .3s" }}>
            <rect x="843" y="0" width="18" height="340" fill="rgb(52,38,28)" stroke={WOOD.deep} strokeWidth="1.5" />
            <rect x="839" y="80" width="26" height="8" rx="2" fill="rgb(44,31,22)" />
            <rect x="839" y="200" width="26" height="8" rx="2" fill="rgb(44,31,22)" />
            <rect x="800" y="340" width="104" height="14" rx="4" fill="rgb(48,34,25)" stroke={WOOD.deep} strokeWidth="1.5" />
            <rect x="806" y="354" width="92" height="148" rx="10" fill="rgb(56,40,29)" stroke="rgb(30,20,14)" strokeWidth="2.5" />
            {/* fire window */}
            <rect x="822" y="382" width="60" height="70" rx="8" fill="rgb(22,12,7)" stroke="rgb(30,20,14)" strokeWidth="2" />
            <Flame cx={842} base={448} s={1.5} reduce={reduce} />
            <Flame cx={862} base={448} s={2} reduce={reduce} />
            <Flame cx={852} base={448} s={1.1} reduce={reduce} />
            <line x1="822" y1="417" x2="882" y2="417" stroke="rgb(30,20,14)" strokeWidth="2" />
            {/* legs + floor glow */}
            <rect x="814" y="502" width="9" height="56" fill="rgb(30,20,14)" />
            <rect x="881" y="502" width="9" height="56" fill="rgb(30,20,14)" />
            <motion.ellipse cx="852" cy="562" rx="95" ry="16" fill="url(#hr-fireglow)" animate={reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.65, 0.42, 0.6, 0.38] }} transition={reduce ? {} : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
            {/* kettle */}
            <path d="M922 340 a14 14 0 0 1 -28 0 Z" transform="rotate(180 908 333)" fill="rgb(70,52,38)" stroke={WOOD.deep} strokeWidth="1.5" />
            <path d="M894 332 q-8 -2 -10 -10" stroke="rgb(70,52,38)" strokeWidth="3" strokeLinecap="round" />
            <path d="M898 322 a10 10 0 0 1 20 0" stroke="rgb(70,52,38)" strokeWidth="2.5" fill="none" />
            <Steam x={886} y={318} reduce={reduce} delay={0.6} />
            {/* log basket */}
            <path d="M914 512 q4 30 18 30 h26 q14 0 18 -30 Z" fill="rgb(86,60,40)" stroke={WOOD.deep} strokeWidth="1.5" transform="translate(0,16)" />
            <circle cx="934" cy="534" r="9" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
            <circle cx="934" cy="534" r="4" stroke={WOOD.deep} strokeWidth="1" />
            <circle cx="952" cy="532" r="9" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="1.5" />
            <circle cx="952" cy="532" r="4" stroke={WOOD.deep} strokeWidth="1" />
          </g>

          {/* ── THE DOG — by the stove, of course ── */}
          <g>
            <ellipse cx="838" cy="592" rx="64" ry="13" fill="rgba(30,18,10,0.5)" />
            <motion.g animate={reduce ? {} : { scaleY: [1, 1.03, 1] }} transition={reduce ? {} : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
              <ellipse cx="838" cy="578" rx="46" ry="17" fill="rgb(168,126,88)" stroke="rgb(104,76,52)" strokeWidth="1.4" />
              <circle cx="878" cy="572" r="13" fill="rgb(168,126,88)" stroke="rgb(104,76,52)" strokeWidth="1.4" />
              <ellipse cx="888" cy="577" rx="7" ry="5" fill="rgb(160,122,86)" />
              <circle cx="892" cy="576" r="2" fill="rgb(50,34,22)" />
              <path d="M872 560 q-8 2 -7 12 q4 4 9 1" fill="rgb(116,84,58)" />
              <path d="M880 570 q2 1.5 4 0" stroke="rgb(70,50,34)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M848 590 q14 2 26 0" stroke="rgb(104,76,52)" strokeWidth="1.2" />
            </motion.g>
            <motion.path
              d="M794 584 q-18 -8 -14 -26"
              stroke="rgb(124,90,62)"
              strokeWidth="7"
              strokeLinecap="round"
              animate={hot === "dog" && !reduce ? { rotate: [0, -26, 0, -26, 0] } : { rotate: 0 }}
              transition={{ duration: 0.9, repeat: hot === "dog" ? Infinity : 0 }}
              style={{ transformBox: "fill-box", transformOrigin: "100% 100%" }}
            />
          </g>

          {/* ── THE BOOKSHELF — your works, spine by spine ── */}
          <g>
            <rect x="932" y="108" width="246" height="452" rx="6" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2.5" />
            <rect x="944" y="120" width="222" height="430" fill="rgb(58,40,30)" />
            {[218, 328, 438].map((y) => <rect key={y} x="944" y={y} width="222" height="10" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1" />)}
            <rect x="944" y="548" width="222" height="10" fill={WOOD.light} />
            {/* trailing plant on top */}
            <path d="M1106 96 v-12 h22 v12" fill="rgb(150,90,70)" stroke={WOOD.deep} strokeWidth="1.2" />
            <path d="M1117 84 q-8 -10 -18 -10 M1117 84 q2 -12 8 -16 M1117 84 q10 -7 18 -6" stroke={`rgba(${SAGE},0.9)`} strokeWidth="2" strokeLinecap="round" />
            <path d="M1130 100 q14 30 6 64 M1126 100 q-4 36 4 88" stroke={`rgba(${SAGE},0.65)`} strokeWidth="2" strokeLinecap="round" />
            {[136, 158, 182, 150, 170].map((y, i) => <circle key={i} cx={i % 2 ? 1128 : 1136} cy={y} r="3.4" fill={`rgba(${SAGE},0.75)`} />)}

            {/* the real books */}
            {books.map((b) => {
              const isHot = hot === `book-${b.story.id}`;
              const isLive = b.story.id === liveTableStoryId;
              return (
                <motion.g key={b.story.id} animate={{ y: isHot ? -7 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2.5" fill={b.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" style={{ filter: isHot ? "brightness(1.3)" : isLive ? `drop-shadow(0 0 6px rgba(${ROSE},0.7))` : "none", transition: "filter .25s" }} />
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2.5" fill="url(#hr-wall)" opacity="0.18" />
                  <line x1={b.x + 3} y1={b.y + 7} x2={b.x + b.w - 3} y2={b.y + 7} stroke={CREAM(0.55)} strokeWidth="1.4" />
                  <line x1={b.x + 3} y1={b.y + b.h - 7} x2={b.x + b.w - 3} y2={b.y + b.h - 7} stroke={CREAM(0.3)} strokeWidth="1" />
                  {b.w >= 24 && (
                    <text x={b.x + b.w / 2 + 3} y={b.y + b.h / 2} className="font-display" fontSize="9" fill={CREAM(0.9)} textAnchor="middle" writingMode="tb">{trunc(b.story.title, 12)}</text>
                  )}
                  {b.story.id === (liveTableStoryId ?? "") && (
                    <motion.circle cx={b.x + b.w / 2} cy={b.y - 6} r="2.5" fill={`rgb(${ROSE})`} animate={reduce ? {} : { opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  )}
                </motion.g>
              );
            })}

            {/* bottom shelf: the empty slot, the spark jar, a few quiet decoys */}
            <rect x="948" y="480" width="40" height="68" rx="3" stroke={`rgba(${GLOW},0.5)`} strokeWidth="1.5" strokeDasharray="5 4" style={{ filter: hot === "newbook" ? `drop-shadow(0 0 6px rgba(${GLOW},0.6))` : "none", transition: "filter .25s" }} />
            <path d="M968 506 v16 M960 514 h16" stroke={`rgba(${GLOW},0.7)`} strokeWidth="2" strokeLinecap="round" />
            <g style={{ filter: hot === "jar" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
              <rect x="1006" y="492" width="46" height="56" rx="9" fill={CREAM(0.08)} stroke={CREAM(0.4)} strokeWidth="1.6" />
              <rect x="1003" y="486" width="52" height="9" rx="3" fill="rgb(168,124,68)" stroke={WOOD.deep} strokeWidth="1" />
              <path d="M1012 500 q0 20 0 40" stroke={CREAM(0.25)} strokeWidth="2" strokeLinecap="round" />
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.circle key={i} cx={1016 + arand(hash(`jf-x-${i}`)) * 28} cy={500 + arand(hash(`jf-y-${i}`)) * 38} r="2" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 4px rgba(${GLOW},0.9))` }} animate={reduce ? { opacity: 0.6 } : { opacity: [0.1, 0.95, 0.1] }} transition={reduce ? {} : { duration: 1.8 + arand(hash(`jf-d-${i}`)) * 2, delay: arand(hash(`jf-t-${i}`)) * 2.5, repeat: Infinity, ease: "easeInOut" }} />
              ))}
            </g>
            <g transform="rotate(-10 1090 548)"><rect x="1072" y="488" width="17" height="60" rx="2.5" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1" /></g>
            <rect x="1094" y="490" width="16" height="58" rx="2.5" fill="rgb(110,78,52)" stroke={WOOD.deep} strokeWidth="1" />
            <rect x="1116" y="524" width="44" height="11" rx="2" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1" />
            <rect x="1120" y="513" width="38" height="11" rx="2" fill="rgb(110,78,52)" stroke={WOOD.deep} strokeWidth="1" />
          </g>

          {/* the hour tints the whole room, gently */}
          <rect x="0" y="0" width="1200" height="640" fill={`rgba(${phaseRgb},0.05)`} />
          {isDark && <rect x="0" y="0" width="1200" height="640" fill="rgba(26,14,32,0.12)" />}
        </svg>

        {/* ── hotspots — invisible, hoverable, clickable ── */}
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
          return z.href ? (
            <Link key={z.key} href={z.href} aria-label={`${z.title} — ${z.sub}`} className="absolute z-20 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber/60" style={style} {...handlers} />
          ) : (
            <div key={z.key} role="img" aria-label={`${z.title} — ${z.sub}`} tabIndex={0} className="absolute z-20 cursor-default rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber/40" style={style} {...handlers} />
          );
        })}

        {/* ── the room speaks: one tooltip near whatever you touch ── */}
        {tip && (
          <div
            className="pointer-events-none absolute z-30"
            style={{ left: `${tipX}%`, top: `${tipY}%`, transform: `translate(-50%, ${tipAbove ? "calc(-100% - 10px)" : "10px"})` }}
          >
            <motion.div
              key={tip.key}
              initial={{ opacity: 0, y: tipAbove ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="flex w-max max-w-[280px] items-center gap-3 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 backdrop-blur-md"
            >
              {tip.cover && (
                <CoverArt seed={tip.cover.seed} title="" image={tip.cover.image} className="h-16 w-12 shrink-0 rounded-md ring-1 ring-white/15" />
              )}
              <div className="min-w-0">
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-amber">{tip.eyebrow}</span>
                <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">{tip.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">{tip.sub}</p>
                {tip.cta && <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-amber">{tip.cta}</span>}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <p className="mt-2.5 text-center font-reading text-[13px] italic text-text-ghost">
        Hover around the room — everything in it is yours.
      </p>
    </section>
  );
}

// the sky through the window keeps the hour — and your readers' lamps,
// lit across the way (rendered inside the window clip)
function WindowSky({ phaseKey, lamps, reduce }: { phaseKey: PhaseKey; lamps: number; reduce: boolean | null }) {
  const isDark = phaseKey === "night" || phaseKey === "dusk";
  const stars = Array.from({ length: 9 }).map((_, i) => ({
    x: 404 + arand(hash(`st-x-${i}`)) * 222,
    y: 96 + arand(hash(`st-y-${i}`)) * (phaseKey === "dusk" ? 90 : 190),
    r: 0.8 + arand(hash(`st-r-${i}`)) * 1.2,
    dur: 2 + arand(hash(`st-d-${i}`)) * 3,
    delay: arand(hash(`st-t-${i}`)) * 4,
  }));
  return (
    <motion.g key={phaseKey} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}>
      {isDark ? (
        <>
          {phaseKey === "night" && (
            <g>
              <circle cx="576" cy="142" r="21" fill="rgba(248,232,196,0.85)" style={{ filter: "drop-shadow(0 0 10px rgba(243,226,189,0.5))" }} />
              <circle cx="569" cy="136" r="4.5" fill="rgba(180,160,128,0.35)" />
              <circle cx="582" cy="150" r="3" fill="rgba(180,160,128,0.3)" />
            </g>
          )}
          {phaseKey === "dusk" && (
            <>
              <circle cx="470" cy="282" r="26" fill="rgba(238,158,100,0.8)" style={{ filter: "drop-shadow(0 0 12px rgba(232,150,96,0.5))" }} />
              <path d="M540 240 h44 M520 258 h34 M556 222 h28" stroke="rgba(232,150,96,0.4)" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {stars.map((s, i) => (
            <motion.circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(243,226,189,0.9)" animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.9, 0.15] }} transition={reduce ? {} : { duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }} />
          ))}
          {/* distant hills under the moon — and the readers' cottages */}
          <path d="M392 290 q60 -24 120 0 q70 -28 126 4 v40 h-246 Z" fill="rgba(30,20,48,0.65)" />
          {[{ x: 436, y: 286 }, { x: 562, y: 276 }, { x: 612, y: 294 }].slice(0, lamps).map((c, i) => (
            <g key={i}>
              <rect x={c.x - 7} y={c.y - 6} width="14" height="10" rx="1" fill="rgb(32,22,46)" />
              <path d={`M${c.x - 9} ${c.y - 6} L${c.x} ${c.y - 13} L${c.x + 9} ${c.y - 6} Z`} fill="rgb(26,17,38)" />
              <motion.rect x={c.x - 2.5} y={c.y - 4} width="5" height="6" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 5px rgba(${GLOW},0.9))` }} animate={reduce ? { opacity: 0.8 } : { opacity: [0.5, 1, 0.6, 0.95, 0.55] }} transition={reduce ? {} : { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }} />
            </g>
          ))}
        </>
      ) : (
        <>
          <circle cx="452" cy="150" r="22" fill={`rgba(${GLOW},0.85)`} style={{ filter: `drop-shadow(0 0 14px rgba(${GLOW},0.6))` }} />
          {Array.from({ length: 8 }).map((_, i) => {
            const ang = (i / 8) * Math.PI * 2;
            return <line key={i} x1={452 + Math.cos(ang) * 29} y1={150 + Math.sin(ang) * 29} x2={452 + Math.cos(ang) * 36} y2={150 + Math.sin(ang) * 36} stroke={`rgba(${GLOW},0.65)`} strokeWidth="2.5" strokeLinecap="round" />;
          })}
          <path d="M540 130 h40 a9 9 0 0 0 -17 -10 a11 11 0 0 0 -21 5 z" fill={CREAM(0.25)} />
          <path d="M500 188 h30 a7 7 0 0 0 -13 -8 a9 9 0 0 0 -16 4 z" fill={CREAM(0.18)} />
          <path d="M580 220 q5 -5 10 0 q5 -5 10 0 M420 240 q4 -4 8 0 q4 -4 8 0" stroke="rgba(120,90,60,0.6)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M392 290 q60 -24 120 0 q70 -28 126 4 v40 h-246 Z" fill={`rgba(${SAGE},0.55)`} />
        </>
      )}
    </motion.g>
  );
}

// a flame: bright core in a warm body, flickering from its base
function Flame({ cx, base, s = 1, reduce }: { cx: number; base: number; s?: number; reduce: boolean | null }) {
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      animate={reduce ? {} : { scaleY: [1, 1.16, 0.93, 1.1, 1], skewX: [0, 2.5, -2.5, 1.5, 0] }}
      transition={{ duration: 2 + s * 0.3, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={`M ${cx} ${base} C ${cx - 7 * s} ${base - 9 * s} ${cx - 4 * s} ${base - 16 * s} ${cx} ${base - 22 * s} C ${cx + 4 * s} ${base - 16 * s} ${cx + 7 * s} ${base - 9 * s} ${cx} ${base} Z`} fill="rgba(238,140,52,0.9)" />
      <path d={`M ${cx} ${base} C ${cx - 3.5 * s} ${base - 6 * s} ${cx - 2 * s} ${base - 10 * s} ${cx} ${base - 13 * s} C ${cx + 2 * s} ${base - 10 * s} ${cx + 3.5 * s} ${base - 6 * s} ${cx} ${base} Z`} fill="rgb(255,224,150)" />
    </motion.g>
  );
}

// a wisp of steam off tea or the kettle
function Steam({ x, y, reduce, delay = 0 }: { x: number; y: number; reduce: boolean | null; delay?: number }) {
  return (
    <motion.path
      d={`M${x} ${y} q-4 -8 1 -14 q4 -6 0 -12`}
      stroke={CREAM(0.32)}
      strokeWidth="1.5"
      strokeLinecap="round"
      animate={reduce ? { opacity: 0.2 } : { opacity: [0, 0.5, 0], y: [3, -6] }}
      transition={reduce ? {} : { duration: 3.4, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── entrance choreography: each section rises into the lamplight in turn ─────
function Rise({ children, delay, reduce }: { children: React.ReactNode; delay: number; reduce: boolean | null }) {
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7, ease: [0.21, 0.6, 0.35, 1] }}>
      {children}
    </motion.div>
  );
}

// ── the greeting writes itself in, word by word, blur lifting like wet ink ───
function InkHeadline({ text, reduce }: { text: string; reduce: boolean | null }) {
  const words = text.split(" ");
  return (
    <h1 className="font-display text-3xl leading-tight text-paper sm:text-[40px]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(7px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.2 + i * 0.09, duration: 0.55, ease: "easeOut" }}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </h1>
  );
}

// ── ember motes drifting up through the lamplight ────────────────────────────
function Motes({ accent, reduce }: { accent: string; reduce: boolean | null }) {
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {Array.from({ length: 16 }).map((_, i) => {
        const left = arand(hash(`mote-x-${i}`)) * 100;
        const top = 30 + arand(hash(`mote-y-${i}`)) * 65;
        const size = 1.5 + arand(hash(`mote-s-${i}`)) * 2.5;
        const dur = 9 + arand(hash(`mote-d-${i}`)) * 9;
        const delay = arand(hash(`mote-t-${i}`)) * 8;
        const drift = (arand(hash(`mote-w-${i}`)) - 0.5) * 50;
        const warm = i % 3 !== 0;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              backgroundColor: warm ? `rgba(${accent},0.8)` : "rgba(245,232,210,0.6)",
              boxShadow: warm ? `0 0 ${size * 3}px rgba(${accent},0.5)` : "none",
            }}
            animate={{ y: [0, -90], x: [0, drift], opacity: [0, 0.8, 0.5, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

// ── a note left on the desk: paper scrap, pushpin, slight off-square tilt ────
function DeskNote({ life, i, reduce }: { life: Life; i: number; reduce: boolean | null }) {
  const a = life.accent;
  const tilt = ((i % 3) - 1) * 1.4;
  const Icon = life.kind === "notes" ? MessageSquareText : life.kind === "collab" ? Users : life.kind === "follows" ? Heart : life.kind === "creator" ? Coins : life.kind === "reading" ? BookOpen : life.kind === "table" ? Swords : PenLine;
  return (
    <motion.div
      className="relative w-52 shrink-0 pt-2"
      style={{ rotate: tilt }}
      whileHover={reduce ? undefined : { rotate: 0, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Link
        href={life.href}
        className="relative flex h-44 flex-col justify-between overflow-hidden rounded-lg border border-white/8 p-4"
        style={{ background: `linear-gradient(180deg, rgba(245,236,220,0.05), rgba(245,236,220,0.015)), rgba(${a},0.05)`, boxShadow: `inset 0 1px 0 rgba(${a},0.14), 0 10px 24px rgba(0,0,0,0.35)` }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `rgba(${a},0.16)`, color: `rgb(${a})` }}><Icon className="h-4 w-4" /></span>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>{labelFor(life.kind)}</span>
          <h3 className="mt-0.5 line-clamp-1 font-display text-base leading-tight text-paper">{life.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{life.sub}</p>
        </div>
      </Link>
      {/* pushpin */}
      <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full" style={{ backgroundColor: `rgb(${a})`, boxShadow: `0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 1px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.5)` }} />
    </motion.div>
  );
}

function labelFor(kind: Kind): string {
  switch (kind) {
    case "table": return "Live table";
    case "wip": return "Your desk";
    case "reading": return "Continue reading";
    case "notes": return "Readers waiting";
    case "collab": return "Collaboration";
    case "follows": return "Following";
    case "creator": return "Your earnings";
    case "cold": return "Cold draft";
  }
}
