"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { useSpectatorSession } from "@/hooks/use-spectator-session";
import { useSpectatorPresence } from "@/hooks/use-spectator-presence";
import { useSpectatorFloorRound } from "@/hooks/use-spectator-floor-round";
import { useSpectatorReactions } from "@/hooks/use-spectator-reactions";
import { useSpectatorTips } from "@/hooks/use-spectator-tips";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import LiveBadge from "@/components/shared/LiveBadge";
import ReactionPicker from "@/components/campaign/spectator/ReactionPicker";
import FloatingReactions from "@/components/campaign/spectator/FloatingReactions";
import { isLogTurnType, isStoryTurnType } from "@/lib/campaign-turns";
import TipButton from "@/components/campaign/spectator/TipButton";
import TipModal from "@/components/campaign/spectator/TipModal";
import TipEntry from "@/components/campaign/spectator/TipEntry";
import AudiencePulsePanel from "@/components/campaign/spectator/AudiencePulsePanel";
import type { PlayerCharacter } from "@/types/campaign";

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

  const { spectatorCount: presenceCount, token } = useSpectatorPresence(storyId, sessionId);
  const { floorRound, sendPulse } = useSpectatorFloorRound(storyId, sessionId, token);

  // Use whichever count is fresher (presence heartbeat updates less frequently)
  const spectatorCount = Math.max(pollSpectatorCount, presenceCount);

  // Reactions & tips
  const { reactions, sendReaction } = useSpectatorReactions(storyId, sessionId, token);
  const { tips, balance, sendTip } = useSpectatorTips(storyId, sessionId);

  const [logCollapsed, setLogCollapsed] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  // Build recipient list from characters (unique users)
  const tipRecipients = useMemo(() => {
    const list: { id: string; name: string; role?: string }[] = [];
    const seen = new Set<string>();
    for (const c of characters) {
      if (c.userId && !seen.has(c.userId)) {
        seen.add(c.userId);
        list.push({
          id: c.userId,
          name: c.displayName || c.name || "Player",
          role: c.name,
        });
      }
    }
    return list;
  }, [characters]);

  // Split turns into story turns (prose) and log turns (ooc, rolls,
  // roll-requests). Use the shared classifiers so we match the play page:
  // previously "roll" leaked into both buckets and showed up twice.
  const storyTurns = useMemo(
    () => turns.filter((t) => isStoryTurnType(t.type)),
    [turns]
  );
  const logTurns = useMemo(
    () => turns.filter((t) => isLogTurnType(t.type)),
    [turns]
  );
  const canvasCharacters = useMemo<PlayerCharacter[]>(
    () => characters.map((character) => ({
      id: character.id,
      userId: character.userId ?? "",
      name: character.name,
      portrait: character.portrait,
      description: "",
      traits: "",
      stats: null,
      status: "active",
      user: {
        id: character.userId ?? "",
        displayName: character.displayName,
        avatarUrl: null,
      },
    })),
    [characters],
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

        <div className="flex items-center gap-2">
          <TipButton balance={balance} onClick={() => setShowTipModal(true)} />
          <LiveBadge spectatorCount={spectatorCount} />
        </div>
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
        <div className="flex-1 min-w-0 relative">
          <StoryCanvas
            sessionId={sessionId}
            storyId={storyId}
            storyTurns={storyTurns}
            characters={canvasCharacters}
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
            onEndSession={() => {}}
            onTurnExpired={() => {}}
            onRollSubmit={async () => {
              throw new Error("Spectators cannot roll");
            }}
            pendingRollRequest={null}
            myCharacterStatus={null}
            onLastWords={() => {}}
            spectatorMode
          />

          {/* Floating reactions overlay */}
          <FloatingReactions reactions={reactions} />

          <AudiencePulsePanel floorRound={floorRound} onPulse={sendPulse} />

          {/* Tips feed — bottom-left of canvas */}
          {tips.length > 0 && !floorRound && (
            <div className="absolute bottom-16 left-4 z-20 flex flex-col gap-1.5 max-w-xs pointer-events-none">
              <AnimatePresence>
                {tips.slice(-5).map((tip) => (
                  <TipEntry
                    key={tip.id}
                    fromDisplayName={tip.fromDisplayName}
                    amount={tip.amount}
                    message={tip.message}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Reaction picker — fixed bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <ReactionPicker onReact={sendReaction} />
      </div>

      {/* Tip modal */}
      {showTipModal && balance !== null && tipRecipients.length > 0 && (
        <TipModal
          recipients={tipRecipients}
          balance={balance}
          onSend={sendTip}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </div>
  );
}
