"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { compressImage } from "@/lib/images";

const GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller", "Horror", 
  "Adventure", "Historical Fiction", "Contemporary", "Urban Fantasy", "Dystopian"
];

const FORMATS = [
  { id: "novel", label: "Novel", description: "Traditional chapters with rich text" },
  { id: "webtoon", label: "Webtoon", description: "Vertical-scroll illustrated panels" },
];

export default function MockupGlass() {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Progressive reveal stages
  const step = 
     title.length > 2 && format && synopsis.length > 10 && selectedGenres.length > 0 ? 5 :
     title.length > 2 && format && synopsis.length > 10 ? 4 :
     title.length > 2 && format ? 3 :
     title.length > 2 ? 2 : 1;

  // Dynamic Background colors based on genres
  const getAmbientColors = () => {
    if (selectedGenres.includes("Horror") || selectedGenres.includes("Thriller")) return "from-rose/10 via-void to-ink/20";
    if (selectedGenres.includes("Science Fiction") || selectedGenres.includes("Cyberpunk")) return "from-teal/10 via-void to-indigo/20";
    if (selectedGenres.includes("Fantasy") || selectedGenres.includes("Mystery")) return "from-violet/10 via-void to-fuchsia/10";
    return "from-amber/5 via-void to-copper/10"; // Default warm
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

  return (
    <div className={`min-h-[calc(100vh-64px)] bg-gradient-to-br transition-all duration-[2000ms] ${getAmbientColors()} text-paper overflow-hidden relative font-body`}>
      
      {/* Interactive Particles / Glow overlays */}
      <div className="absolute inset-0 pointer-events-none">
         <motion.div 
            animate={{ 
               scale: [1, 1.2, 1],
               opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[150px] mix-blend-screen opacity-30 ${selectedGenres.includes('Fantasy') ? 'bg-violet/20' : 'bg-transparent'}`}
         />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-20 relative z-10 w-full">
         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber/60 border border-amber/20 px-3 py-1 rounded-full bg-amber/5 backdrop-blur-md shadow-[0_0_15px_rgba(200,150,60,0.1)]">
               Chapter 1
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-display font-medium text-white/90 drop-shadow-lg">
               Inscribe Your Tale
            </h1>
         </motion.div>

         <div className="space-y-6">
            
            {/* 1. TITLE */}
            <motion.div 
               layout
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className={`p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent ${title.length > 2 ? 'ring-1 ring-amber/30 shadow-[0_0_30px_rgba(200,150,60,0.1)]' : 'ring-1 ring-white/10'} backdrop-blur-xl transition-all duration-500`}
            >
               <div className="bg-ink/60 rounded-xl p-6 sm:p-8">
                  <label className="block text-[10px] uppercase tracking-widest text-text-ghost mb-3">The Manuscript's Name</label>
                  <input 
                     type="text"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     placeholder="e.g. Whispers of the Void"
                     className="w-full bg-transparent border-none text-2xl sm:text-3xl font-display text-white outline-none placeholder:text-white/20"
                  />
               </div>
            </motion.div>

            {/* 2. FORMAT */}
            <AnimatePresence>
               {step >= 2 && (
                  <motion.div 
                     layout
                     initial={{ opacity: 0, y: 30 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent ring-1 ring-white/10 backdrop-blur-xl"
                  >
                     <div className="bg-ink/60 rounded-xl p-6 sm:p-8">
                        <label className="block text-[10px] uppercase tracking-widest text-text-ghost mb-4">Choose Your Canvas</label>
                        <div className="grid grid-cols-2 gap-4">
                           {FORMATS.map(f => (
                              <button 
                                 key={f.id}
                                 onClick={() => setFormat(f.id)}
                                 className={`p-4 rounded-xl border text-left transition-all duration-300 ${
                                    format === f.id 
                                       ? "border-emerald/40 bg-emerald/10 shadow-[0_0_20px_rgba(16,185,129,0.1)] scale-[1.02]" 
                                       : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
                                 }`}
                              >
                                 <p className={`text-[15px] font-medium mb-1 ${format === f.id ? "text-emerald" : "text-white/80"}`}>{f.label}</p>
                                 <p className="text-[12px] text-white/40 leading-relaxed">{f.description}</p>
                              </button>
                           ))}
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* 3. SYNOPSIS */}
            <AnimatePresence>
               {step >= 3 && (
                  <motion.div 
                     layout
                     initial={{ opacity: 0, y: 30 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent ring-1 ring-white/10 backdrop-blur-xl"
                  >
                     <div className="bg-ink/60 rounded-xl p-6 sm:p-8 relative overflow-hidden">
                        {/* Faint parchment grain */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/aged-paper.png')" }} />
                        
                        <label className="block text-[10px] uppercase tracking-widest text-text-ghost mb-4">The Premise</label>
                        <textarea 
                           rows={4}
                           value={synopsis}
                           onChange={e => setSynopsis(e.target.value)}
                           className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-white/90 text-sm font-body leading-relaxed outline-none placeholder:text-white/20 resize-none focus:bg-black/40 focus:border-white/20 transition-all font-serif italic"
                           placeholder="It began with a shadow in the corner of the room..."
                        />
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* 4. GENRES & COVER */}
            <AnimatePresence>
               {step >= 4 && (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-5 gap-6">
                     {/* GENRES */}
                     <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-3 p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent ring-1 ring-white/10 backdrop-blur-xl"
                     >
                        <div className="bg-ink/60 rounded-xl p-6 h-full">
                           <label className="block text-[10px] uppercase tracking-widest text-text-ghost mb-4">Themes & Setting</label>
                           <div className="flex flex-wrap gap-2">
                              {GENRES.map(g => {
                                 const isActive = selectedGenres.includes(g);
                                 return (
                                    <button 
                                       key={g} 
                                       onClick={() => {
                                          setSelectedGenres(prev => 
                                             prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                          )
                                       }}
                                       className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 border ${
                                          isActive 
                                             ? "bg-violet/20 border-violet/40 text-violet shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                                             : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                                       }`}
                                    >
                                       {g}
                                    </button>
                                 )
                              })}
                           </div>
                        </div>
                     </motion.div>

                     {/* COVER UPLOAD */}
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-2 p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent ring-1 ring-white/10 backdrop-blur-xl"
                     >
                        <div className="bg-ink/60 rounded-xl p-6 h-full relative group overflow-hidden flex flex-col items-center justify-center text-center">
                           
                           {coverPreview ? (
                              <>
                                 <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity blur-[2px] group-hover:blur-md" />
                                 <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-sm font-medium mb-2">Change Image</p>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-amber/10 group-hover:text-amber transition-colors">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                       <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                 </div>
                                 <p className="text-white/60 text-[12px]">Drop cover art here</p>
                              </>
                           )}
                           
                           <input type="file" onChange={handleCoverFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" />
                        </div>
                     </motion.div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* SUBMIT BUTTON */}
            <AnimatePresence>
               {step >= 5 && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="pt-10 flex justify-center"
                  >
                     <button className="relative group px-12 py-4 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber to-copper opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                        <span className="relative z-10 text-void font-display font-semibold text-lg flex items-center gap-3 drop-shadow-sm">
                           Conjure Story
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                        </span>
                     </button>
                  </motion.div>
               )}
            </AnimatePresence>

         </div>
      </div>
    </div>
  );
}
