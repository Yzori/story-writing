"use client";

/**
 * The Director's two quiet hands while the pen is out. The table can never
 * be stranded by a writer who stepped away: the pen can always be taken
 * back (the same server move as passing it — to no one), and the session
 * can always be ended. Rendered under the WaitingLine, Director only.
 */
export default function DirectorHands({
  writerName,
  onTakeBack,
  onEnd,
  stalled = false,
  stallNote,
}: {
  /** Who holds the pen — for the reclaim hint. */
  writerName: string;
  onTakeBack: () => void;
  /** Omitted where the session has no lifecycle (the demo). */
  onEnd?: () => void;
  /** The pen has sat past the stall threshold — surface the reclaim, quietly. */
  stalled?: boolean;
  /** e.g. "still for 6m" — how long the pen has been idle. */
  stallNote?: string;
}) {
  return (
    <>
      {stalled && (
        <p className="table-murmur mt-1.5 text-center text-text-secondary">
          The pen has been {stallNote ?? "still a while"} — you can route
          around {writerName.split(" ")[0]}.
        </p>
      )}
    <p className="mt-2.5 flex items-center justify-center gap-2.5">
      <button
        type="button"
        onClick={onTakeBack}
        className={`table-action cursor-pointer rounded-full border px-2.5 py-1 transition-colors ${
          stalled
            ? "border-amber/50 text-text-secondary hover:border-amber hover:text-paper"
            : "border-border/70 text-text-tertiary hover:border-border hover:text-text-secondary"
        }`}
        title={`The pen returns to you — ${writerName}'s passage can wait for another turn`}
      >
        Take the pen back
      </button>
      {onEnd && (
        <button
          type="button"
          onClick={onEnd}
          className="table-action cursor-pointer rounded-full border border-border/70 px-2.5 py-1 text-text-tertiary transition-colors hover:border-border hover:text-text-secondary"
          title="Close the session — the page is written"
        >
          End the session
        </button>
      )}
    </p>
    </>
  );
}
