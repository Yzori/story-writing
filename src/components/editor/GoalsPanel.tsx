"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WritingGoals } from "@/types/editor";
import {
  getTodaySession,
  calculateStreak,
  getLast7Days,
} from "@/client/goals";

interface GoalsPanelProps {
  goals: WritingGoals;
  onUpdate: (goals: WritingGoals) => void;
  onClose: () => void;
}

export default function GoalsPanel({ goals, onUpdate, onClose }: GoalsPanelProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(goals.dailyWordTarget));

  const todaySession = getTodaySession(goals);
  const todayWords = todaySession?.wordsWritten ?? 0;
  const progress = goals.dailyWordTarget > 0
    ? Math.min(100, (todayWords / goals.dailyWordTarget) * 100)
    : 0;
  const streak = calculateStreak(goals.sessions, goals.dailyWordTarget);
  const last7 = getLast7Days(goals);
  const maxWords = Math.max(...last7.map((d) => d.words), goals.dailyWordTarget, 1);

  const handleSaveTarget = () => {
    const val = parseInt(targetInput, 10);
    if (!isNaN(val) && val > 0) {
      onUpdate({ ...goals, dailyWordTarget: val });
    }
    setEditingTarget(false);
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-[320px] rounded-xl bg-elevated border border-border-active shadow-2xl shadow-black/40 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h4 className="text-[12px] font-medium text-paper">Writing Goals</h4>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Today's progress */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
              Today
            </span>
            <span className="text-[20px] font-display font-bold text-paper tabular-nums leading-none">
              {todayWords.toLocaleString()}
              <span className="text-[11px] text-text-ghost font-body font-normal ml-1">
                / {goals.dailyWordTarget.toLocaleString()}
              </span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                progress >= 100 ? "bg-sage" : "bg-amber"
              }`}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {progress >= 100 && (
            <p className="text-[11px] text-sage mt-1.5">
              Goal reached! Keep going.
            </p>
          )}
        </div>

        {/* Daily target */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
              Daily Target
            </span>
            {editingTarget ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTarget();
                    if (e.key === "Escape") setEditingTarget(false);
                  }}
                  onBlur={handleSaveTarget}
                  className="w-20 bg-surface border border-border rounded-md px-2 py-1 text-[12px] text-text outline-none focus:border-amber/30 transition-colors text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[11px] text-text-ghost">words</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTargetInput(String(goals.dailyWordTarget));
                  setEditingTarget(true);
                }}
                className="text-[12px] text-text-secondary hover:text-amber transition-colors tabular-nums"
              >
                {goals.dailyWordTarget.toLocaleString()} words
              </button>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
            Streak
          </span>
          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="text-amber text-[13px]">
                {streak === 1 ? "1 day" : `${streak} days`}
              </span>
            )}
            {streak === 0 && (
              <span className="text-[12px] text-text-ghost">
                Start writing to build a streak
              </span>
            )}
          </div>
        </div>

        {/* Last 7 days chart */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost block mb-2">
            Last 7 Days
          </span>
          <div className="flex items-end gap-1.5 h-16">
            {last7.map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex items-end justify-center h-10">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      day.met ? "bg-sage/60" : day.words > 0 ? "bg-amber/40" : "bg-subtle"
                    }`}
                    style={{
                      height: `${Math.max(2, (day.words / maxWords) * 40)}px`,
                    }}
                    title={`${day.words.toLocaleString()} words`}
                  />
                </div>
                <span className="text-[9px] text-text-ghost">
                  {dayLabels[new Date(day.date + "T12:00:00").getDay()]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
