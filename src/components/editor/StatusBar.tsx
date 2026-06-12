"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { WritingGoals } from "@/types/editor";
import { formatNumber } from "@/lib/format";
import { getTodaySession } from "@/client/goals";
import { useModChord } from "@/lib/keys";

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

// One quiet floor: time, progress, words, saved — and a single door (⌘K)
// to everything else. The old "Tools" drawer duplicated the command
// palette and the right-edge rooms; it's gone.
interface StatusBarProps {
  chapterWordCount: number;
  totalWords: number;
  goals: WritingGoals;
  saveState?: SaveState;
  onOpenGrimoire: () => void;
  /** Layout insets so the bar centers on the canvas, not the viewport. */
  insetClass?: string;
}

function StatusBar({
  chapterWordCount,
  totalWords,
  goals,
  saveState = "idle",
  onOpenGrimoire,
  insetClass = "",
}: StatusBarProps) {
  const commandChord = useModChord("K");
  const todaySession = getTodaySession(goals);
  const todayWords = todaySession?.wordsWritten ?? 0;
  const dailyTarget = goals.dailyWordTarget ?? 0;
  const progress = dailyTarget > 0 ? (todayWords / dailyTarget) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-2 sm:px-4 flex justify-center transition-[padding] duration-300 ${insetClass}`}
    >
      <div className={`relative flex max-w-[calc(100vw-1rem)] items-center gap-2 sm:gap-5 px-2.5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-paper/[0.03] border backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-body overflow-visible ${
        saveState === "error" || saveState === "conflict" ? "border-amber/25" : "border-paper/5"
      }`}>


        {/* Center: Session timer + Progress ring + Word counts */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {/* Session timer */}
          <SessionTimer />

          <div className="w-[1px] h-5 bg-border shrink-0 hidden sm:block" />

          {/* Progress ring + daily words */}
          <div className="hidden min-[420px]:flex items-center gap-2.5">
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
          <div className="w-[1px] h-5 bg-border shrink-0 hidden min-[420px]:block" />
          <span
            aria-live="polite"
            className={`text-[11px] shrink-0 max-w-[96px] sm:max-w-none truncate ${
              saveState === "error" ? "text-rose" : saveState === "conflict" ? "text-amber" : "text-text-tertiary"
            }`}
          >
            {saveState === "idle" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                <span className="text-text-ghost hidden min-[420px]:inline">Saved</span>
              </span>
            )}
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full border border-paper/40 border-t-transparent animate-spin" />
                <span className="hidden min-[420px]:inline">Saving</span>
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                <span className="hidden min-[420px]:inline">Saved</span>
              </span>
            )}
            {saveState === "error" && "Save failed"}
            {saveState === "conflict" && (
              <span className="flex items-center gap-1.5 text-amber">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 1L15 14H1L8 1z" />
                  <path d="M8 6v4M8 12v.5" />
                </svg>
                <span className="hidden min-[420px]:inline">Needs review</span>
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
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-subtle/50 text-text-tertiary ml-1 font-mono tracking-wider hidden sm:inline">{commandChord}</span>
        </button>
      </div>

    </motion.div>
  );
}

export default React.memo(StatusBar);
