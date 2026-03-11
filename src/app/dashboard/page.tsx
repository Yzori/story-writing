"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";

interface Story {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  status: string;
  writingMode: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
}

const STAT_CONFIGS = [
  {
    key: "stories",
    label: "Stories",
    gradient: "from-amber/15 to-amber/5",
    iconColor: "text-amber",
    borderColor: "border-amber/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="2" width="7" height="9" rx="1.5" />
        <rect x="12" y="2" width="7" height="9" rx="1.5" />
        <rect x="3" y="13" width="7" height="7" rx="1.5" />
        <rect x="12" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "words",
    label: "Total Words",
    gradient: "from-teal/15 to-teal/5",
    iconColor: "text-teal",
    borderColor: "border-teal/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M4 5h14M4 9h11M4 13h8M4 17h13" />
      </svg>
    ),
  },
  {
    key: "chapters",
    label: "Chapters",
    gradient: "from-lavender/15 to-lavender/5",
    iconColor: "text-lavender",
    borderColor: "border-lavender/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M2 4l9 3.5 9-3.5v13l-9 3.5-9-3.5V4z" />
        <path d="M11 7.5v13" />
      </svg>
    ),
  },
  {
    key: "sparks",
    label: "Sparks",
    gradient: "from-rose/15 to-rose/5",
    iconColor: "text-rose",
    borderColor: "border-rose/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M11 2l2.5 5L19 8l-4 4 .5 6-4.5-2.5L6.5 18 7 12 3 8l5.5-1z" />
      </svg>
    ),
  },
];

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [followedStories, setFollowedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedLoading, setFollowedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch("/api/stories?mine=true");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message || "Failed to load stories");
          return;
        }
        setStories(json.data.stories);
      } catch {
        setError("Failed to load stories");
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setFollowedLoading(false);
      return;
    }
    async function fetchFollowing() {
      try {
        const res = await fetch(`/api/users/${session!.user!.id}/following`);
        const json = await res.json();
        if (res.ok) {
          setFollowedStories(json.data.stories);
        }
      } catch {
        // Silently fail — reading list is non-critical
      } finally {
        setFollowedLoading(false);
      }
    }
    fetchFollowing();
  }, [session?.user?.id]);

  const totalWords = stories.reduce((sum, s) => sum + (s.totalWords || 0), 0);
  const totalChapters = stories.reduce((sum, s) => sum + (s.chapterCount || 0), 0);
  const totalSparks = stories.reduce((sum, s) => sum + (s.sparkCount || 0), 0);

  const statValues: Record<string, string | number> = {
    stories: stories.length,
    words: totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords,
    chapters: totalChapters,
    sparks: totalSparks,
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-10"
      >
        <div>
          <h1 className="font-display text-3xl text-paper font-semibold">
            My Stories
          </h1>
          <p className="text-text-secondary text-[13px] mt-1.5">
            Your writing desk — everything in one place.
          </p>
        </div>
        <Link
          href="/create"
          className="group relative bg-amber text-void font-semibold px-6 py-2.5 rounded-full hover:bg-amber-light transition-all duration-200 text-[13px] flex items-center gap-2 hover:shadow-lg hover:shadow-amber/15"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Story
        </Link>
      </motion.div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-rose/10 border border-rose/20 rounded-xl text-rose text-[13px]">
          {error}
        </div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
      >
        {STAT_CONFIGS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className={`relative bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} rounded-2xl p-5 overflow-hidden`}
          >
            <div className={`w-10 h-10 rounded-xl bg-void/30 ${stat.iconColor} flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-paper text-2xl font-display font-bold">
              {statValues[stat.key]}
            </p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary mt-1">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Story Grid or Empty State */}
      {stories.length > 0 ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-5 block">
              Your Works
            </span>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <StoryCard
                  title={story.title}
                  genres={story.genres}
                  wordCount={story.totalWords || 0}
                  chapterCount={story.chapterCount || 0}
                  sparkCount={story.sparkCount || 0}
                  contentRating={story.contentRating}
                  status={story.status as "draft" | "in-progress" | "complete"}
                  slug={story.slug || story.id}
                  href={story.writingMode === "campaign" ? `/campaign/${story.id}` : `/write/${story.id}`}
                  coverUrl={story.coverImageUrl || undefined}
                  lastEdited={formatTimeAgo(story.updatedAt)}
                />
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
          <div className="relative w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="44"
                height="44"
                viewBox="0 0 40 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-amber/40"
              >
                <path d="M32 5C26 10 20 16 15 22C10 28 8 33 7 36L4 37L3 34C4 30 8 22 14 15C20 8 27 5 32 5Z" />
                <circle cx="6" cy="36" r="2" />
                <path d="M20 10l6-4" strokeDasharray="2 2" />
              </svg>
            </div>
            <div className="absolute -inset-4 bg-amber/5 rounded-full blur-2xl" />
          </div>
          <h2 className="font-display text-2xl text-paper mb-2">
            Your stories begin here
          </h2>
          <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
            Every great tale starts with a single word. Open a blank page and let
            the ink flow.
          </p>
          <Link
            href="/create"
            className="bg-amber text-void font-semibold px-7 py-3 rounded-full hover:bg-amber-light transition-all duration-200 text-[14px] hover:shadow-lg hover:shadow-amber/15"
          >
            Begin Your First Story
          </Link>
        </motion.div>
      )}

      {/* Section Separator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="my-12 border-t border-border-subtle"
      />

      {/* Reading List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-5 block">
          Reading List
        </span>
      </motion.div>

      {followedLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : followedStories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {followedStories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <StoryCard
                title={story.title}
                author={story.authorName || undefined}
                genres={story.genres}
                wordCount={story.totalWords || 0}
                chapterCount={story.chapterCount || 0}
                sparkCount={story.sparkCount || 0}
                contentRating={story.contentRating}
                status={story.status as "draft" | "in-progress" | "complete"}
                slug={story.slug || story.id}
                href={`/story/${story.slug || story.id}`}
                coverUrl={story.coverImageUrl || undefined}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center justify-center text-center py-16"
        >
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lavender/10 to-lavender/[0.02] border border-lavender/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-lavender/40"
              >
                <path d="M4 6C4 6 8 4 16 4s12 2 12 2v20s-4-2-12-2-12 2-12 2V6z" />
                <path d="M16 4v20" />
              </svg>
            </div>
            <div className="absolute -inset-4 bg-lavender/5 rounded-full blur-2xl" />
          </div>
          <p className="text-text-secondary text-[14px] max-w-xs leading-relaxed">
            Follow stories you love to see them here.
          </p>
          <Link
            href="/browse"
            className="mt-5 text-amber text-[13px] font-medium hover:text-amber-light transition-colors duration-200"
          >
            Browse stories &rarr;
          </Link>
        </motion.div>
      )}
    </div>
  );
}
