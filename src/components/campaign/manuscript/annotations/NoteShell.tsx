"use client";

import type { ReactNode } from "react";

/**
 * A note written into the manuscript's margin: faint ink-wash card, slight
 * rotation, and a thread leading back to the passage it annotates. Shared
 * shell for every annotation body — desktop gutter and mobile folds both
 * wrap their content in it (folds pass leader={false}).
 */
export default function NoteShell({
  children,
  leader = true,
  tone = "default",
  rotate = 0,
}: {
  children: ReactNode;
  leader?: boolean;
  tone?: "default" | "amber" | "rose";
  rotate?: number;
}) {
  const toneBorder =
    tone === "amber" ? "border-amber/25" : tone === "rose" ? "border-rose/25" : "border-border";
  return (
    <div
      className={`pointer-events-auto relative rounded-md border ${toneBorder} bg-elevated/30 px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.25)] backdrop-blur-[2px]`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {leader && <span className="note-leader -left-4 top-4 w-4" aria-hidden="true" />}
      {children}
    </div>
  );
}
