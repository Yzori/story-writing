"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import { PhaseClock, ScenesRail, phaseInfo, PHASES, hash, arand, CLOCK_FALLBACK, type PhaseKey } from "@/components/dashboard/studio-kit";
import { READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import {
  WOOD, CREAM, GLOW, ROSE, SAGE, LAV,
  greeting, type Zone, ZoneLayer, ZoneTip, layoutBooks, BookRow,
  Flame, Rise, InkHeadline, Motes, DeskNote, type Life,
} from "@/components/dashboard-mockup/room-kit";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Treehouse" — your studio up in a tree, half den, half open platform
// under the sky. The den keeps your craft: the desk is your WIP (or the live
// table), the little shelf holds your real works. The platform keeps your
// world: a reading cushion under the stars, a telescope aimed at everyone
// else's stories, a birdhouse that takes reader mail, a lantern your streak
// keeps lit, a jar of sparks on the railing, a rope bridge to your
// collaborators — and a sapling waiting to be planted. The tree itself grows
// with your words. An owl and a squirrel keep watch.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;

export default function TreehouseStudio() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories, activeStory, activeHref, liveCampaigns, notifs } = data;
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
  const comments = notifs.filter((n) => n.type === "comment" && !n.read);
  const totalWords = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
  const totalSparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
  const focusAccent = liveTable ? ROSE : GLOW;

  const rail = useMemo<Life[]>(() => {
    if (!loaded || error) return [];
    return [
      { key: "follows", kind: "follows", accent: LAV, href: "/read", title: "Writers you follow", sub: READING_DEMO.follows[0].text },
      { key: "creator", kind: "creator", accent: "208,136,88", href: "/creator/earnings", title: "240 drops this week", sub: "tips, unlocks and gifts" },
    ];
  }, [loaded, error]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(48,32,18,0.4), transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(135% 100% at 50% 0%, transparent 50%, rgba(6,4,2,0.55) 100%)" }} />
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        animate={reduce ? { opacity: 0.9 } : { opacity: [0.72, 1, 0.8, 0.96, 0.75, 1, 0.85] }}
        transition={reduce ? {} : { duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(58% 44% at 16% 10%, rgba(${focusAccent},0.16), transparent 62%), radial-gradient(46% 36% at 86% 26%, rgba(${PHASES[phaseKey].rgb},0.1), transparent 58%)` }}
      />
      <Motes accent={focusAccent} reduce={reduce} />

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
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Treehouse` : "Your Treehouse"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <ConceptSwitcher current="treehouse" />

        {!loaded ? (
          <div className="mt-7 aspect-[1200/640] animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The ladder is up right now — try again in a moment.</p>
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
                {PHASES[phaseKey].label} — {PHASES[phaseKey].mood}. The ladder is down for you.
              </motion.p>
            </div>

            <Rise delay={0.25} reduce={reduce}>
              <Scene
                phaseKey={phaseKey}
                reduce={reduce}
                stories={allStories}
                activeStory={activeStory}
                activeHref={activeHref}
                liveTableTitle={liveTable?.title ?? null}
                liveTableHref={liveTable ? `/campaign/${liveTable.id}/play/${liveTable.activeSession!.id}` : null}
                liveTableStoryId={liveTable?.id ?? null}
                yourMove={yourMove}
                commentCount={comments.length}
                latestComment={comments[0]?.message ?? null}
                totalWords={totalWords}
                totalSparks={totalSparks}
              />
            </Rise>

            {rail.length > 0 && (
              <Rise delay={0.5} reduce={reduce}>
                <section className="mt-8">
                  <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Down on the ground</h2>
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
// THE TREEHOUSE — den on the left, open platform under the sky on the right
// ═════════════════════════════════════════════════════════════════════════════

function Scene({ phaseKey, reduce, stories, activeStory, activeHref, liveTableTitle, liveTableHref, liveTableStoryId, yourMove, commentCount, latestComment, totalWords, totalSparks }: {
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
  totalWords: number;
  totalSparks: number;
}) {
  const [hot, setHot] = useState<string | null>(null);
  const isDark = phaseKey === "night" || phaseKey === "dusk";
  const gl = isDark ? 1 : 0.4;
  const phaseRgb = PHASES[phaseKey].rgb;
  const cur = READING_DEMO.current;
  // the den shelf is small — tighter spines
  const books = useMemo(
    () => layoutBooks(stories.slice(0, 10), { rows: [318, 372], x0: 530, xMax: 622, gap: 4, wBase: 13, wVar: 7, hBase: 36, hVar: 14 }),
    [stories],
  );
  // the canopy grows with your words
  const growth = Math.min(3, Math.floor(totalWords / 20_000));

  const deskZone: Zone = liveTableTitle
    ? { key: "desk", rect: [292, 320, 215, 145], href: liveTableHref!, eyebrow: yourMove ? "Your move" : "Live · the table is lit", title: liveTableTitle, sub: yourMove ? "the den is holding its breath for you" : "pull up a stump — the session is on", cta: yourMove ? "Take your turn →" : "Climb in →" }
    : activeStory
      ? { key: "desk", rect: [292, 320, 215, 145], href: activeHref, eyebrow: "Still warm", title: activeStory.title, sub: `${activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1"} · ${(activeStory.totalWords || 0).toLocaleString()} words — the ink hasn't dried`, cta: "Pick up the pen →" }
      : { key: "desk", rect: [292, 320, 215, 145], href: "/create", eyebrow: "A clean page", title: "The desk is ready", sub: "nothing on it yet but lanternlight", cta: "Start your first story →" };

  const zones: Zone[] = [
    { key: "plaque", rect: [196, 496, 120, 76], eyebrow: "Carved in the trunk", title: `${totalWords.toLocaleString()} words`, sub: "the tree remembers every one — it grows as you write" },
    deskZone,
    { key: "nook", rect: [660, 408, 140, 75], href: "/read", eyebrow: "The reading cushion", title: cur.title, sub: `by ${cur.author} · Ch. ${cur.chapter} of ${cur.of} — best read under this sky`, cta: "Slip back in →" },
    { key: "telescope", rect: [808, 318, 110, 160], href: "/browse", eyebrow: "The telescope", title: "Other worlds are out tonight", sub: "aim it anywhere — someone is telling a story", cta: "Go wander →" },
    { key: "sapling", rect: [924, 408, 62, 72], href: "/create", eyebrow: "A sapling", title: "Not planted yet", sub: "every great tree starts as a story this small", cta: "Plant it →" },
    { key: "jar", rect: [996, 336, 56, 70], href: "/creator/earnings", eyebrow: "A jar of sparks", title: `${totalSparks.toLocaleString()} sparks`, sub: "caught from readers who lit up", cta: "Hold it to the light →" },
    { key: "lantern", rect: [1076, 280, 64, 130], href: "/read", eyebrow: "The lantern", title: `${READING_DEMO.streak} nights lit`, sub: "your reading streak keeps it burning", cta: "Keep it lit →" },
    { key: "birdhouse", rect: [716, 128, 80, 100], href: "/notifications", eyebrow: "The birdhouse", title: commentCount > 0 ? `${commentCount} reader note${commentCount === 1 ? "" : "s"}` : "No new mail", sub: commentCount > 0 ? (latestComment ?? "the birds brought word from your readers") : "the perch is empty tonight", cta: commentCount > 0 ? "Read them →" : undefined },
    { key: "bridge", rect: [1142, 380, 58, 90], href: "/notifications", eyebrow: "The rope bridge", title: "2 suggestions to review", sub: `your collaborators live one tree over — ${activeStory?.title ?? "your story"} is waiting`, cta: "Cross over →" },
    ...books.map((b): Zone => ({
      key: `book-${b.story.id}`,
      rect: [b.x - 2, b.y - 5, b.w + 4, b.h + 5],
      href: storyHref(b.story),
      eyebrow: b.story.writingMode === "campaign" ? (b.story.id === liveTableStoryId ? "Live table" : "Campaign") : b.story.status === "draft" ? "Draft" : "On the den shelf",
      title: b.story.title,
      sub: `${b.story.chapterCount > 0 ? `${b.story.chapterCount} chapter${b.story.chapterCount === 1 ? "" : "s"} · ` : ""}${(b.story.totalWords || 0).toLocaleString()} words`,
      cta: "Take it down →",
      cover: { seed: b.story.id, title: b.story.title, image: b.story.coverImageUrl },
    })),
    { key: "owl", rect: [920, 120, 64, 70], eyebrow: "The owl", title: "Hoo.", sub: "she has read everything you've ever written. no notes." },
    { key: "squirrel", rect: [1126, 322, 56, 52], eyebrow: "The squirrel", title: "!", sub: "keeps stealing your pen lids. invaluable team member." },
    { key: "cat", rect: [404, 414, 66, 46], eyebrow: "The cat", title: "Mrrp.", sub: "climbed all the way up. still unimpressed" },
  ];

  return (
    <section className="relative mt-7">
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ aspectRatio: "1200/640", background: "rgb(26,17,12)" }}>
        <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="th-sky" x1="0" y1="0" x2="0" y2="1">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="rgb(22,14,10)" />
                  <stop offset="100%" stopColor="rgb(46,31,21)" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="rgb(112,86,52)" />
                  <stop offset="100%" stopColor="rgb(64,45,29)" />
                </>
              )}
            </linearGradient>
            <radialGradient id="th-glow">
              <stop offset="0%" stopColor={`rgba(${GLOW},0.4)`} />
              <stop offset="100%" stopColor={`rgba(${GLOW},0)`} />
            </radialGradient>
          </defs>

          {/* ── the sky — wide open, this is the whole point ── */}
          <rect x="0" y="0" width="1200" height="640" fill="url(#th-sky)" />
          <rect x="0" y="0" width="1200" height="640" fill={`rgba(${phaseRgb},0.06)`} />
          {isDark ? (
            <g>
              <circle cx="1040" cy="96" r="30" fill="rgba(243,226,189,0.55)" />
              <circle cx="1030" cy="88" r="6" fill="rgba(180,160,128,0.35)" />
              <circle cx="1050" cy="104" r="4" fill="rgba(180,160,128,0.3)" />
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.circle
                  key={i}
                  cx={620 + arand(hash(`tst-x-${i}`)) * 560}
                  cy={30 + arand(hash(`tst-y-${i}`)) * 260}
                  r={0.8 + arand(hash(`tst-r-${i}`)) * 1.3}
                  fill="rgba(243,226,189,0.9)"
                  animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.9, 0.15] }}
                  transition={reduce ? {} : { duration: 2 + arand(hash(`tst-d-${i}`)) * 3, delay: arand(hash(`tst-t-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
              {/* a shooting star, every little while */}
              {!reduce && (
                <motion.line
                  x1="0" y1="0" x2="34" y2="14"
                  stroke="rgba(243,226,189,0.85)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  initial={{ x: 880, y: 50, opacity: 0 }}
                  animate={{ x: [880, 700], y: [50, 130], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 8.5, ease: "easeOut" }}
                />
              )}
            </g>
          ) : (
            <g>
              <circle cx="1010" cy="110" r="34" fill={`rgba(${GLOW},0.5)`} />
              {Array.from({ length: 8 }).map((_, i) => {
                const ang = (i / 8) * Math.PI * 2;
                return <line key={i} x1={1010 + Math.cos(ang) * 44} y1={110 + Math.sin(ang) * 44} x2={1010 + Math.cos(ang) * 54} y2={110 + Math.sin(ang) * 54} stroke={`rgba(${GLOW},0.4)`} strokeWidth="3" strokeLinecap="round" />;
              })}
              <path d="M700 90 h54 a12 12 0 0 0 -23 -13 a15 15 0 0 0 -28 7 z" fill={CREAM(0.25)} />
              <path d="M850 170 h40 a9 9 0 0 0 -17 -10 a11 11 0 0 0 -21 5 z" fill={CREAM(0.18)} />
              <path d="M760 220 q6 -6 12 0 q6 -6 12 0 M920 250 q5 -5 10 0 q5 -5 10 0" stroke="rgba(100,76,50,0.7)" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          {/* far treeline below the platform */}
          <path d="M0 600 q80 -40 160 -16 q90 -36 180 -8 q100 -40 200 -10 q110 -34 220 -6 q100 -30 200 -8 q120 -30 240 -4 v92 h-1200 Z" fill="rgba(18,12,8,0.75)" />

          {/* ── THE TREE — it holds everything up, and grows with your words ── */}
          <g>
            {/* canopy behind the den */}
            <motion.g
              animate={reduce ? {} : { rotate: [0, 0.7, 0, -0.7, 0] }}
              transition={reduce ? {} : { duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformBox: "fill-box", transformOrigin: "30% 90%" }}
            >
              <ellipse cx="150" cy="150" rx="150" ry="105" fill="rgb(50,66,44)" />
              <ellipse cx="320" cy="90" rx="135" ry="85" fill="rgb(56,74,49)" />
              <ellipse cx="80" cy="270" rx="110" ry="80" fill="rgb(44,58,39)" />
              <ellipse cx="240" cy="190" rx="100" ry="66" fill="rgb(62,82,54)" />
              {growth >= 1 && <ellipse cx="470" cy="110" rx="100" ry="62" fill="rgb(52,69,46)" />}
              {growth >= 2 && <ellipse cx="590" cy="70" rx="86" ry="52" fill="rgb(58,77,51)" />}
              {growth >= 3 && <ellipse cx="690" cy="110" rx="70" ry="44" fill="rgb(48,64,43)" />}
              <ellipse cx="200" cy="120" rx="60" ry="36" fill={`rgba(${SAGE},0.3)`} />
              <ellipse cx="380" cy="70" rx="48" ry="28" fill={`rgba(${SAGE},0.25)`} />
            </motion.g>
            {/* trunk */}
            <path d="M196 640 C 206 520 198 420 226 320 C 240 270 250 200 248 120 L 318 120 C 314 210 308 280 296 330 C 280 420 296 520 306 640 Z" fill="rgb(74,52,34)" stroke="rgb(50,34,22)" strokeWidth="3" />
            <path d="M226 600 q6 -90 16 -150 M268 620 q-4 -110 4 -190 M290 560 q4 -80 -2 -140" stroke="rgb(58,40,26)" strokeWidth="2.5" strokeLinecap="round" />
            {/* the big bough carrying the platform */}
            <path d="M296 330 C 460 300 700 290 920 304 C 1030 310 1120 322 1198 338 L 1198 366 C 1100 350 1000 340 900 336 C 680 326 470 334 300 366 Z" fill="rgb(70,49,31)" stroke="rgb(50,34,22)" strokeWidth="3" />
            {/* a high branch for the birdhouse + owl */}
            <path d="M260 150 C 420 120 640 112 820 128 C 900 134 980 142 1040 154" stroke="rgb(62,43,28)" strokeWidth="12" strokeLinecap="round" />
            <path d="M700 124 q10 26 4 44 M950 142 q8 18 4 34" stroke="rgb(62,43,28)" strokeWidth="6" strokeLinecap="round" />
            {/* carved plaque on the trunk */}
            <g style={{ filter: hot === "plaque" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
              <ellipse cx="256" cy="534" rx="52" ry="34" fill="rgb(60,42,27)" stroke="rgb(44,30,20)" strokeWidth="2.5" />
              <ellipse cx="256" cy="534" rx="44" ry="27" stroke={CREAM(0.25)} strokeWidth="1" strokeDasharray="3 3" />
              <text x="256" y="532" textAnchor="middle" className="font-display" fontSize="15" fill={`rgb(${GLOW})`}>{totalWords > 0 ? totalWords.toLocaleString() : "· · ·"}</text>
              <text x="256" y="548" textAnchor="middle" className="font-mono" fontSize="6.5" letterSpacing="1.5" fill={CREAM(0.55)}>WORDS, RING BY RING</text>
            </g>
          </g>

          {/* ── THE PLATFORM — planks, posts, railing ── */}
          <g>
            <rect x="252" y="468" width="924" height="16" rx="4" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="2" />
            {[340, 440, 540, 660, 760, 860, 960, 1060, 1150].map((x) => <line key={x} x1={x} y1="470" x2={x} y2="482" stroke={WOOD.deep} strokeWidth="1.5" />)}
            {/* support struts to the trunk */}
            <path d="M420 484 L 330 580 M700 484 L 620 640 M1020 484 L 960 640" stroke="rgb(62,43,28)" strokeWidth="8" strokeLinecap="round" />
            {/* railing along the open stretch */}
            <line x1="650" y1="402" x2="1176" y2="402" stroke={WOOD.mid} strokeWidth="6" strokeLinecap="round" />
            {[660, 740, 820, 900, 980, 1060, 1140].map((x) => <rect key={x} x={x} y="402" width="7" height="66" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="1" />)}
            {/* rope ladder down from the den */}
            <path d="M286 484 q-6 80 -2 156 M316 484 q4 80 0 156" stroke="rgb(150,120,84)" strokeWidth="3" />
            {[516, 548, 580, 612].map((y) => <line key={y} x1="285" y1={y} x2="317" y2={y} stroke="rgb(150,120,84)" strokeWidth="3" strokeLinecap="round" />)}
          </g>

          {/* ── THE DEN — half the house, cut open like a dollhouse ── */}
          <g>
            {/* back wall + roof */}
            <rect x="262" y="218" width="380" height="250" fill="rgb(52,37,25)" stroke={WOOD.deep} strokeWidth="2.5" />
            {[252, 286, 320, 354, 388, 422].map((y) => <line key={y} x1="264" y1={y} x2="640" y2={y} stroke="rgba(30,20,14,0.6)" strokeWidth="1.5" />)}
            <path d="M236 224 L 452 138 L 668 224 Z" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="3" />
            <path d="M236 224 L 452 144 L 668 224" stroke={WOOD.light} strokeWidth="4" />
            {/* hanging lantern inside */}
            <motion.g animate={reduce ? {} : { rotate: [0, 2.5, 0, -2.5, 0] }} transition={reduce ? {} : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
              <line x1="452" y1="224" x2="452" y2="252" stroke={CREAM(0.4)} strokeWidth="1.5" />
              <rect x="442" y="252" width="20" height="26" rx="4" fill="rgba(30,20,14,0.8)" stroke={CREAM(0.4)} strokeWidth="1.5" />
              <Flame cx={452} base={274} s={0.6} reduce={reduce} />
            </motion.g>
            <motion.circle cx="452" cy="268" r="40" fill="url(#th-glow)" animate={reduce ? { opacity: 0.6 * gl } : { opacity: [0.4 * gl, 0.75 * gl, 0.5 * gl] }} transition={reduce ? {} : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />

            {/* the desk — protagonist */}
            <g style={{ filter: hot === "desk" ? "brightness(1.2)" : "none", transition: "filter .3s" }}>
              <motion.ellipse cx="392" cy="400" rx="110" ry="42" fill="url(#th-glow)" animate={reduce ? { opacity: 0.5 * gl } : { opacity: [0.35 * gl, 0.65 * gl, 0.42 * gl] }} transition={reduce ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }} />
              <rect x="300" y="388" width="200" height="11" rx="3" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
              <rect x="310" y="399" width="10" height="69" fill={WOOD.dark} />
              <rect x="480" y="399" width="10" height="69" fill={WOOD.dark} />
              {/* manuscript */}
              <g transform="rotate(-2 360 376)">
                <rect x="330" y="372" width="62" height="11" rx="2" fill={CREAM(0.6)} />
                <rect x="333" y="366" width="60" height="9" rx="2" fill={CREAM(0.9)} />
                <path d="M339 370 h36 M339 372.5 h46" stroke="rgb(130,100,72)" strokeWidth="1" />
              </g>
              {/* inkwell + quill */}
              <rect x="412" y="376" width="13" height="12" rx="2.5" fill="rgb(28,19,14)" stroke={WOOD.deep} strokeWidth="1" />
              <path d="M418 378 C 424 362 432 350 444 344 C 435 358 428 368 422 379 Z" fill={CREAM(0.85)} stroke="rgb(150,120,90)" strokeWidth="1" />
              {/* candle */}
              <rect x="448" y="372" width="9" height="16" rx="2" fill={CREAM(0.9)} />
              <Flame cx={452.5} base={370} s={0.65} reduce={reduce} />
              {/* live table: dice on the desk */}
              {liveTableTitle && (
                <motion.path d="M472 372 l7 -11 l7 11 l-7 11 Z M472 372 l14 0" fill={`rgba(${ROSE},0.9)`} stroke="rgb(120,60,72)" strokeWidth="1" animate={reduce ? {} : { opacity: [0.75, 1, 0.75] }} transition={reduce ? {} : { duration: 1.8, repeat: Infinity }} style={{ filter: `drop-shadow(0 0 7px rgba(${ROSE},0.8))` }} />
              )}
              {/* stool */}
              <rect x="518" y="430" width="46" height="8" rx="3" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
              <rect x="524" y="438" width="7" height="30" fill={WOOD.dark} />
              <rect x="550" y="438" width="7" height="30" fill={WOOD.dark} />
            </g>

            {/* the den shelf — your works */}
            <g>
              <rect x="524" y="270" width="104" height="112" rx="4" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
              <rect x="530" y="276" width="92" height="100" fill="rgb(40,28,19)" />
              <rect x="530" y="318" width="92" height="6" fill={WOOD.light} />
              <rect x="530" y="372" width="92" height="6" fill={WOOD.light} />
              <BookRow books={books} hot={hot} liveId={liveTableStoryId} reduce={reduce} titleMin={99} />
            </g>

            {/* the cat made it up here too */}
            <g>
              <motion.g animate={{ opacity: hot === "cat" ? 0 : 1 }} transition={{ duration: 0.2 }}>
                <ellipse cx="436" cy="446" rx="22" ry="10" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <circle cx="420" cy="443" r="7.5" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <path d="M415 438 l1 -5 l4 3 M421 436 l4 -4 l1 5" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.1" strokeLinejoin="round" />
                <path d="M456 449 q10 -2 9 -11" stroke="rgb(88,66,50)" strokeWidth="4.5" strokeLinecap="round" />
              </motion.g>
              <motion.g animate={{ opacity: hot === "cat" ? 1 : 0 }} transition={{ duration: 0.2 }}>
                <ellipse cx="438" cy="448" rx="20" ry="9" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <circle cx="421" cy="430" r="8" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <path d="M415 424 l0 -7 l6 4 M425 421 l5 -5 l3 7" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.1" strokeLinejoin="round" />
                <circle cx="418" cy="429" r="1.2" fill="rgb(40,28,20)" />
                <circle cx="424" cy="429" r="1.2" fill="rgb(40,28,20)" />
                <text x="438" y="412" textAnchor="middle" className="font-reading" fontSize="10" fontStyle="italic" fill={CREAM(0.75)}>mrrp.</text>
              </motion.g>
            </g>
          </g>

          {/* ── THE PLATFORM LIFE — everything under the open sky ── */}
          {/* reading cushion + blanket + open book */}
          <g style={{ filter: hot === "nook" ? "brightness(1.2)" : "none", transition: "filter .3s" }}>
            <ellipse cx="724" cy="462" rx="58" ry="14" fill={`rgba(${ROSE},0.55)`} stroke="rgb(120,60,72)" strokeWidth="1.5" />
            <ellipse cx="724" cy="452" rx="50" ry="12" fill={`rgba(${ROSE},0.7)`} />
            <path d="M688 446 q-16 4 -20 14 q14 6 30 0" fill={`rgba(${LAV},0.55)`} />
            <g transform="rotate(-5 740 440)">
              <path d="M716 440 q12 -8 24 0 q12 -8 24 0 l-3 7 q-10 -7 -21 0 q-10 -7 -21 0 Z" fill={CREAM(0.9)} stroke="rgb(120,90,60)" strokeWidth="1" />
              <line x1="740" y1="433" x2="740" y2="440" stroke="rgb(150,110,80)" strokeWidth="1" />
            </g>
            <motion.circle cx="724" cy="440" r="34" fill="url(#th-glow)" animate={reduce ? { opacity: 0.4 * gl } : { opacity: [0.3 * gl, 0.55 * gl, 0.35 * gl] }} transition={reduce ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          </g>

          {/* telescope */}
          <g style={{ filter: hot === "telescope" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <line x1="848" y1="468" x2="868" y2="396" stroke={WOOD.dark} strokeWidth="5" strokeLinecap="round" />
            <line x1="888" y1="468" x2="868" y2="396" stroke={WOOD.dark} strokeWidth="5" strokeLinecap="round" />
            <line x1="868" y1="464" x2="868" y2="408" stroke={WOOD.dark} strokeWidth="4" strokeLinecap="round" />
            <g transform="rotate(-28 868 392)">
              <rect x="826" y="384" width="84" height="16" rx="7" fill="rgb(122,84,52)" stroke={WOOD.deep} strokeWidth="2" />
              <rect x="902" y="381" width="18" height="22" rx="5" fill={WOOD.dark} stroke={WOOD.deep} strokeWidth="1.5" />
              <circle cx="832" cy="392" r="5" fill={CREAM(0.5)} />
            </g>
            {isDark && <motion.circle cx="930" cy="330" r="2" fill={CREAM(0.9)} animate={reduce ? {} : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.4, repeat: Infinity }} />}
          </g>

          {/* sapling in a pot */}
          <g style={{ filter: hot === "sapling" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
            <path d="M938 444 l5 24 h22 l5 -24 Z" fill="rgb(150,90,70)" stroke={WOOD.deep} strokeWidth="1.5" />
            <path d="M954 444 q0 -16 0 -24 M954 428 q-10 -6 -14 -14 M954 424 q10 -5 13 -13" stroke={`rgba(${SAGE},0.9)`} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="940" cy="412" r="4" fill={`rgba(${SAGE},0.8)`} />
            <circle cx="967" cy="409" r="4" fill={`rgba(${SAGE},0.8)`} />
            <circle cx="954" cy="398" r="4.5" fill={`rgba(${SAGE},0.9)`} />
          </g>

          {/* spark jar on the railing */}
          <g style={{ filter: hot === "jar" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
            <rect x="1004" y="348" width="40" height="50" rx="8" fill={CREAM(0.08)} stroke={CREAM(0.4)} strokeWidth="1.6" />
            <rect x="1001" y="342" width="46" height="8" rx="3" fill="rgb(168,124,68)" stroke={WOOD.deep} strokeWidth="1" />
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.circle key={i} cx={1012 + arand(hash(`tjf-x-${i}`)) * 24} cy={356 + arand(hash(`tjf-y-${i}`)) * 32} r="2" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 4px rgba(${GLOW},0.9))` }} animate={reduce ? { opacity: 0.6 } : { opacity: [0.1, 0.95, 0.1] }} transition={reduce ? {} : { duration: 1.8 + arand(hash(`tjf-d-${i}`)) * 2, delay: arand(hash(`tjf-t-${i}`)) * 2.5, repeat: Infinity, ease: "easeInOut" }} />
            ))}
          </g>

          {/* the streak lantern on its pole */}
          <g style={{ filter: hot === "lantern" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <rect x="1102" y="300" width="7" height="168" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="1" />
            <path d="M1105 300 q22 -6 30 8" stroke={WOOD.mid} strokeWidth="5" strokeLinecap="round" />
            <motion.g animate={reduce ? {} : { rotate: [0, 3, 0, -3, 0] }} transition={reduce ? {} : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
              <line x1="1135" y1="308" x2="1135" y2="320" stroke={CREAM(0.4)} strokeWidth="1.5" />
              <rect x="1124" y="320" width="22" height="28" rx="5" fill="rgba(30,20,14,0.8)" stroke={CREAM(0.45)} strokeWidth="1.6" />
              <Flame cx={1135} base={344} s={0.7} reduce={reduce} />
            </motion.g>
            <motion.circle cx="1135" cy="336" r="34" fill="url(#th-glow)" animate={reduce ? { opacity: 0.6 * gl } : { opacity: [0.4 * gl, 0.8 * gl, 0.5 * gl] }} transition={reduce ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          </g>

          {/* birdhouse on the high branch — reader mail */}
          <g style={{ filter: hot === "birdhouse" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <line x1="756" y1="146" x2="756" y2="166" stroke={CREAM(0.35)} strokeWidth="1.5" />
            <path d="M724 196 L 756 168 L 788 196 Z" fill={WOOD.dark} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="730" y="196" width="52" height="40" rx="3" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <circle cx="756" cy="212" r="8" fill="rgb(28,18,12)" />
            <line x1="756" y1="228" x2="756" y2="236" stroke={WOOD.deep} strokeWidth="2.5" strokeLinecap="round" />
            {commentCount > 0 && (
              <>
                <g transform="rotate(-12 744 206)"><rect x="734" y="200" width="20" height="14" rx="1.5" fill={CREAM(0.9)} stroke="rgb(150,120,90)" strokeWidth="0.8" /><path d="M734 201 l10 6 l10 -6" stroke="rgb(160,130,100)" strokeWidth="0.8" /></g>
                <circle cx="786" cy="196" r="9" fill={`rgb(${GLOW})`} />
                <text x="786" y="200" textAnchor="middle" className="font-mono" fontSize="10" fontWeight="bold" fill="rgb(40,26,12)">{commentCount}</text>
              </>
            )}
            {/* a small bird on the roof */}
            <ellipse cx="770" cy="186" rx="7" ry="5" fill="rgb(146,108,74)" />
            <circle cx="777" cy="182" r="3.5" fill="rgb(146,108,74)" />
            <path d="M780 182 l4 1 l-4 2" fill={`rgb(${GLOW})`} />
            <line x1="770" y1="191" x2="770" y2="194" stroke="rgb(80,60,45)" strokeWidth="1" />
          </g>

          {/* the owl, on the branch */}
          <g>
            <motion.g animate={{ opacity: hot === "owl" ? 0 : 1 }} transition={{ duration: 0.2 }}>
              <ellipse cx="950" cy="166" rx="15" ry="19" fill="rgb(110,84,60)" stroke="rgb(76,56,40)" strokeWidth="1.4" />
              <path d="M940 152 l-3 -8 l8 4 M960 152 l3 -8 l-8 4" fill="rgb(110,84,60)" stroke="rgb(76,56,40)" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M943 160 q3 2 6 0 M951 160 q3 2 6 0" stroke="rgb(60,44,32)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M947 168 l3 3 l3 -3" stroke={`rgb(${GLOW})`} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M938 174 q4 6 12 6 q8 0 12 -6" stroke="rgb(76,56,40)" strokeWidth="1.2" />
            </motion.g>
            <motion.g animate={{ opacity: hot === "owl" ? 1 : 0 }} transition={{ duration: 0.2 }}>
              <ellipse cx="950" cy="166" rx="15" ry="19" fill="rgb(110,84,60)" stroke="rgb(76,56,40)" strokeWidth="1.4" />
              <path d="M940 152 l-3 -8 l8 4 M960 152 l3 -8 l-8 4" fill="rgb(110,84,60)" stroke="rgb(76,56,40)" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="945" cy="160" r="4.5" fill={CREAM(0.95)} /><circle cx="955" cy="160" r="4.5" fill={CREAM(0.95)} />
              <circle cx="945" cy="160" r="2" fill="rgb(40,28,20)" /><circle cx="955" cy="160" r="2" fill="rgb(40,28,20)" />
              <path d="M947 168 l3 3 l3 -3" stroke={`rgb(${GLOW})`} strokeWidth="1.5" strokeLinejoin="round" />
              <text x="950" y="136" textAnchor="middle" className="font-reading" fontSize="10" fontStyle="italic" fill={CREAM(0.75)}>hoo.</text>
            </motion.g>
          </g>

          {/* the squirrel on the railing */}
          <g>
            <ellipse cx="1152" cy="392" rx="11" ry="8" fill="rgb(140,96,62)" stroke="rgb(96,64,42)" strokeWidth="1.2" />
            <circle cx="1142" cy="386" r="5.5" fill="rgb(140,96,62)" stroke="rgb(96,64,42)" strokeWidth="1.2" />
            <path d="M1139 382 l-1 -4 l4 2" fill="rgb(140,96,62)" stroke="rgb(96,64,42)" strokeWidth="1" />
            <circle cx="1141" cy="385" r="1" fill="rgb(40,28,20)" />
            <motion.path
              d="M1162 392 q12 -4 10 -20 q-2 -10 -12 -10"
              stroke="rgb(124,82,52)"
              strokeWidth="7"
              strokeLinecap="round"
              animate={hot === "squirrel" && !reduce ? { rotate: [0, 14, 0, 14, 0] } : { rotate: 0 }}
              transition={{ duration: 0.8, repeat: hot === "squirrel" ? Infinity : 0 }}
              style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
            />
            {hot === "squirrel" && <text x="1148" y="366" textAnchor="middle" className="font-reading" fontSize="11" fontStyle="italic" fill={CREAM(0.8)}>!</text>}
          </g>

          {/* rope bridge off to the collaborators' tree */}
          <g style={{ filter: hot === "bridge" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <path d="M1158 404 Q 1180 412 1200 408" stroke="rgb(150,120,84)" strokeWidth="3" />
            <path d="M1158 468 Q 1180 478 1200 472" stroke="rgb(150,120,84)" strokeWidth="3" />
            {[1166, 1180, 1194].map((x, i) => <line key={x} x1={x} y1={406 + i} x2={x} y2={470 + i * 1.5} stroke="rgb(150,120,84)" strokeWidth="2" />)}
            {[1162, 1176, 1190].map((x, i) => <rect key={x} x={x} y={468 + i * 2} width="12" height="5" rx="1" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="0.8" />)}
          </g>

          {/* fireflies drift past the platform at night */}
          {isDark && !reduce && Array.from({ length: 6 }).map((_, i) => (
            <motion.circle
              key={i}
              cx={700 + arand(hash(`twf-x-${i}`)) * 440}
              cy={300 + arand(hash(`twf-y-${i}`)) * 140}
              r="1.8"
              fill={`rgb(${GLOW})`}
              style={{ filter: `drop-shadow(0 0 4px rgba(${GLOW},0.8))` }}
              animate={{ opacity: [0, 0.9, 0], y: [0, -14], x: [0, (arand(hash(`twf-w-${i}`)) - 0.5) * 30] }}
              transition={{ duration: 4 + arand(hash(`twf-d-${i}`)) * 3, delay: arand(hash(`twf-t-${i}`)) * 5, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          {/* the hour tints everything, gently */}
          <rect x="0" y="0" width="1200" height="640" fill={`rgba(${phaseRgb},0.04)`} />
        </svg>

        <ZoneLayer zones={zones} setHot={setHot} />
        <ZoneTip zones={zones} hot={hot} />
      </div>

      <p className="mt-2.5 text-center font-reading text-[13px] italic text-text-ghost">
        Hover around the treehouse — everything up here is yours.
      </p>
    </section>
  );
}
