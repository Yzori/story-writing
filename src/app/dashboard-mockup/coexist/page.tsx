"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  PenLine,
  BookOpen,
  Swords,
  Flame,
  Heart,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useDashboardData, storyHref, type MockNotification } from "@/components/dashboard-mockup/useDashboardData";
import {
  CoverArt,
  MomentumCard,
  Sparkline,
  PhaseClock,
  PHASES,
  phaseInfo,
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
// Studio · COEXIST — no toggle. The hero leads with your centre of gravity, and
// the OTHER half is always present as a counterpart strip. One self-ranking
// stream mixes making + reading. Reading data is illustrative (see studio-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const daysSince = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 999 : Math.floor((Date.now() - t) / 86_400_000);
};

const NOTIF_LABELS: Record<string, string> = {
  comment: "a reader note",
  spark: "a spark",
  follow: "a new reader",
  chapter: "a new chapter",
  update: "an update",
};

export default function CoexistMock() {
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

  // ── ADAPTIVE HERO RULE ──────────────────────────────────────────────────────
  //  1. live obligation (your move / live table) → writing hero
  //  2. active draft edited recently → writing hero
  //  3. else mid-read → reading hero
  //  4. else (no works) → reading hero (invite, never an empty studio)
  const liveSession = liveCampaigns.find((c) => c.activeSession) ?? null;
  const draftFresh = activeStory ? daysSince(activeStory.updatedAt) <= 7 : false;
  // the adaptive default (lens = "all"); a lens can override the hero focus
  const adaptiveHero: "writing" | "reading" =
    loaded && (liveSession || (activeStory && draftFresh)) ? "writing" : loaded && allStories.length === 0 ? "reading" : activeStory ? "writing" : "reading";

  type Lens = "all" | "writing" | "reading" | "tables";
  const [lens, setLens] = useState<Lens>("all");
  const heroMode: "writing" | "reading" = lens === "all" ? adaptiveHero : lens === "reading" ? "reading" : "writing";

  const writerAccent = activeStory ? hexToRgb(paletteFor(activeStory.id)[2]) : "224,164,88";
  const focusAccent = heroMode === "writing" ? writerAccent : READER_ACCENT;

  const unreadNotes = notifs.filter((n) => n.type === "comment" && !n.read).length;
  const freshChapters = READING_DEMO.shelf.reduce((a, s) => a + s.fresh, 0);
  const lenses: { key: Lens; label: string; Icon: typeof Sparkles; badge?: string; dot?: boolean }[] = [
    { key: "all", label: "All", Icon: Sparkles },
    { key: "writing", label: "Write", Icon: PenLine, badge: unreadNotes > 0 ? String(unreadNotes) : undefined },
    { key: "reading", label: "Read", Icon: BookOpen, badge: freshChapters > 0 ? String(freshChapters) : undefined },
    { key: "tables", label: "Tables", Icon: Swords, dot: !!liveSession },
  ];
  const wordSeries = useMemo(() => genSeries(activeStory?.id ?? "seed", 14), [activeStory?.id]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        animate={reduce ? { opacity: 1 } : { opacity: [0.85, 1, 0.85] }}
        transition={reduce ? {} : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(130% 80% at 15% -5%, rgba(${focusAccent},0.22), transparent 55%), radial-gradient(120% 80% at 95% 10%, rgba(${focusAccent},0.10), transparent 50%)` }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[440px]"
        animate={{ background: `linear-gradient(to bottom, rgba(${phaseRgb},0.12), rgba(${phaseRgb},0.03) 45%, transparent 72%)` }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />

      {/* ── LENS RAIL — adaptive by default, focus optional, live badges ── */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-16 flex-col items-center gap-1 border-r border-white/5 bg-black/40 pt-20 backdrop-blur-md sm:w-[72px]">
        {lenses.map((l) => {
          const active = lens === l.key;
          return (
            <button key={l.key} onClick={() => setLens(l.key)} aria-pressed={active} className={`relative flex w-full flex-col items-center gap-1 py-2.5 ${active ? "" : "text-text-ghost hover:text-text-secondary"}`} style={active ? { color: `rgb(${focusAccent})` } : undefined}>
              {active && (
                <motion.span layoutId="rail-active" className="absolute inset-x-2 inset-y-1 -z-10 rounded-xl" style={{ backgroundColor: `rgba(${focusAccent},0.16)` }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative flex h-9 w-9 items-center justify-center">
                <l.Icon className="h-5 w-5" />
                {l.badge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">{l.badge}</span>
                )}
                {l.dot && (
                  <motion.span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose ring-2 ring-black/40" animate={reduce ? {} : { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                )}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide">{l.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="mx-auto max-w-5xl pb-24 pl-20 pr-5 pt-20 sm:pl-28 sm:pr-8">
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

        {!loaded ? (
          <div className="mt-7 h-80 animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : (
          <>
            {/* ── ADAPTIVE HERO ── */}
            {heroMode === "writing" && activeStory ? (
              <WritingHero story={activeStory} href={activeHref} accent={writerAccent} phaseKey={phaseKey} reduce={reduce} live={!!liveSession} />
            ) : (
              <ReadingHero phaseKey={phaseKey} reduce={reduce} />
            )}

            {/* ── COUNTERPART STRIP — the other half (shown in the adaptive "All" view) ── */}
            {lens === "all" && (
            <div className="mt-3">
              {heroMode === "writing" ? (
                <CounterStrip
                  eyebrow="Also — continue reading"
                  coverSeed={READING_DEMO.current.id}
                  palette={genrePalette(READING_DEMO.current.genre)}
                  title={READING_DEMO.current.title}
                  sub={`by ${READING_DEMO.current.author} · Ch. ${READING_DEMO.current.chapter} of ${READING_DEMO.current.of}`}
                  actionLabel="Keep reading"
                  href="/read"
                  accent={READER_ACCENT}
                  icon={<BookOpen className="h-4 w-4" />}
                />
              ) : activeStory ? (
                <CounterStrip
                  eyebrow="Also — back to your desk"
                  coverSeed={activeStory.id}
                  palette={undefined}
                  title={activeStory.title}
                  sub={`${activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1"} · ${(activeStory.totalWords || 0).toLocaleString()} words`}
                  actionLabel="Resume writing"
                  href={activeHref}
                  accent={writerAccent}
                  icon={<PenLine className="h-4 w-4" />}
                />
              ) : null}
            </div>
            )}

            {/* ── BLENDED MOMENTUM — both lives ── */}
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <MomentumCard accent={writerAccent} icon={<TrendingUp className="h-4 w-4" />} label="Words" big={allStories.reduce((a, s) => a + (s.totalWords || 0), 0).toLocaleString()} sub="written across your shelf">
                <div className="mt-1"><Sparkline data={wordSeries} color={writerAccent} reduce={reduce} /></div>
              </MomentumCard>
              <MomentumCard accent={READER_ACCENT} icon={<Flame className="h-4 w-4" />} label="Reading streak" big={`${READING_DEMO.streak} days`} sub="don't break the chain">
                <div className="mt-2 flex items-end gap-1">
                  {[4, 6, 5, 7, 6, 8, 9].map((n, i) => (
                    <motion.span key={i} className="w-full rounded-sm" style={{ backgroundColor: `rgba(${READER_ACCENT},${0.35 + i * 0.09})` }} initial={reduce ? false : { height: 0 }} animate={{ height: n * 4 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 18 }} />
                  ))}
                </div>
              </MomentumCard>
              <MomentumCard accent={writerAccent} icon={<Heart className="h-4 w-4" />} label="Sparks" big={allStories.reduce((a, s) => a + (s.sparkCount || 0), 0).toLocaleString()} sub="readers who lit up">
                <div className="mt-2 flex flex-wrap gap-1">{["😮", "🔥", "💔", "✨", "😱", "😄"].map((e, i) => (
                  <motion.span key={i} className="text-base" initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}>{e}</motion.span>
                ))}</div>
              </MomentumCard>
            </section>

            {/* ── ONE SELF-RANKING STREAM (making + reading) ── */}
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                <Flame className="h-3.5 w-3.5 text-amber/70" /> What&apos;s alive
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="text-[10px] text-text-ghost">making + reading</span>
              </h2>
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {buildStream(data, liveSession, activeStory)
                    .filter((it) => lens === "all" || it.cat === lens)
                    .map((it, i) => (
                      <StreamRow key={it.key} item={it} index={i} reduce={reduce} />
                    ))}
                </AnimatePresence>
              </ul>
            </section>

            {/* ── GALLERY: your works (real) ── */}
            {allStories.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Your works</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {allStories.slice(0, 4).map((s) => (
                    <motion.div key={s.id} whileHover={reduce ? undefined : { y: -6, rotateZ: -0.6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      <Link href={storyHref(s)}>
                        <CoverArt seed={s.id} title={s.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" />
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

function WritingHero({ story, href, accent, phaseKey, reduce, live }: { story: ApiStory; href: string; accent: string; phaseKey: PhaseKey; reduce: boolean | null; live: boolean }) {
  const isCampaign = story.writingMode === "campaign";
  return (
    <Hero
      seed={story.id}
      palette={undefined}
      accent={accent}
      eyebrow={live ? "Live · the table is waiting" : "Live · your world is awake"}
      title={story.title}
      meta={`${isCampaign ? "Campaign" : story.format} · ${story.chapterCount > 0 ? `Chapter ${story.chapterCount}` : "Chapter 1"} · ${(story.totalWords || 0).toLocaleString()} words`}
      phaseKey={phaseKey}
      reduce={reduce}
      actionLabel={isCampaign ? "Enter the table" : "Resume writing"}
      actionIcon={isCampaign ? <Swords className="h-[18px] w-[18px]" /> : <PenLine className="h-[18px] w-[18px]" />}
      href={href}
      floats={[{ e: "😮", l: "gasped" }, { e: "🔥", l: "needs more" }, { e: "✨", l: "inspired" }, { e: "💔", l: "heartbroken" }]}
    />
  );
}

function ReadingHero({ phaseKey, reduce }: { phaseKey: PhaseKey; reduce: boolean | null }) {
  const cur = READING_DEMO.current;
  const palette = genrePalette(cur.genre) ?? paletteFor(cur.id);
  const accent = hexToRgb(palette[2]);
  const pct = Math.round((cur.chapter / cur.of) * 100);
  return (
    <Hero
      seed={cur.id}
      palette={palette}
      accent={accent}
      eyebrow="Continue reading"
      title={cur.title}
      meta={`by ${cur.author} · ${cur.genre} · Chapter ${cur.chapter} of ${cur.of}`}
      phaseKey={phaseKey}
      reduce={reduce}
      actionLabel="Keep reading"
      actionIcon={<BookOpen className="h-[18px] w-[18px]" />}
      href="/read"
      progress={pct}
      floats={[{ e: "🔥", l: "couldn't put it down" }, { e: "📖", l: `Chapter ${cur.chapter}` }, { e: "✨", l: "a new favourite" }]}
    />
  );
}

function Hero({ seed, palette, accent, eyebrow, title, meta, phaseKey, reduce, actionLabel, actionIcon, href, progress, floats }: {
  seed: string; palette?: [string, string, string]; accent: string; eyebrow: string; title: string; meta: string; phaseKey: PhaseKey; reduce: boolean | null; actionLabel: string; actionIcon: React.ReactNode; href: string; progress?: number; floats: { e: string; l: string }[];
}) {
  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10">
      <div className="absolute inset-0">
        <CoverArt seed={seed} title="" className="h-full w-full" palette={palette} />
        <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: `linear-gradient(90deg, rgba(8,8,12,0.88) 0%, rgba(8,8,12,0.55) 45%, rgba(8,8,12,0.25) 100%)` }} />
      </div>
      {!reduce && (
        <div className="pointer-events-none absolute inset-y-0 right-4 w-44 sm:right-10">
          {floats.map((r, i) => (
            <motion.div key={i} className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm" initial={{ y: 280, opacity: 0 }} animate={{ y: -40, opacity: [0, 1, 1, 0] }} transition={{ duration: 6.5, delay: i * 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 0.8, 1] }}>
              <span className="text-sm">{r.e}</span>
              <span>{r.l}</span>
            </motion.div>
          ))}
        </div>
      )}
      <div className="relative flex min-h-[330px] flex-col justify-end p-6 sm:p-8">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white" style={{ backgroundColor: `rgba(${accent},0.35)` }}>
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${accent})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.8, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {eyebrow}
        </span>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white drop-shadow-lg sm:text-6xl">{title}</h1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-white/70">{meta}</p>
        <p className="mt-1.5 font-reading text-sm italic text-white/60">{PHASES[phaseKey].label} — {PHASES[phaseKey].mood}.</p>
        {typeof progress === "number" && (
          <div className="mt-4 max-w-md">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/60"><span>{progress}% through</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: `rgb(${accent})` }} initial={reduce ? false : { width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
            </div>
          </div>
        )}
        <div className="mt-5">
          <Link href={href} className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${accent})` }}>
            {actionIcon}
            {actionLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CounterStrip({ eyebrow, coverSeed, palette, title, sub, actionLabel, href, accent, icon }: { eyebrow: string; coverSeed: string; palette?: [string, string, string]; title: string; sub: string; actionLabel: string; href: string; accent: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-surface/50 p-3 transition-colors hover:bg-surface/80">
      <CoverArt seed={coverSeed} title="" className="h-14 w-11 shrink-0 rounded-lg" palette={palette} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `rgb(${accent})` }}>{icon}{eyebrow}</span>
        <span className="mt-0.5 block truncate font-display text-base text-paper">{title}</span>
        <span className="block truncate font-mono text-[10px] text-text-ghost">{sub}</span>
      </span>
      <span className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors group-hover:text-black" style={{ borderColor: `rgba(${accent},0.35)`, color: `rgb(${accent})` }}>{actionLabel}</span>
    </Link>
  );
}

// ── unified stream: making + reading, ranked by heat ─────────────────────────
interface StreamItem { key: string; heat: number; accent: string; emoji: string; eyebrow: string; title: string; detail: string; actionLabel: string; href: string; cat: "writing" | "reading" | "tables" }

function buildStream(d: ReturnType<typeof useDashboardData>, liveSession: ReturnType<typeof useDashboardData>["liveCampaigns"][number] | null, activeStory: ApiStory | null): StreamItem[] {
  const out: StreamItem[] = [];
  const { notifs, allStories } = d;

  if (liveSession?.activeSession) {
    out.push({ key: `live-${liveSession.id}`, heat: 95, cat: "tables", accent: "184,105,122", emoji: "⚔️", eyebrow: "Table in session", title: liveSession.title, detail: `${liveSession.playerCount} at the table`, actionLabel: "Enter", href: `/campaign/${liveSession.id}/play/${liveSession.activeSession.id}` });
  }
  const comments = notifs.filter((n: MockNotification) => n.type === "comment" && !n.read);
  if (comments.length) out.push({ key: "notes", heat: 70, cat: "writing", accent: "224,164,88", emoji: "💬", eyebrow: "Readers waiting", title: `${comments.length} reader note${comments.length === 1 ? "" : "s"}`, detail: comments[0].message.slice(0, 70), actionLabel: "Answer", href: comments[0].href || "/notifications" });

  // reading: a follow dropped a new chapter (illustrative)
  out.push({ key: "follow-drop", heat: 58, cat: "reading", accent: READER_ACCENT, emoji: "📖", eyebrow: "From writers you follow", title: "Iris Vale posted Chapter 8", detail: "of The Salt Year — you're on Chapter 7", actionLabel: "Read", href: "/read" });

  if (activeStory) out.push({ key: `resume-${activeStory.id}`, heat: 52, cat: "writing", accent: "208,136,88", emoji: "✍️", eyebrow: "Your desk", title: activeStory.title, detail: `${(activeStory.totalWords || 0).toLocaleString()} words`, actionLabel: "Resume", href: storyHref(activeStory) });

  out.push({ key: "shelf", heat: 40, cat: "reading", accent: READER_ACCENT, emoji: "🔖", eyebrow: "On your shelf", title: `${READING_DEMO.shelf.reduce((a, s) => a + s.fresh, 0)} new chapters waiting`, detail: "across stories you follow", actionLabel: "Browse", href: "/read" });

  for (const s of allStories.slice(0, 6)) {
    if (s.id === activeStory?.id) continue;
    if (s.status === "draft") out.push({ key: `cold-${s.id}`, heat: 30, cat: "writing", accent: "154,122,208", emoji: "❄️", eyebrow: "Cold draft", title: s.title, detail: `${(s.totalWords || 0).toLocaleString()} words, untouched`, actionLabel: "Warm up", href: storyHref(s) });
  }
  return out.sort((a, b) => b.heat - a.heat);
}

function StreamRow({ item, index, reduce }: { item: StreamItem; index: number; reduce: boolean | null }) {
  return (
    <motion.li layout initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ layout: { type: "spring", stiffness: 520, damping: 40 }, delay: reduce ? 0 : 0.04 * index, duration: 0.4 }}>
      <Link href={item.href} className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface/50 py-3.5 pl-5 pr-4 transition-all hover:border-transparent hover:bg-surface">
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `rgba(${item.accent},${0.35 + Math.min(item.heat, 100) / 200})` }} />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base" style={{ backgroundColor: `rgba(${item.accent},0.12)` }}>{item.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `rgb(${item.accent})` }}>{item.eyebrow}</span>
          <span className="mt-0.5 block truncate font-display text-[16px] text-paper">{item.title}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-text-secondary">{item.detail}</span>
        </span>
        <span className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium" style={{ borderColor: `rgba(${item.accent},0.3)`, color: `rgb(${item.accent})` }}>{item.actionLabel}</span>
      </Link>
    </motion.li>
  );
}
