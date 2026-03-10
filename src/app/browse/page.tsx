"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

const SORT_OPTIONS = ["Latest", "Most Sparked", "Most Read", "Rising"];
const FORMAT_OPTIONS = [
  "All Formats",
  "Prose",
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
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const filtered = stories.filter((story) => {
    if (selectedGenre && !story.genres.includes(selectedGenre)) return false;
    if (
      formatFilter !== "All Formats" &&
      story.format !== formatFilter.toLowerCase()
    )
      return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="font-display text-3xl text-paper font-semibold">
            Discover
          </h1>
          <p className="text-text-secondary text-[13px] mt-1.5">
            Stories waiting to be found.
          </p>
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
            className="bg-elevated/80 border border-border rounded-xl px-3.5 py-2 text-[13px] text-text outline-none focus:border-amber/25 transition-all appearance-none cursor-pointer"
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
            className="bg-elevated/80 border border-border rounded-xl px-3.5 py-2 text-[13px] text-text outline-none focus:border-amber/25 transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Stories */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
