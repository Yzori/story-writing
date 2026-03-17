"use client";

import { motion } from "framer-motion";
import { formatNumber, WritingGoals } from "@/lib/store";
import { getTodaySession } from "@/lib/goals";

type SaveState = "idle" | "saving" | "saved" | "error";

interface StatusBarProps {
  isAudioPlaying: boolean;
  showOutline: boolean;
  chapterWordCount: number;
  totalWords: number;
  goals: WritingGoals;
  saveState?: SaveState;
  onToggleAudio: () => void;
  onToggleOutline: () => void;
  onOpenGrimoire: () => void;
  onToggleComments: () => void;
  onToggleSearch: () => void;
  onToggleGoals: () => void;
  onToggleBible: () => void;
  onToggleSettings: () => void;
}

export default function StatusBar({
  isAudioPlaying,
  showOutline,
  chapterWordCount,
  totalWords,
  goals,
  saveState = "idle",
  onToggleAudio,
  onToggleOutline,
  onOpenGrimoire,
  onToggleComments,
  onToggleSearch,
  onToggleGoals,
  onToggleBible,
  onToggleSettings,
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
            aria-label={isAudioPlaying ? "Stop ambient soundscape" : "Play ambient soundscape"}
          >
            {isAudioPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            )}
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
            aria-label={showOutline ? "Hide chapter outline" : "Show chapter outline"}
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
            aria-label="Toggle comments panel"
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
            aria-label="Search and replace"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <div className="w-[1px] h-6 bg-paper/10 shrink-0 hidden sm:block" />

          {/* Writing Goals */}
          <button
            onClick={onToggleGoals}
            className="p-2 rounded-full transition-all hover:bg-paper/10 text-paper/50 hover:text-paper hidden sm:block"
            title="Writing Goals"
            aria-label="Writing goals"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
            </svg>
          </button>

          {/* Story Bible */}
          <button
            onClick={onToggleBible}
            className="p-2 rounded-full transition-all hover:bg-paper/10 text-paper/50 hover:text-paper hidden sm:block"
            title="Story Bible"
            aria-label="Open story bible"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </button>

          {/* Chapter Settings */}
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-full transition-all hover:bg-paper/10 text-paper/50 hover:text-paper hidden sm:block"
            title="Chapter Settings"
            aria-label="Open chapter settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          <div className="w-[1px] h-6 bg-paper/10 shrink-0" />
          <span
            aria-live="polite"
            className={`text-[11px] shrink-0 ${
              saveState === "error" ? "text-rose" : "text-paper/40"
            }`}
          >
            {saveState === "idle" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                <span className="text-paper/20">Saved</span>
              </span>
            )}
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full border border-paper/40 border-t-transparent animate-spin" />
                Saving
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                Saved
              </span>
            )}
            {saveState === "error" && "Save failed"}
          </span>
        </div>

        <div className="w-[1px] h-6 bg-paper/10 shrink-0" />

        {/* Right: Commands button */}
        <button
          onClick={onOpenGrimoire}
          className="flex items-center gap-2 group hover:text-amber transition-colors shrink-0"
          aria-label="Open command palette"
        >
          <div className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center border border-amber/20 group-hover:bg-amber group-hover:text-void transition-all shadow-[0_0_10px_rgba(200,150,60,0.2)] group-hover:shadow-[0_0_20px_rgba(200,150,60,0.6)]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-paper/50 group-hover:text-amber hidden sm:inline">Commands</span>
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
