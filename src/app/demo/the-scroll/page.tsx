"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════

const STORY_TITLE = "The Cartographer's Daughter";

const CHAPTERS = [
  { id: "ch1", title: "The Map Room", active: true },
  { id: "ch2", title: "Maps of Nowhere", active: false },
  { id: "ch3", title: "The Compass Rose", active: false },
];

const PEOPLE = [
  { id: "you", name: "You", color: "#D4A574", role: "Writer", initial: "Y" },
  { id: "sarah", name: "Sarah Mendez", color: "#A78BDB", role: "Illustrator", initial: "S" },
  { id: "kael", name: "Kael Okonkwo", color: "#6DB89B", role: "Worldbuilder", initial: "K" },
];

const PARAS: { text: string; by: string }[] = [
  { text: "The old map room smelled of cedar and forgotten expeditions. Elara traced her finger along the coastline her father had drawn \u2014 every cove memorized, every reef annotated in his precise hand.", by: "you" },
  { text: "She\u2019d spent seventeen years in this room, and still the maps whispered secrets she couldn\u2019t quite hear.", by: "you" },
  { text: "\u201CYou\u2019re doing it again,\u201D said Kael from the doorway, arms crossed, the afternoon light catching the silver threads in his dark hair.", by: "sarah" },
  { text: "He leaned against the frame the way he always did \u2014 as if the whole building might collapse without his particular brand of nonchalance holding it together.", by: "sarah" },
  { text: "Elara didn\u2019t look up. Her father\u2019s final map was spread across the table, weighted at the corners with river stones she\u2019d collected as a child. The eastern edge was torn \u2014 deliberately, she now realized. Someone had removed the part that mattered most.", by: "you" },
  { text: "\u201CThere\u2019s a gap here,\u201D she said, more to herself than to Kael. \u201CBetween the Thornwall Mountains and the sea. He drew something there and then cut it away.\u201D", by: "you" },
  { text: "Kael crossed the room in three strides and bent over the map, close enough that she could smell woodsmoke and ink on his coat. He was quiet for a long moment \u2014 unusual for him \u2014 and when he finally spoke, his voice had lost its casual edge.", by: "kael" },
  { text: "\u201CThat\u2019s not a gap, Elara. That\u2019s a door.\u201D", by: "kael" },
];

const INLINE_THOUGHTS: { afterPara: number; by: string; type: string; emoji: string; text: string }[] = [
  { afterPara: 0, by: "sarah", type: "thought", emoji: "\uD83D\uDCAD", text: "The cedar smell grounds everything. I want to sketch this room \u2014 warm light, maps pinned everywhere, river stones on the table." },
  { afterPara: 2, by: "kael", type: "fire", emoji: "\uD83D\uDD25", text: "Silver threads at his age? He\u2019s been through something. The mountains maybe. Let\u2019s seed that." },
  { afterPara: 4, by: "sarah", type: "seed", emoji: "\uD83C\uDF31", text: "The river stones she collected as a child \u2014 each one is from a place on the map. That\u2019s a beautiful detail for a later reveal." },
  { afterPara: 5, by: "kael", type: "tension", emoji: "\u26A1", text: "\u201CSomeone had removed the part that mattered most\u201D \u2014 was it Harlan himself? Or someone protecting her from what\u2019s there?" },
  { afterPara: 7, by: "sarah", type: "fire", emoji: "\uD83D\uDD25", text: "That\u2019s a door. Chills. This is the hinge of the whole story." },
];

const SARAH_TYPING_TEXT = "She reached for the torn edge, tracing the jagged line with her fingertip. The parchment was rough where it had been cut \u2014 not torn in haste, but severed with care, with a blade so sharp it left the fibers clean.";

const LORE_ENTRIES: Record<string, { title: string; type: string; desc: string }> = {
  "aetherial engine": { title: "Aetherial Engine", type: "Artifact", desc: "A massive precursor machine generating ambient magic that powers the floating city of Aethelgard." },
  "aethelgard": { title: "Aethelgard", type: "Location", desc: "The ruined capital city, suspended above the clouds. Now choked with ash from the Engine's decay." },
  "thornwall mountains": { title: "Thornwall Mountains", type: "Location", desc: "A jagged, impassable mountain range to the east, naturally shielding the kingdom from the Wastes." }
};

const ACTIVITY_LOG: { by: string; text: string; type: "system" | "chat" }[] = [
  { by: "Kael Okonkwo", text: "entered the room", type: "system" },
  { by: "Sarah Mendez", text: "entered the room", type: "system" },
  { by: "Sarah Mendez", text: "I love what you did with the opening", type: "chat" },
  { by: "You", text: "Thanks! Kael\u2019s last line took me forever", type: "chat" },
  { by: "Kael Okonkwo", text: "It took you forever because it\u2019s perfect", type: "chat" },
];

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function personById(id: string) {
  return PEOPLE.find((p) => p.id === id) || PEOPLE[0];
}

// ═══════════════════════════════════════════════════════════
//  THE SCROLL
// ═══════════════════════════════════════════════════════════

export default function TheScroll() {
  // State
  const [entered, setEntered] = useState(false);
  const [penHolder, setPenHolder] = useState<string | null>(null);
  const [thoughtsVisible, setThoughtsVisible] = useState<Set<number>>(new Set());
  const [showPresenceBar, setShowPresenceBar] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "lore">("chat");
  const [activeLore, setActiveLore] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState(ACTIVITY_LOG);
  const [thoughtInput, setThoughtInput] = useState("");
  const [thoughtType, setThoughtType] = useState("thought");
  const [userThoughts, setUserThoughts] = useState<typeof INLINE_THOUGHTS>([]);
  const [showChapters, setShowChapters] = useState(false);
  const [sarahTyping, setSarahTyping] = useState(false);
  const [sarahText, setSarahText] = useState("");
  const [showCeremony, setShowCeremony] = useState<{ from: string; to: string } | null>(null);
  const [energy, setEnergy] = useState(3);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allThoughts = [...INLINE_THOUGHTS, ...userThoughts].sort((a, b) => a.afterPara - b.afterPara);

  // ── Enter animation ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 600);
    const t2 = setTimeout(() => setShowPresenceBar(true), 2000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  // ── Reveal thoughts progressively ──────────────────────
  useEffect(() => {
    if (!entered) return;
    const timers = INLINE_THOUGHTS.map((_, i) =>
      setTimeout(() => setThoughtsVisible((prev) => new Set(prev).add(i)), 3000 + i * 2500)
    );
    return () => timers.forEach(clearTimeout);
  }, [entered]);

  // ── Auto-scroll chat ───────────────────────────────────
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatLog.length, chatOpen]);

  // ── Energy pulse ────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => setEnergy((e) => Math.max(1, e - 1)), 12000);
    return () => clearInterval(i);
  }, []);

  // ── Sarah auto-typing ──────────────────────────────────
  useEffect(() => {
    if (!sarahTyping) return;
    let idx = 0;
    const type = () => {
      if (idx >= SARAH_TYPING_TEXT.length) {
        setSarahTyping(false);
        setEnergy(8);
        return;
      }
      const ch = SARAH_TYPING_TEXT[idx];
      const pause = ".,:;\u2014".includes(ch) ? 180 + Math.random() * 250
        : ch === " " ? 30 + Math.random() * 40
        : 22 + Math.random() * 38;
      typingTimer.current = setTimeout(() => {
        idx++;
        setSarahText(SARAH_TYPING_TEXT.slice(0, idx));
        type();
      }, pause);
    };
    const start = setTimeout(type, 1500);
    return () => { clearTimeout(start); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [sarahTyping]);

  // ── Actions ─────────────────────────────────────────────

  const handleLoreClick = (term: string) => {
    setActiveLore(term);
    setActiveTab("lore");
    setChatOpen(true);
  };

  const renderWithLore = (text: string) => {
    const parts = text.split(/(Aetherial Engine|Aethelgard|Thornwall Mountains)/i);
    return parts.map((part, i) => {
      const term = part.toLowerCase();
      if (LORE_ENTRIES[term]) {
        return (
          <span 
            key={i} 
            onClick={() => handleLoreClick(term)}
            className="text-amber/80 border-b border-amber/30 cursor-pointer hover:border-amber hover:bg-amber/10 hover:text-amber transition-colors pb-[1px]"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const isFocusMode = penHolder === "you";

  const pickUpPen = useCallback(() => {
    setPenHolder("you");
    setEnergy(5);
    setChatLog((prev) => [...prev, { by: "You", text: "picked up the pen", type: "system" }]);
    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 300);
  }, []);

  const passPenToSarah = useCallback(() => {
    setShowCeremony({ from: "You", to: "Sarah" });
    setChatLog((prev) => [...prev, { by: "You", text: "passed the pen to Sarah", type: "system" }]);
    setTimeout(() => {
      setShowCeremony(null);
      setPenHolder("sarah");
      setSarahTyping(true);
      setSarahText("");
      setEnergy(4);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 300);
    }, 3000);
  }, []);

  const putDownPen = useCallback(() => {
    setPenHolder(null);
    setSarahTyping(false);
    setChatLog((prev) => [...prev, { by: penHolder === "you" ? "You" : "Sarah", text: "set the pen down", type: "system" }]);
  }, [penHolder]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatLog((prev) => [...prev, { by: "You", text: chatInput.trim(), type: "chat" }]);
    setChatInput("");
    setEnergy((e) => Math.min(10, e + 1));
  }, [chatInput]);

  const dropThought = useCallback(() => {
    if (!thoughtInput.trim()) return;
    const emojis: Record<string, string> = { thought: "\uD83D\uDCAD", fire: "\uD83D\uDD25", seed: "\uD83C\uDF31", tension: "\u26A1" };
    const newThought = {
      afterPara: PARAS.length - 1,
      by: "you",
      type: thoughtType,
      emoji: emojis[thoughtType] || "\uD83D\uDCAD",
      text: thoughtInput.trim(),
    };
    setUserThoughts((prev) => [...prev, newThought]);
    setThoughtsVisible((prev) => new Set(prev).add(INLINE_THOUGHTS.length + userThoughts.length));
    setChatLog((prev) => [...prev, { by: "You", text: `${newThought.emoji} ${newThought.text}`, type: "chat" }]);
    setThoughtInput("");
    setEnergy((e) => Math.min(10, e + 1));
  }, [thoughtInput, thoughtType, userThoughts.length]);

  // ── Energy glow ─────────────────────────────────────────
  const glowIntensity = 0.02 + energy * 0.004;
  const glowHue = energy > 6 ? "#D4A574" : energy > 3 ? "#6DB89B" : "#888";

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-void text-paper relative">

      {/* ── Ambient glow ──────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none transition-all duration-[5000ms] z-0"
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${glowHue}${Math.round(glowIntensity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)` }} />

      {/* ── Ceremony overlay ──────────────────────────────── */}
      <AnimatePresence>
        {showCeremony && (
          <motion.div key="ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-void/85 backdrop-blur-xl">
            <div className="text-center">
              <motion.svg width="48" height="48" viewBox="0 0 32 32" className="mx-auto mb-6"
                animate={{ rotate: [0, -20, 20, 0], y: [0, -14, 0] }}
                transition={{ duration: 1.8, ease: "easeInOut" }}>
                <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="#D4A574" opacity="0.85" />
                <path d="M7 28L5 29L4 27L7 28Z" fill="#D4A574" />
              </motion.svg>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="font-display text-2xl">
                <span className="text-amber">{showCeremony.from}</span>
                <span className="text-text-ghost/40 mx-3 text-lg">passes the pen to</span>
                <span className="text-amber">{showCeremony.to}</span>
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating presence bar (top) ───────────────────── */}
      <AnimatePresence>
        {showPresenceBar && (
          <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: isFocusMode ? 0.05 : 1, y: 0 }} transition={{ type: "spring", damping: 25, duration: 1 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 ${isFocusMode ? "hover:opacity-100 filter grayscale blur-[1px] hover:blur-none hover:grayscale-0" : ""}`}>
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-void/80 backdrop-blur-xl border border-paper/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              {/* People */}
              <div className="flex -space-x-1.5">
                {PEOPLE.map((p) => (
                  <div key={p.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-void"
                    style={{ backgroundColor: p.color + "18", color: p.color + "90", boxShadow: penHolder === p.id ? `0 0 8px ${p.color}40` : "none" }}
                    title={p.name}>
                    {p.initial}
                  </div>
                ))}
              </div>

              <div className="w-px h-5 bg-paper/[0.06]" />

              {/* Pen status */}
              {penHolder ? (
                <span className="text-[12px] flex items-center gap-2" style={{ color: personById(penHolder).color + "90" }}>
                  <svg width="10" height="10" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" />
                  </svg>
                  {penHolder === "you" ? "Your pen" : `${personById(penHolder).name.split(" ")[0]}&apos;s pen`}
                </span>
              ) : (
                <span className="text-[12px] text-text-ghost/60">pen resting</span>
              )}

              <div className="w-px h-5 bg-paper/[0.06]" />

              {/* Energy */}
              <span className={`text-[10px] ${energy > 6 ? "text-amber/60" : energy > 3 ? "text-teal/50" : "text-text-ghost/30"}`}>
                {energy > 6 ? "\uD83D\uDD25" : energy > 3 ? "\uD83C\uDF0A" : "\uD83C\uDF19"}
              </span>

              {/* Chapter picker */}
              <div className="relative">
                <button onClick={() => setShowChapters(!showChapters)}
                  className="text-[12px] text-text-ghost/60 hover:text-paper transition-colors flex items-center gap-1.5 font-medium">
                  Ch. 1
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`transition-transform ${showChapters ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <AnimatePresence>
                  {showChapters && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 4, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-elevated/95 backdrop-blur-xl border border-border rounded-xl p-2 shadow-2xl z-50">
                      {CHAPTERS.map((ch, i) => (
                        <button key={ch.id} onClick={() => setShowChapters(false)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] transition-all ${ch.active ? "text-amber bg-amber/[0.1] font-medium" : "text-text-secondary/80 hover:text-paper hover:bg-surface/50"}`}>
                          <span className="text-text-ghost/50 mr-2">{i + 1}.</span>{ch.title}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat toggle */}
              <button onClick={() => setChatOpen(!chatOpen)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${chatOpen ? "bg-amber/20 text-amber shadow-[0_0_10px_rgba(198,154,71,0.2)]" : "text-text-ghost/60 hover:text-paper hover:bg-surface/50"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Chat drawer (slides from right) ───────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[300px] z-40 bg-void/95 backdrop-blur-xl border-l border-paper/[0.04] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
            {/* Header Tabs */}
            <div className="flex pt-1 border-b border-paper/[0.04] bg-void">
              <button 
                onClick={() => setActiveTab("chat")} 
                className={`flex-1 py-3 text-[10px] uppercase tracking-[0.14em] transition-all relative ${activeTab === "chat" ? "text-amber" : "text-text-ghost/40 hover:text-paper"}`}
              >
                The Room
                {activeTab === "chat" && <motion.div layoutId="chatTab" className="absolute bottom-0 inset-x-0 h-[2px] bg-amber shadow-[0_0_8px_rgba(198,154,71,0.5)]" />}
              </button>
              <button 
                onClick={() => setActiveTab("lore")} 
                className={`flex-1 py-3 text-[10px] uppercase tracking-[0.14em] transition-all relative ${activeTab === "lore" ? "text-amber" : "text-text-ghost/40 hover:text-paper"}`}
              >
                Story Bible
                {activeTab === "lore" && <motion.div layoutId="chatTab" className="absolute bottom-0 inset-x-0 h-[2px] bg-amber shadow-[0_0_8px_rgba(198,154,71,0.5)]" />}
              </button>
              <button onClick={() => setChatOpen(false)} className="px-4 text-text-ghost/30 hover:text-text-ghost/60 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="popLayout">
                {activeTab === "chat" ? (
                  <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col">
                    {/* People strip */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-paper/[0.04]">
                      {PEOPLE.map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ backgroundColor: p.color + "15", color: p.color + "80" }}>{p.initial}</div>
                          <div>
                            <p className="text-[10px]" style={{ color: p.color + "70" }}>{p.id === "you" ? "You" : p.name.split(" ")[0]}</p>
                            <p className="text-[8px] text-text-ghost/25">{p.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Messages */}
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: "none" }}>
                      {chatLog.map((m, i) => {
                        const person = PEOPLE.find((p) => p.name === m.by || (m.by === "You" && p.id === "you"));
                        if (m.type === "system") {
                          return (
                            <p key={i} className="text-[9px] text-text-ghost/25 text-center py-0.5">
                              <span style={{ color: (person?.color || "#888") + "40" }}>{m.by}</span> {m.text}
                            </p>
                          );
                        }
                        const isMe = m.by === "You";
                        return (
                          <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <span className="text-[8px] text-text-ghost/25 mb-0.5">{m.by}</span>
                            <div className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed max-w-[90%] ${
                              isMe ? "bg-amber/[0.06] border border-amber/10 text-paper/70 rounded-br-sm" : "bg-paper/[0.03] border border-paper/[0.04] text-text-secondary/70 rounded-bl-sm"
                            }`}>{m.text}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat input */}
                    <div className="px-3 py-3 border-t border-paper/[0.04] bg-void">
                      <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Say something..."
                          className="flex-1 bg-paper/[0.02] border border-paper/[0.05] rounded-xl py-2 px-3 text-[12px] text-paper/70 outline-none focus:border-amber/15 transition-colors placeholder:text-text-ghost/15" />
                        <button type="submit" disabled={!chatInput.trim()}
                          className="text-amber/40 hover:text-amber/80 transition-colors disabled:opacity-20 px-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        </button>
                      </form>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="lore" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
                    {Object.values(LORE_ENTRIES).map((lore, i) => (
                      <div key={i} 
                        className={`p-4 rounded-xl border border-paper/[0.05] bg-paper/[0.02] transition-colors ${activeLore?.toLowerCase() === lore.title.toLowerCase() ? "border-amber/40 bg-amber/[0.05] shadow-[0_0_15px_rgba(198,154,71,0.1)]" : "hover:border-paper/[0.1]"}`}
                      >
                        <h4 className="text-[13px] font-medium text-amber mb-1">{lore.title}</h4>
                        <span className="text-[9px] uppercase tracking-widest text-text-ghost/40 mb-3 block">{lore.type}</span>
                        <p className="text-[12px] text-text-secondary/80 leading-relaxed">{lore.desc}</p>
                      </div>
                    ))}
                    <button className="w-full py-4 mt-2 border-2 border-dashed border-paper/[0.05] rounded-xl text-[10px] uppercase tracking-widest text-text-ghost/40 hover:text-amber hover:border-amber/30 transition-colors">
                      + Add Entry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════ */}
      {/*  THE SCROLL                                       */}
      {/* ══════════════════════════════════════════════════ */}
      <div ref={scrollRef} className="relative z-10 min-h-screen">
        <div className="max-w-[640px] mx-auto px-8 sm:px-12">

          {/* ── Chapter header ────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: entered ? 1 : 0 }} transition={{ duration: 1.2, delay: 0.3 }}
            className="pt-24 pb-16 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-ghost/25 mb-3">Chapter One</p>
            <h1 className="font-display text-3xl sm:text-4xl text-paper/85 mb-5 leading-tight">The Map Room</h1>
            <div className="flex items-center justify-center gap-4">
              {PEOPLE.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color + "50" }} />
                  <span className="text-[10px]" style={{ color: p.color + "40" }}>{p.id === "you" ? "You" : p.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── The story + woven thoughts ─────────────────── */}
          {PARAS.map((para, i) => {
            const person = personById(para.by);
            const thoughtsAfter = allThoughts.filter((t) => t.afterPara === i);
            const isVisible = (tIdx: number) => thoughtsVisible.has(tIdx) || userThoughts.some((ut) => allThoughts.indexOf(ut) === tIdx);

            return (
              <div key={i}>
                {/* Paragraph */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.7 }}
                  className="relative group mb-1"
                >
                  {/* Attribution line (left gutter) */}
                  <div className="absolute -left-5 sm:-left-7 top-[6px] bottom-[6px] w-[2.5px] rounded-full transition-all duration-500 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: person.color + "35" }} />

                  {/* Author name (appears on hover) */}
                  <div className="absolute -left-5 sm:-left-7 -top-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-[8px] font-medium whitespace-nowrap" style={{ color: person.color + "50" }}>
                      {para.by === "you" ? "You" : person.name.split(" ")[0]}
                    </span>
                  </div>

                  <p className="font-reading text-[17px] sm:text-[18px] leading-[2] text-paper/80 transition-colors duration-500 group-hover:text-paper/95">
                    {renderWithLore(para.text)}
                  </p>
                </motion.div>

                {/* Inline thoughts after this paragraph */}
                {thoughtsAfter.map((thought) => {
                  const tIdx = allThoughts.indexOf(thought);
                  const tPerson = personById(thought.by);
                  if (!isVisible(tIdx)) return null;
                  return (
                    <motion.div key={`thought-${tIdx}`}
                      initial={{ opacity: 0, x: -16, height: 0, marginTop: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto", marginTop: 12, marginBottom: 20 }}
                      transition={{ type: "spring", damping: 22, stiffness: 150 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-3 pl-5 py-4 border-l-[3px] rounded-r-xl bg-paper/[0.03] hover:bg-paper/[0.05] transition-colors shadow-sm"
                        style={{ borderColor: tPerson.color + "50" }}>
                        <span className="text-[16px] mt-0.5 shrink-0">{thought.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-paper/85 leading-relaxed">{thought.text}</p>
                          <p className="text-[11px] mt-2 flex items-center gap-1.5 font-medium tracking-wide uppercase" style={{ color: tPerson.color + "90" }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tPerson.color }} />
                            {thought.by === "you" ? "You" : tPerson.name.split(" ")[0]}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Spacing between paragraphs */}
                {thoughtsAfter.length === 0 && i < PARAS.length - 1 && <div className="h-5" />}
              </div>
            );
          })}

          {/* ── Sarah's live typing ────────────────────────── */}
          <AnimatePresence>
            {penHolder === "sarah" && sarahText && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-1 mb-4 relative group">
                <div className="absolute -left-5 sm:-left-7 top-[6px] bottom-[6px] w-[2.5px] rounded-full"
                  style={{ backgroundColor: PEOPLE[1].color + "35" }} />
                <p className="font-reading text-[17px] sm:text-[18px] leading-[2] text-paper/80">
                  {sarahText}
                  {sarahTyping && (
                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block w-[2px] h-[18px] ml-0.5 align-middle rounded-full"
                      style={{ backgroundColor: PEOPLE[1].color }} />
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── The pen zone ───────────────────────────────── */}
          <div className="pt-8 pb-6">
            {!penHolder && (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="py-12 flex flex-col items-center gap-4">
                <div className="h-px w-16 bg-paper/[0.06] mb-4" />
                <button onClick={pickUpPen}
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-amber/[0.03] border border-amber/20 transition-all duration-500 hover:bg-amber/[0.08] hover:border-amber/40 hover:shadow-[0_0_20px_rgba(198,154,71,0.15)] focus:outline-none focus:ring-2 focus:ring-amber/50">
                  <motion.svg width="22" height="22" viewBox="0 0 32 32"
                    animate={{ rotate: [0, -3, 3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="group-hover:rotate-[-12deg] transition-transform duration-700">
                    <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="#D4A574" opacity="0.8"
                      className="group-hover:opacity-100 transition-opacity duration-500 drop-shadow-[0_0_8px_rgba(212,165,116,0.6)]" />
                  </motion.svg>
                  <span className="text-amber/80 text-[15px] font-display font-medium tracking-wide group-hover:text-amber transition-colors duration-500">Pick up the pen</span>
                </button>
                <button onClick={passPenToSarah} className="text-[12px] text-text-ghost/50 hover:text-paper transition-colors font-medium">
                  or let Sarah write next
                </button>
              </motion.div>
            )}

            {penHolder === "you" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-amber/50 animate-pulse" />
                  <span className="text-[11px] text-amber/40 font-reading italic">You hold the pen</span>
                  <span className="text-text-ghost/15 mx-1">\u00B7</span>
                  <button onClick={putDownPen} className="text-[10px] text-text-ghost/25 hover:text-text-ghost/50 transition-colors">set down</button>
                  <button onClick={passPenToSarah} className="text-[10px] text-text-ghost/25 hover:text-text-ghost/50 transition-colors">pass to Sarah</button>
                </div>
                <div contentEditable suppressContentEditableWarning
                  className="font-reading text-[17px] sm:text-[18px] leading-[2] text-paper/80 outline-none min-h-[140px]"
                  style={{ caretColor: "#D4A574" }}
                  data-placeholder="Continue the story..." />
              </motion.div>
            )}

            {penHolder === "sarah" && !sarahText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-8 flex items-center justify-center gap-2">
                <motion.span animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
                  className="text-[12px] font-reading italic" style={{ color: PEOPLE[1].color + "50" }}>
                  Sarah is picking up the pen...
                </motion.span>
              </motion.div>
            )}

            {penHolder === "sarah" && !sarahTyping && sarahText && (
              <div className="py-4 flex items-center justify-center gap-3">
                <button onClick={putDownPen} className="text-[11px] text-text-ghost/30 hover:text-text-ghost/60 transition-colors">
                  Sarah sets the pen down
                </button>
              </div>
            )}
          </div>

          {/* ── Thought input (always visible at bottom) ──── */}
          <div className="pb-20 pt-4">
            <div className="border-t border-paper/[0.04] pt-6">
              <div className="flex items-center gap-2 mb-3">
                {(["thought", "fire", "seed", "tension"] as const).map((t) => {
                  const emojis: Record<string, string> = { thought: "\uD83D\uDCAD", fire: "\uD83D\uDD25", seed: "\uD83C\uDF31", tension: "\u26A1" };
                  const labels: Record<string, string> = { thought: "Thought", fire: "Hot take", seed: "Seed", tension: "Tension" };
                  return (
                    <button key={t} onClick={() => setThoughtType(t)}
                      className={`px-3 py-1 rounded-full text-[10px] transition-all ${
                        thoughtType === t ? "bg-amber/[0.06] text-amber border border-amber/15" : "text-text-ghost/25 hover:text-text-ghost/50 border border-transparent"
                      }`}>
                      {emojis[t]} {labels[t]}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2.5">
                <input value={thoughtInput} onChange={(e) => setThoughtInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") dropThought(); }}
                  placeholder="Drop a thought between the lines..."
                  className="flex-1 bg-paper/[0.015] border border-paper/[0.05] rounded-2xl py-3 px-5 text-[13px] text-paper/70 outline-none focus:border-amber/15 focus:bg-paper/[0.025] transition-all placeholder:text-text-ghost/15" />
                <button onClick={dropThought} disabled={!thoughtInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-amber/[0.04] border border-amber/10 text-amber/40 text-[12px] font-medium hover:bg-amber/[0.08] hover:text-amber/70 transition-all disabled:opacity-15">
                  Drop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Placeholder CSS ───────────────────────────────── */}
      <style>{`[data-placeholder]:empty::before{content:attr(data-placeholder);color:rgba(255,255,255,0.1);font-style:italic;pointer-events:none;}`}</style>
    </div>
  );
}
