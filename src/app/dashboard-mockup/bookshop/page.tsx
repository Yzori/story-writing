"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import { PhaseClock, ScenesRail, phaseInfo, PHASES, paletteFor, hash, arand, CLOCK_FALLBACK, type PhaseKey } from "@/components/dashboard/studio-kit";
import { READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import {
  WOOD, CREAM, GLOW, ROSE, SAGE, LAV,
  greeting, type Zone, ZoneLayer, ZoneTip, layoutBooks, BookRow,
  Steam, Rise, InkHeadline, Motes, DeskNote, type Life,
} from "@/components/dashboard-mockup/room-kit";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Bookshop After Hours" — you own a tiny bookshop, closed for the night,
// lamps still on. Inside is your craft, outside the glass is your audience.
// The display window faces the street with your published works on stands
// (sparks drift past like fireflies outside); the back desk holds your WIP
// under a banker's lamp; the shelves keep every work; the till counts your
// drops; letters from readers pile under the mail slot; a HELP WANTED card in
// the window is your open call; the chalkboard tallies your words; the
// calendar keeps your reading streak; the armchair holds your current read.
// The shop cat sleeps on the counter. The sign says CLOSED — for writing.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;

export default function BookshopStudio() {
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
      { key: "collab", kind: "collab", accent: "94,139,130", href: "/notifications", title: "2 suggestions to review", sub: `on ${activeStory?.title ?? "your story"}` },
      { key: "follows", kind: "follows", accent: LAV, href: "/read", title: "Writers you follow", sub: READING_DEMO.follows[0].text },
    ];
  }, [loaded, error, activeStory?.title]);

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
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Bookshop` : "Your Bookshop"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <ConceptSwitcher current="bookshop" />

        {!loaded ? (
          <div className="mt-7 aspect-[1200/640] animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The shop is dark right now — try again in a moment.</p>
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
                {PHASES[phaseKey].label} — {PHASES[phaseKey].mood}. The sign says closed; the shop is yours.
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
                  <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">In the back room</h2>
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
// THE BOOKSHOP — street through the glass on the left, your craft inside
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
  const books = useMemo(
    () => layoutBooks(stories.slice(0, 12), { rows: [228, 332, 436], x0: 1066, xMax: 1170, gap: 5, wBase: 17, wVar: 9, hBase: 52, hVar: 24 }),
    [stories],
  );
  // the window display shows your published works to the street
  const published = useMemo(() => {
    const pub = stories.filter((s) => s.status === "published");
    return (pub.length > 0 ? pub : stories).slice(0, 3);
  }, [stories]);

  const deskZone: Zone = liveTableTitle
    ? { key: "desk", rect: [655, 360, 215, 185], href: liveTableHref!, eyebrow: yourMove ? "Your move" : "Live · the table is lit", title: liveTableTitle, sub: yourMove ? "the back desk is holding its breath for you" : "pull up the stool — the session is on", cta: yourMove ? "Take your turn →" : "Sit down →" }
    : activeStory
      ? { key: "desk", rect: [655, 360, 215, 185], href: activeHref, eyebrow: "Still warm", title: activeStory.title, sub: `${activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1"} · ${(activeStory.totalWords || 0).toLocaleString()} words — the ink hasn't dried`, cta: "Pick up the pen →" }
      : { key: "desk", rect: [655, 360, 215, 185], href: "/create", eyebrow: "A clean page", title: "The back desk is ready", sub: "nothing on it yet but lamplight", cta: "Start your first story →" };

  const zones: Zone[] = [
    { key: "sign", rect: [108, 222, 70, 64], eyebrow: "The sign", title: "Closed — for writing", sub: "tonight the shop belongs to you alone" },
    { key: "mat", rect: [58, 480, 130, 96], href: "/notifications", eyebrow: "Under the mail slot", title: commentCount > 0 ? `${commentCount} reader note${commentCount === 1 ? "" : "s"}` : "No new letters", sub: commentCount > 0 ? (latestComment ?? "slipped through while you were writing") : "the mat is bare tonight", cta: commentCount > 0 ? "Read them →" : undefined },
    { key: "garland", rect: [222, 138, 276, 42], href: "/creator/earnings", eyebrow: "Paper stars in the window", title: `${totalSparks.toLocaleString()} sparks`, sub: "hung up from readers who lit up as they passed", cta: "Count them →" },
    ...published.map((s, i): Zone => ({
      key: `display-${s.id}`,
      rect: [248 + i * 78, 386, 60, 84],
      href: storyHref(s),
      eyebrow: "In the window",
      title: s.title,
      sub: `facing the street · ${(s.totalWords || 0).toLocaleString()} words${s.status === "published" ? "" : " · not yet published"}`,
      cta: "Straighten the stand →",
      cover: { seed: s.id, title: s.title, image: s.coverImageUrl },
    })),
    { key: "stand", rect: [248 + published.length * 78, 396, 56, 74], href: "/create", eyebrow: "An empty stand", title: "Reserved", sub: "for your next book — the window keeps its spot", cta: "Begin it →" },
    { key: "wanted", rect: [430, 408, 62, 62], href: "/browse", eyebrow: "Card in the window", title: "HELP WANTED", sub: "an open call for an illustrator, editor or co-author", cta: "Post or answer →" },
    { key: "chair", rect: [502, 368, 140, 180], href: "/read", eyebrow: "The armchair", title: cur.title, sub: `by ${cur.author} · Ch. ${cur.chapter} of ${cur.of} — exactly where you left it`, cta: "Slip back in →" },
    deskZone,
    { key: "till", rect: [884, 332, 84, 90], href: "/creator/earnings", eyebrow: "The till", title: "240 drops this week", sub: "tips, unlocks and gifts — the drawer is heavier than it looks", cta: "Count the drawer →" },
    { key: "chalkboard", rect: [878, 170, 118, 152], eyebrow: "The chalkboard", title: `${totalWords.toLocaleString()} words`, sub: "on the shelves and counting — chalked up fresh tonight" },
    { key: "calendar", rect: [1004, 196, 52, 88], href: "/read", eyebrow: "The calendar", title: `${READING_DEMO.streak} days running`, sub: "your reading streak, crossed off night by night", cta: "Keep the run →" },
    ...books.map((b): Zone => ({
      key: `book-${b.story.id}`,
      rect: [b.x - 2, b.y - 5, b.w + 4, b.h + 5],
      href: storyHref(b.story),
      eyebrow: b.story.writingMode === "campaign" ? (b.story.id === liveTableStoryId ? "Live table" : "Campaign") : b.story.status === "draft" ? "Back-room draft" : "On the shelf",
      title: b.story.title,
      sub: `${b.story.chapterCount > 0 ? `${b.story.chapterCount} chapter${b.story.chapterCount === 1 ? "" : "s"} · ` : ""}${(b.story.totalWords || 0).toLocaleString()} words`,
      cta: "Take it down →",
      cover: { seed: b.story.id, title: b.story.title, image: b.story.coverImageUrl },
    })),
    { key: "cat", rect: [962, 366, 76, 52], eyebrow: "The shop cat", title: "Mrrp.", sub: "head of security. asleep on the job, as ever" },
    { key: "dog", rect: [640, 548, 130, 58], eyebrow: "The dog", title: "Thump. Thump.", sub: "greets every reader. tonight he guards the rug" },
  ];

  return (
    <section className="relative mt-7">
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ aspectRatio: "1200/640", background: WOOD.deep }}>
        <svg viewBox="0 0 1200 640" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="bs-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(42,29,20)" />
              <stop offset="100%" stopColor="rgb(58,40,27)" />
            </linearGradient>
            <linearGradient id="bs-street" x1="0" y1="0" x2="0" y2="1">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="rgb(20,13,9)" />
                  <stop offset="100%" stopColor="rgb(38,26,18)" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="rgb(118,90,55)" />
                  <stop offset="100%" stopColor="rgb(74,52,33)" />
                </>
              )}
            </linearGradient>
            <radialGradient id="bs-glow">
              <stop offset="0%" stopColor={`rgba(${GLOW},0.4)`} />
              <stop offset="100%" stopColor={`rgba(${GLOW},0)`} />
            </radialGradient>
            <clipPath id="bs-windowclip"><rect x="228" y="148" width="264" height="316" rx="8" /></clipPath>
            {published.map((s) => {
              const pal = paletteFor(s.id);
              return (
                <linearGradient key={s.id} id={`bs-cover-${s.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={pal[0]} />
                  <stop offset="55%" stopColor={pal[1]} />
                  <stop offset="100%" stopColor={pal[2]} />
                </linearGradient>
              );
            })}
          </defs>

          {/* ── walls & floor ── */}
          <rect x="0" y="0" width="1200" height="562" fill="url(#bs-wall)" />
          <rect x="0" y="548" width="1200" height="14" fill={WOOD.dark} />
          <rect x="0" y="562" width="1200" height="78" fill="rgb(62,43,28)" />
          {[120, 290, 460, 630, 800, 970, 1120].map((x, i) => (
            <line key={i} x1={x + (i % 2) * 60} y1={i % 2 ? 562 : 600} x2={x + (i % 2) * 60} y2={i % 2 ? 600 : 640} stroke="rgb(48,33,21)" strokeWidth="2" />
          ))}
          <line x1="0" y1="600" x2="1200" y2="600" stroke="rgb(48,33,21)" strokeWidth="2" />
          {/* ceiling beam + pendant lamps */}
          <rect x="0" y="58" width="1200" height="16" fill={WOOD.dark} />
          {[560, 940].map((x, i) => (
            <g key={x}>
              <line x1={x} y1="74" x2={x} y2={118} stroke={CREAM(0.3)} strokeWidth="1.5" />
              <path d={`M${x - 16} ${140} L${x - 7} ${118} H${x + 7} L${x + 16} ${140} Z`} fill="rgba(30,20,14,0.9)" stroke={CREAM(0.35)} strokeWidth="1.4" />
              <motion.circle cx={x} cy={146} r="5" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 9px rgba(${GLOW},0.9))` }} animate={reduce ? { opacity: 0.7 } : { opacity: [0.5, 0.95, 0.6, 0.9, 0.55] }} transition={reduce ? {} : { duration: 5 + i, repeat: Infinity, ease: "easeInOut" }} />
              <motion.circle cx={x} cy={150} r="44" fill="url(#bs-glow)" animate={reduce ? { opacity: 0.5 * gl } : { opacity: [0.35 * gl, 0.65 * gl, 0.42 * gl] }} transition={reduce ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }} />
            </g>
          ))}

          {/* ── THE DOOR — closed sign, mail slot, letters on the mat ── */}
          <g>
            <rect x="56" y="142" width="124" height="406" rx="6" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="3" />
            <rect x="68" y="156" width="100" height="180" rx="4" fill="rgb(40,28,19)" stroke={WOOD.deep} strokeWidth="2" />
            <rect x="68" y="350" width="100" height="120" rx="4" fill={WOOD.dark} stroke={WOOD.deep} strokeWidth="2" />
            <circle cx="160" cy="356" r="6" fill={`rgb(${GLOW})`} />
            {/* mail slot */}
            <rect x="92" y="486" width="52" height="9" rx="4" fill="rgb(28,18,12)" stroke={CREAM(0.2)} strokeWidth="1" />
            {/* CLOSED sign on a string */}
            <g style={{ filter: hot === "sign" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
              <line x1="118" y1="226" x2="130" y2="240" stroke={CREAM(0.35)} strokeWidth="1.2" />
              <line x1="158" y1="226" x2="146" y2="240" stroke={CREAM(0.35)} strokeWidth="1.2" />
              <g transform="rotate(-4 138 258)">
                <rect x="108" y="240" width="60" height="36" rx="4" fill={CREAM(0.88)} stroke="rgb(150,120,90)" strokeWidth="1.5" />
                <text x="138" y="262" textAnchor="middle" className="font-mono" fontSize="11" fontWeight="bold" letterSpacing="1.5" fill="rgb(70,48,30)">CLOSED</text>
                <text x="138" y="271" textAnchor="middle" className="font-reading" fontSize="6.5" fontStyle="italic" fill="rgb(120,92,64)">gone writing</text>
              </g>
            </g>
            {/* doormat + letters */}
            <g style={{ filter: hot === "mat" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
              <rect x="62" y="548" width="124" height="18" rx="4" fill="rgb(86,58,40)" stroke={WOOD.deep} strokeWidth="1.5" />
              <line x1="74" y1="557" x2="174" y2="557" stroke="rgba(40,26,16,0.6)" strokeWidth="2" strokeDasharray="6 4" />
              {commentCount > 0 && (
                <>
                  {Array.from({ length: Math.min(commentCount, 3) }).map((_, i) => (
                    <g key={i} transform={`rotate(${[-9, 6, -3][i]} ${100 + i * 26} 538)`}>
                      <rect x={86 + i * 26} y={528} width="32" height="22" rx="2" fill={CREAM(0.9)} stroke="rgb(150,120,90)" strokeWidth="1" />
                      <path d={`M${86 + i * 26} 530 l16 9 l16 -9`} stroke="rgb(160,130,100)" strokeWidth="1" />
                      <circle cx={102 + i * 26} cy={543} r="2.6" fill={`rgb(${ROSE})`} />
                    </g>
                  ))}
                  <circle cx="172" cy="518" r="10" fill={`rgb(${GLOW})`} />
                  <text x="172" y="522" textAnchor="middle" className="font-mono" fontSize="11" fontWeight="bold" fill="rgb(40,26,12)">{commentCount}</text>
                </>
              )}
            </g>
          </g>

          {/* ── THE DISPLAY WINDOW — the street, and your books facing it ── */}
          <g>
            <g clipPath="url(#bs-windowclip)">
              <rect x="228" y="148" width="264" height="316" fill="url(#bs-street)" />
              {/* the street: buildings, lamppost, cobbles */}
              <path d="M228 300 h70 v-44 h52 v44 h60 v-30 h54 v146 h-236 Z" fill="rgba(16,10,7,0.8)" />
              {[268, 332, 414].map((x, i) => (
                <motion.rect key={x} x={x} y={272 + (i % 2) * 14} width="10" height="13" fill={`rgba(${GLOW},0.5)`} animate={reduce ? { opacity: 0.5 } : { opacity: [0.3, 0.65, 0.3] }} transition={reduce ? {} : { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }} />
              ))}
              {isDark ? (
                <g>
                  <circle cx="430" cy="190" r="15" fill="rgba(243,226,189,0.5)" />
                  {Array.from({ length: 7 }).map((_, i) => (
                    <motion.circle key={i} cx={244 + arand(hash(`bst-x-${i}`)) * 230} cy={160 + arand(hash(`bst-y-${i}`)) * 80} r={0.9 + arand(hash(`bst-r-${i}`)) * 1} fill="rgba(243,226,189,0.9)" animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.85, 0.15] }} transition={reduce ? {} : { duration: 2 + arand(hash(`bst-d-${i}`)) * 3, delay: arand(hash(`bst-t-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }} />
                  ))}
                </g>
              ) : (
                <g>
                  <circle cx="300" cy="190" r="16" fill={`rgba(${GLOW},0.5)`} />
                  <path d="M380 200 h36 a8 8 0 0 0 -15 -9 a10 10 0 0 0 -19 5 z" fill={CREAM(0.22)} />
                </g>
              )}
              {/* lamppost */}
              <rect x="356" y="240" width="6" height="190" fill="rgb(26,17,11)" />
              <path d="M348 240 h22 l-4 -14 h-14 Z" fill="rgb(26,17,11)" />
              <motion.circle cx="359" cy="234" r="5" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 8px rgba(${GLOW},0.9))` }} animate={reduce ? { opacity: 0.8 * gl } : { opacity: [0.6 * gl, 1 * gl, 0.7 * gl] }} transition={reduce ? {} : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }} />
              <motion.circle cx="359" cy="240" r="34" fill="url(#bs-glow)" animate={reduce ? { opacity: 0.5 * gl } : { opacity: [0.35 * gl, 0.6 * gl, 0.4 * gl] }} transition={reduce ? {} : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />
              <line x1="228" y1="432" x2="492" y2="432" stroke="rgba(20,12,8,0.8)" strokeWidth="3" />
              {/* sparks drifting up past the glass — readers out there, lighting up */}
              {!reduce && Array.from({ length: 5 }).map((_, i) => (
                <motion.circle
                  key={i}
                  cx={244 + arand(hash(`bsp-x-${i}`)) * 230}
                  cy={420}
                  r="1.8"
                  fill={`rgb(${GLOW})`}
                  style={{ filter: `drop-shadow(0 0 4px rgba(${GLOW},0.8))` }}
                  animate={{ y: [0, -180 - arand(hash(`bsp-h-${i}`)) * 60], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 5 + arand(hash(`bsp-d-${i}`)) * 4, delay: arand(hash(`bsp-t-${i}`)) * 6, repeat: Infinity, ease: "easeOut" }}
                />
              ))}
            </g>

            {/* paper-star garland across the window */}
            <g style={{ filter: hot === "garland" ? "brightness(1.3)" : "none", transition: "filter .3s" }}>
              <path d="M232 152 Q 360 184 488 152" stroke={CREAM(0.3)} strokeWidth="1.2" />
              {[262, 312, 360, 408, 458].map((x, i) => {
                const t = (x - 232) / 256;
                const y = (1 - t) ** 2 * 152 + 2 * (1 - t) * t * 184 + t ** 2 * 152;
                return (
                  <motion.path
                    key={x}
                    d={`M${x} ${y + 4} l2.6 5.4 6 .8 -4.3 4.2 1 6 -5.3 -2.9 -5.3 2.9 1 -6 -4.3 -4.2 6 -.8 Z`}
                    fill={`rgba(${GLOW},0.85)`}
                    style={{ filter: `drop-shadow(0 0 4px rgba(${GLOW},0.6))` }}
                    animate={reduce ? { opacity: 0.7 } : { opacity: [0.45, 1, 0.45] }}
                    transition={reduce ? {} : { duration: 2.4 + i * 0.5, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                );
              })}
            </g>

            {/* display ledge + published works on stands */}
            <rect x="228" y="464" width="264" height="12" rx="3" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
            {published.map((s, i) => {
              const x = 252 + i * 78;
              const isHot = hot === `display-${s.id}`;
              return (
                <motion.g key={s.id} animate={{ y: isHot ? -6 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
                  <path d={`M${x + 8} 464 l-8 -10 M${x + 44} 464 l8 -10`} stroke={WOOD.dark} strokeWidth="2.5" />
                  <rect x={x} y={390} width="52" height="74" rx="3" fill={`url(#bs-cover-${s.id})`} stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" style={{ filter: isHot ? "brightness(1.25)" : "none", transition: "filter .25s" }} />
                  <rect x={x} y={390} width="52" height="74" rx="3" fill="rgba(20,12,8,0.15)" />
                  <line x1={x + 6} y1={400} x2={x + 46} y2={400} stroke={CREAM(0.6)} strokeWidth="1.5" />
                  <line x1={x + 10} y1={448} x2={x + 42} y2={448} stroke={CREAM(0.35)} strokeWidth="1" />
                </motion.g>
              );
            })}
            {/* the reserved empty stand */}
            <g style={{ filter: hot === "stand" ? `drop-shadow(0 0 6px rgba(${GLOW},0.6))` : "none", transition: "filter .25s" }}>
              <path d={`M${260 + published.length * 78} 464 l-8 -10 M${296 + published.length * 78} 464 l8 -10`} stroke={WOOD.dark} strokeWidth="2.5" />
              <rect x={252 + published.length * 78} y={398} width="48" height="66" rx="3" stroke={`rgba(${GLOW},0.5)`} strokeWidth="1.5" strokeDasharray="5 4" />
              <path d={`M${276 + published.length * 78} 422 v16 M${268 + published.length * 78} 430 h16`} stroke={`rgba(${GLOW},0.7)`} strokeWidth="2" strokeLinecap="round" />
            </g>
            {/* HELP WANTED card */}
            <g style={{ filter: hot === "wanted" ? "brightness(1.3)" : "none", transition: "filter .3s" }} transform="rotate(3 460 440)">
              <rect x="434" y="412" width="54" height="52" rx="3" fill={CREAM(0.9)} stroke="rgb(150,120,90)" strokeWidth="1.5" />
              <text x="461" y="430" textAnchor="middle" className="font-mono" fontSize="8" fontWeight="bold" letterSpacing="0.5" fill="rgb(70,48,30)">HELP</text>
              <text x="461" y="440" textAnchor="middle" className="font-mono" fontSize="8" fontWeight="bold" letterSpacing="0.5" fill="rgb(70,48,30)">WANTED</text>
              <path d="M442 448 h38 M442 454 h30" stroke="rgb(150,120,95)" strokeWidth="1.2" />
            </g>
            {/* window frame */}
            <rect x="220" y="140" width="280" height="332" rx="10" stroke={WOOD.light} strokeWidth="10" />
            <rect x="220" y="140" width="280" height="332" rx="10" stroke={WOOD.deep} strokeWidth="2" />
          </g>

          {/* ── THE ARMCHAIR — your current read waits in it ── */}
          <g style={{ filter: hot === "chair" ? "brightness(1.18)" : "none", transition: "filter .3s" }}>
            {/* floor lamp behind */}
            <rect x="514" y="330" width="5" height="216" fill={WOOD.dark} />
            <path d="M501 330 l7 -22 h21 l7 22 Z" fill={`rgba(${ROSE},0.55)`} stroke="rgb(120,60,72)" strokeWidth="1.2" />
            <motion.circle cx="516" cy="324" r="36" fill="url(#bs-glow)" animate={reduce ? { opacity: 0.55 * gl } : { opacity: [0.4 * gl, 0.75 * gl, 0.48 * gl] }} transition={reduce ? {} : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }} />
            {/* the chair */}
            <path d="M538 392 q-12 0 -12 14 v98 q0 12 12 12 h84 q12 0 12 -12 v-98 q0 -14 -12 -14 q4 -28 -42 -28 q-46 0 -42 28 Z" fill={`rgba(${ROSE},0.5)`} stroke="rgb(110,58,68)" strokeWidth="2" />
            <rect x="540" y="468" width="80" height="22" rx="9" fill={`rgba(${ROSE},0.65)`} />
            <path d="M538 406 q-18 -2 -18 18 v60 q0 14 14 14 M622 406 q18 -2 18 18 v60 q0 14 -14 14" stroke="rgb(110,58,68)" strokeWidth="2" fill={`rgba(${ROSE},0.45)`} />
            <rect x="544" y="514" width="9" height="42" fill={WOOD.dark} />
            <rect x="608" y="514" width="9" height="42" fill={WOOD.dark} />
            {/* the open book on the seat */}
            <g transform="rotate(-6 580 462)">
              <path d="M556 462 q12 -9 24 0 q12 -9 24 0 l-3 8 q-10 -7 -21 0 q-10 -7 -21 0 Z" fill={CREAM(0.92)} stroke="rgb(120,90,60)" strokeWidth="1" />
              <line x1="580" y1="454" x2="580" y2="462" stroke="rgb(150,110,80)" strokeWidth="1.1" />
              <path d="M577 470 l3 7 l3 -7" fill={`rgb(${ROSE})`} />
            </g>
            {/* blanket over the arm */}
            <path d="M620 430 q16 -4 22 4 l-4 34 q-10 -4 -20 -2 Z" fill={`rgba(${SAGE},0.55)`} />
          </g>

          {/* the dog on the rug, between armchair and desk */}
          <ellipse cx="700" cy="596" rx="120" ry="18" fill="rgb(94,60,48)" />
          <ellipse cx="700" cy="596" rx="86" ry="12" stroke={`rgba(${SAGE},0.35)`} strokeWidth="2.5" strokeDasharray="6 4" />
          <g>
            <motion.g animate={reduce ? {} : { scaleY: [1, 1.03, 1] }} transition={reduce ? {} : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
              <ellipse cx="700" cy="580" rx="44" ry="16" fill="rgb(146,108,74)" stroke="rgb(104,76,52)" strokeWidth="1.4" />
              <circle cx="738" cy="574" r="12" fill="rgb(146,108,74)" stroke="rgb(104,76,52)" strokeWidth="1.4" />
              <ellipse cx="747" cy="579" rx="6.5" ry="4.5" fill="rgb(160,122,86)" />
              <circle cx="751" cy="578" r="1.8" fill="rgb(50,34,22)" />
              <path d="M733 563 q-7 2 -6 11 q4 4 8 1" fill="rgb(116,84,58)" />
            </motion.g>
            <motion.path
              d="M658 586 q-16 -7 -13 -24"
              stroke="rgb(124,90,62)"
              strokeWidth="6.5"
              strokeLinecap="round"
              animate={hot === "dog" && !reduce ? { rotate: [0, -24, 0, -24, 0] } : { rotate: 0 }}
              transition={{ duration: 0.9, repeat: hot === "dog" ? Infinity : 0 }}
              style={{ transformBox: "fill-box", transformOrigin: "100% 100%" }}
            />
          </g>

          {/* ── THE BACK DESK — the protagonist, under its own lamp ── */}
          <g style={{ filter: hot === "desk" ? "brightness(1.18)" : "none", transition: "filter .3s" }}>
            <motion.ellipse cx="762" cy="420" rx="130" ry="52" fill="url(#bs-glow)" animate={reduce ? { opacity: 0.5 * gl } : { opacity: [0.35 * gl, 0.7 * gl, 0.45 * gl] }} transition={reduce ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }} />
            <rect x="664" y="424" width="200" height="13" rx="4" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="676" y="437" width="176" height="38" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <circle cx="764" cy="456" r="3.5" fill={`rgb(${GLOW})`} />
            <rect x="676" y="475" width="11" height="82" fill={WOOD.dark} />
            <rect x="841" y="475" width="11" height="82" fill={WOOD.dark} />
            {/* banker's lamp */}
            <rect x="816" y="396" width="5" height="28" fill="rgb(30,20,14)" />
            <path d="M802 396 q16 -12 32 0 l-5 8 q-11 -8 -22 0 Z" fill={`rgba(${SAGE},0.8)`} stroke="rgb(60,84,58)" strokeWidth="1.2" />
            <motion.circle cx="818" cy="402" r="26" fill="url(#bs-glow)" animate={reduce ? { opacity: 0.6 * gl } : { opacity: [0.45 * gl, 0.8 * gl, 0.5 * gl] }} transition={reduce ? {} : { duration: 4.4, repeat: Infinity, ease: "easeInOut" }} />
            {/* manuscript */}
            <g transform="rotate(-2 730 410)">
              <rect x="700" y="408" width="72" height="13" rx="2" fill={CREAM(0.6)} />
              <rect x="703" y="400" width="70" height="11" rx="2" fill={CREAM(0.92)} />
              <path d="M710 405 h42 M710 408 h54" stroke="rgb(130,100,72)" strokeWidth="1" />
            </g>
            {/* inkwell + quill */}
            <rect x="784" y="410" width="14" height="13" rx="2.5" fill="rgb(28,19,14)" stroke={WOOD.deep} strokeWidth="1" />
            <path d="M790 412 C 797 396 806 384 818 377 C 809 391 801 402 795 413 Z" fill={CREAM(0.85)} stroke="rgb(150,120,90)" strokeWidth="1" />
            {/* tea */}
            <rect x="682" y="408" width="16" height="15" rx="3.5" fill={`rgba(${SAGE},0.65)`} stroke={WOOD.deep} strokeWidth="1.2" />
            <Steam x={688} y={404} reduce={reduce} />
            {/* live table: dice + GM screen */}
            {liveTableTitle && (
              <motion.path d="M740 396 l8 -12 l8 12 l-8 12 Z M740 396 l16 0" fill={`rgba(${ROSE},0.9)`} stroke="rgb(120,60,72)" strokeWidth="1.1" animate={reduce ? {} : { opacity: [0.75, 1, 0.75] }} transition={reduce ? {} : { duration: 1.8, repeat: Infinity }} style={{ filter: `drop-shadow(0 0 8px rgba(${ROSE},0.8))` }} />
            )}
            {/* stool */}
            <rect x="730" y="494" width="56" height="9" rx="3.5" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1.5" />
            <rect x="737" y="503" width="8" height="54" fill={WOOD.dark} />
            <rect x="771" y="503" width="8" height="54" fill={WOOD.dark} />
          </g>

          {/* ── THE COUNTER — till, drops, the shop cat ── */}
          <g>
            <rect x="880" y="420" width="172" height="14" rx="4" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="2" />
            <rect x="888" y="434" width="156" height="114" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2" />
            <path d="M896 452 h140 M896 490 h140" stroke="rgba(30,20,14,0.5)" strokeWidth="1.5" />
            {/* the till */}
            <g style={{ filter: hot === "till" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
              <rect x="892" y="372" width="64" height="48" rx="5" fill="rgb(118,82,46)" stroke={WOOD.deep} strokeWidth="2" />
              <rect x="898" y="378" width="28" height="16" rx="2" fill={CREAM(0.25)} />
              {[904, 914, 924, 934, 944].map((x) => <circle key={x} cx={x} cy={404} r="2.6" fill={CREAM(0.5)} />)}
              <rect x="892" y="412" width="64" height="8" rx="2" fill="rgb(96,66,38)" stroke={WOOD.deep} strokeWidth="1" />
              <motion.circle cx="948" cy="380" r="6" fill={`rgb(${GLOW})`} style={{ filter: `drop-shadow(0 0 6px rgba(${GLOW},0.8))` }} animate={reduce ? { opacity: 0.8 } : { opacity: [0.5, 1, 0.6] }} transition={reduce ? {} : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
            </g>
            {/* the shop cat on the counter */}
            <g>
              <motion.g animate={{ opacity: hot === "cat" ? 0 : 1 }} transition={{ duration: 0.2 }}>
                <ellipse cx="1000" cy="408" rx="24" ry="11" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <path d="M988 401 q4 6 0 13 M998 399 q4 7 0 15" stroke="rgb(88,66,50)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="982" cy="404" r="8" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <path d="M976 398 l1 -5 l4 3 M984 396 l4 -4 l1 5" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.1" strokeLinejoin="round" />
                <path d="M978 405 q2 1.5 4 0 M984 405 q2 1.5 4 0" stroke="rgb(60,44,33)" strokeWidth="1" strokeLinecap="round" />
                <path d="M1022 412 q11 -2 10 -12 q-1 -6 -8 -6" stroke="rgb(88,66,50)" strokeWidth="4.5" strokeLinecap="round" />
              </motion.g>
              <motion.g animate={{ opacity: hot === "cat" ? 1 : 0 }} transition={{ duration: 0.2 }}>
                <ellipse cx="1002" cy="410" rx="22" ry="10" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <circle cx="984" cy="392" r="8.5" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.2" />
                <path d="M978 386 l0 -7 l6 4 M988 383 l5 -5 l3 7" fill="rgb(112,86,66)" stroke="rgb(80,60,45)" strokeWidth="1.1" strokeLinejoin="round" />
                <circle cx="981" cy="391" r="1.2" fill="rgb(40,28,20)" />
                <circle cx="987" cy="391" r="1.2" fill="rgb(40,28,20)" />
                <path d="M1024 414 q12 -6 8 -20" stroke="rgb(88,66,50)" strokeWidth="4.5" strokeLinecap="round" />
                <text x="1002" y="374" textAnchor="middle" className="font-reading" fontSize="10" fontStyle="italic" fill={CREAM(0.75)}>mrrp.</text>
              </motion.g>
            </g>
          </g>

          {/* ── chalkboard + streak calendar behind the counter ── */}
          <g style={{ filter: hot === "chalkboard" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <rect x="882" y="176" width="110" height="142" rx="5" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2.5" />
            <rect x="890" y="184" width="94" height="126" rx="3" fill="rgb(30,34,28)" />
            <text x="937" y="232" textAnchor="middle" className="font-display" fontSize="19" fill={CREAM(0.92)}>{totalWords > 0 ? totalWords.toLocaleString() : "· · ·"}</text>
            <text x="937" y="252" textAnchor="middle" className="font-mono" fontSize="7" letterSpacing="2" fill={CREAM(0.55)}>WORDS IN STOCK</text>
            <path d="M906 270 q30 8 62 0" stroke={CREAM(0.35)} strokeWidth="1.2" />
            <path d="M914 286 h46" stroke={CREAM(0.2)} strokeWidth="1" strokeDasharray="2 3" />
          </g>
          <g style={{ filter: hot === "calendar" ? "brightness(1.25)" : "none", transition: "filter .3s" }}>
            <rect x="1008" y="202" width="44" height="76" rx="3" fill={CREAM(0.88)} stroke="rgb(150,120,90)" strokeWidth="1.5" />
            <rect x="1008" y="202" width="44" height="16" rx="3" fill={`rgba(${ROSE},0.8)`} />
            <circle cx="1019" cy="202" r="2" fill={WOOD.deep} />
            <circle cx="1041" cy="202" r="2" fill={WOOD.deep} />
            {Array.from({ length: 12 }).map((_, i) => {
              const cx = 1016 + (i % 4) * 10;
              const cy = 228 + Math.floor(i / 4) * 14;
              const marked = i < READING_DEMO.streak;
              return marked
                ? <path key={i} d={`M${cx - 3} ${cy - 3} l6 6 M${cx + 3} ${cy - 3} l-6 6`} stroke={`rgb(${ROSE})`} strokeWidth="1.6" strokeLinecap="round" />
                : <circle key={i} cx={cx} cy={cy} r="1.4" fill="rgb(170,140,110)" />;
            })}
          </g>

          {/* ── THE SHELVES — every work, spine by spine, ladder leaning ── */}
          <g>
            <rect x="1052" y="120" width="132" height="440" rx="6" fill={WOOD.mid} stroke={WOOD.deep} strokeWidth="2.5" />
            <rect x="1060" y="128" width="116" height="424" fill="rgb(46,32,22)" />
            {[228, 332, 436].map((y) => <rect key={y} x="1060" y={y} width="116" height="9" fill={WOOD.light} stroke={WOOD.deep} strokeWidth="1" />)}
            <rect x="1060" y="540" width="116" height="9" fill={WOOD.light} />
            <BookRow books={books} hot={hot} liveId={liveTableStoryId} reduce={reduce} />
            {/* bottom cubby: wrapped parcels waiting to ship */}
            <rect x="1068" y="510" width="34" height="28" rx="2" fill="rgb(124,94,62)" stroke={WOOD.deep} strokeWidth="1" />
            <path d="M1085 510 v28 M1068 524 h34" stroke={CREAM(0.4)} strokeWidth="1.4" />
            <rect x="1110" y="518" width="28" height="20" rx="2" fill="rgb(110,80,52)" stroke={WOOD.deep} strokeWidth="1" />
            <path d="M1124 518 v20" stroke={CREAM(0.35)} strokeWidth="1.2" />
            {/* rolling ladder */}
            <line x1="1022" y1="556" x2="1066" y2="180" stroke={WOOD.light} strokeWidth="5" strokeLinecap="round" />
            <line x1="1042" y1="556" x2="1086" y2="180" stroke={WOOD.light} strokeWidth="5" strokeLinecap="round" />
            {[0.18, 0.34, 0.5, 0.66, 0.82].map((t) => (
              <line key={t} x1={1022 + 44 * t} y1={556 - 376 * t} x2={1042 + 44 * t} y2={556 - 376 * t} stroke={WOOD.light} strokeWidth="4" strokeLinecap="round" />
            ))}
          </g>

          {/* the hour tints the shop, gently */}
          <rect x="0" y="0" width="1200" height="640" fill={`rgba(${phaseRgb},0.05)`} />
          {isDark && <rect x="0" y="0" width="1200" height="640" fill="rgba(16,8,4,0.14)" />}
        </svg>

        <ZoneLayer zones={zones} setHot={setHot} />
        <ZoneTip zones={zones} hot={hot} />
      </div>

      <p className="mt-2.5 text-center font-reading text-[13px] italic text-text-ghost">
        Hover around the shop — after hours, it all belongs to you.
      </p>
    </section>
  );
}
