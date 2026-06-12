"use client";

/*
 * Preferences — rebuilt around three rules:
 *  1. Nothing needs a save button. Every change saves itself and says so.
 *  2. Every control shows its effect (fonts render in their own typeface,
 *     themes show a swatch, a live preview paragraph follows your choices).
 *  3. Every section says in one plain sentence what it affects.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Check, LogOut, Mail, Moon, Shield, Sparkles, User } from "lucide-react";
import { type Theme, setTheme as applyTheme, getStoredTheme, THEME_CHANGE_EVENT } from "@/client/theme";
import { GENRES } from "@/config/genres";

const CONTENT_RATINGS = [
  { value: "everyone", label: "All Ages", description: "Show only stories rated for everyone" },
  { value: "teen", label: "Teen & Below", description: "Include stories with mild themes" },
  { value: "mature", label: "Mature & Below", description: "Include stories with strong themes" },
  { value: "explicit", label: "Include All", description: "Show all content, including explicit" },
];

const READING_FONTS = [
  { value: "default", label: "Literata", note: "The Quiloria default", family: "var(--font-literata), Georgia, serif" },
  { value: "serif", label: "Playfair Display", note: "A classic book serif", family: "var(--font-playfair), Georgia, serif" },
  { value: "sans", label: "DM Sans", note: "Clean and modern", family: "var(--font-dm-sans), system-ui, sans-serif" },
  { value: "mono", label: "IBM Plex Mono", note: "Typewriter feel", family: "var(--font-plex-mono), 'Courier New', monospace" },
];

const EMAIL_CADENCES = [
  { value: "instant", label: "Send each one as it happens", description: "One email per event. Best for low-volume readers." },
  { value: "daily", label: "Daily digest", description: "One email each morning summarizing yesterday." },
  { value: "weekly", label: "Weekly digest", description: "One email each week. Best for occasional check-ins." },
  { value: "off", label: "Don't send any emails", description: "You'll still see notifications in the app." },
] as const;

type EmailDigestMode = (typeof EMAIL_CADENCES)[number]["value"];
type ReadLength = "quick" | "short" | "medium" | "long" | "any";
type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_GENRES = 8;

// Same shortlist the onboarding flow leads with.
const POPULAR_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Literary Fiction",
  "Adventure",
  "Historical Fiction",
  "Contemporary",
  "Young Adult",
  "Dark Fantasy",
];

const READ_LENGTHS: { value: ReadLength; label: string; hint: string }[] = [
  { value: "quick", label: "Quick reads", hint: "Under 5 minutes — flash fiction, poetry" },
  { value: "short", label: "Short stories", hint: "5–20 minutes — single-sitting fiction" },
  { value: "medium", label: "Novelettes", hint: "20–90 minutes — meaty single chapters" },
  { value: "long", label: "Long-form", hint: "Hours, multi-chapter epics, serialized work" },
  { value: "any", label: "No preference", hint: "Show me everything" },
];

const PREVIEW_TEXT =
  "The lamp burned low as she turned the last page, and outside the window the city went on, not knowing how the story ended.";

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

/* ── Small shared pieces ───────────────────────────────────── */

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
        on ? "border-gold bg-gold/15" : "border-border-active bg-ink/40"
      }`}
    >
      {on && <Check size={11} strokeWidth={3} className="text-gold" />}
    </span>
  );
}

function SectionCard({
  icon,
  title,
  blurb,
  delay = 0,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-surface/68 p-5 shadow-[var(--t-shadow-card)] sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.07] text-gold">
          {icon}
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-paper">{title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{blurb}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [comfortRating, setComfortRating] = useState(() => readLocalPreference("quiloria-comfort-rating", "everyone"));
  const [readingFont, setReadingFont] = useState(() => readLocalPreference("quiloria-reading-font", "default"));
  const [readingMode, setReadingMode] = useState(() => readLocalReadingMode());
  const [emailDigestMode, setEmailDigestMode] = useState<EmailDigestMode>("instant");
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [readLength, setReadLength] = useState<ReadLength>("any");
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Refs so the debounced save always sends the freshest values.
  const latest = useRef({ comfortRating, readingMode, readingFont, emailDigestMode, preferredGenres, preferredReadLength: readLength });
  latest.current = { comfortRating, readingMode, readingFont, emailDigestMode, preferredGenres, preferredReadLength: readLength };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme is device-level: read after mount (SSR renders dark), follow every lamp.
  useEffect(() => {
    setThemeState(getStoredTheme());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail === "dark" || detail === "light") setThemeState(detail);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  }, []);

  // Account values are the source of truth once they arrive.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/users/me/preferences")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(({ data }) => {
        if (data.comfortRating) setComfortRating(data.comfortRating);
        if (data.readingMode) setReadingMode(data.readingMode);
        if (data.readingFont) setReadingFont(data.readingFont);
        if (EMAIL_CADENCES.some((c) => c.value === data.emailDigestMode)) {
          setEmailDigestMode(data.emailDigestMode);
        }
        if (Array.isArray(data.preferredGenres)) setPreferredGenres(data.preferredGenres);
        // The API stores "no preference" as null.
        if (READ_LENGTHS.some((l) => l.value === data.preferredReadLength)) {
          setReadLength(data.preferredReadLength);
        }
      })
      .catch(() => {
        // Stay with localStorage values; the first edit will retry the sync.
      });
  }, [sessionStatus]);

  const flushSave = useCallback(async () => {
    const prefs = latest.current;
    try {
      const res = await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          emailNotifications: prefs.emailDigestMode !== "off",
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, []);

  const queueSave = useCallback(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 700);
  }, [flushSave]);

  // Don't lose an in-flight edit if the user navigates away mid-debounce.
  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        flushSave();
      }
    };
  }, [flushSave]);

  const updateComfort = useCallback((value: string) => {
    setComfortRating(value);
    localStorage.setItem("quiloria-comfort-rating", value);
    queueSave();
  }, [queueSave]);

  const updateFont = useCallback((value: string) => {
    setReadingFont(value);
    localStorage.setItem("quiloria-reading-font", value);
    queueSave();
  }, [queueSave]);

  const updateMode = useCallback((value: string) => {
    setReadingMode(value);
    try {
      const prefs = JSON.parse(localStorage.getItem("quiloria-reader-prefs") || "{}");
      localStorage.setItem("quiloria-reader-prefs", JSON.stringify({ ...prefs, mode: value }));
    } catch {
      localStorage.setItem("quiloria-reader-prefs", JSON.stringify({ mode: value }));
    }
    queueSave();
  }, [queueSave]);

  const updateCadence = useCallback((value: EmailDigestMode) => {
    setEmailDigestMode(value);
    queueSave();
  }, [queueSave]);

  const toggleGenre = useCallback((genre: string) => {
    setPreferredGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= MAX_GENRES
          ? prev
          : [...prev, genre],
    );
    queueSave();
  }, [queueSave]);

  const updateReadLength = useCallback((value: ReadLength) => {
    setReadLength(value);
    queueSave();
  }, [queueSave]);

  const updateTheme = useCallback((value: Theme) => {
    // Instant + device-level — no API round-trip, every open lamp follows.
    applyTheme(value);
  }, []);

  // Selected genres stay visible even when they're outside the popular shortlist.
  const visibleGenres = useMemo(() => {
    if (genreSearch) {
      return GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()));
    }
    if (showAllGenres) return [...GENRES];
    const extras = preferredGenres.filter((g) => !POPULAR_GENRES.includes(g));
    return [...POPULAR_GENRES, ...extras];
  }, [genreSearch, showAllGenres, preferredGenres]);

  const selectedFont = READING_FONTS.find((f) => f.value === readingFont) ?? READING_FONTS[0];

  return (
    <div className="mx-auto max-w-4xl">
      {/* One slim header line — the shell already says "Settings" */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-[13px] leading-relaxed text-text-secondary">
          Pick what feels right — <span className="text-paper">changes save automatically</span>.
        </p>
      </motion.div>

      <div className="grid gap-5">
        {/* Account */}
        {session?.user && (
          <SectionCard
            icon={<User size={16} />}
            title="Account"
            blurb="Who you're signed in as. Your name, bio, and avatar live on your public profile."
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/15 bg-gradient-to-br from-gold/20 to-gold/5 font-display text-sm font-semibold text-gold">
                {(session.user as { image?: string | null }).image ? (
                  <Image
                    src={(session.user as { image?: string | null }).image!}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (session.user.name || session.user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                {session.user.name && (
                  <p className="truncate text-[13px] font-medium text-paper">{session.user.name}</p>
                )}
                <p className="truncate text-[12px] text-text-ghost">{session.user.email}</p>
              </div>
              <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                <Link
                  href={`/profile/${session.user.id}/edit`}
                  className="rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-1.5 text-[12px] font-medium text-gold transition-colors hover:bg-gold/[0.12]"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:border-rose/30 hover:text-rose"
                >
                  <LogOut size={12} />
                  Sign out
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Appearance */}
        <SectionCard
          icon={<Moon size={16} />}
          title="Appearance"
          blurb="The light in the room. Applies on this device — there's also a lamp switch in the dock."
          delay={0.04}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { value: "dark" as Theme, label: "Midnight", desc: "Ink-dark library, candle-gold light" },
                { value: "light" as Theme, label: "Vellum", desc: "Bright paper, iron-gall ink" },
              ]
            ).map((option) => {
              const selected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => updateTheme(option.value)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:border-border-active"
                  }`}
                >
                  {/* Swatch — a tiny page in each theme, so the choice shows itself */}
                  <span
                    aria-hidden
                    className={`mb-3 block overflow-hidden rounded-lg border p-2.5 ${
                      option.value === "dark"
                        ? "border-[#2A3553] bg-gradient-to-br from-[#0A0D18] to-[#18223C]"
                        : "border-[#D8D3C4] bg-gradient-to-br from-[#FFFFFF] to-[#ECE9E0]"
                    }`}
                  >
                    <span className={`mb-1.5 block h-1.5 w-1/3 rounded-full ${option.value === "dark" ? "bg-[#E2AC4A]" : "bg-[#8A6512]"}`} />
                    <span className={`mb-1 block h-1 w-full rounded-full ${option.value === "dark" ? "bg-[#F2EDDD]/40" : "bg-[#1B2230]/35"}`} />
                    <span className={`block h-1 w-3/4 rounded-full ${option.value === "dark" ? "bg-[#F2EDDD]/25" : "bg-[#1B2230]/20"}`} />
                  </span>
                  <span className="flex items-center gap-2">
                    <RadioDot on={selected} />
                    <span>
                      <span className={`block text-[13px] font-medium ${selected ? "text-gold" : "text-text-secondary"}`}>
                        {option.label}
                      </span>
                      <span className="block text-[11px] text-text-ghost">{option.desc}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Reading */}
        <SectionCard
          icon={<BookOpen size={16} />}
          title="Reading"
          blurb="How chapters look when you open one. You can also change these anytime from the reader toolbar."
          delay={0.08}
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-text-ghost">Turn pages or scroll</p>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "paginated",
                label: "Paginated",
                desc: "Page-by-page, like a book",
                glyph: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M9 3.5C7.5 2.5 5 2.2 2.5 2.8v11c2.5-.6 5-.3 6.5.7 1.5-1 4-1.3 6.5-.7v-11C13 2.2 10.5 2.5 9 3.5z" />
                    <path d="M9 3.5v11" />
                  </svg>
                ),
              },
              {
                value: "scroll",
                label: "Scroll",
                desc: "One continuous flow",
                glyph: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M5 2.5h8M4 5.5h10M4 8.5h10M4 11.5h10" />
                    <path d="M9 13.5v2.5M7.5 14.5L9 16l1.5-1.5" />
                  </svg>
                ),
              },
            ].map((mode) => {
              const selected = readingMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => updateMode(mode.value)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:border-border-active"
                  }`}
                >
                  <span className={selected ? "text-gold" : "text-text-ghost"}>{mode.glyph}</span>
                  <span className="flex-1">
                    <span className={`block text-[13px] font-medium ${selected ? "text-gold" : "text-text-secondary"}`}>
                      {mode.label}
                    </span>
                    <span className="text-[11px] text-text-ghost">{mode.desc}</span>
                  </span>
                  <RadioDot on={selected} />
                </button>
              );
            })}
          </div>

          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-text-ghost">Reading font</p>
          <div className="grid grid-cols-2 gap-2">
            {READING_FONTS.map((font) => {
              const selected = readingFont === font.value;
              return (
                <button
                  key={font.value}
                  onClick={() => updateFont(font.value)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:border-border-active"
                  }`}
                >
                  <span
                    className={`text-[17px] leading-none ${selected ? "text-gold" : "text-text-secondary"}`}
                    style={{ fontFamily: font.family }}
                    aria-hidden
                  >
                    Aa
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[12px] font-medium ${selected ? "text-gold" : "text-text-secondary"}`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.label}
                    </span>
                    <span className="hidden text-[10px] text-text-ghost sm:block">{font.note}</span>
                  </span>
                  <RadioDot on={selected} />
                </button>
              );
            })}
          </div>

          {/* Live preview — the choice above, shown as a real page */}
          <div className="mt-4 rounded-xl border border-border bg-ink/45 px-4 py-4 sm:px-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-text-ghost">Preview</p>
            <p
              className="text-[15px] leading-[1.85] text-text"
              style={{ fontFamily: selectedFont.family }}
            >
              {PREVIEW_TEXT}
            </p>
          </div>
        </SectionCard>

        {/* Your taste */}
        <SectionCard
          icon={<Sparkles size={16} />}
          title="Your taste"
          blurb="What primes your For You feed and recommendations. Pick the genres you love and how long you usually have to read."
          delay={0.12}
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Genres you love</p>
            <p className="text-[11px] tabular-nums text-text-ghost">
              {preferredGenres.length} of {MAX_GENRES}
            </p>
          </div>
          <input
            type="text"
            value={genreSearch}
            onChange={(e) => setGenreSearch(e.target.value)}
            placeholder="Search genres…"
            className="mb-3 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[13px] text-text outline-none transition-colors placeholder:text-text-ghost focus:border-gold/30"
          />
          <div className="flex flex-wrap gap-2">
            {visibleGenres.map((genre) => {
              const selected = preferredGenres.includes(genre);
              const atMax = !selected && preferredGenres.length >= MAX_GENRES;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  disabled={atMax}
                  aria-pressed={selected}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-medium transition-all ${
                    selected
                      ? "bg-gold text-void shadow-sm shadow-gold/20"
                      : atMax
                        ? "cursor-not-allowed bg-elevated/40 text-text-ghost"
                        : "bg-elevated text-text-secondary hover:bg-elevated/80 hover:text-paper"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
            {genreSearch && visibleGenres.length === 0 && (
              <p className="py-1 text-[12px] text-text-ghost">No genres match &ldquo;{genreSearch}&rdquo;</p>
            )}
          </div>
          {!genreSearch && !showAllGenres && (
            <button
              type="button"
              onClick={() => setShowAllGenres(true)}
              className="mt-3 text-[12px] text-gold transition-colors hover:text-gold-light"
            >
              Show all {GENRES.length} genres →
            </button>
          )}

          <p className="mb-2 mt-6 text-[10px] uppercase tracking-[0.12em] text-text-ghost">Time to read</p>
          <div className="grid gap-2">
            {READ_LENGTHS.map((opt) => {
              const selected = readLength === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateReadLength(opt.value)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:bg-subtle/30"
                  }`}
                >
                  <RadioDot on={selected} />
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-medium sm:inline ${selected ? "text-gold" : "text-text-secondary"}`}>
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-text-ghost sm:ml-2 sm:mt-0 sm:inline">
                      {opt.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Content comfort */}
        <SectionCard
          icon={<Shield size={16} />}
          title="Content comfort"
          blurb="What you see while browsing. Stories above your comfort level are hidden from browse and search. Only you can see this setting."
          delay={0.16}
        >
          <div className="grid gap-2">
            {CONTENT_RATINGS.map((rating) => {
              const selected = comfortRating === rating.value;
              return (
                <button
                  key={rating.value}
                  onClick={() => updateComfort(rating.value)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:bg-subtle/30"
                  }`}
                >
                  <RadioDot on={selected} />
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-medium sm:inline ${selected ? "text-gold" : "text-text-secondary"}`}>
                      {rating.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-text-ghost sm:ml-2 sm:mt-0 sm:inline">
                      {rating.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Email */}
        {session?.user && (
          <SectionCard
            icon={<Mail size={16} />}
            title="Email"
            blurb="How often Quiloria reaches your inbox — new chapters, comments on your work, invites, and follows. In-app notifications stay on either way."
            delay={0.2}
          >
            <div className="grid gap-2">
              {EMAIL_CADENCES.map((opt) => {
                const selected = emailDigestMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateCadence(opt.value)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selected ? "border-gold/35 bg-gold/[0.06]" : "border-border bg-ink/35 hover:bg-subtle/30"
                    }`}
                  >
                    <RadioDot on={selected} />
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-medium sm:inline ${selected ? "text-gold" : "text-text-secondary"}`}>
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-text-ghost sm:ml-2 sm:mt-0 sm:inline">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Save status — quiet confirmation, loud only on failure */}
      <AnimatePresence>
        {saveState !== "idle" && (
          <motion.div
            key={saveState === "error" ? "error" : "saving"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            {saveState === "error" ? (
              <div className="flex items-center gap-3 rounded-full border border-rose/25 bg-surface px-4 py-2.5 shadow-[var(--t-shadow-elevated)]">
                <span className="text-[12px] text-rose">Couldn&apos;t reach your account — saved on this device</span>
                <button
                  onClick={flushSave}
                  className="rounded-full border border-rose/25 px-2.5 py-1 text-[11px] font-medium text-rose transition-colors hover:bg-rose/10"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-[var(--t-shadow-elevated)]">
                {saveState === "saved" ? (
                  <>
                    <Check size={13} className="text-sage" />
                    <span className="text-[12px] font-medium text-sage">Saved</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold/60" />
                    <span className="text-[12px] text-text-secondary">Saving…</span>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
