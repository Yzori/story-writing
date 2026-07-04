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
}: {
  /** Who holds the pen — for the reclaim hint. */
  writerName: string;
  onTakeBack: () => void;
  /** Omitted where the session has no lifecycle (the demo). */
  onEnd?: () => void;
}) {
  return (
    <p className="mt-2.5 flex items-center justify-center gap-2.5">
      <button
        type="button"
        onClick={onTakeBack}
        className="table-action cursor-pointer rounded-full border border-border/70 px-2.5 py-1 text-text-tertiary transition-colors hover:border-border hover:text-text-secondary"
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
  );
}
