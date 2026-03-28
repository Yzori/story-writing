"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { useSpectatorSession } from "@/hooks/use-spectator-session";
import { useSpectatorPresence } from "@/hooks/use-spectator-presence";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import LiveBadge from "@/components/shared/LiveBadge";

export default function WatchSessionPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;

  const {
    loading,
    error,
    campaignSession,
    turns,
    characters,
    spectatorCount: pollSpectatorCount,
    storyTitle,
  } = useSpectatorSession(storyId, sessionId);

  const { spectatorCount: presenceCount } = useSpectatorPresence(storyId, sessionId);

  // Use whichever count is fresher (presence heartbeat updates less frequently)
  const spectatorCount = Math.max(pollSpectatorCount, presenceCount);

  const [logCollapsed, setLogCollapsed] = useState(false);

  // Split turns into story turns (prose) and log turns (ooc, rolls)
  const storyTurns = useMemo(
    () => turns.filter((t) => t.type !== "ooc" && t.type !== "roll-request"),
    [turns]
  );
  const logTurns = useMemo(
    () => turns.filter((t) => t.type === "ooc" || t.type === "roll" || t.type === "roll-request"),
    [turns]
  );

  const isSessionEnded = campaignSession?.status === "completed";

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-ghost text-sm font-serif italic">Joining the audience...</p>
        </motion.div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <p className="text-rose text-sm mb-4">{error}</p>
          <Link
            href={`/campaign/${storyId}`}
            className="text-amber text-sm hover:underline"
          >
            Back to campaign
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Session ended state ──────────────────────────────────────
  if (isSessionEnded) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-16 h-16 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-paper font-bold mb-3">
            This session has ended
          </h1>
          {campaignSession?.epilogue && (
            <p className="text-text-secondary text-sm font-serif italic leading-relaxed mb-6 max-w-sm mx-auto">
              &ldquo;{campaignSession.epilogue}&rdquo;
            </p>
          )}
          <Link
            href={`/campaign/${storyId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber/10 border border-amber/20 text-amber font-semibold text-sm rounded-full hover:bg-amber/15 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11L5 7l4-4" />
            </svg>
            Back to campaign
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Spectator view ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-void flex flex-col overflow-hidden">
      {/* Top bar — glass aesthetic */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 bg-void/80 backdrop-blur-xl border-b border-border/30 flex items-center justify-between px-5 shrink-0 z-30"
      >
        <Link
          href={`/campaign/${storyId}`}
          className="flex items-center gap-2 text-text-ghost hover:text-paper transition-colors group"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M9 11L5 7l4-4" />
          </svg>
          <span className="text-xs">Back</span>
        </Link>

        <div className="flex flex-col items-center">
          {storyTitle && (
            <span className="text-[9px] uppercase tracking-[0.15em] text-text-ghost">
              {storyTitle}
            </span>
          )}
          <span className="text-sm font-semibold text-paper">
            {campaignSession?.title ?? "Session"}
          </span>
        </div>

        <LiveBadge spectatorCount={spectatorCount} />
      </motion.header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session Log — read-only, no chat input */}
        <SessionLog
          turns={logTurns}
          currentUserId={null}
          sessionTitle={campaignSession?.title ?? ""}
          storyTitle={storyTitle ?? ""}
          onSendChat={() => {}}
          chatInput=""
          setChatInput={() => {}}
          isCollapsed={logCollapsed}
          onToggleCollapse={() => setLogCollapsed((prev) => !prev)}
          readOnly
        />

        {/* Story Canvas — spectator mode, no interactive controls */}
        <div className="flex-1 min-w-0">
          <StoryCanvas
            sessionId={sessionId}
            storyId={storyId}
            storyTurns={storyTurns}
            characters={characters as any}
            activePlayerId={campaignSession?.activePlayerId ?? null}
            currentUserId={null}
            isGM={false}
            sessionTitle={campaignSession?.title ?? ""}
            sessionStatus={campaignSession?.status ?? "active"}
            sessionOpening={campaignSession?.opening ?? null}
            showDiceRoller={false}
            onCloseDiceRoller={() => {}}
            onCommitDraft={() => {}}
            onPassTurn={() => {}}
            onOpenFloor={() => {}}
            onEndSession={() => {}}
            onTurnExpired={() => {}}
            onRollComplete={() => {}}
            pendingRollRequest={null}
            myCharacterStatus={null}
            onLastWords={() => {}}
            spectatorMode
          />
        </div>
      </div>
    </div>
  );
}
