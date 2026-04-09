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

interface HeroSlide extends StoryCard {
  sponsored: boolean;
  boostId: string | null;
  boostExpiresAt: string | null;
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

interface HomeData {
  hero: HeroSlide[];
  sponsored: StoryCard[];
  trending: StoryCard[];
  adventures: AdventureRow[];
  jams: JamRow[];
  following: StoryCard[];
  staffPicks: StaffPickRow[];
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

function formatRemaining(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "closing now";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "<1h left";
  if (hours < 48) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
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
          {/* Hero carousel — inset, 21:9, modern */}
          <HeroCarousel slides={data?.hero ?? []} loading={loading} />
          {/* Sponsored strip */}
          {data && data.sponsored.length > 0 && (
            <Row
              label="Sponsored"
              subtle
              sponsored
              cards={data.sponsored.map((s) => ({
                id: s.id,
                href: storyHref(s),
                title: s.title,
                subtitle: s.authorName ?? "",
                cover: s.coverImageUrl,
                tag: "Sponsored",
              }))}
            />
          )}

          {/* Trending */}
          <Row
            label="Trending this week"
            hint="What readers are sparking right now"
            loading={loading}
            cards={
              data?.trending.map((s) => ({
                id: s.id,
                href: storyHref(s),
                title: s.title,
                subtitle: s.authorName ?? "",
                cover: s.coverImageUrl,
                tag:
                  s.writingMode === "campaign"
                    ? "Adventure"
                    : s.format === "poetry"
                      ? "Poetry"
                      : s.format === "screenplay"
                        ? "Screenplay"
                        : null,
              })) ?? []
            }
          />

          {/* Adventures */}
          {data && data.adventures.length > 0 && (
            <Row
              label="Adventures looking for players"
              hint="Active campaign sessions with open seats"
              cards={data.adventures.map((a) => ({
                id: a.sessionId,
                href: `/story/${a.storySlug ?? a.storyId}`,
                title: a.sessionTitle,
                subtitle: `${a.storyTitle} · ${a.playerCount} at the table`,
                cover: a.coverImageUrl,
                tag: "Adventure",
              }))}
            />
          )}

          {/* Jams */}
          {data && data.jams.length > 0 && (
            <Row
              label="Jams closing soon"
              hint="Short-form prompts with a deadline"
              cards={data.jams.map((j) => ({
                id: j.id,
                href: `/jams/${j.id}`,
                title: j.title,
                subtitle: j.theme,
                cover: j.bannerUrl,
                tag: formatRemaining(
                  j.status === "voting" ? j.votingEndsAt : j.submissionEndsAt,
                ),
              }))}
            />
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
                tag: null,
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
      </div>
    </main>
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
