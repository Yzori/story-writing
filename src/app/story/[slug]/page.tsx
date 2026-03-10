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
  Fantasy: "from-amber/40 via-amber/15 to-transparent",
  "Science Fiction": "from-lavender/40 via-lavender/15 to-transparent",
  Romance: "from-rose/40 via-rose/15 to-transparent",
  Mystery: "from-violet/40 via-violet/15 to-transparent",
  Thriller: "from-rose/35 via-rose/10 to-transparent",
  Horror: "from-rose/40 via-rose/15 to-transparent",
  Adventure: "from-teal/35 via-teal/10 to-transparent",
  default: "from-amber/25 via-amber/8 to-transparent",
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
  const [sparkCount, setSparkCount] = useState(0);
  const [hasSparked, setHasSparked] = useState(false);
  const [sparkLoading, setSparkLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [hasFollowed, setHasFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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

        const [sparkRes, followRes] = await Promise.all([
          fetch(`/api/stories/${json.data.id}/sparks`),
          fetch(`/api/stories/${json.data.id}/follows`),
        ]);
        if (sparkRes.ok) {
          const sparkJson = await sparkRes.json();
          setSparkCount(sparkJson.data.count);
          setHasSparked(sparkJson.data.hasSparked);
        }
        if (followRes.ok) {
          const followJson = await followRes.json();
          setFollowCount(followJson.data.count);
          setHasFollowed(followJson.data.hasFollowed);
        }
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug]);

  const handleFollow = async () => {
    if (!story || followLoading || !session?.user) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/follows`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setFollowCount(json.data.count);
        setHasFollowed(json.data.followed);
      }
    } catch {} finally {
      setFollowLoading(false);
    }
  };

  const handleSpark = async () => {
    if (!story || sparkLoading || !session?.user) return;
    setSparkLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/sparks`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setSparkCount(json.data.count);
        setHasSparked(json.data.sparked);
      }
    } catch {} finally {
      setSparkLoading(false);
    }
  };

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
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-rose/10 border border-rose/15" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose/50">
              <circle cx="14" cy="14" r="10" />
              <path d="M14 9v6M14 19v.5" />
            </svg>
          </div>
        </div>
        <h2 className="font-display text-2xl text-paper mb-2">Story not found</h2>
        <p className="text-text-secondary text-[13px] mb-6">
          {error || "This story may have been removed or doesn't exist."}
        </p>
        <Link href="/browse" className="text-amber hover:text-amber-light transition-colors text-[13px]">
          Browse stories
        </Link>
      </div>
    );
  }

  const totalWords = story.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const publishedChapters = story.chapters.filter((ch) => ch.status === "published");

  return (
    <div>
      {/* Hero / Cover */}
      <div className={`h-64 sm:h-80 bg-gradient-to-br ${getGradient(story.genres)} relative overflow-hidden`}>
        {story.coverImageUrl && (
          <img src={story.coverImageUrl} alt={story.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-void/20" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--t-void)_100%)] opacity-60" />
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-28 relative">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          {/* Badges */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border-subtle">
              {FORMAT_LABELS[story.format] || story.format}
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border-subtle">
              {RATING_LABELS[story.contentRating] || story.contentRating}
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border-subtle capitalize">
              {story.status}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl text-paper font-bold mb-5 leading-tight">
            {story.title}
          </h1>

          {/* Author */}
          {story.author && (
            <Link href={`/profile/${story.author.id}`} className="flex items-center gap-3 mb-6 group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-sm font-display font-semibold flex-shrink-0 overflow-hidden">
                {story.author.avatarUrl ? (
                  <img src={story.author.avatarUrl} alt={story.author.displayName || ""} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (story.author.displayName || "?").charAt(0)
                )}
              </div>
              <div>
                <p className="text-paper text-[14px] font-medium group-hover:text-amber transition-colors">
                  {story.author.displayName}
                </p>
                <p className="text-text-ghost text-[11px] capitalize">{story.author.role}</p>
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
            <p className="text-text-secondary text-[15px] leading-relaxed max-w-2xl mb-8 font-reading">
              {story.synopsis}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-5 text-[12px] text-text-tertiary mb-6">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                <path d="M5 5h6M5 8h4" />
              </svg>
              {story.chapters.length} chapter{story.chapters.length !== 1 ? "s" : ""}
            </span>
            {totalWords > 0 && (
              <span>{totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords} words</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Start Reading CTA */}
            {publishedChapters.length > 0 && (
              <Link
                href={`/story/${slug}/read/${publishedChapters[0].id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 hover:shadow-lg hover:shadow-amber/15"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
                  <path d="M8 5.5V14" />
                </svg>
                Start Reading
              </Link>
            )}

            {/* Follow */}
            <button
              onClick={handleFollow}
              disabled={followLoading || !session?.user}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-medium transition-all duration-200 ${
                hasFollowed
                  ? "bg-sage/10 border-sage/25 text-sage"
                  : "bg-surface/80 border-border text-text-secondary hover:border-sage/25 hover:text-sage"
              } ${!session?.user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill={hasFollowed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <path d="M4 2v12l4-3 4 3V2H4z" />
              </svg>
              {hasFollowed ? "Following" : "Follow"}
              {followCount > 0 && <span className="text-[11px] opacity-60">{followCount}</span>}
            </button>

            {/* Spark */}
            <button
              onClick={handleSpark}
              disabled={sparkLoading || !session?.user}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-medium transition-all duration-200 ${
                hasSparked
                  ? "bg-amber/10 border-amber/25 text-amber"
                  : "bg-surface/80 border-border text-text-secondary hover:border-amber/25 hover:text-amber"
              } ${!session?.user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill={hasSparked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
              </svg>
              {sparkCount > 0 ? sparkCount : "Spark"}
            </button>

            {/* Edit for owner */}
            {session?.user?.id === story.userId && (
              <Link
                href={`/write/${story.id}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border text-paper text-[13px] font-medium rounded-full hover:border-amber/25 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                </svg>
                Edit Story
              </Link>
            )}
          </div>
        </motion.div>

        {/* Chapters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-16">
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-5 block">
            Chapters
          </span>

          {story.chapters.length > 0 ? (
            <div className="space-y-2">
              {story.chapters.map((chapter, i) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                >
                  {chapter.status === "published" ? (
                    <Link href={`/story/${slug}/read/${chapter.id}`} className="block">
                      <div className="bg-surface/80 border border-border rounded-xl px-5 py-4 flex items-center justify-between hover:border-amber/15 hover:bg-surface transition-all duration-200 group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <span className="text-text-ghost text-[12px] font-mono w-7 text-right tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3 className="text-paper text-[14px] font-medium group-hover:text-amber transition-colors">
                              {chapter.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-tertiary">
                              {chapter.wordCount > 0 && <span>{chapter.wordCount.toLocaleString()} words</span>}
                              <span className="text-sage/80">Published</span>
                            </div>
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber group-hover:translate-x-0.5 transition-all">
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-surface/40 border border-border-subtle rounded-xl px-5 py-4 flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-4">
                        <span className="text-text-ghost text-[12px] font-mono w-7 text-right tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3 className="text-paper text-[14px] font-medium">{chapter.title}</h3>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-tertiary">
                            {chapter.wordCount > 0 && <span>{chapter.wordCount.toLocaleString()} words</span>}
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
            <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
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
