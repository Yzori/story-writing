"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";

// TODO: Replace mock data with API call (e.g., GET /api/stories?author=me)
const MOCK_STORIES = [
  {
    title: "The Lantern Keeper's Daughter",
    genres: ["Fantasy", "Adventure"],
    wordCount: 42300,
    chapterCount: 12,
    sparkCount: 284,
    status: "in-progress" as const,
    slug: "lantern-keepers-daughter",
    lastEdited: "2 hours ago",
  },
  {
    title: "Neon Requiem",
    genres: ["Cyberpunk", "Thriller"],
    wordCount: 18700,
    chapterCount: 6,
    sparkCount: 127,
    status: "draft" as const,
    slug: "neon-requiem",
    lastEdited: "Yesterday",
  },
  {
    title: "Letters Never Sent",
    genres: ["Romance", "Literary Fiction"],
    wordCount: 65200,
    chapterCount: 22,
    sparkCount: 891,
    status: "complete" as const,
    slug: "letters-never-sent",
    lastEdited: "3 days ago",
  },
  {
    title: "The Cartographer's Error",
    genres: ["Historical Fiction", "Mystery"],
    wordCount: 8400,
    chapterCount: 3,
    sparkCount: 42,
    status: "draft" as const,
    slug: "cartographers-error",
    lastEdited: "1 week ago",
  },
];

const STATS = [
  {
    label: "Total Stories",
    value: MOCK_STORIES.length,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" />
      </svg>
    ),
  },
  {
    label: "Total Words",
    value: "134.6k",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 4h12M4 8h10M4 12h8M4 16h12" />
      </svg>
    ),
  },
  {
    label: "Published Chapters",
    value: 34,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 4l8 3 8-3v11l-8 3-8-3V4z" />
        <path d="M10 7v11" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const hasStories = MOCK_STORIES.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="font-display text-3xl text-paper font-semibold">
            My Stories
          </h1>
          <p className="text-text-secondary text-[13px] mt-1">
            Your writing desk — everything in one place.
          </p>
        </div>
        <Link
          href="/create"
          className="bg-amber text-void font-medium px-5 py-2 rounded-lg hover:bg-amber/90 transition-colors text-[13px] flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Story
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-amber/10 text-amber flex items-center justify-center flex-shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                {stat.label}
              </p>
              <p className="text-paper text-xl font-display font-semibold mt-0.5">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Story Grid or Empty State */}
      {hasStories ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-4 block">
              Your Works
            </span>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_STORIES.map((story, i) => (
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
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center text-center py-24"
        >
          <div className="w-24 h-24 rounded-full bg-amber/5 border border-border flex items-center justify-center mb-6">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-amber/50"
            >
              <path d="M32 5C26 10 20 16 15 22C10 28 8 33 7 36L4 37L3 34C4 30 8 22 14 15C20 8 27 5 32 5Z" />
              <circle cx="6" cy="36" r="2" />
              <path d="M20 10l6-4" strokeDasharray="2 2" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-paper mb-2">
            Your stories begin here
          </h2>
          <p className="text-text-secondary text-[14px] max-w-sm mb-6 leading-relaxed">
            Every great tale starts with a single word. Open a blank page and let
            the ink flow.
          </p>
          <Link
            href="/create"
            className="bg-amber text-void font-medium px-6 py-2.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px]"
          >
            Begin Your First Story
          </Link>
        </motion.div>
      )}
    </div>
  );
}
