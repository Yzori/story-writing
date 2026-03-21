import "server-only";
/**
 * Session-to-Chapter Compilation
 *
 * Transforms an array of campaign turns into Tiptap-compatible HTML
 * for publishing as a chapter draft. Replicates the prose assembly
 * logic from StoryCanvas (paragraph grouping, name tracking,
 * dialogue verb variation) on the server side.
 */

interface CompileTurn {
  id: string;
  userId: string;
  characterName: string | null;
  type: string;
  content: string;
  metadata: string | null;
}

export interface CompileOptions {
  sessionTitle: string;
  sessionOpening: string | null;
  turns: CompileTurn[];
}

// ── Dialogue verb cycle ──────────────────────────────────────

const DIALOGUE_VERBS = ["said", "replied", "called out", "murmured", "whispered"];

// ── Merge logic (mirrors StoryCanvas.shouldMerge) ────────────

function shouldMerge(prev: CompileTurn, next: CompileTurn): boolean {
  if (prev.type === "scene-break" || next.type === "scene-break") return false;
  if (prev.type === "illustration" || next.type === "illustration") return false;

  const gmTypes = ["narration", "consequence"];
  const playerProseTypes = ["action", "dialogue", "reaction", "description"];

  // GM narration + consequence merge
  if (gmTypes.includes(prev.type) && gmTypes.includes(next.type)) return true;
  // Same character's consecutive turns merge
  if (
    prev.userId === next.userId &&
    playerProseTypes.includes(prev.type) &&
    playerProseTypes.includes(next.type)
  )
    return true;
  // Description merges into preceding narration
  if (gmTypes.includes(prev.type) && next.type === "description") return true;
  // Reaction merges only with same character's preceding turn
  if (
    next.type === "reaction" &&
    prev.userId === next.userId &&
    playerProseTypes.includes(prev.type)
  )
    return true;

  return false;
}

// ── Group turns into paragraphs ──────────────────────────────

function groupIntoParagraphs(turns: CompileTurn[]): CompileTurn[][] {
  const paragraphs: CompileTurn[][] = [];
  for (const turn of turns) {
    const lastGroup = paragraphs[paragraphs.length - 1];
    if (lastGroup && shouldMerge(lastGroup[lastGroup.length - 1], turn)) {
      lastGroup.push(turn);
    } else {
      paragraphs.push([turn]);
    }
  }
  return paragraphs;
}

// ── Escape HTML special characters ───────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Render a single turn to an HTML fragment ─────────────────

function renderTurn(
  turn: CompileTurn,
  idx: number,
  group: CompileTurn[],
  globalIdx: number
): string {
  const charName = turn.characterName ?? "Someone";

  // Name tracking: don't repeat the name if same character was named
  // within the last 2 turns in this paragraph group
  const prevInGroup = group.slice(0, idx);
  const lastNamedSameChar = findLastIndex(
    prevInGroup,
    (t) =>
      t.characterName === charName &&
      ["action", "dialogue", "reaction"].includes(t.type)
  );
  const useFullName = lastNamedSameChar === -1 || idx - lastNamedSameChar > 2;

  const dialogueVerb = DIALOGUE_VERBS[globalIdx % DIALOGUE_VERBS.length];

  switch (turn.type) {
    case "narration":
    case "consequence":
      return `${esc(turn.content)} `;

    case "dialogue":
      if (globalIdx % 3 === 0 && useFullName) {
        // "Content," CharName verb.
        return `\u201c${esc(turn.content)},\u201d <strong>${esc(charName)}</strong> ${dialogueVerb}. `;
      }
      if (!useFullName) {
        return `\u201c${esc(turn.content)}\u201d `;
      }
      // CharName verb, "Content"
      return `<strong>${esc(charName)}</strong> ${dialogueVerb}, \u201c${esc(turn.content)}\u201d `;

    case "reaction":
      if (!useFullName) {
        return `<em>${esc(turn.content)}</em> `;
      }
      return `<em><strong>${esc(charName)}</strong> ${esc(turn.content)}</em> `;

    case "description":
      return `<em>${esc(turn.content)}</em> `;

    case "action":
    default:
      if (!useFullName) {
        return `${esc(turn.content)} `;
      }
      return `<strong>${esc(charName)}</strong> ${esc(turn.content)} `;
  }
}

// ── Main compilation function ────────────────────────────────

export function compileSessionToHTML(options: CompileOptions): string {
  const { sessionOpening, turns } = options;
  const parts: string[] = [];

  // Opening narration as a blockquote
  if (sessionOpening) {
    parts.push(`<blockquote><em>${esc(sessionOpening)}</em></blockquote>`);
  }

  // Filter out non-story turns
  const storyTurns = turns.filter(
    (t) => !["ooc", "roll", "roll-request"].includes(t.type)
  );

  const paragraphs = groupIntoParagraphs(storyTurns);

  let globalIdx = 0;
  for (const group of paragraphs) {
    // Scene-break turns render as an HR with optional title
    if (group[0].type === "scene-break") {
      let title = "";
      try {
        const meta = group[0].metadata ? JSON.parse(group[0].metadata) : {};
        title = meta.title ?? "";
      } catch {
        /* ignore */
      }

      if (title) {
        parts.push(
          `<p style="text-align:center"><em>\u2014 ${esc(title)} \u2014</em></p><hr>`
        );
      } else {
        parts.push("<hr>");
      }
      globalIdx += group.length;
      continue;
    }

    // Illustration turns render as figures
    if (group[0].type === "illustration") {
      let imageUrl = "";
      let caption = "";
      try {
        const meta = group[0].metadata ? JSON.parse(group[0].metadata) : {};
        imageUrl = meta.imageUrl ?? "";
        caption = meta.caption ?? "";
      } catch {
        /* ignore */
      }

      if (imageUrl) {
        const figcaption = caption
          ? `<figcaption><em>${esc(caption)}</em></figcaption>`
          : "";
        parts.push(
          `<figure><img src="${esc(imageUrl)}" alt="${esc(caption || "Illustration")}" style="max-width:100%;border-radius:12px" />${figcaption}</figure>`
        );
      }
      globalIdx += group.length;
      continue;
    }

    // Normal paragraph: assemble turn fragments
    let html = "<p>";
    for (let ti = 0; ti < group.length; ti++) {
      html += renderTurn(group[ti], ti, group, globalIdx + ti);
    }
    html = html.trimEnd() + "</p>";
    parts.push(html);

    globalIdx += group.length;
  }

  return parts.join("\n");
}

// ── Utility: findLastIndex polyfill ──────────────────────────

function findLastIndex<T>(
  arr: T[],
  predicate: (item: T) => boolean
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
