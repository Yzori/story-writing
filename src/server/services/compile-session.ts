import "server-only";
import { isLogTurnType, parseIllustrationMetadata, parseSceneBreakMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";
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

export interface CompileMark {
  characterName: string;
  kind: "scar" | "vow" | "debt" | "memory";
  text: string;
}

/** One hand that made the book — for the colophon and the block stamps. */
export interface CompileContributor {
  userId: string;
  /** In-book identity: a character's name, or "the Director". */
  role: string;
  /** The human behind it. */
  displayName: string;
  /** Words this hand contributed (story turns only). */
  words: number;
  isDirector: boolean;
}

/** How the take is split — the same resolution distributeEarnings pays from. */
export interface CompileSplit {
  shares: { userId: string; percent: number }[];
  usedAgreement: boolean;
  ownerId: string;
}

export interface CompileOptions {
  sessionTitle: string;
  sessionOpening: string | null;
  turns: CompileTurn[];
  /** Marks created during THIS session (server-filtered by sessionId). */
  marks?: CompileMark[];
  /**
   * Lines the audience set in gold during play (The House). Their fragments
   * compile wrapped in data-gilded markup so the shimmer survives into the
   * published chapter — the paid applause outlives the session.
   */
  gildedTurnIds?: string[];
  /**
   * The hands that made this — drives the block provenance stamps and the
   * colophon. When present, the book knows (and shows) it was co-authored.
   */
  contributors?: CompileContributor[];
  /** How earnings split — shown in the colophon beside the contributions. */
  split?: CompileSplit | null;
  /** The running GM's userId, for stamping narration blocks as the Director. */
  gmUserId?: string | null;
}

// ── Dialogue verb cycle ──────────────────────────────────────


// ── Merge logic (mirrors StoryCanvas.shouldMerge) ────────────

function shouldMerge(prev: CompileTurn, next: CompileTurn): boolean {
  if (prev.type === "scene-break" || next.type === "scene-break") return false;
  if (prev.type === "story-moment" || next.type === "story-moment") return false;
  if (prev.type === "illustration" || next.type === "illustration") return false;

  const gmTypes = ["narration", "consequence"];
  const playerProseTypes = ["action", "dialogue", "reaction"];

  // GM narration + consequence merge
  if (gmTypes.includes(prev.type) && gmTypes.includes(next.type)) return true;
  // Same character's consecutive turns merge
  if (
    prev.userId === next.userId &&
    playerProseTypes.includes(prev.type) &&
    playerProseTypes.includes(next.type)
  )
    return true;
  // Description merges into preceding narration — but only the same author's,
  // so every compiled paragraph stays single-author (the invariant the
  // provenance stamp relies on). A player's description starts its own block.
  if (gmTypes.includes(prev.type) && next.type === "description" && prev.userId === next.userId)
    return true;
  // Reaction merges only with same character's preceding turn
  if (
    next.type === "reaction" &&
    prev.userId === next.userId &&
    playerProseTypes.includes(prev.type)
  )
    return true;

  return false;
}

// ── Opening-turn detection ───────────────────────────────────

// Session activation inserts the opening narration as a turn with
// metadata {"opening": true} (sessions/[sessionId]/route.ts) while the
// session row keeps its `opening` column. When we render sessionOpening
// as the blockquote, that turn must be skipped or the opening appears twice.
function isOpeningTurn(turn: CompileTurn): boolean {
  if (turn.type !== "narration" || !turn.metadata) return false;
  try {
    const parsed = JSON.parse(turn.metadata) as { opening?: unknown } | null;
    return parsed?.opening === true;
  } catch {
    return false;
  }
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
  group: CompileTurn[]
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

  switch (turn.type) {
    case "narration":
    case "consequence":
      return `${esc(turn.content)} `;

    case "dialogue":
      // Deterministic attribution with the neutral "said" (audit P2): never
      // mis-tones a line, and identical input always compiles the same way.
      if (!useFullName) {
        return `\u201c${esc(turn.content)}\u201d `;
      }
      return `<strong>${esc(charName)}</strong> said, \u201c${esc(turn.content)}\u201d `;

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

// ── Marks coda — italic closing lines listing what carried forward ──

const MARK_PHRASE: Record<CompileMark["kind"], (name: string, text: string) => string> = {
  scar: (name, text) => `${name} carried it from then on — ${text}`,
  vow: (name, text) => `${name} made a quiet vow — ${text}`,
  debt: (name, text) => `${name} owed something then — ${text}`,
  memory: (name, text) => `${name} kept that moment — ${text}`,
};

// ── Provenance ───────────────────────────────────────────────

// Every compiled paragraph is single-author (shouldMerge only groups a hand
// with itself), so a block wears exactly one author. Stamp it, invisibly, so
// the book stays machine-readable about who wrote what.
function authorAttrs(userId: string, name: string): string {
  return ` data-author="${esc(userId)}" data-author-name="${esc(name)}"`;
}

function groupAuthorAttrs(
  group: CompileTurn[],
  gmUserId: string | null | undefined
): string {
  const t = group[0];
  const name =
    t.characterName ?? (gmUserId && t.userId === gmUserId ? "the Director" : "a writer");
  return authorAttrs(t.userId, name);
}

// ── The colophon — the hands that made this, and how the take splits ──

const CODA_HR = `<hr style="border-color:rgba(243,180,97,0.18); margin-top:2em">`;

// The byline — a designed chapter opening. Sits above the opening line, in the
// body itself so it survives export and sharing (the title is the chapter's
// own; this names the hands). Humans, not characters — "by the table".
function renderByline(contributors: CompileContributor[] | undefined): string {
  if (!contributors || contributors.length === 0) return "";
  const names = contributors.map((c) => c.displayName);
  let who: string;
  if (names.length === 1) {
    who = esc(names[0]);
  } else if (names.length === 2) {
    who = `the table — ${esc(names[0])} and ${esc(names[1])}`;
  } else {
    const last = names[names.length - 1];
    who = `the table — ${names.slice(0, -1).map(esc).join(", ")}, and ${esc(last)}`;
  }
  return `<p style="text-align:center; font-style:italic; opacity:0.75; margin-bottom:1.5em">by ${who}</p>`;
}

function renderColophon(
  contributors: CompileContributor[] | undefined,
  split: CompileSplit | null | undefined
): string {
  if (!contributors || contributors.length === 0) return "";

  const nameFor = (userId: string) =>
    contributors.find((c) => c.userId === userId)?.displayName ?? "a writer";

  const lines = contributors.map((c) => {
    const words = `${c.words.toLocaleString()} ${c.words === 1 ? "word" : "words"}`;
    return `<p style="text-align:center; margin:0.15em 0"><em>${esc(c.role)}</em> — <strong>${esc(c.displayName)}</strong> · ${words}</p>`;
  });

  let splitLine = "";
  if (split && split.shares.length > 0) {
    if (split.usedAgreement) {
      const parts = split.shares
        .filter((s) => s.percent > 0)
        .map((s) => `${esc(nameFor(s.userId))} ${Math.round(s.percent)}%`);
      splitLine = `<p style="text-align:center; font-size:0.9em; margin-top:0.7em"><em>The take is split as signed — ${parts.join(" · ")}.</em></p>`;
    } else if (split.shares.length > 1) {
      splitLine = `<p style="text-align:center; font-size:0.9em; margin-top:0.7em"><em>No split was signed — the take is shared evenly among the table.</em></p>`;
    } else {
      splitLine = `<p style="text-align:center; font-size:0.9em; margin-top:0.7em"><em>No split was signed — the take goes to ${esc(nameFor(split.ownerId))}.</em></p>`;
    }
  }

  return `${CODA_HR}\n<p style="text-align:center"><strong>The hands that made this</strong></p>\n${lines.join("\n")}\n${splitLine}`;
}

function renderMarksCoda(marks: CompileMark[]): string {
  if (marks.length === 0) return "";
  const lines = marks
    .map((m) => {
      const renderer = MARK_PHRASE[m.kind];
      if (!renderer) return "";
      return `<p style="text-align:center"><em>${esc(renderer(m.characterName, m.text))}</em></p>`;
    })
    .filter(Boolean);
  if (lines.length === 0) return "";
  // Separator + the lines, tucked at the end of the chapter as a quiet coda.
  return `<hr style="border-color:rgba(243,180,97,0.18); margin-top:2em">\n${lines.join("\n")}`;
}

export function compileSessionToHTML(options: CompileOptions): string {
  const { sessionOpening, turns, marks = [], contributors, split, gmUserId } = options;
  const gilded = new Set(options.gildedTurnIds ?? []);
  const parts: string[] = [];

  // Byline first — the designed opening, the hands named up top.
  const byline = renderByline(contributors);
  if (byline) parts.push(byline);

  // Opening narration as a blockquote — the Director's hand.
  if (sessionOpening) {
    const openAttrs = gmUserId ? authorAttrs(gmUserId, "the Director") : "";
    parts.push(`<blockquote${openAttrs}><em>${esc(sessionOpening)}</em></blockquote>`);
  }

  // Filter out non-story turns, plus the activation-inserted opening turn
  // when the opening is already rendered from the session row above —
  // otherwise the opening narration appears twice, back to back. If the
  // session's opening column was cleared after activation, keep the turn
  // so the text still compiles once.
  const storyTurns = turns.filter(
    (turn) =>
      !isLogTurnType(turn.type) && !(sessionOpening && isOpeningTurn(turn))
  );

  const paragraphs = groupIntoParagraphs(storyTurns);

  for (const group of paragraphs) {
    const stamp = groupAuthorAttrs(group, gmUserId);

    // Scene-break turns render as an HR with optional title
    if (group[0].type === "scene-break") {
      const meta = parseSceneBreakMetadata(group[0].metadata);
      const title = meta?.title ?? "";

      if (meta?.cinematic) {
        const text = group[0].content || title;
        if (text) {
          parts.push(`<p style="text-align:center"${stamp}><em>${esc(text)}</em></p>`);
        }
        continue;
      }

      if (title) {
        parts.push(
          `<p style="text-align:center"${stamp}><em>\u2014 ${esc(title)} \u2014</em></p><hr>`
        );
      } else {
        parts.push("<hr>");
      }
      continue;
    }

    if (group[0].type === "story-moment") {
      const meta = parseStoryMomentMetadata(group[0].metadata);
      const subtext = meta?.subtext ?? "";
      const majorStyle = meta?.importance === "major"
        ? "font-size:1.15em; font-weight:600"
        : "";
      parts.push(
        `<div class="story-moment" data-story-moment="true" data-mood="${esc(meta?.mood ?? "ominous")}"${stamp}><p style="text-align:center; ${majorStyle}"><em>${esc(group[0].content)}</em></p>${subtext ? `<p style="text-align:center"><span style="font-size:0.88em"><em>${esc(subtext)}</em></span></p>` : ""}</div>`
      );
      continue;
    }

    // Illustration turns render as figures
    if (group[0].type === "illustration") {
      const meta = parseIllustrationMetadata(group[0].metadata);
      const imageUrl = meta?.imageUrl ?? "";
      const caption = meta?.caption ?? "";

      if (imageUrl) {
        const figcaption = caption
          ? `<figcaption><em>${esc(caption)}</em></figcaption>`
          : "";
        parts.push(
          `<figure${stamp}><img src="${esc(imageUrl)}" alt="${esc(caption || "Illustration")}" style="max-width:100%;border-radius:12px" />${figcaption}</figure>`
        );
      }
      continue;
    }

    // Normal paragraph: assemble turn fragments. A gilded turn's fragment
    // keeps its gold leaf ([data-gilded] styling in globals.css).
    let html = `<p${stamp}>`;
    for (let ti = 0; ti < group.length; ti++) {
      const fragment = renderTurn(group[ti], ti, group);
      html += gilded.has(group[ti].id)
        ? `<span data-gilded="true">${fragment.trimEnd()}</span> `
        : fragment;
    }
    html = html.trimEnd() + "</p>";
    parts.push(html);

  }

  const coda = renderMarksCoda(marks);
  if (coda) parts.push(coda);

  // The colophon last: the hands that made this, and how the take splits.
  const colophon = renderColophon(contributors, split);
  if (colophon) parts.push(colophon);

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
