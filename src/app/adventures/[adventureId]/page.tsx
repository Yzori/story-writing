"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useAdventureTable } from "@/hooks/use-adventure-table";
import AdvHeader from "@/components/adventures/AdvHeader";
import CastBar from "@/components/adventures/CastBar";
import CurtainCall from "@/components/adventures/CurtainCall";
import ThePage from "@/components/adventures/ThePage";
import Composer from "@/components/adventures/Composer";
import AsksPanel from "@/components/adventures/AsksPanel";
import SeatSetup from "@/components/adventures/SeatSetup";
import TableRules from "@/components/adventures/TableRules";
import DevCastPanel from "@/components/adventures/DevCastPanel";
import { useSession } from "next-auth/react";

/**
 * At the table — the Adventures play surface. One Director, 2–4
 * writers, a spotlight, and the page they're writing together.
 */
export default function AdventurePlayPage() {
  const params = useParams<{ adventureId: string }>();
  const adventureId = params.adventureId;
  const {
    state,
    passages,
    loading,
    live,
    error,
    actionError,
    noteTyping,
    sign,
    passSpotlight,
    releaseSpotlight,
    raiseHand,
    lowerHand,
    stepForward,
    openScene,
    closeScene,
    start,
    finish,
    setupSeat,
    mintInvite,
  } = useAdventureTable(adventureId);
  const { data: authSession } = useSession();
  const [invitePing, setInvitePing] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-void grid place-items-center">
        <p className="font-reading italic text-text-secondary">
          Finding your seat…
        </p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-void grid place-items-center px-6">
        <div className="text-center">
          <p className="font-display text-paper text-xl mb-2">
            This table isn&apos;t yours to sit at.
          </p>
          <p className="text-[13px] text-text-secondary mb-5">
            {error ?? "The adventure may have ended, or the invite went to someone else."}
          </p>
          <Link
            href="/adventures"
            className="text-[13px] text-gold hover:text-gold-light transition-colors"
          >
            Back to adventures
          </Link>
        </div>
      </div>
    );
  }

  const mySeat = state.seats.find((s) => s.id === state.mySeatId) ?? null;
  const hasOpenScene = state.scenes.some((s) => s.status === "open");
  const needsCharacter =
    mySeat?.role === "writer" && !mySeat.characterName.trim();
  const canReviewAsks =
    mySeat?.role === "director" ||
    state.adventure.ownerId === authSession?.user?.id;
  const casting = state.adventure.status === "casting";
  const tableOpen = casting || state.adventure.status === "running";
  const ended =
    state.adventure.status === "finished" ||
    state.adventure.status === "abandoned";
  const spotlightWriting =
    state.presence?.find((p) => p.seatId === state.adventure.spotlightSeatId)
      ?.writing ?? false;

  // Once the curtain falls, the ceremony speaks — the control strip retires.
  const composer = mySeat && !needsCharacter && !ended && (
    <Composer
      adventure={state.adventure}
      seats={state.seats}
      hands={state.hands}
      mySeat={mySeat}
      hasOpenScene={hasOpenScene}
      actionError={actionError}
      onSign={sign}
      onPassSpotlight={passSpotlight}
      onReleaseSpotlight={releaseSpotlight}
      onRaiseHand={raiseHand}
      onLowerHand={lowerHand}
      onStepForward={stepForward}
      onOpenScene={openScene}
      onCloseScene={closeScene}
      onStart={start}
      onFinish={finish}
      onMintInvite={mintInvite}
      onTyping={noteTyping}
      invitePing={invitePing}
    />
  );

  const thePage = (
    <ThePage
      adventure={state.adventure}
      seats={state.seats}
      scenes={state.scenes}
      passages={passages}
      mySeatId={state.mySeatId}
      spotlightWriting={spotlightWriting}
    />
  );

  const asksPanel = canReviewAsks && tableOpen && (
    <AsksPanel
      adventureId={adventureId}
      onResolved={() => {}}
      casting={casting}
      posted={state.adventure.boardVisibility === "board"}
    />
  );

  return (
    <div className="min-h-screen bg-void pb-24 [background-image:radial-gradient(1100px_520px_at_50%_-8%,var(--color-gold-glow),transparent_62%)]">
      <AdvHeader adventure={state.adventure} live={live} />
      <CastBar
        adventure={state.adventure}
        seats={state.seats}
        hands={state.hands}
        presence={state.presence}
        mySeatId={state.mySeatId}
        onOpenSeat={
          casting && mySeat ? () => setInvitePing((p) => p + 1) : undefined
        }
      />

      <div className="max-w-[860px] mx-auto mt-7 px-6">
        {casting ? (
          /* the lobby — filling the chairs is the whole job, so the
             controls and the asks sit above the waiting page */
          <>
            {needsCharacter && <SeatSetup onSetup={setupSeat} />}
            {composer}
            {asksPanel}
            <div className="mt-5">{thePage}</div>
          </>
        ) : (
          <>
            {ended && <CurtainCall adventureId={adventureId} />}
            {thePage}
            {needsCharacter && <SeatSetup onSetup={setupSeat} />}
            {composer}
            {asksPanel}
          </>
        )}

        <TableRules />
      </div>

      <DevCastPanel adventureId={adventureId} mySeatId={state.mySeatId} />
    </div>
  );
}
