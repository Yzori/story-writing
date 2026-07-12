"use client";

import type {
  AdventureHandView,
  AdventureSeatView,
  AdventureView,
  SeatPresenceView,
} from "@/types/adventure";
import { presenceMap } from "@/lib/adventure-presence";
import { inkFor } from "@/components/adventures/ink";

/**
 * The cast bar — a theater program strip, not an illustration. Four
 * seats with pips and hairline dividers; the spotlight is a teal
 * light-line pooled under the active seat. Presence embers glow on
 * the seats of everyone at the table right now, and "writing now"
 * only shows while keystrokes are actually landing.
 */
export default function CastBar({
  adventure,
  seats,
  hands,
  presence,
  mySeatId,
  onOpenSeat,
}: {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  hands: AdventureHandView[];
  presence?: SeatPresenceView[];
  mySeatId: string;
  /** While casting: tapping an empty chair fetches the invite link. */
  onOpenSeat?: () => void;
}) {
  const visible = seats.filter(
    (s) => s.status === "seated" || s.status === "open"
  );
  const handSeatIds = new Set(hands.map((h) => h.seatId));
  const presenceBySeat = presenceMap(presence);
  const ended =
    adventure.status === "finished" || adventure.status === "abandoned";

  return (
    <div className="max-w-[980px] mx-auto mt-8 px-6">
      <div
        className="flex flex-col sm:grid border border-border rounded-2xl bg-gradient-to-b from-elevated/40 to-ink/90 shadow-[0_18px_44px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((seat, i) => (
          <Seat
            key={seat.id}
            seat={seat}
            lit={!ended && adventure.spotlightSeatId === seat.id}
            handUp={!ended && handSeatIds.has(seat.id)}
            ended={ended}
            isMe={seat.id === mySeatId}
            first={i === 0}
            atTable={
              !ended && (presenceBySeat.get(seat.id)?.atTable ?? false)
            }
            writing={
              !ended && (presenceBySeat.get(seat.id)?.writing ?? false)
            }
            dueAt={
              adventure.spotlightSeatId === seat.id
                ? adventure.spotlightDueAt
                : null
            }
            onOpen={seat.status === "open" ? onOpenSeat : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Seat({
  seat,
  lit,
  handUp,
  isMe,
  first,
  atTable,
  writing,
  ended,
  dueAt,
  onOpen,
}: {
  seat: AdventureSeatView;
  lit: boolean;
  handUp: boolean;
  isMe: boolean;
  first: boolean;
  atTable: boolean;
  writing: boolean;
  ended: boolean;
  dueAt: string | null;
  onOpen?: () => void;
}) {
  const ink = seat.role === "director" ? inkFor("amber") : inkFor(seat.inkColor);
  const open = seat.status === "open";
  const name = open ? "Empty chair" : (seat.userName ?? "—");
  const initial = open ? "+" : name.charAt(0).toUpperCase();

  const frame = `relative flex items-center gap-3 px-4 py-4 min-w-0 text-left ${
    first ? "" : "border-t border-border sm:border-t-0 sm:border-l"
  } ${lit ? "bg-[radial-gradient(120%_140%_at_50%_115%,rgba(87,210,203,0.14),transparent_62%)]" : ""}`;

  const body = (
    <>
      {lit && (
        <span
          aria-hidden
          className="absolute left-[14%] right-[14%] bottom-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-teal to-transparent shadow-[0_0_14px_2px_rgba(87,210,203,0.5)] animate-pulse"
        />
      )}
      <div
        className={`relative w-10 h-10 flex-none rounded-full grid place-items-center font-display font-semibold text-[16px] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors ${
          open
            ? "border border-dashed border-border-active bg-transparent text-text-ghost shadow-none group-hover:border-gold/50 group-hover:text-gold-light"
            : `text-void ${ink.pip}`
        } ${lit ? "ring-2 ring-teal/60 shadow-[0_0_22px_rgba(87,210,203,0.4)]" : ""}`}
      >
        {initial}
        {handUp && (
          <span
            title="Hand raised"
            className="absolute -right-1 -top-1 w-[15px] h-[15px] rounded-full bg-amber shadow-[0_0_10px_rgba(245,172,78,0.8)] grid place-items-center animate-bounce"
          >
            <span className="w-[2px] h-[7px] bg-void rounded-full rotate-[35deg]" />
          </span>
        )}
        {/* presence ember — lit while this seat's page is open */}
        {!open && !ended && (
          <span
            title={atTable ? "At the table" : "Away from the table"}
            className={`absolute -right-0.5 -bottom-0.5 w-[11px] h-[11px] rounded-full border-2 border-ink transition-all duration-700 ${
              atTable
                ? "bg-sage shadow-[0_0_10px_2px_rgba(148,196,148,0.55)]"
                : "bg-surface"
            }`}
          />
        )}
      </div>
      <div className="min-w-0">
        <div
          className={`font-semibold text-[14px] truncate ${
            open ? "text-text-secondary" : "text-paper"
          }`}
        >
          {name}
          {isMe && <span className="text-text-ghost font-normal"> (you)</span>}
        </div>
        <div
          className={`text-[11.5px] leading-snug truncate transition-colors ${
            open && onOpen
              ? "text-gold-dark group-hover:text-gold-light"
              : "text-text-ghost"
          }`}
        >
          {seat.role === "director"
            ? "Director"
            : open
              ? onOpen
                ? "tap to invite"
                : "waiting"
              : seat.characterName
                ? `${seat.characterName}${seat.characterBrief ? `, ${seat.characterBrief}` : ""}`
                : "writer"}
        </div>
        {/* once the curtain falls, the activity chips retire with it */}
        {!ended && (
          <SeatStatus
            seat={seat}
            lit={lit}
            handUp={handUp}
            writing={writing}
            dueAt={dueAt}
          />
        )}
      </div>
    </>
  );

  if (open && onOpen) {
    return (
      <button
        onClick={onOpen}
        className={`${frame} group cursor-pointer transition-colors hover:bg-gold/[0.04]`}
      >
        {body}
      </button>
    );
  }
  return <div className={frame}>{body}</div>;
}

function SeatStatus({
  seat,
  lit,
  handUp,
  writing,
  dueAt,
}: {
  seat: AdventureSeatView;
  lit: boolean;
  handUp: boolean;
  writing: boolean;
  dueAt: string | null;
}) {
  const base =
    "mt-1.5 inline-block text-[10.5px] font-semibold tracking-[0.04em] px-2 py-0.5 rounded-full whitespace-nowrap";
  if (seat.status === "open") return null;
  if (lit && seat.role === "director") {
    return (
      <span className={`${base} text-gold-light border border-gold/40 bg-gold/10`}>
        holds the spotlight
      </span>
    );
  }
  if (lit) {
    // "writing now" is honest — it only shows while keystrokes land.
    return writing ? (
      <span className={`${base} text-void bg-teal animate-pulse`}>
        writing now{dueLabel(dueAt)}
      </span>
    ) : (
      <span className={`${base} text-teal border border-teal/50 bg-teal/10`}>
        has the spotlight{dueLabel(dueAt)}
      </span>
    );
  }
  if (handUp) {
    return (
      <span className={`${base} text-amber border border-amber/50 bg-amber/10`}>
        hand raised
      </span>
    );
  }
  return (
    <span className={`${base} text-text-ghost border border-border`}>
      {seat.role === "director" ? "directing" : "listening"}
    </span>
  );
}

function dueLabel(dueAt: string | null): string {
  if (!dueAt) return "";
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return " · turn overdue";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return " · due within the hour";
  return ` · due in ${hours}h`;
}
