/**
 * Compute the character offset of a DOM position (node + offset) within
 * a container's textContent. Walks text nodes via TreeWalker.
 */
export function getTextOffset(
  container: HTMLElement,
  node: Node,
  offset: number
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let charCount = 0;

  let current = walker.nextNode();
  while (current) {
    if (current === node) {
      return charCount + offset;
    }
    charCount += (current.textContent?.length ?? 0);
    current = walker.nextNode();
  }

  // Fallback: if node is not a text node, try to find it by walking
  // This handles cases where the selection anchor is an element node
  return charCount;
}

/**
 * Find the DOM Range corresponding to a start/end character offset
 * within a container's textContent.
 */
export function offsetToRange(
  container: HTMLElement,
  startOffset: number,
  endOffset: number
): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  let charCount = 0;
  let startSet = false;
  let current = walker.nextNode();

  while (current) {
    const len = current.textContent?.length ?? 0;

    if (!startSet && charCount + len > startOffset) {
      range.setStart(current, startOffset - charCount);
      startSet = true;
    }

    if (startSet && charCount + len >= endOffset) {
      range.setEnd(current, endOffset - charCount);
      return range;
    }

    charCount += len;
    current = walker.nextNode();
  }

  return null;
}

export interface AnnotationData {
  id: string;
  startOffset: number;
  endOffset: number;
  content: string;
  visibility: string;
  userId: string;
  displayName: string | null;
}

/**
 * Apply highlight marks to annotated text ranges within a container.
 * Clears existing marks first, then applies new ones.
 */
export function highlightAnnotations(
  container: HTMLElement,
  annotationsList: AnnotationData[],
  currentUserId?: string | null
) {
  // Clear existing marks
  container.querySelectorAll("mark[data-annotation-id]").forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }
  });

  // Sort by startOffset descending so inserting marks doesn't shift offsets
  const sorted = [...annotationsList].sort(
    (a, b) => b.startOffset - a.startOffset
  );

  for (const ann of sorted) {
    const range = offsetToRange(container, ann.startOffset, ann.endOffset);
    if (!range) continue;

    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", ann.id);
    mark.className =
      ann.visibility === "public"
        ? "bg-lavender/15 border-b border-lavender/30 cursor-pointer rounded-sm"
        : ann.userId === currentUserId
        ? "bg-gold/10 border-b border-gold/20 cursor-pointer rounded-sm"
        : "";

    try {
      range.surroundContents(mark);
    } catch {
      // surroundContents fails if range spans multiple elements
      // Fall back to extracting and wrapping
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
  }
}
