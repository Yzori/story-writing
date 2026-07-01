"use client";

import type { CharacterMarkKind, Turn } from "@/types/campaign";
import type { ManuscriptAnnotation } from "@/lib/manuscript-annotations";
import RollQuestionNote from "./RollQuestionNote";
import RollStampNote from "./RollStampNote";
import ClockNote from "./ClockNote";
import { MarkPlacedNote, MarkPromptNote } from "./MarkNote";
import BargainNote from "./BargainNote";
import EditNote from "./EditNote";

/** Everything the margin's notes can do — one bundle, passed once. */
export interface MarginActions {
  isGM: boolean;
  onOpenDiceRoller?: () => void;
  onUpdateRollRequest?: (turnId: string, status: "closed" | "cancelled") => void | Promise<unknown>;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
  onCreateMark?: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string; sourceTurnId?: string },
  ) => Promise<unknown>;
  onDismissMarkPrompt?: (turnId: string) => void;
  onToggleClockSegment?: (clockId: string, segmentIndex: number) => void;
  onEditClick?: (turn: Turn) => void;
}

/** One annotation → one note body. Shared by the rail and the folds. */
export default function AnnotationBody({
  annotation,
  actions,
}: {
  annotation: ManuscriptAnnotation;
  actions: MarginActions;
}) {
  switch (annotation.kind) {
    case "roll-question":
      return (
        <RollQuestionNote
          annotation={annotation}
          isGM={actions.isGM}
          onOpenDiceRoller={actions.onOpenDiceRoller}
          onUpdateRollRequest={actions.onUpdateRollRequest}
        />
      );
    case "roll-stamp":
      return <RollStampNote annotation={annotation} />;
    case "clock":
      return (
        <ClockNote
          annotation={annotation}
          isGM={actions.isGM}
          onToggleSegment={actions.onToggleClockSegment}
        />
      );
    case "mark-prompt":
      if (!actions.onCreateMark || !actions.onDismissMarkPrompt) return null;
      return (
        <MarkPromptNote
          annotation={annotation}
          onCreateMark={actions.onCreateMark}
          onDismiss={actions.onDismissMarkPrompt}
        />
      );
    case "mark-placed":
      return <MarkPlacedNote annotation={annotation} />;
    case "bargain":
      return <BargainNote annotation={annotation} onResolveBargain={actions.onResolveBargain} />;
    case "edit-window":
      if (!actions.onEditClick) return null;
      return <EditNote annotation={annotation} onEditClick={actions.onEditClick} />;
    default:
      return null;
  }
}
