"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";
import type { ApiStory, ApiReadingProgress } from "@/types/api";

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

function getTimeOfDay(): { greeting: string; backdrop: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: "Burning the midnight oil", backdrop: "/dashboard/study-night.png" };
  if (hour < 12) return { greeting: "Good morning", backdrop: "/dashboard/study-morning.png" };
  if (hour < 17) return { greeting: "Good afternoon", backdrop: "/dashboard/study-afternoon.png" };
  if (hour < 21) return { greeting: "Good evening", backdrop: "/dashboard/study-night.png" };
  return { greeting: "Burning the midnight oil", backdrop: "/dashboard/study-night.png" };
}

// ── Animated stat counter ────────────────────────────────────
function AnimatedStat({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-display text-2xl md:text-3xl font-bold ${accent}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">
        {label}
      </span>
    </div>
  );
}

// ── Active story — the featured "tome on the easel" ──────────
function ActiveStorySpotlight({ story }: { story: ApiStory }) {
  const href = story.writingMode === "campaign" ? `/campaign/${story.id}` : `/write/${story.id}`;

  return (
    <Link href={href} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
      >
        {/* Background — cover image or gradient */}
        <div className="absolute inset-0">
          {story.coverImageUrl ? (
            <img
              src={story.coverImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-75 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber/8 via-surface to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-void/20 via-transparent to-void/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/60 via-void/20 to-transparent" />
        </div>

        <div className="relative flex items-center gap-8 p-8">
          {/* Book cover */}
          <div className="hidden sm:block flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden border border-border shadow-lg shadow-void/50 group-hover:shadow-amber/10 transition-shadow duration-300">
            {story.coverImageUrl ? (
              <img
                src={story.coverImageUrl}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber/20 to-amber/5 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber/40">
                  <path d="M2 3l9 3.5L20 3v14l-9 3.5L2 17V3z" />
                  <path d="M11 6.5V20" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.12em] text-amber font-medium">Currently Writing</span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            </div>
            <h3 className="font-display text-xl md:text-2xl text-paper font-semibold truncate group-hover:text-amber transition-colors">
              {story.title}
            </h3>
            {story.synopsis && (
              <p className="text-text-secondary text-[13px] mt-1.5 line-clamp-2 leading-relaxed max-w-lg">
                {story.synopsis}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-[11px] text-text-ghost">
              <span>{story.totalWords.toLocaleString()} words</span>
              <span className="text-border">·</span>
              <span>{story.chapterCount} {story.chapterCount === 1 ? "chapter" : "chapters"}</span>
              <span className="text-border">·</span>
              <span>Edited {formatTimeAgo(story.updatedAt)}</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-border group-hover:border-amber/30 group-hover:bg-amber/5 transition-all duration-300">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber transition-colors group-hover:translate-x-0.5 duration-300">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [followedStories, setFollowedStories] = useState<ApiStory[]>([]);
  const [continueReading, setContinueReading] = useState<ApiReadingProgress[]>([]);
  const [continueLoading, setContinueLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [followedLoading, setFollowedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;

    async function fetchAll() {
      // Stories fetch is always needed
      const storiesPromise = fetch("/api/stories?mine=true")
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.stories) setStories(json.data.stories);
          else setError(json.error?.message || "Failed to load stories");
        })
        .catch(() => setError("Failed to load stories"))
        .finally(() => setLoading(false));

      // Following + reading progress need auth
      if (userId) {
        const followingPromise = fetch(`/api/users/${userId}/following`)
          .then((r) => r.json())
          .then((json) => {
            if (json.data?.stories) setFollowedStories(json.data.stories);
          })
          .catch(() => {})
          .finally(() => setFollowedLoading(false));

        const progressPromise = fetch("/api/reading-progress")
          .then((r) => r.json())
          .then((json) => setContinueReading(json.data || []))
          .catch(() => {})
          .finally(() => setContinueLoading(false));

        await Promise.all([storiesPromise, followingPromise, progressPromise]);
      } else {
        setFollowedLoading(false);
        setContinueLoading(false);
        await storiesPromise;
      }
    }

    fetchAll();
  }, [session?.user?.id]);

  const totalWords = stories.reduce((sum, s) => sum + (s.totalWords || 0), 0);
  const totalChapters = stories.reduce((sum, s) => sum + (s.chapterCount || 0), 0);
  const totalSparks = stories.reduce((sum, s) => sum + (s.sparkCount || 0), 0);

  // Most recently edited story = the active one
  const activeStory = useMemo(() => {
    if (stories.length === 0) return null;
    return [...stories].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [stories]);

  const otherStories = useMemo(() => {
    if (!activeStory) return stories;
    return stories.filter((s) => s.id !== activeStory.id);
  }, [stories, activeStory]);

  const { greeting, backdrop } = getTimeOfDay();
  const firstName = session?.user?.name?.split(" ")[0] || "Writer";

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Opening your sanctum...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Hero area with backdrop ── */}
      <div className="relative overflow-hidden">
        {/* Time-of-day backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={backdrop}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: "var(--t-backdrop-opacity)" }}
          />
          {/* Gradient overlays to blend edges into void */}
          <div className="absolute inset-0 bg-gradient-to-b from-void/30 via-transparent to-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/40 via-transparent to-void/40" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-8">
          {/* Greeting + New Story */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between mb-10"
          >
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-text-ghost text-[12px] uppercase tracking-[0.18em] font-display mb-2"
              >
                {greeting}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-display text-3xl md:text-4xl text-paper font-semibold"
              >
                {firstName}&apos;s <span className="text-gold italic">Sanctum</span>
              </motion.h1>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
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
          </motion.div>

          {/* Stats bar — elegant inline */}
          {stories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-center gap-8 md:gap-12 py-6 mb-8 border-y border-border/50"
            >
              <AnimatedStat value={stories.length} label="Stories" accent="text-amber" />
              <div className="w-px h-8 bg-border/50" />
              <AnimatedStat
                value={totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
                label="Words Written"
                accent="text-teal"
              />
              <div className="w-px h-8 bg-border/50" />
              <AnimatedStat value={totalChapters} label="Chapters" accent="text-lavender" />
              <div className="w-px h-8 bg-border/50 hidden sm:block" />
              <div className="hidden sm:block">
                <AnimatedStat value={totalSparks} label="Sparks" accent="text-rose" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Fade to void at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-6 px-4 py-3 bg-rose/10 border border-rose/20 rounded-xl text-rose text-[13px]">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* ── Active Story Spotlight ── */}
        {activeStory && (
          <div className="mb-12">
            <ActiveStorySpotlight story={activeStory} />
          </div>
        )}

        {/* ── Continue Reading ── */}
        {!continueLoading && continueReading.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-12"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Continue Reading
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueReading.slice(0, 6).map((item, i) => (
                <motion.div
                  key={item.storyId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <Link
                    href={`/story/${item.storySlug || item.storyId}/read/${item.chapterId}`}
                    className="card-page p-4 flex items-start gap-4 group transition-all duration-200 hover:border-amber/20"
                  >
                    {/* Cover thumbnail */}
                    <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-amber/15 to-amber/5 border border-border-subtle flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {item.storyCoverUrl ? (
                        <img
                          src={item.storyCoverUrl}
                          alt={item.storyTitle}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-text-ghost">
                          <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
                          <path d="M8 5.5V14" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-paper text-[13px] font-medium truncate group-hover:text-amber transition-colors">
                        {item.storyTitle}
                      </h3>
                      {item.authorName && (
                        <p className="text-text-ghost text-[11px] mt-0.5 truncate">
                          by {item.authorName}
                        </p>
                      )}
                      <p className="text-text-tertiary text-[11px] mt-1 truncate">
                        Ch. {item.chapterSortOrder + 1}: {item.chapterTitle}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber/60 rounded-full transition-all"
                          style={{ width: `${Math.max(item.scrollPercent, 5)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-text-ghost mt-1">
                        {item.scrollPercent}% through chapter
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Your Works (remaining stories) ── */}
        {stories.length > 0 ? (
          <>
            {otherStories.length > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="flourish mb-6">
                    <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                      Your Works
                    </span>
                  </div>
                </motion.div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                  {otherStories.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
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
            )}
          </>
        ) : (
          /* ── Empty state — no stories yet ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center text-center py-20"
          >
            <div className="relative w-32 h-32 mb-8">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
              <div className="absolute -inset-6 bg-amber/5 rounded-full blur-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  className="text-amber/50"
                >
                  <path d="M32 5C26 10 20 16 15 22C10 28 8 33 7 36L4 37L3 34C4 30 8 22 14 15C20 8 27 5 32 5Z" />
                  <circle cx="6" cy="36" r="2" />
                  <path d="M20 10l6-4" strokeDasharray="2 2" />
                  {/* Sparkle */}
                  <path d="M30 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" stroke="none" opacity="0.4" />
                </svg>
              </div>
            </div>
            <h2 className="font-display text-2xl text-paper mb-2">
              The ink awaits
            </h2>
            <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
              Your sanctum is ready. Every great tale starts with a single word —
              open a blank page and let the magic flow.
            </p>
            <Link
              href="/create"
              className="bg-amber text-void font-semibold px-7 py-3 rounded-full hover:bg-amber-light transition-all duration-200 text-[14px] hover:shadow-lg hover:shadow-amber/15"
            >
              Begin Your First Story
            </Link>
          </motion.div>
        )}

        {/* ── Section divider ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flourish my-8"
        >
          <span className="text-text-ghost text-sm font-display">❧</span>
        </motion.div>

        {/* ── Reading List ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="flourish mb-6">
            <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
              Reading List
            </span>
          </div>
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
                transition={{ delay: 0.6 + i * 0.05 }}
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
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center justify-center text-center py-14"
          >
            <div className="relative w-20 h-20 mb-5">
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
    </div>
  );
}
