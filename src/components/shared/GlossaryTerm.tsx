"use client";

import { useState, useId, useRef, useEffect } from "react";
import { GLOSSARY, type GlossaryId } from "./glossary";

type GlossaryTermProps = {
  className?: string;
} & (
  | { id: GlossaryId; term?: string; explain?: string }
  | { id?: undefined; term: string; explain: string }
);

/**
 * Inline coined-term with a hover/focus/tap tooltip explaining it in plain language.
 * Use sparingly — once per surface per term — to teach the brand vocabulary without
 * forcing every reader to decode it.
 *
 * Pass an `id` to pull the label + explanation from the central glossary, or supply
 * `term` + `explain` directly for one-off cases. Note: renders a <button>, so never
 * nest it inside an <a>/Link or another button.
 */
export default function GlossaryTerm(props: GlossaryTermProps) {
  const { className = "" } = props;
  const entry = props.id ? GLOSSARY[props.id] : null;
  const term = props.term ?? entry?.term ?? "";
  const explain = props.explain ?? entry?.explain ?? "";
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-baseline ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? id : undefined}
        className="inline-flex items-baseline gap-0.5 border-b border-dotted border-gold/40 text-inherit hover:border-gold/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1 focus-visible:ring-offset-void rounded-sm transition-colors"
      >
        <span>{term}</span>
        <span aria-hidden className="text-[0.7em] text-gold/70 -translate-y-[0.15em]">
          ?
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50 px-3 py-2 rounded-lg bg-elevated border border-border-active text-paper text-[11.5px] leading-relaxed font-body shadow-[var(--t-shadow-modal)] pointer-events-none"
        >
          {explain}
          <span
            aria-hidden
            className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-elevated border-r border-b border-border-active -translate-y-1/2 rotate-45"
          />
        </span>
      )}
    </span>
  );
}
