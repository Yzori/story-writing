"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/shared/Navbar";

/**
 * TrendingHome — the signed-in / page.
 *
 * A rotating hero carousel (5 slots, paid boosts first, trending fill),
 * a Sponsored strip, and content rows for trending, adventures, jams,
 * follows, and staff picks.
 */

// ── Scroll reveal animation variants ─────────────────────────

const revealContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

const revealChild = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Wraps a section with fade-up-on-scroll + staggered children */
function RevealSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={revealContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/** Ornamental divider between depth-layer sections */
function SectionDivider() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-3 text-text-ghost/30">
        <div className="w-12 h-px bg-gradient-to-r from-transparent to-border" />
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-gold/20">
          <path d="M8 2c.6 0 1.1.2 1.5.6l.5.5c.3.3.5.7.5 1.1V6l2.5 1.3c.3.2.5.5.5.9v.6c0 .3-.3.6-.6.5L10 8.5l-.2 1.8 1.5 1c.2.2.3.5.1.7l-.3.5c-.2.3-.5.3-.8.2L8 11.5l-2.3 1.2c-.3.1-.6.1-.8-.2l-.3-.5c-.1-.2-.1-.5.1-.7l1.5-1L6 8.5l-2.9.8c-.3.1-.6-.2-.6-.5v-.6c0-.4.2-.7.5-.9L5.5 6V4.2c0-.4.2-.8.5-1.1l.5-.5C6.9 2.2 7.4 2 8 2z" />
        </svg>
        <div className="w-12 h-px bg-gradient-to-l from-transparent to-border" />
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────

interface StoryCard {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  synopsis: string | null;
  coverImageUrl: string | null;
  format: string;
  writingMode: string;
  genres: string[];
  authorName: string | null;
  authorAvatar: string | null;
}

interface TrendingCard extends StoryCard {
  weeklyInteractions: {
    sparks: number;
    follows: number;
    donationDrops: number;
  };
}

interface HeroSlide extends StoryCard {
  sponsored: boolean;
  boostId: string | null;
  boostExpiresAt: string | null;
}

interface LiveAdventure {
  sessionId: string;
  sessionTitle: string;
  sessionSummary: string | null;
  storyId: string;
  storySlug: string | null;
  storyTitle: string;
  coverImageUrl: string | null;
  authorName: string | null;
  isLive: boolean;
  latestTurnAt: string | null;
  latestTurnSnippet: string | null;
  latestTurnAuthor: string | null;
  spectatorCount: number;
  roster: {
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    characterName: string | null;
  }[];
}

interface AdventureRow {
  sessionId: string;
  sessionTitle: string;
  sessionSummary: string | null;
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  coverImageUrl: string | null;
  authorName: string | null;
  playerCount: number;
}

interface JamRow {
  id: string;
  title: string;
  description: string;
  theme: string;
  bannerUrl: string | null;
  submissionEndsAt: string;
  votingEndsAt: string;
  status: string;
}

interface StaffPickRow extends StoryCard {
  curatorNote: string;
}

interface ActivityEvent {
  kind: "chapter" | "gift" | "follow" | "join" | "jam" | "comment";
  at: string;
  text: string;
  href: string;
  actor: string | null;
  amount?: number;
  personal?: boolean;
}

interface PulseCounts {
  liveSessions: number;
  openJams: number;
  weeklyStories: number;
  online: number;
}

type ContinueItem =
  | {
      kind: "read";
      title: string;
      subtitle: string;
      href: string;
      coverImageUrl: string | null;
      scrollPercent: number;
      updatedAt: string;
    }
  | {
      kind: "draft";
      title: string;
      subtitle: string;
      href: string;
      coverImageUrl: string | null;
      updatedAt: string;
      wordCount: number;
    }
  | {
      kind: "play";
      title: string;
      subtitle: string;
      href: string;
      coverImageUrl: string | null;
      updatedAt: string;
      isLive: boolean;
      asGm: boolean;
    };

interface TodayStats {
  unreadNotifications: number;
  dropsEarned24h: number;
  newComments24h: number;
  jamDeadlinesEntered: number;
}

interface HomeData {
  continue: ContinueItem[];
  today: TodayStats;
  hero: HeroSlide[];
  sponsored: StoryCard[];
  trending: TrendingCard[];
  liveAdventures: LiveAdventure[];
  adventures: AdventureRow[];
  jams: JamRow[];
  following: TrendingCard[];
  staffPicks: StaffPickRow[];
  activity: ActivityEvent[];
  pulse: PulseCounts;
}

// ── Helpers ───────────────────────────────────────────────────

function storyHref(s: { slug: string | null; id: string }) {
  return `/story/${s.slug ?? s.id}`;
}

function primaryAction(s: StoryCard) {
  if (s.writingMode === "campaign") return "Join the adventure";
  if (s.format === "poetry") return "Read the verses";
  return "Read";
}

function formatCountdown(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / (24 * 60 * 60 * 1000));
  const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const s = Math.floor((ms % (60 * 1000)) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatInteractions(w: TrendingCard["weeklyInteractions"]): string | null {
  const parts: string[] = [];
  if (w.sparks > 0) parts.push(`+${w.sparks} sparks`);
  if (w.follows > 0) parts.push(`+${w.follows} readers`);
  if (w.donationDrops > 0) parts.push(`+${w.donationDrops} drops`);
  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(" · ");
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────

export default function TrendingHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stale-while-revalidate: first fetch shows skeletons, subsequent polls
    // swap data in without flashing loading state.
    const fetchHome = async (isInitial: boolean) => {
      try {
        const res = await fetch("/api/home");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setData(json?.data ?? null);
      } catch {
        // On poll failure, keep the previous data visible — stale is better
        // than an error flash.
      } finally {
        if (isInitial && !cancelled) setLoading(false);
      }
    };

    fetchHome(true);

    // Refetch every 60s. Pause polling when the tab is hidden so we don't
    // burn requests for users who minimized the window.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchHome(false);
      }
    }, 60_000);

    // Also refetch immediately when the tab regains focus — a user returning
    // after 20 minutes should see fresh data without waiting for the timer.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchHome(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <div className="pt-14 pb-20">
        {/* Live activity ticker */}
        {data && data.activity.length > 0 && (
          <ActivityTicker events={data.activity} />
        )}

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 pt-10 mb-12">
          <HeroCarousel slides={data?.hero ?? []} loading={loading} />
        </div>

        {/* Mobile-only Today Hub — personal signals above the content fold on small viewports.
            On lg+ the Today card lives inside the sticky right sidebar instead. */}
        {data && hasAnyTodaySignal(data.today) && (
          <div className="lg:hidden max-w-7xl mx-auto px-6 mb-10">
            <div className="rounded-2xl border border-border bg-ink/40 p-6 shadow-xl backdrop-blur-md">
              <h3 className="font-display text-lg text-paper mb-4 flex items-center gap-2 text-gold">
                Your Today
              </h3>
              <TodayStrip today={data.today} />
            </div>
          </div>
        )}

        {/* ── ATELIER BENTO GRID ── */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* ── LEFT COLUMN: CREATIVE FLOW ── */}
            <div className="lg:col-span-8 flex flex-col gap-12">
              
              <ContinueBento items={data?.continue ?? []} loading={loading} />

              {/* Follows */}
              {data && data.following.length > 0 && (
                <div className="pt-8 border-t border-border-subtle/50">
                  <Row
                    label="From the Guild"
                    hint="Caught up on the writers you're reading"
                    cards={data.following.map((s) => ({
                      id: s.id,
                      href: storyHref(s),
                      title: s.title,
                      subtitle: s.authorName ?? "",
                      cover: s.coverImageUrl,
                      tag: "New",
                    }))}
                  />
                </div>
              )}

              {/* Discover: trending + staff picks */}
              {loading ? (
                <TrendingSkeleton />
              ) : data && (data.trending.length > 0 || data.staffPicks.length > 0) ? (
                <div className="pt-8 border-t border-border-subtle/50">
                  <DiscoverSection
                    trending={data.trending}
                    staffPicks={data.staffPicks}
                    sponsored={data.sponsored}
                  />
                </div>
              ) : null}

              {/* Live adventures */}
              {loading ? (
                <LiveAdventuresSkeleton />
              ) : data && data.liveAdventures.length > 0 ? (
                <div className="pt-8 border-t border-border-subtle/50">
                   <LiveAdventuresSection sessions={data.liveAdventures} />
                </div>
              ) : null}

            </div>

            {/* ── RIGHT COLUMN: SIGNALS & PULSE HUB ── */}
            {/* Sticky on desktop so the sidebar follows scroll instead of bottoming out
                before the left-column rows finish. */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">

              {/* Today Hub — desktop only; mobile renders it above the grid */}
              {data && hasAnyTodaySignal(data.today) && (
                <div className="hidden lg:block rounded-2xl border border-border bg-ink/40 p-6 shadow-xl backdrop-blur-md">
                   <h3 className="font-display text-lg text-paper mb-4 flex items-center gap-2 text-gold">
                      Your Today
                   </h3>
                   <TodayStrip today={data.today} />
                </div>
              )}

              {/* Jams Compact */}
              {data && data.jams.length > 0 && (
                <div className="rounded-2xl border border-border bg-ink/30 p-5 shadow-lg backdrop-blur-md">
                  <h3 className="font-display text-lg text-paper mb-4">Active Jams</h3>
                  <div className="flex flex-col gap-4">
                    {data.jams.map(jam => (
                      <Link key={jam.id} href={`/jams/${jam.id}`} className="group relative block rounded-xl border border-border bg-ink/50 overflow-hidden hover:border-border-active transition-all">
                        {jam.bannerUrl && (
                          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={jam.bannerUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
                          </div>
                        )}
                        <div className="relative p-4">
                          <p className="text-[10px] tracking-[0.16em] uppercase text-lavender mb-1">Theme: {jam.theme}</p>
                          <h4 className="font-display text-base text-paper group-hover:text-lavender transition-colors truncate">{jam.title}</h4>
                          <p className="text-[12px] text-text-ghost mt-2">Closes in {formatCountdown(jam.submissionEndsAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* LFG / Seeking Players */}
              {data && data.adventures.length > 0 && (
                <div className="rounded-2xl border border-border bg-ink/30 p-5 shadow-lg">
                  <h3 className="font-display text-lg text-paper mb-4">Seeking Players</h3>
                  <div className="flex flex-col gap-3">
                    {data.adventures.map(adv => (
                      <Link key={adv.sessionId} href={`/story/${adv.storySlug ?? adv.storyId}`} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-surface/50 border border-transparent hover:border-gold/20 transition-all">
                        <div className="w-10 h-14 bg-[var(--t-card-bg-fallback)] rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {adv.coverImageUrl ? <img src={adv.coverImageUrl} alt="" className="w-full h-full object-cover" /> : <svg className="w-4 h-4 text-gold/20"><circle cx="8" cy="8" r="4"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <h4 className="font-display text-[14px] text-paper group-hover:text-gold truncate leading-tight">{adv.sessionTitle}</h4>
                          <p className="text-[11px] text-text-ghost mt-1 truncate">{adv.playerCount} at table</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Pulse */}
              {data && (
                <div className="rounded-2xl border border-border bg-ink/30 p-5 shadow-lg overflow-hidden">
                  <h3 className="font-display text-lg text-paper mb-4">Platform Pulse</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 rounded-lg border border-border/50 bg-void/30 flex flex-col items-center">
                       <span className="font-display text-xl text-teal">{data.pulse.online.toLocaleString()}</span>
                       <span className="text-[10px] uppercase text-text-ghost tracking-widest mt-1">Online</span>
                     </div>
                     <div className="p-3 rounded-lg border border-border/50 bg-void/30 flex flex-col items-center">
                       <span className="font-display text-xl text-rose">{data.pulse.liveSessions.toLocaleString()}</span>
                       <span className="text-[10px] uppercase text-text-ghost tracking-widest mt-1">Live Tales</span>
                     </div>
                     <div className="p-3 rounded-lg border border-border/50 bg-void/30 flex flex-col items-center">
                       <span className="font-display text-xl text-gold">{data.pulse.weeklyStories.toLocaleString()}</span>
                       <span className="text-[10px] uppercase text-text-ghost tracking-widest mt-1">Weekly</span>
                     </div>
                     <div className="p-3 rounded-lg border border-border/50 bg-void/30 flex flex-col items-center">
                       <span className="font-display text-xl text-lavender">{data.pulse.openJams.toLocaleString()}</span>
                       <span className="text-[10px] uppercase text-text-ghost tracking-widest mt-1">Jams</span>
                     </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function hasAnyTodaySignal(t: TodayStats): boolean {
  return (
    t.unreadNotifications > 0 ||
    t.dropsEarned24h > 0 ||
    t.newComments24h > 0 ||
    t.jamDeadlinesEntered > 0
  );
}

// ── Continue Bento — resume surfaces in a distinctive container ──

function ContinueBento({
  items,
  loading,
}: {
  items: ContinueItem[];
  loading: boolean;
}) {
  // Map kinds to their item for deterministic slot placement.
  const byKind: Record<string, ContinueItem | undefined> = {
    read: items.find((i) => i.kind === "read"),
    draft: items.find((i) => i.kind === "draft"),
    play: items.find((i) => i.kind === "play"),
  };

  // Primary slot = reading (most users' highest-intent resume), falls back
  // to Candlelit as the promo hero if there's nothing to resume.
  const primary = byKind.read ?? null;
  const secondaries = [byKind.draft, byKind.play].filter(
    (x): x is ContinueItem => !!x,
  );

  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="text-gold/60 text-[11px] tracking-[0.3em] uppercase mb-1">
            Welcome back
          </p>
          <h2 className="font-display text-paper text-2xl md:text-3xl tracking-tight">
            Pick up where you left off
          </h2>
        </div>
      </div>

      {/* Distinctive bento container with warm tint and gold edge. */}
      <div className="relative rounded-2xl border border-gold/15 bg-surface p-4 md:p-5 shadow-[var(--t-shadow-elevated)]">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,var(--t-gold-glow)_0%,transparent_50%)] pointer-events-none" />
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 md:auto-rows-[minmax(120px,auto)]">
          {loading ? (
            <>
              <div className="md:col-span-2 md:row-span-2 aspect-[16/10] md:aspect-auto rounded-xl bg-[var(--t-card-bg)] animate-pulse" />
              <div className="rounded-xl bg-[var(--t-card-bg)] animate-pulse aspect-[16/10] md:aspect-auto" />
              <div className="rounded-xl bg-[var(--t-card-bg)] animate-pulse aspect-[16/10] md:aspect-auto" />
            </>
          ) : (
            <>
              {/* Primary cell: 2x2 */}
              {primary ? (
                <ContinueCard item={primary} variant="primary" />
              ) : (
                <CandlelitBentoCard variant="primary" />
              )}

              {/* Secondary cells (top-right, middle-right) */}
              {secondaries.slice(0, 2).map((item, idx) => (
                <ContinueCard
                  key={`${item.kind}-${idx}`}
                  item={item}
                  variant="secondary"
                />
              ))}
              {/* Fill empty secondary slots if fewer than 2 */}
              {secondaries.length < 2 &&
                Array.from({ length: 2 - secondaries.length }).map((_, i) => (
                  <EmptySecondaryCell key={`empty-${i}`} />
                ))}

              {/* Bottom-right wide cell: Candlelit promo (unless primary is already candlelit) */}
              {primary && (
                <div className="md:col-span-2">
                  <CandlelitBentoCard variant="wide" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function EmptySecondaryCell() {
  return (
    <Link
      href="/create"
      className="group rounded-xl border border-dashed border-border hover:border-gold/30 bg-elevated/10 hover:bg-[var(--t-card-bg)] transition-all flex items-center justify-center p-5 min-h-[120px]"
    >
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-2 rounded-full border border-border group-hover:border-gold/40 flex items-center justify-center text-text-ghost group-hover:text-gold transition-all">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </div>
        <p className="text-text-ghost text-[11px] tracking-wide group-hover:text-gold/80 transition-colors">
          Start something new
        </p>
      </div>
    </Link>
  );
}

function ContinueCard({
  item,
  variant,
}: {
  item: ContinueItem;
  variant: "primary" | "secondary";
}) {
  const accentByKind: Record<
    ContinueItem["kind"],
    { label: string; icon: React.ReactNode; color: string }
  > = {
    read: {
      label: "Continue reading",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M5 5h6M5 8h4" />
        </svg>
      ),
      color: "text-gold",
    },
    draft: {
      label: "Resume draft",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M11 2l3 3-8 8H3v-3z" />
          <path d="M9 4l3 3" />
        </svg>
      ),
      color: "text-amber",
    },
    play: {
      label: item.kind === "play" && item.asGm ? "Return to GM seat" : "Rejoin session",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <path d="M6 5l5 3-5 3z" fill="currentColor" />
        </svg>
      ),
      color: "text-sage",
    },
  };
  const accent = accentByKind[item.kind];
  const isLivePlay = item.kind === "play" && item.isLive;

  const isPrimary = variant === "primary";

  return (
    <Link
      href={item.href}
      className={`group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-[var(--t-card-bg)] transition-all hover:shadow-[var(--t-shadow-card-hover)] ${
        isPrimary ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div
        className={`relative ${
          isPrimary
            ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-[260px]"
            : "aspect-[16/10] md:aspect-auto md:h-full md:min-h-[120px]"
        }`}
      >
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-50),transparent)]" />

        {/* Top label */}
        <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase ${accent.color}`}>
          {accent.icon}
          {accent.label}
        </div>

        {/* Live badge for play */}
        {isLivePlay && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-rose/90 backdrop-blur px-2 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase text-white font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Live
          </div>
        )}

        {/* Title block */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <h3
            className={`font-display text-white leading-tight line-clamp-2 group-hover:text-gold transition-colors ${
              isPrimary ? "text-xl md:text-2xl" : "text-[14px]"
            }`}
          >
            {item.title}
          </h3>
          <p className="text-white/50 text-[11px] mt-1 truncate">
            {item.subtitle}
          </p>

          {/* Scroll progress for reading */}
          {item.kind === "read" && (
            <div className="mt-2 h-[2px] rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-gold/70"
                style={{ width: `${item.scrollPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function CandlelitBentoCard({
  variant,
}: {
  variant: "primary" | "wide";
}) {
  const isPrimary = variant === "primary";
  return (
    <Link
      href="/read"
      className={`group relative block overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-br from-gold/10 via-void to-copper/10 hover:border-gold/50 transition-all ${
        isPrimary ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div
        className={`relative flex flex-col justify-between p-5 md:p-6 ${
          isPrimary ? "md:h-full md:min-h-[260px]" : "md:h-full md:min-h-[120px]"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--t-gold-soft)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-gold/30 text-gold px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1C8 1 3 4 3 9a5 5 0 0010 0c0-5-5-8-5-8z" />
            </svg>
            Tonight&apos;s reading
          </div>
        </div>
        <div className="relative mt-4 md:mt-0">
          <h3
            className={`font-display text-paper leading-tight mb-1 ${
              isPrimary ? "text-2xl md:text-3xl" : "text-base md:text-lg"
            }`}
          >
            The candlelit room
          </h3>
          <p className="text-text-secondary text-[12px] mb-2 line-clamp-2 max-w-md">
            A story is already waiting — picked for you, paced for you.
          </p>
          <span className="inline-flex items-center gap-1.5 text-gold text-[11px] tracking-wide group-hover:gap-2 transition-all">
            Enter the room
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Today strip — writer / GM signal row ──────────────────────

function TodayStrip({ today }: { today: TodayStats }) {
  const items: {
    key: string;
    value: number;
    label: string;
    href: string;
    color: string;
    icon: React.ReactNode;
  }[] = [];
  if (today.newComments24h > 0) {
    items.push({
      key: "comments",
      value: today.newComments24h,
      label: today.newComments24h === 1 ? "new comment on your work" : "new comments on your work",
      href: "/notifications",
      color: "text-teal",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h12v9H6l-4 3z" />
        </svg>
      ),
    });
  }
  if (today.dropsEarned24h > 0) {
    items.push({
      key: "drops",
      value: today.dropsEarned24h,
      label: "drops earned today",
      href: "/creator/earnings",
      color: "text-gold",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
        </svg>
      ),
    });
  }
  if (today.jamDeadlinesEntered > 0) {
    items.push({
      key: "jams",
      value: today.jamDeadlinesEntered,
      label: today.jamDeadlinesEntered === 1 ? "jam deadline you're in" : "jam deadlines you're in",
      href: "/jams",
      color: "text-lavender",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
        </svg>
      ),
    });
  }
  if (today.unreadNotifications > 0) {
    items.push({
      key: "notifs",
      value: today.unreadNotifications,
      label: today.unreadNotifications === 1 ? "unread notification" : "unread notifications",
      href: "/notifications",
      color: "text-rose",
      icon: (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6a4 4 0 018 0c0 4 2 5 2 5H2s2-1 2-5z" />
        </svg>
      ),
    });
  }
  if (items.length === 0) return null;

  return (
    <div className="mb-2 rounded-xl border border-border bg-gradient-to-r from-elevated/30 via-void to-elevated/30 px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-text-ghost text-[10px] tracking-[0.25em] uppercase">
          Your today
        </span>
        <div className="w-px h-4 bg-border hidden md:block" />
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="inline-flex items-center gap-2 text-[12px] hover:opacity-80 transition-opacity"
          >
            <span className={it.color}>{it.icon}</span>
            <span className={`font-display tabular-nums text-base ${it.color}`}>
              {it.value.toLocaleString()}
            </span>
            <span className="text-text-secondary">{it.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────

function TrendingSkeleton() {
  return (
    <section>
      <div className="mb-6 h-8 w-52 rounded bg-[var(--t-card-bg)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 md:row-span-2 aspect-[16/10] md:aspect-auto md:min-h-[320px] rounded-xl bg-[var(--t-card-bg)] animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-xl bg-[var(--t-card-bg)] animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}

function LiveAdventuresSkeleton() {
  return (
    <section>
      <div className="mb-6 h-8 w-64 rounded bg-[var(--t-card-bg)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[16/10] rounded-xl bg-[var(--t-card-bg)] animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}

// ── Activity Ticker ───────────────────────────────────────────

function iconForEvent(kind: ActivityEvent["kind"]) {
  switch (kind) {
    case "chapter":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/70">
          <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M5 5h6M5 8h4" />
        </svg>
      );
    case "gift":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-gold">
          <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
        </svg>
      );
    case "follow":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose">
          <path d="M8 14s-5-3-5-7a3 3 0 015-2 3 3 0 015 2c0 4-5 7-5 7z" />
        </svg>
      );
    case "comment":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
          <path d="M2 3h12v9H6l-4 3z" />
        </svg>
      );
    case "join":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage">
          <circle cx="8" cy="6" r="3" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      );
    case "jam":
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lavender">
          <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
        </svg>
      );
  }
}

function ActivityTicker({ events }: { events: ActivityEvent[] }) {
  const isPersonal = events.some((e) => e.personal);
  const label = isPersonal ? "While you were away" : "Live";
  const dotColor = isPersonal ? "bg-gold" : "bg-rose";

  // Typewriter state — cycles through events, typing each letter-by-letter
  const [eventIdx, setEventIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "fade">("typing");
  const prefersReduced = useRef(false);
  const current = events[eventIdx % events.length];

  useEffect(() => {
    prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!current || prefersReduced.current) return;
    if (phase === "typing") {
      if (charIdx < current.text.length) {
        const id = setTimeout(() => setCharIdx((c) => c + 1), 28);
        return () => clearTimeout(id);
      }
      // Done typing — hold for a beat
      setPhase("hold");
    } else if (phase === "hold") {
      const id = setTimeout(() => setPhase("fade"), 2400);
      return () => clearTimeout(id);
    } else if (phase === "fade") {
      const id = setTimeout(() => {
        setEventIdx((i) => (i + 1) % events.length);
        setCharIdx(0);
        setPhase("typing");
      }, 500);
      return () => clearTimeout(id);
    }
  }, [phase, charIdx, current, events.length]);

  // Reduced-motion fallback: static display of first event
  const displayText = prefersReduced.current
    ? (current?.text ?? "")
    : (current?.text.slice(0, charIdx) ?? "");

  return (
    <div className="relative w-full py-3 border-b border-border bg-gradient-to-r from-void via-elevated/20 to-void">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 md:gap-6">
        {/* Pulse dot + label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-secondary">
            {label}
          </span>
        </div>
        <div className="w-px h-5 bg-border flex-shrink-0 hidden md:block" />
        {/* Typewriter event */}
        {current && (
          <Link
            href={current.href}
            className={`flex-1 inline-flex items-center gap-2 text-[12px] text-text-secondary hover:text-paper transition-colors min-w-0 ${
              phase === "fade" ? "opacity-0" : "opacity-100"
            } transition-opacity duration-500`}
          >
            {iconForEvent(current.kind)}
            <span className="truncate">
              {displayText}
              {!prefersReduced.current && phase === "typing" && charIdx < (current?.text.length ?? 0) && (
                <span className="inline-block w-[1px] h-[13px] bg-gold/80 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
            {(phase === "hold" || prefersReduced.current) && (
              <span className="text-text-ghost text-[10px] flex-shrink-0">
                · {formatTimeAgo(current.at)}
              </span>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Live Adventures section ───────────────────────────────────

function LiveAdventuresSection({ sessions }: { sessions: LiveAdventure[] }) {
  const live = sessions.filter((s) => s.isLive);
  const recent = sessions.filter((s) => !s.isLive).slice(0, 3);
  return (
    <RevealSection>
      <motion.div variants={revealChild} className="flex items-baseline justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {live.length > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose" />
              </span>
            )}
            <h2 className="font-display text-paper text-2xl md:text-3xl tracking-tight">
              {live.length > 0 ? "Live adventures — watch now" : "Recently active adventures"}
            </h2>
          </div>
          <p className="text-text-ghost text-[12px] mt-1">
            {live.length > 0
              ? "Stories being written in real time. Pull up a chair."
              : "Catch these sessions between turns."}
          </p>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...live, ...recent].slice(0, 3).map((s) => (
          <motion.div key={s.sessionId} variants={revealChild}>
            <LiveAdventureTile session={s} />
          </motion.div>
        ))}
      </div>
    </RevealSection>
  );
}

function LiveAdventureTile({ session: s }: { session: LiveAdventure }) {
  return (
    <Link
      href={`/story/${s.storySlug ?? s.storyId}`}
      className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-[var(--t-card-bg)] transition-all hover:shadow-[var(--t-shadow-card-hover)]"
    >
      {/* Cover backdrop */}
      <div className="relative aspect-[16/10]">
        {s.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.coverImageUrl}
            alt={s.storyTitle}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-40),transparent)]" />

        {/* Live badge */}
        {s.isLive && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-rose/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] tracking-[0.2em] uppercase text-white font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Live
          </div>
        )}

        {/* Spectator count */}
        {s.spectatorCount > 0 && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full text-[10px] text-white/70">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
            {s.spectatorCount} watching
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase mb-1">
            {s.storyTitle}
          </p>
          <h3 className="font-display text-white text-lg md:text-xl leading-tight group-hover:text-gold transition-colors">
            {s.sessionTitle}
          </h3>
        </div>
      </div>

      {/* Body — roster + latest turn snippet */}
      <div className="p-4 md:p-5">
        {/* Roster avatars */}
        {s.roster.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex -space-x-2">
              {s.roster.slice(0, 5).map((r, i) => (
                <div
                  key={`${r.userId}-${i}`}
                  className="w-7 h-7 rounded-full border-2 border-elevated bg-gradient-to-br from-gold/20 to-copper/20 flex items-center justify-center text-[10px] font-display text-gold overflow-hidden"
                  title={r.characterName ?? r.displayName ?? ""}
                >
                  {r.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (r.characterName ?? r.displayName ?? "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
              ))}
              {s.roster.length > 5 && (
                <div className="w-7 h-7 rounded-full border-2 border-elevated bg-void text-text-ghost flex items-center justify-center text-[9px]">
                  +{s.roster.length - 5}
                </div>
              )}
            </div>
            <span className="text-text-ghost text-[10px] tracking-wide">
              {s.roster.length} at the table
            </span>
          </div>
        )}

        {/* Latest turn snippet — the live writing */}
        {s.latestTurnSnippet ? (
          <div className="mt-3 border-l-2 border-gold/30 pl-3 py-1">
            <p className="text-text-secondary text-[12px] italic leading-relaxed line-clamp-2">
              &ldquo;{s.latestTurnSnippet}&rdquo;
            </p>
            {s.latestTurnAt && (
              <p className="text-text-ghost text-[10px] mt-1 tracking-wide">
                {s.latestTurnAuthor ?? "Unknown"} · {formatTimeAgo(s.latestTurnAt)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-text-ghost text-[12px] italic">
            No turns yet — the session hasn&apos;t started.
          </p>
        )}

        {/* Watch button */}
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-gold text-[12px] tracking-wide group-hover:gap-3 transition-all">
            {s.isLive ? "Watch live" : "View session"}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Discover section — trending + staff picks + sponsored ──────

type DiscoverTab = "rising" | "staff" | "all";

type DiscoverItem =
  | { kind: "trending"; data: TrendingCard }
  | { kind: "staff"; data: StaffPickRow }
  | { kind: "sponsored"; data: StoryCard };

function DiscoverSection({
  trending,
  staffPicks,
  sponsored,
}: {
  trending: TrendingCard[];
  staffPicks: StaffPickRow[];
  sponsored: StoryCard[];
}) {
  const [tab, setTab] = useState<DiscoverTab>("rising");

  // Build the item list for the active tab, with sponsored slots inlined at
  // positions 5 and 10 (Reddit-style inline ad placement). Skip inlining
  // sponsored in the Staff tab since that's curated editorial content.
  const items: DiscoverItem[] = (() => {
    let base: DiscoverItem[] = [];
    if (tab === "rising") {
      base = trending.map((t) => ({ kind: "trending", data: t }));
    } else if (tab === "staff") {
      base = staffPicks.map((s) => ({ kind: "staff", data: s }));
    } else {
      // Interleave trending + staff picks
      const tr = trending.map(
        (t) => ({ kind: "trending", data: t }) as DiscoverItem,
      );
      const sp = staffPicks.map(
        (s) => ({ kind: "staff", data: s }) as DiscoverItem,
      );
      base = [];
      const maxLen = Math.max(tr.length, sp.length);
      for (let i = 0; i < maxLen; i++) {
        if (tr[i]) base.push(tr[i]);
        if (sp[i]) base.push(sp[i]);
      }
    }
    if (tab === "staff") return base;

    // Inline sponsored slots at positions 5 and 10
    const withSponsored: DiscoverItem[] = [];
    let sponsoredIdx = 0;
    for (let i = 0; i < base.length; i++) {
      withSponsored.push(base[i]);
      if ((i === 4 || i === 9) && sponsored[sponsoredIdx]) {
        withSponsored.push({
          kind: "sponsored",
          data: sponsored[sponsoredIdx++],
        });
      }
    }
    return withSponsored;
  })();

  // Hero-of-row: first trending item in Rising/All tab only
  const firstItem = items[0];
  const restItems = items.slice(1);
  const showHero =
    (tab === "rising" || tab === "all") &&
    firstItem?.kind === "trending";

  return (
    <RevealSection>
      {/* Header + tabs */}
      <motion.div variants={revealChild} className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-paper text-2xl md:text-3xl tracking-tight">
            Discover
          </h2>
          <p className="text-text-ghost text-[12px] mt-1">
            What readers are sparking this week, curated picks, and more
          </p>
        </div>
        <div className="flex items-center gap-1 bg-elevated/30 border border-border rounded-full p-1">
          {(
            [
              { id: "rising" as DiscoverTab, label: "Rising" },
              { id: "staff" as DiscoverTab, label: "Staff picks" },
              { id: "all" as DiscoverTab, label: "All" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-[12px] tracking-wide rounded-full transition-all ${
                tab === t.id
                  ? "bg-gold text-void font-semibold"
                  : "text-text-secondary hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {items.length === 0 ? (
        <p className="text-text-ghost text-[13px] py-10 text-center">
          Nothing here yet. Check back soon.
        </p>
      ) : (
        <>
          {/* Rising tab: ranked stack layout */}
          {tab === "rising" ? (
            <div className="space-y-3">
              {/* #1 hero keeps the big treatment */}
              {showHero && firstItem?.kind === "trending" && (
                <motion.div variants={revealChild}>
                  <DiscoverHeroCard item={firstItem.data} />
                </motion.div>
              )}
              {/* Ranked list for #2–#10 */}
              {(showHero ? restItems : items)
                .filter((item) => item.kind !== "sponsored")
                .slice(0, 9)
                .map((item, i) => (
                  <motion.div key={`${item.kind}-${i}`} variants={revealChild}>
                    <RankedRow
                      rank={showHero ? i + 2 : i + 1}
                      item={item}
                    />
                  </motion.div>
                ))}
              {/* Sponsored inline after rank 5 */}
              {sponsored.length > 0 && (
                <motion.div variants={revealChild}>
                  <RankedRow rank={null} item={{ kind: "sponsored", data: sponsored[0] }} />
                </motion.div>
              )}
            </div>
          ) : (
            /* Staff / All tabs: magazine grid */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {showHero && firstItem?.kind === "trending" && (
                <motion.div variants={revealChild} className="md:col-span-2 md:row-span-2">
                  <DiscoverHeroCard item={firstItem.data} />
                </motion.div>
              )}
              {(showHero ? restItems : items).slice(0, 10).map((item, i) => (
                <motion.div key={`${item.kind}-${i}`} variants={revealChild}>
                  <DiscoverTile item={item} />
                </motion.div>
              ))}
            </div>
          )}

          <motion.div variants={revealChild} className="mt-8 flex items-center justify-center">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-text-secondary hover:text-gold text-[12px] tracking-wide transition-colors"
            >
              Browse more
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </motion.div>
        </>
      )}
    </RevealSection>
  );
}

function DiscoverHeroCard({ item }: { item: TrendingCard }) {
  return (
    <Link
      href={storyHref(item)}
      className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-[var(--t-card-bg)] transition-all"
    >
      <div className="relative aspect-[16/10] md:aspect-auto md:h-full min-h-[360px]">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-50),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--t-veil-50),transparent,transparent)]" />

        <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-gold/15 backdrop-blur-sm border border-gold/40 px-3 py-1 rounded-full text-[10px] tracking-[0.2em] uppercase text-gold">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
          </svg>
          #1 Rising
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase mb-2">
            by {item.authorName ?? "Unknown"}
          </p>
          <h3 className="font-display text-white text-2xl md:text-3xl mb-3 group-hover:text-gold transition-colors leading-tight">
            {item.title}
          </h3>
          {item.synopsis && (
            <p className="text-white/60 text-[13px] line-clamp-2 max-w-md mb-4">
              {item.synopsis}
            </p>
          )}
          {formatInteractions(item.weeklyInteractions) && (
            <p className="text-gold/70 text-[11px] tracking-wide">
              {formatInteractions(item.weeklyInteractions)} this week
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoverTile({ item }: { item: DiscoverItem }) {
  const story =
    item.kind === "trending" || item.kind === "staff" || item.kind === "sponsored"
      ? item.data
      : null;
  if (!story) return null;

  const isSponsored = item.kind === "sponsored";
  const isStaff = item.kind === "staff";
  const interactions =
    item.kind === "trending"
      ? formatInteractions(item.data.weeklyInteractions)
      : null;
  const curatorNote = item.kind === "staff" ? item.data.curatorNote : null;

  return (
    <Link
      href={storyHref(story)}
      className={`group relative block overflow-hidden rounded-xl border transition-all ${
        isSponsored
          ? "border-gold/20 hover:border-gold/50 bg-gradient-to-br from-gold/5 to-void"
          : "border-border hover:border-gold/40 bg-[var(--t-card-bg)]"
      }`}
    >
      <div className="relative aspect-[3/4]">
        {story.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImageUrl}
            alt={story.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-40),transparent)]" />

        {/* Tag (top-right) */}
        {isSponsored && (
          <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-gold/15 backdrop-blur border border-gold/40 text-gold text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
            </svg>
            Sponsored
          </div>
        )}
        {isStaff && (
          <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-lavender/15 backdrop-blur border border-lavender/40 text-lavender text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            Staff pick
          </div>
        )}
        {story.writingMode === "campaign" && !isSponsored && !isStaff && (
          <div className="absolute top-2.5 right-2.5 bg-sage/20 backdrop-blur border border-sage/40 text-sage text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            Adventure
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white/50 text-[10px] tracking-wide mb-1 truncate">
            by {story.authorName ?? "Unknown"}
          </p>
          <h3 className="font-display text-white text-[15px] leading-tight group-hover:text-gold transition-colors line-clamp-2">
            {story.title}
          </h3>
          {interactions && (
            <p className="text-gold/60 text-[10px] tracking-wide mt-2">
              {interactions}
            </p>
          )}
          {curatorNote && (
            <p className="text-lavender/70 text-[10px] tracking-wide mt-2 italic line-clamp-1">
              &ldquo;{curatorNote}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Ranked row — horizontal card for the Rising chart ────────

function RankedRow({
  rank,
  item,
}: {
  rank: number | null;
  item: DiscoverItem;
}) {
  const story =
    item.kind === "trending" || item.kind === "staff" || item.kind === "sponsored"
      ? item.data
      : null;
  if (!story) return null;

  const isSponsored = item.kind === "sponsored";
  const interactions =
    item.kind === "trending"
      ? formatInteractions(item.data.weeklyInteractions)
      : null;
  const curatorNote = item.kind === "staff" ? item.data.curatorNote : null;

  return (
    <Link
      href={storyHref(story)}
      className={`group flex items-center gap-4 md:gap-5 rounded-xl border transition-all p-2 pr-5 ${
        isSponsored
          ? "border-gold/20 hover:border-gold/50 bg-gradient-to-r from-gold/5 to-void"
          : "border-border/50 hover:border-gold/30 bg-[var(--t-card-bg)] hover:bg-surface/80"
      }`}
    >
      {/* Rank number */}
      {rank !== null ? (
        <div className="flex-shrink-0 w-10 md:w-14 text-center">
          <span
            className={`font-display tabular-nums leading-none ${
              rank <= 3
                ? "text-3xl md:text-4xl text-gold"
                : "text-2xl md:text-3xl text-text-ghost/40"
            }`}
          >
            {rank}
          </span>
        </div>
      ) : (
        <div className="flex-shrink-0 w-10 md:w-14 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-gold/60">
            <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
          </svg>
        </div>
      )}

      {/* Cover thumbnail */}
      <div className="flex-shrink-0 w-14 h-20 md:w-16 md:h-[88px] rounded-lg overflow-hidden border border-border/50 bg-[var(--t-card-bg)]">
        {story.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImageUrl}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-[var(--t-card-bg-fallback)]" />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 py-1">
        <h3 className="font-display text-paper text-[15px] md:text-base leading-tight group-hover:text-gold transition-colors truncate">
          {story.title}
        </h3>
        <p className="text-text-ghost text-[11px] tracking-wide mt-0.5 truncate">
          by {story.authorName ?? "Unknown"}
          {story.genres.length > 0 && (
            <span className="text-text-ghost/50"> · {story.genres[0]}</span>
          )}
        </p>
        {curatorNote && (
          <p className="text-lavender/60 text-[10px] mt-1 italic truncate">
            &ldquo;{curatorNote}&rdquo;
          </p>
        )}
      </div>

      {/* Right side — stats or badge */}
      <div className="flex-shrink-0 hidden sm:flex flex-col items-end gap-1">
        {isSponsored && (
          <span className="inline-flex items-center gap-1 bg-gold/15 border border-gold/30 text-gold text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            Sponsored
          </span>
        )}
        {interactions && (
          <span className="text-gold/60 text-[11px] tracking-wide whitespace-nowrap">
            {interactions}
          </span>
        )}
        {story.writingMode === "campaign" && (
          <span className="text-sage text-[9px] tracking-[0.15em] uppercase">
            Adventure
          </span>
        )}
      </div>

      {/* Arrow */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="flex-shrink-0 text-text-ghost/30 group-hover:text-gold/60 transition-colors hidden md:block"
      >
        <path d="M6 4l4 4-4 4" />
      </svg>
    </Link>
  );
}

// ── Adventures looking for players (call-to-play) ─────────────

function AdventuresLookingSection({ items }: { items: AdventureRow[] }) {
  return (
    <RevealSection>
      <motion.div variants={revealChild} className="mb-6">
        <h2 className="font-display text-paper text-2xl tracking-tight">
          Adventures looking for players
        </h2>
        <p className="text-text-ghost text-[12px] mt-1">
          Active campaign sessions with open seats
        </p>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.slice(0, 8).map((a) => {
          const filled = Number(a.playerCount);
          return (
            <motion.div key={a.sessionId} variants={revealChild}>
            <Link
              href={`/story/${a.storySlug ?? a.storyId}`}
              className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-[var(--t-card-bg)] transition-all"
            >
              <div className="relative aspect-[4/3]">
                {a.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.coverImageUrl}
                    alt={a.storyTitle}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-50),transparent)]" />
                {/* Seeking more pill */}
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-sage/15 backdrop-blur border border-sage/40 text-sage text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sage" />
                  </span>
                  Seeking
                </div>
              </div>
              <div className="p-4">
                <p className="text-text-ghost text-[10px] tracking-wide uppercase mb-1 truncate">
                  {a.storyTitle}
                </p>
                <h3 className="font-display text-paper text-[15px] leading-tight group-hover:text-gold transition-colors line-clamp-2 mb-3">
                  {a.sessionTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  {/* Tiny avatar dots */}
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(filled, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-void bg-gradient-to-br from-gold/30 to-copper/20"
                      />
                    ))}
                  </div>
                  <span>
                    {filled} at the table
                  </span>
                </div>
              </div>
            </Link>
            </motion.div>
          );
        })}
      </div>
    </RevealSection>
  );
}

// ── Jams section with live countdowns ─────────────────────────

function JamsSection({ items }: { items: JamRow[] }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <RevealSection>
      <motion.div variants={revealChild} className="mb-6">
        <h2 className="font-display text-paper text-2xl tracking-tight">
          Jams closing soon
        </h2>
        <p className="text-text-ghost text-[12px] mt-1">
          Short-form prompts with a deadline
        </p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((j) => {
          const target =
            j.status === "voting" ? j.votingEndsAt : j.submissionEndsAt;
          const phase = j.status === "voting" ? "Voting ends" : "Submissions end";
          return (
            <motion.div key={j.id} variants={revealChild}>
            <Link
              href={`/jams/${j.id}`}
              className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-[var(--t-card-bg)] transition-all"
            >
              <div className="relative aspect-[21/9]">
                {j.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={j.bannerUrl}
                    alt={j.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-lavender/20 via-void to-teal/10" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-40),transparent)]" />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 bg-lavender/20 backdrop-blur border border-lavender/40 text-lavender text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
                  Jam
                </div>
              </div>
              <div className="p-5">
                <p className="text-text-ghost text-[10px] tracking-wide uppercase mb-1">
                  {j.theme}
                </p>
                <h3 className="font-display text-paper text-lg group-hover:text-gold transition-colors leading-tight mb-3 line-clamp-2">
                  {j.title}
                </h3>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-text-ghost">{phase}</span>
                  <span className="font-mono text-gold tabular-nums">
                    {formatCountdown(target)}
                  </span>
                </div>
              </div>
            </Link>
            </motion.div>
          );
        })}
      </div>
    </RevealSection>
  );
}

// ── Platform pulse ribbon ─────────────────────────────────────

function PulseRibbon({ pulse }: { pulse: PulseCounts }) {
  return (
    <div className="border-t border-border bg-elevated/10 py-8 mt-16">
      <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        <Pulse
          icon={
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sage" />
            </span>
          }
          label="readers online"
          value={pulse.online}
        />
        <Pulse
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 1" />
            </svg>
          }
          label="live sessions"
          value={pulse.liveSessions}
        />
        <Pulse
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-lavender">
              <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
            </svg>
          }
          label="jams accepting entries"
          value={pulse.openJams}
        />
        <Pulse
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
              <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
              <path d="M5 5h6M5 8h4" />
            </svg>
          }
          label="stories published this week"
          value={pulse.weeklyStories}
        />
      </div>
    </div>
  );
}

function Pulse({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-[12px]">
      {icon}
      <span className="font-display text-paper tabular-nums text-base">
        {value.toLocaleString()}
      </span>
      <span className="text-text-ghost tracking-wide">{label}</span>
    </div>
  );
}

// ── Hero carousel ─────────────────────────────────────────────

const AUTOPLAY_MS = 7000;

/**
 * Triple slider: three slides visible at once — the main one centered, the
 * previous one peeking behind-left (scaled 0.75, rotated 10° on Y), the next
 * one peeking behind-right (scaled 0.75, rotated −10° on Y). Clicking a side
 * slide navigates. Parallax content transition, progress bar, dot indicators.
 *
 * Inspired by the UI Initiative triple-slider pattern.
 */
function HeroCarousel({
  slides,
  loading,
}: {
  slides: HeroSlide[];
  loading: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const touchStartRef = useRef<{ x: number } | null>(null);
  const total = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIdx(((next % total) + total) % total);
      setProgress(0);
    },
    [total],
  );
  const next = useCallback(() => goTo(idx + 1), [goTo, idx]);
  const prev = useCallback(() => goTo(idx - 1), [goTo, idx]);

  // Progress-driven autoplay
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);
  useEffect(() => {
    if (!playing || total <= 1) return;
    const step = 100 / (AUTOPLAY_MS / 50);
    const interval = setInterval(() => {
      setProgress((p) => {
        const np = p + step;
        if (np >= 100) {
          nextRef.current();
          return 0;
        }
        return np;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing, total, idx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (loading && slides.length === 0) {
    return (
      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-[var(--t-card-bg)] animate-pulse" />
    );
  }
  if (slides.length === 0) {
    return (
      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-elevated/20 flex items-center justify-center">
        <p className="text-text-ghost text-[13px] tracking-wide">
          The home page is being prepared…
        </p>
      </div>
    );
  }

  // Signed offset of each slide relative to the active one, wrapped into
  // [-floor(total/2), floor(total/2)]. For total=5: offsets are -2,-1,0,1,2.
  const signedOffset = (i: number) => {
    const raw = i - idx;
    if (raw > total / 2) return raw - total;
    if (raw < -total / 2) return raw + total;
    return raw;
  };

  return (
    <div className="relative">
      {/* Stage — perspective gives the side-tilt a real 3D feel */}
      <div
        className="relative h-[52vh] md:h-[60vh] max-h-[640px] w-full overflow-visible flex items-center justify-center"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 50%" }}
        onMouseEnter={() => setPlaying(false)}
        onMouseLeave={() => setPlaying(true)}
        onTouchStart={(e) => {
          touchStartRef.current = { x: e.touches[0].clientX };
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          if (Math.abs(dx) > 60) {
            if (dx < 0) next();
            else prev();
          }
        }}
      >
        {slides.map((s, i) => {
          const off = signedOffset(i);
          const isMain = off === 0;
          const isPeek = off === -1 || off === 1;
          const visible = off >= -1 && off <= 1;

          // Transform math: main slide centered, peeks tucked further behind
          const translateX = off === 0 ? "0%" : off < 0 ? "-48%" : "48%";
          const rotateY = off === 0 ? 0 : off < 0 ? 24 : -24;
          const scale = off === 0 ? 1 : 0.7;
          const opacity = off === 0 ? 1 : visible ? 0.65 : 0;
          const zIndex = off === 0 ? 30 : visible ? 20 : 10;

          return (
            <motion.div
              key={s.id}
              className="absolute top-0 left-1/2 h-full w-[min(78vw,1100px)] -ml-[min(39vw,550px)]"
              initial={false}
              animate={{
                x: translateX,
                rotateY,
                scale,
                opacity,
                zIndex,
              }}
              transition={{
                duration: 0.9,
                ease: [0.23, 1, 0.32, 1],
              }}
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "50% 50%",
                pointerEvents: visible ? "auto" : "none",
              }}
            >
              <div
                className={`relative h-full w-full rounded-2xl overflow-hidden border ${
                  isMain
                    ? "border-gold/20 shadow-[var(--t-shadow-modal)]"
                    : "border-border shadow-[var(--t-shadow-elevated)]"
                } bg-[var(--t-card-bg-fallback)] cursor-${
                  isPeek ? "pointer" : "default"
                }`}
                onClick={() => {
                  if (off === -1) prev();
                  else if (off === 1) next();
                }}
              >
                {/* Cover */}
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverImageUrl}
                    alt={s.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
                )}

                {/* Dual gradient veil */}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil),var(--t-veil-40),transparent)] pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--t-veil-50),transparent,var(--t-veil-40))] pointer-events-none" />

                {/* Peek darken — pushed further into shadow */}
                {!isMain && (
                  <div className="absolute inset-0 bg-[var(--t-veil)] opacity-30 pointer-events-none" />
                )}

                {/* Main-slide content */}
                {isMain && (
                  <>
                    {/* Top-left: category + sponsored */}
                    <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase text-white/70">
                        {s.writingMode === "campaign"
                          ? "Adventure"
                          : s.format === "poetry"
                            ? "Poetry"
                            : s.format === "screenplay"
                              ? "Screenplay"
                              : "Novel"}
                      </span>
                      {s.sponsored && (
                        <span className="inline-flex items-center gap-1.5 bg-gold/15 backdrop-blur-md border border-gold/40 rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase text-gold">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
                          </svg>
                          Sponsored
                        </span>
                      )}
                    </div>

                    {/* Top-right: play/pause */}
                    {total > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaying((p) => !p);
                        }}
                        className="absolute top-5 right-5 z-10 size-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-gold hover:border-gold/40 transition-all"
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        {playing ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <rect
                              x="4"
                              y="3"
                              width="2.5"
                              height="10"
                              rx="0.5"
                            />
                            <rect
                              x="9.5"
                              y="3"
                              width="2.5"
                              height="10"
                              rx="0.5"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M4 3v10l9-5-9-5z" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Bottom content (animated in separately for parallax feel) */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`content-${s.id}`}
                        initial={{ opacity: 0, y: 20, x: 16 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: -10, x: -16 }}
                        transition={{
                          duration: 0.6,
                          delay: 0.2,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                        className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10"
                      >
                        <p className="text-white/50 text-[11px] tracking-[0.2em] uppercase mb-2">
                          by {s.authorName ?? "Unknown"}
                        </p>
                        <h1 className="font-display text-white text-2xl md:text-4xl lg:text-5xl leading-[1.05] mb-3 max-w-3xl">
                          {s.title}
                        </h1>
                        {s.synopsis && (
                          <p className="text-white/70 text-[13px] md:text-[15px] mb-5 max-w-2xl line-clamp-2 leading-relaxed">
                            {s.synopsis}
                          </p>
                        )}
                        <div className="flex items-center gap-4">
                          <Link
                            href={storyHref(s)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black font-body font-semibold text-[12px] tracking-wide hover:bg-gold-light transition-all shadow-[var(--t-shadow-card-hover)]"
                          >
                            {primaryAction(s)}
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 8h10M9 4l4 4-4 4" />
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Progress bar along the bottom of the main slide */}
                    {total > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/40 z-20">
                        <div
                          className="h-full bg-gradient-to-r from-gold/60 via-gold to-gold/60 transition-none"
                          style={{ width: `${playing ? progress : 0}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dot indicators beneath the stage */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {slides.map((s, i) => (
            <button
              key={`dot-${s.id}`}
              onClick={() => goTo(i)}
              className={`transition-all ${
                i === idx
                  ? "w-8 h-1 rounded-full bg-gold"
                  : "w-1.5 h-1.5 rounded-full bg-text-ghost/30 hover:bg-text-ghost/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic horizontal row ────────────────────────────────────

interface RowCard {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  cover: string | null;
  tag: string | null;
}

function Row({
  label,
  hint,
  cards,
  loading,
}: {
  label: string;
  hint?: string;
  cards: RowCard[];
  loading?: boolean;
}) {
  if (!loading && cards.length === 0) return null;
  return (
    <RevealSection className="my-14">
      <motion.div variants={revealChild} className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="font-display text-paper text-2xl md:text-3xl tracking-tight">
            {label}
          </h2>
          {hint && (
            <p className="text-text-ghost text-[12px] mt-1">{hint}</p>
          )}
        </div>
      </motion.div>
      <div className="flex gap-5 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory scrollbar-none">
        {(loading && cards.length === 0
          ? Array.from({ length: 6 }).map((_, i) => ({
              id: `skel-${i}`,
              href: "#",
              title: "",
              subtitle: "",
              cover: null,
              tag: null,
            }))
          : cards
        ).map((c) => (
          <motion.div key={c.id} variants={revealChild} className="flex-shrink-0 w-56 snap-start">
          <Link
            href={c.href}
            className="group block"
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border group-hover:border-gold/40 transition-all bg-[var(--t-card-bg)]">
              {c.cover ? (
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-[1.03] transition-transform duration-700"
                  style={{ backgroundImage: `url(${c.cover})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--t-card-bg-fallback)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-veil-90),transparent,transparent)]" />
              {c.tag && (
                <span
                  className={`absolute top-2 right-2 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full backdrop-blur ${
                    c.tag === "Sponsored"
                      ? "bg-black/50 text-gold/80 border border-gold/30"
                      : "bg-black/50 text-white/60 border border-white/10"
                  }`}
                >
                  {c.tag}
                </span>
              )}
            </div>
            <h3 className="font-display text-paper text-[14px] mt-3 truncate group-hover:text-gold transition-colors">
              {c.title || "\u00a0"}
            </h3>
            <p className="text-text-ghost text-[11px] truncate">
              {c.subtitle || "\u00a0"}
            </p>
          </Link>
          </motion.div>
        ))}
      </div>
    </RevealSection>
  );
}
