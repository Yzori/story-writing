"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";
import MoveCard from "./MoveCard";

/**
 * The end of the page when the pen is yours. Renders as the story's next
 * paragraph: a lead-in in your ink, an auto-growing textarea styled as the
 * page, one commit button. That is the entire control surface (v2 spec).
 *
 * The Director's pass lives INSIDE the writing: typing "@" opens the cast
 * list; committing a passage that names a character hands them the pen.
 * The moves have a visible home too — the Moves chip under the quill types
 * the "/" for you, and typing "/" on an empty line summons the same card.
 * Labels follow the language law — plain words on controls.
 */

const PLACEHOLDERS = {
  gm: "Write what happens — name someone with @ to hand them the pen…",
  player: "…what do you do?",
} as const;

export function firstMentionUserId(
  content: string,
  characters: PlayerCharacter[],
): string | null {
  const match = content.match(/@([A-Za-zÀ-ž'’-]+)/);
  if (!match) return null;
  const first = match[1].toLowerCase();
  const target = characters.find(
    (c) => c.status === "active" && c.name.split(" ")[0].toLowerCase() === first,
  );
  return target?.userId ?? null;
}

export default function Quill({
  isGM,
  myCharName,
  ink,
  characters,
  onCommit,
  moves,
  onMove,
  strangerName,
}: {
  isGM: boolean;
  myCharName: string | null;
  /** CSS color — the hand this paragraph is written in. */
  ink: string;
  /** Active cast, for the Director's @ list. */
  characters: PlayerCharacter[];
  /** Commit the passage; passToUserId is set when the Director named someone. */
  onCommit: (content: string, passToUserId: string | null) => void | Promise<void>;
  /** The moves "/" can summon (Director only in v2). */
  moves?: Array<{ key: string; label: string; aliases?: string[] }>;
  onMove?: (key: string) => void;
  /** The chair left for the dark — named in the @ list in moon-silver.
   *  Naming it stages, never passes the pen (the ballot does that work). */
  strangerName?: string | null;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [moveHighlight, setMoveHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Once, for the Director: the convention that keeps table-voice out of the
  // book. Prevention at the source — the compiled draft still flags any that
  // slip through (the readout's book-voice heads-up). No AI, just a reminder.
  const [showBookVoiceTip, setShowBookVoiceTip] = useState(false);
  useEffect(() => {
    if (!isGM || typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem("quiloria:book-voice-tip")) {
        setShowBookVoiceTip(true);
      }
    } catch {
      /* private mode — just skip the tip */
    }
  }, [isGM]);
  const dismissBookVoiceTip = () => {
    setShowBookVoiceTip(false);
    try {
      window.localStorage.setItem("quiloria:book-voice-tip", "1");
    } catch {
      /* ignore */
    }
  };

  // Auto-grow with the ink.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  const activeChars = useMemo(
    () => characters.filter((c) => c.status === "active"),
    [characters],
  );
  const allPlayerUserIds = activeChars.map((c) => c.userId);

  // The Director's cast list: open while the text ends in "@" + a partial name.
  const mentionQuery = useMemo(() => {
    if (!isGM) return null;
    const match = content.match(/@([A-Za-zÀ-ž'’-]*)$/);
    return match ? match[1].toLowerCase() : null;
  }, [content, isGM]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return activeChars.filter((c) =>
      c.name.split(" ")[0].toLowerCase().startsWith(mentionQuery),
    );
  }, [mentionQuery, activeChars]);

  // The Stranger's callable name — "the Whisper" answers to @Whisper.
  const strangerFirst = strangerName
    ? strangerName.replace(/^the\s+/i, "").split(" ")[0]
    : null;
  const strangerMatches =
    mentionQuery !== null &&
    !!strangerFirst &&
    strangerFirst.toLowerCase().startsWith(mentionQuery);

  const insertMentionText = (first: string) => {
    setContent((prev) => prev.replace(/@([A-Za-zÀ-ž'’-]*)$/, `@${first} `));
    textareaRef.current?.focus();
  };

  const insertMention = (c: PlayerCharacter) => insertMentionText(c.name.split(" ")[0]);

  // The Director's moves — summoned while the line is just "/" + a query.
  const moveQuery = useMemo(() => {
    if (!moves?.length) return null;
    const match = content.match(/^\/([a-z-]*)$/i);
    return match ? match[1].toLowerCase() : null;
  }, [content, moves]);

  const moveMatches = useMemo(() => {
    if (moveQuery === null || !moves) return [];
    return moves.filter(
      (m) =>
        m.key.startsWith(moveQuery) ||
        m.label.toLowerCase().includes(moveQuery) ||
        m.aliases?.some((a) => a.startsWith(moveQuery)),
    );
  }, [moveQuery, moves]);

  const movesOpen = moveQuery !== null;
  const highlight = Math.min(moveHighlight, Math.max(moveMatches.length - 1, 0));

  const pickMove = (key: string) => {
    setContent("");
    setMoveHighlight(0);
    onMove?.(key);
  };

  const toggleMoves = () => {
    setContent(movesOpen ? "" : "/");
    setMoveHighlight(0);
    textareaRef.current?.focus();
  };
  // The chip won't clobber a passage mid-write — "/" only works on an empty line.
  const movesChipDisabled = !movesOpen && !!content.trim();

  // Keep the card in view when the page offers it near the fold.
  useEffect(() => {
    if (moveQuery !== null || mentionQuery !== null) {
      rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [moveQuery, mentionQuery]);

  const passTarget = isGM ? firstMentionUserId(content, activeChars) : null;
  const passName = passTarget
    ? activeChars.find((c) => c.userId === passTarget)?.name.split(" ")[0]
    : null;

  const commit = async () => {
    const trimmed = content.trim();
    if (!trimmed || busy || moveQuery !== null) return;
    setBusy(true);
    try {
      await onCommit(trimmed, passTarget);
      setContent("");
    } finally {
      setBusy(false);
    }
  };

  const leadIn = isGM ? null : myCharName;

  return (
    <div className="relative" data-turn-id="the-quill" ref={rootRef}>
      {isGM && showBookVoiceTip && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-border/50 bg-elevated/40 px-3 py-2 text-[13px] leading-snug text-text-secondary">
          <span>
            You&rsquo;re writing a book as you go — describe the scene for a
            reader. &ldquo;The door opens on them,&rdquo; not &ldquo;on
            you.&rdquo;
          </span>
          <button
            type="button"
            onClick={dismissBookVoiceTip}
            className="ml-auto shrink-0 cursor-pointer text-lg leading-none text-text-ghost hover:text-text-secondary"
            aria-label="Dismiss tip"
          >
            &times;
          </button>
        </p>
      )}
      <div className="font-reading text-[16px] leading-[1.85] sm:text-[17px]">
        {leadIn && (
          <span className="font-semibold" style={{ color: ink }}>
            {leadIn}{" "}
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setMoveHighlight(0);
          }}
          onKeyDown={(e) => {
            // The move card holds the keyboard while it's open.
            if (moveMatches.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMoveHighlight((h) => (h + 1) % moveMatches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMoveHighlight(
                  (h) => (h - 1 + moveMatches.length) % moveMatches.length,
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pickMove(moveMatches[highlight].key);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setContent("");
                return;
              }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Tab" && mentionMatches.length > 0) {
              e.preventDefault();
              insertMention(mentionMatches[0]);
            } else if (e.key === "Tab" && strangerMatches && strangerFirst) {
              e.preventDefault();
              insertMentionText(strangerFirst);
            }
          }}
          placeholder={PLACEHOLDERS[isGM ? "gm" : "player"]}
          rows={1}
          autoFocus
          className="ink-caret block w-full resize-none overflow-hidden bg-transparent font-reading text-[16px] leading-[1.85] text-paper/95 outline-none placeholder:italic placeholder:text-text-ghost sm:text-[17px]"
          style={{ ["--ink-self" as string]: ink }}
          aria-label={isGM ? "Write what happens next" : "Write what your character does"}
        />
      </div>

      {/* The Director's moves — summoned by / or the chip below. */}
      {moveMatches.length > 0 && (
        <MoveCard
          moves={moveMatches}
          highlight={highlight}
          onPick={pickMove}
          onHover={setMoveHighlight}
        />
      )}

      {/* The Director's cast list — summoned by @. */}
      {(mentionMatches.length > 0 || strangerMatches) && (
        <div className="move-card mt-2 px-4 py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {mentionMatches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => insertMention(c)}
                className="cursor-pointer font-reading text-[15px] transition-opacity hover:opacity-80"
                style={{ color: getPlayerInk(c.userId, allPlayerUserIds) }}
              >
                {c.name.split(" ")[0]}
              </button>
            ))}
            {strangerMatches && strangerFirst && (
              <button
                key="the-stranger"
                type="button"
                onClick={() => insertMentionText(strangerFirst)}
                className="cursor-pointer font-reading text-[15px] transition-opacity hover:opacity-80"
                style={{ color: "var(--ink-strange)" }}
                title="Name the Stranger — it stages, it doesn't pass the pen"
              >
                {strangerFirst}
              </button>
            )}
          </div>
          <p className="mt-1.5 border-t border-border/40 pt-1.5 font-mono text-[9.5px] tracking-[0.08em] text-text-ghost">
            naming someone hands them the pen · Tab picks the first
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {isGM && !!moves?.length && (
          <button
            type="button"
            onClick={toggleMoves}
            disabled={movesChipDisabled}
            className="table-action flex cursor-pointer items-center gap-1.5 rounded-full border border-amber/25 px-2.5 py-1 text-amber/90 transition-colors hover:bg-amber/10 disabled:cursor-default disabled:opacity-40"
            title={
              movesChipDisabled
                ? "Finish or clear this passage first"
                : "Call for a roll, put it to a vote, end the session — or just type /"
            }
            aria-expanded={movesOpen}
          >
            <span className="font-mono text-[11px] normal-case">/</span> Moves
          </button>
        )}
        <span className="table-murmur">
          {isGM
            ? passName
              ? `the pen goes to ${passName} when you add this`
              : "type @ to hand someone the pen"
            : "the pen is yours — it returns to the Director when you add to the story"}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={!content.trim() || busy || moveQuery !== null}
            className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            title="Add this to the story (Ctrl+Enter)"
          >
            Add to the story
          </button>
        </div>
      </div>
    </div>
  );
}
