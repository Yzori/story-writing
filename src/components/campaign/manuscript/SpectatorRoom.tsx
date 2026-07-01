"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSpectatorSession } from "@/hooks/use-spectator-session";
import { useSpectatorPresence } from "@/hooks/use-spectator-presence";
import { useSpectatorFloorRound } from "@/hooks/use-spectator-floor-round";
import { useSpectatorReactions } from "@/hooks/use-spectator-reactions";
import { useSpectatorTips } from "@/hooks/use-spectator-tips";
import { useMediaQuery } from "@/hooks/use-media-query";
import { isLogTurnType, isStoryTurnType } from "@/lib/campaign-turns";
import type { PlayerCharacter } from "@/types/campaign";
import ManuscriptRoom from "./ManuscriptRoom";
import ManuscriptPage from "./ManuscriptPage";
import TableSeats from "./TableSeats";
import TableTalkDrawer from "./TableTalkDrawer";
import LiveBadge from "@/components/shared/LiveBadge";
import ReactionPicker from "@/components/campaign/spectator/ReactionPicker";
import FloatingReactions from "@/components/campaign/spectator/FloatingReactions";
import ChorusPulsePanel from "@/components/campaign/spectator/ChorusPulsePanel";
import AudiencePulsePanel from "@/components/campaign/spectator/AudiencePulsePanel";
import TipButton from "@/components/campaign/spectator/TipButton";
import TipModal from "@/components/campaign/spectator/TipModal";
import TipEntry from "@/components/campaign/spectator/TipEntry";

/**
 * The table seen from outside the light. Spectators sit in the dark beyond
 * the candle's reach: the same manuscript, fully read-only, with the
 * audience's own voices — reactions, the chorus pulse, crossroads pulses,
 * tips — rippling at the edges. When the session ends, the page becomes the
 * keepsake instead of a bare "it's over" screen.
 */
export default function SpectatorRoom({
  storyId,
  sessionId,
}: {
  storyId: string;
  sessionId: string;
}) {
  const { loading, error, campaignSession, turns, characters, spectatorCount: pollCount, storyTitle } =
    useSpectatorSession(storyId, sessionId);
  const { spectatorCount: presenceCount, token } = useSpectatorPresence(storyId, sessionId);
  const { floorRound, sendPulse } = useSpectatorFloorRound(storyId, sessionId, token);
  const { reactions, sendReaction } = useSpectatorReactions(storyId, sessionId, token);
  const { tips, balance, sendTip } = useSpectatorTips(storyId, sessionId);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);

  const spectatorCount = Math.max(pollCount, presenceCount);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const tipRecipients = useMemo(() => {
    const list: { id: string; name: string; role?: string }[] = [];
    const seen = new Set<string>();
    for (const c of characters) {
      if (c.userId && !seen.has(c.userId)) {
        seen.add(c.userId);
        list.push({ id: c.userId, name: c.displayName || c.name || "Player", role: c.name });
      }
    }
    return list;
  }, [characters]);

  const storyTurns = useMemo(() => turns.filter((t) => isStoryTurnType(t.type)), [turns]);
  const logTurns = useMemo(() => turns.filter((t) => isLogTurnType(t.type)), [turns]);
  const seatCharacters = useMemo<PlayerCharacter[]>(
    () =>
      characters.map((character) => ({
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-amber/20 border-t-amber" />
          <p className="hand-note text-base">finding a place in the dark…</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="mb-4 text-sm text-rose">{error}</p>
          <Link href={`/campaign/${storyId}`} className="text-sm text-amber hover:underline">
            Back to campaign
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <ManuscriptRoom
      leaveHref={`/campaign/${storyId}`}
      isDesktop={isDesktop}
      seats={
        <TableSeats
          layout={isDesktop ? "rim" : "strip"}
          characters={seatCharacters}
          ownerId={null}
          activePlayerId={campaignSession?.activePlayerId ?? null}
          currentUserId={null}
          isGM={false}
          canPassSpotlight={false}
          onPassTurn={() => {}}
          spotlightQueue={[]}
          strip={!isDesktop ? { leaveHref: `/campaign/${storyId}` } : undefined}
        />
      }
      whispers={
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className="hand-note text-sm opacity-60">you sit beyond the light</span>
          <LiveBadge spectatorCount={spectatorCount} />
        </div>
      }
      page={
        <div className="relative h-full">
          {/* Deeper vignette — the page is lit, you are not. */}
          <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_180px_60px_rgba(3,5,10,0.55)]" />
          <ManuscriptPage
            sessionId={sessionId}
            storyId={storyId}
            storyTurns={storyTurns}
            logTurns={logTurns}
            characters={seatCharacters}
            activePlayerId={campaignSession?.activePlayerId ?? null}
            currentUserId={null}
            isGM={false}
            sessionTitle={campaignSession?.title ?? ""}
            sessionStatus={campaignSession?.status ?? "active"}
            sessionOpening={campaignSession?.opening ?? null}
            storyTitle={storyTitle ?? undefined}
            sessionEpilogue={campaignSession?.epilogue ?? null}
            spectatorMode
          />
        </div>
      }
    >
      {/* The audience's voices. */}
      <FloatingReactions reactions={reactions} />
      <ChorusPulsePanel reactions={reactions} />
      <AudiencePulsePanel floorRound={floorRound} onPulse={sendPulse} />

      <div className="fixed right-5 top-4 z-30">
        <TipButton balance={balance} onClick={() => setShowTipModal(true)} />
      </div>

      <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
        <ReactionPicker onReact={sendReaction} />
      </div>

      {tips.length > 0 && !floorRound && (
        <div className="pointer-events-none fixed bottom-16 left-4 z-20 flex max-w-xs flex-col gap-1.5">
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

      {/* Table talk, overheard — read-only. */}
      <button
        type="button"
        onClick={() => setShowChat(true)}
        className="hand-note fixed bottom-5 left-4 z-30 cursor-pointer text-base opacity-60 transition-opacity hover:opacity-100"
      >
        under the table ☾
      </button>
      <TableTalkDrawer
        open={showChat}
        onClose={() => setShowChat(false)}
        turns={logTurns}
        currentUserId={null}
        sessionTitle={campaignSession?.title ?? ""}
        storyTitle={storyTitle ?? ""}
        chatInput=""
        setChatInput={() => {}}
        onSendChat={() => {}}
        readOnly
      />

      {showTipModal && balance !== null && tipRecipients.length > 0 && (
        <TipModal
          recipients={tipRecipients}
          balance={balance}
          onSend={sendTip}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </ManuscriptRoom>
  );
}
