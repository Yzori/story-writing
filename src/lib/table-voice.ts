/**
 * Table-voice detection (anti-stall's cousin — a book-quality check).
 *
 * The live table's grammar is second person: the Director narrates "the door
 * opens on you." Natural at the table; wrong in a book a stranger reads later.
 * This DETECTS that address so the human can smooth it before publishing — it
 * never rewrites a word. AI must never author the fix (the bright line: see
 * ~/.claude/plans/coauthored-book-compile-spec.md); the human still holds the pen.
 */

// Second-person pronouns as whole words. The apostrophe in "you're"/"you'll"
// is a word boundary, so `\byou\b` catches those forms too. Case-insensitive,
// global so we don't leak lastIndex across calls (test() on a /g regex would).
const SECOND_PERSON_RE = /\b(?:you|your|yours|yourself|yourselves)\b/i;

/** Whether a passage addresses the reader/table in second person. */
export function hasSecondPersonAddress(text: string): boolean {
  return SECOND_PERSON_RE.test(text);
}

/** The narration/consequence turn types where table-voice reads as a leak. */
const NARRATION_TYPES = new Set(["narration", "consequence"]);

/**
 * Count the narration passages that address the table as "you" — the ones a
 * reader would trip on. Player dialogue saying "you" is legitimate and is not
 * counted (only the GM's narration voice).
 */
export function countTableVoicePassages(
  turns: { type: string; content: string }[]
): number {
  let n = 0;
  for (const t of turns) {
    if (NARRATION_TYPES.has(t.type) && hasSecondPersonAddress(t.content)) n++;
  }
  return n;
}
