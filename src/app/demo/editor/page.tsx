"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Demo Data ──────────────────────────────────────────────

const DEMO_CHAPTERS = [
  { id: "1", title: "The Cartographer's Daughter", words: 3847, status: "published" as const, progress: 100, lastEdited: "2h ago" },
  { id: "2", title: "Maps of Nowhere", words: 2103, status: "published" as const, progress: 100, lastEdited: "1d ago" },
  { id: "3", title: "The Compass Rose", words: 1456, status: "draft" as const, progress: 65, lastEdited: "Just now" },
  { id: "4", title: "Terra Incognita", words: 0, status: "draft" as const, progress: 0, lastEdited: "" },
];

const DEMO_PARAGRAPHS = [
  `The old map room smelled of cedar and forgotten expeditions. Elara traced her finger along the coastline her father had drawn — every cove memorized, every reef annotated in his precise hand. She'd spent seventeen years in this room, and still the maps whispered secrets she couldn't quite hear.`,
  `"You're doing it again," said Kael from the doorway, arms crossed, the afternoon light catching the silver threads in his dark hair. He leaned against the frame the way he always did — as if the whole building might collapse without his particular brand of nonchalance holding it together.`,
  `Elara didn't look up. Her father's final map was spread across the table, weighted at the corners with river stones she'd collected as a child. The eastern edge was torn — deliberately, she now realized. Someone had removed the part that mattered most.`,
  `"There's a gap here," she said, more to herself than to Kael. "Between the Thornwall Mountains and the sea. He drew something there and then cut it away."`,
  `Kael crossed the room in three strides and bent over the map, close enough that she could smell woodsmoke and ink on his coat. He was quiet for a long moment — unusual for him — and when he finally spoke, his voice had lost its casual edge.`,
  `"That's not a gap, Elara. That's a door."`,
];

const BIBLE_CHARS = [
  { name: "Elara Voss", color: "#D4A574", role: "Protagonist", notes: "Cartographer's daughter, 23, auburn hair" },
  { name: "Kael Ashwick", color: "#8B9DC3", role: "Companion", notes: "Former navigator, sarcastic, loyal" },
  { name: "Harlan Voss", color: "#7CAE7A", role: "Missing", notes: "Elara's father, master cartographer" },
];

// ─── Annotation Tooltip ─────────────────────────────────────

function Annotation({
  label,
  number,
  side = "right",
  children,
}: {
  label: string;
  number: number;
  side?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {/* Numbered badge */}
      <div className={`absolute z-50 ${
        side === "right" ? "-right-3 -top-3" :
        side === "left" ? "-left-3 -top-3" :
        side === "top" ? "left-1/2 -translate-x-1/2 -top-4" :
        "left-1/2 -translate-x-1/2 -bottom-4"
      }`}>
        <div className="w-6 h-6 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center shadow-lg cursor-help ring-2 ring-rose/30 animate-pulse">
          {number}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className={`absolute z-[100] w-64 p-3 rounded-xl bg-[#1a1816] border border-amber/20 shadow-2xl shadow-black/50 ${
              side === "right" ? "left-full ml-5 top-0" :
              side === "left" ? "right-full mr-5 top-0" :
              side === "top" ? "bottom-full mb-5 left-1/2 -translate-x-1/2" :
              "top-full mt-5 left-1/2 -translate-x-1/2"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-rose text-white text-[9px] font-bold flex items-center justify-center mt-0.5">
                {number}
              </span>
              <div>
                <p className="text-[12px] text-amber font-semibold mb-1">NEW</p>
                <p className="text-[13px] text-[#f5f0e8] leading-relaxed">{label}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Focus Mode Paragraph ───────────────────────────────────

function FocusParagraph({
  text,
  isFocused,
  index,
}: {
  text: string;
  isFocused: boolean;
  index: number;
}) {
  return (
    <motion.p
      animate={{
        opacity: isFocused ? 1 : 0.25,
        filter: isFocused ? "blur(0px)" : "blur(0.5px)",
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-[#f5f0e8] leading-[1.9] text-[17px] mb-6 font-serif transition-colors"
      style={{ fontFamily: "'Literata', serif" }}
    >
      {text}
    </motion.p>
  );
}

// ─── Progress Ring ──────────────────────────────────────────

function ProgressRing({
  progress,
  size = 32,
  strokeWidth = 3,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "#7CAE7A" : "#D4A574"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      {isComplete && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#7CAE7A" strokeWidth="2" strokeLinecap="round">
            <path d="M3 7l3 3 5-5" />
          </svg>
        </motion.div>
      )}
    </div>
  );
}

// ─── Session Timer ──────────────────────────────────────────

function SessionTimer() {
  const [seconds, setSeconds] = useState(1847);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <button
      onClick={() => setRunning(!running)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
        running
          ? "text-sage bg-sage/[0.08]"
          : "text-text-ghost bg-white/[0.03]"
      }`}
      title={running ? "Pause timer" : "Resume timer"}
    >
      {running ? (
        <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
      ) : (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <polygon points="1,0 7,4 1,8" />
        </svg>
      )}
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </button>
  );
}

// ─── Main Demo Page ─────────────────────────────────────────

export default function EditorDemoPage() {
  const [focusedParagraph, setFocusedParagraph] = useState(2);
  const [focusModeOn, setFocusModeOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refPaneOpen, setRefPaneOpen] = useState(false);
  const [dailyWords, setDailyWords] = useState(1456);
  const [dailyGoal] = useState(2000);
  const [activeChapter] = useState("3");
  const [showPublishHint, setShowPublishHint] = useState(false);

  const progress = Math.min(100, Math.round((dailyWords / dailyGoal) * 100));

  // Simulate typing
  useEffect(() => {
    const timer = setInterval(() => {
      setDailyWords((w) => Math.min(dailyGoal, w + Math.floor(Math.random() * 3)));
    }, 4000);
    return () => clearInterval(timer);
  }, [dailyGoal]);

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f5f0e8] overflow-hidden">
      {/* ── Header Banner ──────────────────────────────────── */}
      <div className="bg-gradient-to-b from-rose/10 via-transparent to-transparent border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-rose/80 mb-1">Editor Mockup</p>
              <h1 className="text-lg font-semibold text-[#f5f0e8]" style={{ fontFamily: "'Fraunces', serif" }}>
                Proposed Improvements
              </h1>
              <p className="text-[13px] text-[#f5f0e8]/50 mt-1">
                Hover the numbered badges to see what each improvement does
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFocusModeOn(!focusModeOn)}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                  focusModeOn
                    ? "border-amber/30 bg-amber/[0.08] text-amber"
                    : "border-white/[0.06] text-[#f5f0e8]/40"
                }`}
              >
                Focus Mode {focusModeOn ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => setRefPaneOpen(!refPaneOpen)}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                  refPaneOpen
                    ? "border-lavender/30 bg-lavender/[0.08] text-lavender"
                    : "border-white/[0.06] text-[#f5f0e8]/40"
                }`}
              >
                Reference Pane
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Editor Layout ──────────────────────────────────── */}
      <div className="flex h-[calc(100vh-90px)] overflow-hidden">

        {/* ── Left Sidebar ──────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="shrink-0 border-r border-white/[0.04] bg-[#0f0e0d] flex flex-col overflow-hidden"
            >
              <div className="min-w-[280px] flex flex-col h-full">
                {/* Story header */}
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <h2 className="text-[14px] font-semibold text-[#f5f0e8]" style={{ fontFamily: "'Fraunces', serif" }}>
                    The Lost Cartography
                  </h2>
                  <p className="text-[10px] text-[#f5f0e8]/30 mt-1 uppercase tracking-[0.15em]">
                    4 chapters · 7,406 words
                  </p>
                </div>

                {/* ── Annotation 1: Chapter Cards ── */}
                <Annotation
                  number={1}
                  side="right"
                  label="Richer chapter cards: status badge (draft/published), word progress bar, last-edited timestamp. At a glance you see story health without opening each chapter."
                >
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                    {DEMO_CHAPTERS.map((ch) => {
                      const isActive = ch.id === activeChapter;
                      return (
                        <div
                          key={ch.id}
                          className={`relative rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                            isActive
                              ? "bg-amber/[0.08] border border-amber/20"
                              : "hover:bg-white/[0.02] border border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] truncate ${isActive ? "text-[#f5f0e8]" : "text-[#f5f0e8]/60"}`}>
                                {ch.title || "Untitled"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[#f5f0e8]/25 font-mono">
                                  {ch.words.toLocaleString()} w
                                </span>
                                {ch.lastEdited && (
                                  <>
                                    <span className="text-[#f5f0e8]/10">·</span>
                                    <span className="text-[10px] text-[#f5f0e8]/20">
                                      {ch.lastEdited}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Status badge */}
                            <span className={`shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              ch.status === "published"
                                ? "bg-sage/15 text-sage/70"
                                : "bg-white/[0.04] text-[#f5f0e8]/25"
                            }`}>
                              {ch.status === "published" ? "Live" : "Draft"}
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          {ch.progress > 0 && ch.progress < 100 && (
                            <div className="mt-2 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-amber/40 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${ch.progress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Annotation>

                {/* Bottom actions */}
                <div className="px-4 py-3 border-t border-white/[0.04] space-y-2">
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#f5f0e8]/40 hover:text-[#f5f0e8]/60 hover:bg-white/[0.02] transition-colors text-sm">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="7" y1="3" x2="7" y2="11" />
                      <line x1="3" y1="7" x2="11" y2="7" />
                    </svg>
                    New Chapter
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Main Editor Canvas ────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber/[0.03] rounded-full blur-[200px] pointer-events-none mix-blend-screen" />

          {/* ── Annotation 2: Sticky Chapter Header ── */}
          <Annotation
            number={2}
            side="bottom"
            label="Sticky chapter header that pins on scroll. Shows breadcrumb (Story > Chapter), quick-publish button, and reading time estimate. Never lose context of where you are."
          >
            <div className="shrink-0 px-8 py-4 border-b border-white/[0.03] bg-[#0d0c0b]/80 backdrop-blur-sm">
              <div className="max-w-[680px] mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-amber/50 uppercase tracking-[0.15em]">The Lost Cartography</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#f5f0e8]/15">
                    <path d="M3 2l4 3-4 3" />
                  </svg>
                  <span className="text-[10px] text-[#f5f0e8]/30 uppercase tracking-[0.15em]">Chapter 3</span>
                </div>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-semibold text-[#f5f0e8]" style={{ fontFamily: "'Fraunces', serif" }}>
                    The Compass Rose
                  </h1>
                  <div className="flex items-center gap-3">
                    {/* Reading time */}
                    <span className="text-[11px] text-[#f5f0e8]/20">~6 min read</span>
                    {/* Quick publish */}
                    <Annotation
                      number={3}
                      side="left"
                      label="Quick-publish button right in the header. One click to go from draft to live. No more hunting through settings panels."
                    >
                      <button
                        onClick={() => setShowPublishHint(!showPublishHint)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-sage/30 text-sage hover:bg-sage/10 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                        Publish
                      </button>
                    </Annotation>
                  </div>
                </div>
              </div>
            </div>
          </Annotation>

          {/* ── Editor Content ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto flex">
            <div className={`flex-1 px-8 py-12 ${refPaneOpen ? "" : ""}`}>
              <div className="max-w-[680px] mx-auto">
                {/* ── Annotation 4: Focus Mode ── */}
                <Annotation
                  number={4}
                  side="left"
                  label="Focus mode dims all paragraphs except the one you're writing. Click any paragraph to focus it. Reduces cognitive load by hiding context you don't need right now."
                >
                  <div>
                    {DEMO_PARAGRAPHS.map((text, i) => (
                      <div
                        key={i}
                        onClick={() => setFocusedParagraph(i)}
                        className="cursor-text"
                      >
                        <FocusParagraph
                          text={text}
                          isFocused={!focusModeOn || i === focusedParagraph}
                          index={i}
                        />
                      </div>
                    ))}
                  </div>
                </Annotation>

                {/* Fake cursor blink */}
                {focusModeOn && (
                  <div className="h-5 w-[2px] bg-amber animate-pulse ml-0 -mt-3" />
                )}
              </div>
            </div>

            {/* ── Annotation 5: Reference Pane ── */}
            <AnimatePresence>
              {refPaneOpen && (
                <Annotation
                  number={5}
                  side="left"
                  label="Split-pane reference view: pin your Characters & World entries, notes, or another chapter alongside the editor. Write with your world-building visible. No more switching between panels."
                >
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="shrink-0 border-l border-white/[0.04] bg-[#0f0e0d] overflow-hidden"
                  >
                    <div className="min-w-[320px] flex flex-col h-full">
                      {/* Tab bar */}
                      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/[0.04]">
                        <button className="px-2.5 py-1 rounded-md text-[11px] bg-amber/[0.08] text-amber border border-amber/20">
                          Characters
                        </button>
                        <button className="px-2.5 py-1 rounded-md text-[11px] text-[#f5f0e8]/30 hover:text-[#f5f0e8]/50 transition-colors">
                          Notes
                        </button>
                        <button className="px-2.5 py-1 rounded-md text-[11px] text-[#f5f0e8]/30 hover:text-[#f5f0e8]/50 transition-colors">
                          Ch. 2
                        </button>
                        <button
                          onClick={() => setRefPaneOpen(false)}
                          className="ml-auto p-1 rounded text-[#f5f0e8]/20 hover:text-[#f5f0e8]/50 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="4" y1="4" x2="10" y2="10" />
                            <line x1="10" y1="4" x2="4" y2="10" />
                          </svg>
                        </button>
                      </div>

                      {/* Character cards */}
                      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {BIBLE_CHARS.map((char) => (
                          <div
                            key={char.name}
                            className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: char.color }}
                              />
                              <span className="text-[13px] font-medium text-[#f5f0e8]">
                                {char.name}
                              </span>
                              <span className="text-[10px] text-[#f5f0e8]/25 ml-auto">
                                {char.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#f5f0e8]/35 leading-relaxed">
                              {char.notes}
                            </p>
                          </div>
                        ))}

                        <div className="pt-4 border-t border-white/[0.04]">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[#f5f0e8]/20 mb-2">
                            Quick Reference
                          </p>
                          <p className="text-[11px] text-[#f5f0e8]/30 leading-relaxed">
                            Pin any Characters & World entry, chapter, or note here
                            so it stays visible while you write. Drag to
                            reorder. Click a tab to switch context.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Annotation>
              )}
            </AnimatePresence>
          </div>

          {/* ── Annotation 6: Enhanced Status Bar ──────────── */}
          <Annotation
            number={6}
            side="top"
            label="Enhanced status bar: daily progress ring with visual goal tracking, session timer for focused writing sprints, and word velocity indicator. Writing should feel like a game you're winning."
          >
            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/[0.04] bg-[#0d0c0b]/90 backdrop-blur-sm">
              {/* Left: tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    sidebarOpen ? "text-amber bg-amber/[0.08]" : "text-[#f5f0e8]/25 hover:text-[#f5f0e8]/40"
                  }`}
                  title="Toggle chapters"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                    <line x1="6" y1="2" x2="6" y2="14" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg text-[#f5f0e8]/25 hover:text-[#f5f0e8]/40 transition-colors" title="Comments">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M3 3h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 2V4a1 1 0 011-1z" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg text-[#f5f0e8]/25 hover:text-[#f5f0e8]/40 transition-colors" title="Search">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <circle cx="7" cy="7" r="4" />
                    <path d="M10 10l3.5 3.5" />
                  </svg>
                </button>

                <div className="w-px h-5 bg-white/[0.06] mx-1" />

                {/* Session timer */}
                <SessionTimer />
              </div>

              {/* Center: progress ring + word counts */}
              <div className="flex items-center gap-4">
                <ProgressRing progress={progress} />
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-[11px] font-mono text-amber">
                      {dailyWords.toLocaleString()}
                      <span className="text-[#f5f0e8]/20"> / {dailyGoal.toLocaleString()}</span>
                    </p>
                    <p className="text-[9px] text-[#f5f0e8]/15 uppercase tracking-wider">Today</p>
                  </div>
                  <div className="w-px h-5 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-[11px] font-mono text-[#f5f0e8]/50">7,406</p>
                    <p className="text-[9px] text-[#f5f0e8]/15 uppercase tracking-wider">Total</p>
                  </div>
                </div>
              </div>

              {/* Right: save status + commands */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage" />
                  <span className="text-[11px] text-[#f5f0e8]/20">Saved</span>
                </div>
                <div className="w-px h-5 bg-white/[0.06]" />
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#f5f0e8]/30 hover:text-amber hover:bg-amber/[0.06] transition-all border border-white/[0.04]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <circle cx="7" cy="7" r="5" />
                    <path d="M7 5v4M5 7h4" />
                  </svg>
                  <span className="font-mono text-[10px] bg-white/[0.04] px-1 rounded">/</span>
                </button>
              </div>
            </div>
          </Annotation>
        </div>
      </div>

      {/* ── Improvement Summary ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0d0c0b] via-[#0d0c0b] to-transparent pt-16 pb-6 pointer-events-none z-[60]">
        <div className="max-w-4xl mx-auto px-6 pointer-events-auto">
          <div className="bg-[#141210] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[14px] font-semibold text-amber mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
              6 Proposed Improvements
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { n: 1, title: "Rich Chapter Cards", desc: "Status badges, progress bars, timestamps" },
                { n: 2, title: "Sticky Header", desc: "Breadcrumb, reading time, context" },
                { n: 3, title: "Quick Publish", desc: "One-click publish from header" },
                { n: 4, title: "Focus Mode", desc: "Paragraph dimming for flow state" },
                { n: 5, title: "Reference Pane", desc: "Pin bible/notes alongside editor" },
                { n: 6, title: "Progress Ring + Timer", desc: "Visual goals, session tracking" },
              ].map((item) => (
                <div key={item.n} className="flex items-start gap-2.5 p-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-rose text-white text-[9px] font-bold flex items-center justify-center mt-0.5">
                    {item.n}
                  </span>
                  <div>
                    <p className="text-[12px] text-[#f5f0e8] font-medium">{item.title}</p>
                    <p className="text-[11px] text-[#f5f0e8]/30">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
