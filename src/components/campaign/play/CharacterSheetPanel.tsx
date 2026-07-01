"use client";

import { useState } from "react";
import type { CharacterMark, CharacterMarkKind, PlayerCharacter } from "@/types/campaign";
import { parseStats } from "@/types/campaign";
import CharacterMarkEditor from "@/components/campaign/CharacterMarkEditor";

const MARK_GLYPHS: Record<CharacterMarkKind, { glyph: string; cls: string; label: string }> = {
  scar: { glyph: "†", cls: "text-rose", label: "Scar" },
  vow: { glyph: "✶", cls: "text-amber", label: "Vow" },
  debt: { glyph: "∞", cls: "text-lavender", label: "Debt" },
  memory: { glyph: "✦", cls: "text-sage", label: "Memory" },
};

interface CharacterSheetPanelProps {
  myCharacter: PlayerCharacter | null;
  onCreateMark?: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string },
  ) => Promise<unknown>;
  onRemoveMark?: (characterId: string, markId: string) => Promise<void>;
}

/**
 * You — the player's own character, always at hand in the rail: the truth
 * they carry (aspect), what defines them (traits), and everything the story
 * has done to them (marks).
 */
export default function CharacterSheetPanel({
  myCharacter,
  onCreateMark,
  onRemoveMark,
}: CharacterSheetPanelProps) {
  const [addingMark, setAddingMark] = useState(false);

  if (!myCharacter) {
    return (
      <section aria-label="Your character">
        <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">You</p>
        <p className="px-2 py-3 text-center font-serif text-[11px] italic text-text-ghost">
          Join the campaign to see your character here.
        </p>
      </section>
    );
  }

  const stats = parseStats(myCharacter.stats);
  const gone = myCharacter.status === "dead" || myCharacter.status === "retired";
  const marks = myCharacter.marks ?? [];
  const canEdit = !gone;

  return (
    <section aria-label="Your character">
      <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">You</p>

      <div className={`rounded-xl border border-border bg-ink/50 p-3.5 ${gone ? "opacity-60" : ""}`}>
        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-rose/30 bg-rose/15 font-display text-[14px] text-rose">
            {myCharacter.portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myCharacter.portrait} alt="" className="h-full w-full object-cover" />
            ) : (
              myCharacter.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-paper">{myCharacter.name}</p>
            {myCharacter.traits && (
              <p className="truncate text-[10px] uppercase tracking-widest text-text-tertiary">
                {myCharacter.traits}
              </p>
            )}
          </div>
        </div>

        {gone && (
          <p className="mt-3 rounded-lg border border-border-subtle bg-gradient-to-r from-violet-500/10 to-rose/10 px-3 py-2 font-serif text-[11px] italic leading-relaxed text-text-secondary">
            {myCharacter.status === "dead"
              ? "Your character's story has ended. When the GM invites you, you can create a new character from the campaign hub."
              : "Your character has retired from this adventure."}
          </p>
        )}

        {/* The defining truth */}
        {stats?.aspect && (
          <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3.5 py-2.5">
            <p className="font-serif text-[12.5px] italic leading-relaxed text-violet-300">
              &ldquo;{stats.aspect}&rdquo;
            </p>
            <p className="mt-1.5 text-[8.5px] uppercase tracking-widest text-violet-400/40">
              Your truth — spends once a scene to save a miss
            </p>
          </div>
        )}

        {/* About */}
        {myCharacter.description && (
          <p className="mt-3 font-serif text-[11px] leading-relaxed text-text-secondary line-clamp-4">
            {myCharacter.description}
          </p>
        )}

        {/* Marks — what the story has done to you */}
        <div className="mt-3 border-t border-border-subtle pt-2.5">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.16em] text-text-ghost">Marks</p>
          {marks.length === 0 && !canEdit && (
            <p className="font-serif text-[10px] italic text-text-ghost">Unmarked, so far.</p>
          )}
          {marks.length > 0 && (
            <ul className="space-y-1">
              {marks.map((m: CharacterMark) => {
                const g = MARK_GLYPHS[m.kind];
                return (
                  <li key={m.id} className="group/mark flex items-start gap-1.5 text-[10.5px] leading-snug">
                    <span aria-hidden className={`shrink-0 ${g.cls}`}>{g.glyph}</span>
                    <span className="font-serif italic text-text-secondary">{m.text}</span>
                    {canEdit && onRemoveMark && (
                      <button
                        type="button"
                        onClick={() => void onRemoveMark(myCharacter.id, m.id)}
                        aria-label={`Remove ${g.label}: ${m.text}`}
                        className="ml-auto shrink-0 text-text-ghost opacity-0 transition-opacity hover:text-rose group-hover/mark:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && onCreateMark && (
            addingMark ? (
              <CharacterMarkEditor
                preamble="A new mark"
                onDismiss={() => setAddingMark(false)}
                onSave={async ({ kind, text }) => {
                  await onCreateMark(myCharacter.id, { kind, text });
                  setAddingMark(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingMark(true)}
                className="mt-1 min-h-7 px-0.5 text-[9px] uppercase tracking-[0.14em] text-text-ghost transition-colors hover:text-amber"
              >
                + add a mark
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
