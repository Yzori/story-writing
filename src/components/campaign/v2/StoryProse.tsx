"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerCharacter, Turn } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";

/**
 * The story as it stands, each hand in its own ink. Turns arriving after
 * mount replay as flowing ink — words appear wet (bright, faintly glowing)
 * and dry into the page. The page never receives dead text.
 *
 * @-mentions of cast members render in the named character's ink with an
 * underline: on this surface, writing someone's name IS handing them the pen,
 * so the name is set apart the way a hyperlink would be.
 *
 * Mechanics never touch history: "roll-request" turns render nothing here
 * (the live slip lives at the end of the page); a resolved roll ("roll")
 * or vote record ("ooc") is one line of set type in faded ink. Both are
 * log types, so they stay out of the compiled chapter too.
 */

const MENTION_RE = /@([A-Za-zÀ-ž'’-]+)/g;

export function inkFor(
  userId: string,
  gmUserId: string,
  allPlayerUserIds: string[],
): string {
  if (userId === gmUserId) return "var(--ink-gm)";
  return getPlayerInk(userId, allPlayerUserIds);
}

/** Render content with cast @-mentions set in the named character's ink. */
export function renderInked(
  content: string,
  characters: PlayerCharacter[],
  allPlayerUserIds: string[],
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of content.matchAll(MENTION_RE)) {
    const idx = match.index ?? 0;
    const first = match[1].toLowerCase();
    const target = characters.find(
      (c) => c.name.split(" ")[0].toLowerCase() === first,
    );
    if (!target) continue;
    if (idx > last) nodes.push(content.slice(last, idx));
    nodes.push(
      <span
        key={`m-${key++}`}
        className="border-b-2 font-semibold"
        style={{
          color: getPlayerInk(target.userId, allPlayerUserIds),
          borderColor: getPlayerInk(target.userId, allPlayerUserIds),
        }}
      >
        {target.name.split(" ")[0]}
      </span>,
    );
    last = idx + match[0].length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const PROSE_CLASS = "mb-5 font-reading text-[16px] leading-[1.85] sm:text-[17px]";
const SET_LINE_CLASS = "mb-5 font-reading text-[14.5px] leading-[1.8]";

/**
 * Resolved mechanics — printed as one line of set type, not ink. A roll
 * always is; an "ooc" turn only when it's a vote record (legacy sessions
 * carry ordinary ooc chat that must never print on the page).
 */
export function isSetLine(turn: Turn): boolean {
  if (turn.type === "roll") return true;
  return turn.type === "ooc" && !!turn.metadata?.includes('"vote-record"');
}

function paragraphClass(turn: Turn): string {
  return isSetLine(turn) ? SET_LINE_CLASS : PROSE_CLASS;
}

/** A paragraph that writes itself onto the page, then dries. */
function ReplayParagraph({
  turn,
  ink,
  characters,
  allPlayerUserIds,
  onDone,
}: {
  turn: Turn;
  ink: string;
  characters: PlayerCharacter[];
  allPlayerUserIds: string[];
  onDone: (turnId: string) => void;
}) {
  const [typed, setTyped] = useState(0);
  const [dry, setDry] = useState(false);
  const doneRef = useRef(false);
  const content = turn.content;

  useEffect(() => {
    // Reduced motion: the passage lands complete (async, so SSR and the
    // set-state-in-effect rule both stay happy).
    if (prefersReducedMotion()) {
      const t = setTimeout(() => setTyped(content.length), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 1;
      setTyped(i);
      if (i < content.length) {
        const ch = content[i - 1];
        const pause =
          ch === "." || ch === "?" || ch === "!" ? 180 : ch === "," || ch === "—" ? 110 : 0;
        timer = setTimeout(step, 16 + Math.random() * 22 + pause);
      }
    };
    timer = setTimeout(step, 120);
    return () => clearTimeout(timer);
  }, [content]);

  const finished = typed >= content.length;
  useEffect(() => {
    if (!finished || doneRef.current) return;
    doneRef.current = true;
    const dryTimer = setTimeout(() => setDry(true), 1400);
    // Hand back to static rendering only after the ink has dried.
    const doneTimer = setTimeout(() => onDone(turn.id), 4500);
    return () => {
      clearTimeout(dryTimer);
      clearTimeout(doneTimer);
    };
  }, [finished, onDone, turn.id]);

  return (
    <p
      data-turn-id={turn.id}
      className={paragraphClass(turn)}
      style={{ color: ink }}
    >
      <span className={dry ? "ink-wet ink-dry" : "ink-wet"}>
        {renderInked(content.slice(0, typed), characters, allPlayerUserIds)}
      </span>
      {!finished && (
        <span
          className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-pulse"
          style={{ background: ink }}
          aria-hidden="true"
        />
      )}
    </p>
  );
}

export default function StoryProse({
  turns,
  characters,
  gmUserId,
  replayIds,
  onReplayDone,
}: {
  turns: Turn[];
  characters: PlayerCharacter[];
  gmUserId: string;
  /** Turn ids that arrived live and should write themselves in. */
  replayIds: ReadonlySet<string>;
  onReplayDone: (turnId: string) => void;
}) {
  const allPlayerUserIds = characters
    .filter((c) => c.status === "active")
    .map((c) => c.userId);

  return (
    <div className="font-reading">
      {turns.map((turn) => {
        // The slip is live-edge furniture, not history — never printed here.
        if (turn.type === "roll-request") return null;
        const ink = isSetLine(turn)
          ? "var(--ink-faded)"
          : inkFor(turn.userId, gmUserId, allPlayerUserIds);
        if (replayIds.has(turn.id)) {
          return (
            <ReplayParagraph
              key={turn.id}
              turn={turn}
              ink={ink}
              characters={characters}
              allPlayerUserIds={allPlayerUserIds}
              onDone={onReplayDone}
            />
          );
        }
        return (
          <p
            key={turn.id}
            data-turn-id={turn.id}
            className={paragraphClass(turn)}
            style={{ color: ink }}
          >
            {renderInked(turn.content, characters, allPlayerUserIds)}
          </p>
        );
      })}
    </div>
  );
}
