"use client";

/**
 * The Stranger's ballot at the live edge of the page: the moment in
 * moon-silver, the deeds it might do beneath — every line the Director's
 * framing, every voice the house's. Watchers tap a deed to choose (free —
 * gold never buys the story); the table reads and waits; the Director adds
 * the chosen deed to the story or calls the whole thing off (the veto).
 * Like the dice slip and the vote, the ballot never touches history: it
 * resolves into one record line of set type plus the deed in silver ink.
 */

export interface StrangerDeed {
  id: string;
  content: string;
  voiceCount: number;
  isMyChoice: boolean;
}

export default function StrangerBlock({
  name,
  prompt,
  deeds,
  canChoose,
  canResolve,
  resolveReady,
  onChoose,
  onResolve,
  onCallOff,
}: {
  /** The Stranger's name as the story knows it. */
  name: string;
  prompt: string;
  deeds: StrangerDeed[];
  /** A watcher in the dark — tapping a deed casts (or moves) their voice. */
  canChoose: boolean;
  /** The Director. */
  canResolve: boolean;
  /** At least one voice from the house. */
  resolveReady: boolean;
  onChoose: (deedId: string) => void;
  onResolve: () => void;
  onCallOff: () => void;
}) {
  return (
    <div
      className="rounded-md border px-5 py-4"
      style={{
        borderColor: "color-mix(in srgb, var(--ink-strange) 30%, transparent)",
        background: "color-mix(in srgb, var(--ink-strange) 6%, transparent)",
      }}
    >
      <p
        className="font-reading text-[15px] italic leading-relaxed"
        style={{ color: "var(--ink-strange)" }}
      >
        ☾ {prompt}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        {name} stirs — the audience chooses its deed
      </p>

      {deeds.length > 0 && (
        <div className="mt-3 space-y-2">
          {deeds.map((d) => {
            const meta = (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                {d.voiceCount} {d.voiceCount === 1 ? "voice" : "voices"}
                {d.isMyChoice && <span style={{ color: "var(--ink-strange)" }}> · your choice</span>}
              </p>
            );
            const body = (
              <>
                <p
                  className="font-reading text-[15px] leading-relaxed"
                  style={{ color: "var(--ink-strange)" }}
                >
                  {d.content}
                </p>
                {meta}
              </>
            );
            const rowClass = `block w-full border-l-2 py-1 pl-3 pr-2 text-left transition-colors ${
              d.isMyChoice ? "bg-paper/[0.04]" : ""
            }`;
            return canChoose ? (
              <button
                key={d.id}
                type="button"
                onClick={() => onChoose(d.id)}
                className={`${rowClass} cursor-pointer hover:bg-paper/[0.03]`}
                style={{ borderColor: "var(--ink-strange)" }}
                title="Choose this deed"
              >
                {body}
              </button>
            ) : (
              <div key={d.id} className={rowClass} style={{ borderColor: "var(--ink-strange)" }}>
                {body}
              </div>
            );
          })}
        </div>
      )}

      {canChoose && (
        <p className="table-murmur mt-2">tap a deed — the audience decides together</p>
      )}
      {!canChoose && !canResolve && (
        <p className="table-murmur mt-2">the audience is deciding…</p>
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
            title="The deed the audience chose joins the story"
          >
            Add its deed to the story
          </button>
        </div>
      )}
    </div>
  );
}
