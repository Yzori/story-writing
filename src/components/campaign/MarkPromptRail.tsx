"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CharacterMarkKind, PlayerCharacter, Turn } from "@/types/campaign";
import {
  parseBargainMetadata,
  parseConsequenceMetadata,
  parseRollMetadata,
  parseStoryMomentMetadata,
} from "@/lib/campaign-turns";
import CharacterMarkEditor from "./CharacterMarkEditor";

interface PendingMoment {
  turn: Turn;
  characterId: string;
  defaultKind: CharacterMarkKind;
  preamble: string;
}

interface Props {
  turns: Turn[];
  myCharacter: PlayerCharacter | null;
  currentUserId: string | null;
  onCreateMark: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string; sourceTurnId?: string },
  ) => Promise<unknown>;
}

/**
 * Quiet rail that surfaces "mark this moment?" prompts for the current
 * player. Lives below the prose, above the composer — keeps the story
 * stream clean while still inviting the player to mark what hurt.
 *
 * Eligibility comes from server flags on roll + accepted-bargain turns.
 * Already-marked turns (sourceTurnId present in the character's marks) are
 * filtered out; locally dismissed turns are filtered out for this session.
 */
export default function MarkPromptRail({
  turns,
  myCharacter,
  currentUserId,
  onCreateMark,
}: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [openTurnId, setOpenTurnId] = useState<string | null>(null);

  const pendingMoments = useMemo<PendingMoment[]>(() => {
    if (!myCharacter || !currentUserId) return [];
    const alreadyMarked = new Set(
      (myCharacter.marks ?? [])
        .map((m) => m.sourceTurnId)
        .filter((id): id is string => !!id),
    );
    const moments: PendingMoment[] = [];

    for (const turn of turns) {
      if (alreadyMarked.has(turn.id) || dismissedIds.has(turn.id)) continue;

      if (turn.type === "roll" && turn.userId === currentUserId) {
        const meta = parseRollMetadata(turn.metadata);
        if (!meta?.markEligible) continue;
        const fatal = meta.fatal === true;
        moments.push({
          turn,
          characterId: myCharacter.id,
          defaultKind: fatal ? "scar" : meta.tier === "partial" ? "scar" : "scar",
          preamble: fatal
            ? "This one almost cost you."
            : meta.tier === "partial"
              ? "Something was spent."
              : "The world refused you.",
        });
        continue;
      }

      if (turn.type === "consequence") {
        const bargain = parseBargainMetadata(turn.metadata);
        if (bargain?.kind === "bargain") {
          if (
            bargain.status === "accepted" &&
            bargain.markEligible &&
            bargain.responseUserId === currentUserId
          ) {
            moments.push({
              turn,
              characterId: myCharacter.id,
              defaultKind: "debt",
              preamble: "You took the bargain.",
            });
          }
          continue;
        }
        // Plain GM consequence with "leaves a mark" flag — invites every
        // active player to mark their character.
        const cons = parseConsequenceMetadata(turn.metadata);
        if (cons?.markEligible) {
          moments.push({
            turn,
            characterId: myCharacter.id,
            defaultKind: "scar",
            preamble: "The Director says: this leaves a mark.",
          });
        }
        continue;
      }

      // GM story-moment flagged as "leaves a mark" — same broadcast as
      // consequence-leaves-a-mark; every active player gets the prompt.
      if (turn.type === "story-moment") {
        const sm = parseStoryMomentMetadata(turn.metadata);
        if (sm?.markEligible) {
          moments.push({
            turn,
            characterId: myCharacter.id,
            defaultKind: sm.mood === "death" ? "scar" : "memory",
            preamble: "A moment to carry.",
          });
        }
      }
    }
    // Most-recent prompts first — but cap to 3 to keep the rail quiet.
    return moments.slice(-3).reverse();
  }, [turns, myCharacter, currentUserId, dismissedIds]);

  if (pendingMoments.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[650px] space-y-2 px-4 pb-4 sm:px-0">
      <AnimatePresence initial={false}>
        {pendingMoments.map((moment) => {
          const isOpen = openTurnId === moment.turn.id;
          return (
            <motion.div
              key={moment.turn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              {!isOpen ? (
                <div className="flex items-center justify-between rounded-xl border border-amber/15 bg-elevated/40 px-4 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                  <p className="font-display text-[11px] uppercase tracking-[0.18em] text-amber/70">
                    <span className="mr-2 text-amber">·</span>
                    {moment.preamble} <span className="text-text-tertiary normal-case tracking-normal">— mark this moment?</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDismissedIds((prev) => new Set(prev).add(moment.turn.id))}
                      className="min-h-9 px-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary transition-colors hover:text-paper"
                      aria-label="Dismiss this prompt"
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenTurnId(moment.turn.id)}
                      className="min-h-9 rounded-full border border-amber/30 bg-amber/10 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber/20"
                    >
                      Mark
                    </button>
                  </div>
                </div>
              ) : (
                <CharacterMarkEditor
                  defaultKind={moment.defaultKind}
                  preamble={moment.preamble}
                  onDismiss={() => {
                    setOpenTurnId(null);
                    setDismissedIds((prev) => new Set(prev).add(moment.turn.id));
                  }}
                  onSave={async ({ kind, text }) => {
                    await onCreateMark(moment.characterId, {
                      kind,
                      text,
                      sourceTurnId: moment.turn.id,
                    });
                    setOpenTurnId(null);
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
