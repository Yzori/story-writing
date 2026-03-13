"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GENRES } from "@/lib/genres";
import StoryCard from "@/components/shared/StoryCard";
import GenrePill from "@/components/shared/GenrePill";

interface Story {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  status: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
  contentRating: string;
}

interface StaffPick extends Story {
  pickId: string;
  curatorNote: string;
  pickedBy: string;
  pickedAt: string;
}

const SORT_OPTIONS = ["Latest", "Most Sparked", "Most Read", "Rising"];
const FORMAT_OPTIONS = [
  "All Formats",
  "Novel",
  "Webtoon",
  "Poetry",
  "Screenplay",
];

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
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
  const [sortBy, setSortBy] = useState("Latest");
  const [formatFilter, setFormatFilter] = useState("All Formats");
  const [maxRating, setMaxRating] = useState<string>("all");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffPicks, setStaffPicks] = useState<StaffPick[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
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
        const sortMap: Record<string, string> = {
          "Latest": "latest",
          "Most Sparked": "most-sparked",
          "Most Read": "most-read",
          "Rising": "rising",
        };
        const params = new URLSearchParams({ public: "true", limit: "30" });
        if (debouncedQuery) params.set("search", debouncedQuery);
        if (sortBy !== "Latest") params.set("sort", sortMap[sortBy] || "latest");
        const res = await fetch(`/api/stories?${params}`);
        const json = await res.json();
        if (res.ok) {
          setStories(json.data.stories);
        }
      } catch {
        // silently fail for browse
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [debouncedQuery, sortBy]);

  // Fetch real staff picks from dedicated endpoint
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

  const RATING_LEVELS: Record<string, number> = { everyone: 0, teen: 1, mature: 2, explicit: 3 };

  const filtered = stories.filter((story) => {
    if (selectedGenre && !story.genres.includes(selectedGenre)) return false;
    if (
      formatFilter !== "All Formats" &&
      story.format !== formatFilter.toLowerCase()
    )
      return false;
    if (maxRating !== "all") {
      const maxLevel = RATING_LEVELS[maxRating];
      const storyLevel = RATING_LEVELS[story.contentRating] ?? 0;
      if (storyLevel > maxLevel) return false;
    }
    return true;
  });

  // Just Published: 6 most recently created stories
  const justPublished = useMemo(() => {
    return [...stories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [stories]);

  // Popular fallback for empty results: top 6 by sparks from unfiltered stories
  const popularFallback = useMemo(() => {
    return [...stories]
      .sort((a, b) => b.sparkCount - a.sparkCount)
      .slice(0, 6);
  }, [stories]);

  const isSearching = !!debouncedQuery;
  const isFilteringGenre = !!selectedGenre;
  const showCuratedSections = !isSearching && !loading;

  // Result count text
  const resultCountText = useMemo(() => {
    if (loading) return null;
    if (debouncedQuery) {
      return `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for \u2018${debouncedQuery}\u2019`;
    }
    return `${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
  }, [filtered.length, debouncedQuery, loading]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <p className="section-label text-[10px] mb-2 max-w-[160px]">Browse</p>
          <h1 className="font-display text-3xl text-paper font-semibold">
            Discover
          </h1>
        </div>
        <div className="w-full sm:w-72">
          <div className="flex items-center gap-2 bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-amber/25 focus-within:shadow-sm focus-within:shadow-amber/5 transition-all">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-ghost flex-shrink-0"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost w-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        {/* Genre pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              selectedGenre === null
                ? "bg-amber text-void shadow-sm shadow-amber/20"
                : "bg-elevated text-text-secondary hover:text-paper hover:bg-subtle"
            }`}
          >
            All Genres
          </button>
          {GENRES.map((genre) => (
            <div key={genre} className="flex-shrink-0">
              <GenrePill
                genre={genre}
                size="md"
                selected={selectedGenre === genre}
                onClick={() =>
                  setSelectedGenre(selectedGenre === genre ? null : genre)
                }
              />
            </div>
          ))}
        </div>

        {/* Format & Sort dropdowns */}
        <div className="flex items-center gap-3">
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="bg-elevated/80 border border-border rounded-lg px-3.5 py-2 text-[13px] text-text outline-none focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all appearance-none cursor-pointer"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-elevated/80 border border-border rounded-lg px-3.5 py-2 text-[13px] text-text outline-none focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            value={maxRating}
            onChange={(e) => setMaxRating(e.target.value)}
            className="bg-elevated/80 border border-border rounded-lg px-3.5 py-2 text-[13px] text-text outline-none focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="everyone">All Ages</option>
            <option value="teen">Teen &amp; Below</option>
            <option value="mature">Mature &amp; Below</option>
            <option value="explicit">Include Explicit</option>
          </select>
        </div>
      </motion.div>

      {/* Just Published — horizontal scroll row */}
      {showCuratedSections && justPublished.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-10"
        >
          <div className="flourish mb-4"><span className="font-display text-sm text-text-secondary tracking-wide">Just Published</span></div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {justPublished.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
              >
                <Link
                  href={`/story/${story.slug || story.id}`}
                  className="flex items-center gap-3 w-[300px] flex-shrink-0 card-page p-3 transition-all group"
                >
                  <div className="w-20 h-20 rounded-lg bg-elevated flex-shrink-0 overflow-hidden">
                    {story.coverImageUrl ? (
                      <img
                        src={story.coverImageUrl}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber/10 to-amber/[0.02] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-amber/30">
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
                    <div className="flex items-center gap-1.5 mt-2">
                      {story.genres.slice(0, 1).map((genre) => (
                        <GenrePill key={genre} genre={genre} size="sm" />
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Staff Picks — curated featured cards with curator notes */}
      {showCuratedSections && !isFilteringGenre && staffPicks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-10"
        >
          <div className="flourish mb-4"><span className="font-display text-sm text-text-secondary tracking-wide">Staff Picks</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffPicks.map((pick, i) => (
              <motion.div
                key={pick.pickId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 + i * 0.05 }}
                className="relative"
              >
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-amber/20 via-amber/5 to-transparent pointer-events-none" />
                <div className="relative bg-surface/80 border border-amber/10 rounded-2xl overflow-hidden">
                  <StoryCard
                    title={pick.title}
                    author={pick.authorName || undefined}
                    genres={pick.genres}
                    wordCount={pick.totalWords || 0}
                    chapterCount={pick.chapterCount || 0}
                    sparkCount={pick.sparkCount || 0}
                    contentRating={pick.contentRating}
                    slug={pick.slug || pick.id}
                    coverUrl={pick.coverImageUrl || undefined}
                    excerpt={pick.synopsis || undefined}
                    variant="featured"
                  />
                  <div className="px-5 pb-4 -mt-1">
                    <p className="text-[12px] text-text-secondary italic leading-relaxed font-reading">
                      &ldquo;{pick.curatorNote}&rdquo;
                    </p>
                    <p className="text-[10px] text-text-ghost mt-1.5">
                      &mdash; {pick.pickedBy}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Stories */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Result count */}
        {resultCountText && (
          <p className="text-text-ghost text-[12px] mb-4">
            {resultCountText}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
              >
                <StoryCard
                  title={story.title}
                  author={story.authorName || undefined}
                  genres={story.genres}
                  wordCount={story.totalWords || 0}
                  chapterCount={story.chapterCount || 0}
                  sparkCount={story.sparkCount || 0}
                  contentRating={story.contentRating}
                  slug={story.slug || story.id}
                  coverUrl={story.coverImageUrl || undefined}
                  excerpt={story.synopsis || undefined}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 28 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  className="text-amber/40"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path d="M18 18l6 6" />
                </svg>
              </div>
              <div className="absolute -inset-3 bg-amber/5 rounded-full blur-xl" />
            </div>
            <h3 className="font-display text-xl text-paper mb-1.5">
              No stories found
            </h3>
            <p className="text-text-secondary text-[13px] max-w-sm">
              {searchQuery
                ? "Try a different search term or clear your filters."
                : "No published stories yet. Be the first to share your work!"}
            </p>

            {/* Popular fallback when search yields no results */}
            {popularFallback.length > 0 && (
              <div className="mt-12 w-full">
                <h3 className="font-display text-lg text-paper font-semibold mb-5">
                  You might enjoy these instead
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {popularFallback.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                    >
                      <StoryCard
                        title={story.title}
                        author={story.authorName || undefined}
                        genres={story.genres}
                        wordCount={story.totalWords || 0}
                        chapterCount={story.chapterCount || 0}
                        sparkCount={story.sparkCount || 0}
                        contentRating={story.contentRating}
                        slug={story.slug || story.id}
                        coverUrl={story.coverImageUrl || undefined}
                        excerpt={story.synopsis || undefined}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
