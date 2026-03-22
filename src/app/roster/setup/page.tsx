"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { GENRES } from "@/config/genres";

// ── Constants ───────────────────────────────────────────────

const ROLE_CRAFTS = [
  { id: "writer", label: "Writer", desc: "Prose, narrative", color: "amber", icon: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" },
  { id: "illustrator", label: "Illustrator", desc: "Art, covers", color: "lavender", icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 9a3 3 0 100 6 3 3 0 000-6z" },
  { id: "editor", label: "Editor", desc: "Shaping, editing", color: "teal", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
  { id: "worldbuilder", label: "Architect", desc: "Lore, magic", color: "sage", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
] as const;

const AVAILABILITY = [
  { id: "open", label: "Open", desc: "Looking for projects", dot: "bg-sage" },
  { id: "selective", label: "Selective", desc: "Only the right fit", dot: "bg-amber" },
  { id: "busy", label: "Busy", desc: "Not taking work", dot: "bg-rose" },
] as const;

const POPULAR_GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Dark Fantasy", "Adventure",
  "Historical Fiction", "Cyberpunk", "Paranormal",
];

interface UserStory {
  id: string;
  title: string;
  coverImageUrl: string | null;
  status: string;
  slug: string | null;
}

// ── Live Preview Card ───────────────────────────────────────

function PreviewCard({
  displayName, tagline, roles, genres, availability, yearsWriting, lookingFor, colorLabel,
}: {
  displayName: string; tagline: string; roles: string[]; genres: string[];
  availability: string; yearsWriting: string; lookingFor: string; colorLabel: string;
}) {
  const primaryRole = roles[0] || "writer";
  const roleData = ROLE_CRAFTS.find((r) => r.id === primaryRole) || ROLE_CRAFTS[0];
  const color = colorLabel;

  const x = useMotionValue(200);
  const y = useMotionValue(300);
  const rotateX = useTransform(y, [0, 600], [8, -8]);
  const rotateY = useTransform(x, [0, 400], [-8, 8]);
  const shineOpacity = useTransform(y, [0, 600], [0.6, 0]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const handleMouseLeave = () => { x.set(200); y.set(300); };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative [perspective:1500px] w-full max-w-[360px] mx-auto"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative w-full aspect-[2/3.2] rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out border border-border bg-ink"
      >
        <div className="absolute inset-0 bg-void -z-20">
          <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-void" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent z-0 opacity-90" />
        <div className={`absolute -top-[20%] -left-[20%] w-[140%] h-[50%] bg-${color}/15 blur-[60px] rounded-full pointer-events-none transition-colors duration-500`} />
        <div className={`absolute inset-0 ring-1 ring-inset ring-${color}/20 group-hover:ring-${color}/50 transition-all duration-500 rounded-3xl z-30 pointer-events-none`} />

        <div className="absolute inset-0 p-8 flex flex-col justify-end z-10" style={{ transform: "translateZ(40px)" }}>
          {/* Top: Role + availability */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start" style={{ transform: "translateZ(20px)" }}>
            <span className={`text-[10px] uppercase tracking-[0.2em] font-bold text-${color} border border-${color}/30 bg-${color}/10 px-3.5 py-1.5 rounded-full backdrop-blur-md transition-colors duration-500`}>
              {roleData.label}
            </span>
            {availability === "open" && <span className="w-2.5 h-2.5 rounded-full bg-sage shadow-[0_0_12px_var(--color-sage)] animate-pulse" />}
            {availability === "selective" && <span className="w-2.5 h-2.5 rounded-full bg-amber shadow-[0_0_12px_var(--color-amber)]" />}
            {availability === "busy" && <span className="w-2.5 h-2.5 rounded-full bg-rose shadow-[0_0_12px_var(--color-rose)]" />}
          </div>

          <div className="w-full relative h-[65%] flex flex-col justify-end">
            <motion.div style={{ transform: "translateZ(40px)" }} className="mb-5">
              <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-none mb-3 drop-shadow-md">
                {displayName}
              </h2>
              <div className="h-[40px]">
                <p className={`text-${color}/90 font-reading italic text-sm leading-snug drop-shadow-sm transition-colors duration-500 line-clamp-2`}>
                  {tagline ? `\u201C${tagline}\u201D` : "Your tagline appears here..."}
                </p>
              </div>
            </motion.div>

            <motion.div style={{ transform: "translateZ(20px)" }} className="space-y-5">
              <div className="flex items-center gap-5 text-xs font-medium text-text-ghost">
                <div className="flex flex-col">
                  <span className="text-paper text-sm">{yearsWriting || "\u2014"}</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Years</span>
                </div>
                <div className="w-px h-6 bg-border-subtle" />
                <div className="flex flex-col">
                  <span className={`text-${color} text-sm transition-colors duration-500`}>0</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Sparks</span>
                </div>
                <div className="w-px h-6 bg-border-subtle" />
                <div className="flex flex-col">
                  <span className="text-paper text-sm">0</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-ghost/60">Words</span>
                </div>
              </div>

              <div className={`flex flex-wrap gap-1.5 transition-opacity duration-300 min-h-[46px] ${genres.length === 0 ? "opacity-40" : "opacity-80"}`}>
                {genres.length > 0 ? (
                  <>
                    {genres.slice(0, 4).map((g) => (
                      <span key={g} className="px-2.5 py-1 rounded-md border border-border-subtle bg-surface/40 text-[9px] uppercase tracking-wider text-text-secondary">{g}</span>
                    ))}
                    {genres.length > 4 && <span className="px-1.5 py-1 text-[10px] text-text-ghost/50">+{genres.length - 4}</span>}
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded-md border border-dashed border-border-subtle text-[9px] uppercase tracking-wider text-text-ghost">No genres selected</span>
                )}
              </div>
            </motion.div>

            <div className="overflow-hidden mt-4 pt-4 border-t border-border">
              <div className="text-[12px] text-paper/80 font-body leading-relaxed" style={{ transform: "translateZ(15px)" }}>
                <span className={`text-[9px] uppercase tracking-widest text-${color}/70 block mb-1.5 transition-colors duration-500`}>Looking For</span>
                <p className="line-clamp-3">{lookingFor || "Describe what you\u2019re seeking..."}</p>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay z-40 transition-opacity duration-300 group-hover:opacity-100 opacity-0 hidden sm:block"
          style={{
            opacity: shineOpacity,
            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 25%, transparent 30%)",
            backgroundSize: "200% 200%",
            backgroundPosition: useTransform(x, [0, 400], ["100% 0%", "0% 100%"]),
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function RosterSetupPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [tagline, setTagline] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["writer"]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availability, setAvailability] = useState("open");
  const [lookingFor, setLookingFor] = useState("");
  const [yearsWriting, setYearsWriting] = useState("");
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<{ label: string; url: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [myStories, setMyStories] = useState<UserStory[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);

  const activeRoleColor = ROLE_CRAFTS.find((r) => r.id === selectedRoles[0])?.color || "amber";
  const displayName = session?.user?.name || "Your Name";

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    async function loadData() {
      try {
        const [profileRes, storiesRes] = await Promise.all([
          fetch("/api/roster/me"),
          fetch("/api/stories?mine=true"),
        ]);
        if (profileRes.ok) {
          const json = await profileRes.json();
          if (json.data) {
            const p = json.data;
            setTagline(p.tagline || "");
            setSelectedRoles(p.roles || ["writer"]);
            setSelectedGenres(p.genres || []);
            setAvailability(p.availability || "open");
            setLookingFor(p.lookingFor || "");
            setYearsWriting(p.yearsWriting?.toString() || "");
            setShowcaseIds(p.showcaseStoryIds || []);
            setPortfolioLinks(p.portfolioLinks || []);
            setIsEditing(true);
            if ((p.showcaseStoryIds || []).length > 0) setShowShowcase(true);
            if ((p.portfolioLinks || []).length > 0) setShowPortfolio(true);
          }
        }
        if (storiesRes.ok) {
          const json = await storiesRes.json();
          setMyStories(json.data || []);
        }
      } catch {} finally { setLoading(false); }
    }
    loadData();
  }, [session]);

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) => prev.includes(id) ? (prev.length > 1 ? prev.filter((r) => r !== id) : prev) : [...prev, id]);
  };
  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : prev.length >= 10 ? prev : [...prev, g]);
  };
  const toggleShowcase = (id: string) => {
    setShowcaseIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]);
  };

  const filteredGenres = genreSearch
    ? GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()))
    : showAllGenres ? GENRES : POPULAR_GENRES;

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        roles: selectedRoles,
        availability,
        tagline: tagline.trim() || undefined,
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        lookingFor: lookingFor.trim() || undefined,
        yearsWriting: yearsWriting ? parseInt(yearsWriting) : undefined,
        showcaseStoryIds: showcaseIds.length > 0 ? showcaseIds : undefined,
        portfolioLinks: portfolioLinks.filter((l) => l.label.trim() && l.url.trim()).length > 0
          ? portfolioLinks.filter((l) => l.label.trim() && l.url.trim()) : undefined,
      };
      const res = await fetch("/api/roster/me", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message || "Failed to save"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/roster"), 1500);
    } catch { setError("Something went wrong."); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/roster/me", { method: "DELETE" });
      if (res.ok) router.push("/roster");
    } catch {} finally { setDeleting(false); }
  };

  // Loading
  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-[12px] text-text-ghost italic">Loading your card...</p>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-void flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-5 rounded-full bg-sage/15 border border-sage/20 flex items-center justify-center"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage"><path d="M5 12l5 5L20 7" /></svg>
          </motion.div>
          <h2 className="font-display text-2xl text-paper mb-2">{isEditing ? "Card updated!" : "You\u2019re on the Roster!"}</h2>
          <p className="text-text-secondary text-[13px]">Redirecting you back...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-void flex flex-col lg:flex-row overflow-hidden font-body relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ backgroundColor: `var(--color-${activeRoleColor})` }}
          transition={{ duration: 1.5 }}
          className="absolute top-[20%] left-[20%] w-[30%] h-[40%] blur-[160px] rounded-full mix-blend-screen opacity-10"
        />
      </div>

      {/* ── LEFT: The Mirror (Live Preview) ─────────────── */}
      <div className="hidden lg:flex w-[45%] relative flex-col items-center justify-center p-12 border-r border-border-subtle/30 z-10">
        <div className="absolute top-10 left-10">
          <Link href="/roster" className="flex items-center gap-2 text-text-ghost hover:text-paper transition-colors text-[11px] uppercase tracking-[0.15em] font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Roster
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="w-full flex-1 flex flex-col items-center justify-center">
          <p className="text-text-ghost text-[10px] uppercase tracking-[0.3em] font-medium mb-12 animate-pulse">The Mirror</p>
          <PreviewCard
            displayName={displayName}
            tagline={tagline}
            roles={selectedRoles}
            genres={selectedGenres}
            availability={availability}
            yearsWriting={yearsWriting}
            lookingFor={lookingFor}
            colorLabel={activeRoleColor}
          />
          <div className="mt-16 text-center max-w-sm">
            <p className="text-text-secondary text-[13px] leading-relaxed">
              This is how other creators will see you on the Roster. Fill in the form to shape your card.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT: The Form ─────────────────────────────── */}
      <div className="w-full lg:w-[55%] h-full lg:h-[calc(100vh-64px)] overflow-y-auto z-10 scroll-smooth">
        <div className="max-w-2xl mx-auto px-6 py-12 lg:px-14 lg:py-20 relative">
          {/* Mobile back link */}
          <Link href="/roster" className="lg:hidden flex items-center gap-1 text-text-ghost hover:text-amber transition-colors text-[12px] mb-6">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" /></svg>
            Back to Roster
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="font-display text-4xl text-paper font-medium tracking-tight mb-3">
              {isEditing ? "Edit Your Card" : "Shape Your Legend"}
            </h1>
            <p className="text-text-secondary text-sm">
              Inscribe your capabilities and desires. Other creators will use this to find you.
            </p>
          </motion.div>

          <div className="space-y-12">
            {/* Roles */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-4 flex justify-between items-end">
                Primary Crafts
                <span className="text-[9px] text-text-ghost/40">Select all that apply</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_CRAFTS.map((role) => {
                  const isActive = selectedRoles.includes(role.id);
                  return (
                    <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                      className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isActive ? `border-${role.color}/40 bg-${role.color}/10` : "border-border-subtle bg-surface/30 hover:border-border-active hover:bg-surface/50"
                      }`}>
                      <div className="relative z-10 flex items-center gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isActive ? `text-${role.color}` : "text-text-ghost"}>
                          <path d={role.icon} />
                        </svg>
                        <div>
                          <p className={`text-[14px] font-medium transition-colors ${isActive ? `text-${role.color}` : "text-paper"}`}>{role.label}</p>
                          <p className="text-[11px] text-text-ghost/60 mt-0.5">{role.desc}</p>
                        </div>
                      </div>
                      {isActive && <div className={`absolute top-0 right-0 w-24 h-24 bg-${role.color}/20 blur-[30px] rounded-full -translate-y-1/2 translate-x-1/2`} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">The Tagline</label>
              <div className="relative group">
                <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                  placeholder="e.g. Weaver of dark fantasies and forgotten gods"
                  className={`w-full bg-elevated/80 border border-border-subtle rounded-2xl px-5 py-4 text-[15px] text-paper font-reading italic placeholder:text-text-ghost/40 placeholder:not-italic focus:outline-none focus:border-${activeRoleColor}/50 focus:bg-elevated transition-all shadow-inner relative z-10`}
                />
                <div className={`absolute inset-0 rounded-2xl bg-${activeRoleColor}/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500`} />
                <p className="absolute -bottom-5 right-2 text-[9px] text-text-ghost/40">{tagline.length}/100</p>
              </div>
            </motion.div>

            {/* Availability + Years */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">Availability</label>
                <div className="flex flex-col gap-2">
                  {AVAILABILITY.map((a) => {
                    const isActive = availability === a.id;
                    return (
                      <button key={a.id} type="button" onClick={() => setAvailability(a.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                          isActive ? `border-${activeRoleColor}/30 bg-${activeRoleColor}/5` : "border-border-subtle bg-transparent hover:border-border-active hover:bg-surface/20"
                        }`}>
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${isActive ? `border-${activeRoleColor}` : "border-text-ghost"}`}>
                          {isActive && <div className={`w-1.5 h-1.5 rounded-full bg-${activeRoleColor}`} />}
                        </div>
                        <span className={`text-[13px] ${isActive ? "text-paper" : "text-text-secondary"}`}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">Years of Experience</label>
                <input type="number" min={0} max={100} value={yearsWriting} onChange={(e) => setYearsWriting(e.target.value)} placeholder="e.g. 5"
                  className={`w-full bg-elevated/80 border border-border-subtle rounded-2xl px-5 py-4 text-[15px] text-paper focus:outline-none focus:border-${activeRoleColor}/50 transition-colors shadow-inner`}
                />
              </div>
            </motion.div>

            {/* Looking For */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">What Are You Seeking?</label>
              <textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value.slice(0, 300))}
                placeholder="Describe the projects or collaborators you're hoping to find..."
                rows={4}
                className={`w-full bg-elevated/80 border border-border-subtle rounded-2xl px-5 py-4 text-[14px] text-text font-body placeholder:text-text-ghost/40 resize-none focus:outline-none focus:border-${activeRoleColor}/50 focus:bg-elevated transition-all shadow-inner`}
              />
              <p className="text-[9px] text-text-ghost/40 mt-2 text-right">{lookingFor.length}/300</p>
            </motion.div>

            {/* Genres */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-4 flex justify-between items-end">
                Genre Focus
                <span className="text-[9px] text-text-ghost/40">{selectedGenres.length}/10 selected</span>
              </label>

              <AnimatePresence>
                {selectedGenres.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-4 overflow-hidden">
                    {selectedGenres.map((genre) => (
                      <motion.span key={genre} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-${activeRoleColor}/30 bg-${activeRoleColor}/10 text-${activeRoleColor} text-[11px] font-medium`}>
                        {genre}
                        <button onClick={() => toggleGenre(genre)} className="hover:text-paper ml-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mb-4">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-ghost pointer-events-none">
                  <circle cx="6.5" cy="6.5" r="5" /><path d="M10.5 10.5L14 14" />
                </svg>
                <input type="text" value={genreSearch}
                  onChange={(e) => { setGenreSearch(e.target.value); if (e.target.value) setShowAllGenres(true); }}
                  placeholder="Search genres..."
                  className={`w-full bg-surface/40 border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-[13px] text-paper placeholder:text-text-ghost/50 focus:outline-none focus:border-${activeRoleColor}/40 transition-colors`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filteredGenres.filter((g) => !selectedGenres.includes(g)).map((genre) => (
                  <button key={genre} type="button" onClick={() => toggleGenre(genre)} disabled={selectedGenres.length >= 10}
                    className={`px-4 py-2 rounded-xl border text-[11px] transition-all duration-200 ${
                      selectedGenres.length >= 10
                        ? "border-border-subtle text-text-ghost/30 cursor-not-allowed"
                        : `border-border-subtle text-text-secondary hover:border-${activeRoleColor}/40 hover:text-${activeRoleColor} bg-surface/20 hover:bg-surface/50`
                    }`}>
                    {genre}
                  </button>
                ))}
              </div>
              {!genreSearch && (
                <button type="button" onClick={() => setShowAllGenres(!showAllGenres)}
                  className={`mt-4 text-[11px] text-text-ghost hover:text-${activeRoleColor} transition-colors`}>
                  {showAllGenres ? "Show fewer" : `Browse all ${GENRES.length} genres \u2192`}
                </button>
              )}
            </motion.div>

            {/* Showcase Stories (expandable) */}
            {myStories.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="pt-8 border-t border-border/50">
                <button type="button" onClick={() => setShowShowcase(!showShowcase)}
                  className="w-full bg-surface/30 border border-border-subtle rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-surface/50 hover:border-border transition-colors">
                  <div>
                    <p className="text-paper text-[14px] font-medium flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber transition-colors">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" />
                      </svg>
                      Showcase Stories
                      {showcaseIds.length > 0 && <span className="text-[11px] text-amber">{showcaseIds.length} selected</span>}
                    </p>
                    <p className="text-[11px] text-text-ghost/60 mt-1">Select stories from your collection to feature on your card</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className={`text-text-ghost transition-transform ${showShowcase ? "rotate-90" : ""}`}>
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showShowcase && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                        {myStories.map((story) => {
                          const isSelected = showcaseIds.includes(story.id);
                          return (
                            <button key={story.id} type="button" onClick={() => toggleShowcase(story.id)}
                              disabled={!isSelected && showcaseIds.length >= 5}
                              className={`relative text-left rounded-xl border overflow-hidden transition-all duration-200 ${
                                isSelected ? "border-amber/30 bg-amber/5 ring-1 ring-amber/20"
                                : showcaseIds.length >= 5 ? "border-border bg-surface/30 opacity-40"
                                : "border-border bg-surface/40 hover:border-border-subtle"
                              }`}>
                              <div className="relative w-full aspect-[3/2] bg-ink overflow-hidden">
                                {story.coverImageUrl ? (
                                  <Image src={story.coverImageUrl} alt="" fill sizes="200px" className="object-cover" unoptimized />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-amber/10 to-amber/5 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-ghost/30">
                                      <rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 4h6M5 7h6M5 10h3" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5"><p className="text-[12px] text-paper font-medium truncate">{story.title}</p></div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
                                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-void"><path d="M3 8l4 4 6-7" /></svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Portfolio Links (expandable) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <button type="button" onClick={() => setShowPortfolio(!showPortfolio)}
                className="w-full bg-surface/30 border border-border-subtle rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-surface/50 hover:border-border transition-colors">
                <div>
                  <p className="text-paper text-[14px] font-medium flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber transition-colors">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    External Links
                    {portfolioLinks.filter((l) => l.url).length > 0 && (
                      <span className="text-[11px] text-amber">{portfolioLinks.filter((l) => l.url).length} added</span>
                    )}
                  </p>
                  <p className="text-[11px] text-text-ghost/60 mt-1">Portfolio, social media, or other links</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`text-text-ghost transition-transform ${showPortfolio ? "rotate-90" : ""}`}>
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
              <AnimatePresence>
                {showPortfolio && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-3 pt-4">
                      {portfolioLinks.map((link, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="text" value={link.label} onChange={(e) => setPortfolioLinks((prev) => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
                            placeholder="Label" className="w-28 bg-elevated/80 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text placeholder:text-text-ghost/40 focus:outline-none focus:border-amber/30 transition-colors" />
                          <input type="url" value={link.url} onChange={(e) => setPortfolioLinks((prev) => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                            placeholder="https://..." className="flex-1 bg-elevated/80 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text placeholder:text-text-ghost/40 focus:outline-none focus:border-amber/30 transition-colors" />
                          <button type="button" onClick={() => setPortfolioLinks((prev) => prev.filter((_, j) => j !== i))}
                            className="text-text-ghost hover:text-rose transition-colors p-1">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l8 8M11 3l-8 8" /></svg>
                          </button>
                        </div>
                      ))}
                      {portfolioLinks.length < 5 && (
                        <button type="button" onClick={() => setPortfolioLinks((prev) => [...prev, { label: "", url: "" }])}
                          className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-amber transition-colors">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" /></svg>
                          Add link
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl border border-rose/25 bg-rose/5 text-rose text-[13px]">{error}</div>
            )}

            {/* Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="pt-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={saving || selectedRoles.length === 0}
                  className={`relative px-10 py-4 rounded-full font-display font-medium text-[15px] overflow-hidden group hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:cursor-not-allowed`}>
                  <div className={`absolute inset-0 bg-${activeRoleColor} opacity-90 group-hover:opacity-100 transition-opacity`} />
                  <span className="relative z-10 text-void flex items-center gap-2">
                    {saving ? "Saving..." : isEditing ? "Update Card" : "Forge Card"}
                    {!saving && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
                <Link href="/roster" className="text-text-ghost text-[13px] hover:text-text-secondary transition-colors">Cancel</Link>
              </div>
              {isEditing && (
                <button onClick={handleDelete} disabled={deleting}
                  className="text-rose/50 text-[12px] hover:text-rose transition-colors disabled:opacity-40">
                  {deleting ? "Removing..." : "Remove from Roster"}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
