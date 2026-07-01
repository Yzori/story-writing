"use client";

import type { EditWindowAnnotation } from "@/lib/manuscript-annotations";
import type { Turn } from "@/types/campaign";
import NoteShell from "./NoteShell";

/** The ink is still wet — a 30-second pencil beside your latest paragraph. */
export default function EditNote({
  annotation,
  onEditClick,
}: {
  annotation: EditWindowAnnotation;
  onEditClick: (turn: Turn) => void;
}) {
  return (
    <NoteShell rotate={0.5}>
      <button
        type="button"
        onClick={() => onEditClick(annotation.turn)}
        className="hand-note flex cursor-pointer items-center gap-1.5 text-base text-amber/80 transition-opacity hover:opacity-100"
        title="Edit this turn (30 second window)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        still wet — edit
      </button>
    </NoteShell>
  );
}
