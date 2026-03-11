"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";

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

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [comfortRating, setComfortRating] = useState("everyone");
  const [readingFont, setReadingFont] = useState("default");
  const [readingMode, setReadingMode] = useState("paginated");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");

  const loadLocalPrefs = useCallback(() => {
    const rating = localStorage.getItem("inkwell-comfort-rating");
    if (rating) setComfortRating(rating);
    const font = localStorage.getItem("inkwell-reading-font");
    if (font) setReadingFont(font);
    try {
      const prefs = JSON.parse(localStorage.getItem("inkwell-reader-prefs") || "{}");
      if (prefs.mode) setReadingMode(prefs.mode);
    } catch {}
  }, []);

  useEffect(() => {
    // Always load localStorage first as fallback
    loadLocalPrefs();

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
          setSyncStatus("synced");
        })
        .catch(() => {
          // API failed — stay with localStorage values
          setSyncStatus("local-only");
        });
    } else {
      setSyncStatus("local-only");
    }
  }, [session, sessionStatus, loadLocalPrefs]);

  const handleSave = async () => {
    setSaving(true);

    // Always write to localStorage
    localStorage.setItem("inkwell-comfort-rating", comfortRating);
    localStorage.setItem("inkwell-reading-font", readingFont);
    localStorage.setItem("inkwell-reader-prefs", JSON.stringify({ mode: readingMode }));

    // If logged in, also sync to API
    if (session?.user) {
      try {
        const res = await fetch("/api/users/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comfortRating, readingMode, readingFont }),
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
  const cardClass = "card-page p-6";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="section-label text-[10px] mb-2 max-w-[140px]">Preferences</p>
            <h1 className="font-display text-2xl text-paper font-semibold">Settings</h1>
          </div>
          {session?.user && (
            <Link
              href={`/profile/${session.user.id}/edit`}
              className="text-text-ghost hover:text-paper text-[12px] flex items-center gap-1.5 transition-colors"
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

      <div className="space-y-6">
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
          <div className="space-y-1.5">
            {CONTENT_RATINGS.map((rating) => (
              <button
                key={rating.value}
                onClick={() => setComfortRating(rating.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  comfortRating === rating.value
                    ? "border-amber/30 bg-amber/[0.06] text-amber"
                    : "border-transparent text-text-secondary hover:bg-subtle/30"
                }`}
              >
                <span className="text-[13px] font-medium">{rating.label}</span>
                <span className="text-[11px] text-text-ghost ml-2">{rating.description}</span>
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
          <div className="flex gap-3 mb-6">
            {[
              { value: "paginated", label: "Paginated", desc: "Page-by-page, like a book" },
              { value: "scroll", label: "Scroll", desc: "Continuous scrolling" },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setReadingMode(mode.value)}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all text-left ${
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

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 pt-2"
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
