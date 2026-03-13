"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import GenrePill from "@/components/shared/GenrePill";
import StoryCard from "@/components/shared/StoryCard";
import ReportModal from "@/components/shared/ReportModal";

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
  dedication: string | null;
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

interface Update {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

const FORMAT_LABELS: Record<string, string> = {
  novel: "Novel",
  webtoon: "Webtoon",
  poetry: "Poetry",
  illustrated: "Illustrated Novel",
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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface Collaborator {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { displayName: string | null; avatarUrl: string | null } | null;
}

type Tab = "chapters" | "about" | "updates";

const TABS: { key: Tab; label: string }[] = [
  { key: "chapters", label: "Chapters" },
  { key: "about", label: "About" },
  { key: "updates", label: "Updates" },
];

const ROLE_COLORS: Record<string, string> = {
  writer: "text-amber bg-amber/10",
  illustrator: "text-lavender bg-lavender/10",
  editor: "text-teal bg-teal/10",
  worldbuilder: "text-sage bg-sage/10",
};

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
  const [activeTab, setActiveTab] = useState<Tab>("chapters");

  // Updates state
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const [updateContent, setUpdateContent] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [readingProgressChapterId, setReadingProgressChapterId] = useState<string | null>(null);
  const [readingProgressPercent, setReadingProgressPercent] = useState<number>(0);
  const [moreByAuthor, setMoreByAuthor] = useState<Array<{
    id: string; title: string; format: string; synopsis: string | null;
    coverImageUrl: string | null; genres: string[]; status: string;
    slug: string | null; authorName: string | null; chapterCount: number;
    totalWords: number; sparkCount: number; contentRating: string;
  }>>([]);
  const [moreInGenre, setMoreInGenre] = useState<typeof moreByAuthor>([]);

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

        const [sparkRes, followRes, collabRes] = await Promise.all([
          fetch(`/api/stories/${json.data.id}/sparks`),
          fetch(`/api/stories/${json.data.id}/follows`),
          fetch(`/api/stories/${json.data.id}/collaborators`),
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
        if (collabRes.ok) {
          const collabJson = await collabRes.json();
          setCollaborators(collabJson.data?.filter((c: Collaborator) => c.status === "accepted") || []);
        }

        // Fetch reading progress if logged in
        if (session?.user?.id) {
          try {
            const progressRes = await fetch(`/api/reading-progress?storyId=${json.data.id}`);
            if (progressRes.ok) {
              const progressJson = await progressRes.json();
              if (progressJson.data) {
                setReadingProgressChapterId(progressJson.data.chapterId);
                setReadingProgressPercent(progressJson.data.scrollPercent || 0);
              }
            }
          } catch {}
        }
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug, session?.user?.id]);

  // Fetch updates when switching to the updates tab
  useEffect(() => {
    if (activeTab !== "updates" || !story || updatesLoaded) return;

    async function fetchUpdates() {
      setUpdatesLoading(true);
      try {
        const res = await fetch(`/api/stories/${story!.id}/updates`);
        if (res.ok) {
          const json = await res.json();
          setUpdates(json.data || []);
        }
      } catch {
        // silently fail
      } finally {
        setUpdatesLoading(false);
        setUpdatesLoaded(true);
      }
    }
    fetchUpdates();
  }, [activeTab, story, updatesLoaded]);

  // Fetch "More by Author" and "More in Genre"
  useEffect(() => {
    if (!story) return;

    async function fetchRelated() {
      try {
        // More by same author
        const authorRes = await fetch(
          `/api/stories?public=true&limit=5&sort=most-sparked`
        );
        if (authorRes.ok) {
          const json = await authorRes.json();
          const others = (json.data.stories || []).filter(
            (s: { id: string; userId: string }) =>
              s.userId === story!.userId && s.id !== story!.id
          );
          setMoreByAuthor(others.slice(0, 4));
        }

        // More in same genre
        if (story!.genres.length > 0) {
          const genreRes = await fetch(
            `/api/stories?public=true&limit=20&sort=most-sparked`
          );
          if (genreRes.ok) {
            const json = await genreRes.json();
            const primaryGenre = story!.genres[0];
            const others = (json.data.stories || []).filter(
              (s: { id: string; genres: string[] }) =>
                s.id !== story!.id && s.genres.includes(primaryGenre)
            );
            setMoreInGenre(others.slice(0, 6));
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchRelated();
  }, [story]);

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

  const handlePostUpdate = async () => {
    if (!story || postingUpdate || !updateContent.trim()) return;
    setPostingUpdate(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updateContent.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setUpdates((prev) => [json.data, ...prev]);
        setUpdateContent("");
      }
    } catch {
      // silently fail
    } finally {
      setPostingUpdate(false);
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
  const isOwner = session?.user?.id === story.userId;

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
            {/* Start / Continue Reading CTA */}
            {publishedChapters.length > 0 && (
              <Link
                href={
                  readingProgressChapterId
                    ? `/story/${slug}/read/${readingProgressChapterId}`
                    : `/story/${slug}/read/${publishedChapters[0].id}`
                }
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 hover:shadow-lg hover:shadow-amber/15"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
                  <path d="M8 5.5V14" />
                </svg>
                {readingProgressChapterId ? "Continue Reading" : "Start Reading"}
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
            {isOwner && (
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

            {/* Report */}
            {!isOwner && session?.user && (
              <button
                onClick={() => setShowReport(true)}
                className="text-text-ghost hover:text-rose text-[12px] transition-colors ml-1"
              >
                Report
              </button>
            )}
          </div>

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Collaborators</span>
              {collaborators.map((collab) => (
                <Link
                  key={collab.id}
                  href={`/profile/${collab.userId}`}
                  className="flex items-center gap-2 bg-surface/60 border border-border-subtle rounded-full pl-1 pr-3 py-1 hover:border-amber/20 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[9px] font-display font-semibold flex-shrink-0 overflow-hidden">
                    {collab.user?.avatarUrl ? (
                      <img src={collab.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (collab.user?.displayName || "?").charAt(0)
                    )}
                  </div>
                  <span className="text-[12px] text-text-secondary group-hover:text-paper transition-colors">
                    {collab.user?.displayName || "Anonymous"}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[collab.role] || "text-text-ghost bg-elevated"}`}>
                    {collab.role}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Workshop & Open Calls links */}
          {(isOwner || collaborators.length > 0) && (
            <div className="mt-4 flex items-center gap-3">
              <Link
                href={`/story/${slug}/workshop`}
                className="flex items-center gap-2 text-[12px] text-text-secondary hover:text-amber transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M5 6h6M5 8h4M5 10h5" />
                </svg>
                Workshop
              </Link>
              <Link
                href={`/story/${slug}/calls`}
                className="flex items-center gap-2 text-[12px] text-text-secondary hover:text-amber transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v6M5 8h6" />
                </svg>
                Open Calls
              </Link>
            </div>
          )}
        </motion.div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 border-b border-border-active mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative px-4 py-3 text-[13px] font-medium transition-colors ${
                activeTab === t.key
                  ? "text-amber"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <motion.div
                  layoutId="story-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "chapters" && (
            <motion.div
              key="chapters"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-16"
            >
              {/* Reading time estimate */}
              {totalWords > 0 && (
                <div className="flex items-center gap-2 mb-5 text-[12px] text-text-tertiary">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3l2 1.5" />
                  </svg>
                  ~{Math.ceil(totalWords / 250)} min read
                </div>
              )}

              {story.chapters.length > 0 ? (
                <div className="space-y-2">
                  {story.chapters.map((chapter, i) => (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.03 }}
                    >
                      {chapter.status === "published" ? (
                        <Link href={`/story/${slug}/read/${chapter.id}`} className="block">
                          <div className="card-page px-5 py-4 flex items-center justify-between transition-all duration-200 group cursor-pointer">
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
          )}

          {activeTab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-16 space-y-8"
            >
              {/* Synopsis */}
              {story.synopsis && (
                <div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 block">
                    Synopsis
                  </span>
                  <p className="text-text-secondary text-[14px] leading-relaxed font-reading max-w-2xl">
                    {story.synopsis}
                  </p>
                </div>
              )}

              {/* Dedication */}
              {story.dedication && (
                <div className="bg-surface/60 border border-border-subtle rounded-xl p-6">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 block">
                    Dedication
                  </span>
                  <p className="text-text-secondary text-[14px] leading-relaxed font-reading italic">
                    {story.dedication}
                  </p>
                </div>
              )}

              {/* Story Details */}
              <div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-4 block">
                  Story Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-surface/60 border border-border-subtle rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1">Format</p>
                    <p className="text-paper text-[13px] font-medium">
                      {FORMAT_LABELS[story.format] || story.format}
                    </p>
                  </div>
                  <div className="bg-surface/60 border border-border-subtle rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1">Language</p>
                    <p className="text-paper text-[13px] font-medium">English</p>
                  </div>
                  <div className="bg-surface/60 border border-border-subtle rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1">Content Rating</p>
                    <p className="text-paper text-[13px] font-medium">
                      {RATING_LABELS[story.contentRating] || story.contentRating}
                    </p>
                  </div>
                  <div className="bg-surface/60 border border-border-subtle rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1">Created</p>
                    <p className="text-paper text-[13px] font-medium">
                      {new Date(story.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Author Bio */}
              {story.author && (
                <div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-4 block">
                    About the Author
                  </span>
                  <div className="bg-surface/60 border border-border-subtle rounded-xl p-5">
                    <Link href={`/profile/${story.author.id}`} className="flex items-start gap-4 group">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-sm font-display font-semibold flex-shrink-0 overflow-hidden">
                        {story.author.avatarUrl ? (
                          <img src={story.author.avatarUrl} alt={story.author.displayName || ""} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (story.author.displayName || "?").charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-paper text-[14px] font-medium group-hover:text-amber transition-colors">
                          {story.author.displayName}
                        </p>
                        {story.author.bio ? (
                          <p className="text-text-secondary text-[13px] leading-relaxed mt-1 line-clamp-3">
                            {story.author.bio}
                          </p>
                        ) : (
                          <p className="text-text-ghost text-[13px] mt-1 italic">
                            No bio yet.
                          </p>
                        )}
                        <span className="inline-block mt-2 text-amber text-[12px] group-hover:underline">
                          View profile
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "updates" && (
            <motion.div
              key="updates"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-16"
            >
              {/* Post Update form (owner only) */}
              {isOwner && (
                <div className="bg-surface/60 border border-border-subtle rounded-xl p-5 mb-6">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 block">
                    Post an Update
                  </span>
                  <textarea
                    value={updateContent}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) setUpdateContent(e.target.value);
                    }}
                    placeholder="Share an update with your readers..."
                    rows={3}
                    className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-text-ghost">
                      {updateContent.length}/1000
                    </span>
                    <button
                      onClick={handlePostUpdate}
                      disabled={postingUpdate || !updateContent.trim()}
                      className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {postingUpdate ? "Posting..." : "Post Update"}
                    </button>
                  </div>
                </div>
              )}

              {/* Updates feed */}
              {updatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                </div>
              ) : updates.length > 0 ? (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="bg-surface/60 border border-border-subtle rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[11px] font-display font-semibold flex-shrink-0 overflow-hidden">
                          {update.author.avatarUrl ? (
                            <img src={update.author.avatarUrl} alt={update.author.displayName || ""} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (update.author.displayName || "?").charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-paper text-[13px] font-medium">
                            {update.author.displayName}
                          </p>
                        </div>
                        <span className="text-[11px] text-text-ghost flex-shrink-0">
                          {relativeTime(update.createdAt)}
                        </span>
                      </div>
                      <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                        {update.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <p className="text-text-secondary text-[13px]">
                    No updates yet
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* More by Author */}
        {moreByAuthor.length > 0 && story.author && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flourish mb-5">
              <span className="font-display text-sm text-text-secondary tracking-wide">
                More by {story.author.displayName}
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {moreByAuthor.map((s) => (
                <div key={s.id} className="flex-shrink-0 w-[280px]">
                  <StoryCard
                    title={s.title}
                    author={s.authorName || undefined}
                    genres={s.genres}
                    wordCount={s.totalWords || 0}
                    chapterCount={s.chapterCount || 0}
                    sparkCount={s.sparkCount || 0}
                    contentRating={s.contentRating}
                    slug={s.slug || s.id}
                    coverUrl={s.coverImageUrl || undefined}
                    excerpt={s.synopsis || undefined}
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* More in Genre */}
        {moreInGenre.length > 0 && story.genres.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="flourish mb-5">
              <span className="font-display text-sm text-text-secondary tracking-wide">
                More in {story.genres[0]}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {moreInGenre.map((s) => (
                <StoryCard
                  key={s.id}
                  title={s.title}
                  author={s.authorName || undefined}
                  genres={s.genres}
                  wordCount={s.totalWords || 0}
                  chapterCount={s.chapterCount || 0}
                  sparkCount={s.sparkCount || 0}
                  contentRating={s.contentRating}
                  slug={s.slug || s.id}
                  coverUrl={s.coverImageUrl || undefined}
                  excerpt={s.synopsis || undefined}
                />
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        storyId={story.id}
      />
    </div>
  );
}
