"use client";

import { useMemo, useState } from "react";
import ManuscriptRoom from "@/components/campaign/manuscript/ManuscriptRoom";
import ManuscriptPage from "@/components/campaign/manuscript/ManuscriptPage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { isLogTurnType } from "@/lib/campaign-turns";
import type { Turn } from "@/types/campaign";
import {
  CHARACTERS,
  INITIAL_TURNS,
  OPENING_NARRATION,
  SESSION_ID,
  STORY_ID,
  VIEW_AS_OPTIONS,
  viewAsToUserId,
  type ViewAs,
} from "../fixtures";

/**
 * Manuscript harness — the blank-page rebuild grows here before the live
 * pages cut over. Fixture-only; the legacy demo at /demo-adventure keeps the
 * old shell until step 11 re-points it.
 */
export default function ManuscriptHarnessPage() {
  const [viewAs, setViewAs] = useState<ViewAs>("gm");
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const currentUserId = viewAsToUserId(viewAs);
  const isGM = viewAs === "gm";
  const spectator = viewAs === "spectator";

  const storyTurns = useMemo(() => turns.filter((t) => !isLogTurnType(t.type)), [turns]);
  const logTurns = useMemo(() => turns.filter((t) => isLogTurnType(t.type)), [turns]);

  const handleEditTurn = (turnId: string, newContent: string) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, content: newContent } : t)));
  };

  return (
    <ManuscriptRoom
      leaveHref="/demo-adventure"
      isDesktop={isDesktop}
      page={
        <ManuscriptPage
          sessionId={SESSION_ID}
          storyId={STORY_ID}
          storyTurns={storyTurns}
          logTurns={logTurns}
          characters={CHARACTERS}
          activePlayerId={null}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle="The Obsidian Crown"
          sessionStatus="active"
          sessionOpening={OPENING_NARRATION}
          storyTitle="The Shattered City"
          onEditTurn={handleEditTurn}
          spectatorMode={spectator}
          endOfPage={
            <p className="hand-note text-center text-base">
              {isGM ? "The quill waits for the Director." : "The pen is with the Director…"}
            </p>
          }
        />
      }
    >
      {/* Harness controls — not part of the design; dev-only role switch. */}
      <div className="absolute bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-black/70 px-2 py-1 backdrop-blur-md">
        {VIEW_AS_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setViewAs(option.key)}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] uppercase tracking-wider transition-colors ${
              viewAs === option.key ? "bg-amber/20 text-amber" : "text-text-tertiary hover:text-paper"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </ManuscriptRoom>
  );
}
