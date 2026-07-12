"use client";

import { useCallback, useEffect, useState } from "react";

interface Ask {
  id: string;
  userId: string;
  userName: string;
  seatRole: "director" | "writer";
  note: string;
  createdAt: string;
  record: { onTimePct: number | null; finished: number };
}

/**
 * Asks from the board, for the owner/Director: who wants a seat,
 * their note, and their show-up record. Accept seats them on the
 * spot; the seat claim is re-validated server-side.
 */
export default function AsksPanel({
  adventureId,
  onResolved,
  casting = false,
  posted = false,
}: {
  adventureId: string;
  onResolved: () => void;
  /** While casting the panel stays visible with an empty state. */
  casting?: boolean;
  posted?: boolean;
}) {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/adventures/${adventureId}/applications`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.data) setAsks(body.data);
  }, [adventureId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const resolve = async (askId: string, action: "accept" | "decline") => {
    setError(null);
    const res = await fetch(
      `/api/adventures/${adventureId}/applications/${askId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(body?.error?.message ?? "Something went wrong.");
    await refresh();
    onResolved();
  };

  if (asks.length === 0) {
    if (!casting) return null;
    return (
      <div className="mt-5 border border-border rounded-[14px] bg-ink/70 p-4 sm:p-5 font-body">
        <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-2">
          Asks from the board
        </p>
        <p className="font-reading italic text-[13px] text-text-secondary m-0">
          {posted
            ? "No asks yet. Your playbill is up on the board — when someone asks for a seat, they appear here with their note and their show-up record."
            : "This table is invite only, so the board won't send anyone. Fill the chairs with your invite link."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border border-border rounded-[14px] bg-ink/70 p-4 sm:p-5 font-body">
      <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-3">
        Asks from the board
      </p>
      <div className="space-y-3">
        {asks.map((ask) => (
          <div
            key={ask.id}
            className="flex flex-wrap items-center gap-3 border border-border rounded-xl bg-surface px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-paper">
                {ask.userName}
                <span className="text-text-ghost font-normal">
                  {" "}
                  · asks to {ask.seatRole === "director" ? "direct" : "write"}
                </span>
              </div>
              <div className="text-[11.5px] text-sage">
                {ask.record.onTimePct !== null
                  ? `shows up ${ask.record.onTimePct}% · ${ask.record.finished} adventure${ask.record.finished === 1 ? "" : "s"} finished`
                  : "new to the table"}
              </div>
              {ask.note && (
                <div className="font-reading italic text-[12.5px] text-text mt-1">
                  &ldquo;{ask.note}&rdquo;
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-none">
              <button
                onClick={() => resolve(ask.id, "accept")}
                className="font-semibold text-[12.5px] rounded-[10px] px-3.5 py-2 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors"
              >
                Give them the seat
              </button>
              <button
                onClick={() => resolve(ask.id, "decline")}
                className="font-semibold text-[12.5px] rounded-[10px] px-3.5 py-2 bg-surface border border-border text-text-ghost hover:text-paper transition-colors"
              >
                Not this table
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-[12.5px] text-rose mt-3 mb-0">{error}</p>}
    </div>
  );
}
