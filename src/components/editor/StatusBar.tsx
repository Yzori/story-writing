"use client";

import { motion } from "framer-motion";
import { formatNumber, WritingGoals } from "@/lib/store";
import { getTodaySession } from "@/lib/goals";

type SaveState = "idle" | "saving" | "saved" | "error";

interface StatusBarProps {
  isFocusMode: boolean;
  isAudioPlaying: boolean;
  showOutline: boolean;
  chapterWordCount: number;
  totalWords: number;
  goals: WritingGoals;
  saveState?: SaveState;
  onToggleFocus: () => void;
  onToggleAudio: () => void;
  onToggleOutline: () => void;
  onOpenGrimoire: () => void;
  onToggleComments: () => void;
  onToggleSearch: () => void;
}

export default function StatusBar({
  isFocusMode,
  isAudioPlaying,
  showOutline,
  chapterWordCount,
  totalWords,
  goals,
  saveState = "idle",
  onToggleFocus,
  onToggleAudio,
  onToggleOutline,
  onOpenGrimoire,
  onToggleComments,
  onToggleSearch,
}: StatusBarProps) {
  const todaySession = getTodaySession(goals);
  const todayWords = todaySession?.wordsWritten ?? 0;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center"
    >
      <div className="relative flex items-center gap-4 sm:gap-6 px-4 py-2 sm:px-8 sm:py-3 rounded-full bg-paper/[0.03] border border-paper/5 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-body max-w-full overflow-x-auto hide-scrollbar">

        {/* Left: Tool toggles */}
        <div className="flex items-center gap-2">
          {/* Ambient Soundscape */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-full transition-all ${
              isAudioPlaying
                ? "bg-amber/20 text-amber shadow-[0_0_15px_rgba(200,150,60,0.3)]"
                : "hover:bg-paper/10 text-paper/50 hover:text-paper"
            }`}
            title="Ambient Soundscape"
          >
            {isAudioPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            )}
          </button>

          {/* Focus Mode */}
          <button
            onClick={onToggleFocus}
            className={`p-2 rounded-full transition-all ${
              isFocusMode
                ? "bg-paper/20 text-paper"
                : "hover:bg-paper/10 text-paper/50 hover:text-paper"
            }`}
            title="Focus Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </button>

          {/* Chapter Outline */}
          <button
            onClick={onToggleOutline}
            className={`p-2 rounded-full transition-all hidden sm:block ${
              showOutline
                ? "bg-paper/20 text-paper"
                : "hover:bg-paper/10 text-paper/50 hover:text-paper"
            }`}
            title="Chapter Outline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>

          {/* Comments */}
          <button
            onClick={onToggleComments}
            className="p-2 rounded-full transition-all hover:bg-paper/10 text-paper/50 hover:text-paper hidden sm:block"
            title="Comments"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Search */}
          <button
            onClick={onToggleSearch}
            className="p-2 rounded-full transition-all hover:bg-paper/10 text-paper/50 hover:text-paper hidden sm:block"
            title="Search (Ctrl+Shift+H)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <div className="w-[1px] h-6 bg-paper/10 shrink-0" />

        {/* Center: Word stats */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center group cursor-default shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-paper/30">Session</span>
            <span className="text-sm font-medium text-amber">
              {formatNumber(todayWords)}
              {goals.dailyWordTarget > 0 && (
                <span className="text-paper/40 text-xs hidden sm:inline"> / {formatNumber(goals.dailyWordTarget)}</span>
              )}
            </span>
          </div>

          <div className="w-[1px] h-6 bg-paper/10 shrink-0 hidden sm:block" />

          <div className="flex-col items-center shrink-0 hidden sm:flex">
            <span className="text-[10px] uppercase tracking-widest text-paper/30">Total</span>
            <span className="text-sm font-medium text-paper/80">{formatNumber(totalWords)}</span>
          </div>

          {/* Save state indicator */}
          {saveState !== "idle" && (
            <>
              <div className="w-[1px] h-6 bg-paper/10 shrink-0" />
              <span className={`text-[11px] shrink-0 ${
                saveState === "error" ? "text-rose" : "text-paper/40"
              }`}>
                {saveState === "saving" && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full border border-paper/40 border-t-transparent animate-spin" />
                    Saving
                  </span>
                )}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Save failed"}
              </span>
            </>
          )}
        </div>

        <div className="w-[1px] h-6 bg-paper/10 shrink-0" />

        {/* Right: Grimoire button */}
        <button
          onClick={onOpenGrimoire}
          className="flex items-center gap-2 group hover:text-amber transition-colors shrink-0"
        >
          <div className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center border border-amber/20 group-hover:bg-amber group-hover:text-void transition-all shadow-[0_0_10px_rgba(200,150,60,0.2)] group-hover:shadow-[0_0_20px_rgba(200,150,60,0.6)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xs font-medium text-paper/50 group-hover:text-amber hidden sm:inline">Grimoire</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-paper/10 text-paper/40 ml-1 font-mono tracking-wider hidden sm:inline">/</span>
        </button>
      </div>

      {/* Audio Playing Indicator Glow */}
      {isAudioPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-12 bg-amber/20 blur-2xl rounded-full -z-10 mix-blend-screen animate-pulse" />
      )}
    </motion.div>
  );
}
