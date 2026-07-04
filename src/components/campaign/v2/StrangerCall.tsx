"use client";

import { useState } from "react";

/**
 * The Director wakes the Stranger: one line for the moment, and two to four
 * deeds the house will choose between. Summoned from the quill by typing
 * "/". Same paper as the ballot that will print — the composer IS the
 * ballot, being written. Every deed is Director-framed (the veto starts
 * here: nothing reaches the house the Director didn't write).
 */

const MAX_DEEDS = 4;

export default function StrangerCall({
  name,
  onCommit,
  onCancel,
}: {
  /** The Stranger's name as the story knows it, set when the chair was left. */
  name: string;
  onCommit: (ballot: { prompt: string; deeds: string[] }) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [deeds, setDeeds] = useState<string[]>(["", ""]);

  const filledDeeds = deeds.map((d) => d.trim()).filter(Boolean);
  const ready = !!prompt.trim() && filledDeeds.length >= 2;

  const commit = () => {
    if (!ready) return;
    onCommit({ prompt: prompt.trim(), deeds: filledDeeds });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="rounded-md border px-5 py-4"
      style={{
        borderColor: "color-mix(in srgb, var(--ink-strange) 30%, transparent)",
        background: "color-mix(in srgb, var(--ink-strange) 6%, transparent)",
      }}
      onKeyDown={onKeyDown}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        {name} wakes — the audience chooses what it does
      </p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="the moment — one line…"
        autoFocus
        className="mt-3 block w-full bg-transparent font-reading text-[15px] italic outline-none placeholder:text-text-ghost"
        style={{ color: "var(--ink-strange)" }}
        aria-label="The moment the Stranger wakes into"
      />

      <div className="mt-3 space-y-1">
        {deeds.map((deed, i) => (
          <label key={i} className="flex items-baseline gap-2">
            <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-ghost">
              deed
            </span>
            <input
              value={deed}
              onChange={(e) =>
                setDeeds((prev) => prev.map((d, j) => (j === i ? e.target.value : d)))
              }
              placeholder={i === 0 ? "what it might do…" : "…or instead"}
              className="block w-full bg-transparent font-reading text-[14px] italic text-text-secondary outline-none placeholder:text-text-ghost"
              aria-label={`Deed ${i + 1}`}
            />
          </label>
        ))}
      </div>

      {deeds.length < MAX_DEEDS && (
        <button
          type="button"
          onClick={() => setDeeds((prev) => [...prev, ""])}
          className="table-action mt-2 cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
        >
          + another deed
        </button>
      )}

      <div className="mt-4 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
        >
          Never mind
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={!ready}
          className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
          title="Print the ballot for the audience (Ctrl+Enter)"
        >
          Put it to the audience
        </button>
      </div>
    </div>
  );
}
