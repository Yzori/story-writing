// ─────────────────────────────────────────────────────────────────────────────
// Plain-text excerpts from Tiptap chapter HTML. The homepage quotes a story's
// FIRST line (Act V · the First Line); the studio quotes the writer's LAST
// lines (the manuscript hero — where the ink stopped). Same craft, both ends.
// ─────────────────────────────────────────────────────────────────────────────

export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstLine(html: string): string {
  const text = htmlToText(html);
  if (!text) return "";
  // Sentence boundary: punctuation followed by space + capital/quote.
  // Falls back to the whole text for one-sentence openers.
  const match = text.match(/^[\s\S]*?[.!?](?=["”’]?\s+["“‘A-ZÀ-Ü])/);
  let line = (match ? match[0] : text).trim();
  if (line.length > 180) line = `${line.slice(0, 177).trimEnd()}…`;
  return line;
}

/**
 * The closing lines of a chapter, started at a clean sentence boundary and
 * prefixed with an ellipsis when the quote picks up mid-stream. The caller
 * may pass only the tail of the HTML (e.g. `right(content, 4000)` in SQL) —
 * any leading tag fragment is discarded along with the pre-boundary text.
 */
export function extractLastLines(html: string, max = 240): string {
  const text = htmlToText(html);
  if (!text) return "";
  if (text.length <= max) return text;
  let tail = text.slice(-max);
  // step forward to the first sentence start inside the window, as long as
  // doing so still leaves a substantial quote
  const m = tail.match(/[.!?]["”’]?\s+/);
  if (m && m.index !== undefined && m.index + m[0].length < tail.length - 60) {
    tail = tail.slice(m.index + m[0].length);
  } else {
    // no usable sentence start — at least begin on a whole word
    const sp = tail.indexOf(" ");
    if (sp > -1 && sp < 24) tail = tail.slice(sp + 1);
  }
  return `…${tail.trim()}`;
}
