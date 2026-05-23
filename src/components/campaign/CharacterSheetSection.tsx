"use client";

import { useState } from "react";
import type { CharacterMark, CharacterMarkKind, PlayerCharacter, SessionRosterEntry } from "@/types/campaign";
import { parseStats } from "@/types/campaign";
import CharacterMarkEditor from "./CharacterMarkEditor";

interface CharacterSheetSectionProps {
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onChangeCharacterStatus: (characterId: string, status: "active" | "retired" | "dead") => void;
  onInviteNewCharacter?: (userId: string) => void;
  roster?: SessionRosterEntry[];
  currentUserId?: string | null;
  isGM?: boolean;
  onCreateMark?: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string },
  ) => Promise<unknown>;
  onRemoveMark?: (characterId: string, markId: string) => Promise<void>;
}

const MARK_GLYPHS: Record<CharacterMarkKind, { glyph: string; cls: string; label: string }> = {
  scar: { glyph: "†", cls: "text-rose", label: "Scar" },
  vow: { glyph: "✶", cls: "text-amber", label: "Vow" },
  debt: { glyph: "∞", cls: "text-lavender", label: "Debt" },
  memory: { glyph: "✦", cls: "text-sage", label: "Memory" },
};

function MarksBlock({
  character,
  canEdit,
  onCreateMark,
  onRemoveMark,
}: {
  character: PlayerCharacter;
  canEdit: boolean;
  onCreateMark?: CharacterSheetSectionProps["onCreateMark"];
  onRemoveMark?: CharacterSheetSectionProps["onRemoveMark"];
}) {
  const [adding, setAdding] = useState(false);
  const marks = character.marks ?? [];
  if (marks.length === 0 && !canEdit) return null;

  return (
    <div className="mt-2 ml-4">
      {marks.length > 0 && (
        <ul className="space-y-1">
          {marks.map((m: CharacterMark) => {
            const g = MARK_GLYPHS[m.kind];
            return (
              <li key={m.id} className="group/mark flex items-start gap-1.5 text-[10px] leading-snug">
                <span aria-hidden="true" className={`shrink-0 ${g.cls}`}>{g.glyph}</span>
                <span className="font-serif italic text-text-secondary">{m.text}</span>
                {canEdit && onRemoveMark && (
                  <button
                    type="button"
                    onClick={() => onRemoveMark(character.id, m.id)}
                    aria-label={`Remove ${g.label}: ${m.text}`}
                    className="ml-auto shrink-0 opacity-0 group-hover/mark:opacity-100 transition-opacity text-text-ghost hover:text-rose"
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
        adding ? (
          <CharacterMarkEditor
            preamble="A new mark"
            onDismiss={() => setAdding(false)}
            onSave={async ({ kind, text }) => {
              await onCreateMark(character.id, { kind, text });
              setAdding(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-1.5 min-h-7 px-1 text-[9px] uppercase tracking-[0.14em] text-text-ghost transition-colors hover:text-amber"
          >
            + add a mark
          </button>
        )
      )}
    </div>
  );
}

export default function CharacterSheetSection({
  characters,
  activePlayerId,
  onChangeCharacterStatus,
  onInviteNewCharacter,
  roster = [],
  currentUserId = null,
  isGM = false,
  onCreateMark,
  onRemoveMark,
}: CharacterSheetSectionProps) {
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    characterId: string;
    characterName: string;
    status: "retired" | "dead";
  } | null>(null);

  // Build roster status map
  const rosterStatusMap = new Map<string, SessionRosterEntry["status"]>();
  roster.forEach((r) => rosterStatusMap.set(r.characterId, r.status));

  const hasRoster = roster.length > 0;
  const presentChars = hasRoster
    ? characters.filter((c) => {
        const rs = rosterStatusMap.get(c.id);
        return rs === "present" || rs === "introduced" || (!rs && c.status === "active");
      })
    : characters;
  const spectatingChars = hasRoster
    ? characters.filter((c) => rosterStatusMap.get(c.id) === "spectating")
    : [];

  const deadCharsNeedingInvite = characters.filter((c) => {
    if (c.status !== "dead") return false;
    const hasActiveChar = characters.some(
      (other) => other.userId === c.userId && other.id !== c.id && other.status === "active"
    );
    return !hasActiveChar;
  });

  return (
    <>
      <div className="space-y-4 mb-8">
        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary border-b border-border pb-2">Party Status</h3>
        {characters.length === 0 && (
          <p className="text-[11px] text-text-ghost italic font-serif">No players have joined yet.</p>
        )}
        {presentChars.map((c) => {
          const stats = parseStats(c.stats);
          const isDead = c.status === "dead";
          const isRetired = c.status === "retired";
          const isInactive = isDead || isRetired;
          const isActivePlayer = c.userId === activePlayerId;
          const isExpanded = expandedStats.has(c.id);

          return (
            <div key={c.id} className={`bg-subtle/20 p-3 rounded-lg border transition-all relative overflow-hidden ${
              isInactive
                ? "opacity-40 border-border-subtle"
                : isActivePlayer
                  ? "border-amber/30 shadow-[0_0_15px_rgba(200,150,60,0.15),inset_0_1px_0_rgba(200,150,60,0.1)]"
                  : "border-border-subtle hover:border-border"
            }`}>
              {/* Active player glow accent */}
              {isActivePlayer && !isInactive && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber/5 to-transparent pointer-events-none animate-pulse" style={{ animationDuration: "3s" }} />
              )}

              {/* Character name + traits + aspect (narrative-first) */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full transition-all ${
                    isDead ? "bg-rose shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    : isRetired ? "bg-lavender/50"
                    : isActivePlayer ? "bg-amber shadow-[0_0_10px_rgba(200,150,60,0.6)] animate-pulse"
                    : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  }`} />
                  <span className={`text-xs ${isInactive ? "text-text-tertiary line-through" : isActivePlayer ? "text-amber/90 font-medium" : "text-text"}`}>{c.name}</span>
                  {isDead && <span className="text-[9px] text-rose/60 uppercase tracking-wider">Fallen</span>}
                  {isRetired && <span className="text-[9px] text-lavender/60 uppercase tracking-wider">Departed</span>}
                  {isActivePlayer && !isInactive && <span className="text-[9px] text-amber/50 uppercase tracking-wider">Writing</span>}
                </div>

                {/* Traits line */}
                {c.traits && !isInactive && (
                  <p className="text-[10px] text-text-tertiary ml-4 mt-0.5">{c.traits}</p>
                )}

                {/* Aspect */}
                {stats?.aspect && !isInactive && (
                  <p className="text-[10px] text-violet-300/60 font-serif italic ml-4 mt-1 leading-relaxed">&ldquo;{stats.aspect}&rdquo;</p>
                )}

                {/* Stats disclosure toggle */}
                {stats && !isInactive && (
                  <button
                    onClick={() => {
                      const next = new Set(expandedStats);
                      if (isExpanded) next.delete(c.id);
                      else next.add(c.id);
                      setExpandedStats(next);
                    }}
                    className="flex min-h-8 items-center gap-1 mt-1.5 ml-3 text-[9px] text-text-secondary hover:text-paper transition-colors cursor-pointer"
                  >
                    <svg
                      width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span className="uppercase tracking-wider">Approaches</span>
                  </button>
                )}

                {/* Expandable stats */}
                {isExpanded && stats && !isInactive && (
                  <div className="mt-2 ml-4 flex gap-3">
                    {Object.entries(stats.approaches).map(([key, val]) => (
                      <span key={key} className="text-[10px] text-text-tertiary">
                        <span className="text-text-ghost uppercase">{key}</span>{" "}
                        <span className={val > 0 ? "text-amber/60" : val < 0 ? "text-red-400/50" : "text-text-tertiary"}>
                          {val >= 0 ? `+${val}` : val}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Character marks — scars, vows, debts, memories. The
                  character literally accumulates from play. */}
              <MarksBlock
                character={c}
                canEdit={!isInactive && (isGM || c.userId === currentUserId)}
                onCreateMark={onCreateMark}
                onRemoveMark={onRemoveMark}
              />

              {/* GM character actions */}
              {!isInactive && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border-subtle relative">
                  <button
                    onClick={() => setConfirmAction({ characterId: c.id, characterName: c.name, status: "retired" })}
                    className="min-h-8 rounded-md px-1 text-[9px] text-lavender/80 hover:text-lavender uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    They Depart
                  </button>
                  <button
                    onClick={() => setConfirmAction({ characterId: c.id, characterName: c.name, status: "dead" })}
                    className="min-h-8 rounded-md px-1 text-[9px] text-rose/80 hover:text-rose uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Their Story Ends
                  </button>
                </div>
              )}
              {isInactive && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => onChangeCharacterStatus(c.id, "active")}
                    className="min-h-8 rounded-md px-1 text-[9px] text-sage/80 hover:text-sage uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Revive
                  </button>
                </div>
              )}

            </div>
          );
        })}

        {/* Spectating characters */}
        {spectatingChars.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <p className="text-[9px] uppercase tracking-widest text-text-ghost mb-2">Spectating</p>
            {spectatingChars.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 opacity-40">
                <span className="w-2 h-2 rounded-full bg-cyan-400/30" />
                <span className="text-[11px] text-text-secondary">{c.name}</span>
                <span className="text-[8px] text-cyan-400/40 uppercase tracking-wider ml-auto">Spectating</span>
              </div>
            ))}
          </div>
        )}

        {/* Invite New Character */}
        {deadCharsNeedingInvite.length > 0 && onInviteNewCharacter && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            {deadCharsNeedingInvite.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-rose/40" />
                  <span className="text-[11px] text-text-tertiary line-through truncate">{c.name}</span>
                  <span className="text-[8px] text-rose/40 uppercase tracking-wider">Fallen</span>
                </div>
                <button
                  onClick={() => onInviteNewCharacter(c.userId)}
                  className="shrink-0 text-[9px] uppercase tracking-wider font-bold text-amber bg-amber/10 hover:bg-amber/20 border border-amber/20 rounded-full px-2.5 py-1 cursor-pointer transition-colors"
                >
                  Invite New Character
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Retire/Kill */}
      {confirmAction && (
        <div className="mb-6 bg-black/60 border rounded-xl p-4 space-y-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          style={{
            borderColor: confirmAction.status === "dead" ? "rgba(244,63,94,0.3)" : "rgba(167,139,250,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={confirmAction.status === "dead" ? "text-rose" : "text-lavender"}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className={`text-[10px] uppercase tracking-widest font-bold ${
              confirmAction.status === "dead" ? "text-rose" : "text-lavender"
            }`}>
              {confirmAction.status === "dead" ? "Their Story Ends" : "They Depart"}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Are you sure you want to {confirmAction.status === "dead" ? "end the story of" : "write the departure of"}{" "}
            <span className="text-paper font-medium">{confirmAction.characterName}</span>?
            {confirmAction.status === "dead" && (
              <span className="text-rose/60"> This triggers a death cinematic.</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onChangeCharacterStatus(confirmAction.characterId, confirmAction.status);
                setConfirmAction(null);
              }}
              className={`flex-1 text-[10px] uppercase tracking-wider font-bold rounded py-1.5 cursor-pointer transition-colors ${
                confirmAction.status === "dead"
                  ? "bg-rose/20 hover:bg-rose/30 text-rose"
                  : "bg-lavender/20 hover:bg-lavender/30 text-lavender"
              }`}
            >
              {confirmAction.status === "dead" ? "Yes, End Their Story" : "Yes, Write Their Departure"}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 text-[10px] text-text-tertiary hover:text-paper cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
