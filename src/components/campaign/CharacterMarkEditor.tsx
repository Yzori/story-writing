"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CharacterMarkKind } from "@/types/campaign";

interface KindOption {
  value: CharacterMarkKind;
  label: string;
  hint: string;
  // Tailwind color tokens — keep the palette emotional, not loud.
  ring: string;
  text: string;
  bg: string;
  glyph: string;
}

const KINDS: KindOption[] = [
  {
    value: "scar",
    label: "Scar",
    hint: "What it cost",
    ring: "border-rose/45",
    text: "text-rose",
    bg: "bg-rose/10",
    glyph: "†",
  },
  {
    value: "vow",
    label: "Vow",
    hint: "What you swore",
    ring: "border-amber/45",
    text: "text-amber",
    bg: "bg-amber/10",
    glyph: "✶",
  },
  {
    value: "debt",
    label: "Debt",
    hint: "What you owe",
    ring: "border-lavender/45",
    text: "text-lavender",
    bg: "bg-lavender/10",
    glyph: "∞",
  },
  {
    value: "memory",
    label: "Memory",
    hint: "What you keep",
    ring: "border-sage/45",
    text: "text-sage",
    bg: "bg-sage/10",
    glyph: "✦",
  },
];

const PROMPT_BY_KIND: Record<CharacterMarkKind, string> = {
  scar: "What did this cost them?",
  vow: "What did they promise?",
  debt: "What do they owe?",
  memory: "What will they carry?",
};

interface Props {
  defaultKind?: CharacterMarkKind;
  onSave: (data: { kind: CharacterMarkKind; text: string }) => Promise<void> | void;
  onDismiss: () => void;
  /** Optional preamble shown above the kind chips, e.g. "This left a mark." */
  preamble?: string;
}

export default function CharacterMarkEditor({
  defaultKind = "scar",
  onSave,
  onDismiss,
  preamble,
}: Props) {
  const [kind, setKind] = useState<CharacterMarkKind>(defaultKind);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const remaining = 140 - trimmed.length;

  const handleSave = async () => {
    if (!trimmed) {
      setError("A mark needs a line");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ kind, text: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="my-3 rounded-xl border border-amber/20 bg-elevated/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        {preamble && (
          <p className="mb-3 font-display text-[10px] uppercase tracking-[0.2em] text-amber/70">
            {preamble}
          </p>
        )}

        {/* Kind chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          {KINDS.map((k) => {
            const active = k.value === kind;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                aria-pressed={active}
                className={`group inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-display uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? `${k.ring} ${k.bg} ${k.text}`
                    : "border-border bg-subtle/20 text-text-tertiary hover:text-paper"
                }`}
              >
                <span aria-hidden="true" className={`text-[14px] leading-none ${active ? k.text : "text-text-ghost"}`}>
                  {k.glyph}
                </span>
                <span>{k.label}</span>
              </button>
            );
          })}
        </div>

        {/* Text input */}
        <label className="block">
          <span className="sr-only">Mark text</span>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, 140));
              if (error) setError(null);
            }}
            placeholder={PROMPT_BY_KIND[kind]}
            maxLength={140}
            autoFocus
            aria-label={PROMPT_BY_KIND[kind]}
            className="w-full bg-transparent border-b border-amber/15 pb-2 font-serif italic text-[15px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/40 transition-colors"
          />
        </label>

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-[10px] ${error ? "text-rose" : "text-text-ghost"}`}>
            {error ?? `${remaining} left`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              disabled={saving}
              className="min-h-9 px-3 text-[10px] uppercase tracking-[0.14em] text-text-tertiary hover:text-paper transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !trimmed}
              className="min-h-9 rounded-full border border-amber/35 bg-amber/15 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Marking…" : "Mark it"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
