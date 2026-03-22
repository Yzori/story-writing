"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════
//  SHARED DATA
// ═══════════════════════════════════════════════════════════

const PARAS = [
  { text: "The old map room smelled of cedar and forgotten expeditions. Elara traced her finger along the coastline her father had drawn — every cove memorized, every reef annotated in his precise hand.", by: "Flow", color: "#D4A574" },
  { text: "She'd spent seventeen years in this room, and still the maps whispered secrets she couldn't quite hear.", by: "Flow", color: "#D4A574" },
  { text: "\u201CYou're doing it again,\u201D said Kael from the doorway, arms crossed, the afternoon light catching the silver threads in his dark hair.", by: "Sarah", color: "#A78BDB" },
  { text: "He leaned against the frame the way he always did — as if the whole building might collapse without his particular brand of nonchalance holding it together.", by: "Sarah", color: "#A78BDB" },
  { text: "Elara didn't look up. Her father's final map was spread across the table, weighted at the corners with river stones she'd collected as a child. The eastern edge was torn — deliberately, she now realized.", by: "Flow", color: "#D4A574" },
  { text: "\u201CThat's not a gap, Elara. That's a door.\u201D", by: "Kael", color: "#6DB89B" },
];

const THOUGHTS = [
  { by: "Sarah", emoji: "\uD83D\uDCAD", text: "The cedar smell grounds the scene. Can I sketch this room?" },
  { by: "Kael", emoji: "\uD83D\uDD25", text: "What if the maps don't whisper — what if they hum?" },
  { by: "Flow", emoji: "\uD83C\uDF31", text: "Seventeen years. She was born here. That matters later." },
  { by: "Sarah", emoji: "\u26A1", text: "\"That's a door\" — this changes everything, doesn't it?" },
];

const PEOPLE = [
  { name: "Flow", color: "#D4A574", initial: "F" },
  { name: "Sarah", color: "#A78BDB", initial: "S" },
  { name: "Kael", color: "#6DB89B", initial: "K" },
];

type Concept = "scroll" | "stage" | "layers" | "orbit";

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE — CONCEPT SWITCHER
// ═══════════════════════════════════════════════════════════

export default function CoopConcepts() {
  const [active, setActive] = useState<Concept>("scroll");

  const concepts: { id: Concept; label: string; desc: string }[] = [
    { id: "scroll", label: "The Scroll", desc: "Story and collaboration woven into one flow" },
    { id: "stage", label: "The Stage", desc: "Writing as live performance" },
    { id: "layers", label: "The Layers", desc: "Shift focus between story and room" },
    { id: "orbit", label: "The Orbit", desc: "Spatial, non-linear navigation" },
  ];

  return (
    <div className="min-h-screen bg-void text-paper">
      {/* Concept picker */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-xl border-b border-paper/[0.04]">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-1">
          <span className="text-[10px] text-text-ghost/40 uppercase tracking-[0.15em] mr-4 hidden sm:block">Concepts</span>
          {concepts.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`px-4 py-1.5 rounded-full text-[12px] transition-all ${
                active === c.id ? "bg-amber/10 text-amber" : "text-text-ghost/50 hover:text-paper/70"
              }`}>
              {c.label}
            </button>
          ))}
          <span className="text-[10px] text-text-ghost/25 ml-auto hidden sm:block">
            {concepts.find((c) => c.id === active)?.desc}
          </span>
        </div>
      </div>

      <div className="pt-12">
        <AnimatePresence mode="wait">
          {active === "scroll" && <ScrollConcept key="scroll" />}
          {active === "stage" && <StageConcept key="stage" />}
          {active === "layers" && <LayersConcept key="layers" />}
          {active === "orbit" && <OrbitConcept key="orbit" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CONCEPT 1: THE SCROLL
//  Everything inline. No sidebars. Story and collaboration
//  woven into a single continuous flow.
// ═══════════════════════════════════════════════════════════

function ScrollConcept() {
  const [visibleThoughts, setVisibleThoughts] = useState(0);

  useEffect(() => {
    const timers = THOUGHTS.map((_, i) =>
      setTimeout(() => setVisibleThoughts(i + 1), 2000 + i * 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen">
      <div className="max-w-[600px] mx-auto px-6 py-20">
        {/* Title */}
        <div className="text-center mb-20">
          <p className="text-[9px] uppercase tracking-[0.25em] text-text-ghost/30 mb-3">Chapter One</p>
          <h1 className="font-display text-3xl text-paper/80 mb-4">The Map Room</h1>
          <div className="flex items-center justify-center gap-3">
            {PEOPLE.map((p) => (
              <span key={p.name} className="text-[10px]" style={{ color: p.color + "60" }}>{p.name}</span>
            ))}
          </div>
        </div>

        {/* Story + inline collaboration */}
        {PARAS.map((para, i) => (
          <div key={i}>
            {/* The paragraph */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="mb-2 relative group"
            >
              {/* Attribution gutter */}
              <div className="absolute -left-6 top-1 w-[3px] h-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: para.color + "40" }} />
              <div className="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] writing-mode-vertical" style={{ color: para.color + "50" }}>{para.by}</span>
              </div>

              <p className="font-reading text-[17px] leading-[2] text-paper/80 hover:text-paper/95 transition-colors duration-500">
                {para.text}
              </p>
            </motion.div>

            {/* Inline thought (appears between certain paragraphs) */}
            {i < visibleThoughts && THOUGHTS[i] && (
              <motion.div
                initial={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto", marginBottom: 24 }}
                transition={{ type: "spring", damping: 25 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 pl-4 py-3 border-l-2 ml-4" style={{ borderColor: PEOPLE.find((p) => p.name === THOUGHTS[i].by)?.color + "30" }}>
                  <span className="text-[15px] mt-0.5 shrink-0">{THOUGHTS[i].emoji}</span>
                  <div>
                    <p className="text-[13px] text-text-secondary/70 leading-relaxed">{THOUGHTS[i].text}</p>
                    <p className="text-[10px] mt-1" style={{ color: PEOPLE.find((p) => p.name === THOUGHTS[i].by)?.color + "50" }}>
                      {THOUGHTS[i].by}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {i < PARAS.length - 1 && !THOUGHTS[i] && <div className="h-6" />}
          </div>
        ))}

        {/* Writing zone at the bottom */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-paper/[0.04]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber/60 animate-pulse" />
            <span className="text-[11px] text-amber/50 font-reading italic">You hold the pen</span>
          </div>
          <div contentEditable suppressContentEditableWarning
            className="font-reading text-[17px] leading-[2] text-paper/80 outline-none min-h-[120px]"
            style={{ caretColor: "#D4A574" }}
            data-placeholder="Continue the story..." />
        </motion.div>

        {/* Thought input — inline, part of the scroll */}
        <div className="mt-12 mb-32">
          <div className="flex items-center gap-2 pl-4 border-l-2 border-paper/[0.06]">
            <span className="text-[13px]">💭</span>
            <input placeholder="Drop a thought between the lines..."
              className="flex-1 bg-transparent text-[13px] text-text-secondary/60 outline-none placeholder:text-text-ghost/20" />
          </div>
        </div>
      </div>

      <style>{`
        [data-placeholder]:empty::before { content: attr(data-placeholder); color: rgba(255,255,255,0.12); font-style: italic; }
        .writing-mode-vertical { writing-mode: vertical-lr; text-orientation: mixed; }
      `}</style>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CONCEPT 2: THE STAGE
//  Dark theater. Spotlight on text. Audience at bottom.
//  Reactions rise like embers. Pure atmosphere.
// ═══════════════════════════════════════════════════════════

function StageConcept() {
  const [lineIdx, setLineIdx] = useState(0);
  const [embers, setEmbers] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const emberCount = useRef(0);

  // Auto-reveal lines
  useEffect(() => {
    if (lineIdx >= PARAS.length) return;
    const t = setTimeout(() => setLineIdx((i) => i + 1), 2500);
    return () => clearTimeout(t);
  }, [lineIdx]);

  // Simulated audience reactions
  useEffect(() => {
    const emojis = ["✨", "👀", "🔥", "💭", "⚡"];
    const interval = setInterval(() => {
      emberCount.current++;
      setEmbers((prev) => [
        ...prev.slice(-8),
        { id: emberCount.current, emoji: emojis[Math.floor(Math.random() * emojis.length)], x: 15 + Math.random() * 70 },
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clean old embers
  useEffect(() => {
    const interval = setInterval(() => {
      setEmbers((prev) => prev.slice(-6));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-[calc(100vh-48px)] relative overflow-hidden bg-black">

      {/* Spotlight gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 50% 60% at 50% 45%, rgba(212,165,116,0.06) 0%, rgba(0,0,0,0) 100%)"
      }} />

      {/* Stage curtain shadows */}
      <div className="absolute top-0 left-0 w-1/4 h-full bg-gradient-to-r from-black to-transparent opacity-80" />
      <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-black to-transparent opacity-80" />

      {/* Writer label */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#A78BDB" }} />
          <span className="text-[11px] font-reading italic" style={{ color: "#A78BDB80" }}>Sarah is performing</span>
        </div>
      </motion.div>

      {/* Center stage — the text */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center px-8">
        <div className="max-w-[550px] w-full">
          <AnimatePresence>
            {PARAS.slice(0, lineIdx).map((para, i) => (
              <motion.p key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: i === lineIdx - 1 ? 0.9 : 0.4, y: 0 }}
                transition={{ duration: 0.8 }}
                className="font-reading text-[18px] leading-[2.1] mb-4 text-center"
                style={{ color: i === lineIdx - 1 ? "#ede8d8" : "#ede8d860" }}>
                {para.text}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Rising embers (reactions) */}
      <AnimatePresence>
        {embers.map((e) => (
          <motion.div key={e.id}
            initial={{ opacity: 0.8, y: "85vh", scale: 1 }}
            animate={{ opacity: 0, y: "20vh", scale: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 6, ease: "easeOut" }}
            className="absolute text-[16px] pointer-events-none"
            style={{ left: `${e.x}%` }}>
            {e.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Audience — bottom of stage */}
      <div className="absolute bottom-0 left-0 right-0 h-24">
        {/* Stage edge */}
        <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-amber/20 to-transparent" />

        {/* People */}
        <div className="flex items-end justify-center gap-12 pt-6">
          {PEOPLE.map((p, i) => (
            <motion.div key={p.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 1 + i * 0.2 }}
              className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: p.color + "15", color: p.color + "70", border: `1px solid ${p.color}20` }}>
                {p.initial}
              </div>
              <span className="text-[9px]" style={{ color: p.color + "40" }}>{p.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* React from audience */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-3">
        {["✨", "👀", "🔥", "💭"].map((e) => (
          <button key={e} onClick={() => {
            emberCount.current++;
            setEmbers((prev) => [...prev, { id: emberCount.current, emoji: e, x: 40 + Math.random() * 20 }]);
          }}
            className="w-8 h-8 rounded-full bg-paper/[0.03] hover:bg-paper/[0.08] transition-colors flex items-center justify-center text-[14px]">
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CONCEPT 3: THE LAYERS
//  Two layers with a focus slider. Story is backdrop,
//  room is foreground. Shift between them.
// ═══════════════════════════════════════════════════════════

function LayersConcept() {
  const [focus, setFocus] = useState(0.5); // 0 = full story, 1 = full room
  const storyOpacity = 1 - focus * 0.7;
  const storyBlur = focus * 4;
  const roomOpacity = 0.2 + focus * 0.8;
  const roomScale = 0.95 + focus * 0.05;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-[calc(100vh-48px)] relative overflow-hidden">

      {/* Story layer (background) */}
      <div className="absolute inset-0 flex justify-center overflow-y-auto transition-all duration-500"
        style={{ opacity: storyOpacity, filter: `blur(${storyBlur}px)` }}>
        <div className="max-w-[600px] w-full px-8 py-20">
          <h2 className="font-display text-2xl text-paper/70 mb-8 text-center">The Map Room</h2>
          {PARAS.map((p, i) => (
            <p key={i} className="font-reading text-[17px] leading-[2] text-paper/70 mb-6">{p.text}</p>
          ))}
        </div>
      </div>

      {/* Room layer (foreground) — floating cards */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ opacity: roomOpacity, transform: `scale(${roomScale})` }}>

        {/* People — top center */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-6 pointer-events-auto">
          {PEOPLE.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold backdrop-blur-md border"
                style={{ backgroundColor: p.color + "12", color: p.color, borderColor: p.color + "25" }}>
                {p.initial}
              </div>
              <span className="text-[10px]" style={{ color: p.color + "70" }}>{p.name}</span>
            </div>
          ))}
        </div>

        {/* Thought cards — scattered */}
        {THOUGHTS.map((t, i) => {
          const positions = [
            { top: "22%", left: "8%" }, { top: "35%", right: "6%" },
            { top: "55%", left: "5%" }, { top: "68%", right: "8%" },
          ];
          const pos = positions[i] || positions[0];
          const person = PEOPLE.find((p) => p.name === t.by);
          return (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.3 }}
              className="absolute max-w-[220px] pointer-events-auto"
              style={pos}>
              <div className="px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-xl"
                style={{ backgroundColor: (person?.color || "#fff") + "08", borderColor: (person?.color || "#fff") + "15",
                  boxShadow: `0 8px 32px ${(person?.color || "#000")}10` }}>
                <span className="text-[14px] mr-1">{t.emoji}</span>
                <span className="text-[12px] text-text-secondary/70 leading-relaxed">{t.text}</span>
                <p className="text-[9px] mt-1.5" style={{ color: person?.color + "50" }}>{t.by}</p>
              </div>
            </motion.div>
          );
        })}

        {/* Pen indicator */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber/[0.06] backdrop-blur-md border border-amber/10">
            <svg width="12" height="12" viewBox="0 0 32 32" fill="#D4A574" opacity="0.6">
              <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" />
            </svg>
            <span className="text-[11px] text-amber/60">Flow holds the pen</span>
          </div>
        </div>
      </div>

      {/* Focus slider */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        <span className="text-[10px] text-text-ghost/40">Story</span>
        <input type="range" min="0" max="1" step="0.01" value={focus}
          onChange={(e) => setFocus(parseFloat(e.target.value))}
          className="w-40 h-1 appearance-none bg-paper/10 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber/70 [&::-webkit-slider-thumb]:cursor-pointer" />
        <span className="text-[10px] text-text-ghost/40">Room</span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CONCEPT 4: THE ORBIT
//  Spatial navigation. Current paragraph at center.
//  Others orbit around it. Click to navigate.
// ═══════════════════════════════════════════════════════════

function OrbitConcept() {
  const [centerIdx, setCenterIdx] = useState(0);

  const orbitPositions = (count: number, active: number) => {
    const positions: { x: number; y: number; scale: number; opacity: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (i === active) {
        positions.push({ x: 0, y: 0, scale: 1, opacity: 1 });
      } else {
        const offset = i - active;
        const angle = (offset / count) * Math.PI * 2 + Math.PI / 2;
        const radius = 280;
        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.6,
          scale: 0.35,
          opacity: 0.35,
        });
      }
    }
    return positions;
  };

  const positions = orbitPositions(PARAS.length, centerIdx);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-[calc(100vh-48px)] relative overflow-hidden flex items-center justify-center">

      {/* Orbital ring (subtle) */}
      <div className="absolute w-[560px] h-[340px] rounded-full border border-paper/[0.03]" />

      {/* Paragraphs */}
      {PARAS.map((para, i) => {
        const pos = positions[i];
        const isCenter = i === centerIdx;
        return (
          <motion.div key={i}
            animate={{ x: pos.x, y: pos.y, scale: pos.scale, opacity: pos.opacity }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            onClick={() => setCenterIdx(i)}
            className={`absolute max-w-[500px] ${isCenter ? "" : "cursor-pointer hover:opacity-60"}`}
            style={{ zIndex: isCenter ? 10 : 1 }}>
            {isCenter ? (
              <div className="text-center px-8">
                <p className="font-reading text-[20px] leading-[2] text-paper/90">{para.text}</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: para.color + "60" }} />
                  <span className="text-[10px]" style={{ color: para.color + "50" }}>{para.by}</span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-paper/[0.02] border border-paper/[0.04] backdrop-blur-sm max-w-[200px]">
                <p className="text-[10px] text-text-ghost/50 line-clamp-3 leading-relaxed">{para.text}</p>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: para.color + "40" }} />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* People — positioned around the edge */}
      {PEOPLE.map((p, i) => {
        const angle = (i / PEOPLE.length) * Math.PI * 2 - Math.PI / 2;
        const r = 360;
        return (
          <motion.div key={p.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.6 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="absolute flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: p.color + "12", color: p.color + "70", border: `1px solid ${p.color}20` }}>
              {p.initial}
            </div>
            <span className="text-[9px]" style={{ color: p.color + "40" }}>{p.name}</span>
          </motion.div>
        );
      })}

      {/* Connected thoughts — lines from people to text */}
      {THOUGHTS.slice(0, 2).map((t, i) => {
        const person = PEOPLE.find((p) => p.name === t.by);
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <motion.div key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1.5 + i * 0.5 }}
            className="absolute"
            style={{ left: `calc(50% + ${side * 220}px)`, top: `calc(50% + ${(i - 0.5) * 60}px)` }}>
            <div className="px-3 py-2 rounded-xl text-[10px] max-w-[160px] backdrop-blur-sm"
              style={{ backgroundColor: (person?.color || "#fff") + "08", border: `1px solid ${(person?.color || "#fff")}12` }}>
              <span className="mr-1">{t.emoji}</span>
              <span className="text-text-secondary/50">{t.text}</span>
            </div>
          </motion.div>
        );
      })}

      {/* Navigation hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-text-ghost/25">
        Click any fragment to bring it to center
      </div>
    </motion.div>
  );
}
