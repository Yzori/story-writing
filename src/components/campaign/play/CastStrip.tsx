"use client";

import type { PlayerCharacter } from "@/types/campaign";
import type { SpotlightBid } from "@/lib/campaign-play-derive";
import CastSeat, { type SeatTimer } from "./CastSeat";

interface CastStripProps {
  characters: PlayerCharacter[];
  ownerId: string | null;
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  sessionStatus: string;
  canPassSpotlight: boolean;
  onPassTurn?: (userId: string) => void;
  spotlightQueue?: SpotlightBid[];
  /** From the page's single useTurnTimer — display only. */
  seatTimer?: SeatTimer | null;
  /** Opens the deck sheet (Cast segment) — the grip at the strip's edge. */
  onOpenSheet?: () => void;
  onOpenChat?: () => void;
  /** Watch page: render-only, no affordances. */
  readOnly?: boolean;
  /** Which edge the strip docks to — flips its hairline border. */
  edge?: "top" | "bottom";
}

/**
 * The table in one thumb-height strip — the mobile-first cast rail the play
 * page never had (audit item #9). Compact seats with pen glow + timer arc,
 * ✋ badges, GM tap-to-pass; the grip opens the full deck sheet.
 */
export default function CastStrip({
  characters,
  ownerId,
  activePlayerId,
  currentUserId,
  isGM,
  sessionStatus,
  canPassSpotlight,
  onPassTurn,
  spotlightQueue = [],
  seatTimer = null,
  onOpenSheet,
  onOpenChat,
  readOnly = false,
  edge = "bottom",
}: CastStripProps) {
  const isActive = sessionStatus === "active";
  const activeSeats = characters.filter((c) => c.status === "active");
  const isPlayerTurn =
    activePlayerId !== null && activeSeats.some((c) => c.userId === activePlayerId);
  const directorHolds = !activePlayerId || activePlayerId === ownerId;
  const raisedBy = new Set(spotlightQueue.map((q) => q.userId));

  return (
    <div className={`flex items-center gap-2 ${edge === "top" ? "border-b" : "border-t"} border-border bg-ink/70 px-3 py-1.5`}>
      <div
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]"
        role="group"
        aria-label="The table — whose turn it is"
      >
        <CastSeat
          variant="compact"
          name="The Director"
          glyph="✦"
          holdsPen={directorHolds && isActive}
          isYou={currentUserId === ownerId}
          canPass={!readOnly && canPassSpotlight && !directorHolds}
          onPass={ownerId && onPassTurn ? () => onPassTurn(ownerId) : undefined}
        />
        {characters.map((c) => {
          const holdsPen = isActive && activePlayerId === c.userId && c.status === "active";
          return (
            <CastSeat
              key={c.id}
              variant="compact"
              name={c.name}
              portrait={c.portrait}
              holdsPen={holdsPen}
              isYou={currentUserId === c.userId}
              status={c.status}
              handRaised={raisedBy.has(c.userId)}
              canPass={!readOnly && canPassSpotlight && !holdsPen && c.status === "active"}
              onPass={onPassTurn ? () => onPassTurn(c.userId) : undefined}
              timer={holdsPen && isPlayerTurn ? seatTimer : null}
            />
          );
        })}
      </div>

      {/* Hand-raise count — the GM's cue to open the cast sheet */}
      {isGM && spotlightQueue.length > 0 && (
        <button
          type="button"
          onClick={onOpenSheet}
          className="flex shrink-0 items-center gap-1 rounded-full border border-amber/40 bg-amber/15 px-2 py-1 text-[10px] font-bold text-amber"
          title={`${spotlightQueue.length} asking for the spotlight`}
        >
          ✋ {spotlightQueue.length}
        </button>
      )}

      {onOpenChat && (
        <button
          type="button"
          onClick={onOpenChat}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:text-amber"
          aria-label="Table talk"
          title="Table talk"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
          </svg>
        </button>
      )}

      {onOpenSheet && (
        <button
          type="button"
          onClick={onOpenSheet}
          className="flex h-8 w-8 shrink-0 flex-col items-center justify-center gap-[3px] rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:text-amber"
          aria-label="Open the table deck"
          title="The table — cast, character, clocks"
        >
          <span className="h-[2px] w-3.5 rounded-full bg-current" />
          <span className="h-[2px] w-3.5 rounded-full bg-current" />
        </button>
      )}
    </div>
  );
}
