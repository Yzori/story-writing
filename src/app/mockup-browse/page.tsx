"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "../../components/ThemeToggle";

// --- MOCK DATA ---
const FILTERS = ["All", "Fantasy", "Sci-Fi", "Cyberpunk", "Mystery"];

const FEATURED_STORY = {
  title: "Echoes of the Aether",
  author: "Elara Vance",
  genre: "Sci-Fi",
  description: "A dying star system. A rogue fleet. And a whisper from the void that promises salvation or ruin. Gather your party and chart the uncharted.",
  image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop",
  tags: ["Space Opera", "Magic", "Level 1-10"],
  color: "violet"
};

const LIBRARY_ITEMS = [
  { 
    id: 1, title: "The Obsidian Crown", author: "Kaelen Thorne", genre: "Fantasy", type: "Novel", 
    image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=800&auto=format&fit=crop", 
    color: "amber", accentColor: "text-amber", synopsis: "In a kingdom where fire is currency and ash is memory...", words: "84,200", chapters: 24, sparks: 312 
  },
  { 
    id: 2, title: "Whispering Pines", author: "GM Sarah", genre: "Mystery", type: "Campaign", 
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=800&auto=format&fit=crop", 
    color: "teal", accentColor: "text-teal", synopsis: "A small town with big secrets. Every Sunday, someone vanishes...", words: "12,000", chapters: 3, sparks: 55 
  },
  { 
    id: 3, title: "Neon Grifters", author: "Cyborg2088", genre: "Cyberpunk", type: "Co-op", 
    image: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=800&auto=format&fit=crop", 
    color: "violet", accentColor: "text-violet", synopsis: "Tokyo, 2089. A blacklisted neural architect takes one last job...", words: "62,800", chapters: 18, sparks: 189 
  },
  { 
    id: 4, title: "Sands of Time", author: "Desert Rose", genre: "Fantasy", type: "Lore Book", 
    image: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=800&auto=format&fit=crop", 
    color: "amber", accentColor: "text-amber", synopsis: "Mapping the ancient dunes and the ruins buried beneath...", words: "45,000", chapters: 12, sparks: 210 
  },
  { 
    id: 5, title: "The Hollow Depths", author: "Abysswalker", genre: "Sci-Fi", type: "Campaign", 
    image: "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop", 
    color: "teal", accentColor: "text-teal", synopsis: "A deep-sea mining colony goes dark. You are the rescue team.", words: "30,100", chapters: 8, sparks: 134 
  },
  { 
    id: 6, title: "Salt & Ruin", author: "Maren Holt", genre: "Fantasy", type: "Novel", 
    image: "https://images.unsplash.com/photo-1518063319782-b7d6052dc345?q=80&w=800&auto=format&fit=crop", 
    color: "rose", accentColor: "text-rose-400", synopsis: "A cursed cartographer maps coastlines that shouldn't exist...", words: "71,500", chapters: 21, sparks: 247 
  },
];

// --- ADVANCED COMPONENTS ---

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

function BookCard({ book }: { book: typeof LIBRARY_ITEMS[0] }) {
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

  return (
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
        className="relative w-full aspect-[2/3] max-w-[280px] shadow-2xl transition-all duration-300 group-hover:z-50 "
      >
        
        {/* 1. The Book Base (Pages + Back Cover) */}
        <div className="absolute inset-0 rounded-r-2xl rounded-l-sm bg-surface border-y border-r border-[#2a2a2a] shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] overflow-hidden" style={{ transform: "translateZ(-1px)" }}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />

          {/* Page Content */}
          <div className="relative h-full flex flex-col p-6 pl-8">
            <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 font-display ${book.accentColor}`}>Chapter One</p>
            <div className="w-12 h-px bg-white/10 mb-5" />

            <p className="text-[13px] text-paper/80 leading-[1.8] font-serif flex-1">
               <span className={`float-left text-4xl leading-7 pr-1.5 pt-1.5 font-display ${book.accentColor}`}>{book.synopsis.charAt(0)}</span>
               {book.synopsis.substring(1)}
            </p>

            <div className="mt-auto pt-4 border-t border-white/5 pb-1">
              <div className="flex items-center justify-between text-[11px] text-paper/50 font-medium">
                <div className="flex items-center gap-3">
                  <span>{book.words} wds</span>
                  <span>{book.chapters} chs</span>
                </div>
                <span className={`flex items-center gap-1 ${book.accentColor}`}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" /></svg>
                  {book.sparks}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. The Hardcover (Front Flips Open) */}
        <div className="absolute inset-0 origin-left transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(-155deg)] translate-z-[1px]">
          
          {/* FRONT of the Cover */}
          <div className="absolute inset-0 rounded-r-2xl rounded-l-sm overflow-hidden [backface-visibility:hidden] shadow-[2px_0_15px_rgba(0,0,0,0.6)] bg-void">
             <img src={book.image} alt={book.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
             
             {/* Realistic Spine Crease/Lighting */}
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/80 via-black/10 to-transparent pointer-events-none" />
             <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/20 mix-blend-overlay pointer-events-none" />
             
             <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none" />

             {/* Cover Composition */}
             <div className="relative h-full flex flex-col justify-end p-6 z-10 transition-transform duration-500" style={{ transform: "translateZ(30px)" }}>
                <div className="mb-auto mt-4 ml-4">
                   <span className={`px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] ${book.accentColor} font-medium uppercase tracking-wider border border-white/10`}>
                      {book.genre}
                   </span>
                </div>
                
                <div className="ml-4">
                   <h3 className="font-display text-white text-2xl font-bold leading-[1.1] mb-2 drop-shadow-md">{book.title}</h3>
                   <div className="w-8 h-[2px] bg-white/30 mb-2" />
                   <p className="text-white/80 text-[13px] font-medium tracking-wide uppercase">{book.author}</p>
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
        <div className={`absolute -bottom-4 left-4 right-2 h-6 bg-${book.color}/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 -z-[20]`} />

      </motion.div>
    </motion.div>
  );
}

export default function MockupBrowsePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroY = useTransform(scrollYProgress, [0, 0.2], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  // Derived state for Genre Filtering
  const filteredItems = useMemo(() => {
    return LIBRARY_ITEMS.filter(item => {
      const matchFilter = activeFilter === "All" || item.genre === activeFilter;
      const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [activeFilter, searchQuery]);

  // Handle Loading simulation on filter click
  const handleFilterClick = (filter: string) => {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
    setIsLoading(true);
    setTimeout(() => {
       setIsLoading(false);
    }, 600);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-void text-paper selection:bg-amber/30 font-body overflow-x-hidden relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <motion.div animate={{ x: [-100, 100, -100], y: [-50, 50, -50], scale: [1, 1.2, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet/5 blur-[150px]" />
        <motion.div animate={{ x: [100, -100, 100], y: [50, -50, 50], scale: [1.2, 1, 1.2] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[30%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber/5 blur-[150px]" />
        <div className="absolute inset-0 bg-void/40 backdrop-blur-[50px]" />
      </div>

      {/* --- MOCK NAVIGATION --- */}
      <nav className="fixed top-0 left-0 w-full p-6 lg:px-12 flex justify-between items-center z-50 border-b border-border-subtle/20 bg-void/50 backdrop-blur-md">
         <div className="font-display font-medium text-xl tracking-widest text-amber flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            INKWELL
         </div>
         <div className="flex gap-8 text-sm font-medium items-center invisible md:visible">
            <Link href="/mockup-homepage"><span className="text-paper/60 hover:text-paper cursor-pointer transition-colors">Home</span></Link>
            <span className="text-amber border-b border-amber pb-1 cursor-pointer">Library</span>
            <span className="text-paper/60 hover:text-paper cursor-pointer transition-colors">Studio</span>
            <ThemeToggle />
         </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 pt-32 pb-24 px-6 lg:px-12 max-w-screen-2xl mx-auto flex flex-col gap-16">
        
        {/* HERO SEARCH & FILTERS */}
        <motion.section style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center justify-center text-center mt-12 mb-8 relative z-20">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="font-display text-5xl md:text-7xl font-medium text-paper tracking-tight drop-shadow-2xl mb-8">
            The Grand <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber to-amber/50 italic pr-2">Archives</span>
          </motion.h1>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className={`relative w-full max-w-2xl transition-all duration-500 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
            <div className={`absolute inset-0 rounded-full transition-opacity duration-500 blur-xl ${isSearchFocused ? 'bg-amber/20 opacity-100' : 'bg-white/5 opacity-0'}`} />
            <div className="relative flex items-center bg-surface/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-6 shadow-2xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-ghost"><path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input 
                type="text" 
                placeholder="Search for worlds, characters, or authors..." 
                className="w-full bg-transparent border-none outline-none text-paper placeholder:text-text-ghost pl-4 font-body text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <button className="bg-white/10 hover:bg-amber hover:text-void text-paper transition-all px-8 py-3 rounded-full font-medium ml-2">Search</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="flex flex-wrap justify-center gap-3 mt-10">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => handleFilterClick(filter)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 overflow-hidden ${
                  activeFilter === filter 
                    ? "text-void bg-amber shadow-[0_0_20px_rgba(198,154,71,0.3)] border border-amber" 
                    : "text-text-secondary bg-surface/30 border border-white/5 hover:border-white/20 hover:text-paper"
                }`}
              >
                {activeFilter === filter && (
                  <motion.div layoutId="filter-pill-bg" className="absolute inset-0 bg-gradient-to-r from-amber to-[#e6bc65] -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
                {filter}
              </button>
            ))}
          </motion.div>
        </motion.section>

        {/* FEATURED STORY HERO */}
        <AnimatePresence>
          {activeFilter === "All" && searchQuery === "" && !isLoading && (
            <motion.section 
              initial={{ opacity: 0, y: 40, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.6 }}
              className="relative w-full aspect-[21/9] md:aspect-[21/7] rounded-[2rem] overflow-hidden group border border-white/10 shadow-2xl cursor-pointer mb-8 z-10"
            >
              <HeroParticles />
              <div className="absolute inset-0 overflow-hidden">
                <motion.img src={FEATURED_STORY.image} alt={FEATURED_STORY.title} className="w-full h-full object-cover scale-[1.05] group-hover:scale-100 opacity-60 group-hover:opacity-80 transition-all duration-[2s] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-transparent w-full md:w-2/3" />
              </div>

              <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-center max-w-3xl z-20">
                <div className="flex gap-3 mb-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-${FEATURED_STORY.color}/20 text-${FEATURED_STORY.color} border border-${FEATURED_STORY.color}/30 backdrop-blur-md`}>Featured</span>
                  <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-white/5 text-paper border border-white/10 backdrop-blur-md">{FEATURED_STORY.genre}</span>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-display font-medium text-paper mb-4 group-hover:text-amber transition-colors duration-500">{FEATURED_STORY.title}</h2>
                <p className="font-display text-amber/80 text-lg mb-6 flex items-center gap-2">By {FEATURED_STORY.author}</p>
                <p className="text-text-secondary text-base md:text-lg leading-relaxed mb-8 max-w-xl font-body">{FEATURED_STORY.description}</p>

                <div className="flex gap-4 items-center">
                  <button className={`px-8 py-3.5 bg-${FEATURED_STORY.color} text-void rounded-full font-bold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:bg-white hover:text-void transition-colors flex items-center gap-2`}>
                    Enter Universe
                  </button>
                  <div className="flex gap-2">
                    {FEATURED_STORY.tags.map(t => <span key={t} className="text-xs text-text-ghost hidden sm:inline-block border border-white/5 bg-black/20 rounded-full px-3 py-1.5 backdrop-blur-sm">#{t}</span>)}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* LIBRARY GRID SECTION */}
        <section className="flex flex-col gap-8">
          <div className="flex justify-between items-end border-b border-border-subtle/50 pb-4">
            <h3 className="text-2xl font-display text-white">
               {activeFilter === "All" ? "Curated Collection" : `${activeFilter} Collection`}
            </h3>
            <span className="text-sm text-text-ghost font-medium">{filteredItems.length} Stories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16 py-8 min-h-[400px]">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <>
                   {Array.from({length: 4}).map((_, i) => <SkeletonCard key={`skel-${i}`}/>)}
                </>
              ) : (
                <>
                  {filteredItems.map(item => (
                    <BookCard key={item.id} book={item} />
                  ))}
                  {filteredItems.length === 0 && (
                     <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center text-text-ghost py-20 font-body text-lg italic">
                        No tomes found in this archive.
                     </motion.p>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
