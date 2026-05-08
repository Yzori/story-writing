"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";
import AttentionStrip from "@/components/dashboard/AttentionStrip";
import type { ApiStory, ApiReadingProgress, ApiNotification } from "@/types/api";

// ── Helpers ─────────────────────────────────────────────────

import { formatTimeAgo, formatNumber } from "@/lib/format";

function getTimeOfDay(): { greeting: string; backdrop: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: "Burning the midnight oil", backdrop: "/dashboard/study-night.png" };
  if (hour < 12) return { greeting: "Good morning", backdrop: "/dashboard/study-morning.png" };
  if (hour < 17) return { greeting: "Good afternoon", backdrop: "/dashboard/study-afternoon.png" };
  if (hour < 21) return { greeting: "Good evening", backdrop: "/dashboard/study-night.png" };
  return { greeting: "Burning the midnight oil", backdrop: "/dashboard/study-night.png" };
}


// ── Creator Hub data shapes ─────────────────────────────────

interface CreatorHubData {
  subscriberCount: number;
  monthlyIncome: number;
  totalEarned: number;
  tipsThisMonth: number;
  activeCommissions: number;
  loaded: boolean;
}

// ── Animated stat counter ───────────────────────────────────

function StatCard({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-ink/40 px-3 sm:px-5 py-4 flex flex-col items-center gap-1.5 min-w-0 w-full">
      <span className={`font-display text-xl md:text-2xl font-bold tabular-nums truncate max-w-full ${accent}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost font-medium">
        {label}
      </span>
    </div>
  );
}

// ── Creator Hub Card ────────────────────────────────────────

function CreatorHubCard({
  icon,
  value,
  label,
  sublabel,
  href,
  accentColor,
  accentGlow,
  delay,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  href: string;
  accentColor: string;
  accentGlow: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={href} className="group block">
        <div className="relative rounded-xl border border-border bg-ink/50 p-5 transition-all duration-300 hover:border-border/80 hover:bg-ink/70 overflow-hidden">
          {/* Subtle ambient glow */}
          <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${accentGlow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-surface border border-border/50 ${accentColor}`}>
                {icon}
              </div>
              <div>
                <div className={`font-display text-xl font-bold ${accentColor}`}>
                  {value}
                </div>
                <div className="text-[11px] text-text-ghost leading-tight">{label}</div>
                {sublabel && (
                  <div className="text-[10px] text-text-ghost/60 mt-0.5">{sublabel}</div>
                )}
              </div>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-ghost/40 group-hover:text-text-ghost group-hover:translate-x-0.5 transition-all duration-300"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Quick Action Pill ───────────────────────────────────────

function QuickActionPill({
  href,
  label,
  icon,
  accent = "text-text-secondary",
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/60 bg-ink/30 text-[12px] font-medium ${accent} hover:bg-ink/60 hover:border-border transition-all duration-200`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Notification icon by type ───────────────────────────────

function NotificationIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  switch (type) {
    case "spark":
      return (
        <svg className={`${cls} text-amber`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
        </svg>
      );
    case "follow":
      return (
        <svg className={`${cls} text-lavender`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4" />
        </svg>
      );
    case "comment":
      return (
        <svg className={`${cls} text-teal`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h12v8H5l-3 3V3z" />
        </svg>
      );
    case "tip":
      return (
        <svg className={`${cls} text-gold`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v6M5.5 8h5" />
        </svg>
      );
    default:
      return (
        <svg className={`${cls} text-text-ghost`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3M8 10.5v.5" />
        </svg>
      );
  }
}

// ── Active story — the featured "tome on the easel" ─────────

function ActiveStorySpotlight({ story }: { story: ApiStory }) {
  const href = story.writingMode === "campaign"
    ? `/campaign/${story.id}`
    : story.writingMode === "co-op"
      ? `/write/${story.id}/co-op`
      : `/write/${story.id}`;

  return (
    <Link href={href} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
      >
        {/* Background -- cover image or gradient */}
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

// ── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [followedStories, setFollowedStories] = useState<ApiStory[]>([]);
  const [continueReading, setContinueReading] = useState<ApiReadingProgress[]>([]);
  const [continueLoading, setContinueLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [followedLoading, setFollowedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [creatorHub, setCreatorHub] = useState<CreatorHubData>({
    subscriberCount: 0,
    monthlyIncome: 0,
    totalEarned: 0,
    tipsThisMonth: 0,
    activeCommissions: 0,
    loaded: false,
  });

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

      // Following + reading progress + creator data need auth
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

        const notificationsPromise = fetch("/api/notifications?limit=3")
          .then((r) => r.json())
          .then((json) => {
            if (json.data?.notifications) setNotifications(json.data.notifications);
          })
          .catch(() => {});

        // Creator Hub: fetch subscriber count, earnings, commissions in parallel
        const creatorPromise = Promise.allSettled([
          fetch("/api/creator/circle").then((r) => r.ok ? r.json() : null),
          fetch("/api/user/earnings").then((r) => r.ok ? r.json() : null),
          fetch("/api/scriptorium/commissions?role=artisan").then((r) => r.ok ? r.json() : null),
        ]).then(([circleResult, earningsResult, commissionsResult]) => {
          const circle = circleResult.status === "fulfilled" ? circleResult.value : null;
          const earnings = earningsResult.status === "fulfilled" ? earningsResult.value : null;
          const commissions = commissionsResult.status === "fulfilled" ? commissionsResult.value : null;

          const activeCount = commissions?.data?.commissions
            ? commissions.data.commissions.filter(
                (c: { status: string }) => c.status !== "completed" && c.status !== "cancelled"
              ).length
            : 0;

          setCreatorHub({
            subscriberCount: circle?.data?.subscriberCount || 0,
            monthlyIncome: circle?.data?.monthlyIncome || 0,
            totalEarned: earnings?.data?.totalEarned || 0,
            tipsThisMonth: earnings?.data?.tipsThisMonth || 0,
            activeCommissions: activeCount,
            loaded: true,
          });
        });

        await Promise.all([storiesPromise, followingPromise, progressPromise, notificationsPromise, creatorPromise]);
      } else {
        setFollowedLoading(false);
        setContinueLoading(false);
        setCreatorHub((prev) => ({ ...prev, loaded: true }));
        await storiesPromise;
      }
    }

    fetchAll();
  }, [session?.user?.id]);

  const totalWords = stories.reduce((sum, s) => sum + Number(s.totalWords || 0), 0);
  const totalChapters = stories.reduce((sum, s) => sum + Number(s.chapterCount || 0), 0);
  const totalSparks = stories.reduce((sum, s) => sum + Number(s.sparkCount || 0), 0);

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
  const isLoggedIn = !!session?.user?.id;

  // Show creator hub row only if there is any activity
  const showCreatorHub =
    creatorHub.loaded &&
    (creatorHub.subscriberCount > 0 || creatorHub.tipsThisMonth > 0 || creatorHub.activeCommissions > 0);

  // A writer is "early-stage" if they haven't written anything meaningful yet.
  const isEarlyStage = stories.length > 0 && totalWords < 500 && totalSparks === 0;
  const showStatsGrid = stories.length > 0 && !isEarlyStage;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Opening your atelier...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-24">
      {/* ── Hero area with backdrop ── */}
      <div className="relative overflow-hidden mb-10">
        <div className="absolute inset-0 pointer-events-none">
          <img src={backdrop} alt="" className="w-full h-full object-cover opacity-[0.55] dark:opacity-[0.6]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/30 via-transparent to-void/30" />
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-void to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <motion.h1 className="font-display text-4xl md:text-5xl text-paper font-semibold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {greeting}, <span className="text-gold italic">{firstName}</span>
            </motion.h1>
            <motion.p className="text-text-secondary mt-3 text-lg font-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              Welcome back to your creator's sanctuary.
            </motion.p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="px-4 py-3 bg-rose/10 border border-rose/20 rounded-xl text-rose text-[13px]">{error}</div>
        </div>
      )}

      {/* ── BENTO GRID ATELIER LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: CREATIVE FLOW (Col-Span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            
            {/* 0. Today — pending items waiting on the creator */}
            <AttentionStrip />

            {/* 1. Active Story Spotlight */}
            {activeStory ? (
              <div className="flex flex-col gap-4">
                <div className="flourish">
                  <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">On The Desk</span>
                </div>
                <div className="p-1 rounded-3xl bg-gradient-to-b from-border-subtle/50 to-transparent border border-border/30">
                  <div className="rounded-[1.4rem] bg-ink/30 overflow-hidden shadow-2xl">
                     <ActiveStorySpotlight story={activeStory} />
                  </div>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center justify-center text-center py-20 border border-border-subtle/50 rounded-3xl bg-ink/20">
                <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
                  <div className="absolute -inset-6 bg-amber/5 rounded-full blur-3xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-amber/50">
                      <path d="M32 5C26 10 20 16 15 22C10 28 8 33 7 36L4 37L3 34C4 30 8 22 14 15C20 8 27 5 32 5Z" />
                      <circle cx="6" cy="36" r="2" />
                      <path d="M20 10l6-4" strokeDasharray="2 2" />
                      <path d="M30 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" stroke="none" opacity="0.4" />
                    </svg>
                  </div>
                </div>
                <h2 className="font-display text-2xl text-paper mb-2">The ink awaits</h2>
                <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">Every great tale starts with a single word. Pick a path to begin.</p>
                <Link href="/create" className="bg-amber text-void font-semibold px-8 py-3.5 rounded-full hover:bg-amber-light transition-all text-sm hover:shadow-[0_0_20px_rgba(200,150,60,0.3)]">
                  Begin Your First Story
                </Link>
              </motion.div>
            )}

            {/* 2. Getting Started Hints */}
            {isEarlyStage && activeStory && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href={activeStory.writingMode === "campaign" ? `/campaign/${activeStory.id}` : `/write/${activeStory.id}`} className="group rounded-2xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-amber/30 hover:bg-amber/5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber/10 border border-amber/20 text-amber mb-4"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg></div>
                    <div className="font-display text-[15px] text-paper font-medium mb-1">Keep writing</div>
                    <div className="text-[12px] text-text-ghost leading-relaxed">Pick up "{activeStory.title}" where you left off.</div>
                  </Link>
                  <Link href="/read" className="group rounded-2xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-lavender/30 hover:bg-lavender/5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-lavender/10 border border-lavender/20 text-lavender mb-4"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h5a3 3 0 013 3v8a2 2 0 00-2-2H2V3zM14 3H9a3 3 0 00-3 3v8a2 2 0 012-2h6V3z"/></svg></div>
                    <div className="font-display text-[15px] text-paper font-medium mb-1">Read others</div>
                    <div className="text-[12px] text-text-ghost leading-relaxed">Drop into For You — hand-picked for you.</div>
                  </Link>
                  <Link href="/browse" className="group rounded-2xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-teal/30 hover:bg-teal/5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal/10 border border-teal/20 text-teal mb-4"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg></div>
                    <div className="font-display text-[15px] text-paper font-medium mb-1">Explore catalog</div>
                    <div className="text-[12px] text-text-ghost leading-relaxed">Browse genres and creators to follow.</div>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* 3. Your Other Works */}
            {stories.length > 0 && otherStories.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-xl text-paper">Drafts & Revisions</h3>
                  <Link href="/profile" className="text-sm text-text-ghost hover:text-amber transition-colors">View All &rarr;</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {otherStories.map((story, i) => (
                    <motion.div key={story.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                      <StoryCard
                        title={story.title} genres={story.genres} wordCount={story.totalWords || 0}
                        chapterCount={story.chapterCount || 0} sparkCount={story.sparkCount || 0} contentRating={story.contentRating}
                        status={story.status as "draft" | "in-progress" | "complete"} slug={story.slug || story.id}
                        href={story.writingMode === "campaign" ? `/campaign/${story.id}` : `/write/${story.id}`}
                        coverUrl={story.coverImageUrl || undefined} lastEdited={formatTimeAgo(story.updatedAt)}
                        format={story.format}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. Continue Reading (Scrollable Horizontal Row) */}
            {!continueLoading && continueReading.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="pt-4 border-t border-border-subtle/50">
                <h3 className="font-display text-xl text-paper mb-5">Continue Reading</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {continueReading.slice(0, 4).map((item, i) => (
                    <Link key={item.storyId} href={`/story/${item.storySlug || item.storyId}/read/${item.chapterId}`} className="card-page p-4 flex items-start gap-4 group transition-all duration-300 hover:border-amber/20 hover:bg-surface/60 rounded-2xl">
                      <div className="w-14 h-20 rounded-[4px] bg-gradient-to-br from-amber/15 to-amber/5 border border-border-subtle flex-shrink-0 overflow-hidden shadow-md">
                        {item.storyCoverUrl ? <img src={item.storyCoverUrl} alt={item.storyTitle} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><svg className="w-4 h-4 text-amber/40"><circle cx="8" cy="8" r="4"/></svg></div>}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-paper text-[14px] font-medium truncate group-hover:text-amber transition-colors">{item.storyTitle}</h3>
                        {item.authorName && <p className="text-text-ghost text-[12px] truncate">by {item.authorName}</p>}
                        <div className="flex items-center justify-between mt-3 text-[11px] text-text-tertiary"><span className="truncate">Ch. {item.chapterSortOrder + 1}</span><span>{item.scrollPercent}%</span></div>
                        <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden"><div className="h-full bg-amber/60 rounded-full" style={{ width: `${Math.max(item.scrollPercent, 3)}%` }} /></div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. Followed Library */}
            {!followedLoading && followedStories.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-4 border-t border-border-subtle/50">
                 <div className="flex items-center justify-between mb-5">
                   <h3 className="font-display text-xl text-paper">From the Guild</h3>
                   <Link href="/browse" className="text-sm text-text-ghost hover:text-amber transition-colors">Library &rarr;</Link>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                   {followedStories.slice(0,3).map((story, i) => (
                      <StoryCard
                        key={story.id} title={story.title} author={story.authorName || undefined} genres={story.genres}
                        wordCount={story.totalWords || 0} chapterCount={story.chapterCount || 0} sparkCount={story.sparkCount || 0}
                        contentRating={story.contentRating} status={story.status as "draft" | "in-progress" | "complete"} slug={story.slug || story.id}
                        href={`/story/${story.slug || story.id}`} coverUrl={story.coverImageUrl || undefined}
                        format={story.format}
                      />
                   ))}
                 </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: THE HUB (Col-Span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Command Center (Quick Actions) */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-ink/30 p-6 backdrop-blur-xl shadow-xl">
              <h3 className="font-display text-lg text-paper mb-4 flex items-center gap-2">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 Command Center
              </h3>
              <div className="flex flex-col gap-2.5">
                <Link href="/create" className="flex items-center gap-3 w-full p-3 rounded-xl bg-amber/10 border border-amber/20 hover:bg-amber/20 transition-colors text-amber text-sm font-medium">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg> Begin a New Chapter
                </Link>
                {isLoggedIn && (
                  <div className="grid grid-cols-2 gap-2.5 mt-2">
                    <Link href="/creator/circle" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border bg-surface/40 hover:bg-surface hover:border-gold/30 transition-all text-text-secondary text-[12px] font-medium">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4"/></svg> Subscribers
                    </Link>
                    <Link href="/scriptorium" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border bg-surface/40 hover:bg-surface hover:border-teal/30 transition-all text-text-secondary text-[12px] font-medium">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal"><path d="M2 3h12v10H2zM5 7h6M5 10h3"/></svg> Commissions
                    </Link>
                    <Link href="/settings/ink-drops" className="flex flex-col items-center justify-center gap-2 p-3 col-span-2 rounded-xl border border-border bg-surface/40 hover:bg-surface hover:border-lavender/30 transition-all text-text-secondary text-[12px] font-medium">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lavender"><path d="M8 2C8 2 3 7.5 3 10a5 5 0 0010 0C13 7.5 8 2 8 2z"/></svg> Manage Ink Drops
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* General Stats (At a Glance) */}
            {showStatsGrid && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-2 gap-3 sm:gap-4">
                <StatCard value={formatNumber(totalWords)} label="Words" accent="text-amber" />
                <StatCard value={stories.length} label="Tales" accent="text-teal" />
                <StatCard value={formatNumber(totalChapters)} label="Chapters" accent="text-lavender" />
                <StatCard value={formatNumber(totalSparks)} label="Sparks" accent="text-gold" />
              </motion.div>
            )}

            {/* Creator Hub Earnings/Growth directly in sidebar */}
            {showCreatorHub && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-ink/30 p-6 backdrop-blur-xl">
                <h3 className="font-display text-lg text-paper mb-4">Growth & Earnings</h3>
                <div className="flex flex-col gap-3">
                  {creatorHub.subscriberCount > 0 && <CreatorHubCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4"/></svg>} value={formatNumber(creatorHub.subscriberCount)} label="Subscribers" sublabel={creatorHub.monthlyIncome > 0 ? `${formatNumber(creatorHub.monthlyIncome)} drops/mo` : undefined} href="/creator/circle" accentColor="text-gold" accentGlow="bg-gold/10" delay={0.1} />}
                  {creatorHub.tipsThisMonth > 0 && <CreatorHubCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2C8 2 3 7.5 3 10a5 5 0 0010 0C13 7.5 8 2 8 2z"/></svg>} value={formatNumber(creatorHub.tipsThisMonth)} label="Earned this month" href="/creator/earnings" accentColor="text-teal" accentGlow="bg-teal/10" delay={0.15} />}
                  {creatorHub.activeCommissions > 0 && <CreatorHubCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h12v10H2zM5 7h6M5 10h3"/></svg>} value={creatorHub.activeCommissions} label="Active commissions" href="/scriptorium" accentColor="text-amethyst" accentGlow="bg-amethyst/10" delay={0.2} />}
                </div>
              </motion.div>
            )}

            {/* Recent Notifications Feed */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border border-border bg-ink/30 p-1 backdrop-blur-xl">
              <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center">
                 <h3 className="font-display text-[15px] text-paper">Recent Activity</h3>
                 <Link href="/notifications" className="text-amber text-[12px] font-medium hover:underline">View all</Link>
              </div>
              <div className="flex flex-col">
                {notifications.length > 0 ? notifications.map((notif, i) => (
                  <Link key={notif.id} href={notif.href} className={`flex items-start gap-3 px-5 py-4 hover:bg-surface/40 transition-colors group ${i < notifications.length - 1 ? "border-b border-border/40" : "rounded-b-[15px]"}`}>
                    <div className="mt-0.5"><NotificationIcon type={notif.type} /></div>
                    <div className="flex-1 text-[13px] leading-snug">
                      <p className={`${notif.read ? "text-text-secondary" : "text-text"}`}>{notif.message}</p>
                      <p className="text-[10px] text-text-ghost mt-1.5">{formatTimeAgo(notif.createdAt)}</p>
                    </div>
                  </Link>
                )) : <div className="px-5 py-8 text-center text-text-ghost text-[13px]">All caught up. No new activity.</div>}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
