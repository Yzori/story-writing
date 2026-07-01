"use client";

import type { BargainAnnotation } from "@/lib/manuscript-annotations";
import NoteShell from "./NoteShell";

/**
 * The Director's bargain, offered in the margin: what is gained in emerald
 * ink, what it costs in ruby. The target answers with a pressed seal; the
 * answer stays stamped beside the passage forever.
 */
export default function BargainNote({
  annotation,
  onResolveBargain,
}: {
  annotation: BargainAnnotation;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
}) {
  const { meta, turn, canRespond } = annotation;
  const resolved = meta.status === "accepted" || meta.status === "refused";

  return (
    <NoteShell tone="amber" rotate={-1}>
      <p className="hand-note text-base text-amber/90">
        A bargain for {meta.targetLabel}
      </p>
      <p className="hand-note mt-0.5 text-base">
        <span className="text-sage">{meta.gain}</span>
        <span className="opacity-55"> — for — </span>
        <span className="text-rose">{meta.price}</span>
      </p>
      {resolved ? (
        <p
          className={`hand-note mt-1 text-base font-bold ${
            meta.status === "accepted" ? "text-sage" : "text-text-tertiary line-through"
          }`}
          style={{ transform: "rotate(-2deg)" }}
        >
          {meta.status === "accepted" ? "— taken" : "— refused"}
          {meta.responseLabel ? ` by ${meta.responseLabel}` : ""}
        </p>
      ) : canRespond && onResolveBargain ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onResolveBargain(turn.id, "accepted")}
            className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          >
            Take it
          </button>
          <button
            type="button"
            onClick={() => void onResolveBargain(turn.id, "refused")}
            className="hand-note cursor-pointer text-base opacity-60 transition-opacity hover:text-rose hover:opacity-100"
          >
            refuse
          </button>
        </div>
      ) : (
        <p className="hand-note mt-1 text-sm italic opacity-50">the offer hangs unanswered…</p>
      )}
    </NoteShell>
  );
}
