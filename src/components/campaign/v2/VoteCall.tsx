"use client";

import { useState } from "react";

/**
 * The Director writes the question that will be put to the table.
 * Summoned from the quill by typing "/". Same paper as the vote block
 * that will print — the composer IS the question, being written.
 */
export default function VoteCall({
  onCommit,
  onCancel,
}: {
  onCommit: (prompt: string) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const ready = !!prompt.trim();

  const commit = () => {
    if (!ready) return;
    onCommit(prompt.trim());
  };

  return (
    <div
      className="rounded-md border border-amber/25 bg-amber/[0.05] px-5 py-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        a vote — the table writes lines, votes, and the winner joins the story
      </p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="the question — one line…"
        autoFocus
        className="mt-3 block w-full bg-transparent font-reading text-[15px] italic text-paper/90 outline-none placeholder:text-text-ghost"
        aria-label="The question to put to a vote"
      />

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
          title="Open the vote (Enter)"
        >
          Open the vote
        </button>
      </div>
    </div>
  );
}
