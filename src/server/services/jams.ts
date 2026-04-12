import "server-only";

interface JamDates {
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  status: string;
}

/**
 * Derive the current jam status from timestamps.
 * Manual "ended" status takes precedence (admin override).
 */
export function computeJamStatus(jam: JamDates): string {
  if (jam.status === "ended") return "ended";

  const now = new Date();
  if (now < jam.submissionStartsAt) return "upcoming";
  if (now <= jam.submissionEndsAt) return "open";
  if (now < jam.votingStartsAt) return "upcoming"; // gap between submission and voting
  if (now <= jam.votingEndsAt) return "voting";
  return "ended";
}
