"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useSession } from "next-auth/react";
import { formatNumber } from "@/lib/format";

// ── Types ───────────────────────────────────────────────────

interface ShowcaseStory {
  id: string;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
}

interface RosterMember {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline: string | null;
  roles: string[];
  genres: string[];
  availability: string;
  yearsWriting: number | null;
  lookingFor: string | null;
  listedAt: string;
  showcaseStories: ShowcaseStory[];
  totalStories: number;
  totalWords: number;
  totalSparks: number;
}

// ── Constants ───────────────────────────────────────────────

const ROLE_CRAFTS = [
  { id: "writer", label: "Writers", color: "amber" },
  { id: "illustrator", label: "Illustrators", color: "lavender" },
  { id: "editor", label: "Editors", color: "teal" },
  { id: "worldbuilder", label: "Architects", color: "sage" },
];

const POPULAR_GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Dark Fantasy", "Adventure",
];

// ── Dummy creatives ─────────────────────────────────────────

const DUMMY_MEMBERS: RosterMember[] = [
  {
    userId: "g1",
    displayName: "Isolde Varen",
    avatarUrl: null,
    bio: null,
    tagline: "Weaver of dark fantasies and forgotten gods",
    roles: ["writer", "worldbuilder"],
    genres: ["Dark Fantasy", "Mythology", "Horror"],
    availability: "open",
    yearsWriting: 8,
    lookingFor: "A co-writer for a multi-POV dark fantasy epic spanning three continents.",
    listedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    showcaseStories: [
      { id: "s1", title: "The Ember Throne", slug: "the-ember-throne", coverImageUrl: "/solo_story_mode.png" },
      { id: "s2", title: "Ash & Oracle", slug: "ash-oracle", coverImageUrl: "/coop_story_mode.png" },
    ],
    totalStories: 5, totalWords: 284000, totalSparks: 543,
  },
  {
    userId: "g2",
    displayName: "Kael Lysander",
    avatarUrl: null,
    bio: null,
    tagline: "Painting worlds that words alone can't reach",
    roles: ["illustrator"],
    genres: ["Science Fiction", "Cyberpunk", "Fantasy"],
    availability: "selective",
    yearsWriting: 4,
    lookingFor: "Sci-fi or fantasy projects that need immersive chapter illustrations.",
    listedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    showcaseStories: [
      { id: "s3", title: "Neon Meridian", slug: "neon-meridian", coverImageUrl: "/adventure_mode.png" },
    ],
    totalStories: 2, totalWords: 0, totalSparks: 189,
  },
  {
    userId: "g3",
    displayName: "Maren Holt",
    avatarUrl: null,
    bio: null,
    tagline: "Every manuscript has a heartbeat. I help you find it.",
    roles: ["editor"],
    genres: ["Literary Fiction", "Historical Fiction", "Romance"],
    availability: "open",
    yearsWriting: 12,
    lookingFor: "Character-driven stories that need developmental editing or line-by-line polish.",
    listedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    showcaseStories: [],
    totalStories: 0, totalWords: 0, totalSparks: 0,
  },
  {
    userId: "g4",
    displayName: "Theron Ashwick",
    avatarUrl: null,
    bio: null,
    tagline: "Cartographer of impossible places",
    roles: ["worldbuilder", "writer"],
    genres: ["Fantasy", "Science Fiction", "Adventure"],
    availability: "open",
    yearsWriting: 6,
    lookingFor: "Collaborative worldbuilding for epic fantasy — magic systems, political intrigue, detailed lore.",
    listedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    showcaseStories: [
      { id: "s4", title: "The Cartographer's Lie", slug: "cartographers-lie", coverImageUrl: "/solo_story_mode.png" },
      { id: "s5", title: "Meridian Atlas", slug: "meridian-atlas", coverImageUrl: "/coop_story_mode.png" },
    ],
    totalStories: 7, totalWords: 196000, totalSparks: 412,
  },
  {
    userId: "g5",
    displayName: "Sable Moonsong",
    avatarUrl: null,
    bio: null,
    tagline: "Romances that bruise, fantasies that heal",
    roles: ["writer"],
    genres: ["Romance", "Fantasy", "Dark Fantasy"],
    availability: "open",
    yearsWriting: 3,
    lookingFor: "A writing partner for a slow-burn fantasy romance series.",
    listedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    showcaseStories: [
      { id: "s7", title: "Thornbound", slug: "thornbound", coverImageUrl: "/coop_story_mode.png" },
    ],
    totalStories: 3, totalWords: 91000, totalSparks: 267,
  },
  {
    userId: "g6",
    displayName: "Orion Blackwood",
    avatarUrl: null,
    bio: null,
    tagline: "Drawing the strange, the beautiful, and the in-between",
    roles: ["illustrator", "worldbuilder"],
    genres: ["Horror", "Paranormal", "Dark Fantasy"],
    availability: "busy",
    yearsWriting: 5,
    lookingFor: null,
    listedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    showcaseStories: [
      { id: "s8", title: "Bloodroot", slug: "bloodroot", coverImageUrl: "/adventure_mode.png" },
    ],
    totalStories: 1, totalWords: 48600, totalSparks: 178,
  },
];


// ── Character Card (3D Tilt Portrait) ───────────────────────

function CharacterCard({ member, index }: { member: RosterMember; index: number }) {
  const primaryRole = member.roles[0] || "writer";
  const roleData = ROLE_CRAFTS.find((r) => r.id === primaryRole) || ROLE_CRAFTS[0];
  const color = roleData.color;

  const x = useMotionValue(200);
  const y = useMotionValue(300);

  const rotateX = useTransform(y, [0, 600], [8, -8]);
  const rotateY = useTransform(x, [0, 400], [-8, 8]);
  const shineOpacity = useTransform(y, [0, 600], [0.5, 0]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(200);
    y.set(300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative [perspective:1500px]"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative w-full aspect-[2/3.2] max-w-[340px] mx-auto rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 ease-out border border-border bg-ink"
      >
        {/* Background image from showcase */}
        <div className="absolute inset-0 bg-void -z-20">
          {member.showcaseStories[0]?.coverImageUrl ? (
            <img
              src={member.showcaseStories[0].coverImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700 blur-[1px] group-hover:blur-[6px]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface/50 to-void" />
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent z-0 opacity-80" />

        {/* Role-colored border glow on hover */}
        <div
          className={`absolute inset-0 ring-1 ring-inset ring-${color}/10 group-hover:ring-${color}/40 transition-all duration-500 rounded-3xl z-30 pointer-events-none`}
        />

        {/* Content */}
        <div
          className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end z-10"
          style={{ transform: "translateZ(30px)" }}
        >
          {/* Top: Role badge + availability */}
          <div
            className="absolute top-6 left-6 right-6 flex justify-between items-start"
            style={{ transform: "translateZ(20px)" }}
          >
            <span
              className={`text-[10px] uppercase tracking-[0.2em] font-medium text-${color} border border-${color}/20 bg-${color}/10 px-3 py-1 rounded-full backdrop-blur-md`}
            >
              {roleData.label}
            </span>
            {member.availability === "open" && (
              <span
                className="w-2 h-2 rounded-full bg-sage shadow-[0_0_8px_var(--color-sage)] animate-pulse"
                title="Open to projects"
              />
            )}
          </div>

          {/* Bottom content */}
          <div className="w-full relative h-[60%] flex flex-col justify-end">
            {/* Name & Tagline */}
            <motion.div style={{ transform: "translateZ(40px)" }} className="mb-4">
              <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-none mb-2 drop-shadow-md">
                {member.displayName}
              </h2>
              <p className={`text-${color}/80 font-reading italic text-sm leading-snug drop-shadow-sm`}>
                &ldquo;{member.tagline}&rdquo;
              </p>
            </motion.div>

            <motion.div style={{ transform: "translateZ(20px)" }} className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs font-medium text-text-ghost">
                <div className="flex flex-col">
                  <span className="text-paper text-sm">{member.yearsWriting || "\u2014"}</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Years</span>
                </div>
                <div className="w-px h-6 bg-border-subtle" />
                <div className="flex flex-col">
                  <span className={`text-${color} text-sm`}>{member.totalSparks}</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Sparks</span>
                </div>
                {member.totalWords > 0 && (
                  <>
                    <div className="w-px h-6 bg-border-subtle" />
                    <div className="flex flex-col">
                      <span className="text-paper text-sm">{formatNumber(member.totalWords)}</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Words</span>
                    </div>
                  </>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                {member.genres.slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-sm border border-border-subtle bg-surface/30 text-[9px] uppercase tracking-wider text-text-secondary"
                  >
                    {g}
                  </span>
                ))}
                {member.genres.length > 3 && (
                  <span className="px-1 py-0.5 text-[10px] text-text-ghost/50">
                    +{member.genres.length - 3}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Looking For — reveals on hover */}
            <div className="overflow-hidden mt-4">
              <div
                className="text-[12px] text-paper/70 font-body leading-relaxed max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{ transform: "translateZ(10px)" }}
              >
                <p className="border-t border-border pt-4">
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost block mb-1">
                    Looking For
                  </span>
                  {member.lookingFor || "Currently immersed in personal projects."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3D shine overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay z-40 transition-opacity duration-300 group-hover:opacity-100 opacity-0 hidden sm:block"
          style={{
            opacity: shineOpacity,
            background:
              "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%)",
            backgroundSize: "200% 200%",
            backgroundPosition: useTransform(x, [0, 400], ["100% 0%", "0% 100%"]),
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────

function RosterPageContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialSearch = searchParams.get("q") || "";

  const [members, setMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set());
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isListed, setIsListed] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  /** True when rendering DUMMY_MEMBERS instead of live API data. */
  const [showingPreview, setShowingPreview] = useState(false);

  // Check if current user is on the roster
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/roster/me")
      .then((res) => res.json())
      .then((json) => setIsListed(!!json.data))
      .catch(() => {});
  }, [session]);

  // Fetch members
  const fetchMembers = async (params?: { roles?: string; genres?: string; search?: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.roles) query.set("roles", params.roles);
      if (params?.genres) query.set("genres", params.genres);
      if (params?.search) query.set("search", params.search);

      const res = await fetch(`/api/roster?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const fetched = json.data?.members || [];
        if (fetched.length > 0) {
          setMembers(fetched);
          setTotal(json.data?.total || fetched.length);
          setShowingPreview(false);
        } else {
          setMembers(DUMMY_MEMBERS);
          setTotal(DUMMY_MEMBERS.length);
          setShowingPreview(true);
        }
      } else {
        setMembers(DUMMY_MEMBERS);
        setTotal(DUMMY_MEMBERS.length);
        setShowingPreview(true);
      }
    } catch {
      setMembers(DUMMY_MEMBERS);
      setTotal(DUMMY_MEMBERS.length);
      setShowingPreview(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers({ search: initialSearch });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchMembers({
        search: value,
        roles: activeRoles.size > 0 ? Array.from(activeRoles).join(",") : undefined,
        genres: activeGenre || undefined,
      });
    }, 400);
    setSearchTimeout(timeout);
  };

  const toggleRole = (roleId: string) => {
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      fetchMembers({
        search,
        roles: next.size > 0 ? Array.from(next).join(",") : undefined,
        genres: activeGenre || undefined,
      });
      return next;
    });
  };

  const toggleGenre = (genre: string) => {
    const newGenre = activeGenre === genre ? null : genre;
    setActiveGenre(newGenre);
    fetchMembers({
      search,
      roles: activeRoles.size > 0 ? Array.from(activeRoles).join(",") : undefined,
      genres: newGenre || undefined,
    });
  };

  return (
    <div className="relative min-h-screen bg-void text-paper overflow-x-hidden font-body pb-32">
      {/* ── Breathing Ambient Background ────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet/20 blur-[150px] rounded-full mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-amber/15 blur-[150px] rounded-full mix-blend-screen"
        />
      </div>

      <div className="relative z-10 w-full">
        {/* ── Glassmorphic Command Bar ──────────────────────── */}
        <div className="pt-12 pb-6 px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto bg-surface/60 backdrop-blur-2xl border border-border rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col md:flex-row gap-6 items-center justify-between"
          >
            <div className="w-full md:w-auto text-center md:text-left">
              <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight mb-2">
                The Roster
              </h1>
              <p className="text-amber text-[10px] uppercase tracking-[0.2em] font-semibold">
                Discover Your Next Collaborator
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-ghost">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Seek a creative..."
                  className="w-full bg-elevated/80 border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-paper placeholder:text-text-ghost focus:outline-none focus:border-amber/40 focus:bg-elevated transition-colors"
                />
              </div>

              {/* Role Toggles */}
              <div className="flex bg-elevated/80 border border-border rounded-full p-1 self-start sm:self-auto overflow-x-auto max-w-full">
                {ROLE_CRAFTS.map((role) => {
                  const isActive = activeRoles.has(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 whitespace-nowrap ${
                        isActive
                          ? `bg-${role.color}/20 text-${role.color}`
                          : "text-text-secondary hover:text-paper hover:bg-subtle/50"
                      }`}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Genre Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-6xl mx-auto mt-6 px-2 flex gap-2 overflow-x-auto pb-2"
          >
            <span className="text-[10px] uppercase tracking-widest text-text-ghost flex items-center px-2 shrink-0">
              Focus
            </span>
            {POPULAR_GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all duration-300 shrink-0 border shadow-sm ${
                  activeGenre === genre
                    ? "bg-amber/15 text-amber border-amber/30"
                    : "bg-surface/40 text-text-secondary hover:bg-surface/60 hover:text-paper border-border"
                }`}
              >
                {genre}
              </button>
            ))}
          </motion.div>
        </div>

        {/* ── Result Count + Post CTA ──────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-text-ghost">
              {loading ? "Searching..." : `${total} creative${total !== 1 ? "s" : ""}`}
            </p>
            {session && (
              <Link
                href="/roster/setup"
                className="text-[12px] text-amber hover:text-amber-light transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Post your card
              </Link>
            )}
          </div>
        </div>

        {/* Preview banner — when no real members exist yet */}
        {!loading && showingPreview && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
            <div className="rounded-xl border border-amber/20 bg-amber/[0.04] px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber bg-amber/15 border border-amber/25 px-2 py-0.5 rounded-full shrink-0">
                Preview
              </span>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                These are sample creatives so you can see what the roster looks like.
                {session?.user && (
                  <> Be the first to{" "}
                    <Link href="/roster/setup" className="text-amber hover:text-amber-light underline">
                      post your card
                    </Link>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Cards Grid ───────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                <p className="text-[12px] text-text-ghost italic">Loading the roster...</p>
              </div>
            </div>
          ) : members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-16 py-8">
              <AnimatePresence>
                {members.map((member, i) => (
                  <CharacterCard key={member.userId} member={member} index={i} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-surface/50 border border-border-subtle flex items-center justify-center mb-6 text-text-ghost shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 16l-4-4-4 4" />
                </svg>
              </div>
              <h3 className="text-xl font-display text-paper mb-2">No creatives found</h3>
              <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
                Adjust your search or unbind the filters to reveal the creatives.
              </p>
              {session && (
                <Link
                  href="/roster/setup"
                  className="px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all"
                >
                  Join the Roster
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom banner for non-listed users ──────── */}
      <AnimatePresence>
        {session && isListed === false && !bannerDismissed && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="fixed bottom-0 left-0 right-0 z-40"
          >
            <div className="bg-surface/95 backdrop-blur-xl border-t border-amber/15">
              <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/15 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                      <path d="M8 1l2 4 4.4.6-3.2 3.1.8 4.3L8 11l-4 2 .8-4.3L1.6 5.6 6 5z" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-[13px] truncate">
                    <span className="text-paper font-medium">You&apos;re not on the Roster yet.</span>
                    {" "}Let creators find you for their next project.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href="/roster/setup"
                    className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all"
                  >
                    Post Your Card
                  </Link>
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="text-text-ghost hover:text-text-secondary transition-colors p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page Export with Suspense ────────────────────────────────

export default function RosterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            <p className="text-[12px] text-text-ghost italic">Loading the roster...</p>
          </div>
        </div>
      }
    >
      <RosterPageContent />
    </Suspense>
  );
}
