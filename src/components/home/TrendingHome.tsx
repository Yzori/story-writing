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
  kind: "chapter" | "gift" | "follow" | "join" | "jam";
  at: string;
  text: string;
  href: string;
  actor: string | null;
  amount?: number;
}

interface PulseCounts {
  liveSessions: number;
  openJams: number;
  weeklyStories: number;
  online: number;
}

interface HomeData {
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
    fetch("/api/home")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setData(json?.data ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero triple slider */}
          <HeroCarousel slides={data?.hero ?? []} loading={loading} />
        </div>

        {/* Live activity ticker — the platform's pulse */}
        {data && data.activity.length > 0 && (
          <ActivityTicker events={data.activity} />
        )}

        <div className="max-w-7xl mx-auto px-6">
          {/* Live adventures — the best section */}
          {data && data.liveAdventures.length > 0 && (
            <LiveAdventuresSection sessions={data.liveAdventures} />
          )}

          {/* Trending this week with hero-of-row */}
          {data && data.trending.length > 0 && (
            <TrendingSection items={data.trending} />
          )}
        </div>

        {/* Sponsored strip — dark inset band, set apart from organic rows */}
        {data && data.sponsored.length > 0 && (
          <SponsoredSection items={data.sponsored} />
        )}

        <div className="max-w-7xl mx-auto px-6">
          {/* Adventures looking for players (call-to-play) */}
          {data && data.adventures.length > 0 && (
            <AdventuresLookingSection items={data.adventures} />
          )}

          {/* Jams closing soon — with live countdown */}
          {data && data.jams.length > 0 && (
            <JamsSection items={data.jams} />
          )}

          {/* Following */}
          {data && data.following.length > 0 && (
            <Row
              label="New from authors you follow"
              cards={data.following.map((s) => ({
                id: s.id,
                href: storyHref(s),
                title: s.title,
                subtitle: s.authorName ?? "",
                cover: s.coverImageUrl,
                tag: "New",
              }))}
            />
          )}

          {/* Staff picks */}
          {data && data.staffPicks.length > 0 && (
            <Row
              label="Staff picks"
              hint="Hand-curated by the editors"
              cards={data.staffPicks.map((s) => ({
                id: s.id,
                href: storyHref(s),
                title: s.title,
                subtitle: s.authorName ?? "",
                cover: s.coverImageUrl,
                tag: "Staff pick",
              }))}
            />
          )}

          {/* Candlelit reader card */}
          <div className="my-16">
            <Link
              href="/read"
              className="group relative block overflow-hidden rounded-lg border border-gold/20 bg-gradient-to-br from-gold/5 via-void to-copper/5 p-10 md:p-14 transition-all hover:border-gold/40"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,150,60,0.08)_0%,transparent_60%)] pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-gold/70 text-[11px] tracking-[0.3em] uppercase mb-3">
                    A different way to read
                  </p>
                  <h2 className="font-display text-paper text-3xl md:text-4xl mb-2">
                    Enter the candlelit room
                  </h2>
                  <p className="text-text-secondary text-[14px] max-w-md">
                    No grids, no decisions. Open the reader and a story is
                    already waiting — picked for you, paced for you.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-gold font-display text-[14px] tracking-wide border border-gold/30 rounded-full px-6 py-2.5 group-hover:bg-gold/10 transition-all">
                  Open the reader
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Platform pulse ribbon at the very bottom */}
        {data && <PulseRibbon pulse={data.pulse} />}
      </div>
    </main>
  );
}

// ── Activity Ticker ───────────────────────────────────────────

function ActivityTicker({ events }: { events: ActivityEvent[] }) {
  // Duplicate the list for a seamless CSS marquee loop.
  const doubled = [...events, ...events];
  const iconFor = (kind: ActivityEvent["kind"]) => {
    switch (kind) {
      case "chapter":
        return (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/60">
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
  };

  return (
    <div className="relative w-full my-10 py-4 border-y border-border bg-gradient-to-r from-void via-elevated/30 to-void overflow-hidden">
      {/* Edge fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-void to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-void to-transparent z-10 pointer-events-none" />
      {/* Live dot label */}
      <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-void/90 backdrop-blur px-3 py-1 rounded-full border border-border">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose" />
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-text-secondary">
          Live
        </span>
      </div>
      {/* Scrolling strip */}
      <div
        className="flex items-center gap-10 whitespace-nowrap pl-32 md:pl-40"
        style={{
          animation: "ticker-scroll 90s linear infinite",
        }}
      >
        {doubled.map((e, i) => (
          <Link
            key={`${e.at}-${i}`}
            href={e.href}
            className="inline-flex items-center gap-2 text-[12px] text-text-secondary hover:text-paper transition-colors flex-shrink-0"
          >
            {iconFor(e.kind)}
            <span>{e.text}</span>
            <span className="text-text-ghost text-[10px]">
              · {formatTimeAgo(e.at)}
            </span>
          </Link>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

// ── Live Adventures section ───────────────────────────────────

function LiveAdventuresSection({ sessions }: { sessions: LiveAdventure[] }) {
  const live = sessions.filter((s) => s.isLive);
  const recent = sessions.filter((s) => !s.isLive).slice(0, 3);
  return (
    <section className="my-16">
      <div className="flex items-baseline justify-between mb-6">
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...live, ...recent].slice(0, 3).map((s) => (
          <LiveAdventureTile key={s.sessionId} session={s} />
        ))}
      </div>
    </section>
  );
}

function LiveAdventureTile({ session: s }: { session: LiveAdventure }) {
  return (
    <Link
      href={`/story/${s.storySlug ?? s.storyId}`}
      className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-elevated/30 transition-all hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
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
          <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />

        {/* Live badge */}
        {s.isLive && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-rose/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] tracking-[0.2em] uppercase text-paper font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paper opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-paper" />
            </span>
            Live
          </div>
        )}

        {/* Spectator count */}
        {s.spectatorCount > 0 && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-void/70 backdrop-blur-sm border border-border px-2.5 py-1 rounded-full text-[10px] text-text-secondary">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
            {s.spectatorCount} watching
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <p className="text-text-ghost text-[10px] tracking-[0.2em] uppercase mb-1">
            {s.storyTitle}
          </p>
          <h3 className="font-display text-paper text-lg md:text-xl leading-tight group-hover:text-gold transition-colors">
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

// ── Trending section with hero-of-row ─────────────────────────

function TrendingSection({ items }: { items: TrendingCard[] }) {
  if (items.length === 0) return null;
  const hero = items[0];
  const rest = items.slice(1, 9);
  return (
    <section className="my-16">
      <div className="mb-6">
        <h2 className="font-display text-paper text-2xl md:text-3xl tracking-tight">
          Trending this week
        </h2>
        <p className="text-text-ghost text-[12px] mt-1">
          What readers are sparking right now
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Hero-of-row: large card spanning 2 columns */}
        <Link
          href={storyHref(hero)}
          className="group md:col-span-2 md:row-span-2 relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-elevated/30 transition-all"
        >
          <div className="relative aspect-[16/10] md:aspect-auto md:h-full min-h-[320px]">
            {hero.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.coverImageUrl}
                alt={hero.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-void/60 via-transparent to-transparent" />

            {/* Rank */}
            <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-gold/15 backdrop-blur-sm border border-gold/40 px-3 py-1 rounded-full text-[10px] tracking-[0.2em] uppercase text-gold">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
              </svg>
              #1 Rising
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-text-ghost text-[10px] tracking-[0.2em] uppercase mb-2">
                by {hero.authorName ?? "Unknown"}
              </p>
              <h3 className="font-display text-paper text-2xl md:text-3xl mb-3 group-hover:text-gold transition-colors leading-tight">
                {hero.title}
              </h3>
              {hero.synopsis && (
                <p className="text-text-secondary text-[13px] line-clamp-2 max-w-md mb-4">
                  {hero.synopsis}
                </p>
              )}
              {formatInteractions(hero.weeklyInteractions) && (
                <p className="text-gold/70 text-[11px] tracking-wide">
                  {formatInteractions(hero.weeklyInteractions)} this week
                </p>
              )}
            </div>
          </div>
        </Link>

        {/* Rest of the row */}
        {rest.slice(0, 4).map((s) => (
          <TrendingCardTile key={s.id} item={s} />
        ))}
      </div>
      {/* Secondary row */}
      {rest.length > 4 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
          {rest.slice(4, 8).map((s) => (
            <TrendingCardTile key={s.id} item={s} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function TrendingCardTile({
  item: s,
  compact = false,
}: {
  item: TrendingCard;
  compact?: boolean;
}) {
  const interactions = formatInteractions(s.weeklyInteractions);
  return (
    <Link
      href={storyHref(s)}
      className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-elevated/30 transition-all"
    >
      <div className={`relative ${compact ? "aspect-[2/3]" : "aspect-[3/4]"}`}>
        {s.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.coverImageUrl}
            alt={s.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />

        {s.writingMode === "campaign" && (
          <div className="absolute top-2.5 right-2.5 bg-sage/20 backdrop-blur border border-sage/40 text-sage text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            Adventure
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-text-ghost text-[10px] tracking-wide mb-1 truncate">
            by {s.authorName ?? "Unknown"}
          </p>
          <h3 className="font-display text-paper text-[15px] leading-tight group-hover:text-gold transition-colors line-clamp-2">
            {s.title}
          </h3>
          {interactions && (
            <p className="text-gold/60 text-[10px] tracking-wide mt-2">
              {interactions}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Sponsored Section (inset dark band) ───────────────────────

function SponsoredSection({ items }: { items: StoryCard[] }) {
  return (
    <section className="my-16 py-10 border-y border-border bg-gradient-to-b from-void via-elevated/20 to-void">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-gold/70">
                <path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" />
              </svg>
              <h2 className="font-display text-text-secondary text-lg tracking-tight">
                Sponsored
              </h2>
            </div>
            <p className="text-text-ghost text-[11px]">
              Creators paid to be here. Quiloria stays honest about it.
            </p>
          </div>
          <Link
            href="/creator/boost"
            className="text-gold/70 hover:text-gold text-[11px] tracking-wide transition-colors"
          >
            Boost your work →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.slice(0, 6).map((s) => (
            <Link
              key={s.id}
              href={storyHref(s)}
              className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-void transition-all"
            >
              <div className="relative aspect-[16/9]">
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverImageUrl}
                    alt={s.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
                <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-gold/15 backdrop-blur border border-gold/40 text-gold text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
                  Sponsored
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-text-ghost text-[10px] tracking-wide mb-1 truncate">
                    by {s.authorName ?? "Unknown"}
                  </p>
                  <h3 className="font-display text-paper text-[16px] leading-tight group-hover:text-gold transition-colors line-clamp-1">
                    {s.title}
                  </h3>
                  {s.synopsis && (
                    <p className="text-text-secondary text-[11px] mt-1 line-clamp-1">
                      {s.synopsis}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Adventures looking for players (call-to-play) ─────────────

function AdventuresLookingSection({ items }: { items: AdventureRow[] }) {
  return (
    <section className="my-16">
      <div className="mb-6">
        <h2 className="font-display text-paper text-2xl tracking-tight">
          Adventures looking for players
        </h2>
        <p className="text-text-ghost text-[12px] mt-1">
          Active campaign sessions with open seats
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.slice(0, 8).map((a) => {
          const maxSeats = 6;
          const filled = Number(a.playerCount);
          const openSeats = Math.max(0, maxSeats - filled);
          const urgent = openSeats === 1;
          return (
            <Link
              key={a.sessionId}
              href={`/story/${a.storySlug ?? a.storyId}`}
              className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-elevated/30 transition-all"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
              </div>
              <div className="p-4">
                <p className="text-text-ghost text-[10px] tracking-wide uppercase mb-1 truncate">
                  {a.storyTitle}
                </p>
                <h3 className="font-display text-paper text-[15px] leading-tight group-hover:text-gold transition-colors line-clamp-2 mb-3">
                  {a.sessionTitle}
                </h3>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-text-secondary">
                    {filled} / {maxSeats} at the table
                  </span>
                  <span
                    className={urgent ? "text-rose" : "text-text-ghost"}
                  >
                    {openSeats > 0 ? `${openSeats} open` : "full"}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      urgent ? "bg-rose" : "bg-gold/60"
                    }`}
                    style={{
                      width: `${Math.min(100, (filled / maxSeats) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
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
    <section className="my-16">
      <div className="mb-6">
        <h2 className="font-display text-paper text-2xl tracking-tight">
          Jams closing soon
        </h2>
        <p className="text-text-ghost text-[12px] mt-1">
          Short-form prompts with a deadline
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((j) => {
          const target =
            j.status === "voting" ? j.votingEndsAt : j.submissionEndsAt;
          const phase = j.status === "voting" ? "Voting ends" : "Submissions end";
          return (
            <Link
              key={j.id}
              href={`/jams/${j.id}`}
              className="group relative block overflow-hidden rounded-xl border border-border hover:border-gold/40 bg-elevated/30 transition-all"
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
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
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
          );
        })}
      </div>
    </section>
  );
}

// ── Platform pulse ribbon ─────────────────────────────────────

function PulseRibbon({ pulse }: { pulse: PulseCounts }) {
  return (
    <div className="border-t border-border bg-gradient-to-b from-void to-ink py-8">
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
      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-elevated/20 animate-pulse" />
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
          const opacity = off === 0 ? 1 : visible ? 0.35 : 0;
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
                    ? "border-gold/20 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(200,150,60,0.1)]"
                    : "border-border shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                } bg-gradient-to-br from-elevated via-void to-ink cursor-${
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
                  <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
                )}

                {/* Dual gradient veil */}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-void/70 via-transparent to-void/40 pointer-events-none" />

                {/* Peek darken — pushed further into shadow */}
                {!isMain && (
                  <div className="absolute inset-0 bg-void/75 pointer-events-none" />
                )}

                {/* Main-slide content */}
                {isMain && (
                  <>
                    {/* Top-left: category + sponsored */}
                    <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-void/60 backdrop-blur-md border border-border rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase text-text-secondary">
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
                        className="absolute top-5 right-5 z-10 size-9 rounded-full bg-void/60 backdrop-blur-md border border-border flex items-center justify-center text-text-secondary hover:text-gold hover:border-gold/40 transition-all"
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
                        <p className="text-text-ghost text-[11px] tracking-[0.2em] uppercase mb-2">
                          by {s.authorName ?? "Unknown"}
                        </p>
                        <h1 className="font-display text-paper text-2xl md:text-4xl lg:text-5xl leading-[1.05] mb-3 max-w-3xl">
                          {s.title}
                        </h1>
                        {s.synopsis && (
                          <p className="text-text-secondary text-[13px] md:text-[15px] mb-5 max-w-2xl line-clamp-2 leading-relaxed">
                            {s.synopsis}
                          </p>
                        )}
                        <div className="flex items-center gap-4">
                          <Link
                            href={storyHref(s)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-void font-body font-semibold text-[12px] tracking-wide hover:bg-gold-light transition-all shadow-[0_0_20px_rgba(200,150,60,0.25)]"
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
                          <Link
                            href={storyHref(s)}
                            className="text-text-secondary hover:text-paper text-[12px] tracking-wide transition-colors hidden sm:inline"
                          >
                            Details
                          </Link>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Progress bar along the bottom of the main slide */}
                    {total > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-void/60 z-20">
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
  sponsored,
  subtle,
}: {
  label: string;
  hint?: string;
  cards: RowCard[];
  loading?: boolean;
  sponsored?: boolean;
  subtle?: boolean;
}) {
  if (!loading && cards.length === 0) return null;
  return (
    <section className="my-14">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2
            className={`font-display tracking-tight ${
              subtle ? "text-text-secondary text-lg" : "text-paper text-2xl"
            }`}
          >
            {label}
          </h2>
          {hint && (
            <p className="text-text-ghost text-[12px] mt-1">{hint}</p>
          )}
        </div>
      </div>
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
          <Link
            key={c.id}
            href={c.href}
            className="flex-shrink-0 w-48 group snap-start"
          >
            <div className="relative aspect-[2/3] rounded-sm overflow-hidden border border-border group-hover:border-gold/30 transition-all bg-elevated/40">
              {c.cover ? (
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-[1.03] transition-transform duration-700"
                  style={{ backgroundImage: `url(${c.cover})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-elevated to-ink" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-transparent to-transparent" />
              {c.tag && (
                <span
                  className={`absolute top-2 right-2 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full backdrop-blur ${
                    sponsored || c.tag === "Sponsored"
                      ? "bg-void/70 text-gold/80 border border-gold/30"
                      : "bg-void/60 text-text-secondary border border-border"
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
        ))}
      </div>
    </section>
  );
}
