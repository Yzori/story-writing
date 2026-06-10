"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, PenLine, BookOpen, Swords, MessageSquareText, Users, Heart, Flame, Coins, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import {
  CoverArt,
  MomentumCard,
  Sparkline,
  PhaseClock,
  phaseInfo,
  PHASES,
  paletteFor,
  genrePalette,
  hexToRgb,
  READER_ACCENT,
  CLOCK_FALLBACK,
  type PhaseKey,
} from "@/components/dashboard/studio-kit";
import { genSeries, READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Studio" (canonical) — personality through HIERARCHY, not balance.
// One adaptive cinematic hero leads (writer / reader / live-table, whichever is
// hottest). The other selves live as a characterful "also alive" scenes strip —
// present and lively, but clearly the supporting cast. No toggle, no rail.
// Reading / collab / creator data is illustrative (see studio-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const daysSince = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 999 : Math.floor((Date.now() - t) / 86_400_000);
};
type Kind = "table" | "wip" | "reading" | "notes" | "collab" | "follows" | "creator" | "cold";
interface Life { key: string; kind: Kind; heat: number; accent: string; story?: ApiStory; href: string; title: string; sub: string; extra?: Record<string, unknown> }
const HERO_KINDS: Kind[] = ["table", "wip", "reading"];

// the original dashboard's time-of-day room photos, reused as faint back-of-room
// atmosphere only (never competing with cover art).
const PHASE_IMG: Record<PhaseKey, string> = {
  morning: "/dashboard/study-morning.png",
  day: "/dashboard/study-afternoon.png",
  dusk: "/dashboard/study-night.png",
  night: "/dashboard/study-night.png",
};

export default function CanonStudio() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories, activeStory, activeHref, liveCampaigns, notifs } = data;
  const firstName = session?.user?.name?.split(" ")[0];

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phaseRgb = PHASES[phaseKey].rgb;
  const wordSeries = useMemo(() => genSeries(activeStory?.id ?? "seed", 14), [activeStory?.id]);

  const lives = useMemo<Life[]>(() => {
    if (!loaded || error) return [];
    const out: Life[] = [];
    for (const c of liveCampaigns) {
      if (!c.activeSession) continue;
      const yourMove = !!c.myCharacter && c.activeSession.activePlayerId === c.myCharacter.id;
      out.push({ key: `table-${c.id}`, kind: "table", heat: yourMove ? 100 : 78, accent: "184,105,122", href: `/campaign/${c.id}/play/${c.activeSession.id}`, title: c.title, sub: yourMove ? `${c.myCharacter!.name} is waiting on your turn` : (c.role === "gm" || c.role === "both") ? `You're GMing · ${c.playerCount} at the table` : `${c.playerCount} at the table`, extra: { yourMove } });
    }
    if (activeStory && activeStory.writingMode !== "campaign") {
      out.push({ key: `wip-${activeStory.id}`, kind: "wip", heat: daysSince(activeStory.updatedAt) <= 7 ? 74 : 58, accent: hexToRgb(paletteFor(activeStory.id)[2]), href: activeHref, story: activeStory, title: activeStory.title, sub: `${activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1"} · ${(activeStory.totalWords || 0).toLocaleString()} words` });
    }
    const cur = READING_DEMO.current;
    out.push({ key: "reading", kind: "reading", heat: 60, accent: READER_ACCENT, href: "/read", title: cur.title, sub: `by ${cur.author} · Ch. ${cur.chapter}/${cur.of}`, extra: { genre: cur.genre, chapter: cur.chapter, of: cur.of } });
    const comments = notifs.filter((n) => n.type === "comment" && !n.read);
    if (comments.length) out.push({ key: "notes", kind: "notes", heat: 66, accent: "224,164,88", href: comments[0].href || "/notifications", title: `${comments.length} reader note${comments.length === 1 ? "" : "s"}`, sub: comments[0].message });
    out.push({ key: "collab", kind: "collab", heat: 54, accent: "94,139,130", href: "/notifications", title: "2 suggestions to review", sub: `on ${activeStory?.title ?? "your story"}` });
    out.push({ key: "follows", kind: "follows", heat: 48, accent: "154,122,208", href: "/read", title: "Writers you follow", sub: READING_DEMO.follows[0].text });
    const sparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
    out.push({ key: "creator", kind: "creator", heat: 44, accent: "208,136,88", href: "/creator/earnings", title: `${sparks} sparks`, sub: "▲ 240 drops this week" });
    for (const s of allStories.slice(0, 6)) {
      if (s.id === activeStory?.id || s.writingMode === "campaign") continue;
      if (s.status === "draft") out.push({ key: `cold-${s.id}`, kind: "cold", heat: 30, accent: "154,122,208", href: storyHref(s), story: s, title: s.title, sub: `${(s.totalWords || 0).toLocaleString()}w · untouched` });
    }
    return out.sort((a, b) => b.heat - a.heat);
  }, [loaded, error, liveCampaigns, activeStory, activeHref, notifs, allStories]);

  const hero = lives.find((l) => HERO_KINDS.includes(l.kind)) ?? null;
  const supporting = lives.filter((l) => l.key !== hero?.key);
  const focusAccent = hero?.accent ?? "224,164,88";

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* faint time-of-day room behind everything — atmosphere, not a backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={phaseKey}
            className="absolute inset-0 bg-cover bg-center saturate-[0.85]"
            style={{ backgroundImage: `url('${PHASE_IMG[phaseKey]}')` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />
        </AnimatePresence>
        {/* legibility gradient: room shows up top, darkens behind the content below */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/35 via-void/70 to-void/95" />
      </div>
      <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-0" animate={reduce ? { opacity: 1 } : { opacity: [0.85, 1, 0.85] }} transition={reduce ? {} : { duration: 7, repeat: Infinity, ease: "easeInOut" }} style={{ background: `radial-gradient(130% 80% at 14% -5%, rgba(${focusAccent},0.22), transparent 55%), radial-gradient(120% 80% at 92% 8%, rgba(${focusAccent},0.1), transparent 50%)` }} />
      <motion.div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[440px]" animate={{ background: `linear-gradient(to bottom, rgba(${phaseRgb},0.12), rgba(${phaseRgb},0.03) 45%, transparent 72%)` }} transition={{ duration: 1.4 }} />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Studio` : "Your Studio"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <ConceptSwitcher current="canon" />

        {!loaded ? (
          <div className="mt-7 h-80 animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : (
          <>
            {hero && <Hero life={hero} phaseKey={phaseKey} reduce={reduce} />}

            {/* ── SUPPORTING CAST — the other selves, present but subordinate ── */}
            {supporting.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Also alive in your world</h2>
                <ScenesRail>
                  {supporting.map((l) => <SceneCard key={l.key} life={l} reduce={reduce} />)}
                </ScenesRail>
              </section>
            )}

            {/* ── MOMENTUM ── */}
            <section className="mt-7 grid gap-4 sm:grid-cols-3">
              <MomentumCard accent={focusAccent} icon={<TrendingUp className="h-4 w-4" />} label="Words" big={allStories.reduce((a, s) => a + (s.totalWords || 0), 0).toLocaleString()} sub="across your shelf">
                <div className="mt-1"><Sparkline data={wordSeries} color={focusAccent} reduce={reduce} /></div>
              </MomentumCard>
              <MomentumCard accent={READER_ACCENT} icon={<Flame className="h-4 w-4" />} label="Reading streak" big={`${READING_DEMO.streak} days`} sub="don't break the chain">
                <div className="mt-2 flex items-end gap-1">{[4, 6, 5, 7, 6, 8, 9].map((n, i) => <motion.span key={i} className="w-full rounded-sm" style={{ backgroundColor: `rgba(${READER_ACCENT},${0.35 + i * 0.09})` }} initial={reduce ? false : { height: 0 }} animate={{ height: n * 4 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 18 }} />)}</div>
              </MomentumCard>
              <MomentumCard accent={focusAccent} icon={<Heart className="h-4 w-4" />} label="Sparks" big={allStories.reduce((a, s) => a + (s.sparkCount || 0), 0).toLocaleString()} sub="readers who lit up">
                <div className="mt-2 flex flex-wrap gap-1">{["😮", "🔥", "💔", "✨", "😱", "😄"].map((e, i) => <motion.span key={i} className="text-base" initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}>{e}</motion.span>)}</div>
              </MomentumCard>
            </section>

            {/* ── YOUR WORKS ── */}
            {allStories.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Your works</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {allStories.slice(0, 4).map((s) => (
                    <motion.div key={s.id} whileHover={reduce ? undefined : { y: -6, rotateZ: -0.6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      <Link href={storyHref(s)}>
                        <CoverArt seed={s.id} title={s.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" image={s.coverImageUrl} />
                        <div className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost">
                          <span className="uppercase tracking-wider">{s.writingMode === "campaign" ? "Campaign" : s.status === "draft" ? "Draft" : s.format}</span>
                          <span>{(s.totalWords || 0).toLocaleString()}w</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const HERO_FLOATS = [{ e: "😮", l: "gasped" }, { e: "🔥", l: "needs more" }, { e: "✨", l: "inspired" }, { e: "💔", l: "heartbroken" }];

function Hero({ life, phaseKey, reduce }: { life: Life; phaseKey: PhaseKey; reduce: boolean | null }) {
  const a = life.accent;
  const isTable = life.kind === "table";
  const isReading = life.kind === "reading";
  const coverSeed = isReading ? "rd-salt-year" : life.story?.id ?? life.key;
  const pal = isReading ? genrePalette(life.extra?.genre as string) : undefined;
  const pct = isReading ? Math.round(((life.extra?.chapter as number) / (life.extra?.of as number)) * 100) : 0;
  const eyebrow = isTable ? ((life.extra?.yourMove as boolean) ? "Your move · the table is waiting" : "Live · table in session") : life.kind === "wip" ? "Live · your world is awake" : "Continue reading";
  const actionLabel = isTable ? ((life.extra?.yourMove as boolean) ? "Take your turn" : "Enter the table") : life.kind === "wip" ? "Resume writing" : "Keep reading";
  const actionIcon = isTable ? <Swords className="h-[18px] w-[18px]" /> : isReading ? <BookOpen className="h-[18px] w-[18px]" /> : <PenLine className="h-[18px] w-[18px]" />;

  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10">
      <div className="absolute inset-0">
        {isTable ? (
          <div className="h-full w-full" style={{ background: `radial-gradient(120% 120% at 80% 0%, rgba(${a},0.35), rgba(12,8,10,0.95) 55%, #0a0608)` }} />
        ) : (
          <CoverArt seed={coverSeed} title="" className="h-full w-full" palette={pal} image={life.story?.coverImageUrl} />
        )}
        <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: `linear-gradient(90deg, rgba(8,8,12,0.88) 0%, rgba(8,8,12,0.5) 45%, rgba(8,8,12,0.2) 100%)` }} />
      </div>

      {!reduce && !isTable && (
        <div className="pointer-events-none absolute inset-y-0 right-4 w-44 sm:right-10">
          {HERO_FLOATS.map((r, i) => (
            <motion.div key={i} className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm" initial={{ y: 280, opacity: 0 }} animate={{ y: -40, opacity: [0, 1, 1, 0] }} transition={{ duration: 6.5, delay: i * 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 0.8, 1] }}>
              <span className="text-sm">{r.e}</span><span>{r.l}</span>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative flex min-h-[330px] flex-col justify-end p-6 sm:p-8">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white" style={{ backgroundColor: `rgba(${a},0.35)` }}>
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${a})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.8, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {eyebrow}
        </span>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white drop-shadow-lg sm:text-6xl">{life.title}</h1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-white/70">{life.sub}</p>
        <p className="mt-1.5 font-reading text-sm italic text-white/60">{PHASES[phaseKey].label} — {PHASES[phaseKey].mood}.</p>
        {isReading && (
          <div className="mt-4 max-w-md">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/60">{pct}% through</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full" style={{ backgroundColor: `rgb(${a})` }} initial={reduce ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} /></div>
          </div>
        )}
        <div className="mt-5">
          <Link href={life.href} className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${a})` }}>
            {actionIcon}{actionLabel}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── horizontal rail: native trackpad/touch scroll + click-drag for mouse ─────
function ScenesRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // let touch/trackpad scroll natively
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const end = () => { drag.current.down = false; };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
  };

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerLeave={end}
        onClickCapture={onClickCapture}
        onScroll={sync}
        className="-mx-1 flex cursor-grab select-none gap-3 overflow-x-auto px-1 pb-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* edge fades */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-void to-transparent transition-opacity duration-300 ${atStart ? "opacity-0" : "opacity-100"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-void to-transparent transition-opacity duration-300 ${atEnd ? "opacity-0" : "opacity-100"}`} />

      {/* arrow buttons — the clear mouse affordance; fade in on hover, hidden at the edges */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        className={`absolute left-1 top-[40%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-paper backdrop-blur transition-all hover:bg-black/80 sm:flex ${atStart ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        className={`absolute right-1 top-[40%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-paper backdrop-blur transition-all hover:bg-black/80 sm:flex ${atEnd ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ── one supporting "scene" — a small, characterful poster of another self ────
function SceneCard({ life, reduce }: { life: Life; reduce: boolean | null }) {
  const a = life.accent;
  const wrap = "group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/8";
  const posterKinds: Kind[] = ["wip", "reading", "cold", "table"];
  const hasCover = life.kind === "wip" || life.kind === "reading" || life.kind === "cold";

  if (posterKinds.includes(life.kind)) {
    const seed = life.kind === "reading" ? "rd-salt-year" : life.story?.id ?? life.key;
    const pal = life.kind === "reading" ? genrePalette(life.extra?.genre as string) : undefined;
    return (
      <motion.div whileHover={reduce ? undefined : { y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className={`${wrap} h-56`}>
        <Link href={life.href} className="absolute inset-0">
          {hasCover ? (
            <CoverArt seed={seed} title="" className="h-full w-full" palette={pal} image={life.story?.coverImageUrl} />
          ) : (
            <div className="h-full w-full" style={{ background: `radial-gradient(120% 100% at 70% 0%, rgba(${a},0.4), rgba(12,8,10,0.95))` }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,8,12,0.1), rgba(8,8,12,0.9))" }} />
          {life.kind === "table" && (
            <span className="absolute right-2 top-2 flex h-2 w-2"><motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${a})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 2, 1] }} transition={{ duration: 1.6, repeat: Infinity }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${a})` }} /></span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>{labelFor(life.kind)}</span>
            <h3 className="mt-0.5 line-clamp-1 font-display text-base leading-tight text-white drop-shadow">{life.title}</h3>
            <p className="line-clamp-1 font-mono text-[9px] text-white/60">{life.sub}</p>
          </div>
        </Link>
      </motion.div>
    );
  }

  // tinted info cards: notes, collab, follows, creator
  const Icon = life.kind === "notes" ? MessageSquareText : life.kind === "collab" ? Users : life.kind === "follows" ? Heart : Coins;
  return (
    <motion.div whileHover={reduce ? undefined : { y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className={`${wrap} h-56`} style={{ backgroundColor: `rgba(${a},0.07)`, boxShadow: `inset 0 1px 0 rgba(${a},0.14)` }}>
      <Link href={life.href} className="flex h-full flex-col justify-between p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `rgba(${a},0.16)`, color: `rgb(${a})` }}><Icon className="h-4 w-4" /></span>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>{labelFor(life.kind)}</span>
          <h3 className="mt-0.5 font-display text-base leading-tight text-paper">{life.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{life.sub}</p>
        </div>
      </Link>
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
