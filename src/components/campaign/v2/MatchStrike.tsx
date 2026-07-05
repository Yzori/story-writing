"use client";

/**
 * The match strike — a one-shot flash of warm light across the whole room
 * the instant the session begins (draft → active). The parent renders it
 * once when it observes the transition; the animation runs `forwards` and
 * the element can simply stay mounted, fully transparent, afterwards.
 */
export default function MatchStrike() {
  return (
    <div
      aria-hidden
      className="match-strike pointer-events-none fixed inset-0 z-[40]"
    />
  );
}
