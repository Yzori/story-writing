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
      <p className="hand-note text-amber/90">
        A bargain for {meta.targetLabel}
      </p>
      <p className="mt-1 font-reading text-[13.5px] italic leading-snug">
        <span className="text-sage">{meta.gain}</span>
        <span className="text-text-ghost"> — for — </span>
        <span className="text-rose">{meta.price}</span>
      </p>
      {resolved ? (
        <p
          className={`hand-note mt-1 font-bold ${
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
            className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-rose"
          >
            Refuse
          </button>
        </div>
      ) : (
        <p className="table-murmur mt-1 !text-[11.5px]">the offer hangs unanswered…</p>
      )}
    </NoteShell>
  );
}
