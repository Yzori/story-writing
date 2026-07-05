"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The warm-up on the unlit page: the Director's question as the slip's one
 * loud line, each cast answer in its author's ink beneath. The Director can
 * lift one answer — a quiet gold edge marks it, and it will open the story
 * when the session begins. The dark reads; it never leans here.
 */

export interface WarmupAnswer {
  id: string;
  authorName: string;
  /** CSS color — the author's ink. */
  ink: string;
  content: string;
  isMine: boolean;
  /** Marked to open the story at begin. */
  lifted: boolean;
}

export default function WarmupBlock({
  prompt,
  answers,
  canAnswer,
  myName,
  myInk,
  canLift,
  onAnswer,
  onLift,
  onCallOff,
}: {
  prompt: string;
  answers: WarmupAnswer[];
  /** A cast member (answering again replaces their line). */
  canAnswer: boolean;
  myName: string | null;
  myInk: string;
  /** The Director. */
  canLift: boolean;
  onAnswer: (content: string) => void;
  /** Null un-lifts. */
  onLift: (answerId: string | null) => void;
  onCallOff: () => void;
}) {
  const [line, setLine] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const myAnswer = answers.find((a) => a.isMine) ?? null;
  const showComposer = canAnswer && (!myAnswer || rewriting);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [line]);

  const submit = () => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onAnswer(trimmed);
    setLine("");
    setRewriting(false);
  };

  return (
    <div className="paper-slip px-5 py-4 sm:px-6">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-ghost">
        <span className="text-amber/80">a question</span> · answer in a line
      </p>
      <p className="mt-2.5 font-reading text-[16px] italic leading-relaxed text-amber/90 sm:text-[17px]">
        ✦ {prompt}
      </p>

      {answers.length > 0 && (
        <div className="mt-3 space-y-2">
          {answers.map((a) => (
            <div
              key={a.id}
              className={`border-l-2 py-1 pl-3 pr-2 ${a.lifted ? "bg-amber/[0.06]" : ""}`}
              style={{ borderColor: a.lifted ? "var(--t-gold)" : a.ink }}
            >
              <span
                className="block font-reading text-[15px] leading-relaxed"
                style={{ color: a.ink }}
              >
                {a.content}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                {a.authorName}
                {a.isMine && <span> · yours</span>}
                {a.lifted && (
                  <span className="text-amber"> · this line will open the story</span>
                )}
              </span>
              <span className="mt-1 flex items-center gap-3">
                {canLift && (
                  <button
                    type="button"
                    onClick={() => onLift(a.lifted ? null : a.id)}
                    className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-amber"
                    title={
                      a.lifted
                        ? "Put the line back down"
                        : "This answer opens the story when the session begins"
                    }
                  >
                    {a.lifted ? "put it back" : "lift this line"}
                  </button>
                )}
                {a.isMine && canAnswer && !showComposer && (
                  <button
                    type="button"
                    onClick={() => {
                      setLine(a.content);
                      setRewriting(true);
                    }}
                    className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
                  >
                    change your line
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {showComposer && (
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
              placeholder="answer in one line…"
              rows={1}
              maxLength={280}
              className="ink-caret block w-full resize-none overflow-hidden bg-transparent font-reading text-[15px] leading-relaxed text-paper/95 outline-none placeholder:italic placeholder:text-text-ghost"
              style={{ ["--ink-self" as string]: myInk }}
              aria-label="Answer the question in one line"
            />
          </div>
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!line.trim()}
              className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              title="Add your answer (Enter)"
            >
              Add your line
            </button>
          </div>
        </div>
      )}

      {answers.length === 0 && !showComposer && (
        <p className="table-murmur mt-3">the question waits for the cast…</p>
      )}

      {canLift && (
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onCallOff}
            className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Call it off
          </button>
        </div>
      )}
    </div>
  );
}
