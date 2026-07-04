"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/format";
import type { NotifType, ApiNotification } from "@/types/api";

const NOTIF_ICONS: Record<NotifType, { icon: React.ReactNode; color: string }> = {
  chapter: {
    color: "text-amber bg-amber/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
        <path d="M8 5.5V14" />
      </svg>
    ),
  },
  spark: {
    color: "text-amber bg-amber/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
      </svg>
    ),
  },
  follow: {
    color: "text-sage bg-sage/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 2v12l4-3 4 3V2H4z" />
      </svg>
    ),
  },
  comment: {
    color: "text-lavender bg-lavender/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3h12v8H6l-4 3V3z" />
      </svg>
    ),
  },
  update: {
    color: "text-teal bg-teal/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v3l2 2" />
      </svg>
    ),
  },
  collaboration: {
    color: "text-lavender bg-lavender/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="3" />
        <circle cx="11" cy="6" r="3" />
        <path d="M2 14c0-2.2 1.8-4 4-4h1" />
        <path d="M14 14c0-2.2-1.8-4-4-4h-1" />
      </svg>
    ),
  },
  suggestion: {
    color: "text-sage bg-sage/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
      </svg>
    ),
  },
  "open-call": {
    color: "text-amber bg-amber/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3h10v7H8l-3 3V10H3V3z" />
        <path d="M6 6h4M6 8h2" />
      </svg>
    ),
  },
  tip: {
    color: "text-gold bg-gold/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
      </svg>
    ),
  },
  jam: {
    color: "text-rose bg-rose/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
      </svg>
    ),
  },
  annotation: {
    color: "text-lavender bg-lavender/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3h10v10H3V3z" />
        <path d="M6 7h4M6 9h2" />
      </svg>
    ),
  },
  circle: {
    color: "text-rose bg-rose/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5.5" />
        <circle cx="8" cy="8" r="2" />
      </svg>
    ),
  },
  letter: {
    color: "text-amber bg-amber/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="12" height="9" rx="1.5" />
        <path d="M2.5 5l5.5 4.5L13.5 5" />
      </svg>
    ),
  },
  candle: {
    color: "text-gold bg-gold/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1.5c1 1.2 1.6 2 1.6 2.9a1.6 1.6 0 11-3.2 0c0-.9.6-1.7 1.6-2.9z" />
        <path d="M6.5 7.5h3V14h-3z" />
      </svg>
    ),
  },
  pen: {
    color: "text-amber bg-amber/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12.5 2.5l1 1L6 11l-2.5 1.5L5 10l7.5-7.5z" />
        <path d="M3.5 12.5l-1 1" />
      </svg>
    ),
  },
  live: {
    color: "text-rose bg-rose/10",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        <path d="M4.5 4.5a5 5 0 000 7M11.5 4.5a5 5 0 010 7" strokeLinecap="round" />
      </svg>
    ),
  },
};


export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | NotifType>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data.notifications);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [session, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Primary filters: most-frequent types stay as chips. Less-common types
  // collapse under a "More" dropdown so the strip stays scannable.
  const PRIMARY_KEYS: ("all" | NotifType)[] = ["all", "chapter", "spark", "comment", "follow"];
  const MORE_KEYS: NotifType[] = ["update", "collaboration", "suggestion", "open-call", "tip", "jam", "annotation", "circle", "letter", "candle", "pen", "live"];

  const FILTER_LABELS: Record<"all" | NotifType, string> = {
    all: "All",
    chapter: "Chapters",
    spark: "Sparks",
    follow: "Follows",
    comment: "Comments",
    update: "Updates",
    collaboration: "Collabs",
    suggestion: "Suggestions",
    "open-call": "Open Calls",
    tip: "Tips",
    jam: "Jams",
    annotation: "Notes",
    circle: "Circle",
    letter: "Letters",
    candle: "Candles",
    pen: "The pen",
    live: "Live",
  };

  const filters = PRIMARY_KEYS.map((key) => ({ key, label: FILTER_LABELS[key] }));
  const moreFilters = MORE_KEYS.map((key) => ({ key, label: FILTER_LABELS[key] }));
  const activeMoreLabel = MORE_KEYS.includes(filter as NotifType) ? FILTER_LABELS[filter as NotifType] : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="section-label text-[10px] mb-2 max-w-[160px]">Updates</p>
            <h1 className="font-display text-2xl text-paper font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-text-secondary text-[13px] mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-text-ghost hover:text-paper text-[12px] transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-amber text-void"
                : "bg-elevated text-text-secondary hover:text-paper"
            }`}
          >
            {f.label}
          </button>
        ))}
        <details className="relative shrink-0">
          <summary
            className={`list-none px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 [&::-webkit-details-marker]:hidden ${
              activeMoreLabel
                ? "bg-amber text-void"
                : "bg-elevated text-text-secondary hover:text-paper"
            }`}
          >
            {activeMoreLabel || "More"}
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </summary>
          <div className="absolute left-0 top-9 z-30 min-w-[160px] rounded-xl border border-border bg-elevated shadow-2xl py-1.5">
            {moreFilters.map((f) => (
              <button
                key={f.key}
                onClick={(e) => {
                  setFilter(f.key);
                  (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                }}
                className={`w-full text-left px-4 py-2 text-[12px] transition-colors ${
                  filter === f.key
                    ? "text-amber bg-amber/10"
                    : "text-text-secondary hover:text-paper hover:bg-subtle/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </details>
      </motion.div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-text-ghost/20 border-t-amber rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-1">
          {filtered.map((notif, i) => {
            const config = NOTIF_ICONS[notif.type] || NOTIF_ICONS.update;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.03 }}
              >
                <Link
                  href={notif.href?.startsWith("/") && !notif.href.startsWith("//") ? notif.href : "/"}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all hover:bg-surface/80 ${
                    !notif.read ? "bg-surface/50" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-relaxed ${notif.read ? "text-text-secondary" : "text-paper"}`}>
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-text-ghost mt-0.5">
                      {formatTimeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-amber flex-shrink-0 mt-2" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-amber/40">
                <path d="M16 4c-3 0-6 2-6 6 0 5 6 10 6 10s6-5 6-10c0-4-3-6-6-6z" />
                <circle cx="16" cy="10" r="2" />
                <path d="M10 24h12M12 28h8" />
              </svg>
            </div>
            <div className="absolute -inset-3 bg-amber/5 rounded-full blur-xl" />
          </div>
          <h3 className="font-display text-xl text-paper mb-1.5">
            All caught up
          </h3>
          <p className="text-text-secondary text-[13px] max-w-sm leading-relaxed">
            When stories you follow get new chapters, or readers spark your work, you&apos;ll see it here.
          </p>
          <Link
            href="/browse"
            className="mt-5 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
          >
            Discover stories to follow &rarr;
          </Link>
        </motion.div>
      )}
    </div>
  );
}
