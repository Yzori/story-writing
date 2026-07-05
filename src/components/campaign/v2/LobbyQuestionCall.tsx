"use client";

import { useState } from "react";
import ComposerCard from "./ComposerCard";
import { QUESTION_DECK, nextDeckQuestion } from "./lobby";

/**
 * The Director leaves one question on the unlit page. Two ways the room can
 * answer it — in a line of their ink (warm-up: one answer may open the
 * story) or by leaning on options (temperature: never a vote, never prints).
 * One composer, two modes; same paper as every other Director move.
 */

const MAX_OPTIONS = 4;

export default function LobbyQuestionCall({
  onCommit,
  onCancel,
}: {
  onCommit: (question: {
    prompt: string;
    mode: "warmup" | "temperature";
    options?: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"warmup" | "temperature">("warmup");
  const [prompt, setPrompt] = useState(QUESTION_DECK[0]);
  const [options, setOptions] = useState<string[]>(["", ""]);

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const ready =
    !!prompt.trim() && (mode === "warmup" || filledOptions.length >= 2);

  const commit = () => {
    if (!ready) return;
    onCommit({
      prompt: prompt.trim(),
      mode,
      options: mode === "temperature" ? filledOptions : undefined,
    });
  };

  const modeChip = (value: "warmup" | "temperature", label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`table-action cursor-pointer rounded-full border px-3 py-1 transition-colors ${
        mode === value
          ? "border-amber/50 bg-amber/10 text-amber"
          : "border-border text-text-tertiary hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <ComposerCard
      whisper="a question for the cast — it waits on the unlit page"
      ready={ready}
      commitLabel="Leave the question"
      commitTitle="Leave it on the page for the cast (Ctrl+Enter)"
      onCommit={commit}
      onCancel={onCancel}
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="one question…"
        autoFocus
        className="mt-3 block w-full bg-transparent font-reading text-[15px] italic text-amber/90 outline-none placeholder:text-text-ghost"
        aria-label="The question"
      />
      {mode === "warmup" && (
        <button
          type="button"
          onClick={() => setPrompt(nextDeckQuestion(prompt))}
          className="table-action mt-1.5 cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
        >
          another question
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-ghost">
          answered
        </span>
        {modeChip("warmup", "in a line")}
        {modeChip("temperature", "by leaning")}
      </div>

      {mode === "warmup" ? (
        <p className="table-murmur mt-2">
          each player answers in a line of their ink — you can lift one to open the story
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-1">
            {options.map((option, i) => (
              <label key={i} className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-ghost">
                  lean
                </span>
                <input
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                  }
                  placeholder={i === 0 ? "one way tonight could go…" : "…or another"}
                  className="block w-full bg-transparent font-reading text-[14px] italic text-text-secondary outline-none placeholder:text-text-ghost"
                  aria-label={`Option ${i + 1}`}
                />
              </label>
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, ""])}
              className="table-action mt-2 cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
            >
              + another option
            </button>
          )}
          <p className="table-murmur mt-2">
            a temperature, not a vote — it informs you and decides nothing
          </p>
        </>
      )}
    </ComposerCard>
  );
}
