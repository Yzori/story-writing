"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MockupWrite() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [activeGrimoireTab, setActiveGrimoireTab] = useState("characters");
  const [content, setContent] = useState("");

  // Extension States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState<{ x: number, y: number } | null>(null);
  
  // New: Canvas View Mode ('flow' or 'pages')
  const [viewMode, setViewMode] = useState<'flow' | 'pages'>('flow');

  // Simulated typing detection to hide UI elements
  // Slightly looser timeout when in paginated mode since you're reading/reviewing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        setShowGrimoire((v) => !v);
        return;
      }
      setIsTyping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsTyping(false), viewMode === 'pages' ? 3000 : 1500); 
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [viewMode]);

  const handleTextSelection = () => {
     const selection = window.getSelection();
     if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setShowFormatMenu({ x: rect.left + (rect.width / 2), y: rect.top - 10 });
     } else {
        setShowFormatMenu(null);
     }
  };

  // The text content used in both views
  const textContent = (
     <>
      <span className={`float-left text-7xl leading-[0.8] pr-3 pt-2 font-display drop-shadow-lg transition-colors duration-1000 ${isFocusMode ? 'text-amber/50' : 'text-amber'}`}>T</span>
      he ash was still falling when she reached the edge of the crater. It coated her boots like a horrible grey snow, silencing her footsteps across the ruined courtyard where the throne used to sit. 
      <br/><br/>
      She traced her fingers along the molten glass that had once been stone walls. The heat was still there, a low vibration humming against her skin. It whispered old promises, the kind that cost empires to keep.
      <br/><br/>
      <span className={`transition-colors duration-500 ${isFocusMode ? 'text-white' : ''} bg-transparent`}>
         "So," a voice echoed from the shadows of the dais, dry as old parchment. "The lost spark returns to the tinderbox."
      </span>
      <br/><br/>
      Lyra didn't flinch. She kept her hand pressed against the glass. "You took your time getting here, Elias. I half expected the Crownguard to arrive first."
      <br/><br/>
      The king stepped into the pale moonlight bleeding through the shattered dome. He wore no armor, only the velvet and silk of his station, utterly untouched by the ruin around him. He looked less like a conqueror and more like a ghost haunting his own victory.
      <br/><br/>
      "The Crownguard are busy burning what's left of the lower wards," he said, adjusting a heavy, emerald-cut ring on his index finger. "They lack the nuance required for a reunion of this magnitude."
      <br/><br/>
     </>
  );

  return (
    <div className={`relative w-screen h-screen bg-[#080808] text-paper font-serif overflow-hidden selection:bg-amber/30 selection:text-white transition-colors duration-1000 ${isFocusMode ? 'bg-[#030303]' : ''} ${viewMode === 'pages' ? 'bg-[#111111]' : ''}`}>
      
      {/* 1. Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[150px] rounded-full mix-blend-screen transition-all duration-1000 ${isFocusMode ? 'bg-amber/[0.01] w-[400px]' : 'bg-amber/[0.03]'}`} />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-[0.02] mix-blend-overlay" />
         <div className={`absolute inset-0 transition-opacity duration-1000 ${isFocusMode ? 'shadow-[inset_0_0_250px_rgba(0,0,0,0.95)]' : 'shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]'}`} />
      </div>

      {/* 2. Auto-Hiding Left Sidebar (Table of Contents) */}
      <div 
         className="absolute top-0 left-0 bottom-0 w-12 z-40 group"
         onMouseEnter={() => setIsSidebarHovered(true)}
         onMouseLeave={() => setIsSidebarHovered(false)}
      >
         <div className="absolute inset-y-0 left-0 w-8 bg-transparent" />
         <AnimatePresence>
            {(isSidebarHovered && !showGrimoire && !isTyping) && (
               <motion.div 
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute top-4 bottom-4 left-4 w-64 rounded-2xl bg-[#111]/80 border border-white/5 backdrop-blur-2xl shadow-2xl p-5 flex flex-col pt-8"
               >
                  <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber/60 mb-6 px-2">Table of Contents</h3>
                  <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
                     <div className="group/item flex items-center justify-between px-3 py-2 rounded-lg bg-amber/10 border border-amber/20 cursor-pointer">
                        <span className="text-amber text-[13px] font-sans">Chapter 12: The Fall</span>
                        <span className="text-[10px] text-amber/60 font-sans">4.2k</span>
                     </div>
                     <div className="group/item flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-white/50 hover:text-white transition-colors">
                        <span className="text-[13px] font-sans">Chapter 13: Ash & Ruin</span>
                        <span className="text-[10px] opacity-50 font-sans">0</span>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 3. Auto-Hiding Right Sidebar (Outline) */}
      <AnimatePresence>
         {(showOutline && !isTyping && !showGrimoire) && (
            <motion.div 
               initial={{ x: "100%", opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: "100%", opacity: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="absolute top-4 bottom-32 right-4 w-72 rounded-2xl bg-[#111]/80 border border-white/5 backdrop-blur-2xl shadow-2xl p-5 flex flex-col z-40"
            >
               <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber/60">Chapter Outline</h3>
                  <button onClick={() => setShowOutline(false)} className="text-white/30 hover:text-white transition-colors">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar font-sans text-sm text-white/60 space-y-4">
                  <div className="pl-4 border-l border-amber/30 relative">
                     <div className="absolute w-2 h-2 rounded-full bg-amber -left-[4.5px] top-1.5 shadow-[0_0_10px_rgba(200,150,60,0.8)]" />
                     <p className="text-amber/90 font-medium">Arrival at the crater</p>
                  </div>
                  <div className="pl-4 border-l border-white/10 pb-4 relative">
                     <div className="absolute w-2 h-2 rounded-full bg-white/20 -left-[4.5px] top-1.5" />
                     <p className="text-white/80">Elias confronts Lyra</p>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* 4. THE DUAL-STATE CANVAS */}
      <div 
         className={`relative z-10 w-full h-full flex flex-col items-center pt-24 pb-64 overflow-y-auto scroll-smooth transition-opacity duration-1000 ${showGrimoire ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'} ${viewMode === 'pages' ? 'bg-[#0a0a0a]' : ''}`}
         onMouseUp={handleTextSelection}
         onKeyUp={handleTextSelection}
      >
         {viewMode === 'flow' ? (
            /* INFINITE FLOW MODE (For active writing) */
            <div className="w-full max-w-[650px] px-8 relative">
               
               {/* Subtle margin rhythm marker (e.g. 250 words / 1 page equiv) */}
               <div className="absolute -left-12 top-64 flex flex-col items-center opacity-20 pointer-events-none">
                  <span className="text-[9px] font-sans text-amber uppercase tracking-widest">Pg 2</span>
                  <div className="w-px h-32 bg-gradient-to-b from-amber to-transparent mt-2" />
               </div>

               <div className={`mb-12 relative group cursor-text transition-opacity duration-700 ${isFocusMode ? 'opacity-0' : 'opacity-100'}`}>
                  <p className="font-display text-[11px] tracking-[0.25em] text-amber/50 uppercase mb-4 text-center sm:text-left">The Obsidian Crown</p>
                  <h1 className="text-4xl md:text-5xl font-display text-white/90 outline-none text-center sm:text-left" contentEditable suppressContentEditableWarning>
                     Chapter 12: The Fall
                  </h1>
                  <div className="w-24 h-[1px] bg-gradient-to-r from-amber/40 to-transparent mt-8 mx-auto sm:mx-0" />
               </div>

               <div 
                  className={`text-[19px] leading-[2.1] outline-none min-h-[500px] transition-colors duration-1000 ${isFocusMode ? 'text-paper/40' : 'text-paper/80'}`}
                  contentEditable 
                  suppressContentEditableWarning
               >
                  {textContent}
                  <span className={`italic text-sm mt-8 block transition-opacity duration-500 ${isFocusMode ? 'opacity-0' : 'text-white/20'}`}>
                     ~ Infinite Flow Mode active. Just write.
                  </span>
               </div>
            </div>

         ) : (
            /* PAGINATED PROOF MODE (For reviewing and typeset immersion) */
            <div className="w-full max-w-5xl px-8 flex flex-col items-center gap-12 pt-8">
               
               {/* Realistic Page 1 */}
               <div className="relative bg-[#fcf9f2] w-full max-w-[600px] aspect-[1/1.414] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm border border-black/10 text-black/90 p-16 flex flex-col">
                  {/* Subtle paper grain */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none" />
                  
                  {/* Header/Margin info */}
                  <div className="w-full flex justify-between text-[9px] uppercase tracking-[0.2em] text-black/30 mb-12 font-sans border-b border-black/5 pb-4">
                     <span>The Obsidian Crown</span>
                     <span>174</span>
                  </div>

                  <h1 className="text-3xl font-display text-black mb-12 mt-8 text-center">Chapter 12<br/><span className="text-xl text-black/60 italic font-serif">The Fall</span></h1>

                  <div className="text-[15px] leading-[1.9] text-black/80 font-serif text-justify flex-1">
                     {textContent}
                  </div>
                  
                  {/* Page curl shadow effect */}
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/5 to-transparent pointer-events-none" />
               </div>

               {/* Realistic Page 2 (Faded out slightly to show progression) */}
               <div className="relative bg-[#fcf9f2] w-full max-w-[600px] aspect-[1/1.414] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm border border-black/10 text-black/90 p-16 flex flex-col opacity-50">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none" />
                  <div className="w-full flex justify-between text-[9px] uppercase tracking-[0.2em] text-black/30 mb-12 font-sans border-b border-black/5 pb-4">
                     <span>Isolde Varen</span>
                     <span>175</span>
                  </div>
                  <div className="text-[15px] leading-[1.9] text-black/80 font-serif text-justify">
                     <p>The smoke stung her eyes, but she refused to blink. "I don't need the nuance of butchers."</p>
                     <br/>
                     <p>Elias smiled, throwing a long, shifting shadow across the dais. "Nuance is what built this kingdom, Lyra. Blood and fire is just how we paid for it."</p>
                  </div>
               </div>

            </div>
         )}
      </div>

      {/* 5. Magical Floating Status Bar & Tool Menu */}
      <AnimatePresence>
         {(!isTyping && !showGrimoire) && (
            <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
               className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center"
            >
               <div className="flex items-center gap-4 sm:gap-6 px-4 py-2 sm:px-8 sm:py-3 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-sans max-w-full overflow-x-auto hide-scrollbar">
                  
                  {/* View Mode Toggle (Infinite vs Pages) */}
                  <div className="flex bg-white/5 rounded-full p-1 shrink-0">
                     <button 
                        onClick={() => setViewMode('flow')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'flow' ? 'bg-amber text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                     >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12H3"/><path d="M21 6H3"/><path d="M21 18H3"/></svg>
                        Flow
                     </button>
                     <button 
                        onClick={() => setViewMode('pages')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'pages' ? 'bg-amber text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                     >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg>
                        Pages
                     </button>
                  </div>

                  <div className="w-[1px] h-6 bg-white/10 shrink-0 hidden sm:block" />

                  {/* Left Extensions Menu */}
                  <div className="flex items-center gap-2">
                     <button onClick={() => setIsAudioPlaying(!isAudioPlaying)} className={`p-2 rounded-full transition-all ${isAudioPlaying ? 'bg-amber/20 text-amber' : 'hover:bg-white/10 text-white/50 hover:text-white'}`} title="Soundscape">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                     </button>
                     <button onClick={() => setIsFocusMode(!isFocusMode)} className={`p-2 rounded-full transition-all ${isFocusMode ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`} title="Focus Mode">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                     </button>
                     <button onClick={() => setShowOutline(!showOutline)} className={`p-2 rounded-full transition-all hidden sm:block ${showOutline ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`} title="Outline">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                     </button>
                  </div>

                  <div className="w-[1px] h-6 bg-white/10 shrink-0" />

                  {/* Words (Center stats) */}
                  <div className="flex flex-col items-center group cursor-pointer shrink-0">
                     <span className="text-[9px] uppercase tracking-widest text-white/30 group-hover:text-amber/50 transition-colors">Session</span>
                     <span className="text-[13px] font-medium text-amber">1,240 <span className="text-white/40 text-[11px] hidden sm:inline">/ 2k</span></span>
                  </div>

                  <div className="w-[1px] h-6 bg-white/10 shrink-0" />

                  {/* The Grimoire Summon Button */}
                  <button onClick={() => setShowGrimoire(true)} className="flex items-center gap-2 group hover:text-amber transition-colors shrink-0">
                     <div className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center border border-amber/20 group-hover:bg-amber group-hover:text-black transition-all shadow-[0_0_10px_rgba(200,150,60,0.2)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                     </div>
                     <span className="text-xs font-medium text-white/60 group-hover:text-amber hidden sm:inline tracking-wide">Grimoire</span>
                  </button>
               </div>
               
               {/* Audio Playing Indicator Glow */}
               {isAudioPlaying && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-amber/10 blur-xl rounded-full -z-10 mix-blend-screen animate-pulse" />
               )}
            </motion.div>
         )}
      </AnimatePresence>

      {/* Formatting Bubble Menu & Grimoire overlays remain identical to prior version... */}
      <AnimatePresence>
         {showFormatMenu && !isTyping && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ position: 'absolute', left: `${showFormatMenu.x}px`, top: `${showFormatMenu.y}px`, transform: 'translate(-50%, -100%)' }} className="z-50 pb-4">
               <div className="bg-[#1a1a1a] border border-white/10 backdrop-blur-xl shadow-2xl rounded-full px-2 py-1.5 flex flex-col items-center">
                  <div className="flex gap-1 items-center">
                     <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors font-serif font-bold italic">B</button>
                     <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors font-serif italic">I</button>
                     <div className="w-[1px] h-4 bg-white/20 mx-1" />
                     <button className="w-8 h-8 rounded-full flex items-center justify-center text-amber hover:bg-amber/10 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                     </button>
                  </div>
                  <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1a1a] border-b border-r border-white/10 rotate-45" />
               </div>
            </motion.div>
         )}
      </AnimatePresence>
      <AnimatePresence>
         {showGrimoire && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
               <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGrimoire(false)} />
               <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative w-full max-w-4xl h-[70vh] bg-[#111111]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex overflow-hidden font-sans">
                  <div className="w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col">
                     <p className="text-[10px] uppercase font-display tracking-[0.2em] text-amber/60 mb-6">The Grimoire</p>
                     <nav className="space-y-1">
                        {['Characters', 'Lore & Places', 'Metadata', 'Typography'].map((tab) => (
                           <button key={tab} onClick={() => setActiveGrimoireTab(tab.toLowerCase())} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${activeGrimoireTab === tab.toLowerCase() ? 'bg-amber/10 text-amber font-medium shadow-[inset_2px_0_0_rgba(200,150,60,1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                              {tab}
                           </button>
                        ))}
                     </nav>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto">
                     <div className="relative mb-8">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" placeholder="Summon knowledge..." autoFocus className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white text-[15px] outline-none focus:border-amber/50 focus:bg-white/[0.05] transition-all placeholder:text-white/20"/>
                     </div>
                     {activeGrimoireTab === 'characters' && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group">
                              <h4 className="text-white font-medium group-hover:text-amber transition-colors">Lyra Varen</h4>
                              <p className="text-[11px] text-white/40 uppercase tracking-widest mt-1 mb-2">Protagonist</p>
                              <p className="text-[13px] text-white/60 leading-relaxed font-serif">The last forgekeeper of the Obsidian court. Carries the flame-scar on her left hand.</p>
                           </div>
                        </div>
                     )}
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}
