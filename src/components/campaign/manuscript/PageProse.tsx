"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Turn } from "@/types/campaign";
import IllustrationTurn from "@/components/campaign/IllustrationTurn";
import SceneBreakRenderer from "@/components/campaign/SceneBreakRenderer";
import StoryMomentRenderer from "@/components/campaign/StoryMomentRenderer";
import TurnRenderer from "@/components/campaign/TurnRenderer";
import { isLegacyCinematicSceneBreak } from "@/lib/campaign-turns";

/**
 * The prose flow of the manuscript page. Every paragraph group and structural
 * beat carries data-turn-id (its first turn's id) — the anchor the margin
 * rail measures against and the mobile note-folds attach to.
 *
 * Pure rendering: pagination, scroll stickiness, and the editing hook live in
 * ManuscriptPage; the quill/waiting/fork end-of-page states live beside it.
 */
export interface ProseEditingState {
  editableTurn: Turn | null;
  editingTurnId: string | null;
  editContent: string;
  setEditContent: (value: string) => void;
  handleEditClick: (turn: Turn) => void;
  handleEditSave: () => void;
  handleEditCancel: () => void;
}

export default function PageProse({
  paragraphs,
  playerUserIds,
  currentUserId,
  isGM,
  onResolveBargain,
  marginActive = false,
  editing,
  showInkCaret,
  renderAfterParagraph,
}: {
  paragraphs: Turn[][];
  playerUserIds: string[];
  currentUserId: string | null;
  isGM: boolean;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
  /** When true the margin owns the affordances: bargain turns render as plain
   *  prose and the inline edit pencil yields to the margin's EditNote (the
   *  quick-edit box still opens here when the note is clicked). */
  marginActive?: boolean;
  editing?: ProseEditingState;
  /** Pulse a faint caret after the last paragraph (the page awaits more ink). */
  showInkCaret?: boolean;
  /** Mobile note-folds: annotations tucked under their anchor paragraph. */
  renderAfterParagraph?: (anchorTurnId: string) => ReactNode;
}) {
  return (
    <>
      {paragraphs.map((group, pi) => {
        const anchorId = group[0].id;

        // Structural beats — never merged, render as their own leaf.
        if (group[0].type === "scene-break") {
          const beat = isLegacyCinematicSceneBreak(group[0].type, group[0].metadata) ? (
            <StoryMomentRenderer turn={group[0]} />
          ) : (
            <SceneBreakRenderer turn={group[0]} />
          );
          return (
            <div key={anchorId} data-turn-id={anchorId}>
              {beat}
              {renderAfterParagraph?.(anchorId)}
            </div>
          );
        }

        if (group[0].type === "story-moment") {
          return (
            <div key={anchorId} data-turn-id={anchorId}>
              <StoryMomentRenderer turn={group[0]} />
              {renderAfterParagraph?.(anchorId)}
            </div>
          );
        }

        if (group[0].type === "illustration") {
          return (
            <div key={anchorId} data-turn-id={anchorId}>
              <IllustrationTurn turn={group[0]} />
              {renderAfterParagraph?.(anchorId)}
            </div>
          );
        }

        const editableTurn = editing?.editableTurn ?? null;
        const editingTurnId = editing?.editingTurnId ?? null;
        const groupHasEditable = !!editableTurn && group.some((t) => t.id === editableTurn.id);

        return (
          <div key={anchorId} data-turn-id={anchorId}>
            {/* role="paragraph" — keeps the screen-reader semantic of a
                paragraph while allowing nested <button>s (bargains, edit). */}
            <div role="paragraph" className="group/para relative">
              {group.map((turn, ti) => (
                <TurnRenderer
                  key={turn.id}
                  turn={turn}
                  idx={ti}
                  group={group}
                  playerUserIds={playerUserIds}
                  currentUserId={currentUserId}
                  isGM={isGM}
                  onResolveBargain={marginActive ? undefined : onResolveBargain}
                />
              ))}
              {pi === paragraphs.length - 1 && !groupHasEditable && showInkCaret && (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-5 w-1.5 animate-pulse bg-amber/40 align-middle"
                />
              )}
              {groupHasEditable && editing && !marginActive && editingTurnId !== editableTurn!.id && (
                <button
                  onClick={() => editing.handleEditClick(editableTurn!)}
                  className="ml-2 inline-flex cursor-pointer items-center gap-1 align-middle opacity-70 transition-opacity group-hover/para:opacity-100"
                  title="Edit (30s window)"
                  aria-label="Edit this turn (30 second window)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50" aria-hidden="true">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  <span className="hand-note text-sm text-amber/70">still wet — edit</span>
                </button>
              )}
            </div>

            {/* Inline quick-edit — the ink is still wet for 30 seconds. */}
            {editing && (
              <AnimatePresence>
                {editingTurnId && editableTurn && group.some((t) => t.id === editingTurnId) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 mt-2 rounded-xl border border-amber/20 bg-amber/5 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="hand-note text-sm text-amber/60">the ink is still wet</span>
                        <span className="text-[9px] text-text-ghost">Changes apply instantly</span>
                      </div>
                      <textarea
                        className="min-h-[60px] w-full resize-none bg-transparent font-serif text-[17px] leading-[1.9] text-paper/90 outline-none placeholder:text-text-ghost"
                        value={editing.editContent}
                        onChange={(e) => editing.setEditContent(e.target.value)}
                        autoFocus
                      />
                      <div className="mt-2 flex items-center justify-end gap-2 border-t border-amber/10 pt-2">
                        <button
                          onClick={editing.handleEditCancel}
                          className="cursor-pointer px-3 py-1 text-[10px] text-text-tertiary hover:text-text-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={editing.handleEditSave}
                          disabled={!editing.editContent.trim()}
                          className="cursor-pointer rounded-full border border-amber/20 bg-amber/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {renderAfterParagraph?.(anchorId)}
          </div>
        );
      })}
    </>
  );
}
