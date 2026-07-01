"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PlayerCharacter } from "@/types/campaign";
import type { SpotlightBid } from "@/lib/campaign-play-derive";
import { getPlayerInk } from "@/types/campaign";

/**
 * The table around the page. Seats are ink-ring presences — the Director at
 * the head, players below in their own inks. The pen is one physical object
 * (layoutId) that visibly travels when passed. Raised hands reach toward the
 * page with a persistent badge; dead seats are draped; the acting-GM slip
 * hangs from the Director's seat.
 *
 * One instance exists per client. `layout` gates PRESENTATION only:
 * "rim" = desktop left column, "strip" = mobile top bar.
 */

interface SeatModel {
  key: string;
  userId: string | null;
  name: string;
  playerName: string | null;
  portrait: string | null;
  ink: string;
  isDirector: boolean;
  holdsPen: boolean;
  isYou: boolean;
  gone: "dead" | "retired" | null;
  handRaisedAt: number | null; // queue position (0-based) or null
  isActingGm: boolean;
}

function ThePen({ instant }: { instant: boolean }) {
  return (
    <motion.span
      layoutId="the-pen"
      transition={instant ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 16 }}
      className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 text-amber drop-shadow-[0_0_6px_rgba(226,172,74,0.6)]"
      aria-label="The pen"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.7 3.3c-3.9-1-8.2.8-11.2 3.8-2.4 2.4-3.9 5.6-4.2 8.6L3 18l1.4 1.4 2.3-2.3c3-.3 6.2-1.8 8.6-4.2 3-3 4.8-7.3 3.8-11.2l-.4 1.6c-.8 3-2.4 5.8-4.6 8l-1.4-1.4 1.1 2.5c-1.9 1.5-4.1 2.5-6.3 2.8 .3-2.2 1.3-4.4 2.8-6.3l2.5 1.1-1.4-1.4c2.2-2.2 5-3.8 8-4.6l1.3-.7z" />
      </svg>
    </motion.span>
  );
}

function Seat({
  seat,
  size,
  canPass,
  onAskPass,
  reducedMotion,
  caption,
}: {
  seat: SeatModel;
  size: number;
  canPass: boolean;
  onAskPass?: () => void;
  reducedMotion: boolean;
  caption?: boolean;
}) {
  const ring = seat.isDirector ? "var(--ink-gm)" : seat.ink;
  const clickable = canPass && !seat.isDirector && !seat.gone;
  const body = (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        animate={
          seat.handRaisedAt !== null && !reducedMotion
            ? { x: [0, 4, 0] }
            : { x: 0 }
        }
        transition={
          seat.handRaisedAt !== null && !reducedMotion
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 bg-ink/80 font-display transition-shadow ${
          seat.gone === "dead" ? "grayscale" : ""
        }`}
        style={{
          borderColor: seat.gone ? "rgba(120,120,120,0.35)" : ring,
          opacity: seat.gone ? 0.45 : 1,
          boxShadow: seat.holdsPen
            ? `0 0 ${size / 3}px ${seat.isDirector ? "rgba(226,172,74,0.5)" : "rgba(226,172,74,0.35)"}`
            : "none",
          color: ring,
        }}
      >
        {seat.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seat.portrait} alt={seat.name} className="h-full w-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.42 }}>
            {seat.isDirector ? "✦" : seat.name.charAt(0)}
          </span>
        )}
      </motion.div>

      {seat.holdsPen && <ThePen instant={reducedMotion} />}

      {seat.gone === "dead" && (
        <span
          className="absolute inset-0 flex items-center justify-center text-rose/80"
          style={{ fontSize: size * 0.5 }}
          aria-label={`${seat.name} has died`}
        >
          †
        </span>
      )}

      {seat.handRaisedAt !== null && (
        <span
          className="absolute -bottom-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber/50 bg-ink px-0.5 text-[9px] text-amber"
          title={`Hand raised (${seat.handRaisedAt + 1} in line)`}
        >
          ✋{seat.handRaisedAt > 0 ? seat.handRaisedAt + 1 : ""}
        </span>
      )}

      {seat.isActingGm && (
        <span
          className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-amber/60 bg-ink text-[9px] text-amber"
          title="Running the session"
        >
          ✦
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-0.5">
      {clickable ? (
        <button
          type="button"
          onClick={onAskPass}
          className="cursor-pointer rounded-full transition-transform hover:scale-105"
          title={`Pass the pen to ${seat.name}`}
          aria-label={`Pass the pen to ${seat.name}`}
        >
          {body}
        </button>
      ) : (
        body
      )}
      {caption && (
        <span
          className={`hand-note max-w-[76px] truncate text-center text-sm leading-tight ${
            seat.gone ? "line-through opacity-40" : ""
          }`}
          style={{ color: seat.gone ? undefined : ring }}
        >
          {seat.isDirector ? "Director" : seat.name.split(" ")[0]}
          {seat.isYou ? " · you" : ""}
        </span>
      )}
    </div>
  );
}

export default function TableSeats({
  layout,
  characters,
  ownerId,
  activePlayerId,
  currentUserId,
  isGM,
  canPassSpotlight,
  onPassTurn,
  spotlightQueue,
  actingGmId = null,
  directorSlip,
  strip,
}: {
  layout: "rim" | "strip";
  /** Rostered characters, all statuses — gone seats stay visible, draped. */
  characters: PlayerCharacter[];
  ownerId: string | null;
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  /** GM may pass the pen (active session, no crossroads in flight). */
  canPassSpotlight: boolean;
  onPassTurn: (userId: string) => void;
  spotlightQueue: SpotlightBid[];
  actingGmId?: string | null;
  /** Acting-GM handoff slip — hangs from the Director's seat when open. */
  directorSlip?: ReactNode;
  /** Strip-only right end: the compact candle + anything else. */
  strip?: { candle?: ReactNode; leaveHref?: string };
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);

  const playerUserIds = characters.filter((c) => c.status === "active").map((c) => c.userId);
  const penWithPlayer =
    !!activePlayerId && characters.some((c) => c.userId === activePlayerId && c.status === "active");

  const seats: SeatModel[] = [
    {
      key: "director",
      userId: ownerId,
      name: "The Director",
      playerName: null,
      portrait: null,
      ink: "var(--ink-gm)",
      isDirector: true,
      holdsPen: !penWithPlayer,
      isYou: isGM,
      gone: null,
      handRaisedAt: null,
      isActingGm: false,
    },
    ...characters.map((c) => ({
      key: c.id,
      userId: c.userId,
      name: c.name,
      playerName: c.user?.displayName ?? null,
      portrait: c.portrait,
      ink: getPlayerInk(c.userId, playerUserIds),
      isDirector: false,
      holdsPen: penWithPlayer && c.userId === activePlayerId,
      isYou: c.userId === currentUserId,
      gone: c.status === "dead" ? ("dead" as const) : c.status === "retired" ? ("retired" as const) : null,
      handRaisedAt: (() => {
        const index = spotlightQueue.findIndex((bid) => bid.userId === c.userId);
        return index >= 0 ? index : null;
      })(),
      isActingGm: !!actingGmId && c.userId === actingGmId,
    })),
  ];

  const confirmSeat = seats.find((s) => s.userId === confirmUserId && !s.isDirector);

  const confirmSlip = confirmSeat && (
    <div
      className={`absolute z-20 rounded-md border border-amber/30 bg-elevated/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md ${
        layout === "rim" ? "left-full ml-2 top-0 w-44" : "top-full mt-2 left-0 w-44"
      }`}
    >
      <p className="hand-note text-base text-paper/85">Pass the pen to {confirmSeat.name.split(" ")[0]}?</p>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (confirmSeat.userId) onPassTurn(confirmSeat.userId);
            setConfirmUserId(null);
          }}
          className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
        >
          Pass it
        </button>
        <button
          type="button"
          onClick={() => setConfirmUserId(null)}
          className="hand-note cursor-pointer text-sm opacity-55 hover:opacity-90"
        >
          keep it
        </button>
      </div>
    </div>
  );

  if (layout === "strip") {
    const penHolder = seats.find((s) => s.holdsPen);
    return (
      <div className="flex h-full items-center gap-2 border-b border-border/60 bg-black/45 px-2 backdrop-blur-md">
        {strip?.leaveHref && (
          <a
            href={strip.leaveHref}
            aria-label="Leave the table"
            className="hand-note shrink-0 px-1 text-lg opacity-60 transition-opacity hover:opacity-100"
          >
            ←
          </a>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {seats.map((seat) => (
            <div key={seat.key} className="relative shrink-0">
              <Seat
                seat={seat}
                size={26}
                canPass={canPassSpotlight && isGM}
                onAskPass={() => setConfirmUserId(seat.userId)}
                reducedMotion={reducedMotion}
              />
              {confirmUserId === seat.userId && confirmSlip}
            </div>
          ))}
          {penHolder && (
            <span className="hand-note ml-1 shrink-0 truncate text-sm" style={{ color: penHolder.ink }}>
              {penHolder.isDirector ? "the Director writes" : `${penHolder.name.split(" ")[0]} writes`}
            </span>
          )}
        </div>
        {strip?.candle && <div className="shrink-0 pr-1">{strip.candle}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {seats.map((seat) => (
        <div key={seat.key} className="relative">
          <Seat
            seat={seat}
            size={44}
            canPass={canPassSpotlight && isGM}
            onAskPass={() => setConfirmUserId(seat.userId)}
            reducedMotion={reducedMotion}
            caption
          />
          {confirmUserId === seat.userId && confirmSlip}
          {seat.isDirector && directorSlip && (
            <div className="mt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setSlipOpen((v) => !v)}
                className="hand-note cursor-pointer text-sm opacity-50 transition-opacity hover:opacity-90"
                title="Who runs the session"
                aria-expanded={slipOpen}
              >
                {slipOpen ? "fold it away" : "the reins"}
              </button>
              <AnimatePresence>
                {slipOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="absolute left-full top-0 z-20 ml-2 w-72"
                  >
                    <div className="rounded-md border border-border bg-elevated/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
                      {directorSlip}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
