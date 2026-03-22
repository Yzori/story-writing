"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Flag = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  storyId: string | null;
  commentId: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  reporterName: string;
  reporterEmail: string;
};

type Stats = {
  totalUsers: number;
  totalStories: number;
  pendingFlags: number;
};

type RecentStory = {
  id: string;
  title: string;
  format: string;
  slug: string | null;
  createdAt: string;
  authorName: string;
};

const STATUS_TABS = ["all", "pending", "dismissed", "actioned"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const statusColors: Record<string, string> = {
  pending: "border-amber-500/50 bg-amber-500/5",
  dismissed: "border-sage/50 bg-sage/5",
  actioned: "border-rose-500/50 bg-rose-500/5",
};

const statusBadgeColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  dismissed: "bg-sage/20 text-sage",
  actioned: "bg-rose-500/20 text-rose-400",
};

const reasonLabels: Record<string, string> = {
  misrated: "Misrated Content",
  harmful: "Harmful Content",
  spam: "Spam",
};

export default function AdminDashboard() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStories, setRecentStories] = useState<RecentStory[]>([]);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFlags = useCallback(async (status?: string) => {
    const url = status && status !== "all"
      ? `/api/admin/flags?status=${status}`
      : "/api/admin/flags";
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setFlags(json.data ?? []);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const json = await res.json();
      setStats(json.data ?? null);
    }
  }, []);

  const fetchRecentStories = useCallback(async () => {
    // Reuse browse API to get recent stories
    const res = await fetch("/api/stories?limit=10&sort=latest&public=true");
    if (res.ok) {
      const json = await res.json();
      const storiesData = json.data?.stories ?? [];
      setRecentStories(
        storiesData.map((s: Record<string, unknown>) => ({
          id: s.id,
          title: s.title,
          format: s.format ?? "novel",
          slug: s.slug,
          createdAt: s.createdAt,
          authorName: s.authorName ?? "Unknown",
        }))
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchFlags(), fetchStats(), fetchRecentStories()]).finally(() =>
      setLoading(false)
    );
  }, [fetchFlags, fetchStats, fetchRecentStories]);

  useEffect(() => {
    fetchFlags(activeTab);
  }, [activeTab, fetchFlags]);

  async function handleAction(flagId: string, status: "dismissed" | "actioned") {
    setActionLoading(flagId);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.id === flagId ? { ...f, status } : f))
        );
        // Refresh stats
        fetchStats();
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-surface rounded w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-paper mb-1">
          Admin Dashboard
        </h1>
        <p className="text-text-secondary">
          Content moderation and platform overview
        </p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-text-secondary text-sm mb-1">Total Users</p>
            <p className="text-2xl font-display text-paper">
              {stats.totalUsers.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-text-secondary text-sm mb-1">Total Stories</p>
            <p className="text-2xl font-display text-paper">
              {stats.totalStories.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-text-secondary text-sm mb-1">Pending Flags</p>
            <p className={`text-2xl font-display ${stats.pendingFlags > 0 ? "text-amber-400" : "text-paper"}`}>
              {stats.pendingFlags.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Flagged Content - Main Section */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h2 className="text-xl font-display text-paper mb-4">
              Flagged Content
            </h2>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-elevated text-paper"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Flags List */}
          {flags.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-secondary">
                {activeTab === "all"
                  ? "No flags have been submitted yet."
                  : `No ${activeTab} flags.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className={`border rounded-xl p-5 transition-colors ${
                    statusColors[flag.status] ?? "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            statusBadgeColors[flag.status] ?? "bg-surface text-text-secondary"
                          }`}
                        >
                          {flag.status}
                        </span>
                        <span className="text-xs text-text-ghost">
                          {formatDate(flag.createdAt)}
                        </span>
                      </div>

                      <p className="text-paper font-medium mb-1">
                        {flag.storyTitle
                          ? `Story: ${flag.storyTitle}`
                          : flag.commentId
                            ? "Flagged Comment"
                            : "Unknown Target"}
                      </p>

                      <p className="text-sm text-text-secondary mb-1">
                        <span className="text-text-ghost">Reason:</span>{" "}
                        {reasonLabels[flag.reason] ?? flag.reason}
                      </p>

                      {flag.details && (
                        <p className="text-sm text-text-secondary mt-1">
                          <span className="text-text-ghost">Details:</span>{" "}
                          {flag.details}
                        </p>
                      )}

                      <p className="text-xs text-text-ghost mt-2">
                        Reported by {flag.reporterName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flag.storySlug && (
                        <Link
                          href={`/story/${flag.storySlug}`}
                          className="px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-paper hover:border-paper/30 transition-colors"
                        >
                          View Story
                        </Link>
                      )}

                      {flag.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(flag.id, "dismissed")}
                            disabled={actionLoading === flag.id}
                            className="px-3 py-1.5 text-xs rounded-lg bg-sage/20 text-sage hover:bg-sage/30 transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAction(flag.id, "actioned")}
                            disabled={actionLoading === flag.id}
                            className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                          >
                            Remove Content
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stories - Sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-display text-paper mb-4">
            Recent Stories
          </h2>

          {recentStories.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <p className="text-text-secondary text-sm">No stories yet.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl divide-y divide-border">
              {recentStories.map((story) => (
                <div key={story.id} className="p-4">
                  <Link
                    href={story.slug ? `/story/${story.slug}` : "#"}
                    className="text-sm text-paper hover:text-amber-400 transition-colors font-medium line-clamp-1"
                  >
                    {story.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-ghost">
                      {story.authorName}
                    </span>
                    <span className="text-xs text-text-ghost">·</span>
                    <span className="text-xs text-text-ghost capitalize">
                      {story.format}
                    </span>
                    <span className="text-xs text-text-ghost">·</span>
                    <span className="text-xs text-text-ghost">
                      {formatShortDate(story.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
