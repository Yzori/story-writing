"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "../../components/ThemeToggle";

// Mock Data
const COLLABORATORS = [
  { id: "1", name: "Elara", color: "teal", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" },
  { id: "2", name: "Corin", color: "amber", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" },
];

const LORE_ENTRIES = [
  { id: "l1", title: "The Obsidian Citadel", type: "Location" },
  { id: "l2", title: "Aetherial Resonance", type: "Magic System" },
  { id: "l3", title: "House Vance", type: "Faction" },
];

const CHAT_MESSAGES = [
  { id: "m1", user: "Corin", text: "I think we should emphasize the height of the spire here.", time: "10:42 AM" },
  { id: "m2", user: "Elara", text: "Agreed. Let me add a description about the clouds piercing it.", time: "10:45 AM" },
];

export default function CoopEditorMockup() {
  const [activeTab, setActiveTab] = useState<"chat" | "lore">("chat");

  return (
    <div className="h-screen w-full bg-void text-paper flex flex-col font-body overflow-hidden">
      
      {/* 1. Header Navigation */}
      <header className="h-16 border-b border-border-subtle bg-surface/30 px-6 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        
        {/* Left: Breadcrumbs & Title */}
        <div className="flex items-center gap-4">
          <Link href="/mockup" className="text-text-ghost hover:text-teal transition-colors flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            <span className="text-sm font-medium tracking-wide uppercase">The Workshop</span>
          </Link>
          <div className="w-px h-6 bg-border-subtle mx-2" />
          <h1 className="font-display font-medium text-lg text-paper">The Shattered Crown - Chapter 4</h1>
          <span className="px-2 py-0.5 rounded bg-teal/10 border border-teal/20 text-teal text-[10px] uppercase tracking-widest ml-2">Co-op</span>
        </div>

        {/* Right: Collaborators & Tools */}
        <div className="flex items-center gap-6">
          <div className="flex items-center -space-x-3">
            {COLLABORATORS.map((collab, i) => (
              <motion.div 
                key={collab.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`w-8 h-8 rounded-full border-2 border-void bg-surface flex items-center justify-center overflow-hidden relative group`}
              >
                <img src={collab.avatar} alt={collab.name} className="w-full h-full object-cover" />
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-${collab.color} border border-void`} />
              </motion.div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-void bg-surface flex items-center justify-center text-text-ghost text-xs cursor-pointer hover:bg-surface/80 hover:text-paper transition-colors">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </div>
          </div>
          
          <button className="text-sm font-medium text-text-secondary hover:text-paper transition-colors flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/><path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z"/></svg>
            Agreements
          </button>
          
          <ThemeToggle />
          
          <button className="px-5 py-2 bg-teal text-void rounded-full font-display font-medium text-sm tracking-wide hover:bg-teal/90 transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            Export Draft
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.03)_0%,transparent_60%)] pointer-events-none" />

        {/* 2A. Left Sidebar: Document Structure */}
        <aside className="w-64 border-r border-border-subtle bg-void/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-border-subtle/50 text-xs font-medium uppercase tracking-widest text-text-ghost">
            Manuscript
          </div>
          <div className="p-2 space-y-1 overflow-y-auto">
             {["Prologue", "Chapter 1: The Ash Falls", "Chapter 2: Embers", "Chapter 3: Kindling", "Chapter 4: The Shattered Crown"].map((chap, i) => (
                <div key={i} className={`px-4 py-2.5 rounded-md text-sm cursor-pointer transition-colors ${i === 4 ? "bg-surface/50 text-teal font-medium border border-teal/10" : "text-text-secondary hover:bg-surface/30 hover:text-paper"}`}>
                   {chap}
                </div>
             ))}
          </div>
        </aside>

        {/* 2B. Center: The Editor */}
        <main className="flex-1 overflow-y-auto bg-void relative flex justify-center scrollbar-hide">
          <div className="max-w-[800px] w-full py-16 px-12 relative">
            
            {/* Real-time collaborator cursor mock */}
            <motion.div 
               animate={{ x: [0, 50, 20], y: [0, 10, -5] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[180px] right-[250px] z-10 pointer-events-none flex flex-col items-center"
            >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-amber)" stroke="white" strokeWidth="1.5" className="drop-shadow-lg -ml-2 -mt-2">
                  <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
               </svg>
               <div className="bg-amber text-void text-[10px] font-bold px-2 py-0.5 rounded shadow-lg mt-1 whitespace-nowrap">
                  Corin is typing...
               </div>
            </motion.div>

            <h1 className="font-display text-4xl mb-8 text-paper font-medium tracking-tight border-b border-border-subtle/50 pb-6 focus:outline-none" contentEditable suppressContentEditableWarning>
               Chapter 4: The Shattered Crown
            </h1>
            
            <div className="prose prose-invert prose-p:text-text-secondary prose-p:leading-relaxed prose-p:text-lg focus:outline-none min-h-[500px]" contentEditable suppressContentEditableWarning>
              <p>The obsidian spire pierced the bruised sky, acting as a needle drawing thread through the firmament. Below it, the city of Aethelgard lay in ruin, its once glowing streets now choked with ash and silence.</p>
              
              <p>Kaelen paused at the precipice. The wind here did not howl; it whispered, carrying the fragmented memories of the Mages who had perished defending the gates.</p>
              
              <div className="relative inline-block group">
                 <span className="bg-amber/20 border-b border-amber/50 text-paper">&quot;Do you hear them?&quot; he asked the empty air</span>
                 <span className="absolute -left-1 w-0.5 h-full bg-amber shadow-[0_0_8px_var(--color-amber)]" />
              </div>
              
              <p className="mt-4">But the air offered no reply. Only the distant, rhythmic thrum of the Aetherial Engine deep within the citadel.</p>
            </div>
            
          </div>
        </main>

        {/* 2C. Right Sidebar: Co-op Tools (Lore + Chat) */}
        <aside className="w-80 border-l border-border-subtle bg-surface/20 flex flex-col shrink-0 backdrop-blur-md">
           {/* Tabs */}
           <div className="flex border-b border-border-subtle/50">
              <button 
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-4 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === "chat" ? "text-teal" : "text-text-ghost hover:text-paper"}`}
              >
                 Workshop Chat
                 {activeTab === "chat" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.5)]" />}
              </button>
              <button 
                onClick={() => setActiveTab("lore")}
                className={`flex-1 py-4 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === "lore" ? "text-teal" : "text-text-ghost hover:text-paper"}`}
              >
                 Story Bible
                 {activeTab === "lore" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.5)]" />}
              </button>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="popLayout">
                 {activeTab === "chat" ? (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full"
                    >
                       <div className="flex-1 space-y-4">
                          {CHAT_MESSAGES.map((msg) => (
                             <div key={msg.id} className="flex flex-col">
                                <span className="text-[10px] text-text-ghost mb-1 flex justify-between">
                                   <b>{msg.user}</b> {msg.time}
                                </span>
                                <div className="bg-surface/50 border border-border-subtle/50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm text-paper">
                                   {msg.text}
                                </div>
                             </div>
                          ))}
                       </div>
                       
                       <div className="mt-4 relative">
                          <input 
                             type="text" 
                             placeholder="Message workshop..." 
                             className="w-full bg-void border border-border-subtle rounded-full py-2.5 pl-4 pr-10 text-sm text-paper focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all placeholder:text-text-ghost"
                          />
                          <button className="absolute right-2 top-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-teal/10 text-teal hover:bg-teal hover:text-void transition-colors">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                          </button>
                       </div>
                    </motion.div>
                 ) : (
                    <motion.div 
                      key="lore"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                       <div className="relative mb-4">
                          <svg className="absolute left-3 top-2.5 text-text-ghost w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          <input type="text" placeholder="Search Lore..." className="w-full bg-void border border-border-subtle rounded-md py-2 pl-9 pr-3 text-sm text-paper focus:outline-none focus:border-teal/50" />
                       </div>
                       
                       {LORE_ENTRIES.map(lore => (
                          <div key={lore.id} className="p-3 rounded-lg border border-border-subtle/50 bg-void/50 hover:border-teal/30 hover:bg-teal/5 cursor-pointer transition-all group">
                             <h4 className="text-paper text-sm font-medium group-hover:text-teal transition-colors">{lore.title}</h4>
                             <p className="text-[11px] text-text-ghost uppercase tracking-wider mt-1">{lore.type}</p>
                          </div>
                       ))}
                       
                       <button className="w-full py-3 mt-4 border-2 border-dashed border-border-subtle text-text-ghost text-xs uppercase tracking-widest font-medium rounded-lg hover:border-teal/50 hover:text-teal transition-colors flex items-center justify-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                          Add Entry
                       </button>
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </aside>

      </div>
    </div>
  );
}
