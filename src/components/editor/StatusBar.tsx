"use client";

import { useRouter } from "next/navigation";
import { formatNumber, estimateReadingTime, WritingGoals } from "@/lib/store";
import { getTodaySession } from "@/lib/goals";
import ThemeToggle from "./ThemeToggle";

interface StatusBarProps {
  wordCount: number;
  chapterWordCount: number;
  chapterTitle: string;
  chapterIndex: number;
  totalChapters: number;
  isFocusMode: boolean;
  isZenMode: boolean;
  showComments: boolean;
  commentCount: number;
  goals: WritingGoals;
  onToggleFocus: () => void;
  onToggleZen: () => void;
  onToggleComments: () => void;
  onToggleSearch: () => void;
  onToggleGoals: () => void;
  onOpenCommand: () => void;
}

export default function StatusBar({
  wordCount,
  chapterWordCount,
  chapterTitle,
  chapterIndex,
  totalChapters,
  isFocusMode,
  isZenMode,
  showComments,
  commentCount,
  goals,
  onToggleFocus,
  onToggleZen,
  onToggleComments,
  onToggleSearch,
  onToggleGoals,
  onOpenCommand,
}: StatusBarProps) {
  const router = useRouter();

  const todaySession = getTodaySession(goals);
  const todayWords = todaySession?.wordsWritten ?? 0;
  const goalProgress = goals.dailyWordTarget > 0
    ? Math.min(100, Math.round((todayWords / goals.dailyWordTarget) * 100))
    : 0;

  return (
    <div className="flex items-center justify-between px-5 py-2 text-[11px] text-text-ghost border-t border-border bg-surface/50 shrink-0 select-none">
      {/* Left: location */}
      <div className="flex items-center gap-3">
        <span>
          Ch. {chapterIndex + 1} of {totalChapters}
        </span>
        <span className="text-text-ghost/40">·</span>
        <span className="truncate max-w-[180px]">{chapterTitle}</span>
      </div>

      {/* Center: word count + goals */}
      <div className="flex items-center gap-3">
        <span>{formatNumber(chapterWordCount)} words this chapter</span>
        <span className="text-text-ghost/40">·</span>
        <span>{formatNumber(wordCount)} total</span>
        <span className="text-text-ghost/40">·</span>
        <span>{estimateReadingTime(wordCount)} read</span>
        <span className="text-text-ghost/40">·</span>
        <button
          onClick={onToggleGoals}
          className="flex items-center gap-1.5 hover:text-text-secondary transition-colors"
          title="Writing goals"
        >
          <div className="w-12 h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                goalProgress >= 100 ? "bg-sage/70" : "bg-amber/50"
              }`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <span className="tabular-nums">{goalProgress}%</span>
        </button>
      </div>

      {/* Right: mode toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push("/read")}
          className="px-2 py-1 rounded transition-colors hover:text-text-secondary hover:bg-subtle/50 flex items-center gap-1.5"
          title="Preview as reader"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z" />
            <circle cx="6" cy="6" r="1.5" />
          </svg>
          Preview
        </button>
        <span className="text-text-ghost/30 mx-1">|</span>
        <button
          onClick={onToggleSearch}
          className="p-1.5 rounded transition-colors hover:text-text-secondary hover:bg-subtle/50"
          title="Search & Replace (Ctrl+Shift+H)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="5" cy="5" r="3.5" />
            <path d="M8 8l2.5 2.5" />
          </svg>
        </button>
        <button
          onClick={onToggleFocus}
          className={`px-2 py-1 rounded transition-colors ${
            isFocusMode
              ? "bg-amber/15 text-amber"
              : "hover:text-text-secondary hover:bg-subtle/50"
          }`}
          title="Focus Mode (Ctrl+Shift+F)"
        >
          Focus
        </button>
        <button
          onClick={onToggleZen}
          className={`px-2 py-1 rounded transition-colors ${
            isZenMode
              ? "bg-amber/15 text-amber"
              : "hover:text-text-secondary hover:bg-subtle/50"
          }`}
          title="Zen Mode (Ctrl+Shift+Z)"
        >
          Zen
        </button>
        <button
          onClick={onToggleComments}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
            showComments
              ? "bg-amber/15 text-amber"
              : "hover:text-text-secondary hover:bg-subtle/50"
          }`}
          title="Toggle Comments"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 3a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 10.5 3v4a1.5 1.5 0 0 1-1.5 1.5H5.5L3 10.5V8.5H3A1.5 1.5 0 0 1 1.5 7V3z" />
          </svg>
          {commentCount > 0 && (
            <span className="text-[9px]">{commentCount}</span>
          )}
        </button>
        <span className="text-text-ghost/30 mx-1">|</span>
        <ThemeToggle />
        <span className="text-text-ghost/30 mx-1">|</span>
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:text-text-secondary hover:bg-subtle/50 transition-colors"
          title="Command Palette (Ctrl+K)"
        >
          <kbd className="font-mono text-[10px]">Ctrl+K</kbd>
        </button>
      </div>
    </div>
  );
}
