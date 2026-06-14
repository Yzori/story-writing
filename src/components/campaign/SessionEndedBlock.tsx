"use client";

import { useMemo, useState } from "react";
import type { PlayerCharacter, Turn } from "@/types/campaign";
import SessionHighlights from "./StoryHighlights";
import EpisodeCard from "./EpisodeCard";
import { buildEpisodeRecap } from "@/lib/campaign-recap";

interface SessionEndedBlockProps {
  sessionId: string;
  storyId?: string;
  isGM: boolean;
  storyTurns: Turn[];
  logTurns: Turn[];
  characters?: PlayerCharacter[];
  sessionTitle?: string;
  storyTitle?: string;
  epilogue?: string | null;
  cliffhanger?: string | null;
}

type CompileState = "idle" | "loading" | "done" | "error";

export default function SessionEndedBlock({
  sessionId,
  storyId,
  isGM,
  storyTurns,
  logTurns,
  characters = [],
  sessionTitle = "A Session",
  storyTitle = "Quiloria",
  epilogue = null,
  cliffhanger = null,
}: SessionEndedBlockProps) {
  const [compileState, setCompileState] = useState<CompileState>("idle");
  const [compiledChapterId, setCompiledChapterId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEpisodeCard, setShowEpisodeCard] = useState(false);

  const recap = useMemo(
    () =>
      buildEpisodeRecap({
        storyTurns,
        logTurns,
        characters,
        sessionId,
        sessionTitle,
        epilogue,
        cliffhanger,
      }),
    [storyTurns, logTurns, characters, sessionId, sessionTitle, epilogue, cliffhanger],
  );
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://quiloria.com";

  const handleCompile = async () => {
    if (!storyId) return;

    if (storyId.startsWith("demo")) {
      setCompileState("done");
      setCompiledChapterId("demo-chapter");
      return;
    }

    setCompileState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/compile`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Compilation failed");
      }
      const { data } = await res.json();
      setCompiledChapterId(data.chapterId);
      setCompileState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setCompileState("error");
    }
  };

  return (
    <>
      <SessionHighlights storyTurns={storyTurns} logTurns={logTurns} />
      <div className="w-full max-w-[650px] mt-4">
        <div className="text-center py-8 border border-border-subtle rounded-2xl bg-subtle/20">
          <p className="text-text-tertiary text-sm font-serif italic">This session has ended.</p>

          {/* The keepsake — everyone at the table can take the episode card home. */}
          {!recap.isEmpty && (
            <div className="mt-4">
              <button
                onClick={() => setShowEpisodeCard(true)}
                className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-amber transition-all hover:bg-amber/20 hover:shadow-[0_0_20px_rgba(200,150,60,0.4)] cursor-pointer"
              >
                <span>✦</span> Take the keepsake
              </button>
            </div>
          )}

          {isGM && compileState === "idle" && (
            <button
              onClick={handleCompile}
              className="mt-3 block mx-auto bg-amber/10 hover:bg-amber border border-amber/20 text-amber hover:text-black transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.5)] cursor-pointer"
            >
              Compile to Chapter
            </button>
          )}

          {compileState === "loading" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-amber/60">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs font-serif italic">Compiling session into prose...</span>
            </div>
          )}

          {compileState === "done" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sage text-sm font-serif italic">Chapter draft created!</p>
              {compiledChapterId && !compiledChapterId.startsWith("demo") && storyId && (
                <a
                  href={`/write/${storyId}`}
                  className="text-xs text-amber/60 hover:text-amber underline underline-offset-2 transition-colors"
                >
                  Open in editor
                </a>
              )}
              {compiledChapterId?.startsWith("demo") && (
                <p className="text-xs text-text-tertiary">(Demo mode - no chapter was actually created)</p>
              )}
            </div>
          )}

          {compileState === "error" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-rose text-sm font-serif italic">
                {errorMessage ?? "Failed to compile session"}
              </p>
              <button
                onClick={() => setCompileState("idle")}
                className="text-xs text-text-tertiary hover:text-text-secondary underline underline-offset-2 transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      <EpisodeCard
        open={showEpisodeCard}
        onClose={() => setShowEpisodeCard(false)}
        recap={recap}
        storyTitle={storyTitle}
        shareUrl={shareUrl}
      />
    </>
  );
}
