"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GENRES } from "@/config/genres";
import StoryCard from "@/components/shared/StoryCard";
import BookCard from "@/components/shared/BookCard";
import GenrePill from "@/components/shared/GenrePill";
import type { ApiStory } from "@/types/api";


interface StaffPick extends ApiStory {
  pickId: string;
  curatorNote: string;
  pickedBy: string;
  pickedAt: string;
}

// ── Genre Wing data — accent colors & icons for the library wings ──
const GENRE_WINGS: Record<string, { accent: string; accentBg: string; accentBorder: string; accentGlow: string }> = {
  Fantasy: { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/30", accentGlow: "rgba(200,150,60,0.08)" },
  "Science Fiction": { accent: "text-lavender", accentBg: "bg-lavender", accentBorder: "border-lavender/30", accentGlow: "rgba(150,130,200,0.08)" },
  Romance: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,100,110,0.08)" },
  Mystery: { accent: "text-violet", accentBg: "bg-violet", accentBorder: "border-violet/30", accentGlow: "rgba(140,100,180,0.08)" },
  Thriller: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,100,110,0.08)" },
  Horror: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,80,90,0.08)" },
  Adventure: { accent: "text-teal", accentBg: "bg-teal", accentBorder: "border-teal/30", accentGlow: "rgba(80,160,150,0.08)" },
  "Dark Fantasy": { accent: "text-violet", accentBg: "bg-violet", accentBorder: "border-violet/30", accentGlow: "rgba(140,100,180,0.08)" },
  Cyberpunk: { accent: "text-lavender", accentBg: "bg-lavender", accentBorder: "border-lavender/30", accentGlow: "rgba(150,130,200,0.08)" },
  "Slice of Life": { accent: "text-sage", accentBg: "bg-sage", accentBorder: "border-sage/30", accentGlow: "rgba(120,160,100,0.08)" },
  Mythology: { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/30", accentGlow: "rgba(200,150,60,0.08)" },
  "Historical Fiction": { accent: "text-copper", accentBg: "bg-copper", accentBorder: "border-copper/30", accentGlow: "rgba(180,120,60,0.08)" },
};

const DEFAULT_WING = { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/20", accentGlow: "rgba(200,150,60,0.06)" };

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "most-sparked", label: "Most Sparked" },
  { value: "most-read", label: "Most Read" },
  { value: "rising", label: "Rising" },
];

const FORMAT_OPTIONS = [
  { value: "All", label: "All Formats", icon: null },
  { value: "novel", label: "Novels", icon: "M2 3l6 2.5L14 3v10l-6 2.5L2 13V3zM8 5.5V14" },
  { value: "webtoon", label: "Webtoons", icon: "M3 2h10v12H3zM5 5h6M5 8h6M5 11h3" },
  { value: "poetry", label: "Poetry", icon: "M4 2v12M8 4v8M12 3v10M6 14h4" },
  { value: "screenplay", label: "Scripts", icon: "M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zM5 5h6M5 7h4M5 9h5" },
  { value: "illustrated", label: "Illustrated", icon: "M2 3h12v10H2zM5 9l2-2 2 2 3-3M10 6a1 1 0 11-2 0 1 1 0 012 0z" },
  { value: "campaign", label: "Adventures", icon: "M8 2L3 5v6l5 3 5-3V5L8 2z" },
];

// ── Seeded random for stable hydration ──
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const DUST_SEED = seededRandom(314);
const DUST_MOTES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: DUST_SEED() * 100,
  startY: 20 + DUST_SEED() * 60,
  size: 1 + DUST_SEED() * 2.5,
  duration: 10 + DUST_SEED() * 15,
  delay: DUST_SEED() * 12,
  drift: (DUST_SEED() - 0.5) * 30,
  opacity: 0.1 + DUST_SEED() * 0.25,
}));

// ── Library dust particles ──
function LibraryDust() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {DUST_MOTES.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full bg-gold"
          style={{ width: m.size, height: m.size, left: `${m.x}%`, filter: m.size > 2.5 ? "blur(1px)" : "none" }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 30}vh`,
            x: [0, m.drift, 0],
            opacity: [0, m.opacity, 0],
          }}
          transition={{ duration: m.duration, repeat: Infinity, delay: m.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Entering the library...</p>
        </div>
      </div>
    }>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("latest");
  const [formatFilter, setFormatFilter] = useState("All");
  const [maxRating, setMaxRating] = useState<string>("all");
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffPicks, setStaffPicks] = useState<StaffPick[]>([]);
  const [campaignStories, setCampaignStories] = useState<ApiStory[]>([]);
  const [boostedStories, setBoostedStories] = useState<(ApiStory & { boostExpiresAt: string })[]>([]);
  const [activeJams, setActiveJams] = useState<{ id: string; title: string; theme: string; liveStatus: string; entryCount: number; submissionEndsAt: string; votingEndsAt: string }[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem("quiloria-comfort-rating");
    if (saved) setMaxRating(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("quiloria-comfort-rating", maxRating);
  }, [maxRating]);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchStories() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ public: "true", limit: "30" });
        if (debouncedQuery) params.set("search", debouncedQuery);
        if (sortBy !== "latest") params.set("sort", sortBy);
        const res = await fetch(`/api/stories?${params}`);
        const json = await res.json();
        if (res.ok) {
          setStories(json.data.stories || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [debouncedQuery, sortBy]);

  useEffect(() => {
    async function fetchStaffPicks() {
      try {
        const res = await fetch("/api/staff-picks");
        if (res.ok) {
          const json = await res.json();
          setStaffPicks(json.data || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchStaffPicks();
  }, []);

  useEffect(() => {
    async function fetchBoosts() {
      try {
        const res = await fetch("/api/boosts");
        if (res.ok) {
          const json = await res.json();
          setBoostedStories(
            (json.data || []).map((b: Record<string, unknown>) => ({
              id: b.storyId,
              title: b.title,
              slug: b.slug,
              synopsis: b.synopsis,
              coverImageUrl: b.coverImageUrl,
              genres: b.genres,
              format: b.format,
              writingMode: b.writingMode,
              contentRating: b.contentRating,
              authorName: b.authorName,
              chapterCount: b.chapterCount,
              sparkCount: b.sparkCount,
              totalWords: b.totalWords,
              boostExpiresAt: b.boostExpiresAt,
            }))
          );
        }
      } catch {
        // silently fail
      }
    }
    fetchBoosts();
  }, []);

  useEffect(() => {
    async function fetchActiveJams() {
      try {
        const res = await fetch("/api/jams?status=open");
        if (res.ok) {
          const json = await res.json();
          const open = json.data || [];
          // Also fetch voting jams
          const votingRes = await fetch("/api/jams?status=voting");
          const voting = votingRes.ok ? (await votingRes.json()).data || [] : [];
          setActiveJams([...open, ...voting].slice(0, 3));
        }
      } catch {
        // silently fail
      }
    }
    fetchActiveJams();
  }, []);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/stories?public=true&writingMode=campaign&limit=6");
        if (res.ok) {
          const json = await res.json();
          setCampaignStories(json.data.stories || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchCampaigns();
  }, []);

  const RATING_LEVELS: Record<string, number> = { everyone: 0, teen: 1, mature: 2, explicit: 3 };

  const filtered = stories.filter((story) => {
    if (selectedGenre && !story.genres.includes(selectedGenre)) return false;
    if (formatFilter !== "All") {
      if (formatFilter === "campaign") {
        if (story.writingMode !== "campaign") return false;
      } else {
        if (story.format !== formatFilter || story.writingMode === "campaign") return false;
      }
    }
    if (maxRating !== "all") {
      const maxLevel = RATING_LEVELS[maxRating];
      const storyLevel = RATING_LEVELS[story.contentRating] ?? 0;
      if (storyLevel > maxLevel) return false;
    }
    return true;
  });

  const justPublished = useMemo(() => {
    return [...stories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [stories]);

  const popularFallback = useMemo(() => {
    return [...stories]
      .sort((a, b) => b.sparkCount - a.sparkCount)
      .slice(0, 6);
  }, [stories]);

  // Count stories per genre for wing badges
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s) => s.genres.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    return counts;
  }, [stories]);

  // Top genres with stories — show up to 8 most populated
  const topGenres = useMemo(() => {
    return GENRES
      .filter((g) => (genreCounts[g] || 0) > 0)
      .sort((a, b) => (genreCounts[b] || 0) - (genreCounts[a] || 0))
      .slice(0, 8);
  }, [genreCounts]);

  // Remaining genres not in top list
  const remainingGenres = useMemo(() => {
    return GENRES.filter((g) => !topGenres.includes(g));
  }, [topGenres]);

  const isSearching = !!debouncedQuery;
  const hasFiltersActive = isSearching || !!selectedGenre || formatFilter !== "All";

  const activeWing = selectedGenre ? (GENRE_WINGS[selectedGenre] || DEFAULT_WING) : null;

  const resultCountText = useMemo(() => {
    if (loading) return null;
    if (debouncedQuery) {
      return `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for \u2018${debouncedQuery}\u2019`;
    }
    if (selectedGenre) {
      return `${filtered.length} ${filtered.length === 1 ? "story" : "stories"} in ${selectedGenre}`;
    }
    return `${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
  }, [filtered.length, debouncedQuery, selectedGenre, loading]);

  return (
    <div className="relative">
      {/* ══════════════════════════════════════════════════════════
          1. LIBRARY HERO — the grand entrance
          ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Ambient background glow — shifts color when a genre wing is selected */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full"
            animate={{
              background: activeWing
                ? `radial-gradient(ellipse at center, ${activeWing.accentGlow} 0%, transparent 70%)`
                : "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)",
            }}
            transition={{ duration: 1.2 }}
          />
        </div>

        {/* Floating library dust */}
        <LibraryDust />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-text-ghost text-[10px] uppercase tracking-[0.25em] font-display mb-3"
            >
              Quiloria
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl text-paper font-medium tracking-tight"
            >
              The Grand <span className="text-gold italic">Library</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-text-secondary text-[14px] md:text-[15px] mt-4 max-w-md mx-auto leading-relaxed"
            >
              Wander the shelves, discover new worlds, and find the stories that speak to you.
            </motion.p>
          </motion.div>

          {/* ── Search Portal — the magical search bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className={`relative group transition-all duration-500 ${searchFocused ? "scale-[1.02]" : ""}`}>
              {/* Glow ring behind search */}
              <div className={`absolute -inset-px rounded-2xl transition-all duration-500 ${
                searchFocused
                  ? "bg-gradient-to-r from-amber/25 via-gold/15 to-amber/25 shadow-[0_0_30px_rgba(200,150,60,0.12)]"
                  : "bg-gradient-to-r from-border via-border-subtle to-border"
              }`} />

              <div className="relative flex items-center gap-3 bg-elevated/90 backdrop-blur-sm rounded-2xl px-5 py-3.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`flex-shrink-0 transition-colors duration-300 ${searchFocused ? "text-amber" : "text-text-ghost"}`}
                >
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="M12.5 12.5L16 16" />
                </svg>
                <input
                  type="text"
                  placeholder="Search the library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="bg-transparent text-[14px] text-text outline-none placeholder:text-text-ghost w-full font-body"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-text-ghost hover:text-text-secondary transition-colors p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Fade to void */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* ══════════════════════════════════════════════════════════
            2. GENRE FILTER — horizontal scrollable pill row
            ══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Genres pill */}
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                selectedGenre === null
                  ? "bg-amber text-void shadow-sm shadow-amber/20"
                  : "bg-elevated/60 text-text-secondary hover:text-paper hover:bg-elevated/80"
              }`}
            >
              All Genres
            </button>

            {/* Top genres first, then remaining */}
            {topGenres.map((genre) => {
              const wing = GENRE_WINGS[genre] || DEFAULT_WING;
              const isActive = selectedGenre === genre;
              const count = genreCounts[genre] || 0;

              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(isActive ? null : genre)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? `${wing.accentBg} text-void shadow-sm`
                      : "bg-elevated/60 text-text-secondary hover:text-paper hover:bg-elevated/80"
                  }`}
                >
                  <span>{genre}</span>
                  <span className={`text-[10px] ${isActive ? "text-void/60" : "text-text-ghost"}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {remainingGenres.map((genre) => {
              const wing = GENRE_WINGS[genre] || DEFAULT_WING;
              const isActive = selectedGenre === genre;
              const count = genreCounts[genre] || 0;

              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(isActive ? null : genre)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? `${wing.accentBg} text-void shadow-sm`
                      : "bg-elevated/60 text-text-secondary hover:text-paper hover:bg-elevated/80"
                  }`}
                >
                  <span>{genre}</span>
                  {count > 0 && (
                    <span className={`text-[10px] ${isActive ? "text-void/60" : "text-text-ghost"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            3. FILTER BAR — sort, format, rating, result count (sticky)
            ══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="sticky top-14 z-30 bg-void/95 backdrop-blur-sm -mx-6 px-6 py-3 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort pills */}
            <div className="flex items-center gap-1 bg-surface/60 rounded-xl p-1 border border-border/50">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    sortBy === opt.value
                      ? "bg-elevated text-paper shadow-sm"
                      : "text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Format pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-surface/60 rounded-xl p-1 border border-border/50">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormatFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    formatFilter === opt.value
                      ? "bg-elevated text-paper shadow-sm"
                      : "text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {opt.icon && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="opacity-70">
                      <path d={opt.icon} />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Rating dropdown */}
            <select
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="bg-surface/60 border border-border/50 rounded-xl px-3 py-[7px] text-[11px] text-text-secondary outline-none focus:border-amber/25 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Ratings</option>
              <option value="everyone">All Ages</option>
              <option value="teen">Teen &amp; Below</option>
              <option value="mature">Mature &amp; Below</option>
              <option value="explicit">Include Explicit</option>
            </select>

            {/* Result count */}
            {resultCountText && (
              <span className="text-text-ghost text-[11px] ml-auto">
                {resultCountText}
              </span>
            )}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            4. MAIN STORY GRID — filtered results
            ══════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                <p className="text-text-ghost text-[11px] uppercase tracking-[0.12em]">Searching the stacks...</p>
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filtered.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.6 + i * 0.04, 1.2) }}
                >
                  <BookCard
                    title={story.title}
                    author={story.authorName || undefined}
                    genres={story.genres}
                    synopsis={story.synopsis || undefined}
                    wordCount={story.totalWords || 0}
                    chapterCount={story.chapterCount || 0}
                    sparkCount={story.sparkCount || 0}
                    slug={story.slug || story.id}
                    coverUrl={story.coverImageUrl || undefined}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            /* ── Empty state — these shelves are bare ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-text-ghost mb-5"
              >
                {/* Book icon */}
                <path d="M5 4c3-1 6-1 11 1v22c-5-2-8-2-11-1V4z" />
                <path d="M16 5c5-2 8-2 11-1v22c-3-1-6-1-11 1V5z" />
              </svg>
              <h3 className="font-display text-lg text-paper mb-2">
                {searchQuery
                  ? "No stories found"
                  : selectedGenre || formatFilter !== "All"
                    ? "No stories match these filters"
                    : "No stories yet"}
              </h3>
              <p className="text-text-secondary text-[13px] max-w-sm leading-relaxed">
                {searchQuery
                  ? "Try different keywords or adjust your filters."
                  : selectedGenre || formatFilter !== "All"
                    ? "Try broadening your filters or explore a different genre."
                    : "The library is waiting for its first stories."}
              </p>
              <p className="text-text-ghost text-[12px] mt-2">
                <Link href="/create" className="text-amber hover:text-amber-light transition-colors">
                  Create a story
                </Link>
                {" "}and be the first on these shelves.
              </p>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Clear search
                </button>
              )}

              {(selectedGenre || formatFilter !== "All") && (
                <button
                  onClick={() => { setSelectedGenre(null); setFormatFilter("All"); }}
                  className="mt-4 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Clear filters
                </button>
              )}

              {/* Popular fallback */}
              {popularFallback.length > 0 && (
                <div className="mt-14 w-full">
                  <div className="flourish mb-6">
                    <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                      You Might Enjoy
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                    {popularFallback.map((story, i) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                      >
                        <BookCard
                          title={story.title}
                          author={story.authorName || undefined}
                          genres={story.genres}
                          synopsis={story.synopsis || undefined}
                          wordCount={story.totalWords || 0}
                          chapterCount={story.chapterCount || 0}
                          sparkCount={story.sparkCount || 0}
                          slug={story.slug || story.id}
                          coverUrl={story.coverImageUrl || undefined}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* ══════════════════════════════════════════════════════════
            5. DIVIDER — separates browsing from discovery sections
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && (
          <div className="flourish my-14">
            <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
              Discover More
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            6. STAFF PICKS — the librarian's recommendations
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && staffPicks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                The Librarian Recommends
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {staffPicks.map((pick, i) => (
                <motion.div
                  key={pick.pickId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 + i * 0.06 }}
                >
                  <Link
                    href={`/story/${pick.slug || pick.id}`}
                    className="block group"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-amber/15 hover:border-amber/30 transition-all duration-300">
                      {/* Gold accent line */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

                      {/* Cover area */}
                      <div className="h-40 relative overflow-hidden bg-gradient-to-br from-amber/10 to-amber/[0.02]">
                        {pick.coverImageUrl ? (
                          <img
                            src={pick.coverImageUrl}
                            alt={pick.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-amber/20">
                              <path d="M2 3l9 3.5L20 3v14l-9 3.5L2 17V3z" />
                              <path d="M11 6.5V20" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
                        {/* Staff pick badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                            <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                          </svg>
                          <span className="text-[10px] text-amber font-medium uppercase tracking-wider">Staff Pick</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 bg-surface/60">
                        <h3 className="font-display text-paper text-[16px] font-semibold group-hover:text-amber transition-colors leading-snug">
                          {pick.title}
                        </h3>
                        {pick.authorName && (
                          <p className="text-text-secondary text-[12px] mt-1">by {pick.authorName}</p>
                        )}
                        {pick.curatorNote && (
                          <p className="text-text-tertiary text-[12px] italic leading-relaxed mt-3 font-reading line-clamp-2">
                            &ldquo;{pick.curatorNote}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {pick.genres.slice(0, 2).map((g) => (
                            <GenrePill key={g} genre={g} size="sm" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            7. SPOTLIGHT — boosted stories (paid Ink Drop placement)
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && boostedStories.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-14"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                  <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-display text-lg text-paper font-bold">
                  In the Spotlight
                </h2>
                <p className="text-[11px] text-text-ghost">
                  Featured by their creators
                </p>
              </div>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
              {boostedStories.map((story) => (
                <div key={story.id} className="flex-shrink-0">
                  <StoryCard
                    title={story.title}
                    author={story.authorName || undefined}
                    coverUrl={story.coverImageUrl || undefined}
                    genres={story.genres || []}
                    wordCount={story.totalWords || 0}
                    chapterCount={story.chapterCount || 0}
                    sparkCount={story.sparkCount}
                    contentRating={story.contentRating}
                    slug={story.slug || story.id}
                    variant="featured"
                    excerpt={story.synopsis || undefined}
                    writingMode={story.writingMode}
                    isBoosted
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            8. OPEN ADVENTURES — campaign stories seeking players
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && campaignStories.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.43 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Open Adventures
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {campaignStories.map((campaign, i) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.04 }}
                  className="flex-shrink-0 w-[300px]"
                >
                  <Link
                    href={`/campaign/${campaign.id}`}
                    className="block group"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-amber/15 hover:border-amber/30 transition-all duration-300 bg-surface/60">
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet/40 to-transparent" />

                      {/* Cover area */}
                      <div className="h-32 relative overflow-hidden bg-gradient-to-br from-violet/10 via-amber/5 to-transparent">
                        {campaign.coverImageUrl ? (
                          <img
                            src={campaign.coverImageUrl}
                            alt={campaign.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-amber/25">
                              <path d="M12 2L5 6v12l7 4 7-4V6l-7-4z" />
                              <path d="M12 12v10M5 6l7 6 7-6" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />

                        {/* Adventure badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                            <path d="M8 2L3 5v6l5 3 5-3V5L8 2z" />
                          </svg>
                          <span className="text-[10px] text-amber font-medium uppercase tracking-wider">Adventure</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-display text-paper text-[15px] font-semibold group-hover:text-amber transition-colors leading-snug truncate">
                          {campaign.title}
                        </h3>
                        {campaign.authorName && (
                          <p className="text-text-secondary text-[11px] mt-1">
                            GM: {campaign.authorName}
                          </p>
                        )}
                        {campaign.synopsis && (
                          <p className="text-text-tertiary text-[12px] leading-relaxed mt-2 font-reading line-clamp-2">
                            {campaign.synopsis}
                          </p>
                        )}

                        {/* Campaign stats & join CTA */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3">
                            {campaign.genres.slice(0, 2).map((g) => (
                              <GenrePill key={g} genre={g} size="sm" />
                            ))}
                          </div>
                          <div className="flex items-center gap-2.5 text-[10px] text-text-ghost">
                            {/* Player count */}
                            <span className="flex items-center gap-1" title="Players">
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                                <circle cx="6" cy="5" r="2.5" />
                                <path d="M1 14c0-3 2.5-5 5-5s5 2 5 5" />
                                <circle cx="11.5" cy="5.5" r="2" />
                                <path d="M15 14c0-2.5-1.5-4-3.5-4" />
                              </svg>
                              {campaign.playerCount ?? 0}
                            </span>
                            {/* Session count */}
                            <span className="flex items-center gap-1" title="Sessions">
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                                <rect x="2" y="3" width="12" height="10" rx="1.5" />
                                <path d="M2 7h12" />
                                <path d="M5 3v-1M11 3v-1" />
                              </svg>
                              {campaign.sessionCount ?? 0}
                            </span>
                          </div>
                        </div>

                        {/* Join button */}
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <span className="text-[11px] font-medium text-violet group-hover:text-amber transition-colors uppercase tracking-wider">
                            View Adventure &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            9. ACTIVE JAMS — community creative events
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && activeJams.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-rose/10 border border-rose/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose">
                    <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-lg text-paper font-bold">Active Jams</h2>
                  <p className="text-[11px] text-text-ghost">Write, submit, vote</p>
                </div>
              </div>
              <Link href="/jams" className="text-xs text-amber hover:text-amber/80 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {activeJams.map((jam) => (
                <Link
                  key={jam.id}
                  href={`/jams/${jam.id}`}
                  className="flex-shrink-0 w-64 card-page p-4 hover:border-rose/20 transition-all group"
                >
                  <h3 className="font-display text-sm text-paper font-semibold group-hover:text-rose transition-colors mb-1 truncate">
                    {jam.title}
                  </h3>
                  <p className="text-xs text-text-secondary italic mb-3 truncate">
                    {jam.theme}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-text-ghost">
                    <span className={`px-1.5 py-0.5 rounded-full border ${
                      jam.liveStatus === "open"
                        ? "text-sage border-sage/20 bg-sage/10"
                        : "text-amber border-amber/20 bg-amber/10"
                    }`}>
                      {jam.liveStatus === "open" ? "Open" : "Voting"}
                    </span>
                    <span>{jam.entryCount} {jam.entryCount === 1 ? "entry" : "entries"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            10. JUST ARRIVED — new additions to the collection
            ══════════════════════════════════════════════════════════ */}
        {!hasFiltersActive && !loading && justPublished.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Just Arrived
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {justPublished.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52 + i * 0.04 }}
                >
                  <Link
                    href={`/story/${story.slug || story.id}`}
                    className="flex items-center gap-4 card-page p-4 group transition-all duration-200 hover:border-amber/20"
                  >
                    {/* Cover */}
                    <div className="relative w-14 h-[72px] rounded-lg flex-shrink-0 overflow-hidden border border-border-subtle bg-gradient-to-br from-amber/10 to-amber/[0.02]">
                      {story.coverImageUrl ? (
                        <Image src={story.coverImageUrl} alt={story.title} fill sizes="300px" className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-amber/30">
                            <rect x="4" y="2" width="12" height="16" rx="1.5" />
                            <path d="M7 6h6M7 9h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-medium text-paper truncate group-hover:text-amber transition-colors">
                        {story.title}
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                        {story.authorName || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {story.genres.slice(0, 1).map((g) => (
                          <GenrePill key={g} genre={g} size="sm" />
                        ))}
                        <span className="text-[10px] text-text-ghost">
                          {story.chapterCount} ch · {story.totalWords >= 1000 ? `${(story.totalWords / 1000).toFixed(1)}k` : story.totalWords} words
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
