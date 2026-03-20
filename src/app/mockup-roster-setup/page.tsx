"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { GENRES } from "@/lib/genres";

// ── Types & Constants ─────────────────────────────────────

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

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}

// ── Live Preview Card Component ─────────────────────────────

function CharacterCard({ 
   displayName, tagline, roles, genres, availability, yearsWriting, lookingFor, colorLabel
}: { 
   displayName: string, tagline: string, roles: string[], genres: string[], availability: string, yearsWriting: string, lookingFor: string, colorLabel: string 
}) {
  const primaryRole = roles[0] || "writer";
  const roleData = ROLE_CRAFTS.find(r => r.id === primaryRole) || ROLE_CRAFTS[0];
  const color = colorLabel;

  // 3D Tilt Logic
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

  const handleMouseLeave = () => {
    x.set(200);
    y.set(300);
  };

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
        className={`group relative w-full aspect-[2/3.2] rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out border border-white/10 bg-ink`}
      >
        {/* Core Background Image (Placeholder texture) */}
        <div className="absolute inset-0 bg-void -z-20">
           <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-void" />
           <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/black-mamba.png')" }} />
        </div>

        {/* Dynamic Gradients based on Role Color */}
        <div className={`absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent z-0 opacity-90`} />
        
        {/* Ambient top glow */}
        <div className={`absolute -top-[20%] -left-[20%] w-[140%] h-[50%] bg-${color}/15 blur-[60px] rounded-full pointer-events-none transition-colors duration-500`} />

        {/* Border Glow specific to Role */}
        <div className={`absolute inset-0 ring-1 ring-inset ring-${color}/20 group-hover:ring-${color}/50 transition-all duration-500 rounded-3xl z-30 pointer-events-none`} />

        {/* 3D Content Container */}
        <div className="absolute inset-0 p-8 flex flex-col justify-end z-10" style={{ transform: "translateZ(40px)" }}>
          
          {/* Top Identifier (Role) */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start" style={{ transform: "translateZ(20px)" }}>
             <span className={`text-[10px] uppercase tracking-[0.2em] font-bold text-${color} border border-${color}/30 bg-${color}/10 px-3.5 py-1.5 rounded-full backdrop-blur-md transition-colors duration-500`}>
                {roleData.label}
             </span>
             
             {availability === "open" && (
                <span className="w-2.5 h-2.5 rounded-full bg-sage shadow-[0_0_12px_var(--color-sage)] animate-pulse" title="Open to projects" />
             )}
             {availability === "selective" && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber shadow-[0_0_12px_var(--color-amber)]" title="Selective" />
             )}
             {availability === "busy" && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose shadow-[0_0_12px_var(--color-rose)]" title="Busy" />
             )}
          </div>

          <div className="w-full relative h-[65%] flex flex-col justify-end">
             {/* Name & Tagline */}
             <motion.div style={{ transform: "translateZ(40px)" }} className="mb-5">
                <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-none mb-3 drop-shadow-md">
                   {displayName}
                </h2>
                <div className="h-[40px]">
                   <p className={`text-${color}/90 font-serif italic text-sm leading-snug drop-shadow-sm transition-colors duration-500 line-clamp-2`}>
                      {tagline ? `"${tagline}"` : "Your tagline appears here..."}
                   </p>
                </div>
             </motion.div>

             <motion.div style={{ transform: "translateZ(20px)" }} className="space-y-5">
                {/* Stats row */}
                <div className="flex items-center gap-5 text-xs font-medium text-text-ghost">
                   <div className="flex flex-col">
                      <span className="text-paper text-sm">{yearsWriting || "—"}</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Years</span>
                   </div>
                   <div className="w-px h-6 bg-border-subtle" />
                   <div className="flex flex-col">
                      <span className={`text-${color} text-sm drop-shadow-[0_0_8px_var(--color-${color})] transition-colors duration-500`}>0</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Sparks</span>
                   </div>
                   <div className="w-px h-6 bg-border-subtle" />
                   <div className="flex flex-col">
                      <span className="text-paper text-sm">0</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Words</span>
                   </div>
                </div>

                {/* Genres */}
                <div className={`flex flex-wrap gap-1.5 transition-opacity duration-300 min-h-[46px] ${genres.length === 0 ? 'opacity-40' : 'opacity-80 group-hover:opacity-100'}`}>
                   {genres.length > 0 ? (
                      <>
                         {genres.slice(0,4).map(g => (
                            <span key={g} className="px-2.5 py-1 rounded-md border border-border-subtle bg-surface/40 text-[9px] uppercase tracking-wider text-text-secondary">
                               {g}
                            </span>
                         ))}
                         {genres.length > 4 && (
                            <span className="px-1.5 py-1 text-[10px] text-text-tertiary">+{genres.length - 4}</span>
                         )}
                      </>
                   ) : (
                      <span className="px-2.5 py-1 rounded-md border border-dashed border-border-subtle bg-transparent text-[9px] uppercase tracking-wider text-text-ghost">
                         No genres selected
                      </span>
                   )}
                </div>
             </motion.div>

             {/* Looking For block */}
             <div className="overflow-hidden mt-4 pt-4 border-t border-white/10">
               <motion.div 
                 className="text-[12px] text-paper/80 font-body leading-relaxed max-h-32 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                 style={{ transform: "translateZ(15px)" }}
               >
                  <span className={`text-[9px] uppercase tracking-widest text-${color}/70 block mb-1.5 transition-colors duration-500`}>Looking For</span>
                  <p className="line-clamp-3">
                     {lookingFor || "Enter what kind of co-writers or projects you are seeking to naturally see it here..."}
                  </p>
               </motion.div>
             </div>

          </div>
        </div>

        {/* 3D Ambient Sheen/Glare Overlay */}
        <motion.div 
          className="absolute inset-0 pointer-events-none mix-blend-overlay z-40 transition-opacity duration-300 group-hover:opacity-100 opacity-0"
          style={{ 
            opacity: shineOpacity,
            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 25%, transparent 30%)",
            backgroundSize: "200% 200%",
            backgroundPosition: useTransform(x, [0, 400], ["100% 0%", "0% 100%"])
          }}
        />

      </motion.div>
    </motion.div>
  );
}

// ── Main Page Component ─────────────────────────────────────

export default function MockupRosterSetup() {
  const [tagline, setTagline] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["writer"]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availability, setAvailability] = useState("open");
  const [lookingFor, setLookingFor] = useState("");
  const [yearsWriting, setYearsWriting] = useState<string>("");
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);

  // Derived state to pass to the preview card
  const activeRoleColor = ROLE_CRAFTS.find(r => r.id === selectedRoles[0])?.color || "amber";
  
  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.length > 1 ? prev.filter((r) => r !== roleId) : prev
        : [...prev, roleId]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 10 ? prev : [...prev, genre]
    );
  };

  const filteredGenres = genreSearch
    ? GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()))
    : showAllGenres ? GENRES : POPULAR_GENRES;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-void flex flex-col lg:flex-row overflow-hidden font-body relative">
       
      {/* Abstract Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <motion.div 
           animate={{ backgroundColor: `var(--color-${activeRoleColor})` }}
           transition={{ duration: 1.5 }}
           className="absolute top-[20%] left-[20%] w-[30%] h-[40%] blur-[160px] rounded-full mix-blend-screen opacity-10"
         />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20 mix-blend-overlay" />
      </div>

      {/* ── LEFT SCREEN: The Mirror (Live Preview) ── */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-12 border-r border-border-subtle/30 z-10">
         
         <div className="absolute top-10 left-10">
            <Link href="/mockup-roster" className="flex items-center gap-2 text-text-ghost hover:text-paper transition-colors text-[11px] uppercase tracking-[0.15em] font-medium">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
               Back to Roster
            </Link>
         </div>

         <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full flex-1 flex flex-col items-center justify-center"
         >
            <p className="text-text-ghost text-[10px] uppercase tracking-[0.3em] font-medium mb-12 animate-pulse">
               The Mirror
            </p>
            
            <CharacterCard 
               displayName={"Your Name"}
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
                  As you forge your legend on the right, the mirror reflects your manifestation. This is how the realm will perceive you.
               </p>
            </div>
         </motion.div>
      </div>

      {/* ── RIGHT SCREEN: The Forge (Glassmorphic Form) ── */}
      <div className="w-full lg:w-1/2 h-full lg:h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar z-10 scroll-smooth">
         <div className="max-w-xl mx-auto px-6 py-12 lg:px-12 lg:py-20 relative">

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
               <h1 className="font-display text-4xl text-paper font-medium tracking-tight mb-3">
                 Shape Your Legend
               </h1>
               <p className="text-text-secondary text-sm">
                 Inscribe your capabilities and desires. Other visionaries will use this to find you.
               </p>
            </motion.div>

            <div className="space-y-12">
               
               {/* Craft Roles */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-4 flex justify-between items-end">
                     Primary Crafts
                     <span className="text-[9px] text-text-tertiary">Select all that apply</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {ROLE_CRAFTS.map(role => {
                        const isActive = selectedRoles.includes(role.id);
                        return (
                           <button
                             key={role.id}
                             onClick={() => toggleRole(role.id)}
                             className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                               isActive
                                 ? `border-${role.color}/40 bg-${role.color}/10 shadow-[0_0_25px_var(--color-${role.color},transparent)]`
                                 : "border-border-subtle bg-surface/30 hover:border-border-active hover:bg-surface/50"
                             }`}
                           >
                              <div className="relative z-10 flex items-center gap-3">
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isActive ? `text-${role.color}` : "text-text-ghost"}>
                                    <path d={role.icon} />
                                 </svg>
                                 <div>
                                    <p className={`text-[14px] font-medium transition-colors ${isActive ? `text-${role.color}` : "text-paper"}`}>
                                       {role.label}
                                    </p>
                                    <p className="text-[11px] text-text-tertiary mt-0.5">{role.desc}</p>
                                 </div>
                              </div>
                              {/* Background highlight glow */}
                              {isActive && (
                                 <div className={`absolute top-0 right-0 w-24 h-24 bg-${role.color}/20 blur-[30px] rounded-full -translate-y-1/2 translate-x-1/2`} />
                              )}
                           </button>
                        );
                     })}
                  </div>
               </motion.div>

               {/* Tagline */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">
                     The Tagline
                  </label>
                  <div className="relative group">
                     <input
                       type="text"
                       value={tagline}
                       onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                       placeholder="e.g. Weaver of dark fantasies and forgotten gods"
                       className={`w-full bg-ink/50 border border-border-subtle rounded-2xl px-5 py-4 text-[15px] text-paper font-serif italic placeholder:text-text-ghost/40 placeholder:not-italic focus:outline-none focus:border-${activeRoleColor}/50 focus:bg-ink transition-all shadow-inner relative z-10`}
                     />
                     {/* Focus Glow wrapper */}
                     <div className={`absolute inset-0 rounded-2xl bg-${activeRoleColor}/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500`} />
                     <p className="absolute -bottom-6 right-2 text-[9px] text-text-tertiary">{tagline.length}/100</p>
                  </div>
               </motion.div>

               {/* Availability & Experience Row */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                     <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">
                        Availability
                     </label>
                     <div className="flex flex-col gap-2">
                        {AVAILABILITY.map(a => {
                           const isActive = availability === a.id;
                           return (
                              <button
                                 key={a.id}
                                 onClick={() => setAvailability(a.id)}
                                 className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                                    isActive 
                                       ? `border-${activeRoleColor}/30 bg-${activeRoleColor}/5 shadow-sm` 
                                       : "border-border-subtle bg-transparent hover:border-border-active hover:bg-surface/20"
                                 }`}
                              >
                                 <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${isActive ? `border-${activeRoleColor}` : 'border-text-ghost'}`}>
                                    {isActive && <div className={`w-1.5 h-1.5 rounded-full bg-${activeRoleColor}`} />}
                                 </div>
                                 <span className={`text-[13px] ${isActive ? "text-paper" : "text-text-secondary"}`}>{a.label}</span>
                              </button>
                           );
                        })}
                     </div>
                  </div>
                  
                  <div>
                     <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">
                        Years Forging
                     </label>
                     <input
                        type="number"
                        min={0}
                        max={100}
                        value={yearsWriting}
                        onChange={(e) => setYearsWriting(e.target.value)}
                        placeholder="e.g. 5"
                        className={`w-full bg-ink/50 border border-border-subtle rounded-2xl px-5 py-4 text-[15px] text-paper focus:outline-none focus:border-${activeRoleColor}/50 transition-colors shadow-inner`}
                     />
                  </div>
               </motion.div>

               {/* Looking For */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-3 block">
                     What Seek You?
                  </label>
                  <textarea
                    value={lookingFor}
                    onChange={(e) => setLookingFor(e.target.value.slice(0, 300))}
                    placeholder="Describe the projects or collaborators you are hoping to find..."
                    rows={4}
                    className={`w-full bg-ink/50 border border-border-subtle rounded-2xl px-5 py-4 text-[14px] text-text font-body placeholder:text-text-ghost/40 resize-none focus:outline-none focus:border-${activeRoleColor}/50 focus:bg-ink transition-all shadow-inner`}
                  />
                  <p className="text-[9px] text-text-tertiary mt-2 text-right">{lookingFor.length}/300</p>
               </motion.div>

               {/* Genres / Focus */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                 <label className="text-[11px] uppercase tracking-widest text-text-ghost mb-4 flex justify-between items-end">
                     Lore Focus (Genres)
                     <span className="text-[9px] text-text-tertiary">{selectedGenres.length}/10 selected</span>
                  </label>
                  
                  {/* Selected Pinned */}
                  <AnimatePresence>
                     {selectedGenres.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-4 overflow-hidden">
                           {selectedGenres.map((genre) => (
                              <motion.span
                                 key={genre}
                                 initial={{ opacity: 0, scale: 0.8 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.8 }}
                                 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-${activeRoleColor}/30 bg-${activeRoleColor}/10 text-${activeRoleColor} text-[11px] font-medium shadow-[0_0_10px_var(--color-${activeRoleColor},transparent)]`}
                              >
                                 {genre}
                                 <button onClick={() => toggleGenre(genre)} className={`hover:text-paper ml-1 transition-colors`}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                 </button>
                              </motion.span>
                           ))}
                        </motion.div>
                     )}
                  </AnimatePresence>

                  {/* Search input for Genres */}
                  <div className="relative mb-4">
                     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-ghost pointer-events-none">
                        <circle cx="6.5" cy="6.5" r="5" />
                        <path d="M10.5 10.5L14 14" />
                     </svg>
                     <input
                        type="text"
                        value={genreSearch}
                        onChange={(e) => { setGenreSearch(e.target.value); if (e.target.value) setShowAllGenres(true); }}
                        placeholder="Search grimoires..."
                        className={`w-full bg-surface/40 border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-[13px] text-paper placeholder:text-text-ghost/50 focus:outline-none focus:border-${activeRoleColor}/40 transition-colors`}
                     />
                  </div>

                  {/* Pill cloud */}
                  <div className="flex flex-wrap gap-2">
                     {filteredGenres.filter((g) => !selectedGenres.includes(g)).map((genre) => (
                        <button
                           key={genre}
                           onClick={() => toggleGenre(genre)}
                           disabled={selectedGenres.length >= 10}
                           className={`px-4 py-2 rounded-xl border text-[11px] transition-all duration-200 ${
                              selectedGenres.length >= 10
                                 ? "border-border-subtle text-text-ghost/30 cursor-not-allowed bg-transparent"
                                 : `border-border-subtle text-text-secondary hover:border-${activeRoleColor}/40 hover:text-${activeRoleColor} bg-surface/20 hover:bg-surface/50`
                           }`}
                        >
                           {genre}
                        </button>
                     ))}
                  </div>
                  
                  {!genreSearch && (
                     <button
                        onClick={() => setShowAllGenres(!showAllGenres)}
                        className={`mt-4 text-[11px] text-text-ghost hover:text-${activeRoleColor} transition-colors capitalize`}
                     >
                        {showAllGenres ? "Close comprehensive archive" : `Browse full archive of genres \u2192`}
                     </button>
                  )}
               </motion.div>

               {/* Advanced details fake block for visual consistency */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="pt-8 border-t border-border/50">
                  <div className="bg-surface/30 border border-white/5 rounded-2xl p-6 flex items-center justify-between group cursor-pointer hover:bg-surface/50 hover:border-white/10 transition-colors">
                     <div>
                        <p className="text-paper text-[14px] font-medium flex items-center gap-2">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber transition-colors"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></svg>
                           Link Masterpieces
                        </p>
                        <p className="text-[11px] text-text-tertiary mt-1">Select stories from your vault to showcase on your card</p>
                     </div>
                     <span className="text-border-active group-hover:text-paper transition-colors">&rarr;</span>
                  </div>
               </motion.div>

               {/* Action Bar */}
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-8 flex justify-end">
                  <button className={`relative px-10 py-4 rounded-full font-display font-medium text-[15px] overflow-hidden group hover:scale-[1.02] transition-transform`}>
                     <div className={`absolute inset-0 bg-${activeRoleColor} opacity-90 group-hover:opacity-100 transition-opacity`} />
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                     <span className="relative z-10 text-void flex items-center gap-2 shadow-sm drop-shadow-sm">
                        Forge Card
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     </span>
                  </button>
               </motion.div>

            </div>
         </div>
      </div>
    </div>
  );
}
