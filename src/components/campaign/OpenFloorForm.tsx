"use client";

interface OpenFloorFormProps {
  open: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  options: string[];
  setOptions: (value: string[]) => void;
  binding: boolean;
  setBinding: (value: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * "Open the floor" Crossroads form (GM ritual). Presentational — the page owns
 * all form state and the submit handler. Lifted verbatim to slim the page.
 */
export default function OpenFloorForm({
  open,
  prompt,
  setPrompt,
  options,
  setOptions,
  binding,
  setBinding,
  submitting,
  onSubmit,
  onClose,
}: OpenFloorFormProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] rounded-t-3xl border border-amber/25 bg-gradient-to-b from-elevated to-ink p-6 shadow-[0_-30px_90px_-40px_rgba(216,178,90,0.5)] sm:rounded-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber/80">Open the floor to the house</p>
        <h3 className="mt-2 font-display text-[22px] text-paper">Hand the next beat to the gallery.</h3>
        <p className="mt-1 text-[12px] text-text-ghost">
          They vote; you narrate the result. {binding ? "You've pledged to honour their choice." : "Their vote is advisory."}
        </p>

        <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">The question</label>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Vael reaches the bottom step. What does she do?"
          className="mt-1.5 w-full rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/35"
        />

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">The options</label>
        <div className="mt-1.5 space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber/20 bg-amber/[0.05] font-mono text-[10px] text-amber/80">{i + 1}</span>
              <input
                value={opt}
                onChange={(e) => {
                  const n = [...options];
                  n[i] = e.target.value;
                  setOptions(n);
                }}
                placeholder={`Option ${i + 1}`}
                className="min-w-0 flex-1 rounded-lg border border-border bg-ink/30 px-3 py-2 text-[14px] text-paper outline-none placeholder:text-text-ghost/45 focus:border-amber/35"
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-text-ghost hover:text-rose" aria-label="Remove option">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l8 8M11 3l-8 8" /></svg>
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button type="button" onClick={() => setOptions([...options, ""])} className="rounded-full border border-amber/20 bg-amber/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber hover:bg-amber/10">
              Add an option
            </button>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-[12px] text-text-secondary">
          <input type="checkbox" checked={binding} onChange={(e) => setBinding(e.target.checked)} className="accent-amber" />
          Binding — I&apos;ll honour whatever the house chooses
        </label>

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !prompt.trim() || options.filter((o) => o.trim()).length < 2}
            className="rounded-xl bg-amber px-5 py-2.5 text-[13px] font-bold text-void transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Opening…" : "Open to the house"}
          </button>
          <button type="button" onClick={onClose} className="px-3 py-2 text-[13px] text-text-ghost transition-colors hover:text-text-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
