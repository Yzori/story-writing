/**
 * Simple word-level diff for comparing chapter versions.
 * Returns an array of diff segments with type: "equal" | "added" | "removed".
 */

export interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

/**
 * Strip HTML tags and normalize whitespace for plain-text diffing.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Tokenize text into words and whitespace for word-level diffing.
 */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Compute longest common subsequence length table (Myers-like for small inputs).
 * For large texts, we use a simplified approach with bounded context.
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  // For very large texts, chunk comparison
  if (m > 2000 || n > 2000) {
    return lcsTableChunked(a, b);
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Chunked LCS for large texts — compare in blocks to stay within memory.
 */
function lcsTableChunked(a: string[], b: string[]): number[][] {
  // Fallback: just use the simple approach with truncation
  const maxLen = 2000;
  const aSlice = a.slice(0, maxLen);
  const bSlice = b.slice(0, maxLen);
  const dp: number[][] = Array.from({ length: aSlice.length + 1 }, () => new Array(bSlice.length + 1).fill(0));
  for (let i = 1; i <= aSlice.length; i++) {
    for (let j = 1; j <= bSlice.length; j++) {
      if (aSlice[i - 1] === bSlice[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Backtrack through LCS table to produce diff segments.
 */
function backtrack(dp: number[][], a: string[], b: string[]): DiffSegment[] {
  const result: DiffSegment[] = [];
  let i = Math.min(a.length, dp.length - 1);
  let j = Math.min(b.length, dp[0].length - 1);

  const stack: DiffSegment[] = [];

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      stack.push({ type: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      stack.push({ type: "removed", text: a[i - 1] });
      i--;
    } else {
      stack.push({ type: "added", text: b[j - 1] });
      j--;
    }
  }

  while (i > 0) {
    stack.push({ type: "removed", text: a[i - 1] });
    i--;
  }
  while (j > 0) {
    stack.push({ type: "added", text: b[j - 1] });
    j--;
  }

  // Reverse and merge consecutive segments of same type
  stack.reverse();
  for (const seg of stack) {
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text;
    } else {
      result.push({ ...seg });
    }
  }

  // Handle remainder if text was truncated
  if (a.length > dp.length - 1) {
    const remaining = a.slice(dp.length - 1).join("");
    if (remaining) result.push({ type: "removed", text: remaining });
  }
  if (b.length > dp[0].length - 1) {
    const remaining = b.slice(dp[0].length - 1).join("");
    if (remaining) result.push({ type: "added", text: remaining });
  }

  return result;
}

/**
 * Compute a word-level diff between two HTML strings.
 * Returns segments suitable for rendering with highlights.
 */
export function computeDiff(oldHtml: string, newHtml: string): DiffSegment[] {
  const oldText = stripHtml(oldHtml);
  const newText = stripHtml(newHtml);

  if (oldText === newText) {
    return [{ type: "equal", text: newText }];
  }

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const dp = lcsTable(oldTokens, newTokens);
  return backtrack(dp, oldTokens, newTokens);
}

/**
 * Compute diff statistics.
 */
export function diffStats(segments: DiffSegment[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
    if (seg.type === "added") added += words;
    if (seg.type === "removed") removed += words;
  }
  return { added, removed };
}
