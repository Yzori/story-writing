"use client";

import { useState } from "react";
import ProgressClock from "./ProgressClock";
import type { ProgressClockData } from "./ProgressClock";

interface StakesTrackerProps {
  clocks: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
}

export default function StakesTracker({ clocks, onClocksChange }: StakesTrackerProps) {
  const [showAddClockForm, setShowAddClockForm] = useState(false);
  const [newClockName, setNewClockName] = useState("");
  const [newClockSegments, setNewClockSegments] = useState<4 | 6 | 8>(4);
  const [newClockType, setNewClockType] = useState<"danger" | "progress" | "racing">("danger");

  const handleToggleClockSegment = (clockId: string, segmentIndex: number) => {
    if (!onClocksChange) return;
    const updated = clocks.map((c) => {
      if (c.id !== clockId) return c;
      const newFilled = segmentIndex < c.filled ? segmentIndex : segmentIndex + 1;
      return { ...c, filled: Math.min(newFilled, c.segments) };
    });
    onClocksChange(updated);
  };

  const handleAddClock = () => {
    if (!newClockName.trim() || !onClocksChange) return;
    const newClock: ProgressClockData = {
      id: `clock-${Date.now()}`,
      name: newClockName.trim(),
      segments: newClockSegments,
      filled: 0,
      type: newClockType,
    };
    onClocksChange([...clocks, newClock]);
    setNewClockName("");
    setNewClockSegments(4);
    setNewClockType("danger");
    setShowAddClockForm(false);
  };

  const handleDeleteClock = (clockId: string) => {
    if (!onClocksChange) return;
    onClocksChange(clocks.filter((c) => c.id !== clockId));
  };

  if (clocks.length === 0 && !onClocksChange) return null;

  return (
    <div className="space-y-4 mb-8">
      <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-rose/60 border-b border-rose/10 pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Tension Clocks
        </span>
        {onClocksChange && (
          <button
            onClick={() => setShowAddClockForm(!showAddClockForm)}
            className="w-5 h-5 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-subtle/50 transition-all cursor-pointer"
            title="Add clock"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </h3>

      {/* Add Clock Form */}
      {showAddClockForm && (
        <div className="bg-subtle/20 border border-border rounded-lg p-3 space-y-2">
          <input
            type="text"
            value={newClockName}
            onChange={(e) => setNewClockName(e.target.value)}
            placeholder="Clock name..."
            className="w-full bg-black/30 border border-border rounded-lg px-3 py-2 text-xs text-paper outline-none placeholder:text-text-ghost focus:border-border-active"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddClock();
              if (e.key === "Escape") setShowAddClockForm(false);
            }}
          />
          <div className="flex gap-1.5">
            <label className="text-[9px] uppercase text-text-tertiary tracking-wider self-center mr-1">Segments</label>
            {([4, 6, 8] as const).map((n) => (
              <button
                key={n}
                onClick={() => setNewClockSegments(n)}
                className={`px-2 py-1 text-[10px] rounded border transition-all cursor-pointer ${
                  newClockSegments === n
                    ? "bg-subtle/50 border-border-active text-paper"
                    : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <label className="text-[9px] uppercase text-text-tertiary tracking-wider self-center mr-1">Type</label>
            {(["danger", "progress", "racing"] as const).map((t) => {
              const typeColors: Record<string, string> = {
                danger: "bg-rose/20 border-rose/40 text-rose",
                progress: "bg-amber/20 border-amber/40 text-amber",
                racing: "bg-indigo-400/20 border-indigo-400/40 text-indigo-400",
              };
              return (
                <button
                  key={t}
                  onClick={() => setNewClockType(t)}
                  className={`px-2 py-1 text-[10px] rounded border transition-all cursor-pointer capitalize ${
                    newClockType === t
                      ? typeColors[t]
                      : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddClock}
              disabled={!newClockName.trim()}
              className="flex-1 bg-subtle/50 hover:bg-subtle/60 text-text text-[10px] uppercase tracking-wider font-bold rounded py-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              Add Clock
            </button>
            <button onClick={() => setShowAddClockForm(false)} className="px-3 text-[10px] text-text-tertiary hover:text-paper cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clock display */}
      {clocks.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center">
          {clocks.map((clock) => (
            <ProgressClock
              key={clock.id}
              clock={clock}
              size={60}
              interactive
              onToggleSegment={(idx) => handleToggleClockSegment(clock.id, idx)}
              onDelete={() => handleDeleteClock(clock.id)}
            />
          ))}
        </div>
      )}

      {clocks.length === 0 && !showAddClockForm && (
        <p className="text-[10px] text-text-ghost italic font-serif text-center">No tension clocks yet.</p>
      )}
    </div>
  );
}
