"use client";

import type { PlayerCharacter } from "@/types/campaign";
import type { SpotlightBid } from "@/lib/campaign-play-derive";
import CastSeat, { type SeatTimer } from "./CastSeat";

interface CastRailProps {
  /** Rostered characters for this session (all statuses — gone seats dim). */
  characters: PlayerCharacter[];
  ownerId: string | null;
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  sessionStatus: string;
  /** GM may pass the pen (active session, no Crossroads in flight). */
  canPassSpotlight: boolean;
  onPassTurn: (userId: string) => void;
  spotlightQueue: SpotlightBid[];
  /** The live countdown for the penned seat — computed ONCE per client by
   *  the page's useTurnTimer and passed down (never call the hook here: a
   *  second mount would double-fire expiry on the GM client). */
  seatTimer: SeatTimer | null;
  showExtendButton?: boolean;
  onExtend?: () => void;
}

/**
 * The Table — every seat, who holds the pen, who's asking for it. Replaces
 * the old header seat row, the floating hand-raise queue, and InitiativeBar.
 */
export default function CastRail({
  characters,
  ownerId,
  activePlayerId,
  currentUserId,
  isGM,
  sessionStatus,
  canPassSpotlight,
  onPassTurn,
  spotlightQueue,
  seatTimer,
  showExtendButton = false,
  onExtend,
}: CastRailProps) {
  const isActive = sessionStatus === "active";
  const activeSeats = characters.filter((c) => c.status === "active");
  const goneSeats = characters.filter((c) => c.status !== "active");
  const isPlayerTurn =
    activePlayerId !== null && activeSeats.some((c) => c.userId === activePlayerId);
  const directorHolds = !activePlayerId || activePlayerId === ownerId;

  const raisedBy = new Set(spotlightQueue.map((q) => q.userId));

  return (
    <section aria-label="The table — whose turn it is">
      <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">
        The Table
      </p>

      <div className="space-y-1" role="group" aria-label="Seats">
        {/* The Director — a first-class seat */}
        <CastSeat
          name="The Director"
          glyph="✦"
          holdsPen={directorHolds && isActive}
          isYou={currentUserId === ownerId}
          canPass={canPassSpotlight && !directorHolds}
          onPass={ownerId ? () => onPassTurn(ownerId) : undefined}
        />

        {activeSeats.map((c) => {
          const holdsPen = isActive && activePlayerId === c.userId;
          return (
            <div key={c.id}>
              <CastSeat
                name={c.name}
                playerName={c.user?.displayName ?? null}
                portrait={c.portrait}
                holdsPen={holdsPen}
                isYou={currentUserId === c.userId}
                status={c.status}
                handRaised={raisedBy.has(c.userId)}
                canPass={canPassSpotlight && !holdsPen}
                onPass={() => onPassTurn(c.userId)}
                timer={holdsPen && isPlayerTurn ? seatTimer : null}
                showExtend={holdsPen && showExtendButton}
                onExtend={onExtend}
              />
              {/* GM: grant a raised hand right where the seat is */}
              {isGM && raisedBy.has(c.userId) && (
                <div className="mb-1 ml-[52px] mt-0.5">
                  <button
                    type="button"
                    onClick={() => onPassTurn(c.userId)}
                    disabled={!canPassSpotlight}
                    className="rounded-full border border-amber/40 bg-amber/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-40"
                    title={canPassSpotlight ? "Hand them the pen" : "Resolve the Crossroads first"}
                  >
                    ✋ Give the pen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {goneSeats.map((c) => (
          <CastSeat
            key={c.id}
            name={c.name}
            playerName={c.user?.displayName ?? null}
            portrait={c.portrait}
            holdsPen={false}
            isYou={currentUserId === c.userId}
            status={c.status}
            canPass={false}
          />
        ))}

        {activeSeats.length === 0 && (
          <p className="px-2 py-3 text-center font-serif text-[11px] italic text-text-ghost">
            No one has taken a seat yet.
          </p>
        )}
      </div>
    </section>
  );
}
