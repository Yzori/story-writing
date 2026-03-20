"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

// ── Types & Data ──────────────────────────────────────────

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
    totalStories: 5,
    totalWords: 284000,
    totalSparks: 543,
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
    totalStories: 2,
    totalWords: 0,
    totalSparks: 189,
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
    totalStories: 0,
    totalWords: 0,
    totalSparks: 0,
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
    totalStories: 7,
    totalWords: 196000,
    totalSparks: 412,
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
    totalStories: 3,
    totalWords: 91000,
    totalSparks: 267,
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
    totalStories: 1,
    totalWords: 48600,
    totalSparks: 178,
  },
];

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}

// ── Components ────────────────────────────────────────────

function CharacterCard({ member, index }: { member: RosterMember; index: number }) {
  const primaryRole = member.roles[0] || "writer";
  const roleData = ROLE_CRAFTS.find(r => r.id === primaryRole) || ROLE_CRAFTS[0];
  const color = roleData.color;

  // 3D Tilt Logic
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
        className={`group relative w-full aspect-[2/3.2] max-w-[340px] mx-auto rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 ease-out border border-white/5 bg-ink`}
      >
        {/* Core Background Image (Avatar or Showcase) */}
        <div className="absolute inset-0 bg-void -z-20">
          {member.showcaseStories[0]?.coverImageUrl ? (
            <img 
              src={member.showcaseStories[0].coverImageUrl} 
              alt="Background" 
              className="w-full h-full object-cover opacity-30 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 blur-[2px] group-hover:blur-[8px]"
            />
          ) : (
             <div className="absolute inset-0 bg-gradient-to-br from-surface/50 to-void" />
          )}
        </div>

        {/* Dynamic Gradients based on Role Color */}
        <div className={`absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent z-0 opacity-90`} />
        
        {/* Border Glow specific to Role */}
        <div className={`absolute inset-0 ring-1 ring-inset ring-${color}/10 group-hover:ring-${color}/40 transition-all duration-500 rounded-3xl z-30 pointer-events-none`} />

        {/* 3D Content Container */}
        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end z-10" style={{ transform: "translateZ(30px)" }}>
          
          {/* Top Identifier (Role) */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start" style={{ transform: "translateZ(20px)" }}>
             <span className={`text-[10px] uppercase tracking-[0.2em] font-medium text-${color} border border-${color}/20 bg-${color}/10 px-3 py-1 rounded-full backdrop-blur-md`}>
                {roleData.label}
             </span>
             
             {member.availability === "open" && (
                <span className="w-2 h-2 rounded-full bg-sage shadow-[0_0_8px_var(--color-sage)] animate-pulse" title="Open to projects" />
             )}
          </div>

          <div className="w-full relative h-[60%] flex flex-col justify-end">
             {/* Name & Tagline */}
             <motion.div style={{ transform: "translateZ(40px)" }} className="mb-4">
                <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-none mb-2 drop-shadow-md">
                   {member.displayName}
                </h2>
                <p className={`text-${color}/80 font-serif italic text-sm leading-snug drop-shadow-sm`}>
                   "{member.tagline}"
                </p>
             </motion.div>

             <motion.div style={{ transform: "translateZ(20px)" }} className="space-y-4">
                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs font-medium text-text-ghost">
                   <div className="flex flex-col">
                      <span className="text-paper text-sm">{member.yearsWriting || "—"}</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Years</span>
                   </div>
                   <div className="w-px h-6 bg-border-subtle" />
                   <div className="flex flex-col">
                      <span className={`text-${color} text-sm drop-shadow-[0_0_8px_var(--color-${color})]`}>{member.totalSparks}</span>
                      <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Sparks</span>
                   </div>
                   {(member.totalWords > 0) && (
                      <>
                         <div className="w-px h-6 bg-border-subtle" />
                         <div className="flex flex-col">
                            <span className="text-paper text-sm">{formatNumber(member.totalWords)}</span>
                            <span className="text-[9px] uppercase tracking-widest text-text-tertiary">Words</span>
                         </div>
                      </>
                   )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                   {member.genres.slice(0,3).map(g => (
                      <span key={g} className="px-2 py-0.5 rounded-sm border border-border-subtle bg-surface/30 text-[9px] uppercase tracking-wider text-text-secondary">
                         {g}
                      </span>
                   ))}
                   {member.genres.length > 3 && (
                      <span className="px-1 py-0.5 text-[10px] text-text-tertiary">+{member.genres.length - 3}</span>
                   )}
                </div>
             </motion.div>

             {/* Hidden "Looking For" text that reveals on hover */}
             <div className="overflow-hidden mt-4">
               <motion.div 
                 initial={false}
                 className="text-[12px] text-paper/70 font-body leading-relaxed max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                 style={{ transform: "translateZ(10px)" }}
               >
                  <p className="border-t border-white/10 pt-4">
                     <span className="text-[9px] uppercase tracking-widest text-text-ghost block mb-1">Looking For</span>
                     {member.lookingFor || "Currently immersed in personal projects."}
                  </p>
               </motion.div>
             </div>

          </div>
        </div>

        {/* 3D Ambient Sheen/Glare Overlay */}
        <motion.div 
          className="absolute inset-0 pointer-events-none mix-blend-overlay z-40 transition-opacity duration-300 group-hover:opacity-100 opacity-0 hidden sm:block"
          style={{ 
            opacity: shineOpacity,
            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%)",
            backgroundSize: "200% 200%",
            backgroundPosition: useTransform(x, [0, 400], ["100% 0%", "0% 100%"])
          }}
        />

      </motion.div>
    </motion.div>
  );
}

export default function MockupRoster() {
  const [activeRoles, setActiveRoles] = useState<string[]>([]);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const toggleRole = (r: string) => {
    setActiveRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const toggleGenre = (g: string) => {
    setActiveGenre(prev => prev === g ? null : g);
  };

  const filteredMembers = useMemo(() => {
    let result = DUMMY_MEMBERS;
    if (activeRoles.length > 0) {
      result = result.filter(m => activeRoles.some(r => m.roles.includes(r)));
    }
    if (activeGenre) {
      result = result.filter(m => m.genres.includes(activeGenre));
    }
    return result;
  }, [activeRoles, activeGenre]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-void text-paper overflow-x-hidden font-body pb-32">
       
      {/* Abstract Animated Glow Background */}
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
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full">
         {/* Glassmorphic Command Center (Header & Filters) */}
         <div className="pt-12 pb-6 px-6">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto bg-surface/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-6 items-center justify-between"
            >
               <div className="w-full md:w-auto text-center md:text-left">
                  <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight mb-2">
                    The Directory
                  </h1>
                  <p className="text-amber text-[10px] uppercase tracking-[0.2em] font-semibold">
                    Discover Your Next Collaborator
                  </p>
               </div>

               <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
                  {/* Search/Filter Bar */}
                  <div className="relative w-full sm:w-64">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-ghost">
                           <circle cx="11" cy="11" r="8" />
                           <path d="M21 21l-4.35-4.35" />
                        </svg>
                     </div>
                     <input 
                        type="text" 
                        placeholder="Seek a creative..."
                        className="w-full bg-black/30 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-paper placeholder:text-text-ghost focus:outline-none focus:border-amber/40 focus:bg-black/50 transition-colors shadow-inner"
                     />
                  </div>

                  {/* Role Toggles as Segmented Buttons */}
                  <div className="flex bg-black/40 border border-white/10 rounded-full p-1 self-start sm:self-auto overflow-x-auto max-w-full hide-scrollbar shadow-inner">
                     {ROLE_CRAFTS.map(role => {
                        const isActive = activeRoles.includes(role.id);
                        return (
                           <button
                             key={role.id}
                             onClick={() => toggleRole(role.id)}
                             className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 whitespace-nowrap ${
                                isActive 
                                  ? `bg-${role.color}/20 text-${role.color} shadow-[0_0_15px_var(--color-${role.color},transparent)]` 
                                  : "text-text-secondary hover:text-paper hover:bg-white/5"
                             }`}
                           >
                              {role.label}
                           </button>
                        );
                     })}
                  </div>
               </div>
            </motion.div>

            {/* Secondary Filter: Genres */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-6xl mx-auto mt-6 px-2 flex gap-2 overflow-x-auto pb-2 hide-scrollbar mask-edges"
            >
               <span className="text-[10px] uppercase tracking-widest text-text-ghost flex items-center px-2 shrink-0">
                  Focus
               </span>
               {POPULAR_GENRES.map(genre => (
                  <button
                     key={genre}
                     onClick={() => toggleGenre(genre)}
                     className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all duration-300 shrink-0 border border-white/5 shadow-sm ${
                        activeGenre === genre 
                           ? "bg-amber/15 text-amber border-amber/30" 
                           : "bg-surface/30 text-text-secondary hover:bg-surface/50 hover:text-paper hover:border-white/10"
                     }`}
                  >
                     {genre}
                  </button>
               ))}
            </motion.div>
         </div>

         {/* Roster Cards Grid */}
         <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
            {filteredMembers.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-16 py-8">
                  <AnimatePresence>
                     {filteredMembers.map((member, i) => (
                        <CharacterCard key={member.userId} member={member} index={i} />
                     ))}
                  </AnimatePresence>
               </div>
            ) : (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                 className="text-center py-32 flex flex-col items-center"
               >
                  <div className="w-16 h-16 rounded-full bg-surface/50 border border-white/5 flex items-center justify-center mb-6 text-text-ghost shadow-inner">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 16l-4-4-4 4" />
                     </svg>
                  </div>
                  <h3 className="text-xl font-display text-paper mb-2">No travelers found.</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">Your query returns only shadows. Adjust your search or unbind the filters to reveal the creatives.</p>
               </motion.div>
            )}
         </div>
      </div>
    </div>
  );
}
