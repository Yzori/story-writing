"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GENRES } from "@/config/genres";
import { formatReadTime } from "@/lib/format";
import type { ApiStory } from "@/types/api";

type BoostedStory = ApiStory & { boostExpiresAt?: string };

const QUICK_FILTERS = ["For You", "Rising", "Complete", "Short Reads", "Adventures", "New"];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "most-sparked", label: "Most Sparked" },
  { value: "latest", label: "Newest" },
];

const FORMAT_OPTIONS = [
  { value: "All", label: "All" },
  { value: "novel", label: "Novel" },
  { value: "serial", label: "Serial" },
  { value: "poetry", label: "Poetry" },
  { value: "screenplay", label: "Script" },
  { value: "webtoon", label: "Webtoon" },
  { value: "illustrated", label: "Illustrated" },
  { value: "campaign", label: "Adventure" },
];

const RATING_LEVELS: Record<string, number> = {
  everyone: 0,
  teen: 1,
  mature: 2,
  explicit: 3,
};

const RATING_LABELS: Record<string, string> = {
  everyone: "All Ages",
  teen: "Teen+",
  mature: "Mature",
  explicit: "Explicit",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  "in-progress": "Ongoing",
  "on-hiatus": "On Hiatus",
  complete: "Complete",
  published: "Published",
};

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="6" cy="4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M5 4c3-1 6-1 11 1v22c-5-2-8-2-11-1V4z" />
      <path d="M16 5c5-2 8-2 11-1v22c-3-1-6-1-11 1V5z" />
    </svg>
  );
}

function storyHref(story: ApiStory) {
  return `/story/${story.slug || story.id}`;
}

function storyFormat(story: ApiStory) {
  if (story.writingMode === "campaign") return "Adventure";
  if (!story.format) return "Novel";
  return FORMAT_OPTIONS.find((option) => option.value === story.format)?.label || story.format;
}

function storyStatus(story: ApiStory) {
  return STATUS_LABELS[story.status] || story.status || "Ongoing";
}

function storyHook(story: ApiStory) {
  return story.hook?.trim() || story.synopsis?.trim() || "A new story waiting on the shelves.";
}

function matchesFormat(story: ApiStory, format: string) {
  if (format === "All") return true;
  if (format === "campaign") return story.writingMode === "campaign";
  return story.format === format && story.writingMode !== "campaign";
}

function matchesQuickFilter(story: ApiStory, filter: string) {
  if (filter === "For You") return true;
  if (filter === "Rising") return story.sparkCount >= 25;
  if (filter === "Complete") return story.status === "complete";
  if (filter === "Short Reads") return (story.totalWords || 0) > 0 && story.totalWords < 10_000;
  if (filter === "Adventures") return story.writingMode === "campaign";
  if (filter === "New") {
    const createdAt = new Date(story.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 21;
  }
  return true;
}

function passesRating(story: ApiStory, maxRating: string) {
  if (maxRating === "all") return true;
  const maxLevel = RATING_LEVELS[maxRating];
  const storyLevel = RATING_LEVELS[story.contentRating] ?? 0;
  return storyLevel <= maxLevel;
}

function ShelfHeader({ label, action }: { label: string; action?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Curated Shelf</p>
        <h2 className="font-display text-[22px] text-paper leading-tight">{label}</h2>
      </div>
      {action && (
        <Link href="/pricing" className="text-[12px] text-amber hover:text-paper transition-colors">
          {action}
        </Link>
      )}
    </div>
  );
}

function CoverArt({
  story,
  sizes,
  className,
  fallbackClassName = "",
}: {
  story: ApiStory;
  sizes: string;
  className: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!story.coverImageUrl || failed) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-elevated via-surface to-void ${fallbackClassName}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(198,154,71,0.18),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="h-px w-8 bg-amber/35 mb-2" />
          <p className="font-display text-[13px] leading-tight text-paper/80 line-clamp-3">{story.title}</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={story.coverImageUrl}
      alt=""
      fill
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

function StoryListCard({ story, sponsored = false, compact = false }: { story: ApiStory; sponsored?: boolean; compact?: boolean }) {
  return (
    <Link href={storyHref(story)} className="block">
      <article className="group bg-surface/70 border border-border rounded-lg overflow-hidden hover:border-amber/25 hover:bg-elevated/70 transition-all">
        <div className="flex gap-4 p-3">
          <div className={`${compact ? "w-16" : "w-20"} aspect-[2/3] rounded-md overflow-hidden bg-elevated flex-shrink-0 relative`}>
            <CoverArt
              story={story}
              sizes={compact ? "64px" : "80px"}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {sponsored && (
                <span className="px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-[10px] font-medium uppercase tracking-[0.1em]">
                  Sponsored
                </span>
              )}
              <span className="text-[10px] uppercase tracking-[0.1em] text-text-ghost">{storyFormat(story)}</span>
              {story.contentRating && (
                <span className="text-[10px] uppercase tracking-[0.1em] text-text-ghost">
                  {RATING_LABELS[story.contentRating] || story.contentRating}
                </span>
              )}
            </div>

            <h3 className="font-display text-[17px] text-paper leading-snug group-hover:text-amber transition-colors">
              {story.title}
            </h3>
            <p className="text-[12px] text-text-secondary mt-0.5">by {story.authorName || "Anonymous"}</p>

            {!compact && (
              <p className="text-[13px] text-text-secondary leading-relaxed mt-2 line-clamp-2">
                {storyHook(story)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-[11px] text-text-tertiary">
              <span className="text-text-secondary">{story.genres[0] || "Story"}</span>
              <span className="text-text-ghost">·</span>
              <span>{storyStatus(story)}</span>
              {story.totalWords > 0 && (
                <>
                  <span className="text-text-ghost">·</span>
                  <span>{formatReadTime(story.totalWords)}</span>
                </>
              )}
              {story.chapterCount > 0 && (
                <>
                  <span className="text-text-ghost">·</span>
                  <span>{story.chapterCount} ch</span>
                </>
              )}
              <span className="text-text-ghost">·</span>
              <span className="inline-flex items-center gap-1 text-amber/80"><SparkIcon />{story.sparkCount || 0}</span>
            </div>

            {sponsored && (
              <p className="mt-2 text-[11px] text-text-ghost">Promoted placement</p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function SponsoredHero({ story }: { story: ApiStory }) {
  return (
    <Link href={storyHref(story)} className="block group">
      <article className="relative min-h-[310px] overflow-hidden rounded-lg border border-amber/20 bg-surface">
        <CoverArt
          story={story}
          sizes="(min-width: 1280px) 760px, 100vw"
          className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
          fallbackClassName="opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-void/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[310px] max-w-2xl flex-col justify-end p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber text-void text-[10px] font-semibold uppercase tracking-[0.12em]">
              Sponsored
            </span>
            <span className="px-2.5 py-1 rounded-full bg-void/70 border border-border text-text-secondary text-[10px] uppercase tracking-[0.12em]">
              Top Placement
            </span>
          </div>
          <h2 className="font-display text-[34px] sm:text-[42px] leading-[1.02] text-paper max-w-xl">
            {story.title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-xl">
            {storyHook(story)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-text-secondary">
            <span>by {story.authorName || "Anonymous"}</span>
            <span className="text-text-ghost">·</span>
            <span>{story.genres[0] || storyFormat(story)}</span>
            {story.totalWords > 0 && (
              <>
                <span className="text-text-ghost">·</span>
                <span>{formatReadTime(story.totalWords)}</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 text-amber"><SparkIcon />{story.sparkCount || 0}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface/70 border border-border rounded-lg overflow-hidden animate-pulse">
      <div className="flex gap-4 p-3">
        <div className="w-20 aspect-[2/3] rounded-md bg-elevated" />
        <div className="flex-1 py-1 space-y-3">
          <div className="h-3 w-24 rounded bg-elevated" />
          <div className="h-5 w-2/3 rounded bg-elevated" />
          <div className="h-3 w-1/3 rounded bg-elevated" />
          <div className="h-3 w-full rounded bg-elevated" />
          <div className="h-3 w-3/4 rounded bg-elevated" />
        </div>
      </div>
    </div>
  );
}

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Opening browse...</p>
        </div>
      </div>
    }>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") || "");
  const [quickFilter, setQuickFilter] = useState("For You");
  const [genre, setGenre] = useState("All");
  const [format, setFormat] = useState("All");
  const [maxRating, setMaxRating] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [boostedStories, setBoostedStories] = useState<BoostedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem("quiloria-comfort-rating");
    if (saved) setMaxRating(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("quiloria-comfort-rating", maxRating);
  }, [maxRating]);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  useEffect(() => {
    async function fetchStories() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ public: "true", limit: "60" });
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        if (sort === "most-sparked") params.set("sort", "most-sparked");
        if (sort === "latest") params.set("sort", "latest");
        const res = await fetch(`/api/stories?${params}`);
        const json = await res.json();
        if (res.ok) {
          setStories(json.data?.stories || []);
        }
      } catch {
        setStories([]);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [debouncedQuery, sort]);

  useEffect(() => {
    async function fetchBoosts() {
      try {
        const res = await fetch("/api/boosts");
        if (!res.ok) return;
        const json = await res.json();
        setBoostedStories(
          (json.data || []).map((boost: Record<string, unknown>) => ({
            id: String(boost.storyId || boost.id || ""),
            title: String(boost.title || "Untitled"),
            slug: typeof boost.slug === "string" ? boost.slug : null,
            synopsis: typeof boost.synopsis === "string" ? boost.synopsis : null,
            hook: typeof boost.hook === "string" ? boost.hook : null,
            coverImageUrl: typeof boost.coverImageUrl === "string" ? boost.coverImageUrl : null,
            genres: Array.isArray(boost.genres) ? boost.genres as string[] : [],
            format: typeof boost.format === "string" ? boost.format : "novel",
            writingMode: typeof boost.writingMode === "string" ? boost.writingMode : undefined,
            contentRating: typeof boost.contentRating === "string" ? boost.contentRating : "everyone",
            status: typeof boost.status === "string" ? boost.status : "in-progress",
            createdAt: typeof boost.createdAt === "string" ? boost.createdAt : new Date().toISOString(),
            updatedAt: typeof boost.updatedAt === "string" ? boost.updatedAt : new Date().toISOString(),
            authorName: typeof boost.authorName === "string" ? boost.authorName : null,
            chapterCount: typeof boost.chapterCount === "number" ? boost.chapterCount : 0,
            totalWords: typeof boost.totalWords === "number" ? boost.totalWords : 0,
            sparkCount: typeof boost.sparkCount === "number" ? boost.sparkCount : 0,
            boostExpiresAt: typeof boost.boostExpiresAt === "string" ? boost.boostExpiresAt : undefined,
          }))
        );
      } catch {
        setBoostedStories([]);
      }
    }
    fetchBoosts();
  }, []);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((story) => {
      story.genres.forEach((storyGenre) => {
        counts[storyGenre] = (counts[storyGenre] || 0) + 1;
      });
    });
    return counts;
  }, [stories]);

  const visibleGenres = useMemo(() => {
    const populated = GENRES.filter((item) => (genreCounts[item] || 0) > 0);
    return ["All", ...populated.slice(0, 9)];
  }, [genreCounts]);

  const filteredStories = useMemo(() => {
    const base = stories.filter((story) => {
      if (genre !== "All" && !story.genres.includes(genre)) return false;
      if (!matchesFormat(story, format)) return false;
      if (!matchesQuickFilter(story, quickFilter)) return false;
      if (!passesRating(story, maxRating)) return false;
      return true;
    });

    if (sort === "most-sparked") return [...base].sort((a, b) => b.sparkCount - a.sparkCount);
    if (sort === "latest") return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return base;
  }, [format, genre, maxRating, quickFilter, sort, stories]);

  const sponsoredStories = useMemo(() => {
    return boostedStories
      .filter((story) => {
        if (genre !== "All" && !story.genres.includes(genre)) return false;
        if (!matchesFormat(story, format)) return false;
        if (!matchesQuickFilter(story, quickFilter)) return false;
        if (!passesRating(story, maxRating)) return false;
        return true;
      })
      .slice(0, 2);
  }, [boostedStories, format, genre, maxRating, quickFilter]);

  const sponsoredIds = new Set(sponsoredStories.map((story) => story.id));
  const organicStories = filteredStories.filter((story) => !sponsoredIds.has(story.id));
  const hasActiveDiscovery = !debouncedQuery && genre === "All" && format === "All" && quickFilter === "For You";
  const risingStories = organicStories.filter((story) => story.sparkCount > 0).sort((a, b) => b.sparkCount - a.sparkCount).slice(0, 4);
  const shownResultStories = hasActiveDiscovery ? organicStories.slice(0, 12) : organicStories;

  function resetFilters() {
    setGenre("All");
    setFormat("All");
    setQuickFilter("For You");
    setMaxRating("all");
  }

  return (
    <main className="min-h-screen bg-void text-text pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-6 pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-2">Reader Marketplace</p>
              <h1 className="font-display text-[34px] sm:text-[44px] leading-tight text-paper">Browse Stories</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
                Find your next read from featured launches, curated shelves, and the full public catalogue.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface/70 p-5 w-full lg:w-[360px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Featured Reads</p>
              <h2 className="font-display text-[22px] leading-tight text-paper">Promoted stories, clearly labeled</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                Sponsored launches can appear above organic shelves, but reader filters and comfort ratings still apply.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber/20 bg-amber/[0.06] px-3 py-1.5 text-[11px] text-amber">
                  Sponsored label
                </span>
                <span className="rounded-full border border-border bg-elevated px-3 py-1.5 text-[11px] text-text-secondary">
                  Filter-safe placement
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="sticky top-14 z-30 -mx-4 mb-7 border-y border-border bg-void/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"><SearchIcon /></div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories, authors, worlds..."
                className="w-full rounded-lg border border-border bg-surface px-9 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setQuickFilter(filter)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[12px] transition-all ${
                    quickFilter === filter
                      ? "border-amber/30 bg-amber/[0.06] text-amber"
                      : "border-border bg-surface text-text-secondary hover:text-paper"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary hover:text-paper transition-colors lg:hidden"
            >
              <SlidersIcon />
              Filters
            </button>
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${showFilters ? "block" : "hidden"} h-fit rounded-lg border border-border bg-surface/70 p-4 lg:sticky lg:top-32 lg:block`}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-[17px] text-paper">Filters</h2>
              <button className="text-[12px] text-amber hover:text-paper transition-colors" onClick={resetFilters}>
                Reset
              </button>
            </div>

            <div className="mt-5 space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Genre</label>
                <div className="space-y-1">
                  {visibleGenres.map((item) => (
                    <button
                      key={item}
                      onClick={() => setGenre(item)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] transition-colors ${
                        genre === item ? "bg-amber/[0.06] text-amber" : "text-text-secondary hover:bg-elevated hover:text-paper"
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[10px] text-text-ghost">{item === "All" ? stories.length : genreCounts[item] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value)}
                      className={`rounded-lg border px-2 py-2 text-[12px] transition-all ${
                        format === option.value
                          ? "border-amber/30 bg-amber/[0.06] text-amber"
                          : "border-border text-text-secondary hover:text-paper"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Comfort Rating</label>
                <select
                  value={maxRating}
                  onChange={(event) => setMaxRating(event.target.value)}
                  className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[12px] text-text-secondary outline-none focus:border-amber/30"
                >
                  <option value="all">All Ratings</option>
                  <option value="everyone">All Ages</option>
                  <option value="teen">Teen & Below</option>
                  <option value="mature">Mature & Below</option>
                  <option value="explicit">Include Explicit</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Placement Rules</label>
                <div className="rounded-lg bg-elevated p-3 text-[12px] leading-relaxed text-text-secondary">
                  Sponsored cards are labeled, capped at two top spots, and hidden when they do not match reader filters.
                </div>
              </div>
            </div>
          </motion.aside>

          <div className="min-w-0 space-y-8">
            {hasActiveDiscovery && sponsoredStories.length > 0 && (
              <section className="space-y-4">
                <ShelfHeader label="Sponsored Openings" action="Advertise here" />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)]">
                  <SponsoredHero story={sponsoredStories[0]} />
                  <div className="space-y-3">
                    {sponsoredStories.slice(1).map((story) => (
                      <StoryListCard key={story.id} story={story} sponsored compact />
                    ))}
                    <div className="rounded-lg border border-dashed border-border bg-surface/40 p-4">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Available Slot</p>
                      <p className="font-display text-[17px] text-paper">Promoted shelf card</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                        Reserve for launches, paid boosts, publisher campaigns, or creator self-promotion.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {hasActiveDiscovery && risingStories.length > 0 && (
              <section className="space-y-4">
                <ShelfHeader label="Rising Without Promotion" action="See all" />
                <div className="grid gap-3 md:grid-cols-2">
                  {risingStories.map((story) => (
                    <StoryListCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Results</p>
                  <h2 className="font-display text-[22px] text-paper">
                    {loading ? "Loading stories" : `${organicStories.length} matching ${organicStories.length === 1 ? "story" : "stories"}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSort(option.value)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] transition-all ${
                        sort === option.value ? "bg-elevated text-paper" : "text-text-ghost hover:text-text-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonCard key={index} />
                  ))}
                </div>
              ) : shownResultStories.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {shownResultStories.map((story) => (
                    <StoryListCard key={story.id} story={story} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface/50 px-6 py-20 text-center">
                  <div className="text-text-ghost mb-5"><BookIcon /></div>
                  <h3 className="font-display text-lg text-paper mb-2">No stories match these filters</h3>
                  <p className="text-text-secondary text-[13px] max-w-sm leading-relaxed">
                    Try a broader genre, clear the search, or loosen the comfort rating.
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      resetFilters();
                    }}
                    className="mt-5 rounded-lg border border-amber/30 bg-amber/[0.06] px-4 py-2 text-[13px] text-amber hover:text-paper transition-colors"
                  >
                    Clear search and filters
                  </button>
                </div>
              )}

              {!loading && sponsoredStories.length > 0 && (
                <div className="rounded-lg border border-border bg-surface/50 p-4 text-[12px] leading-relaxed text-text-secondary">
                  Organic ranking starts after the sponsored cap. Paid cards are visually labeled and included only when they match the reader&apos;s active filters.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
