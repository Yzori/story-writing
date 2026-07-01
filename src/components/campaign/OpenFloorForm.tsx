"use client";

interface OpenFloorFormProps {
  open: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  audiencePulse: boolean;
  setAudiencePulse: (value: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * "Open the floor" Crossroads form (GM ritual). One shape: the GM poses the
 * question, players write competing responses, the table votes, the GM
 * canonizes. Presentational — the page owns form state and submit.
 */
export default function OpenFloorForm({
  open,
  prompt,
  setPrompt,
  audiencePulse,
  setAudiencePulse,
  submitting,
  onSubmit,
  onClose,
}: OpenFloorFormProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[520px] rounded-t-3xl border border-amber/25 bg-gradient-to-b from-elevated to-ink p-6 shadow-[0_-30px_90px_-40px_rgba(216,178,90,0.5)] sm:rounded-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber/80">Open the floor</p>
        <h3 className="mt-2 font-display text-[22px] text-paper">Hand the next beat to the table.</h3>
        <p className="mt-1 text-[12px] text-text-ghost">
          Players write competing responses, the table votes, you canonize the winner.
        </p>

        <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">The question</label>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Vael reaches the bottom step. What does she do?"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/35"
        />

        <label className="mt-4 flex items-center gap-2 text-[12px] text-text-secondary">
          <input
            type="checkbox"
            checked={audiencePulse}
            onChange={(e) => setAudiencePulse(e.target.checked)}
            className="accent-amber"
          />
          Let the audience pulse — spectators can cheer for options while the table votes
        </label>

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !prompt.trim()}
            className="rounded-xl bg-amber px-5 py-2.5 text-[13px] font-bold text-void transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Opening…" : "Open the floor"}
          </button>
          <button type="button" onClick={onClose} className="px-3 py-2 text-[13px] text-text-ghost transition-colors hover:text-text-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
