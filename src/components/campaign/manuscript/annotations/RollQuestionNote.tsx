"use client";

import type { RollQuestionAnnotation } from "@/lib/manuscript-annotations";
import NoteShell from "./NoteShell";

/**
 * An open roll request, written as a question in the Director's hand:
 * "Can she hold the door? — roll Bold." The target sees a cast seal; the
 * Director can withdraw the question.
 */
export default function RollQuestionNote({
  annotation,
  isGM,
  onOpenDiceRoller,
  onUpdateRollRequest,
}: {
  annotation: RollQuestionAnnotation;
  isGM: boolean;
  onOpenDiceRoller?: () => void;
  onUpdateRollRequest?: (turnId: string, status: "closed" | "cancelled") => void | Promise<unknown>;
}) {
  const { meta, turn, isMine } = annotation;
  return (
    <NoteShell tone={meta.fatal ? "rose" : "amber"} rotate={-0.6}>
      <p className="hand-note text-paper/85">
        <span className="italic">{meta.reason}</span>
        {" — roll "}
        <strong className="font-bold text-amber">{meta.attribute}</strong>
        {meta.fatal && (
          <strong className="ml-1 font-bold text-rose underline decoration-rose/60 decoration-wavy underline-offset-2">
            at fatal stakes
          </strong>
        )}
      </p>
      {(isMine || (isGM && onUpdateRollRequest)) && (
        <div className="mt-2 flex items-center gap-3">
          {isMine && onOpenDiceRoller && (
            <button
              type="button"
              onClick={onOpenDiceRoller}
              className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            >
              Cast the bones
            </button>
          )}
          {isGM && onUpdateRollRequest && (
            <>
              <button
                type="button"
                onClick={() => void onUpdateRollRequest(turn.id, "closed")}
                className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-paper"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void onUpdateRollRequest(turn.id, "cancelled")}
                className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-rose"
              >
                Withdraw
              </button>
            </>
          )}
        </div>
      )}
    </NoteShell>
  );
}
