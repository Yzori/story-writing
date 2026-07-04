"use client";

import { useMemo, useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";
import ComposerCard from "./ComposerCard";

/**
 * The Director fills in the slip that will print: who rolls, the ask, and
 * both stakes. Summoned from the quill by "/". Same paper as the printed
 * slip — the composer IS the slip, being written.
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
  const [ask, setAsk] = useState("");
  const [holds, setHolds] = useState("");
  const [breaks, setBreaks] = useState("");

  const ready = !!targetId && !!ask.trim();

  const commit = () => {
    if (!targetId || !ask.trim()) return;
    onCommit({
      targetUserId: targetId,
      reason: ask.trim(),
      onSuccess: holds.trim() || null,
      onFailure: breaks.trim() || null,
    });
  };

  const inputClass =
    "block w-full bg-transparent font-reading italic outline-none placeholder:text-text-ghost";

  return (
    <ComposerCard
      whisper="a roll — the slip prints on the page when you ask"
      ready={ready}
      commitLabel="Ask for the roll"
      commitTitle="Print the slip (Ctrl+Enter)"
      onCommit={commit}
      onCancel={onCancel}
    >
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
    </ComposerCard>
  );
}
