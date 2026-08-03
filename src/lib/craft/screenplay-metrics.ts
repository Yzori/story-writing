/**
 * Screenplay page + runtime estimation.
 *
 * A screenplay page is a physical fact, not a word count: Courier 12 on
 * US Letter with 1" margins gives ~55 typed lines per page, and each element
 * type has a fixed text width. So we lay the script out on that grid — count
 * the lines each element wraps to, plus the blank lines the format puts
 * between elements — and divide by 55. One page ≈ one minute of screen time.
 *
 * Pure over the Tiptap/ProseMirror doc JSON (`editor.getJSON()`).
 */

/** Minimal shape of a ProseMirror/Tiptap JSON node. */
export interface ScreenplayDocNode {
  type?: string;
  text?: string;
  content?: ScreenplayDocNode[];
}

export interface ScreenplayMetrics {
  /** Estimated pages, one decimal. */
  pages: number;
  /** Estimated screen time in whole minutes (~1 min per page). */
  runtimeMinutes: number;
  sceneCount: number;
  wordCount: number;
  /** Typed lines the script occupies on the Courier grid — pages, unrounded. */
  lines: number;
}

/** Courier 12 at 6 lines/inch over a 9" type area. */
const LINES_PER_PAGE = 55;

/** Characters per line for each element, from standard element widths. */
const LINE_WIDTHS: Record<string, number> = {
  sceneHeading: 61, // 6.0" — full text width
  action: 61,
  transition: 61, // right-aligned, but the same available width
  characterName: 35,
  dialogue: 35, // 3.5"
  parenthetical: 25, // 2.5"
};

const EMPTY_METRICS: ScreenplayMetrics = {
  pages: 0,
  runtimeMinutes: 0,
  sceneCount: 0,
  wordCount: 0,
  lines: 0,
};

/** The editor aliases bare paragraphs to action blocks. */
function normalizeType(type: string | undefined): string | null {
  if (!type) return null;
  if (type === "paragraph") return "action";
  return type in LINE_WIDTHS ? type : null;
}

/**
 * Blank lines the format puts above an element. Dialogue and parentheticals
 * sit flush under the name they belong to; everything else gets air, and a
 * scene heading gets double.
 */
function blankLinesBefore(type: string, prevType: string | null): number {
  if (prevType === null) return 0; // first printed element on page one
  switch (type) {
    case "sceneHeading":
      return 2;
    case "dialogue":
      return prevType === "characterName" || prevType === "parenthetical" ? 0 : 1;
    case "parenthetical":
      return prevType === "characterName" || prevType === "dialogue" ? 0 : 1;
    default:
      return 1;
  }
}

/** Lines one run of text occupies at a given width, wrapping on whole words. */
function wrapSegment(segment: string, width: number): number {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  let lines = 1;
  let column = 0;
  for (const word of words) {
    if (column === 0) {
      column = word.length;
    } else if (column + 1 + word.length <= width) {
      column += 1 + word.length;
    } else {
      lines += 1;
      column = word.length;
    }
    // A word longer than the measure spills onto further lines.
    while (column > width) {
      lines += 1;
      column -= width;
    }
  }
  return lines;
}

function wrappedLineCount(text: string, width: number): number {
  let lines = 0;
  for (const segment of text.split("\n")) {
    lines += wrapSegment(segment, width);
  }
  return lines;
}

/** Flatten a block's inline content; hard breaks become newlines. */
function textOf(node: ScreenplayDocNode): string {
  let out = "";
  const walk = (n: ScreenplayDocNode) => {
    if (typeof n.text === "string") {
      out += n.text;
      return;
    }
    if (n.type === "hardBreak") {
      out += "\n";
      return;
    }
    for (const child of n.content ?? []) walk(child);
  };
  for (const child of node.content ?? []) walk(child);
  return out;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Estimate pages, runtime and scene count for a screenplay document.
 *
 * Empty elements are skipped: a writer's trailing blank block is not printed
 * content, and counting it would make the page number twitch while typing.
 */
export function estimateScreenplayMetrics(
  doc: ScreenplayDocNode | null | undefined
): ScreenplayMetrics {
  if (!doc) return EMPTY_METRICS;

  let totalLines = 0;
  let sceneCount = 0;
  let wordCount = 0;
  let prevType: string | null = null;

  const visit = (node: ScreenplayDocNode) => {
    const type = normalizeType(node.type);
    if (!type) {
      for (const child of node.content ?? []) visit(child);
      return;
    }

    let text = textOf(node).trim();
    if (!text) return;

    wordCount += countWords(text);
    if (type === "sceneHeading") sceneCount += 1;
    // The editor draws a parenthetical's brackets in CSS, so the two
    // characters are missing from the text but present on the page.
    if (type === "parenthetical" && !text.startsWith("(")) text = `(${text})`;

    totalLines += blankLinesBefore(type, prevType);
    totalLines += wrappedLineCount(text, LINE_WIDTHS[type]);
    prevType = type;
  };

  visit(doc);

  if (totalLines === 0) return EMPTY_METRICS;

  // A script with any content is never "0 pages"; the floor is a tenth.
  const pages = Math.max(0.1, Math.round((totalLines / LINES_PER_PAGE) * 10) / 10);
  const runtimeMinutes = Math.max(1, Math.round(totalLines / LINES_PER_PAGE));

  return { pages, runtimeMinutes, sceneCount, wordCount, lines: totalLines };
}
