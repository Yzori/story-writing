"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";

/**
 * The end of the page when the pen is yours. Renders as the story's next
 * paragraph: a lead-in in your ink, an auto-growing textarea styled as the
 * page, one commit button. That is the entire control surface (v2 spec).
 *
 * The Director's pass lives INSIDE the writing: typing "@" opens the cast
 * list; committing a passage that names a character hands them the pen.
 * Typing "/" on an empty line summons the Director's moves (dice, and
 * later the vote). Labels follow the language law — plain words on controls.
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
  moves?: Array<{ key: string; label: string }>;
  onMove?: (key: string) => void;
  /** The chair left for the dark — named in the @ list in moon-silver.
   *  Naming it stages, never passes the pen (the ballot does that work). */
  strangerName?: string | null;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        m.key.startsWith(moveQuery) || m.label.toLowerCase().includes(moveQuery),
    );
  }, [moveQuery, moves]);

  const pickMove = (key: string) => {
    setContent("");
    onMove?.(key);
  };

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
    <div className="relative" data-turn-id="the-quill">
      <div className="font-reading text-[16px] leading-[1.85] sm:text-[17px]">
        {leadIn && (
          <span className="font-semibold" style={{ color: ink }}>
            {leadIn}{" "}
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
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
            if (e.key === "Tab" && moveMatches.length > 0) {
              e.preventDefault();
              pickMove(moveMatches[0].key);
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

      {/* The Director's moves — summoned by /. */}
      {moveMatches.length > 0 && (
        <div className="absolute z-10 mt-1 flex flex-wrap gap-3 rounded-md border border-border bg-elevated/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
          {moveMatches.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => pickMove(m.key)}
              className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-amber transition-opacity hover:opacity-80"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* The Director's cast list — summoned by @. */}
      {(mentionMatches.length > 0 || strangerMatches) && (
        <div className="absolute z-10 mt-1 flex flex-wrap gap-2 rounded-md border border-border bg-elevated/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
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
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {isGM && (
          <span className="table-murmur">
            {passName
              ? `the pen goes to ${passName} when you add this`
              : moves?.length
                ? "type @ to hand someone the pen · / for a roll or a vote"
                : "type @ to hand someone the pen"}
          </span>
        )}
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
