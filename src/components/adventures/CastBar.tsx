"use client";

import type {
  AdventureHandView,
  AdventureSeatView,
  AdventureView,
} from "@/types/adventure";
import { inkFor } from "@/components/adventures/ink";

/**
 * The cast bar — a theater program strip, not an illustration. Four
 * seats with pips and hairline dividers; the spotlight is a teal
 * light-line pooled under the active seat.
 */
export default function CastBar({
  adventure,
  seats,
  hands,
  mySeatId,
}: {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  hands: AdventureHandView[];
  mySeatId: string;
}) {
  const visible = seats.filter(
    (s) => s.status === "seated" || s.status === "open"
  );
  const handSeatIds = new Set(hands.map((h) => h.seatId));

  return (
    <div className="max-w-[980px] mx-auto mt-8 px-6">
      <div
        className="grid border border-border rounded-2xl bg-gradient-to-b from-elevated/40 to-ink/90 shadow-[0_18px_44px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${Math.min(visible.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((seat, i) => (
          <Seat
            key={seat.id}
            seat={seat}
            lit={adventure.spotlightSeatId === seat.id}
            handUp={handSeatIds.has(seat.id)}
            isMe={seat.id === mySeatId}
            first={i === 0}
            dueAt={
              adventure.spotlightSeatId === seat.id
                ? adventure.spotlightDueAt
                : null
            }
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
  dueAt,
}: {
  seat: AdventureSeatView;
  lit: boolean;
  handUp: boolean;
  isMe: boolean;
  first: boolean;
  dueAt: string | null;
}) {
  const ink = seat.role === "director" ? inkFor("amber") : inkFor(seat.inkColor);
  const open = seat.status === "open";
  const name = open ? "Open seat" : (seat.userName ?? "—");
  const initial = open ? "·" : name.charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex items-center gap-3 px-5 py-4 min-w-0 ${
        first ? "" : "border-l border-border"
      } ${lit ? "bg-[radial-gradient(120%_140%_at_50%_115%,rgba(87,210,203,0.14),transparent_62%)]" : ""}`}
    >
      {lit && (
        <span
          aria-hidden
          className="absolute left-[14%] right-[14%] bottom-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-teal to-transparent shadow-[0_0_14px_2px_rgba(87,210,203,0.5)] animate-pulse"
        />
      )}
      <div
        className={`relative w-10 h-10 flex-none rounded-full grid place-items-center font-display font-semibold text-[16px] text-void shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
          open ? "bg-subtle text-text-ghost" : ink.pip
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
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-[14px] text-paper truncate">
          {name}
          {isMe && <span className="text-text-ghost font-normal"> (you)</span>}
        </div>
        <div className="text-[11.5px] text-text-ghost leading-snug truncate">
          {seat.role === "director"
            ? "Director"
            : open
              ? "waiting to be filled"
              : seat.characterName
                ? `${seat.characterName}${seat.characterBrief ? `, ${seat.characterBrief}` : ""}`
                : "writer"}
        </div>
        <SeatStatus seat={seat} lit={lit} handUp={handUp} dueAt={dueAt} />
      </div>
    </div>
  );
}

function SeatStatus({
  seat,
  lit,
  handUp,
  dueAt,
}: {
  seat: AdventureSeatView;
  lit: boolean;
  handUp: boolean;
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
    return (
      <span className={`${base} text-void bg-teal animate-pulse`}>
        writing now{dueLabel(dueAt)}
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
