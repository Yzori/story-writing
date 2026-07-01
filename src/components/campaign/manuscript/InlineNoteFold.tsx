"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ManuscriptAnnotation } from "@/lib/manuscript-annotations";
import AnnotationBody, { type MarginActions } from "./annotations/AnnotationBody";

function summarize(annotation: ManuscriptAnnotation): string {
  switch (annotation.kind) {
    case "roll-question":
      return `a ${annotation.meta.attribute} roll is called${annotation.meta.fatal ? " — fatal" : ""}`;
    case "roll-stamp":
      return `${annotation.turn.characterName ?? "the dice"} rolled — ${annotation.meta.tier ?? "?"}`;
    case "clock":
      return `${annotation.clock.name} · ${annotation.clock.filled}/${annotation.clock.segments}`;
    case "mark-prompt":
      return "mark this moment?";
    case "mark-placed":
      return `a mark — ${annotation.characterName}`;
    case "bargain":
      return annotation.meta.status === "open" ? "a bargain is offered" : "a bargain, answered";
    case "edit-window":
      return "still wet — edit";
    default:
      return "a note in the margin";
  }
}

/**
 * Mobile rendering of the margin: annotations tucked under their anchor
 * paragraph as folded slips — one hand-written summary line, tap to unfold.
 * Same derived data, same note bodies; no measurement code runs here.
 */
export default function InlineNoteFold({
  annotations,
  actions,
}: {
  annotations: ManuscriptAnnotation[];
  actions: MarginActions;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  if (annotations.length === 0) return null;

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="my-3 space-y-1.5 border-l-2 border-amber/15 pl-3">
      {annotations.map((annotation) => {
        const open = openIds.has(annotation.id);
        // Actionable notes unfold themselves — a called roll or an open
        // bargain should never hide behind a tap.
        const forceOpen =
          (annotation.kind === "roll-question" && annotation.isMine) ||
          (annotation.kind === "bargain" && annotation.canRespond) ||
          annotation.kind === "mark-prompt";
        return (
          <div key={annotation.id}>
            {!forceOpen && (
              <button
                type="button"
                onClick={() => toggle(annotation.id)}
                className="hand-note flex cursor-pointer items-center gap-1.5 text-base opacity-70 transition-opacity hover:opacity-100"
                aria-expanded={open}
              >
                <span
                  className={`inline-block text-xs transition-transform ${open ? "rotate-90" : ""}`}
                  aria-hidden="true"
                >
                  ▸
                </span>
                {summarize(annotation)}
              </button>
            )}
            <AnimatePresence initial={false}>
              {(open || forceOpen) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-1.5">
                    <AnnotationBody annotation={annotation} actions={actions} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
