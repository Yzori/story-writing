"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const CONTENT_RATINGS = [
  { value: "everyone", label: "All Ages", description: "Show only stories rated for everyone" },
  { value: "teen", label: "Teen & Below", description: "Include stories with mild themes" },
  { value: "mature", label: "Mature & Below", description: "Include stories with strong themes" },
  { value: "explicit", label: "Include All", description: "Show all content, including explicit" },
];

const READING_FONTS = [
  { value: "default", label: "Default (Literata)" },
  { value: "serif", label: "Serif (Playfair Display)" },
  { value: "sans", label: "Sans-serif (DM Sans)" },
  { value: "mono", label: "Monospace (IBM Plex Mono)" },
];

type SyncStatus = "synced" | "local-only" | "loading";

function readLocalPreference(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

function readLocalReadingMode() {
  if (typeof window === "undefined") return "paginated";
  try {
    const prefs = JSON.parse(localStorage.getItem("quiloria-reader-prefs") || "{}");
    return typeof prefs.mode === "string" ? prefs.mode : "paginated";
  } catch {
    return "paginated";
  }
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [comfortRating, setComfortRating] = useState(() => readLocalPreference("quiloria-comfort-rating", "everyone"));
  const [readingFont, setReadingFont] = useState(() => readLocalPreference("quiloria-reading-font", "default"));
  const [readingMode, setReadingMode] = useState(() => readLocalReadingMode());
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailDigestMode, setEmailDigestMode] = useState<"instant" | "daily" | "weekly" | "off">("instant");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local-only");

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (session?.user) {
      // Fetch from API — use as source of truth if available
      fetch("/api/users/me/preferences")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then(({ data }) => {
          if (data.comfortRating) setComfortRating(data.comfortRating);
          if (data.readingMode) setReadingMode(data.readingMode);
          if (data.readingFont) setReadingFont(data.readingFont);
          if (typeof data.emailNotifications === "boolean") setEmailNotifications(data.emailNotifications);
          if (data.emailDigestMode === "instant" || data.emailDigestMode === "daily" || data.emailDigestMode === "weekly" || data.emailDigestMode === "off") {
            setEmailDigestMode(data.emailDigestMode);
          }
          setSyncStatus("synced");
        })
        .catch(() => {
          // API failed — stay with localStorage values
          setSyncStatus("local-only");
        });
    }
  }, [session, sessionStatus]);

  const handleSave = async () => {
    setSaving(true);

    // Always write to localStorage
    localStorage.setItem("quiloria-comfort-rating", comfortRating);
    localStorage.setItem("quiloria-reading-font", readingFont);
    localStorage.setItem("quiloria-reader-prefs", JSON.stringify({ mode: readingMode }));

    // If logged in, also sync to API
    if (session?.user) {
      try {
        const res = await fetch("/api/users/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comfortRating, readingMode, readingFont, emailNotifications, emailDigestMode }),
        });
        if (res.ok) {
          setSyncStatus("synced");
        } else {
          setSyncStatus("local-only");
        }
      } catch {
        setSyncStatus("local-only");
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const labelClass = "text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block";
  const cardClass = "rounded-2xl border border-border bg-surface/68 p-5 shadow-[var(--t-shadow-card)] sm:p-6";

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-ink/45 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label mb-2 max-w-[140px] text-[10px]">Preferences</p>
            <h2 className="font-display text-2xl font-semibold text-paper">Reading and notifications</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-text-secondary">
              Set the defaults that shape browsing, reading, and how often Quiloria reaches you outside the app.
            </p>
          </div>
          {session?.user && (
            <Link
              href={`/profile/${session.user.id}/edit`}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-elevated/60 px-3 py-2 text-[12px] text-text-secondary transition-colors hover:border-text-ghost/40 hover:text-paper"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
              Edit Profile
            </Link>
          )}
        </div>
      </motion.div>

      <div className="grid gap-5">
        {/* Account Info */}
        {session?.user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <label className={labelClass}>Account</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber font-display font-semibold text-sm overflow-hidden flex-shrink-0">
                {(session.user as { image?: string | null }).image ? (
                  <Image
                    src={(session.user as { image?: string | null }).image!}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (session.user.name || session.user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                {session.user.name && (
                  <p className="text-paper text-[13px] font-medium truncate">{session.user.name}</p>
                )}
                <p className="text-text-ghost text-[12px] truncate">{session.user.email}</p>
              </div>
              <Link
                href={`/profile/${session.user.id}/edit`}
              className="ml-auto flex-shrink-0 rounded-lg border border-amber/20 bg-amber/[0.06] px-3 py-1.5 text-[12px] font-medium text-amber transition-colors hover:bg-amber/[0.12]"
              >
                Edit Profile
              </Link>
            </div>
          </motion.div>
        )}

        {/* Content Comfort */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cardClass}
        >
          <label className={labelClass}>Content Comfort Level</label>
          <p className="text-text-secondary text-[12px] mb-4 leading-relaxed">
            Choose what content ratings you&apos;re comfortable seeing when browsing.
            Stories above your threshold are hidden from browse &amp; search by default.
            This preference is private.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTENT_RATINGS.map((rating) => (
              <button
                key={rating.value}
                onClick={() => setComfortRating(rating.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  comfortRating === rating.value
                    ? "border-amber/30 bg-amber/[0.06] text-amber"
                    : "border-border bg-ink/35 text-text-secondary hover:bg-subtle/30"
                }`}
              >
                <span className="text-[13px] font-medium block sm:inline">{rating.label}</span>
                <span className="text-[11px] text-text-ghost block sm:inline sm:ml-2 mt-0.5 sm:mt-0">{rating.description}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Reading Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cardClass}
        >
          <label className={labelClass}>Default Reading Mode</label>
          <div className="grid gap-3 sm:grid-cols-2 mb-6">
            {[
              { value: "paginated", label: "Paginated", desc: "Page-by-page, like a book" },
              { value: "scroll", label: "Scroll", desc: "Continuous scrolling" },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setReadingMode(mode.value)}
                className={`px-4 py-3 rounded-xl border transition-all text-left ${
                  readingMode === mode.value
                    ? "border-amber/30 bg-amber/[0.06]"
                    : "border-border hover:border-border-active"
                }`}
              >
                <span className={`block text-[13px] font-medium ${readingMode === mode.value ? "text-amber" : "text-text-secondary"}`}>
                  {mode.label}
                </span>
                <span className="text-[10px] text-text-ghost">{mode.desc}</span>
              </button>
            ))}
          </div>

          <label className={labelClass}>Reading Font</label>
          <div className="grid grid-cols-2 gap-2">
            {READING_FONTS.map((font) => (
              <button
                key={font.value}
                onClick={() => setReadingFont(font.value)}
                className={`px-3 py-2.5 rounded-xl border transition-all text-[12px] ${
                  readingFont === font.value
                    ? "border-amber/30 bg-amber/[0.06] text-amber"
                    : "border-border text-text-secondary hover:text-paper"
                }`}
              >
                {font.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Email Notifications */}
        {session?.user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={cardClass}
          >
            <label className={labelClass}>Email cadence</label>
            <p className="text-text-secondary text-[12px] mb-4 leading-relaxed">
              How often we email you about new chapters, comments on your work, collaboration invites, and updates from authors you follow.
            </p>
            <div className="grid gap-2">
              {[
                { value: "instant", label: "Send each one as it happens", description: "One email per event. Best for low-volume readers." },
                { value: "daily", label: "Daily digest", description: "One email each morning summarizing yesterday." },
                { value: "weekly", label: "Weekly digest", description: "One email each week. Best for occasional check-ins." },
                { value: "off", label: "Don't send any emails", description: "You'll still see notifications in the app." },
              ].map((opt) => {
                const selected = emailDigestMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setEmailDigestMode(opt.value as typeof emailDigestMode);
                      // Keep the legacy boolean in sync with mode for back-compat.
                      setEmailNotifications(opt.value !== "off");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selected
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border bg-ink/35 text-text-secondary hover:bg-subtle/30"
                    }`}
                  >
                    <span className="text-[13px] font-medium block sm:inline">{opt.label}</span>
                    <span className="text-[11px] text-text-ghost block sm:inline sm:ml-2 mt-0.5 sm:mt-0">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface/90 p-3 shadow-[var(--t-shadow-elevated)] backdrop-blur-xl"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber text-void font-semibold px-6 py-2.5 rounded-full text-[13px] transition-all duration-200 hover:bg-amber-light hover:shadow-md hover:shadow-amber/15 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sage text-[13px] font-medium"
            >
              Saved!
            </motion.span>
          )}
          {syncStatus !== "loading" && (
            <span className={`text-[11px] flex items-center gap-1.5 ${
              syncStatus === "synced" ? "text-sage" : "text-text-ghost"
            }`}>
              {syncStatus === "synced" ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 8.5l4 4 8-9" />
                  </svg>
                  Synced to account
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="12" height="10" rx="1.5" />
                    <path d="M5 4V2.5a3 3 0 016 0V4" />
                  </svg>
                  Saved locally
                </>
              )}
            </span>
          )}
        </motion.div>
      </div>
    </div>
  );
}
