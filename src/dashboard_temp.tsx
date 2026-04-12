"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";
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
    <div className="rounded-xl border border-border bg-ink/40 px-5 py-4 flex flex-col items-center gap-1.5 min-w-0">
      <span className={`font-display text-xl md:text-2xl font-bold tabular-nums ${accent}`}>
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
  // Used to hide zero-dumping stats and surface getting-started guidance instead.
  const isEarlyStage =
    stories.length > 0 && totalWords < 500 && totalSparks === 0;
  const showStatsGrid = stories.length > 0 && !isEarlyStage;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Hero area with backdrop ── */}
      <div className="relative overflow-hidden">
        {/* Backdrop image — subtle, blended into page */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={backdrop}
            alt=""
            className="w-full h-full object-cover opacity-[0.55] dark:opacity-[0.6]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/30 via-transparent to-void/30" />
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-void to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-6">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-4xl text-paper font-semibold"
            >
              {greeting}, <span className="text-gold italic">{firstName}</span>
            </motion.h1>
          </motion.div>

          {/* ── Quick Actions ── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center gap-2 mb-10"
          >
            <QuickActionPill
              href="/create"
              label="New Story"
              accent="text-gold"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              }
            />
            {isLoggedIn && (
              <>
                <QuickActionPill
                  href="/creator/circle"
                  label="My Subscribers"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4" />
                    </svg>
                  }
                />
                <QuickActionPill
                  href="/scriptorium"
                  label="Commissions"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h12v10H2zM5 7h6M5 10h3" />
                    </svg>
                  }
                />
                <QuickActionPill
                  href="/settings/ink-drops"
                  label="Ink Drops"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2C8 2 3 7.5 3 10a5 5 0 0010 0C13 7.5 8 2 8 2z" />
                    </svg>
                  }
                />
              </>
            )}
          </motion.div>

          {/* ── Stats grid — only shown once the writer has real activity ── */}
          {showStatsGrid && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              <StatCard value={stories.length} label="Stories" accent="text-amber" />
              <StatCard value={formatNumber(totalWords)} label="Words Written" accent="text-teal" />
              <StatCard value={formatNumber(totalChapters)} label="Chapters" accent="text-lavender" />
              <StatCard value={formatNumber(totalSparks)} label="Sparks" accent="text-rose" />
            </motion.div>
          )}
        </div>

        {/* Fade backdrop to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-6 px-4 py-3 bg-rose/10 border border-rose/20 rounded-xl text-rose text-[13px]">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* ── Creator Hub ── */}
        {showCreatorHub && (
          <div className="mb-12">
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Creator Hub
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {creatorHub.subscriberCount > 0 && (
                <CreatorHubCard
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4" />
                    </svg>
                  }
                  value={formatNumber(creatorHub.subscriberCount)}
                  label="Subscribers"
                  sublabel={creatorHub.monthlyIncome > 0 ? `${formatNumber(creatorHub.monthlyIncome)} drops this month` : undefined}
                  href="/creator/circle"
                  accentColor="text-gold"
                  accentGlow="bg-gold/10"
                  delay={0.25}
                />
              )}
              {creatorHub.tipsThisMonth > 0 && (
                <CreatorHubCard
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2C8 2 3 7.5 3 10a5 5 0 0010 0C13 7.5 8 2 8 2z" />
                    </svg>
                  }
                  value={formatNumber(creatorHub.tipsThisMonth)}
                  label="Earned This Month"
                  sublabel={creatorHub.totalEarned > 0 ? `${formatNumber(creatorHub.totalEarned)} drops total` : undefined}
                  href="/creator/earnings"
                  accentColor="text-teal"
                  accentGlow="bg-teal/10"
                  delay={0.3}
                />
              )}
              {creatorHub.activeCommissions > 0 && (
                <CreatorHubCard
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h12v10H2zM5 7h6M5 10h3" />
                    </svg>
                  }
                  value={formatNumber(creatorHub.activeCommissions)}
                  label="Active Commissions"
                  href="/scriptorium"
                  accentColor="text-amethyst"
                  accentGlow="bg-amethyst/10"
                  delay={0.35}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Active Story Spotlight ── */}
        {activeStory && (
          <div className="mb-12">
            <ActiveStorySpotlight story={activeStory} />
          </div>
        )}

        {/* ── Getting Started hints (only for early-stage writers) ── */}
        {isEarlyStage && activeStory && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mb-12"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Next Steps
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href={
                  activeStory.writingMode === "campaign"
                    ? `/campaign/${activeStory.id}`
                    : `/write/${activeStory.id}`
                }
                className="group rounded-xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-amber/30 hover:bg-ink/60"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber/10 border border-amber/20 text-amber mb-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11 2l3 3-9 9H2v-3l9-9z" />
                  </svg>
                </div>
                <div className="font-display text-[14px] text-paper font-medium mb-1">
                  Keep writing
                </div>
                <div className="text-[11px] text-text-ghost leading-relaxed">
                  Pick up "{activeStory.title}" where you left off.
                </div>
              </Link>
              <Link
                href="/read"
                className="group rounded-xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-lavender/30 hover:bg-ink/60"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-lavender/10 border border-lavender/20 text-lavender mb-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 3h5a3 3 0 013 3v8a2 2 0 00-2-2H2V3zM14 3H9a3 3 0 00-3 3v8a2 2 0 012-2h6V3z" />
                  </svg>
                </div>
                <div className="font-display text-[14px] text-paper font-medium mb-1">
                  Read what others write
                </div>
                <div className="text-[11px] text-text-ghost leading-relaxed">
                  Drop into For You — a feed of chapters hand-picked for you.
                </div>
              </Link>
              <Link
                href="/browse"
                className="group rounded-xl border border-border bg-ink/40 p-5 transition-all duration-300 hover:border-teal/30 hover:bg-ink/60"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal/10 border border-teal/20 text-teal mb-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="7" r="5" />
                    <path d="M11 11l3 3" />
                  </svg>
                </div>
                <div className="font-display text-[14px] text-paper font-medium mb-1">
                  Explore the catalog
                </div>
                <div className="text-[11px] text-text-ghost leading-relaxed">
                  Browse genres, adventures, and creators to follow.
                </div>
              </Link>
            </div>
          </motion.div>
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
          /* ── Empty state -- no stories yet ── */
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
              Every great tale starts with a single word — or a single chapter you
              can't put down. Pick a path to begin.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/create"
                className="bg-amber text-void font-semibold px-7 py-3 rounded-full hover:bg-amber-light transition-all duration-200 text-[14px] hover:shadow-lg hover:shadow-amber/15"
              >
                Begin Your First Story
              </Link>
              <Link
                href="/read"
                className="px-6 py-3 rounded-full border border-border text-text text-[14px] font-medium hover:border-lavender/40 hover:text-lavender transition-all duration-200"
              >
                Or read what others write &rarr;
              </Link>
            </div>
            <Link
              href="/browse"
              className="mt-4 text-[12px] text-text-ghost hover:text-amber transition-colors"
            >
              Browse the catalog
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
          <span className="text-text-ghost text-sm font-display">&loz;</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
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
            className="flex flex-col items-center justify-center text-center py-14 mb-12"
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

        {/* ── Recent Notifications ── */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Recent Activity
              </span>
            </div>
            <div className="rounded-xl border border-border bg-ink/50 overflow-hidden">
              {notifications.map((notif, i) => (
                <Link
                  key={notif.id}
                  href={notif.href}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface/50 transition-colors duration-200 group ${
                    i < notifications.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <NotificationIcon type={notif.type} />
                  <span
                    className={`flex-1 text-[13px] leading-snug truncate ${
                      notif.read ? "text-text-secondary" : "text-text"
                    }`}
                  >
                    {notif.message}
                  </span>
                  <span className="text-[10px] text-text-ghost flex-shrink-0">
                    {formatTimeAgo(notif.createdAt)}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-text-ghost/30 group-hover:text-text-ghost group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </Link>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link
                href="/notifications"
                className="text-[12px] text-text-ghost hover:text-amber transition-colors duration-200"
              >
                View all notifications &rarr;
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
