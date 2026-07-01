"use client";

import { useState } from "react";
import type { CharacterMarkKind } from "@/types/campaign";
import type { MarkPlacedAnnotation, MarkPromptAnnotation } from "@/lib/manuscript-annotations";
import CharacterMarkEditor from "@/components/campaign/CharacterMarkEditor";
import NoteShell from "./NoteShell";

const KIND_GLYPH: Record<CharacterMarkKind, { glyph: string; className: string }> = {
  scar: { glyph: "†", className: "text-rose" },
  vow: { glyph: "✶", className: "text-amber" },
  debt: { glyph: "∞", className: "text-lavender" },
  memory: { glyph: "✦", className: "text-sage" },
};

/** "This leaves a mark?" — the margin invites the player to carry it. */
export function MarkPromptNote({
  annotation,
  onCreateMark,
  onDismiss,
}: {
  annotation: MarkPromptAnnotation;
  onCreateMark: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string; sourceTurnId?: string },
  ) => Promise<unknown>;
  onDismiss: (turnId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <NoteShell tone="amber" leader={false}>
        <CharacterMarkEditor
          defaultKind={annotation.defaultKind}
          preamble={annotation.preamble}
          onDismiss={() => {
            setOpen(false);
            onDismiss(annotation.turn.id);
          }}
          onSave={async ({ kind, text }) => {
            await onCreateMark(annotation.characterId, {
              kind,
              text,
              sourceTurnId: annotation.turn.id,
            });
            setOpen(false);
          }}
        />
      </NoteShell>
    );
  }

  return (
    <NoteShell tone="amber" rotate={-0.5}>
      <p className="hand-note text-base text-amber/90">{annotation.preamble}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hand-note cursor-pointer text-base underline decoration-amber/60 decoration-wavy underline-offset-4 transition-opacity hover:opacity-100"
        >
          mark this moment
        </button>
        <button
          type="button"
          onClick={() => onDismiss(annotation.turn.id)}
          className="hand-note cursor-pointer text-sm opacity-45 transition-opacity hover:opacity-80"
        >
          let it pass
        </button>
      </div>
    </NoteShell>
  );
}

/** A mark already carried — a small glyph pinned to the passage that caused it. */
export function MarkPlacedNote({ annotation }: { annotation: MarkPlacedAnnotation }) {
  const kind = KIND_GLYPH[annotation.mark.kind];
  return (
    <NoteShell rotate={0.7}>
      <p className="hand-note text-base text-paper/80">
        <span className={`mr-1.5 ${kind.className}`} aria-hidden="true">
          {kind.glyph}
        </span>
        <span className="italic">{annotation.mark.text}</span>
        <span className="ml-1 opacity-55">— {annotation.characterName}</span>
      </p>
    </NoteShell>
  );
}
