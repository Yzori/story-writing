"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PACE_LABELS, type AdventurePace } from "@/types/adventure";

interface MyAdventure {
  id: string;
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  status: string;
  actNo: number;
  sceneNo: number;
  myRole: "director" | "writer";
}

interface BoardCard {
  id: string;
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  status: string;
  openDirector: boolean;
  openWriters: number;
  seatedWriters: number;
  hostName: string | null;
  hostRecord: { onTimePct: number | null; finished: number };
  isMine: boolean;
}

const QUICK_GENRES = [
  "any genre",
  "fantasy",
  "mystery",
  "horror",
  "romance",
  "science fiction",
];

/**
 * Find a table — the playbill board. Quick-match is pace-first:
 * co-written stories don't die of bad writing, they die of waiting.
 */
export default function AdventuresBoardPage() {
  const [mine, setMine] = useState<MyAdventure[]>([]);
  const [board, setBoard] = useState<BoardCard[] | null>(null);
  const [seat, setSeat] = useState("writer");
  const [genre, setGenre] = useState("any genre");
  const [pace, setPace] = useState("");

  const loadBoard = useCallback(async () => {
    const params = new URLSearchParams();
    if (seat !== "either") params.set("seat", seat);
    if (genre !== "any genre") params.set("genre", genre);
    if (pace) params.set("pace", pace);
    const res = await fetch(`/api/adventures/board?${params}`);
    const body = await res.json().catch(() => null);
    setBoard(body?.data ?? []);
  }, [seat, genre, pace]);

  useEffect(() => {
    fetch("/api/adventures")
      .then((res) => res.json())
      .then((body) => setMine(body.data ?? []))
      .catch(() => setMine([]));
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="max-w-[1120px] mx-auto px-6 pt-24">
        <div className="text-center max-w-[66ch] mx-auto">
          <h1 className="font-display font-medium text-paper text-[clamp(30px,4.4vw,46px)] [text-wrap:balance] mb-3 [text-shadow:0_0_44px_var(--color-gold-glow)]">
            Every story needs a table.
          </h1>
          <p className="text-[15px] text-text m-0">
            An adventure is written by a small cast — one{" "}
            <strong className="text-paper">Director</strong> who runs the
            world, two to four writers who each play a character. Bring
            friends, or take an open seat from the board. Tables are matched
            on <strong className="text-paper">pace first</strong>: a table
            that writes at your speed is a table that finishes.
          </p>
        </div>

        {/* quick match */}
        <div className="mt-8 mb-11 mx-auto max-w-[780px] text-center border border-gold/30 rounded-2xl px-6 py-5 bg-ink/70 shadow-[0_14px_34px_rgba(0,0,0,0.3)] font-reading text-[16px] text-text leading-[2.3]">
          <span className="whitespace-nowrap">Find me a seat —</span>{" "}
          <span className="whitespace-nowrap">
            I want to{" "}
            <QuickSelect
              value={seat}
              onChange={setSeat}
              options={[
                ["writer", "write a character"],
                ["director", "direct"],
                ["either", "do either"],
              ]}
            />
          </span>{" "}
          <span className="whitespace-nowrap">
            in{" "}
            <QuickSelect
              value={genre}
              onChange={setGenre}
              options={QUICK_GENRES.map((g) => [g, g])}
            />
          </span>{" "}
          <span className="whitespace-nowrap">
            at{" "}
            <QuickSelect
              value={pace}
              onChange={setPace}
              options={[
                ["", "any pace"],
                ...Object.entries(PACE_LABELS).map(
                  ([value, label]) => [value, label.toLowerCase()] as [string, string]
                ),
              ]}
            />
          </span>{" "}
          <button
            onClick={loadBoard}
            className="ml-2 align-middle font-body font-semibold text-[13.5px] rounded-[11px] px-4 py-2.5 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors"
          >
            Match me
          </button>
        </div>

        {/* your tables */}
        {mine.length > 0 && (
          <div className="mb-10">
            <SectionLabel>Your tables</SectionLabel>
            <div className="flex gap-3 flex-wrap">
              {mine.map((adventure) => (
                <Link
                  key={adventure.id}
                  href={`/adventures/${adventure.id}`}
                  className="border border-border rounded-xl bg-surface px-4 py-3 hover:border-gold/45 transition-colors min-w-[220px]"
                >
                  <div className="font-display text-[16px] text-paper">
                    {adventure.title}
                  </div>
                  <div className="text-[11.5px] text-text-ghost">
                    {adventure.status === "casting"
                      ? "casting"
                      : adventure.status === "running"
                        ? `Act ${adventure.actNo} · you ${adventure.myRole === "director" ? "direct" : "write"}`
                        : adventure.status}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* the board */}
        <SectionLabel>The board</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {(board ?? []).map((card) => (
            <Playbill key={card.id} card={card} />
          ))}

          <Link
            href="/adventures/new"
            className="relative border border-dashed border-border rounded-md bg-ink/40 p-6 text-center flex flex-col gap-3 justify-center transition-all hover:-translate-y-1 hover:border-gold/45 before:content-[''] before:absolute before:inset-[7px] before:border before:border-dashed before:border-gold/20 before:rounded-[3px] before:pointer-events-none"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-dark">
              Your premise here
            </div>
            <h2 className="font-display font-medium text-[22px] text-gold-light m-0">
              Open your own table
            </h2>
            <div className="text-gold/55 text-[12px] tracking-[0.6em] indent-[0.6em]">
              ✦
            </div>
            <p className="font-reading italic text-[13.5px] text-text m-0 leading-relaxed">
              Write a premise, set the pace, choose your seat. Invite friends
              by link — or post it to this board and let it fill the chairs.
            </p>
          </Link>
        </div>

        {board !== null && board.length === 0 && (
          <p className="text-center text-[13px] text-text-ghost mt-8">
            No open tables match — loosen the search, or open your own.
          </p>
        )}

        <p className="mx-auto mt-10 text-[13px] text-text-ghost max-w-[68ch] text-center">
          <b className="text-text font-semibold">Why pace comes first:</b>{" "}
          co-written stories don&apos;t die of bad writing, they die of
          waiting. Every table sets a turn rhythm up front; overdue turns are
          visible to the whole table, and finishing an adventure is what
          builds your record on this board.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mb-4 flex items-center gap-3 after:content-[''] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gold/30 after:to-transparent">
      {children}
    </p>
  );
}

function QuickSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-body font-semibold text-[13.5px] text-gold-light bg-surface border border-border border-b-gold-dark rounded-[9px] px-2.5 py-1.5 mx-1 cursor-pointer outline-none focus:border-gold/50"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Playbill({ card }: { card: BoardCard }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seeking = card.openDirector
    ? card.openWriters > 0
      ? `Seeking · a Director & ${writerCount(card.openWriters)}`
      : "Seeking · a Director"
    : `Seeking · ${writerCount(card.openWriters)}`;

  const ask = async (seatRole: "director" | "writer") => {
    setError(null);
    const res = await fetch(`/api/adventures/${card.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatRole, note }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setAsked(true);
      setAsking(false);
    } else {
      setError(body?.error?.message ?? "Something went wrong.");
    }
  };

  return (
    <div className="relative border border-border rounded-md bg-gradient-to-b from-elevated/40 to-ink/90 p-6 text-center flex flex-col gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-1 hover:border-gold/45 before:content-[''] before:absolute before:inset-[7px] before:border before:border-gold/20 before:rounded-[3px] before:pointer-events-none">
      <div className="text-[10px] tracking-[0.3em] uppercase text-gold-dark capitalize">
        {card.genre}
      </div>
      <h2 className="font-display font-medium text-[22px] text-paper m-0 [text-wrap:balance]">
        {card.title}
      </h2>
      <div className="text-gold/55 text-[12px] tracking-[0.6em] indent-[0.6em]">✦</div>
      <p className="font-reading italic text-[13.5px] text-text m-0 leading-relaxed line-clamp-4">
        {card.premise}
      </p>
      <div className="text-[11px] tracking-[0.22em] uppercase text-gold-light font-bold border-t border-b border-gold/20 py-1.5">
        {seeking}
      </div>
      <div className="text-[12px] text-teal">{PACE_LABELS[card.pace]}</div>
      <div className="text-[12px] text-text-ghost">
        {card.hostName ? (
          <>
            Directed by <b className="text-paper font-semibold">{card.hostName}</b>
            {card.hostRecord.onTimePct !== null ? (
              <>
                {" "}
                ·{" "}
                <span className="text-sage font-semibold">
                  shows up {card.hostRecord.onTimePct}%
                </span>{" "}
                · {card.hostRecord.finished} finished
              </>
            ) : (
              <> · their first table</>
            )}
          </>
        ) : (
          <>
            {card.seatedWriters} writer{card.seatedWriters === 1 ? "" : "s"}{" "}
            seated, premise written, waiting to begin.
          </>
        )}
      </div>

      <div className="mt-auto pt-1 relative z-10">
        {card.isMine ? (
          <Link
            href={`/adventures/${card.id}`}
            className="inline-block font-semibold text-[13.5px] rounded-[11px] px-4 py-2.5 bg-surface border border-border text-paper hover:border-gold transition-colors"
          >
            Your table — sit down
          </Link>
        ) : asked ? (
          <span className="text-[12.5px] text-sage">
            Asked — they&apos;ll get back to you.
          </span>
        ) : !asking ? (
          <button
            onClick={() => setAsking(true)}
            className="font-semibold text-[13.5px] rounded-[11px] px-4 py-2.5 bg-surface border border-border text-paper hover:border-gold transition-colors"
          >
            {card.openDirector && card.openWriters === 0
              ? "Ask to direct"
              : "Ask for a seat"}
          </button>
        ) : (
          <div className="space-y-2 text-left">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="A line to the table — who you are, what you'd bring…"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[12.5px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
            />
            <div className="flex gap-2 justify-center flex-wrap">
              {card.openWriters > 0 && (
                <button
                  onClick={() => ask("writer")}
                  className="font-semibold text-[12.5px] rounded-[10px] px-3.5 py-2 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors"
                >
                  Ask to write
                </button>
              )}
              {card.openDirector && (
                <button
                  onClick={() => ask("director")}
                  className="font-semibold text-[12.5px] rounded-[10px] px-3.5 py-2 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors"
                >
                  Ask to direct
                </button>
              )}
              <button
                onClick={() => setAsking(false)}
                className="font-semibold text-[12.5px] rounded-[10px] px-3 py-2 bg-surface border border-border text-text-ghost hover:text-paper transition-colors"
              >
                Never mind
              </button>
            </div>
            {error && <p className="text-[12px] text-rose m-0 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function writerCount(n: number): string {
  const words = ["one writer", "two writers", "three writers", "four writers"];
  return words[n - 1] ?? `${n} writers`;
}
