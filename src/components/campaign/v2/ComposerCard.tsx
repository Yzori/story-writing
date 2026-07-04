"use client";

import type { ReactNode } from "react";

/**
 * The shared paper every Director composer is written on — a roll, a vote,
 * the Stranger's ballot. One layout, one key model (Ctrl+Enter commits,
 * Esc closes) printed once at the foot, one cancel verb, so learning one
 * move is learning them all. Gold paper for the table's moves; the
 * Stranger's is silver, same shape.
 */
export default function ComposerCard({
  whisper,
  silver = false,
  ready,
  commitLabel,
  commitTitle,
  onCommit,
  onCancel,
  children,
}: {
  /** The header line — what this move is, in the page's whisper. */
  whisper: string;
  silver?: boolean;
  ready: boolean;
  commitLabel: string;
  commitTitle?: string;
  onCommit: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={
        silver
          ? "rounded-md border px-5 py-4"
          : "rounded-md border border-amber/25 bg-amber/[0.05] px-5 py-4"
      }
      style={
        silver
          ? {
              borderColor: "color-mix(in srgb, var(--ink-strange) 30%, transparent)",
              background: "color-mix(in srgb, var(--ink-strange) 6%, transparent)",
            }
          : undefined
      }
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (ready) onCommit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        {whisper}
      </p>

      {children}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-text-ghost">
          Ctrl+Enter adds it · Esc closes
        </span>
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Never mind
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={!ready}
            className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            title={commitTitle}
          >
            {commitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
