"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GENRES } from "@/config/genres";
import StoryCard from "@/components/shared/StoryCard";
import GenrePill from "@/components/shared/GenrePill";
import type { ApiStory } from "@/types/api";


interface StaffPick extends ApiStory {
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

const FORMAT_OPTIONS = [
  { value: "All", label: "All Formats", icon: null },
  { value: "novel", label: "Novels", icon: "M2 3l6 2.5L14 3v10l-6 2.5L2 13V3zM8 5.5V14" },
  { value: "webtoon", label: "Webtoons", icon: "M3 2h10v12H3zM5 5h6M5 8h6M5 11h3" },
  { value: "poetry", label: "Poetry", icon: "M4 2v12M8 4v8M12 3v10M6 14h4" },
  { value: "screenplay", label: "Scripts", icon: "M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zM5 5h6M5 7h4M5 9h5" },
  { value: "illustrated", label: "Illustrated", icon: "M2 3h12v10H2zM5 9l2-2 2 2 3-3M10 6a1 1 0 11-2 0 1 1 0 012 0z" },
  { value: "campaign", label: "Adventures", icon: "M8 2L3 5v6l5 3 5-3V5L8 2z" },
];

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

// ── Hero Particles for featured sections ──
const HeroParticles = () => {
  // Generate random stable particles
  const particles = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * -20,
    size: 2 + Math.random() * 3
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen z-10">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: `${p.y + 20}%`, x: `${p.x}%`, opacity: 0 }}
          animate={{ y: [`${p.y}%`, `${p.y - 30}%`], x: [`${p.x}%`, `${p.x + (Math.random() > 0.5 ? 10 : -10)}%`], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
          className="absolute rounded-full bg-violet-300 shadow-[0_0_10px_#a78bfa]"
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
};

// ── Skeleton loading card ──
const SkeletonCard = () => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="relative w-full aspect-[2/3] max-w-[280px] mx-auto rounded-xl overflow-hidden bg-white/[0.02] border border-white/5"
  >
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3">
      <div className="w-16 h-4 bg-white/5 rounded-full" />
      <div className="w-full h-6 bg-white/5 rounded-full" />
      <div className="w-2/3 h-6 bg-white/5 rounded-full" />
    </div>
  </motion.div>
);

// ── Enhanced 3D BookCard with flip animation ──
interface BookCardProps {
  title: string;
  author?: string;
  genres: string[];
  synopsis?: string;
  wordCount: number;
  chapterCount: number;
  sparkCount: number;
  slug: string;
  coverUrl?: string;
  format?: string;
}

const FORMAT_LABELS: Record<string, string> = {
  novel: "Novel",
  poetry: "Poetry",
  screenplay: "Screenplay",
  webtoon: "Webtoon",
  illustrated: "Illustrated",
  campaign: "Adventure",
};

function EnhancedBookCard({ title, author, genres, synopsis, wordCount, chapterCount, sparkCount, slug, coverUrl, format }: BookCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const primaryGenre = genres[0] || "Fantasy";
  const accentColor = primaryGenre === "Fantasy" ? "text-amber" :
                      primaryGenre === "Science Fiction" ? "text-lavender" :
                      primaryGenre === "Romance" ? "text-rose" :
                      primaryGenre === "Mystery" || primaryGenre === "Thriller" ? "text-violet" :
                      "text-amber";

  return (
    <Link href={`/story/${slug}`}>
      <motion.div
         layout
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9 }}
         transition={{ duration: 0.5 }}
         className="group pb-8 [perspective:2000px] cursor-pointer flex justify-center w-full"
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative w-full aspect-[2/3] max-w-[280px] shadow-2xl transition-all duration-300 group-hover:z-50"
        >

          {/* 1. The Book Base (Pages + Back Cover) */}
          <div className="absolute inset-0 rounded-r-2xl rounded-l-sm bg-surface border-y border-r border-border shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] overflow-hidden" style={{ transform: "translateZ(-1px)" }}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />

            {/* Page Content */}
            <div className="relative h-full flex flex-col p-6 pl-8">
              <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 font-display ${accentColor}`}>Chapter One</p>
              <div className="w-12 h-px bg-white/10 mb-5" />

              <p className="text-[13px] text-paper/80 leading-[1.8] font-serif flex-1">
                 {synopsis ? (
                   <>
                     <span className={`float-left text-4xl leading-7 pr-1.5 pt-1.5 font-display ${accentColor}`}>{synopsis.charAt(0)}</span>
                     {synopsis.substring(1, 200)}...
                   </>
                 ) : (
                   <>
                     <span className={`float-left text-4xl leading-7 pr-1.5 pt-1.5 font-display ${accentColor}`}>A</span>
                     story waiting to be discovered. Open this tome and begin your journey...
                   </>
                 )}
              </p>

              <div className="mt-auto pt-4 border-t border-white/5 pb-1">
                <div className="flex items-center justify-between text-[11px] text-paper/50 font-medium">
                  <div className="flex items-center gap-3">
                    <span>{wordCount >= 1000 ? `${(wordCount / 1000).toFixed(1)}k` : wordCount} wds</span>
                    <span>{chapterCount} chs</span>
                  </div>
                  <span className={`flex items-center gap-1 ${accentColor}`}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" /></svg>
                    {sparkCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. The Hardcover (Front Flips Open) */}
          <div className="absolute inset-0 origin-left transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(-155deg)] translate-z-[1px]">

            {/* FRONT of the Cover */}
            <div className="absolute inset-0 rounded-r-2xl rounded-l-sm overflow-hidden [backface-visibility:hidden] shadow-[2px_0_15px_rgba(0,0,0,0.6)] bg-void">
               {coverUrl ? (
                 <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
               ) : (
                 <div className="absolute inset-0 bg-gradient-to-br from-amber/20 to-violet/20" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

               {/* Realistic Spine Crease/Lighting */}
               <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/80 via-black/10 to-transparent pointer-events-none" />
               <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/20 mix-blend-overlay pointer-events-none" />

               <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none" />

               {/* Cover Composition */}
               <div className="relative h-full flex flex-col justify-end p-6 z-10 transition-transform duration-500" style={{ transform: "translateZ(30px)" }}>
                  <div className="mb-auto mt-4 ml-4 flex flex-wrap items-center gap-1.5">
                     <span className={`px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] ${accentColor} font-medium uppercase tracking-wider border border-white/10`}>
                        {primaryGenre}
                     </span>
                     {format && format !== "novel" && FORMAT_LABELS[format] && (
                       <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/80 font-medium uppercase tracking-wider border border-white/10">
                          {FORMAT_LABELS[format]}
                       </span>
                     )}
                  </div>

                  <div className="ml-4">
                     <h3 className="font-display text-white text-2xl font-bold leading-[1.1] mb-2 drop-shadow-md">{title}</h3>
                     <div className="w-8 h-[2px] bg-white/30 mb-2" />
                     <p className="text-white/80 text-[13px] font-medium tracking-wide uppercase">{author || "Anonymous"}</p>
                  </div>
               </div>
            </div>

            {/* BACK of the Cover (The Inside Endpaper) */}
            <div className="absolute inset-0 rounded-l-2xl rounded-r-sm overflow-hidden [backface-visibility:hidden] border-r border-black/50" style={{ transform: "rotateY(180deg)" }}>
               <div className="absolute inset-0 bg-[#121212]" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-50 mix-blend-overlay" />
               <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/90 via-black/40 to-transparent" />
               <div className="absolute inset-0 flex items-center justify-center opacity-5">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
               </div>
            </div>
          </div>

          {/* 3. Interactive Shadow */}
          <div className="absolute -bottom-4 left-4 right-2 h-6 bg-amber/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 -z-[20]" />

        </motion.div>
      </motion.div>
    </Link>
  );
}

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
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffPicks, setStaffPicks] = useState<StaffPick[]>([]);
  const [campaignStories, setCampaignStories] = useState<ApiStory[]>([]);
  const [boostedStories, setBoostedStories] = useState<(ApiStory & { boostExpiresAt: string })[]>([]);
  const [activeJams, setActiveJams] = useState<{ id: string; title: string; theme: string; liveStatus: string; entryCount: number; submissionEndsAt: string; votingEndsAt: string }[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
          setStories(json.data.stories || []);
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

  useEffect(() => {
    async function fetchBoosts() {
      try {
        const res = await fetch("/api/boosts");
        if (res.ok) {
          const json = await res.json();
          setBoostedStories(
            (json.data || []).map((b: Record<string, unknown>) => ({
              id: b.storyId,
              title: b.title,
              slug: b.slug,
              synopsis: b.synopsis,
              coverImageUrl: b.coverImageUrl,
              genres: b.genres,
              format: b.format,
              writingMode: b.writingMode,
              contentRating: b.contentRating,
              authorName: b.authorName,
              chapterCount: b.chapterCount,
              sparkCount: b.sparkCount,
              totalWords: b.totalWords,
              boostExpiresAt: b.boostExpiresAt,
            }))
          );
        }
      } catch {
        // silently fail
      }
    }
    fetchBoosts();
  }, []);

  useEffect(() => {
    async function fetchActiveJams() {
      try {
        const res = await fetch("/api/jams?status=open");
        if (res.ok) {
          const json = await res.json();
          const open = json.data || [];
          // Also fetch voting jams
          const votingRes = await fetch("/api/jams?status=voting");
          const voting = votingRes.ok ? (await votingRes.json()).data || [] : [];
          setActiveJams([...open, ...voting].slice(0, 3));
        }
      } catch {
        // silently fail
      }
    }
    fetchActiveJams();
  }, []);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/stories?public=true&writingMode=campaign&limit=6");
        if (res.ok) {
          const json = await res.json();
          setCampaignStories(json.data.stories || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchCampaigns();
  }, []);

  const RATING_LEVELS: Record<string, number> = { everyone: 0, teen: 1, mature: 2, explicit: 3 };

  const filtered = stories.filter((story) => {
    if (selectedGenre && !story.genres.includes(selectedGenre)) return false;
    if (formatFilter !== "All") {
      if (formatFilter === "campaign") {
        if (story.writingMode !== "campaign") return false;
      } else {
        if (story.format !== formatFilter || story.writingMode === "campaign") return false;
      }
    }
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

  // Remaining genres not in top list
  const remainingGenres = useMemo(() => {
    return GENRES.filter((g) => !topGenres.includes(g));
  }, [topGenres]);

  const isSearching = !!debouncedQuery;
  const hasFiltersActive = isSearching || !!selectedGenre || formatFilter !== "All";

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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
      {/* ══════════════════════════════════════════════════════════
          1. LIBRARY HERO — the grand entrance
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-10"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-medium text-paper tracking-tight drop-shadow-2xl mb-8"
            >
              The Grand <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber to-amber/50 italic pr-2">Archives</span>
            </motion.h1>
          </motion.div>

          {/* ── Search Portal — the magical search bar ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className={`relative transition-all duration-500 ${searchFocused ? "scale-[1.02]" : ""}`}>
              {/* Glow behind search */}
              <div className={`absolute inset-0 rounded-full transition-opacity duration-500 blur-xl ${searchFocused ? 'bg-amber/20 opacity-100' : 'bg-white/5 opacity-0'}`} />

              <div className="relative flex items-center bg-surface/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-6 shadow-2xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-ghost">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search for worlds, characters, or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full bg-transparent border-none outline-none text-paper placeholder:text-text-ghost pl-4 font-body text-lg"
                />
                <button className="bg-white/10 hover:bg-amber hover:text-void text-paper transition-all px-8 py-3 rounded-full font-medium ml-2">
                  Search
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Fade to void */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-void to-transparent pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* ══════════════════════════════════════════════════════════
            2. GENRE FILTER — mobile-first bottom sheet + desktop pills
            ══════════════════════════════════════════════════════════ */}

        {/* Desktop: Wrapped pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-4 hidden lg:block"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* All Genres pill */}
            <button
              onClick={() => setSelectedGenre(null)}
              className={`relative px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0 overflow-hidden ${
                selectedGenre === null
                  ? "text-void bg-amber shadow-[0_0_20px_rgba(198,154,71,0.3)] border border-amber"
                  : "text-text-secondary bg-surface/30 border border-white/5 hover:border-white/20 hover:text-paper"
              }`}
            >
              {selectedGenre === null && (
                <motion.div layoutId="filter-pill-bg" className="absolute inset-0 bg-gradient-to-r from-amber to-[#e6bc65] -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              )}
              All Genres
            </button>

            {/* All genres */}
            {[...topGenres, ...remainingGenres].map((genre) => {
              const wing = GENRE_WINGS[genre] || DEFAULT_WING;
              const isActive = selectedGenre === genre;
              const count = genreCounts[genre] || 0;

              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(isActive ? null : genre)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0 overflow-hidden ${
                    isActive
                      ? `bg-amber text-void shadow-[0_0_20px_rgba(198,154,71,0.3)] border border-amber`
                      : "bg-surface/30 text-text-secondary border border-white/5 hover:border-white/20 hover:text-paper"
                  }`}
                >
                  {isActive && (
                    <motion.div layoutId="filter-pill-bg" className="absolute inset-0 bg-gradient-to-r from-amber to-[#e6bc65] -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                  )}
                  <span>{genre}</span>
                  {count > 0 && (
                    <span className={`text-[11px] ${isActive ? "text-void/60" : "text-text-ghost"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Mobile: Filter button that opens bottom sheet */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-4 lg:hidden"
        >
          <button
            onClick={() => setFilterSheetOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-surface/60 backdrop-blur-sm border border-border rounded-2xl hover:border-amber/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-[14px] font-medium text-text">
                {selectedGenre || "All Genres"}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-ghost">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </motion.div>

        {/* Mobile: Bottom Sheet */}
        <AnimatePresence>
          {filterSheetOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFilterSheetOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-3xl z-50 max-h-[80vh] overflow-hidden lg:hidden"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-border-subtle rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <h3 className="font-display text-lg font-semibold text-paper">
                    Filter by Genre
                  </h3>
                  <button
                    onClick={() => setFilterSheetOpen(false)}
                    className="p-2 hover:bg-elevated rounded-full transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Genre Pills */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  <div className="flex flex-wrap gap-2">
                    {/* All Genres pill */}
                    <button
                      onClick={() => {
                        setSelectedGenre(null);
                        setFilterSheetOpen(false);
                      }}
                      className={`px-4 py-2.5 rounded-full text-[14px] font-medium transition-all ${
                        selectedGenre === null
                          ? "bg-amber text-void shadow-lg shadow-amber/30"
                          : "bg-elevated text-text-secondary border border-border hover:border-amber/30"
                      }`}
                    >
                      All Genres
                    </button>

                    {/* All genres */}
                    {[...topGenres, ...remainingGenres].map((genre) => {
                      const isActive = selectedGenre === genre;
                      const count = genreCounts[genre] || 0;

                      return (
                        <button
                          key={genre}
                          onClick={() => {
                            setSelectedGenre(isActive ? null : genre);
                            setFilterSheetOpen(false);
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-medium transition-all ${
                            isActive
                              ? "bg-amber text-void shadow-lg shadow-amber/30"
                              : "bg-elevated text-text-secondary border border-border hover:border-amber/30"
                          }`}
                        >
                          <span>{genre}</span>
                          {count > 0 && (
                            <span className={`text-[12px] ${isActive ? "text-void/60" : "text-text-ghost"}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════
            3. FILTER BAR — sort, format, rating, result count (sticky)
            ══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="sticky top-14 z-30 bg-void/95 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6"
        >
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-3 overflow-x-auto sm:overflow-visible scrollbar-hide">
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
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-surface/60 rounded-xl p-1 border border-border/50">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormatFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    formatFilter === opt.value
                      ? "bg-elevated text-paper shadow-sm"
                      : "text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {opt.icon && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="opacity-70">
                      <path d={opt.icon} />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Rating dropdown */}
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
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            4. MAIN STORY GRID — filtered results
            ══════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 py-8 min-h-[400px]">
              <AnimatePresence>
                {Array.from({length: 6}).map((_, i) => <SkeletonCard key={`skel-${i}`}/>)}
              </AnimatePresence>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 sm:gap-x-6 md:gap-x-8 gap-y-8 sm:gap-y-10 md:gap-y-12">
              {filtered.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.6 + i * 0.04, 1.2) }}
                >
                  <EnhancedBookCard
                    title={story.title}
                    author={story.authorName || undefined}
                    genres={story.genres}
                    synopsis={story.synopsis || undefined}
                    wordCount={story.totalWords || 0}
                    chapterCount={story.chapterCount || 0}
                    sparkCount={story.sparkCount || 0}
                    slug={story.slug || story.id}
                    coverUrl={story.coverImageUrl || undefined}
                    format={story.writingMode === "campaign" ? "campaign" : story.format}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            /* ── Empty state — these shelves are bare ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-text-ghost mb-5"
              >
                {/* Book icon */}
                <path d="M5 4c3-1 6-1 11 1v22c-5-2-8-2-11-1V4z" />
                <path d="M16 5c5-2 8-2 11-1v22c-3-1-6-1-11 1V5z" />
              </svg>
              <h3 className="font-display text-lg text-paper mb-2">
                {searchQuery
                  ? "No stories found"
                  : selectedGenre || formatFilter !== "All"
                    ? "No stories match these filters"
                    : "No stories yet"}
              </h3>
              <p className="text-text-secondary text-[13px] max-w-sm leading-relaxed">
                {searchQuery
                  ? "Try different keywords or adjust your filters."
                  : selectedGenre || formatFilter !== "All"
                    ? "Try broadening your filters or explore a different genre."
                    : "The library is waiting for its first stories."}
              </p>
              <p className="text-text-ghost text-[12px] mt-2">
                <Link href="/create" className="text-amber hover:text-amber-light transition-colors">
                  Create a story
                </Link>
                {" "}and be the first on these shelves.
              </p>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Clear search
                </button>
              )}

              {(selectedGenre || formatFilter !== "All") && (
                <button
                  onClick={() => { setSelectedGenre(null); setFormatFilter("All"); }}
                  className="mt-4 text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Clear filters
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 sm:gap-x-6 md:gap-x-8 gap-y-8 sm:gap-y-10 md:gap-y-12">
                    {popularFallback.map((story, i) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                      >
                        <EnhancedBookCard
                          title={story.title}
                          author={story.authorName || undefined}
                          genres={story.genres}
                          synopsis={story.synopsis || undefined}
                          wordCount={story.totalWords || 0}
                          chapterCount={story.chapterCount || 0}
                          sparkCount={story.sparkCount || 0}
                          slug={story.slug || story.id}
                          coverUrl={story.coverImageUrl || undefined}
                          format={story.writingMode === "campaign" ? "campaign" : story.format}
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
