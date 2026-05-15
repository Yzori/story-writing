"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { WritingGoals } from "@/types/editor";
import { formatNumber } from "@/lib/format";
import { getTodaySession } from "@/client/goals";

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

// ── Progress Ring ───────────────────────────────────────────

function ProgressRing({
  progress,
  size = 28,
  strokeWidth = 2.5,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-paper/[0.06]"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={isComplete ? "text-emerald-500/70" : "text-amber"}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      {isComplete && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-500/70">
            <path d="M3 7l3 3 5-5" />
          </svg>
        </motion.div>
      )}
    </div>
  );
}

// ── Session Timer ───────────────────────────────────────────

function SessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, startTime]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${
        running
          ? "text-sage bg-sage/[0.08]"
          : "text-text-ghost bg-paper/[0.03]"
      }`}
      title={running ? "Pause session timer" : "Resume session timer"}
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

// ── Status Bar ──────────────────────────────────────────────

interface StatusBarProps {
  showOutline: boolean;
  chapterWordCount: number;
  totalWords: number;
  goals: WritingGoals;
  saveState?: SaveState;
  onToggleOutline: () => void;
  onOpenGrimoire: () => void;
  onToggleComments: () => void;
  onToggleSearch: () => void;
  onToggleGoals: () => void;
  onToggleBible: () => void;
  onToggleSettings: () => void;
  onToggleHistory: () => void;
  snapshotCount?: number;
}

function StatusBar({
  showOutline,
  chapterWordCount,
  totalWords,
  goals,
  saveState = "idle",
  onToggleOutline,
  onOpenGrimoire,
  onToggleComments,
  onToggleSearch,
  onToggleGoals,
  onToggleBible,
  onToggleSettings,
  onToggleHistory,
  snapshotCount = 0,
}: StatusBarProps) {
  const todaySession = getTodaySession(goals);
  const todayWords = todaySession?.wordsWritten ?? 0;
  const dailyTarget = goals.dailyWordTarget ?? 0;
  const progress = dailyTarget > 0 ? (todayWords / dailyTarget) * 100 : 0;
  const [toolsOpen, setToolsOpen] = useState(false);

  const runTool = useCallback((action: () => void) => {
    action();
    setToolsOpen(false);
  }, []);

  useEffect(() => {
    if (!toolsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setToolsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toolsOpen]);

  const toolItems = [
    {
      label: showOutline ? "Close chapter beats" : "Chapter beats",
      description: "Plan scenes for this chapter",
      onClick: onToggleOutline,
      active: showOutline,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      label: "Comments",
      description: "Review notes and threads",
      onClick: onToggleComments,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: "Search",
      description: "Find and replace text",
      onClick: onToggleSearch,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      label: "Goals",
      description: "Daily target and streaks",
      onClick: onToggleGoals,
      icon: (
        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
      ),
    },
    {
      label: "Story bible",
      description: "Characters, lore, and continuity",
      onClick: onToggleBible,
      icon: (
        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      label: "Version history",
      description: "Snapshots and recovery",
      onClick: onToggleHistory,
      badge: snapshotCount > 0 ? (snapshotCount > 9 ? "9+" : String(snapshotCount)) : undefined,
      icon: (
        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </svg>
      ),
    },
    {
      label: "Chapter settings",
      description: "Metadata, typography, and panels",
      onClick: onToggleSettings,
      icon: (
        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center lg:pl-[344px] xl:pr-[360px]"
    >
      <div className={`relative flex items-center gap-3 sm:gap-5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-paper/[0.03] border backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-body max-w-full overflow-visible ${
        saveState === "error" || saveState === "conflict" ? "border-amber/25" : "border-paper/5"
      }`}>

        {/* Left: Tools drawer */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setToolsOpen((open) => !open)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all ${
              toolsOpen
                ? "bg-paper/15 text-paper"
                : "text-text-tertiary hover:bg-subtle/50 hover:text-paper"
            }`}
            aria-label="Open writing tools"
            aria-expanded={toolsOpen}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline text-xs font-medium">Tools</span>
          </button>

          {toolsOpen && (
            <div className="absolute bottom-full left-0 mb-3 w-[280px] rounded-2xl border border-paper/10 bg-elevated/95 p-2 shadow-2xl backdrop-blur-2xl">
              <div className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Writing tools</p>
              </div>
              <div className="space-y-1">
                {toolItems.map((tool) => (
                  <button
                    key={tool.label}
                    onClick={() => runTool(tool.onClick)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      tool.active
                        ? "bg-paper/10 text-paper"
                        : "text-text-secondary hover:bg-paper/[0.06] hover:text-paper"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper/[0.06] text-text-tertiary">
                      {tool.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{tool.label}</span>
                      <span className="block truncate text-xs text-text-ghost">{tool.description}</span>
                    </span>
                    {tool.badge && (
                      <span className="rounded-full bg-amber/80 px-1.5 py-0.5 text-[10px] font-bold text-void">
                        {tool.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-border shrink-0" />

        {/* Center: Session timer + Progress ring + Word counts */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Session timer */}
          <SessionTimer />

          <div className="w-[1px] h-5 bg-border shrink-0 hidden sm:block" />

          {/* Progress ring + daily words */}
          <div className="flex items-center gap-2.5">
            {dailyTarget > 0 && <ProgressRing progress={progress} />}
            <div className="flex flex-col items-start shrink-0">
              <span className="text-[11px] font-mono text-amber leading-none">
                {formatNumber(todayWords)}
                {dailyTarget > 0 && (
                  <span className="text-text-ghost text-[10px]"> / {formatNumber(dailyTarget)}</span>
                )}
              </span>
              <span className="text-[8px] text-text-ghost uppercase tracking-wider mt-0.5">Today</span>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-border shrink-0 hidden sm:block" />

          <div className="flex-col items-start shrink-0 hidden sm:flex">
            <span className="text-[11px] font-mono text-paper/70 leading-none">{formatNumber(chapterWordCount)}</span>
            <span className="text-[8px] text-text-ghost uppercase tracking-wider mt-0.5">Chapter</span>
          </div>

          <div className="w-[1px] h-5 bg-border shrink-0 hidden md:block" />

          <div className="flex-col items-start shrink-0 hidden md:flex">
            <span className="text-[11px] font-mono text-paper/50 leading-none">{formatNumber(totalWords)}</span>
            <span className="text-[8px] text-text-ghost uppercase tracking-wider mt-0.5">Total</span>
          </div>

          {/* Save state */}
          <div className="w-[1px] h-5 bg-border shrink-0" />
          <span
            aria-live="polite"
            className={`text-[11px] shrink-0 ${
              saveState === "error" ? "text-rose" : saveState === "conflict" ? "text-amber" : "text-text-tertiary"
            }`}
          >
            {saveState === "idle" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                <span className="text-text-ghost">Saved</span>
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
            {saveState === "conflict" && (
              <span className="flex items-center gap-1.5 text-amber">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 1L15 14H1L8 1z" />
                  <path d="M8 6v4M8 12v.5" />
                </svg>
                Conflict — reload
              </span>
            )}
          </span>
        </div>

        <div className="w-[1px] h-5 bg-border shrink-0" />

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
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-subtle/50 text-text-tertiary ml-1 font-mono tracking-wider hidden sm:inline">/</span>
        </button>
      </div>

    </motion.div>
  );
}

export default React.memo(StatusBar);
