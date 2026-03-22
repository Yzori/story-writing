"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════

const STORY = "The Cartographer's Daughter";
const CHAPTER = "The Map Room";

const PEOPLE = [
  { id: "you", name: "You", color: "#D4A574", role: "writer" },
  { id: "sarah", name: "Sarah", color: "#A78BDB", role: "illustrator" },
  { id: "kael", name: "Kael", color: "#6DB89B", role: "worldbuilder" },
];

const EXISTING_TEXT = [
  "The old map room smelled of cedar and forgotten expeditions.",
  "Elara traced her finger along the coastline her father had drawn —",
  "every cove memorized, every reef annotated in his precise hand.",
  "She'd spent seventeen years in this room,",
  "and still the maps whispered secrets she couldn't quite hear.",
];

const SARAH_WRITES = `"You're doing it again," said Kael from the doorway, arms crossed, the afternoon light catching the silver threads in his dark hair. He leaned against the frame the way he always did — as if the whole building might collapse without his particular brand of nonchalance holding it together.`;

const GHOST_THOUGHTS = [
  { from: "Sarah", type: "thought" as const, text: "The cedar smell is everything. Can I sketch the room from this?", delay: 4000 },
  { from: "Kael", type: "fire" as const, text: "What if the maps don't whisper — what if they hum?", delay: 9000 },
  { from: "Sarah", type: "seed" as const, text: "Seventeen years. She was born in this room. That matters later.", delay: 16000 },
  { from: "Kael", type: "tension" as const, text: "The precision of his hand vs the wildness of where those maps lead", delay: 22000 },
];

const THOUGHT_META: Record<string, { emoji: string; color: string }> = {
  thought: { emoji: "💭", color: "rgba(200,200,200,0.15)" },
  fire: { emoji: "🔥", color: "rgba(212,165,116,0.12)" },
  seed: { emoji: "🌱", color: "rgba(109,184,155,0.12)" },
  tension: { emoji: "⚡", color: "rgba(167,139,219,0.12)" },
};

// ═══════════════════════════════════════════════════════════
//  STATES
// ═══════════════════════════════════════════════════════════

type RoomState = "arriving" | "room" | "transforming" | "theater" | "ceremony";

interface FloatingThought {
  id: string;
  from: string;
  text: string;
  type: string;
  y: number; // percentage from top
  side: "left" | "right";
  age: number;
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════

export default function WritersRoom() {
  const [state, setState] = useState<RoomState>("arriving");
  const [penHolder, setPenHolder] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [typingIdx, setTypingIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [thoughts, setThoughts] = useState<FloatingThought[]>([]);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; time: number }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [thoughtInput, setThoughtInput] = useState("");
  const [thoughtType, setThoughtType] = useState<"thought" | "fire" | "seed" | "tension">("thought");
  const [energy, setEnergy] = useState(0); // 0-10
  const [ceremonyData, setCeremonyData] = useState<{ from: string; to: string } | null>(null);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  const thoughtCounter = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Arrive ──────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setState("room"), 1800);
    return () => clearTimeout(t);
  }, []);

  // ── Ghost thoughts from simulated collaborators ─────────
  useEffect(() => {
    if (state !== "theater" || penHolder !== "you") return;
    const timers = GHOST_THOUGHTS.map((gt) =>
      setTimeout(() => {
        thoughtCounter.current++;
        setThoughts((prev) => [
          ...prev.slice(-6),
          {
            id: `gt-${thoughtCounter.current}`,
            from: gt.from,
            text: gt.text,
            type: gt.type,
            y: 15 + Math.random() * 60,
            side: Math.random() > 0.5 ? "left" : "right",
            age: Date.now(),
          },
        ]);
        setEnergy((e) => Math.min(10, e + 1));
      }, gt.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [state, penHolder]);

  // ── Simulated Sarah typing ──────────────────────────────
  useEffect(() => {
    if (state !== "theater" || penHolder !== "sarah") return;
    setIsTyping(true);
    setTypedText("");
    setTypingIdx(0);

    let idx = 0;
    const type = () => {
      if (idx >= SARAH_WRITES.length) {
        setIsTyping(false);
        setEnergy(8);
        return;
      }
      // Natural typing rhythm
      const char = SARAH_WRITES[idx];
      const pause = char === "." || char === "," || char === "—"
        ? 200 + Math.random() * 300
        : char === " "
        ? 30 + Math.random() * 50
        : 25 + Math.random() * 45;

      typingTimer.current = setTimeout(() => {
        idx++;
        setTypedText(SARAH_WRITES.slice(0, idx));
        setTypingIdx(idx);
        if (idx % 20 === 0) setEnergy((e) => Math.min(10, e + 1));
        type();
      }, pause);
    };

    // Small delay before Sarah starts
    const start = setTimeout(type, 2000);
    return () => {
      clearTimeout(start);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [state, penHolder]);

  // ── Sarah's ghost thoughts while she writes ─────────────
  useEffect(() => {
    if (state !== "theater" || penHolder !== "sarah") return;
    const timers = [
      setTimeout(() => addThought("Kael", "tension", "The nonchalance is a mask. We know that right?"), 6000),
      setTimeout(() => addThought("You", "thought", "Silver threads — is he aging fast? Or is that genetic?"), 12000),
      setTimeout(() => addThought("Kael", "fire", "\"the whole building might collapse\" — literal or metaphorical?"), 18000),
    ];
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, penHolder]);

  // ── Fade old thoughts ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 25000;
      setThoughts((prev) => prev.filter((t) => t.age > cutoff));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Energy decay ────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setEnergy((e) => Math.max(0, e - 1)), 8000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ─────────────────────────────────────────────

  const addThought = useCallback((from: string, type: string, text: string) => {
    thoughtCounter.current++;
    setThoughts((prev) => [
      ...prev.slice(-6),
      {
        id: `t-${thoughtCounter.current}`,
        from, text, type,
        y: 15 + Math.random() * 55,
        side: Math.random() > 0.5 ? "left" : "right",
        age: Date.now(),
      },
    ]);
  }, []);

  const pickUpPen = useCallback((who: string) => {
    setState("transforming");
    setPenHolder(who);
    setEnergy(2);
    setChatMessages((prev) => [...prev, { from: who === "you" ? "You" : PEOPLE.find((p) => p.id === who)!.name, text: "picked up the pen", time: Date.now() }]);
    setTimeout(() => setState("theater"), 1500);
  }, []);

  const putDownPen = useCallback(() => {
    setPenHolder(null);
    setIsTyping(false);
    setState("room");
    setTypedText("");
    setChatMessages((prev) => [...prev, { from: penHolder === "you" ? "You" : PEOPLE.find((p) => p.id === penHolder)?.name || "Someone", text: "set the pen down", time: Date.now() }]);
  }, [penHolder]);

  const passPen = useCallback((toId: string) => {
    const from = penHolder === "you" ? "You" : PEOPLE.find((p) => p.id === penHolder)?.name || "Someone";
    const to = toId === "you" ? "You" : PEOPLE.find((p) => p.id === toId)?.name || "Someone";
    setCeremonyData({ from, to });
    setState("ceremony");
    setIsTyping(false);
    setTypedText("");
    setTimeout(() => {
      setCeremonyData(null);
      setPenHolder(toId);
      setState("theater");
      setEnergy(3);
    }, 3200);
  }, [penHolder]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { from: "You", text: chatInput.trim(), time: Date.now() }]);
    setChatInput("");
  }, [chatInput]);

  const dropThought = useCallback(() => {
    if (!thoughtInput.trim()) return;
    addThought("You", thoughtType, thoughtInput.trim());
    setChatMessages((prev) => [...prev, { from: "You", text: `${THOUGHT_META[thoughtType].emoji} ${thoughtInput.trim()}`, time: Date.now() }]);
    setThoughtInput("");
  }, [thoughtInput, thoughtType, addThought]);

  // ── Energy glow color ───────────────────────────────────
  const glowOpacity = 0.02 + energy * 0.005;
  const glowColor = energy > 6 ? `rgba(212,165,116,${glowOpacity})` : energy > 2 ? `rgba(109,184,155,${glowOpacity * 0.8})` : `rgba(200,200,200,${glowOpacity * 0.4})`;

  const holderName = penHolder ? (penHolder === "you" ? "You" : PEOPLE.find((p) => p.id === penHolder)?.name || "Someone") : null;
  const holderColor = penHolder ? PEOPLE.find((p) => p.id === penHolder)?.color || "#D4A574" : "#D4A574";
  const iHoldPen = penHolder === "you";
  const isTheater = state === "theater" || state === "transforming";

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="h-screen w-full bg-void text-paper overflow-hidden relative select-none">

      {/* ── Ambient energy glow ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-[4000ms]"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${glowColor} 0%, transparent 70%)` }} />
      <div className={`absolute inset-0 pointer-events-none transition-all duration-[2000ms] ${
        isTheater ? "shadow-[inset_0_0_200px_rgba(0,0,0,0.85)]" : "shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]"
      }`} />

      {/* ── Arrival ──────────────────────────────────────── */}
      <AnimatePresence>
        {state === "arriving" && (
          <motion.div key="arrive" exit={{ opacity: 0 }} transition={{ duration: 1 }}
            className="absolute inset-0 z-50 bg-void flex items-center justify-center">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-text-ghost text-[13px] font-reading italic">
              Entering the room...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ceremony ─────────────────────────────────────── */}
      <AnimatePresence>
        {state === "ceremony" && ceremonyData && (
          <motion.div key="ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-xl">
            <div className="text-center">
              <motion.svg width="52" height="52" viewBox="0 0 32 32" className="mx-auto mb-8"
                animate={{ rotate: [0, -20, 20, -10, 0], y: [0, -16, -8, -16, 0] }}
                transition={{ duration: 2, ease: "easeInOut" }}>
                <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
                  fill="#D4A574" opacity="0.9" />
                <path d="M7 28L5 29L4 27L7 28Z" fill="#D4A574" />
                <circle cx="4.5" cy="28" r="1" fill="#D4A574" opacity="0.5" />
              </motion.svg>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="font-display text-2xl sm:text-3xl">
                <span style={{ color: "#D4A574" }}>{ceremonyData.from}</span>
                <span className="text-text-ghost/60 mx-3 text-xl">passes the pen to</span>
                <span style={{ color: "#D4A574" }}>{ceremonyData.to}</span>
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.4 }}
                className="text-text-ghost text-[13px] font-reading italic mt-4">
                The story continues...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top whisper bar ───────────────────────────────── */}
      <AnimatePresence>
        {state !== "arriving" && state !== "ceremony" && (
          <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="absolute top-0 left-0 right-0 z-30 h-10 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-[13px] text-paper/50">{STORY}</span>
              {isTheater && <span className="text-[10px] text-text-ghost/40 font-reading italic mx-1">—</span>}
              {isTheater && <span className="text-[11px] text-text-ghost/40 font-reading">{CHAPTER}</span>}
            </div>
            <div className="flex items-center gap-3">
              {penHolder && (
                <span className="text-[10px] flex items-center gap-1.5" style={{ color: holderColor + "90" }}>
                  <svg width="8" height="8" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" />
                  </svg>
                  {holderName}
                </span>
              )}
              <span className={`text-[10px] ${energy > 5 ? "text-amber/50" : energy > 1 ? "text-teal/40" : "text-text-ghost/30"}`}>
                {energy > 6 ? "🔥" : energy > 2 ? "🌊" : "🌙"} {energy > 6 ? "on fire" : energy > 2 ? "flowing" : "quiet"}
              </span>
              <span className="text-[10px] text-text-ghost/30">{PEOPLE.length} here</span>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════ */}
      {/*  THE ROOM                                        */}
      {/* ══════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {state === "room" && (
          <motion.div key="room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10">

            {/* Chapter */}
            <motion.button
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              onClick={() => setShowChapterPicker(!showChapterPicker)}
              className="text-[10px] text-text-ghost/40 uppercase tracking-[0.2em] mb-2 hover:text-text-ghost/60 transition-colors relative">
              {CHAPTER}
              <AnimatePresence>
                {showChapterPicker && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 4 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-elevated/95 backdrop-blur-xl border border-border rounded-xl p-1.5 shadow-2xl shadow-black/60 z-50">
                    {["The Map Room", "Maps of Nowhere", "The Compass Rose"].map((ch) => (
                      <button key={ch} onClick={() => setShowChapterPicker(false)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all ${ch === CHAPTER ? "text-amber bg-amber/[0.05]" : "text-text-secondary hover:text-paper hover:bg-surface/30"}`}>
                        {ch}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Story title */}
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}
              className="font-display text-3xl sm:text-5xl text-paper/90 mb-12 text-center px-8 leading-tight">
              {STORY}
            </motion.h1>

            {/* People */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="flex items-center gap-8 mb-14">
              {PEOPLE.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.15, type: "spring", damping: 20 }}
                  className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-full flex items-center justify-center font-display text-lg font-bold"
                    style={{ backgroundColor: p.color + "18", color: p.color, border: `1.5px solid ${p.color}30` }}>
                    {p.name.charAt(0)}
                  </motion.div>
                  <span className="text-[11px]" style={{ color: p.color + "80" }}>{p.id === "you" ? "You" : p.name}</span>
                  <span className="text-[9px] text-text-ghost/30">{p.role}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Recent thoughts floating */}
            {thoughts.slice(-3).map((t) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: t.side === "left" ? -20 : 20 }}
                animate={{ opacity: 0.7, x: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3 max-w-md"
              >
                <div className="flex items-start gap-2 px-4 py-2 rounded-2xl" style={{ backgroundColor: THOUGHT_META[t.type]?.color || "rgba(200,200,200,0.08)" }}>
                  <span className="text-[13px]">{THOUGHT_META[t.type]?.emoji}</span>
                  <span className="text-[12px] text-text-secondary/80 leading-relaxed">{t.text}</span>
                  <span className="text-[9px] text-text-ghost/40 ml-auto shrink-0 mt-0.5">{t.from}</span>
                </div>
              </motion.div>
            ))}

            {/* The Pen */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.8 }}
              className="mt-6">
              <button onClick={() => pickUpPen("you")}
                className="group flex flex-col items-center gap-3 px-10 py-7 rounded-3xl transition-all duration-700 hover:bg-amber/[0.04]">
                <motion.svg width="36" height="36" viewBox="0 0 32 32"
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="group-hover:rotate-[-15deg] group-hover:scale-110 transition-transform duration-700">
                  <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
                    fill="#D4A574" opacity="0.6" className="group-hover:opacity-90 transition-opacity duration-700" />
                  <path d="M7 28L5 29L4 27L7 28Z" fill="#D4A574" opacity="0.6" />
                </motion.svg>
                <span className="text-amber/50 text-[13px] font-display group-hover:text-amber/80 transition-colors duration-500">
                  Pick up the pen
                </span>
              </button>

              {/* Or let Sarah write */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button onClick={() => pickUpPen("sarah")}
                  className="text-[11px] text-text-ghost/30 hover:text-text-ghost/60 transition-colors">
                  Let Sarah write
                </button>
              </div>
            </motion.div>

            {/* Activity whispers */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-sm w-full px-6">
              {chatMessages.slice(-3).map((m, i) => (
                <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 0.35 }}
                  className="text-[10px] text-text-ghost text-center mb-0.5">
                  <span className="text-text-secondary/50">{m.from}</span> {m.text}
                </motion.p>
              ))}
            </motion.div>

            {/* Thought input — bottom center, prominent */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-6">
              <div className="bg-paper/[0.02] border border-paper/[0.05] rounded-2xl p-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-2 justify-center">
                  {(Object.entries(THOUGHT_META) as [string, { emoji: string }][]).map(([k, v]) => (
                    <button key={k} onClick={() => setThoughtType(k as typeof thoughtType)}
                      className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${thoughtType === k ? "bg-amber/[0.08] text-amber" : "text-text-ghost/40 hover:text-text-ghost/70"}`}>
                      {v.emoji}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={thoughtInput} onChange={(e) => setThoughtInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") dropThought(); }}
                    placeholder="Drop a thought into the room..."
                    className="flex-1 bg-transparent text-[13px] text-paper/80 outline-none placeholder:text-text-ghost/25 px-2" />
                  <button onClick={dropThought} disabled={!thoughtInput.trim()}
                    className="text-[11px] text-amber/50 hover:text-amber/80 transition-colors disabled:opacity-20 px-2">
                    drop
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  THE THEATER                                     */}
        {/* ══════════════════════════════════════════════════ */}
        {(state === "theater" || state === "transforming") && (
          <motion.div key="theater" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 1.2 }}
            className="absolute inset-0 flex z-10">

            {/* ── Center stage: the text ──────────────────── */}
            <div className="flex-1 overflow-y-auto flex justify-center relative">
              <div className="max-w-[620px] w-full py-16 px-8 sm:px-12">

                {/* Writer indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  className="flex items-center gap-2 mb-8">
                  {iHoldPen ? (
                    <>
                      <button onClick={putDownPen} className="text-[11px] text-text-ghost/40 hover:text-text-ghost/70 transition-colors">
                        Set pen down
                      </button>
                      <span className="text-text-ghost/20 mx-1">·</span>
                      {PEOPLE.filter((p) => p.id !== "you").map((p) => (
                        <button key={p.id} onClick={() => passPen(p.id)}
                          className="text-[11px] transition-colors px-2 py-0.5 rounded-full hover:bg-paper/[0.03]"
                          style={{ color: p.color + "60" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = p.color + "AA")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = p.color + "60")}>
                          Pass to {p.name}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      <button onClick={putDownPen} className="text-[11px] text-text-ghost/40 hover:text-text-ghost/70 transition-colors">
                        ← Back to room
                      </button>
                      <span className="text-text-ghost/20 mx-1">·</span>
                      <motion.span animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}
                        className="text-[11px] font-reading italic" style={{ color: holderColor + "70" }}>
                        {holderName} is writing...
                      </motion.span>
                    </>
                  )}
                </motion.div>

                {/* The text */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}>
                  {/* Existing paragraphs */}
                  <div className="font-reading text-[17px] sm:text-[19px] leading-[1.9] text-paper/85 space-y-6">
                    <p>{EXISTING_TEXT.join(" ")}</p>

                    {/* Sarah's live typing */}
                    {penHolder === "sarah" && typedText && (
                      <p>
                        <span className="text-paper/90">{typedText}</span>
                        {isTyping && (
                          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }}
                            className="inline-block w-[2px] h-[20px] ml-0.5 align-middle rounded-full"
                            style={{ backgroundColor: PEOPLE.find((p) => p.id === "sarah")!.color }} />
                        )}
                      </p>
                    )}

                    {/* User's editable area */}
                    {iHoldPen && (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="outline-none text-paper/90 min-h-[100px]"
                        style={{ caretColor: "#D4A574" }}
                        data-placeholder="Continue the story..."
                      />
                    )}
                  </div>
                </motion.div>
              </div>

              {/* ── Floating margin thoughts ──────────────── */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <AnimatePresence>
                  {thoughts.map((t) => {
                    const meta = THOUGHT_META[t.type] || THOUGHT_META.thought;
                    const age = (Date.now() - t.age) / 1000;
                    const fadeOut = age > 20 ? 0.3 : 1;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: t.side === "left" ? -30 : 30 }}
                        animate={{ opacity: 0.8 * fadeOut, x: 0 }}
                        exit={{ opacity: 0, x: t.side === "left" ? -20 : 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 150 }}
                        className={`absolute ${t.side === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8"} max-w-[200px] pointer-events-auto`}
                        style={{ top: `${t.y}%` }}
                      >
                        <div className="px-3 py-2 rounded-xl text-[11px] leading-relaxed backdrop-blur-sm border"
                          style={{ backgroundColor: meta.color, borderColor: "rgba(255,255,255,0.04)" }}>
                          <span className="mr-1">{meta.emoji}</span>
                          <span className="text-text-secondary/70">{t.text}</span>
                          <span className="block text-[8px] text-text-ghost/30 mt-1">{t.from}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* ── Bottom thought bar (audience only) ────── */}
              {!iHoldPen && (
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className="max-w-[620px] mx-auto px-8 sm:px-12 pb-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
                      className="bg-void/85 backdrop-blur-xl rounded-2xl p-3 border border-paper/[0.04] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center gap-1.5 mb-2">
                        {(Object.entries(THOUGHT_META) as [string, { emoji: string }][]).map(([k, v]) => (
                          <button key={k} onClick={() => setThoughtType(k as typeof thoughtType)}
                            className={`px-2 py-0.5 rounded-full text-[10px] transition-all ${thoughtType === k ? "bg-amber/[0.08] text-amber" : "text-text-ghost/30 hover:text-text-ghost/60"}`}>
                            {v.emoji}
                          </button>
                        ))}
                        <span className="text-[8px] text-text-ghost/20 ml-auto italic">whisper into the margin</span>
                      </div>
                      <div className="flex gap-2">
                        <input value={thoughtInput} onChange={(e) => setThoughtInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") dropThought(); }}
                          placeholder="Drop a thought..."
                          className="flex-1 bg-transparent text-[13px] text-paper/80 outline-none placeholder:text-text-ghost/20 px-1" />
                        <button onClick={dropThought} disabled={!thoughtInput.trim()}
                          className="text-[11px] text-amber/40 hover:text-amber/80 transition-colors disabled:opacity-20 px-2">drop</button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right whisper column ────────────────────── */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
              className={`w-[260px] border-l border-paper/[0.03] flex flex-col shrink-0 overflow-hidden transition-opacity duration-1000 ${
                iHoldPen ? "opacity-20 hover:opacity-80" : "opacity-80"
              }`}>

              {/* People */}
              <div className="px-4 py-3 flex items-center gap-2">
                {PEOPLE.map((p) => (
                  <div key={p.id} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: p.color + "15", color: p.color + "80", border: `1px solid ${p.color}20` }}
                    title={p.name}>
                    {p.name[0]}
                  </div>
                ))}
              </div>

              {/* Chat stream */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2" style={{ scrollbarWidth: "none" }}>
                {chatMessages.length === 0 && (
                  <p className="text-[10px] text-text-ghost/20 text-center py-8 italic">The room is quiet</p>
                )}
                {chatMessages.map((m, i) => (
                  m.text.startsWith("picked up") || m.text.startsWith("set the") || m.text.startsWith("left") ? (
                    <p key={i} className="text-[9px] text-text-ghost/25 py-0.5">
                      <span className="text-text-ghost/40">{m.from}</span> {m.text}
                    </p>
                  ) : (
                    <div key={i}>
                      <span className="text-[8px] text-text-ghost/25">{m.from}</span>
                      <div className={`px-3 py-1.5 rounded-2xl text-[11px] leading-relaxed mt-0.5 max-w-[95%] ${
                        m.from === "You" ? "bg-amber/[0.04] text-paper/60 rounded-br-sm ml-auto" : "bg-paper/[0.02] text-text-secondary/60 rounded-bl-sm"
                      }`}>{m.text}</div>
                    </div>
                  )
                ))}
              </div>

              {/* Chat input */}
              <div className="px-3 py-2 border-t border-paper/[0.03]">
                <div className="flex gap-1.5">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                    placeholder="Say something..."
                    className="flex-1 bg-transparent text-[11px] text-paper/60 outline-none placeholder:text-text-ghost/20 px-1" />
                  <button onClick={sendChat} disabled={!chatInput.trim()}
                    className="text-amber/30 hover:text-amber/60 transition-colors disabled:opacity-20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CSS for placeholder ───────────────────────────── */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.15);
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
