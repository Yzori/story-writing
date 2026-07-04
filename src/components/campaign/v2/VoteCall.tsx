"use client";

import { useState } from "react";
import ComposerCard from "./ComposerCard";

/**
 * The Director writes the question that will be put to the table.
 * Summoned from the quill by "/". Same paper as the vote block that will
 * print — the composer IS the question, being written.
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
    <ComposerCard
      whisper="a vote — the table writes lines, votes, and the winner joins the story"
      ready={ready}
      commitLabel="Open the vote"
      commitTitle="Open the vote (Ctrl+Enter)"
      onCommit={commit}
      onCancel={onCancel}
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          // A single line — plain Enter commits too.
          if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="the question — one line…"
        autoFocus
        className="mt-3 block w-full bg-transparent font-reading text-[15px] italic text-paper/90 outline-none placeholder:text-text-ghost"
        aria-label="The question to put to a vote"
      />
    </ComposerCard>
  );
}
