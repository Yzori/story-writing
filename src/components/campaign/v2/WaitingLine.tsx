"use client";

/**
 * The end of the page when the pen is elsewhere: one line, nothing to
 * operate. "Waiting is reading" — the v2 spec's whole waiting state.
 */
export default function WaitingLine({
  name,
  ink,
}: {
  /** Who is writing — "the Director" or a character's first name. */
  name: string;
  /** Their ink color. */
  ink: string;
}) {
  return (
    <p className="table-murmur flex items-center justify-center gap-2 py-2 text-center">
      <span
        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
        style={{ background: ink }}
        aria-hidden="true"
      />
      <span>
        <span className="font-semibold not-italic" style={{ color: ink }}>
          {name}
        </span>{" "}
        is writing…
      </span>
    </p>
  );
}
