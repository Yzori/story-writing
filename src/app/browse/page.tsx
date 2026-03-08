"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { GENRES } from "@/lib/genres";
import StoryCard from "@/components/shared/StoryCard";
import GenrePill from "@/components/shared/GenrePill";

// TODO: Replace mock data with API call (e.g., GET /api/stories/browse)
const STAFF_PICKS = [
  {
    title: "The Lantern Keeper's Daughter",
    author: "Amara Voss",
    genres: ["Fantasy", "Adventure"],
    wordCount: 42300,
    chapterCount: 12,
    sparkCount: 284,
    slug: "lantern-keepers-daughter",
    excerpt:
      "In a city lit only by enchanted lanterns, Mira discovers her father's secret workshop — and the creature bound inside the oldest flame.",
  },
  {
    title: "Neon Requiem",
    author: "Jin Tanaka",
    genres: ["Cyberpunk", "Thriller"],
    wordCount: 18700,
    chapterCount: 6,
    sparkCount: 127,
    slug: "neon-requiem",
    excerpt:
      "When the last analog musician in Neo-Osaka is found dead, a synth-detective must decode a melody that could unravel the city's digital soul.",
  },
  {
    title: "Letters Never Sent",
    author: "Elara Moon",
    genres: ["Romance", "Literary Fiction"],
    wordCount: 65200,
    chapterCount: 22,
    sparkCount: 891,
    slug: "letters-never-sent",
    excerpt:
      "A box of unsent letters spans thirty years, two continents, and one love story that refuses to end quietly.",
  },
  {
    title: "Beneath the Iron Bloom",
    author: "Rowan Thatch",
    genres: ["Steampunk", "Mystery"],
    wordCount: 31500,
    chapterCount: 9,
    sparkCount: 203,
    slug: "beneath-iron-bloom",
    excerpt:
      "In a Victorian city powered by living metal flowers, a botanist-detective uncovers a conspiracy rooted deeper than the oldest ironwood.",
  },
];

const JUST_PUBLISHED = [
  {
    title: "The Cartographer's Error",
    author: "Felix Okonkwo",
    genres: ["Historical Fiction", "Mystery"],
    wordCount: 8400,
    chapterCount: 3,
    sparkCount: 42,
    slug: "cartographers-error",
    status: "in-progress" as const,
  },
  {
    title: "Wisteria House",
    author: "Sable Whitmore",
    genres: ["Horror", "Contemporary"],
    wordCount: 22100,
    chapterCount: 8,
    sparkCount: 156,
    slug: "wisteria-house",
    status: "complete" as const,
  },
  {
    title: "Song of the Star Eaters",
    author: "Kira Delacroix",
    genres: ["Science Fiction", "Action"],
    wordCount: 55800,
    chapterCount: 18,
    sparkCount: 412,
    slug: "star-eaters",
    status: "in-progress" as const,
  },
  {
    title: "The Jade Disciple",
    author: "Wei Chen",
    genres: ["Wuxia", "Fantasy"],
    wordCount: 91200,
    chapterCount: 30,
    sparkCount: 678,
    slug: "jade-disciple",
    status: "complete" as const,
  },
  {
    title: "Moth Light",
    author: "Cass Reeves",
    genres: ["Magical Realism", "Drama"],
    wordCount: 14300,
    chapterCount: 5,
    sparkCount: 89,
    slug: "moth-light",
    status: "in-progress" as const,
  },
  {
    title: "Rust & Reverie",
    author: "Nikolai Brandt",
    genres: ["Dystopian", "Romance"],
    wordCount: 38700,
    chapterCount: 14,
    sparkCount: 321,
    slug: "rust-reverie",
    status: "complete" as const,
  },
];

const SORT_OPTIONS = ["Latest", "Most Sparked", "Most Read", "Rising"];
const FORMAT_OPTIONS = ["All Formats", "Prose", "Webtoon", "Poetry", "Screenplay"];

export default function BrowsePage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Latest");
  const [formatFilter, setFormatFilter] = useState("All Formats");
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <p className="text-text-secondary text-[13px] mt-1">
            Stories waiting to be found.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <div className="flex items-center gap-2 bg-elevated border border-border rounded-lg px-3 py-2.5 focus-within:border-amber/30 transition-colors">
            <svg
              width="16"
              height="16"
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
              placeholder="Search by title or author..."
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
        {/* Genre pills - horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              selectedGenre === null
                ? "bg-amber text-void"
                : "bg-elevated text-text-secondary hover:text-paper"
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
            className="bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none focus:border-amber/30 transition-colors appearance-none cursor-pointer"
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
            className="bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none focus:border-amber/30 transition-colors appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Staff Picks */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost block">
            Staff Picks
          </span>
          <button className="text-text-secondary hover:text-paper transition-colors text-[13px]">
            View All
          </button>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide"
        >
          {STAFF_PICKS.map((story, i) => (
            <motion.div
              key={story.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <StoryCard {...story} variant="featured" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Just Published */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost block">
            Just Published
          </span>
          <button className="text-text-secondary hover:text-paper transition-colors text-[13px]">
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {JUST_PUBLISHED.map((story, i) => (
            <motion.div
              key={story.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
            >
              <StoryCard {...story} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
