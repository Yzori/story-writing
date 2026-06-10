"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PenLine, BookOpen, Swords, MessageSquareText, Users, Heart, Flame, TrendingUp, Coins, Palette, Trophy, Megaphone } from "lucide-react";
import { useStudioData, storyHref, readingHref, type DashboardSignals, type DiscoverData } from "@/components/dashboard/useStudioData";
import { CoverArt, MomentumCard, Sparkline, PhaseClock, phaseInfo, PHASES, READER_ACCENT, CLOCK_FALLBACK, ScenesRail, genrePalette, type PhaseKey } from "@/components/dashboard/studio-kit";
import FirstRunPanel from "@/components/dashboard/FirstRunPanel";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Live Studio dashboard. Atmospheric time-of-day banner (greeting + clock + the
// single most-important action) over a row of your works, momentum, and a real
// "also in your world" rail. All data real — see useStudioData + /api/dashboard.
// (Previous time-of-day "study desk" dashboard preserved as
//  _legacy-study-dashboard.tsx.bak in this folder.)
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 60_000;
const FIRST_RUN_DISMISSED_KEY = "quiloria-firstrun-dismissed";
const PHASE_IMG: Record<PhaseKey, string> = {
  morning: "/dashboard/study-morning.png",
  day: "/dashboard/study-afternoon.png",
  dusk: "/dashboard/study-night.png",
  night: "/dashboard/study-night.png",
};
function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const { loaded, error, allStories, activeStory, activeHref, liveCampaigns, unreadComments, signals, discover } = useStudioData(POLL_MS);
  const userId = session?.user?.id;
  const firstName = session?.user?.name?.split(" ")[0];

  // First-run onboarding panel — shown to brand-new users until dismissed.
  // Lazy localStorage read is SSR-safe; the panel only renders after `loaded`.
  const [firstRunDismissed, setFirstRunDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(FIRST_RUN_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismissFirstRun = () => {
    setFirstRunDismissed(true);
    try {
      localStorage.setItem(FIRST_RUN_DISMISSED_KEY, "1");
    } catch {}
  };

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phaseRgb = PHASES[phaseKey].rgb;

  const totalWords = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
  const totalSparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
  const hasTrend = signals.wordsTrend.length > 1 && signals.wordsTrend.some((n) => n > 0);

  // the single most-important action, surfaced in the banner
  const topAction = (() => {
    const live = liveCampaigns.find((c) => c.activeSession);
    if (live) {
      const yourMove = !!userId && live.activeSession!.activePlayerId === userId;
      return { label: yourMove ? `Take your turn in ${live.title}` : `Enter ${live.title}`, href: `/campaign/${live.id}/play/${live.activeSession!.id}`, Icon: Swords };
    }
    if (unreadComments) return { label: `Answer ${unreadComments} reader note${unreadComments === 1 ? "" : "s"}`, href: "/notifications", Icon: MessageSquareText };
    if (activeStory) return { label: `Resume ${activeStory.title}`, href: activeHref, Icon: PenLine };
    return { label: "Start a story", href: "/create", Icon: PenLine };
  })();

  // real "also in your world" cards — only what genuinely exists
  const aside = buildAside(signals);

  function chipFor(s: ApiStory): { label: string; rgb: string } {
    if (s.writingMode === "campaign") {
      const c = liveCampaigns.find((x) => x.id === s.id);
      return c?.activeSession ? { label: "Live", rgb: "184,105,122" } : { label: "Campaign", rgb: "124,160,116" };
    }
    if (s.status === "draft") return { label: "Draft", rgb: "224,164,88" };
    if (s.format === "webtoon") return { label: "Webtoon", rgb: "154,122,208" };
    return { label: "Writing", rgb: "208,136,88" };
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <span className="font-display text-lg text-paper">{firstName ? `${firstName}'s Studio` : "Your Studio"}</span>
          {now && <PhaseClock now={now} />}
        </header>

        {/* ── ATMOSPHERIC BANNER ── */}
        <section className="relative mt-5 overflow-hidden rounded-3xl border border-white/10">
          <div className="absolute inset-0">
            <AnimatePresence mode="popLayout">
              <motion.div key={phaseKey} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${PHASE_IMG[phaseKey]}')` }} initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }} />
            </AnimatePresence>
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(8,8,12,0.9) 0%, rgba(8,8,12,0.55) 50%, rgba(8,8,12,0.25) 100%)" }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(120% 100% at 90% 0%, rgba(${phaseRgb},0.25), transparent 55%)` }} />
          </div>
          <div className="relative flex min-h-[230px] flex-col justify-end p-6 sm:p-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">{PHASES[phaseKey].label}</span>
            <h1 className="mt-1 font-display text-3xl leading-tight text-white drop-shadow sm:text-5xl">{greeting(clockNow)}{firstName ? `, ${firstName}` : ""}.</h1>
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
        ) : error && allStories.length === 0 ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : allStories.length === 0 ? (
          !firstRunDismissed ? (
            <div className="mt-6">
              <FirstRunPanel firstName={firstName} onDismiss={dismissFirstRun} />
            </div>
          ) : (
            <Link href="/create" className="mt-6 block rounded-2xl border border-dashed border-amber/30 bg-elevated/30 p-10 text-center transition-colors hover:border-amber/50">
              <p className="font-display text-lg text-paper">Hang your first story</p>
              <p className="mt-1 font-reading text-sm italic text-text-secondary">The walls are bare. Start something and the studio fills.</p>
            </Link>
          )
        ) : (
          <>
            {/* ── YOUR WORKS ── */}
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

            {/* ── MOMENTUM (real) ── */}
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <MomentumCard accent={phaseRgb} icon={<TrendingUp className="h-4 w-4" />} label="Words" big={totalWords.toLocaleString()} sub="across your shelf">
                {hasTrend && <div className="mt-1"><Sparkline data={signals.wordsTrend} color={phaseRgb} reduce={reduce} /></div>}
              </MomentumCard>
              <MomentumCard accent={READER_ACCENT} icon={<Flame className="h-4 w-4" />} label="Reading streak" big={`${signals.readingStreak} ${signals.readingStreak === 1 ? "day" : "days"}`} sub={signals.readingStreak > 0 ? "don't break the chain" : "read today to start one"} />
              <MomentumCard accent="208,136,88" icon={<Heart className="h-4 w-4" />} label="Sparks" big={totalSparks.toLocaleString()} sub={signals.sparksWeek > 0 ? `${signals.sparksWeek} this week` : "readers who lit up"} />
            </section>

            {/* ── ALSO IN YOUR WORLD (real) ── */}
            {aside.length > 0 && (
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
            )}

            {/* ── DISCOVER (personalized, quiet) ── */}
            <DiscoverStrip discover={discover} reduce={reduce} />
          </>
        )}
      </div>
    </div>
  );
}

function DiscoverStrip({ discover, reduce }: { discover: DiscoverData; reduce: boolean | null }) {
  const has = discover.trending.length > 0 || discover.jam || discover.openCall;
  if (!has) return null;
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Discover</h2>
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">picked for you</span>
      </div>
      <ScenesRail>
        {discover.jam && (
          <Link key="jam" href={`/jams/${discover.jam.id}`} className="flex w-56 shrink-0 flex-col justify-between rounded-2xl border border-amber/25 bg-amber/[0.06] p-4" style={{ minHeight: 132 }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/15 text-amber"><Trophy className="h-4 w-4" /></span>
            <span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-amber">{discover.jam.liveStatus === "open" ? "Jam open now" : "Jam coming up"}</span>
              <span className="mt-0.5 block truncate font-display text-[15px] text-paper">{discover.jam.title}</span>
              <span className="block truncate text-[11.5px] text-text-secondary">{discover.jam.theme}</span>
            </span>
          </Link>
        )}
        {discover.openCall && (
          <Link key="opencall" href={discover.openCall.slug ? `/story/${discover.openCall.slug}/calls` : "/browse"} className="flex w-56 shrink-0 flex-col justify-between rounded-2xl border border-sage/25 bg-sage/[0.06] p-4" style={{ minHeight: 132 }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/15 text-sage"><Megaphone className="h-4 w-4" /></span>
            <span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-sage">Looking for a {discover.openCall.role}</span>
              <span className="mt-0.5 block truncate font-display text-[15px] text-paper">{discover.openCall.title}</span>
              <span className="block truncate text-[11.5px] text-text-secondary">on {discover.openCall.storyTitle}</span>
            </span>
          </Link>
        )}
        {discover.trending.map((t) => (
          <motion.div key={t.id} whileHover={reduce ? undefined : { y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="w-40 shrink-0">
            <Link href={t.slug ? `/story/${t.slug}` : "/browse"}>
              <CoverArt seed={t.id} title={t.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" image={t.coverImageUrl} palette={genrePalette(t.genres[0])} />
              <div className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost">
                <span className="truncate">{t.author ?? "Anon"}</span>
                <span>✶ {t.sparkCount}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </ScenesRail>
    </section>
  );
}

type AsideCard = { key: string; Icon: typeof BookOpen; accent: string; title: string; sub: string; href: string };

function buildAside(signals: DashboardSignals): AsideCard[] {
  const cards: AsideCard[] = [];
  if (signals.continueReading) {
    const cr = signals.continueReading;
    cards.push({
      key: "continue",
      Icon: BookOpen,
      accent: READER_ACCENT,
      title: cr.storyTitle,
      sub: `Continue · Ch. ${cr.chapterNumber}${cr.totalChapters ? `/${cr.totalChapters}` : ""}`,
      href: readingHref(cr),
    });
  }
  if (signals.suggestions.count > 0) {
    const latest = signals.suggestions.latest;
    cards.push({
      key: "suggestions",
      Icon: Users,
      accent: "94,139,130",
      title: `${signals.suggestions.count} suggestion${signals.suggestions.count === 1 ? "" : "s"} to review`,
      sub: latest ? `latest on ${latest.storyTitle}` : "from collaborators",
      // deep-link straight to the Suggestions tab of the story's workshop
      href: latest?.storySlug ? `/story/${latest.storySlug}/workshop?tab=suggestions` : "/notifications",
    });
  }
  if (signals.commissions.count > 0) {
    const c = signals.commissions.latest;
    cards.push({
      key: "commissions",
      Icon: Palette,
      accent: "184,105,122",
      title: `${signals.commissions.count} commission request${signals.commissions.count === 1 ? "" : "s"}`,
      sub: c ? `${c.status === "accepted" ? "accepted · ready to start" : "awaiting your quote"}${c.patron ? ` · ${c.patron}` : ""}` : "in Commissions",
      href: c?.id ? `/scriptorium/commissions/${c.id}` : "/scriptorium",
    });
  }
  for (const f of signals.follows.slice(0, 4)) {
    cards.push({
      key: `follow-${f.storyId}-${f.createdAt}`,
      Icon: Heart,
      accent: "154,122,208",
      title: `${f.author ?? "A writer"} ${f.kind === "chapter" ? "posted a chapter" : "shared an update"}`,
      sub: f.kind === "chapter" ? `${f.title} · ${f.storyTitle}` : f.title,
      href: f.slug ? `/story/${f.slug}` : "/read",
    });
  }
  if (signals.dropsWeek > 0) {
    cards.push({
      key: "drops",
      Icon: Coins,
      accent: "208,136,88",
      title: `${signals.dropsWeek.toLocaleString()} drops`,
      sub: "received this week",
      href: "/creator/earnings",
    });
  }
  return cards;
}
