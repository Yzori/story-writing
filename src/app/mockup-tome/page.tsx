"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { compressImage } from "@/lib/images";

const GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller", "Horror", 
  "Adventure", "Historical Fiction", "Contemporary", "Urban Fantasy", "Dystopian"
];

const FORMATS = [
  { id: "novel", label: "Novel", description: "Traditional chapters with rich text" },
  { id: "webtoon", label: "Webtoon", description: "Vertical-scroll illustrated panels" },
];

export default function MockupTome() {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("novel");
  const [synopsis, setSynopsis] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // 3D Tilt parameters for the book
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  const rotateX = useTransform(y, [0, 400], [10, -10]);
  const rotateY = useTransform(x, [0, 400], [-10, 10]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(200);
    y.set(200);
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const dataUrl = await compressImage(file, 900, 0.8);
        setCoverPreview(dataUrl);
      } catch {}
    }
  };

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => 
      prev.includes(g) ? prev.filter((gen) => gen !== g) : [...prev, g]
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-void flex overflow-hidden">
      
      {/* LEFT SIDE: Interactive Tome Focus */}
      <div 
        className="hidden lg:flex w-1/2 relative items-center justify-center p-12 border-r border-border-subtle/20"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 1200 }}
      >
        {/* Ambient magical glow behind the book */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-[400px] h-[500px] bg-amber/10 blur-[100px] rounded-full" />
           <div className={`absolute w-[300px] h-[400px] ${selectedGenres.includes('Fantasy') || selectedGenres.includes('Science Fiction') ? 'bg-violet/10' : 'bg-transparent'} blur-[80px] rounded-full transition-colors duration-1000`} />
        </div>

        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative w-[340px] h-[500px] rounded-r-2xl shadow-2xl transition-all duration-300 ease-out"
        >
          {/* Book Spine Edge */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-void via-ink to-void rounded-l-md shadow-inner z-10" style={{ transform: "translateZ(-1px)" }} />
          
          {/* Main Book Cover */}
          <div className="absolute inset-0 ml-4 rounded-r-2xl overflow-hidden border-y border-r border-border-subtle/40 bg-ink shadow-[20px_20px_40px_rgba(0,0,0,0.8)]" style={{ transform: "translateZ(10px)" }}>
            
            {/* Cover Image or Procedural Material */}
             {coverPreview ? (
               <motion.img 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={coverPreview} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
               />
             ) : (
               <div className="absolute inset-0 bg-gradient-to-br from-[#1a1512] to-[#0f0c0a]" />
             )}

            {/* Glowing Engraved Title */}
            <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center transition-all duration-500 ${coverPreview ? 'bg-void/60 backdrop-blur-sm opacity-0 hover:opacity-100' : ''}`}>
              <motion.div 
                className="w-full h-full border border-amber/20 rounded-xl p-6 flex flex-col items-center justify-start flex-1"
                layout
              >
                <div className="w-12 h-0.5 bg-amber/30 mb-8" />
                <h2 className="font-display text-3xl sm:text-4xl text-amber/90 tracking-wide font-medium leading-tight max-w-[250px] break-words" style={{ textShadow: "0 0 20px rgba(200, 150, 60, 0.4)" }}>
                  {title || "Untitled Tale"}
                </h2>
                {synopsis && (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-6 text-[11px] text-amber/60 italic leading-relaxed line-clamp-6 font-serif px-4"
                  >
                    {synopsis}
                  </motion.p>
                )}
                <div className="mt-auto pt-6 flex flex-wrap justify-center gap-1.5 opacity-80">
                  {selectedGenres.slice(0, 3).map(g => (
                    <span key={g} className="text-[9px] uppercase tracking-widest text-amber/50 border border-amber/20 px-2 py-0.5 rounded-full">
                      {g}
                    </span>
                  ))}
                  {selectedGenres.length > 3 && (
                    <span className="text-[9px] text-amber/50 px-1 py-0.5">+{selectedGenres.length - 3}</span>
                  )}
                </div>
              </motion.div>
            </div>
            
            {/* Book Sheen Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none mix-blend-overlay" />
          </div>
          
          {/* Pages Edge (Right Side thickness) */}
          <div 
             className="absolute top-2 bottom-2 right-0 w-3 bg-[#e8decf] rounded-r-sm translate-x-full shadow-[inset_2px_0_5px_rgba(0,0,0,0.5)] z-[-1]"
             style={{
               transform: "translateZ(5px)",
               backgroundImage: "repeating-linear-gradient(to bottom, #d4c5b0, #d4c5b0 1px, #e8decf 1px, #e8decf 4px)"
             }}
          />
        </motion.div>

        {/* Floating Instruction */}
        <div className="absolute bottom-12 text-center w-full">
           <p className="text-text-ghost/40 text-[11px] uppercase tracking-widest font-display animate-pulse">
             The cover manifests your vision
           </p>
        </div>
      </div>

      {/* RIGHT SIDE: The Form */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto custom-scrollbar">
         <div className="max-w-xl mx-auto px-8 py-16 lg:py-24">
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
               <span className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full border bg-amber/10 text-amber border-amber/20 mb-6 inline-block">
                 Solo Mode
               </span>
               <h1 className="text-3xl font-display text-paper mb-2">Begin a New Story</h1>
               <p className="text-text-secondary text-sm">Every great journey starts with a simple word.</p>
            </motion.div>

            {/* Step 1: Title & Cover (Mobile only, or drag target) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10 group relative">
              <label className="block text-[11px] uppercase tracking-widest text-text-ghost mb-3">The Name</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your story a title..."
                className="w-full bg-surface/30 border border-border-subtle rounded-xl px-5 py-4 text-paper text-xl font-display outline-none placeholder:text-text-ghost/40 focus:border-amber/40 focus:bg-surface/50 transition-all shadow-inner focus:shadow-[0_0_20px_rgba(200,150,60,0.1)]"
              />
            </motion.div>

            {/* Format Selection - Sleeker glass approach */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
              <label className="block text-[11px] uppercase tracking-widest text-text-ghost mb-3">Format</label>
              <div className="grid grid-cols-2 gap-3">
                 {FORMATS.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-300 ${
                         format === f.id 
                           ? "border-amber/40 bg-amber/5 shadow-[0_4px_20px_-4px_rgba(200,150,60,0.15)]" 
                           : "border-border-subtle bg-surface/20 hover:border-border-active hover:bg-surface/40"
                      }`}
                    >
                       <p className={`text-sm font-medium mb-1 ${format === f.id ? "text-amber" : "text-paper"}`}>{f.label}</p>
                       <p className="text-[11px] text-text-tertiary">{f.description}</p>
                    </button>
                 ))}
              </div>
            </motion.div>

            {/* Synopsis - Refined Texture */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
              <label className="block text-[11px] uppercase tracking-widest text-text-ghost mb-3">Synopsis</label>
              <div className="relative">
                 <textarea 
                   rows={4}
                   value={synopsis}
                   onChange={e => setSynopsis(e.target.value)}
                   placeholder="What draws the reader into your world?"
                   className="w-full bg-ink/50 border border-border-subtle rounded-xl px-5 py-4 text-text font-body text-sm outline-none placeholder:text-text-ghost/40 resize-none transition-all focus:border-amber/40 focus:bg-ink focus:shadow-[0_0_30px_rgba(200,150,60,0.08)]"
                   style={{
                      backgroundImage: "radial-gradient(ellipse at top right, rgba(200,150,60,0.03), transparent 50%)"
                   }}
                 />
                 {/* Decorative Corner */}
                 <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-border-subtle rounded-tr-xl" />
                 </div>
              </div>
            </motion.div>

            {/* Genres - Elegant Pills */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-12">
              <div className="flex justify-between items-end mb-3">
                <label className="block text-[11px] uppercase tracking-widest text-text-ghost">Genres</label>
                <span className="text-[10px] text-text-tertiary">{selectedGenres.length} selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                 {GENRES.map(g => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                       <button
                         key={g}
                         onClick={() => toggleGenre(g)}
                         className={`px-3.5 py-1.5 rounded-full text-[12px] transition-all duration-200 border ${
                            isSelected 
                               ? "bg-amber/15 border-amber/30 text-amber shadow-[0_0_12px_rgba(200,150,60,0.2)]" 
                               : "bg-surface/30 border-border-subtle text-text-secondary hover:border-amber/30 hover:text-paper"
                         }`}
                       >
                          {g}
                       </button>
                    );
                 })}
              </div>
            </motion.div>

            {/* Cover Upload (If no left sidebar visibility, like on mobile) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-12 lg:hidden">
              <label className="block text-[11px] uppercase tracking-widest text-text-ghost mb-3">Cover Art</label>
              <div className="border border-dashed border-border-subtle rounded-xl p-8 text-center bg-surface/20">
                 <input type="file" onChange={handleCoverFile} className="hidden" id="mobile-cover" />
                 <label htmlFor="mobile-cover" className="cursor-pointer">
                    <p className="text-amber text-sm font-medium">Upload Image</p>
                    <p className="text-text-ghost text-[11px] mt-1">Tap to select cover art</p>
                 </label>
              </div>
            </motion.div>

            {/* Cover Upload Dropzone (Desktop right side target) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="hidden lg:block mb-12 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
               <div className="flex items-center gap-4 p-4 border border-border-subtle rounded-xl bg-surface/10 hover:border-amber/30 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-surface/50 border border-border flex items-center justify-center shrink-0">
                     {coverPreview ? (
                        <img src={coverPreview} alt="Thumb" className="w-full h-full object-cover rounded-lg" />
                     ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost/50">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                     )}
                  </div>
                  <div className="flex-1">
                     <p className="text-paper text-[13px] font-medium mb-0.5">Upload Cover Art</p>
                     <p className="text-text-tertiary text-[11px]">Recommended 600x900px</p>
                  </div>
                  <input type="file" onChange={handleCoverFile} className="hidden" id="desktop-cover" accept="image/*" />
                  <label htmlFor="desktop-cover" className="cursor-pointer px-4 py-2 rounded-lg bg-surface/40 hover:bg-surface text-[12px] text-paper transition-colors shrink-0 border border-border-subtle">
                     Browse
                  </label>
               </div>
            </motion.div>

            {/* Submit Action */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-6 border-t border-border/50 flex justify-end">
               <button className="px-8 py-3.5 bg-amber text-void font-semibold rounded-full font-display flex items-center gap-2 hover:shadow-[0_0_30px_rgba(200,150,60,0.3)] hover:scale-[1.02] transition-all">
                  <span>Enter the Study</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
               </button>
            </motion.div>

         </div>
      </div>
    </div>
  );
}
