"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The vote at the live edge of the page: the Director's question in gold,
 * rival lines each in their author's ink — the ink divides — with the
 * table's votes and the house's lean printed underneath each. Players tap
 * a line to vote, viewers tap to lean, the Director adds the winner to the
 * story. Like the dice slip, the block never touches history: it resolves
 * into one record line of set type plus the winning passage.
 */

export interface VoteOption {
  id: string;
  authorName: string;
  /** CSS color — the author's ink. */
  ink: string;
  content: string;
  voteCount: number;
  leanCount: number;
  isMyVote: boolean;
  isMyLean: boolean;
  /** My own line — I can't vote for it (the table's rule). */
  isMine: boolean;
}

export default function VoteBlock({
  prompt,
  options,
  canSubmit,
  myName,
  myInk,
  canVote,
  canLean,
  canResolve,
  resolveReady,
  onSubmit,
  onVote,
  onLean,
  onResolve,
  onCallOff,
}: {
  prompt: string;
  options: VoteOption[];
  /** A player who hasn't added their line yet. */
  canSubmit: boolean;
  myName: string | null;
  myInk: string;
  canVote: boolean;
  canLean: boolean;
  /** The Director. */
  canResolve: boolean;
  /** At least one line and one vote on the table. */
  resolveReady: boolean;
  onSubmit: (content: string) => void;
  onVote: (optionId: string) => void;
  onLean: (optionId: string) => void;
  onResolve: () => void;
  onCallOff: () => void;
}) {
  const [line, setLine] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow with the ink, same as the quill.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [line]);

  const submit = () => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setLine("");
  };

  return (
    <div className="paper-slip px-5 py-4 sm:px-6">
      {/* The slip's letterhead. */}
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-ghost">
        <span className="text-amber/80">a vote</span> · the table writes, then votes
      </p>
      {/* The question — the slip's one loud line. */}
      <p className="mt-2.5 font-reading text-[16px] italic leading-relaxed text-amber/90 sm:text-[17px]">
        ✦ {prompt}
      </p>

      {options.length > 0 && (
        <div className="mt-3 space-y-2">
          {options.map((o) => {
            // A player can't vote for their own line; a viewer leans anywhere.
            const rowClickable = canLean || (canVote && !o.isMine);
            const meta = (
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                {o.authorName} · {o.voteCount} {o.voteCount === 1 ? "vote" : "votes"}
                {o.leanCount > 0 &&
                  ` · ${o.leanCount} ${o.leanCount === 1 ? "viewer leans" : "viewers lean"} this way`}
                {o.isMine && <span> · yours</span>}
                {o.isMyVote && <span className="text-amber"> · your vote</span>}
                {o.isMyLean && <span className="text-amber"> · your lean</span>}
              </span>
            );
            const chosen = o.isMyVote || o.isMyLean;
            const body = (
              <span className="flex items-start gap-3">
                <span className="block min-w-0 flex-1">
                  <span
                    className="block font-reading text-[15px] leading-relaxed"
                    style={{ color: o.ink }}
                  >
                    {o.content}
                  </span>
                  {meta}
                </span>
                {/* The ballot mark — an empty circle says "you can choose
                    this" even at rest, even on touch. */}
                {rowClickable && (
                  <span
                    className={`mt-1.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border transition-colors ${
                      chosen ? "border-amber bg-amber" : "border-border"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </span>
            );
            const rowClass = `block w-full border-l-2 py-1 pl-3 pr-2 text-left transition-colors ${
              chosen ? "bg-paper/[0.04]" : ""
            }`;
            return rowClickable ? (
              <button
                key={o.id}
                type="button"
                onClick={() => (canVote && !o.isMine ? onVote(o.id) : onLean(o.id))}
                className={`${rowClass} cursor-pointer hover:bg-paper/[0.03]`}
                style={{ borderColor: o.ink }}
                title={canVote && !o.isMine ? "Vote for this line" : "Lean toward this line"}
                aria-pressed={chosen}
              >
                {body}
              </button>
            ) : (
              <div key={o.id} className={rowClass} style={{ borderColor: o.ink }}>
                {body}
              </div>
            );
          })}
        </div>
      )}

      {canSubmit && (
        <div className="mt-3">
          <div className="font-reading text-[15px] leading-relaxed">
            {myName && (
              <span className="font-semibold" style={{ color: myInk }}>
                {myName}{" "}
              </span>
            )}
            <textarea
              ref={textareaRef}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="write your line…"
              rows={1}
              autoFocus
              className="ink-caret block w-full resize-none overflow-hidden bg-transparent font-reading text-[15px] leading-relaxed text-paper/95 outline-none placeholder:italic placeholder:text-text-ghost"
              style={{ ["--ink-self" as string]: myInk }}
              aria-label="Write your line for the vote"
            />
          </div>
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!line.trim()}
              className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              title="Add your line to the vote (Enter)"
            >
              Add your line
            </button>
          </div>
        </div>
      )}

      {canVote && options.length > 0 && (
        <p className="table-murmur mt-2">
          tap another player&rsquo;s line to vote{canSubmit ? " — or add your own" : ""}
        </p>
      )}
      {canLean && options.length > 0 && (
        <p className="table-murmur mt-2">
          tap a line to lean — the table sees where the house leans
        </p>
      )}
      {options.length === 0 && !canSubmit && (
        <p className="table-murmur mt-3">the floor is open — waiting for lines…</p>
      )}

      {canResolve && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCallOff}
            className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Call it off
          </button>
          <button
            type="button"
            onClick={onResolve}
            disabled={!resolveReady}
            className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            title="The top-voted line joins the story"
          >
            Add the winner to the story
          </button>
        </div>
      )}
    </div>
  );
}
