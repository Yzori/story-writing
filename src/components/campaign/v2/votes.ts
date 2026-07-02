/**
 * v2 vote — shared logic. A vote is live-edge furniture only: the round
 * never becomes a turn. When the Director adds the winner, two turns join
 * the story — a record line of set type ("ooc", excluded from compile like
 * all log types) and the winning passage in its author's ink.
 */

/** The one line of set type that records how the vote went. */
export function composeVoteLine(
  winnerName: string,
  votesFor: number,
  votesOthers: number,
  leansFor: number,
  leansOthers: number,
): string {
  let line = `— put to a vote: ${winnerName}'s line carried, ${votesFor} ${
    votesFor === 1 ? "vote" : "votes"
  } to ${votesOthers}.`;
  if (leansFor > leansOthers) line += " The house agreed.";
  else if (leansFor < leansOthers) line += " The house leaned the other way.";
  return line;
}
