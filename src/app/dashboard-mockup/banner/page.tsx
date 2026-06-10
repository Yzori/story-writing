"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, PenLine, BookOpen, Swords, MessageSquareText, Users, Heart, Flame, TrendingUp, Coins } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { CoverArt, MomentumCard, Sparkline, PhaseClock, phaseInfo, PHASES, READER_ACCENT, CLOCK_FALLBACK, ScenesRail, type PhaseKey } from "@/components/dashboard/studio-kit";
import { genSeries, READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";

// ─────────────────────────────────────────────────────────────────────────────
// "The Studio · Banner" — general atmospheric banner up top, works as a row.
// The banner is the time-of-day ROOM (a general image), made alive by a greeting,
// the clock, and the single most-important ACTION surfaced inside it — so it
// earns its space instead of being a decorative header. Works sit below as
// equal covers. Reading/collab/follows data illustrative (see studio-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const PHASE_IMG: Record<PhaseKey, string> = {
  morning: "/dashboard/study-morning.png",
  day: "/dashboard/study-afternoon.png",
  dusk: "/dashboard/study-night.png",
  night: "/dashboard/study-night.png",
};
const daysSince = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 999 : Math.floor((Date.now() - t) / 86_400_000);
};
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const FLOATS = [{ e: "😮", l: "gasped" }, { e: "🔥", l: "needs more" }, { e: "✨", l: "inspired" }];

export default function BannerStudio() {
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

  // the single most-important action, surfaced in the banner
  const topAction = useMemo(() => {
    const live = liveCampaigns.find((c) => c.activeSession);
    if (live) {
      const yourMove = !!live.myCharacter && live.activeSession!.activePlayerId === live.myCharacter.id;
      return { label: yourMove ? `Take your turn in ${live.title}` : `Enter ${live.title}`, href: `/campaign/${live.id}/play/${live.activeSession!.id}`, Icon: Swords };
    }
    const unread = notifs.filter((n) => n.type === "comment" && !n.read).length;
    if (unread) return { label: `Answer ${unread} reader note${unread === 1 ? "" : "s"}`, href: "/notifications", Icon: MessageSquareText };
    if (activeStory) return { label: `Resume ${activeStory.title}`, href: activeHref, Icon: PenLine };
    return { label: "Start a story", href: "/create", Icon: PenLine };
  }, [liveCampaigns, notifs, activeStory, activeHref]);

  // the supporting "also in your world" lives (non-work)
  const aside = useMemo(() => {
    const cur = READING_DEMO.current;
    return [
      { key: "reading", Icon: BookOpen, accent: READER_ACCENT, title: cur.title, sub: `Continue · Ch. ${cur.chapter}/${cur.of}`, href: "/read" },
      { key: "collab", Icon: Users, accent: "94,139,130", title: "2 suggestions to review", sub: `on ${activeStory?.title ?? "your story"}`, href: "/notifications" },
      { key: "follows", Icon: Heart, accent: "154,122,208", title: "Writers you follow", sub: READING_DEMO.follows[0].text, href: "/read" },
    ];
  }, [activeStory]);

  function chipFor(s: typeof allStories[number]): { label: string; rgb: string } {
    if (s.writingMode === "campaign") {
      const c = liveCampaigns.find((x) => x.id === s.id);
      if (c?.activeSession) return { label: "Live", rgb: "184,105,122" };
      return { label: "Campaign", rgb: "124,160,116" };
    }
    if (s.status === "draft") return { label: "Draft", rgb: "224,164,88" };
    if (s.format === "webtoon") return { label: "Webtoon", rgb: "154,122,208" };
    return { label: "Writing", rgb: "208,136,88" };
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          {now && <PhaseClock now={now} />}
        </header>

        <ConceptSwitcher current="banner" />

        {/* ── ATMOSPHERIC BANNER — the room, made alive ── */}
        <section className="relative mt-5 overflow-hidden rounded-3xl border border-white/10">
          <div className="absolute inset-0">
            <AnimatePresence mode="popLayout">
              <motion.div key={phaseKey} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${PHASE_IMG[phaseKey]}')` }} initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }} />
            </AnimatePresence>
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(8,8,12,0.9) 0%, rgba(8,8,12,0.55) 50%, rgba(8,8,12,0.25) 100%)" }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(120% 100% at 90% 0%, rgba(${phaseRgb},0.25), transparent 55%)` }} />
          </div>

          {!reduce && (
            <div className="pointer-events-none absolute inset-y-0 right-5 hidden w-40 sm:block">
              {FLOATS.map((r, i) => (
                <motion.div key={i} className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm" initial={{ y: 220, opacity: 0 }} animate={{ y: -30, opacity: [0, 1, 1, 0] }} transition={{ duration: 6.5, delay: i * 1.8, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 0.8, 1] }}>
                  <span className="text-sm">{r.e}</span><span>{r.l}</span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="relative flex min-h-[230px] flex-col justify-end p-6 sm:p-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">{PHASES[phaseKey].label}</span>
            <h1 className="mt-1 font-display text-3xl leading-tight text-white drop-shadow sm:text-5xl">{greeting()}{firstName ? `, ${firstName}` : ""}.</h1>
            <p className="mt-1.5 font-reading text-sm italic text-white/65">{PHASES[phaseKey].mood}.</p>
            {loaded && (
              <Link href={topAction.href} className="group mt-5 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${phaseRgb})` }}>
                <topAction.Icon className="h-4 w-4" />{topAction.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </section>

        {!loaded ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-elevated/50" />)}</div>
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : allStories.length === 0 ? (
          <Link href="/create" className="mt-6 block rounded-2xl border border-dashed border-amber/30 bg-elevated/30 p-10 text-center transition-colors hover:border-amber/50">
            <p className="font-display text-lg text-paper">Hang your first story</p>
            <p className="mt-1 font-reading text-sm italic text-text-secondary">The walls are bare. Start something and the studio fills.</p>
          </Link>
        ) : (
          <>
            {/* ── YOUR WORKS — equal covers ── */}
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Your works</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {allStories.slice(0, 8).map((s) => {
                  const chip = chipFor(s);
                  return (
                    <motion.div key={s.id} whileHover={reduce ? undefined : { y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                      <Link href={storyHref(s)}>
                        <div className="relative">
                          <CoverArt seed={s.id} title={s.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" image={s.coverImageUrl} />
                          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black" style={{ backgroundColor: `rgb(${chip.rgb})` }}>{chip.label}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost">
                          <span>{s.chapterCount > 0 ? `${s.chapterCount} ch` : "draft"}</span>
                          <span>{(s.totalWords || 0).toLocaleString()}w</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* ── MOMENTUM ── */}
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <MomentumCard accent={phaseRgb} icon={<TrendingUp className="h-4 w-4" />} label="Words" big={allStories.reduce((a, s) => a + (s.totalWords || 0), 0).toLocaleString()} sub="across your shelf"><div className="mt-1"><Sparkline data={wordSeries} color={phaseRgb} reduce={reduce} /></div></MomentumCard>
              <MomentumCard accent={READER_ACCENT} icon={<Flame className="h-4 w-4" />} label="Reading streak" big={`${READING_DEMO.streak} days`} sub="don't break the chain"><div className="mt-2 flex items-end gap-1">{[4, 6, 5, 7, 6, 8, 9].map((n, i) => <motion.span key={i} className="w-full rounded-sm" style={{ backgroundColor: `rgba(${READER_ACCENT},${0.35 + i * 0.09})` }} initial={reduce ? false : { height: 0 }} animate={{ height: n * 4 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 18 }} />)}</div></MomentumCard>
              <MomentumCard accent="208,136,88" icon={<Coins className="h-4 w-4" />} label="Sparks" big={allStories.reduce((a, s) => a + (s.sparkCount || 0), 0).toLocaleString()} sub="readers who lit up"><div className="mt-2 flex flex-wrap gap-1">{["😮", "🔥", "💔", "✨", "😱", "😄"].map((e, i) => <motion.span key={i} className="text-base" initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}>{e}</motion.span>)}</div></MomentumCard>
            </section>

            {/* ── ALSO IN YOUR WORLD ── */}
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Also in your world</h2>
              <ScenesRail>
                {aside.map((l) => (
                  <Link key={l.key} href={l.href} className="flex w-60 shrink-0 flex-col justify-between rounded-2xl border border-border-subtle bg-surface/60 p-4 transition-colors hover:border-white/15" style={{ minHeight: 132 }}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `rgba(${l.accent},0.14)`, color: `rgb(${l.accent})` }}><l.Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[15px] text-paper">{l.title}</span>
                      <span className="block truncate text-[11.5px] text-text-secondary">{l.sub}</span>
                    </span>
                  </Link>
                ))}
              </ScenesRail>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
