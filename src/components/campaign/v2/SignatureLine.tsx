"use client";

import type { ReactNode } from "react";
import PenMark from "./PenMark";

/**
 * The signature at the page's foot — the only presence UI, set like a
 * colophon rather than fine print: a whispered "at the table", the cast
 * as a centered row of names in their inks (the traveling pen among
 * them), and the house as one murmured line beneath. Shared by play,
 * watch, and the demo so the table always signs the same way.
 */

export interface SignatureSeat {
  id: string;
  name: string;
  ink: string;
  you?: boolean;
  /** This hand holds the pen right now. */
  pen?: boolean;
  /** Actually present (fresh heartbeat). Only read when `dimAbsent` is set. */
  here?: boolean;
}

function YouTag() {
  return (
    <span className="ml-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-ghost">
      you
    </span>
  );
}

export default function SignatureLine({
  directorYou = false,
  directorPen = false,
  directorHere = true,
  seats,
  strangerName,
  watching = 0,
  trailing,
  dimAbsent = false,
}: {
  directorYou?: boolean;
  directorPen?: boolean;
  /** Only read when `dimAbsent` is set. */
  directorHere?: boolean;
  seats: SignatureSeat[];
  /** The chair left for the dark, if this story keeps one. */
  strangerName?: string | null;
  /** How many watch from the dark. */
  watching?: number;
  /** Extra murmur content (the watcher's own line, the gold chip). */
  trailing?: ReactNode;
  /**
   * Lobby mode: seats that haven't arrived render as faint waiting lines;
   * a name blooms when its owner takes their seat (the key remount rides
   * the existing .name-bloom animation, same as WaitingLine).
   */
  dimAbsent?: boolean;
}) {
  const absentClass = " opacity-25";
  return (
    <div className="text-center">
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-text-ghost">
        at the table
      </p>
      <div className="mt-2.5 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1.5 font-reading text-[14px] font-medium leading-normal">
        <span
          key={dimAbsent ? `gm-${directorHere}` : "gm"}
          className={`inline-flex items-baseline gap-1.5${
            dimAbsent ? (directorHere ? " name-bloom" : absentClass) : ""
          }`}
          style={{ color: "var(--ink-gm)" }}
        >
          {directorPen && <PenMark ink="var(--ink-gm)" />}
          ✦ the Director
          {directorYou && <YouTag />}
        </span>
        {seats.map((s) => {
          const absent = dimAbsent && !s.here;
          return (
            <span
              key={dimAbsent ? `${s.id}-${s.here ? "here" : "away"}` : s.id}
              className={`inline-flex items-baseline gap-1.5${
                dimAbsent ? (absent ? absentClass : " name-bloom") : ""
              }`}
              style={{ color: s.ink }}
            >
              {s.pen && <PenMark ink={s.ink} />}
              {s.name}
              {s.you && <YouTag />}
            </span>
          );
        })}
        {strangerName && (
          <span
            style={{ color: "var(--ink-strange)" }}
            title="A chair left for the dark — the audience plays this character"
          >
            ☾ {strangerName}
          </span>
        )}
      </div>
      {(watching > 0 || trailing) && (
        <p className="table-murmur mt-2 flex flex-wrap items-baseline justify-center gap-x-2">
          {watching > 0 && <span>{watching} watching from the dark</span>}
          {trailing}
        </p>
      )}
    </div>
  );
}
