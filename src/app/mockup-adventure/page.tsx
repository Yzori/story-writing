"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- 3D Dice Component ---
// A CSS-based 3D cube mimicking a die for tactile feedback
const TactileDice = ({ isRolling, result }: { isRolling: boolean; result: number | null }) => {
   // Generate random rotations for the "rolling" effect
   const [rotations, setRotations] = useState({ x: 0, y: 0, z: 0 });

   useEffect(() => {
      if (isRolling) {
         const interval = setInterval(() => {
            setRotations({
               x: Math.random() * 720,
               y: Math.random() * 720,
               z: Math.random() * 720,
            });
         }, 100);
         return () => clearInterval(interval);
      } else if (result !== null) {
         // Settle on a fixed front-facing rotation based on result
         // For a complex D20 this is very math-heavy, so we simulate settling on a "front" face
         setRotations({ x: 0, y: 0, z: 0 }); 
      }
   }, [isRolling, result]);

   return (
      <div className="relative w-24 h-24 perspective-1000">
         <motion.div 
            className="w-full h-full relative transform-style-3d"
            animate={{ 
               rotateX: isRolling ? rotations.x : 0, 
               rotateY: isRolling ? rotations.y : 0, 
               rotateZ: isRolling ? rotations.z : 0 
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
         >
            {/* Front Face (Shows Result or Default Symbol) */}
            <div className={`absolute inset-0 flex items-center justify-center border-2 rounded-xl backdrop-blur-md transition-colors duration-300
               ${result !== null && !isRolling 
                  ? (result >= 15 ? 'bg-amber/20 border-amber shadow-[0_0_30px_rgba(200,150,60,0.6)]' 
                     : result <= 5 ? 'bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                     : 'bg-white/10 border-white/30')
                  : 'bg-black/50 border-amber/50 shadow-[inset_0_0_20px_rgba(200,150,60,0.2)]'
               }
            `} style={{ transform: 'translateZ(48px)' }}>
               {isRolling ? (
                  <span className="text-3xl font-display text-amber/50 animate-pulse">?</span>
               ) : result !== null ? (
                  <span className={`text-4xl font-display font-bold ${result >= 15 ? 'text-amber' : result <= 5 ? 'text-red-500' : 'text-white'}`}>
                     {result}
                  </span>
               ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
               )}
            </div>
            
            {/* Other Faces (For the rolling 3D effect) */}
            <div className="absolute inset-0 bg-black/80 border border-white/10 rounded-xl" style={{ transform: 'rotateY(180deg) translateZ(48px)' }} />
            <div className="absolute inset-0 bg-[#0a0a0a] border border-amber/20 rounded-xl flex items-center justify-center text-amber/20 font-display text-2xl" style={{ transform: 'rotateY(-90deg) translateZ(48px)' }}>8</div>
            <div className="absolute inset-0 bg-[#0a0a0a] border border-amber/20 rounded-xl flex items-center justify-center text-amber/20 font-display text-2xl" style={{ transform: 'rotateY(90deg) translateZ(48px)' }}>14</div>
            <div className="absolute inset-0 bg-[#111] border border-white/10 rounded-xl" style={{ transform: 'rotateX(90deg) translateZ(48px)' }} />
            <div className="absolute inset-0 bg-[#111] border border-white/10 rounded-xl" style={{ transform: 'rotateX(-90deg) translateZ(48px)' }} />
         </motion.div>
      </div>
   );
};

// --- Types & Mock Data ---

type Player = { id: string, name: string, character: string, avatar: string, color: string, isGM?: boolean };

const PLAYERS: Player[] = [
   { id: '1', name: 'AlexTheGM', character: 'Game Master', avatar: '/avatar-gm.jpg', color: 'text-amber', isGM: true },
   { id: '2', name: 'Sarah', character: 'Lyra Varen', avatar: '/avatar-lyra.jpg', color: 'text-rose' },
   { id: '3', name: 'James', character: 'Kaelen', avatar: '/avatar-kaelen.jpg', color: 'text-indigo-400' },
   { id: '4', name: 'Elena', character: 'Elara', avatar: '/avatar-elara.jpg', color: 'text-emerald-400' },
];

type ChatEvent = {
   id: string;
   type: 'chat' | 'roll' | 'system' | 'narrative';
   player: Player;
   message?: string;
   rollResult?: number;
   rollType?: string;
   timestamp: string;
};

const INITIAL_EVENTS: ChatEvent[] = [
   { id: 'e1', type: 'system', player: PLAYERS[0], message: 'The party enters the ruined throne room.', timestamp: '8:42 PM' },
   { id: 'e2', type: 'chat', player: PLAYERS[1], message: 'Okay, I am touching the glass wall. Does it feel hot?', timestamp: '8:43 PM' },
   { id: 'e3', type: 'chat', player: PLAYERS[0], message: 'Give me a Perception check.', timestamp: '8:43 PM' },
   { id: 'e4', type: 'roll', player: PLAYERS[1], rollResult: 18, rollType: 'Perception', timestamp: '8:44 PM' },
   { id: 'e5', type: 'narrative', player: PLAYERS[0], message: 'AlexTheGM granted Lyra the turn.', timestamp: '8:45 PM' },
];

export default function MockupAdventure() {
   // --- State ---
   const [events, setEvents] = useState<ChatEvent[]>(INITIAL_EVENTS);
   const [chatInput, setChatInput] = useState("");
   const [activePlayerId, setActivePlayerId] = useState<string>('2'); // Lyra's turn
   const [myPlayerId, setMyPlayerId] = useState<string>('2'); // Assume we are logged in as Sarah (Lyra)
   const [storyContent, setStoryContent] = useState("");
   const [draftContent, setDraftContent] = useState("");
   const [showDiceRoller, setShowDiceRoller] = useState(false);
   const [rollingDice, setRollingDice] = useState(false);
   const [diceValue, setDiceValue] = useState<number | null>(null);
   const [showMap, setShowMap] = useState(false);

   const isMyTurn = activePlayerId === myPlayerId;
   const myPlayer = PLAYERS.find(p => p.id === myPlayerId)!;
   const isGMView = myPlayer.isGM;

   // --- Handlers ---
   
   const handleSendChat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      
      const isWhisper = chatInput.startsWith('/w') || chatInput.startsWith('/whisper');
      let finalMessage = chatInput;
      if (isWhisper) {
         finalMessage = chatInput.replace(/^\/w(hisper)?\s+gm\s+/i, '');
      }
      
      const newEvent: ChatEvent = {
         id: Date.now().toString(),
         type: 'chat',
         player: myPlayer,
         message: finalMessage,
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setEvents(prev => [...prev, newEvent]);
      setChatInput("");
   };

   const commitDraft = () => {
      if (!draftContent.trim()) return;
      setStoryContent(draftContent);
      setActivePlayerId('3'); // Pass turn automatically
      setDraftContent("");
   };

   const initiateRoll = () => {
      setShowDiceRoller(true);
      setDiceValue(null);
   };

   const executeRoll = () => {
      if (rollingDice) return;
      setRollingDice(true);
      setDiceValue(null);

      // Simulate 3D roll time
      setTimeout(() => {
         const result = Math.floor(Math.random() * 20) + 1;
         setDiceValue(result);
         setRollingDice(false);

         // Broadcast the roll
         setTimeout(() => {
            const newEvent: ChatEvent = {
               id: Date.now().toString(),
               type: 'roll',
               player: myPlayer,
               rollResult: result,
               rollType: 'General',
               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setEvents(prev => [...prev, newEvent]);
            setTimeout(() => setShowDiceRoller(false), 1500); // Hide roller after a bit
         }, 1000);

      }, 1500); // 1.5s animation duration
   };

   return (
      <div className="flex w-screen h-screen bg-[#080808] text-paper font-sans overflow-hidden selection:bg-amber/30">
         
         {/* --- 1. THE LEFT PILLAR: Meta & Mechanics (Chat Log) --- */}
         <div className="w-[320px] lg:w-[380px] h-full flex flex-col border-r border-white/5 bg-[#050505] shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0">
            
            {/* Pillar Header */}
            <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md pb-4 shrink-0">
               <h2 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber mb-1">Session Log</h2>
               <p className="text-white/40 text-xs font-serif italic">The Obsidian Crown - Chapter 12</p>
            </div>

            {/* Event Log Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar flex flex-col">
               {events.map(ev => (
                  <div key={ev.id} className="flex flex-col">
                     
                     {/* System / Narrative Messages */}
                     {(ev.type === 'system' || ev.type === 'narrative') && (
                        <div className="flex items-center gap-3 my-2 opacity-60 px-4">
                           <div className="w-4 h-px bg-white/20" />
                           <p className="text-xs text-white/50 italic font-serif flex-1 text-center">
                              {ev.message}
                           </p>
                           <div className="w-4 h-px bg-white/20" />
                        </div>
                     )}

                     {/* Chat Messages */}
                     {ev.type === 'chat' && (
                        <div className={`flex flex-col ${ev.player.id === myPlayerId ? 'items-end' : 'items-start'}`}>
                           <span className={`text-[10px] mb-1 opacity-50 ${ev.player.color}`}>{ev.player.name} &bull; {ev.player.character}</span>
                           <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed ${ev.player.id === myPlayerId ? 'bg-amber/10 border border-amber/20 text-white' : 'bg-white/5 border border-white/5 text-white/80'}`}>
                              {ev.message}
                           </div>
                        </div>
                     )}

                     {/* Dice Rolls */}
                     {ev.type === 'roll' && (
                        <div className="flex flex-col items-center my-2">
                           <div className="bg-[#111] border border-amber/30 rounded-xl p-4 w-full flex items-center justify-between shadow-[0_5px_15px_rgba(200,150,60,0.05)] relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-amber/0 via-amber/5 to-amber/0" />
                              <div className="flex items-center gap-3 z-10">
                                 <div className={`w-8 h-8 rounded bg-white/5 flex items-center justify-center font-bold text-sm ${ev.player.color}`}>
                                    {ev.player.name[0]}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{ev.rollType} Check</span>
                                    <span className="text-[13px] text-white/80 font-medium">{ev.player.character} Rolled</span>
                                 </div>
                              </div>
                              <div className={`text-2xl font-display font-bold z-10 ${ev.rollResult === 20 ? 'text-amber drop-shadow-[0_0_10px_rgba(200,150,60,0.8)]' : ev.rollResult === 1 ? 'text-red-500' : 'text-white'}`}>
                                 {ev.rollResult}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               ))}
               
               {/* Spacer to push input to bottom */}
               <div className="mt-auto pt-4" /> 
            </div>

            {/* Chat Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md shrink-0">
               <form onSubmit={handleSendChat} className="flex items-center gap-2">
                  <button 
                     type="button"
                     onClick={initiateRoll}
                     className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20 text-amber hover:bg-amber hover:text-black transition-all flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.4)]"
                     title="Roll Dice"
                  >
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </button>
                  <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     placeholder="Message party (OOC)..."
                     className="flex-1 bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-amber/40 transition-colors"
                  />
               </form>
            </div>
         </div>

         {/* --- 2. THE CENTER STAGE: Shared Canvas (The Story) --- */}
         <div className="flex-1 h-full flex flex-col relative bg-[#0a0a0a]">
            
            {/* View/Overlay Toggles */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
               <button 
                  onClick={() => setMyPlayerId(prev => prev === '2' ? '1' : '2')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 hover:text-white transition-colors flex items-center gap-2 backdrop-blur-md"
               >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                  Simulate {isGMView ? 'Player (Lyra)' : 'GM View'}
               </button>
               <button 
                  onClick={() => setShowMap(!showMap)}
                  className={`border rounded-full px-4 py-1.5 text-xs transition-colors flex items-center gap-2 backdrop-blur-md ${showMap ? 'bg-amber text-black border-amber' : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'}`}
               >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                  {showMap ? 'Close Map' : 'World Map'}
               </button>
            </div>

            {/* Cinematic Background for Canvas */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber/[0.02] blur-[100px] rounded-full mix-blend-screen" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-[0.02] mix-blend-overlay" />
               <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
            </div>

            {/* Turn Tracker Top Bar */}
            <div className="w-full h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 z-30 shrink-0">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber animate-pulse shadow-[0_0_10px_rgba(200,150,60,0.8)]" />
                  <span className="text-[10px] uppercase font-display tracking-[0.2em] text-white/50">Initiative Order</span>
               </div>
               
               <div className="flex items-center gap-4">
                  {PLAYERS.map((p) => (
                     <div key={p.id} className="flex flex-col items-center gap-2 group relative cursor-pointer">
                        {/* Avatar ring */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-lg relative z-10 transition-all duration-500
                           ${activePlayerId === p.id 
                              ? `bg-black ring-2 shadow-[0_0_20px_rgba(200,150,60,0.5)] ${p.id === '1' ? 'ring-white/50 text-white' : 'ring-amber text-amber'}` 
                              : 'bg-[#111] border border-white/10 text-white/30 hover:border-white/30'}`}
                        >
                           {p.id === '1' ? 'GM' : p.character[0]}
                           
                           {/* Active Indicator pip */}
                           {activePlayerId === p.id && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center border border-amber/30">
                                 <div className="w-2 h-2 bg-amber rounded-full animate-pulse" />
                              </div>
                           )}
                        </div>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 rounded px-2 py-1 flex flex-col items-center whitespace-nowrap pointer-events-none z-50">
                           <span className={`text-[10px] font-bold ${p.color}`}>{p.name}</span>
                           <span className="text-[9px] text-white/50">{p.character}</span>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="w-24 flex justify-end">
                  {isMyTurn && (
                     <button 
                        onClick={() => setActivePlayerId('3')} // Simulate passing turn
                        className="text-[10px] uppercase tracking-widest text-amber border border-amber/30 px-3 py-1.5 rounded-full hover:bg-amber hover:text-black transition-all shadow-[0_0_15px_rgba(200,150,60,0.2)]"
                     >
                        End Turn
                     </button>
                  )}
               </div>
            </div>

            {/* The Actual Writing Canvas */}
            <div className="flex-1 overflow-y-auto pt-16 pb-64 px-12 flex justify-center z-10 relative scroll-smooth">
               
               {/* Lock Screen if not user's turn */}
               {!isMyTurn && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
                     <div className="flex flex-col items-center gap-4 text-white/80 animate-pulse">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <p className="font-serif italic text-lg opacity-80">Waiting for James (Kaelen) to write...</p>
                     </div>
                  </div>
               )}

               {/* The Story Canvas (Static/Immutable) */}
               <div className="w-full max-w-[650px] mb-8">
                  <div className="mb-12">
                     <h1 className="text-4xl font-display text-white/90">The Ruined Throne</h1>
                     <div className="w-24 h-[1px] bg-gradient-to-r from-amber/40 to-transparent mt-6 mb-12" />
                  </div>

                  <div className="text-[19px] leading-[2.1] text-paper/80 font-serif mb-8">
                     <span className="text-rose">Lyra</span> touched the molten glass structure. The heat was still there, a low vibration humming against her skin. It whispered old promises, the kind that cost empires to keep.
                     {storyContent && (
                        <>
                           <br/><br/>
                           <span className="text-rose">Lyra</span> {storyContent}
                        </>
                     )}
                  </div>
               </div>

               {/* The Drafting Box (Only for the active player) */}
               {isMyTurn && (
                  <div className="w-full max-w-[650px] mt-auto">
                     <div className="bg-[#111] border border-amber/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
                        <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-amber">
                           Your Turn: Draft Response
                        </div>
                        
                        <textarea 
                           className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[120px] placeholder:text-white/20"
                           placeholder="What does Lyra do next?"
                           value={draftContent}
                           onChange={(e) => setDraftContent(e.target.value)}
                        />
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                           <div className="text-xs text-white/40 font-serif italic">
                              Take your time. The party is waiting.
                           </div>
                           <button 
                              onClick={commitDraft}
                              disabled={!draftContent.trim()}
                              className="bg-amber/10 hover:bg-amber border border-amber/20 text-amber hover:text-black transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.5)] disabled:opacity-50 disabled:hover:bg-amber/10 disabled:hover:text-amber"
                           >
                              Ink to Story
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* In-Canvas Dice Roller Overlay */}
            <AnimatePresence>
               {showDiceRoller && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 20 }}
                     className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
                  >
                     <div className="bg-[#111]/90 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/50 mb-6">Roll for outcome</h3>
                        
                        {/* Simulated 3D Dice Area */}
                        <div 
                           className="mb-8 cursor-pointer relative group"
                           onClick={executeRoll}
                        >
                           <TactileDice isRolling={rollingDice} result={diceValue} />

                           {!rollingDice && diceValue === null && (
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber text-black text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(200,150,60,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                 Click to Roll
                              </div>
                           )}
                        </div>

                        <button 
                           onClick={() => setShowDiceRoller(false)}
                           className="text-xs text-white/30 hover:text-white"
                        >
                           Cancel
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* Full Screen Map Overlay */}
            <AnimatePresence>
               {showMap && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ duration: 0.4, ease: "easeOut" }}
                     className="absolute inset-x-8 inset-y-8 z-40 bg-[#15100a] rounded-3xl border border-amber/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                  >
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-overlay" />
                     <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
                     
                     <div className="p-6 relative z-10 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-sm">
                        <h2 className="text-xl font-display text-amber/90 tracking-widest uppercase">The Lower Wards (Map)</h2>
                        <button onClick={() => setShowMap(false)} className="text-white/40 hover:text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                     </div>

                     <div className="flex-1 relative z-10 flex items-center justify-center">
                        <div className="w-[80%] h-[80%] border-2 border-dashed border-amber/10 rounded-xl flex items-center justify-center flex-col gap-4">
                           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber/30"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                           <p className="font-serif italic text-white/30 text-lg">Interactive Map Canvas</p>
                           {isGMView && <p className="text-xs text-amber/50 font-sans tracking-widest uppercase">Drag & Drop Encounters Here</p>}
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

         </div>

         {/* --- 3. THE RIGHT PILLAR: Lore & Character Sheet (Player View) OR GM Dashboard (GM View) --- */}
         <div className="w-[300px] h-full flex flex-col border-l border-white/5 bg-[#050505] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden xl:flex">
            
            {isGMView ? (
               // --- GM DASHBOARD VIEW ---
               <>
                  <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center font-display text-amber text-lg border border-amber/30">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        <div>
                           <h2 className="text-sm font-bold text-amber/90">Game Master</h2>
                           <p className="text-[10px] text-white/40 uppercase tracking-widest">Dashboard & Tools</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                     
                     {/* Party Overview */}
                     <div className="space-y-4 mb-8">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Party Status</h3>
                        {PLAYERS.filter(p => !p.isGM).map((p) => (
                           <div key={`gm-${p.id}`} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5 hover:border-white/10 cursor-pointer transition-colors group relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.02] to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                              <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                 <span className={`text-xs ${p.color}`}>{p.character}</span>
                              </div>
                              <span className="text-[10px] text-white/40 uppercase">Lv 4</span>
                           </div>
                        ))}
                     </div>

                     {/* GM Actions Box */}
                     <div className="space-y-4">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber border-b border-amber/20 pb-2 flex items-center gap-2">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                           Direct Actions
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-2">
                           <button className="bg-amber/10 hover:bg-amber/20 border border-amber/20 rounded-lg p-3 text-left transition-colors flex items-center justify-between group">
                              <span className="text-sm text-amber font-medium">Request Roll...</span>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50 group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                           </button>

                           <button className="bg-[#111] hover:bg-white/5 border border-white/10 rounded-lg p-3 text-left transition-colors flex flex-col group">
                              <span className="text-sm text-white/80 shrink-0">Push Turn Event</span>
                              <span className="text-[10px] text-white/40 mt-1">Force an unexpected scenario into the log.</span>
                           </button>

                           <button className="bg-[#111] hover:bg-rose/10 hover:border-rose/30 border border-white/10 rounded-lg p-3 text-left transition-colors flex items-center justify-between group mt-2">
                              <span className="text-xs text-rose/80 uppercase font-bold tracking-wider group-hover:text-rose">Force Skip Lyra's Turn</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose/50"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                           </button>
                        </div>
                     </div>

                     {/* GM Audio Mixer */}
                     <div className="space-y-4 mt-8 pb-8">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-cyan-400 border-b border-cyan-400/20 pb-2 flex items-center gap-2">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                           Synchronized Audio
                        </h3>
                        
                        <div className="bg-[#111] border border-white/5 rounded-lg p-3">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-xs text-white/80 font-medium">Cavern Ambience</span>
                              <div className="w-8 h-4 bg-cyan-400/20 rounded-full flex items-center p-0.5 relative cursor-pointer">
                                 <div className="w-3 h-3 bg-cyan-400 rounded-full absolute right-0.5 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                              </div>
                           </div>
                           <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="w-[65%] h-full bg-cyan-400/50" />
                           </div>
                           <p className="text-[9px] text-white/30 uppercase tracking-widest mt-3 text-center">Playing for all 4 players</p>
                        </div>
                     </div>

                  </div>
               </>
            ) : (
               // --- PLAYER LORE VIEW (Unchanged) ---
               <>
                  <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center font-display text-rose text-lg border border-rose/30">L</div>
                        <div>
                           <h2 className="text-sm font-bold text-white/90">Lyra Varen</h2>
                           <p className="text-[10px] text-white/40 uppercase tracking-widest">Lvl 4 Forgekeeper</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                     {/* Stats Area */}
                     <div className="space-y-4 mb-8">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Vitals</h3>
                        
                        <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                           <span className="text-xs text-white/60">Health Points</span>
                           <span className="text-sm text-rose font-medium">24 <span className="text-white/30">/ 30</span></span>
                        </div>
                        <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                           <span className="text-xs text-white/60">Magic Spark</span>
                           <span className="text-sm text-indigo-400 font-medium">12 <span className="text-white/30">/ 12</span></span>
                        </div>
                     </div>

                     {/* Attributes */}
                     <div className="space-y-4 mb-8">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Attributes</h3>
                        
                        <div className="grid grid-cols-3 gap-2">
                           <div className="bg-[#111] border border-white/10 rounded-lg p-2 flex flex-col items-center">
                              <span className="text-[9px] uppercase text-white/40">STR</span>
                              <span className="text-lg font-display text-white mt-1">12</span>
                           </div>
                           <div className="bg-[#111] border border-amber/30 rounded-lg p-2 flex flex-col items-center shadow-[inset_0_2px_10px_rgba(200,150,60,0.1)]">
                              <span className="text-[9px] uppercase text-amber/60">DEX</span>
                              <span className="text-lg font-display text-amber mt-1">18</span>
                           </div>
                           <div className="bg-[#111] border border-white/10 rounded-lg p-2 flex flex-col items-center">
                              <span className="text-[9px] uppercase text-white/40">INT</span>
                              <span className="text-lg font-display text-white mt-1">14</span>
                           </div>
                        </div>
                     </div>

                     {/* Inventory / Notes */}
                     <div className="space-y-4">
                        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Key Items</h3>
                        <ul className="text-xs text-white/60 font-serif space-y-2 leading-relaxed">
                           <li className="flex gap-2"><span className="text-amber">✦</span> The Obsidian Shard (Warm to touch)</li>
                           <li className="flex gap-2"><span className="text-white/30">-</span> 4x Vials of healing ash</li>
                           <li className="flex gap-2"><span className="text-white/30">-</span> Map of the lower wards</li>
                        </ul>
                     </div>
                  </div>
               </>
            )}

         </div>

      </div>
   );
}
