"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GENRES } from "@/lib/genres";
import StoryCard from "@/components/shared/StoryCard";
import BookCard from "@/components/shared/BookCard";
import GenrePill from "@/components/shared/GenrePill";

// ── Dummy stories for testing while the library is empty ──
const DUMMY_STORIES: Story[] = [
  {
    id: "dummy-1",
    title: "The Ember Throne",
    format: "novel",
    synopsis: "In a kingdom where fire is currency and ash is memory, a young forgekeeper discovers she can shape flames into living things — and that the throne has been feeding on her family's bloodline for centuries.",
    coverImageUrl: "/solo_story_mode.png",
    genres: ["Fantasy", "Adventure"],
    status: "in-progress",
    slug: "the-ember-throne",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    authorName: "Isolde Varen",
    chapterCount: 24,
    totalWords: 84200,
    sparkCount: 312,
    contentRating: "PG13",
  },
  {
    id: "dummy-2",
    title: "Neon Meridian",
    format: "novel",
    synopsis: "Tokyo, 2089. A blacklisted neural architect takes one last job: hack a dead woman's memories to find a cure buried in her consciousness. But the deeper he dives, the less he trusts his own mind.",
    coverImageUrl: "/coop_story_mode.png",
    genres: ["Cyberpunk", "Science Fiction"],
    status: "in-progress",
    slug: "neon-meridian",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    authorName: "Kael Lysander",
    chapterCount: 18,
    totalWords: 62800,
    sparkCount: 189,
    contentRating: "R",
  },
  {
    id: "dummy-3",
    title: "Salt & Ruin",
    format: "novel",
    synopsis: "A cursed cartographer maps coastlines that shouldn't exist, each one leading her closer to the drowned city her mother died trying to find. The sea remembers everything — and it wants her back.",
    coverImageUrl: "/adventure_mode.png",
    genres: ["Dark Fantasy", "Mystery"],
    status: "in-progress",
    slug: "salt-and-ruin",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    authorName: "Maren Holt",
    chapterCount: 21,
    totalWords: 71500,
    sparkCount: 247,
    contentRating: "PG13",
  },
  {
    id: "dummy-4",
    title: "The Quiet Between",
    format: "novel",
    synopsis: "Two strangers share a hospital waiting room for seven nights. Through silence and small confessions, they rebuild something neither expected — not love, exactly, but a reason to stay.",
    coverImageUrl: "/dashboard/study-morning.png",
    genres: ["Literary Fiction", "Drama"],
    status: "complete",
    slug: "the-quiet-between",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    authorName: "Sora Tanaka",
    chapterCount: 12,
    totalWords: 38900,
    sparkCount: 156,
    contentRating: "PG",
  },
  {
    id: "dummy-5",
    title: "Axiom Breach",
    format: "novel",
    synopsis: "When a theoretical physicist accidentally proves that free will is a computational error, governments race to weaponize the discovery. She has 72 hours to destroy her own proof before someone uses it.",
    coverImageUrl: "/dashboard/study-night.png",
    genres: ["Science Fiction", "Thriller"],
    status: "in-progress",
    slug: "axiom-breach",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    authorName: "Dex Calloway",
    chapterCount: 16,
    totalWords: 55300,
    sparkCount: 203,
    contentRating: "PG13",
  },
  {
    id: "dummy-6",
    title: "Bloodroot",
    format: "novel",
    synopsis: "A botanist inherits her grandmother's estate in rural Appalachia, along with a garden that blooms exclusively at night. The flowers are beautiful. The soil is hungry. The roots go deeper than the house.",
    coverImageUrl: "/dashboard/study-afternoon.png",
    genres: ["Horror", "Paranormal"],
    status: "in-progress",
    slug: "bloodroot",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    authorName: "Elowen Ashford",
    chapterCount: 15,
    totalWords: 48600,
    sparkCount: 178,
    contentRating: "R",
  },
  {
    id: "dummy-7",
    title: "Wandering Stars",
    format: "novel",
    synopsis: "Three siblings inherit a travelling circus that moves between dimensions. Each show is a doorway, each audience a different species. The ringmaster left no instructions — only a warning not to let the tent collapse.",
    coverImageUrl: null,
    genres: ["Fantasy", "Adventure"],
    status: "in-progress",
    slug: "wandering-stars",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    authorName: "Ren Solaris",
    chapterCount: 9,
    totalWords: 31200,
    sparkCount: 94,
    contentRating: "PG",
  },
  {
    id: "dummy-8",
    title: "The Last Cartographer",
    format: "novel",
    synopsis: "In a world where the edges of the map are literally unwritten, one woman's job is to walk into the blank spaces and decide what exists there. Her latest expedition discovers something that was never supposed to be found.",
    coverImageUrl: null,
    genres: ["Magical Realism", "Literary Fiction"],
    status: "in-progress",
    slug: "the-last-cartographer",
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    authorName: "Lira Voss",
    chapterCount: 14,
    totalWords: 45800,
    sparkCount: 132,
    contentRating: "PG",
  },
  {
    id: "dummy-9",
    title: "Midnight Protocol",
    format: "novel",
    synopsis: "A retired spy receives a coded message from an agent who's been dead for ten years. The code is one only they knew. Following the trail leads back to a conspiracy that never ended — it just went deeper underground.",
    coverImageUrl: null,
    genres: ["Thriller", "Mystery"],
    status: "complete",
    slug: "midnight-protocol",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    authorName: "Jack Mercer",
    chapterCount: 22,
    totalWords: 67400,
    sparkCount: 267,
    contentRating: "R",
  },
];

interface Story {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  status: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
  contentRating: string;
}

interface StaffPick extends Story {
  pickId: string;
  curatorNote: string;
  pickedBy: string;
  pickedAt: string;
}

// ── Genre Wing data — accent colors & icons for the library wings ──
const GENRE_WINGS: Record<string, { accent: string; accentBg: string; accentBorder: string; accentGlow: string }> = {
  Fantasy: { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/30", accentGlow: "rgba(200,150,60,0.08)" },
  "Science Fiction": { accent: "text-lavender", accentBg: "bg-lavender", accentBorder: "border-lavender/30", accentGlow: "rgba(150,130,200,0.08)" },
  Romance: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,100,110,0.08)" },
  Mystery: { accent: "text-violet", accentBg: "bg-violet", accentBorder: "border-violet/30", accentGlow: "rgba(140,100,180,0.08)" },
  Thriller: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,100,110,0.08)" },
  Horror: { accent: "text-rose", accentBg: "bg-rose", accentBorder: "border-rose/30", accentGlow: "rgba(200,80,90,0.08)" },
  Adventure: { accent: "text-teal", accentBg: "bg-teal", accentBorder: "border-teal/30", accentGlow: "rgba(80,160,150,0.08)" },
  "Dark Fantasy": { accent: "text-violet", accentBg: "bg-violet", accentBorder: "border-violet/30", accentGlow: "rgba(140,100,180,0.08)" },
  Cyberpunk: { accent: "text-lavender", accentBg: "bg-lavender", accentBorder: "border-lavender/30", accentGlow: "rgba(150,130,200,0.08)" },
  "Slice of Life": { accent: "text-sage", accentBg: "bg-sage", accentBorder: "border-sage/30", accentGlow: "rgba(120,160,100,0.08)" },
  Mythology: { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/30", accentGlow: "rgba(200,150,60,0.08)" },
  "Historical Fiction": { accent: "text-copper", accentBg: "bg-copper", accentBorder: "border-copper/30", accentGlow: "rgba(180,120,60,0.08)" },
};

const DEFAULT_WING = { accent: "text-amber", accentBg: "bg-amber", accentBorder: "border-amber/20", accentGlow: "rgba(200,150,60,0.06)" };

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "most-sparked", label: "Most Sparked" },
  { value: "most-read", label: "Most Read" },
  { value: "rising", label: "Rising" },
];

const FORMAT_OPTIONS = ["All", "Novel", "Webtoon", "Poetry", "Screenplay"];

// ── Seeded random for stable hydration ──
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const DUST_SEED = seededRandom(314);
const DUST_MOTES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: DUST_SEED() * 100,
  startY: 20 + DUST_SEED() * 60,
  size: 1 + DUST_SEED() * 2.5,
  duration: 10 + DUST_SEED() * 15,
  delay: DUST_SEED() * 12,
  drift: (DUST_SEED() - 0.5) * 30,
  opacity: 0.1 + DUST_SEED() * 0.25,
}));

// ── Library dust particles ──
function LibraryDust() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {DUST_MOTES.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full bg-gold"
          style={{ width: m.size, height: m.size, left: `${m.x}%`, filter: m.size > 2.5 ? "blur(1px)" : "none" }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 30}vh`,
            x: [0, m.drift, 0],
            opacity: [0, m.opacity, 0],
          }}
          transition={{ duration: m.duration, repeat: Infinity, delay: m.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-text-ghost text-[12px] uppercase tracking-[0.15em]">Entering the library...</p>
        </div>
      </div>
    }>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("latest");
  const [formatFilter, setFormatFilter] = useState("All");
  const [maxRating, setMaxRating] = useState<string>("all");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffPicks, setStaffPicks] = useState<StaffPick[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem("quiloria-comfort-rating");
    if (saved) setMaxRating(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("quiloria-comfort-rating", maxRating);
  }, [maxRating]);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchStories() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ public: "true", limit: "30" });
        if (debouncedQuery) params.set("search", debouncedQuery);
        if (sortBy !== "latest") params.set("sort", sortBy);
        const res = await fetch(`/api/stories?${params}`);
        const json = await res.json();
        if (res.ok) {
          // Merge real stories with dummy data for testing
          const real = json.data.stories || [];
          const realIds = new Set(real.map((s: Story) => s.id));
          const dummies = DUMMY_STORIES.filter((d) => !realIds.has(d.id));
          setStories([...real, ...dummies]);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [debouncedQuery, sortBy]);

  useEffect(() => {
    async function fetchStaffPicks() {
      try {
        const res = await fetch("/api/staff-picks");
        if (res.ok) {
          const json = await res.json();
          setStaffPicks(json.data || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchStaffPicks();
  }, []);

  const RATING_LEVELS: Record<string, number> = { everyone: 0, teen: 1, mature: 2, explicit: 3 };

  const filtered = stories.filter((story) => {
    if (selectedGenre && !story.genres.includes(selectedGenre)) return false;
    if (formatFilter !== "All" && story.format !== formatFilter.toLowerCase()) return false;
    if (maxRating !== "all") {
      const maxLevel = RATING_LEVELS[maxRating];
      const storyLevel = RATING_LEVELS[story.contentRating] ?? 0;
      if (storyLevel > maxLevel) return false;
    }
    return true;
  });

  const justPublished = useMemo(() => {
    return [...stories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [stories]);

  const popularFallback = useMemo(() => {
    return [...stories]
      .sort((a, b) => b.sparkCount - a.sparkCount)
      .slice(0, 6);
  }, [stories]);

  // Count stories per genre for wing badges
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s) => s.genres.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    return counts;
  }, [stories]);

  // Top genres with stories — show up to 8 most populated
  const topGenres = useMemo(() => {
    return GENRES
      .filter((g) => (genreCounts[g] || 0) > 0)
      .sort((a, b) => (genreCounts[b] || 0) - (genreCounts[a] || 0))
      .slice(0, 8);
  }, [genreCounts]);

  const isSearching = !!debouncedQuery;
  const showCuratedSections = !isSearching && !loading;

  const activeWing = selectedGenre ? (GENRE_WINGS[selectedGenre] || DEFAULT_WING) : null;

  const resultCountText = useMemo(() => {
    if (loading) return null;
    if (debouncedQuery) {
      return `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for \u2018${debouncedQuery}\u2019`;
    }
    if (selectedGenre) {
      return `${filtered.length} ${filtered.length === 1 ? "story" : "stories"} in ${selectedGenre}`;
    }
    return `${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
  }, [filtered.length, debouncedQuery, selectedGenre, loading]);

  return (
    <div className="relative">
      {/* ══════════════════════════════════════════════════════════
          LIBRARY HERO — the grand entrance
          ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Ambient background glow — shifts color when a genre wing is selected */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full"
            animate={{
              background: activeWing
                ? `radial-gradient(ellipse at center, ${activeWing.accentGlow} 0%, transparent 70%)`
                : "radial-gradient(ellipse at center, rgba(200,150,60,0.05) 0%, transparent 70%)",
            }}
            transition={{ duration: 1.2 }}
          />
        </div>

        {/* Floating library dust */}
        <LibraryDust />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-text-ghost text-[10px] uppercase tracking-[0.25em] font-display mb-3"
            >
              Quiloria
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl text-paper font-medium tracking-tight"
            >
              The Grand <span className="text-gold italic">Library</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-text-secondary text-[14px] md:text-[15px] mt-4 max-w-md mx-auto leading-relaxed"
            >
              Wander the shelves, discover new worlds, and find the stories that speak to you.
            </motion.p>
          </motion.div>

          {/* ── Search Portal — the magical search bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className={`relative group transition-all duration-500 ${searchFocused ? "scale-[1.02]" : ""}`}>
              {/* Glow ring behind search */}
              <div className={`absolute -inset-px rounded-2xl transition-all duration-500 ${
                searchFocused
                  ? "bg-gradient-to-r from-amber/25 via-gold/15 to-amber/25 shadow-[0_0_30px_rgba(200,150,60,0.12)]"
                  : "bg-gradient-to-r from-border via-border-subtle to-border"
              }`} />

              <div className="relative flex items-center gap-3 bg-elevated/90 backdrop-blur-sm rounded-2xl px-5 py-3.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`flex-shrink-0 transition-colors duration-300 ${searchFocused ? "text-amber" : "text-text-ghost"}`}
                >
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="M12.5 12.5L16 16" />
                </svg>
                <input
                  type="text"
                  placeholder="Search the library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="bg-transparent text-[14px] text-text outline-none placeholder:text-text-ghost w-full font-body"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-text-ghost hover:text-text-secondary transition-colors p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Fade to void */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* ══════════════════════════════════════════════════════════
            GENRE WINGS — choose your wing of the library
            ══════════════════════════════════════════════════════════ */}
        {showCuratedSections && topGenres.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Browse the Wings
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topGenres.map((genre, i) => {
                const wing = GENRE_WINGS[genre] || DEFAULT_WING;
                const isActive = selectedGenre === genre;
                const count = genreCounts[genre] || 0;

                return (
                  <motion.button
                    key={genre}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 + i * 0.04 }}
                    onClick={() => setSelectedGenre(isActive ? null : genre)}
                    className={`relative group text-left px-4 py-3.5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive
                        ? `${wing.accentBorder} bg-surface/80`
                        : "border-border hover:border-border-active bg-surface/40 hover:bg-surface/60"
                    }`}
                  >
                    {/* Active glow */}
                    {isActive && (
                      <motion.div
                        layoutId="wing-glow"
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at center, ${wing.accentGlow} 0%, transparent 80%)` }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}

                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className={`text-[13px] font-medium transition-colors duration-200 ${
                          isActive ? wing.accent : "text-paper group-hover:text-paper"
                        }`}>
                          {genre}
                        </p>
                        <p className="text-[11px] text-text-ghost mt-0.5">
                          {count} {count === 1 ? "story" : "stories"}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isActive ? `${wing.accentBg} scale-125` : "bg-border group-hover:bg-text-ghost"
                      }`} />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Full genre list toggle */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedGenre === null
                    ? "bg-amber text-void shadow-sm shadow-amber/20"
                    : "bg-elevated/60 text-text-secondary hover:text-paper"
                }`}
              >
                All Genres
              </button>
              {GENRES.filter((g) => !topGenres.includes(g)).map((genre) => (
                <div key={genre} className="flex-shrink-0">
                  <GenrePill
                    genre={genre}
                    size="sm"
                    selected={selectedGenre === genre}
                    onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAFF PICKS — the librarian's recommendations
            ══════════════════════════════════════════════════════════ */}
        {showCuratedSections && !selectedGenre && staffPicks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                The Librarian Recommends
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {staffPicks.map((pick, i) => (
                <motion.div
                  key={pick.pickId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 + i * 0.06 }}
                >
                  <Link
                    href={`/story/${pick.slug || pick.id}`}
                    className="block group"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-amber/15 hover:border-amber/30 transition-all duration-300">
                      {/* Gold accent line */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

                      {/* Cover area */}
                      <div className="h-40 relative overflow-hidden bg-gradient-to-br from-amber/10 to-amber/[0.02]">
                        {pick.coverImageUrl ? (
                          <img
                            src={pick.coverImageUrl}
                            alt={pick.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-amber/20">
                              <path d="M2 3l9 3.5L20 3v14l-9 3.5L2 17V3z" />
                              <path d="M11 6.5V20" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
                        {/* Staff pick badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-void/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                            <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                          </svg>
                          <span className="text-[10px] text-amber font-medium uppercase tracking-wider">Staff Pick</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 bg-surface/60">
                        <h3 className="font-display text-paper text-[16px] font-semibold group-hover:text-amber transition-colors leading-snug">
                          {pick.title}
                        </h3>
                        {pick.authorName && (
                          <p className="text-text-secondary text-[12px] mt-1">by {pick.authorName}</p>
                        )}
                        {pick.curatorNote && (
                          <p className="text-text-tertiary text-[12px] italic leading-relaxed mt-3 font-reading line-clamp-2">
                            &ldquo;{pick.curatorNote}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {pick.genres.slice(0, 2).map((g) => (
                            <GenrePill key={g} genre={g} size="sm" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            JUST ARRIVED — new additions to the collection
            ══════════════════════════════════════════════════════════ */}
        {showCuratedSections && !selectedGenre && justPublished.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-14"
          >
            <div className="flourish mb-6">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                Just Arrived
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {justPublished.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52 + i * 0.04 }}
                >
                  <Link
                    href={`/story/${story.slug || story.id}`}
                    className="flex items-center gap-4 card-page p-4 group transition-all duration-200 hover:border-amber/20"
                  >
                    {/* Cover */}
                    <div className="w-14 h-[72px] rounded-lg flex-shrink-0 overflow-hidden border border-border-subtle bg-gradient-to-br from-amber/10 to-amber/[0.02]">
                      {story.coverImageUrl ? (
                        <img src={story.coverImageUrl} alt={story.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-amber/30">
                            <rect x="4" y="2" width="12" height="16" rx="1.5" />
                            <path d="M7 6h6M7 9h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-medium text-paper truncate group-hover:text-amber transition-colors">
                        {story.title}
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                        {story.authorName || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {story.genres.slice(0, 1).map((g) => (
                          <GenrePill key={g} genre={g} size="sm" />
                        ))}
                        <span className="text-[10px] text-text-ghost">
                          {story.chapterCount} ch · {story.totalWords >= 1000 ? `${(story.totalWords / 1000).toFixed(1)}k` : story.totalWords} words
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════
            THE STACKS — main collection with filters
            ══════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="flourish mb-6">
            <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
              {selectedGenre ? `${selectedGenre} Wing` : "The Stacks"}
            </span>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Sort pills */}
            <div className="flex items-center gap-1 bg-surface/60 rounded-xl p-1 border border-border/50">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    sortBy === opt.value
                      ? "bg-elevated text-paper shadow-sm"
                      : "text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Format pills */}
            <div className="flex items-center gap-1 bg-surface/60 rounded-xl p-1 border border-border/50">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFormatFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    formatFilter === opt
                      ? "bg-elevated text-paper shadow-sm"
                      : "text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Rating dropdown — kept as select for its nuanced options */}
            <select
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="bg-surface/60 border border-border/50 rounded-xl px-3 py-[7px] text-[11px] text-text-secondary outline-none focus:border-amber/25 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Ratings</option>
              <option value="everyone">All Ages</option>
              <option value="teen">Teen &amp; Below</option>
              <option value="mature">Mature &amp; Below</option>
              <option value="explicit">Include Explicit</option>
            </select>

            {/* Result count */}
            {resultCountText && (
              <span className="text-text-ghost text-[11px] ml-auto">
                {resultCountText}
              </span>
            )}
          </div>

          {/* Story grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                <p className="text-text-ghost text-[11px] uppercase tracking-[0.12em]">Searching the stacks...</p>
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filtered.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.6 + i * 0.04, 1.2) }}
                >
                  <BookCard
                    title={story.title}
                    author={story.authorName || undefined}
                    genres={story.genres}
                    synopsis={story.synopsis || undefined}
                    wordCount={story.totalWords || 0}
                    chapterCount={story.chapterCount || 0}
                    sparkCount={story.sparkCount || 0}
                    slug={story.slug || story.id}
                    coverUrl={story.coverImageUrl || undefined}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            /* ── Empty state — these shelves are bare ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/10 to-amber/[0.02] border border-amber/10" />
                <div className="absolute -inset-6 bg-amber/5 rounded-full blur-3xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    className="text-amber/40"
                  >
                    {/* Empty bookshelf */}
                    <path d="M4 6h24M4 14h24M4 22h24M4 6v20M28 6v20" />
                    {/* Single book leaning */}
                    <path d="M13 14l2-8h3l-2 8" fill="currentColor" fillOpacity="0.1" />
                  </svg>
                </div>
              </div>
              <h3 className="font-display text-xl text-paper mb-2">
                {searchQuery ? "No tomes found" : "These shelves await their first stories"}
              </h3>
              <p className="text-text-secondary text-[13px] max-w-sm leading-relaxed">
                {searchQuery
                  ? "The library holds no records matching your search. Try different words or clear your filters."
                  : "The Grand Library grows with every story written. Be the first to place your work upon these shelves."}
              </p>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-5 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Clear search
                </button>
              )}

              {/* Popular fallback */}
              {popularFallback.length > 0 && (
                <div className="mt-14 w-full">
                  <div className="flourish mb-6">
                    <span className="font-display text-[11px] uppercase tracking-[0.18em] text-text-ghost px-4">
                      You Might Enjoy
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                    {popularFallback.map((story, i) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                      >
                        <BookCard
                          title={story.title}
                          author={story.authorName || undefined}
                          genres={story.genres}
                          synopsis={story.synopsis || undefined}
                          wordCount={story.totalWords || 0}
                          chapterCount={story.chapterCount || 0}
                          sparkCount={story.sparkCount || 0}
                          slug={story.slug || story.id}
                          coverUrl={story.coverImageUrl || undefined}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
