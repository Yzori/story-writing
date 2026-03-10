"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import GenrePill from "@/components/shared/GenrePill";

interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  sortOrder: number;
  status: string;
  createdAt: string;
}

interface Author {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

interface StoryData {
  id: string;
  userId: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  status: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author | null;
  chapters: Chapter[];
}

const FORMAT_LABELS: Record<string, string> = {
  prose: "Prose",
  webtoon: "Webtoon",
  poetry: "Poetry",
  illustrated: "Illustrated Prose",
  screenplay: "Screenplay",
};

const RATING_LABELS: Record<string, string> = {
  everyone: "All Ages",
  teen: "Teen+",
  mature: "Mature",
  explicit: "Explicit",
};

const GENRE_GRADIENTS: Record<string, string> = {
  Fantasy: "from-amber/30 to-amber/5",
  "Science Fiction": "from-lavender/30 to-lavender/5",
  Romance: "from-rose/30 to-rose/5",
  Mystery: "from-lavender/20 to-void",
  Thriller: "from-rose/20 to-void",
  Horror: "from-rose/30 to-void",
  default: "from-amber/20 to-surface",
};

function getGradient(genres: string[]): string {
  if (genres.length === 0) return GENRE_GRADIENTS.default;
  return GENRE_GRADIENTS[genres[0]] || GENRE_GRADIENTS.default;
}

export default function StoryPage() {
  const params = useParams();
  const { data: session } = useSession();
  const slug = params.slug as string;
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStory() {
      try {
        const res = await fetch(`/api/stories/by-slug/${slug}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message || "Story not found");
          return;
        }
        setStory(json.data);
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-rose/10 border border-border flex items-center justify-center mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-rose/50"
          >
            <circle cx="14" cy="14" r="10" />
            <path d="M14 9v6M14 19v.5" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-paper mb-2">
          Story not found
        </h2>
        <p className="text-text-secondary text-[13px] mb-6">
          {error || "This story may have been removed or doesn't exist."}
        </p>
        <Link
          href="/browse"
          className="text-amber hover:text-amber/80 transition-colors text-[13px]"
        >
          Browse stories
        </Link>
      </div>
    );
  }

  const totalWords = story.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const publishedChapters = story.chapters.filter(
    (ch) => ch.status === "published"
  );

  return (
    <div>
      {/* Hero / Cover */}
      <div
        className={`h-56 sm:h-72 bg-gradient-to-br ${getGradient(story.genres)} relative`}
      >
        {story.coverImageUrl && (
          <img
            src={story.coverImageUrl}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-24 relative">
        {/* Title & Meta */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 backdrop-blur-sm px-2 py-0.5 rounded">
              {FORMAT_LABELS[story.format] || story.format}
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 backdrop-blur-sm px-2 py-0.5 rounded">
              {RATING_LABELS[story.contentRating] || story.contentRating}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl text-paper font-semibold mb-4 leading-tight">
            {story.title}
          </h1>

          {/* Author */}
          {story.author && (
            <Link
              href={`/profile/${story.author.id}`}
              className="flex items-center gap-3 mb-6 group"
            >
              <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-amber text-sm font-display font-semibold flex-shrink-0">
                {story.author.avatarUrl ? (
                  <img
                    src={story.author.avatarUrl}
                    alt={story.author.displayName || ""}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (story.author.displayName || "?").charAt(0)
                )}
              </div>
              <div>
                <p className="text-paper text-[14px] font-medium group-hover:text-amber transition-colors">
                  {story.author.displayName}
                </p>
                <p className="text-text-ghost text-[11px] capitalize">
                  {story.author.role}
                </p>
              </div>
            </Link>
          )}

          {/* Genres */}
          {story.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {story.genres.map((genre) => (
                <GenrePill key={genre} genre={genre} size="md" />
              ))}
            </div>
          )}

          {/* Synopsis */}
          {story.synopsis && (
            <p className="text-text-secondary text-[14px] leading-relaxed max-w-2xl mb-6">
              {story.synopsis}
            </p>
          )}

          {/* Stats + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-[12px] text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M5 5h6M5 8h4" />
                </svg>
                {story.chapters.length} chapter
                {story.chapters.length !== 1 ? "s" : ""}
              </span>
              {totalWords > 0 && (
                <span>
                  {totalWords >= 1000
                    ? `${(totalWords / 1000).toFixed(1)}k`
                    : totalWords}{" "}
                  words
                </span>
              )}
              <span className="capitalize">{story.status}</span>
            </div>

            {/* Edit button for owner */}
            {session?.user?.id === story.userId && (
              <Link
                href={`/write/${story.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-amber text-void text-[13px] font-medium rounded-lg hover:bg-amber/90 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                </svg>
                Edit Story
              </Link>
            )}
          </div>

          {/* Start Reading button */}
          {publishedChapters.length > 0 && (
            <Link
              href={`/story/${slug}/read/${publishedChapters[0].id}`}
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-surface border border-border text-paper text-[13px] font-medium rounded-lg hover:border-amber/30 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
                <path d="M8 5.5V14" />
              </svg>
              Start Reading
            </Link>
          )}
        </motion.div>

        {/* Chapters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-16"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-4 block">
            Chapters
          </span>

          {story.chapters.length > 0 ? (
            <div className="space-y-2">
              {story.chapters.map((chapter, i) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                >
                  {chapter.status === "published" ? (
                    <Link href={`/story/${slug}/read/${chapter.id}`} className="block">
                      <div className="bg-surface border border-border rounded-lg px-5 py-4 flex items-center justify-between hover:border-border-active transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <span className="text-text-ghost text-[12px] font-mono w-6 text-right">
                            {i + 1}
                          </span>
                          <div>
                            <h3 className="text-paper text-[14px] font-medium group-hover:text-amber transition-colors">
                              {chapter.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-tertiary">
                              {chapter.wordCount > 0 && (
                                <span>{chapter.wordCount.toLocaleString()} words</span>
                              )}
                              <span className="text-sage">Published</span>
                            </div>
                          </div>
                        </div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="text-text-ghost group-hover:text-amber transition-colors"
                        >
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-surface border border-border rounded-lg px-5 py-4 flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-4">
                        <span className="text-text-ghost text-[12px] font-mono w-6 text-right">
                          {i + 1}
                        </span>
                        <div>
                          <h3 className="text-paper text-[14px] font-medium">
                            {chapter.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-tertiary">
                            {chapter.wordCount > 0 && (
                              <span>{chapter.wordCount.toLocaleString()} words</span>
                            )}
                            <span className="text-text-ghost">Draft</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-secondary text-[13px]">
                No chapters yet. The story is just beginning.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
