import { Chapter } from "@/types/editor";

export interface SearchMatch {
  chapterId: string;
  chapterTitle: string;
  index: number;
  context: string; // surrounding text snippet
  position: number; // char position in plain text
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

export function searchInChapters(
  chapters: Chapter[],
  query: string,
  options: SearchOptions
): SearchMatch[] {
  if (!query) return [];

  const matches: SearchMatch[] = [];
  const flags = options.caseSensitive ? "g" : "gi";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  const regex = new RegExp(pattern, flags);

  for (const chapter of chapters) {
    const text = stripHtml(chapter.content);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + query.length + 40);
      const context = (start > 0 ? "..." : "") +
        text.slice(start, end) +
        (end < text.length ? "..." : "");

      matches.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        index: matches.filter((m) => m.chapterId === chapter.id).length,
        context,
        position: match.index,
      });
    }
  }

  return matches;
}

/**
 * Replace text in HTML content by operating on text nodes via DOMParser.
 */
export function replaceInHtml(
  html: string,
  query: string,
  replacement: string,
  options: SearchOptions,
  replaceAll: boolean = true
): string {
  if (!query || !html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstChild;
  if (!container) return html;

  const flags = options.caseSensitive ? "g" : "gi";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  const regex = new RegExp(pattern, replaceAll ? flags : flags.replace("g", ""));

  // Escape $ in replacement to prevent backreference interpretation ($&, $1, etc.)
  const safeReplacement = replacement.replace(/\$/g, '$$$$');
  let replaced = false;

  function walkTextNodes(node: Node) {
    if (!replaceAll && replaced) return;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const original = node.textContent;
      if (replaceAll) {
        node.textContent = original.replace(regex, safeReplacement);
      } else if (!replaced) {
        const match = regex.exec(original);
        if (match) {
          node.textContent =
            original.slice(0, match.index) +
            replacement +
            original.slice(match.index + match[0].length);
          replaced = true;
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i]);
      }
    }
  }

  walkTextNodes(container);

  return container instanceof HTMLElement ? container.innerHTML : html;
}
