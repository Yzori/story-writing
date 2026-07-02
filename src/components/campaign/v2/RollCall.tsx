"use client";

import { useMemo, useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import { APPROACHES, getPlayerInk, type Approach } from "@/types/campaign";

/**
 * The Director fills in the slip that will print: who rolls, with what,
 * the ask, and both stakes. Summoned from the quill by typing "/". Same
 * paper as the printed slip — the composer IS the slip, being written.
 */
export default function RollCall({
  characters,
  allPlayerUserIds,
  onCommit,
  onCancel,
}: {
  characters: PlayerCharacter[];
  allPlayerUserIds: string[];
  onCommit: (meta: {
    targetUserId: string;
    attribute: Approach;
    reason: string;
    onSuccess: string | null;
    onFailure: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const active = useMemo(
    () => characters.filter((c) => c.status === "active"),
    [characters],
  );
  const [targetId, setTargetId] = useState<string | null>(null);
  const [approach, setApproach] = useState<Approach | null>(null);
  const [ask, setAsk] = useState("");
  const [holds, setHolds] = useState("");
  const [breaks, setBreaks] = useState("");

  const target = active.find((c) => c.userId === targetId) ?? null;
  const ready = !!targetId && !!approach && !!ask.trim();

  const commit = () => {
    if (!targetId || !approach || !ask.trim()) return;
    onCommit({
      targetUserId: targetId,
      attribute: approach,
      reason: ask.trim(),
      onSuccess: holds.trim() || null,
      onFailure: breaks.trim() || null,
    });
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

  const inputClass =
    "block w-full bg-transparent font-reading italic outline-none placeholder:text-text-ghost";

  return (
    <div
      className="rounded-md border border-amber/25 bg-amber/[0.05] px-5 py-4"
      onKeyDown={onKeyDown}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        a roll — the slip prints on the page when you ask
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
          who
        </span>
        {active.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTargetId(c.userId)}
            className={`cursor-pointer font-reading text-[15px] transition-all ${
              targetId === c.userId
                ? "underline decoration-2 underline-offset-4"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{ color: getPlayerInk(c.userId, allPlayerUserIds) }}
          >
            {c.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
          with
        </span>
        {APPROACHES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setApproach(a)}
            disabled={!target}
            className={`cursor-pointer font-display text-[14px] tracking-wide transition-colors disabled:cursor-default disabled:opacity-40 ${
              approach === a
                ? "text-amber underline decoration-2 underline-offset-4"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <input
        value={ask}
        onChange={(e) => setAsk(e.target.value)}
        placeholder="what's at stake — one line…"
        autoFocus
        className={`${inputClass} mt-3 text-[15px] text-paper/90`}
        aria-label="What's at stake"
      />

      <label className="mt-2 flex items-baseline gap-2">
        <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-sage">
          holds
        </span>
        <input
          value={holds}
          onChange={(e) => setHolds(e.target.value)}
          placeholder="what happens if it holds…"
          className={`${inputClass} text-[14px] text-text-secondary`}
          aria-label="What happens if the roll holds"
        />
      </label>

      <label className="mt-1 flex items-baseline gap-2">
        <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose">
          breaks
        </span>
        <input
          value={breaks}
          onChange={(e) => setBreaks(e.target.value)}
          placeholder="…and if it breaks"
          className={`${inputClass} text-[14px] text-text-secondary`}
          aria-label="What happens if the roll breaks"
        />
      </label>

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
          title="Print the slip (Ctrl+Enter)"
        >
          Ask for the roll
        </button>
      </div>
    </div>
  );
}
