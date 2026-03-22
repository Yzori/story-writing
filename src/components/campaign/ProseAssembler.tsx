import type { Turn } from "@/types/campaign";

// ── Prose Assembly Engine ──────────────────────────────────
// Groups turns into paragraphs and handles name/pronoun tracking

// Dialogue verb templates — cycle through for variety
export const DIALOGUE_VERBS = ["said", "replied", "called out", "murmured", "whispered"];

// Mood-to-class lookup for scene breaks (Tailwind needs full class strings)
export const SCENE_BREAK_MOOD_CLASSES: Record<string, { line: string; text: string; textFaded: string }> = {
  tense: { line: "via-rose/30", text: "text-rose/60", textFaded: "text-rose/40" },
  calm: { line: "via-sage/30", text: "text-sage/60", textFaded: "text-sage/40" },
  ominous: { line: "via-violet/30", text: "text-violet/60", textFaded: "text-violet/40" },
  triumphant: { line: "via-amber/30", text: "text-amber/60", textFaded: "text-amber/40" },
  melancholy: { line: "via-indigo-400/30", text: "text-indigo-400/60", textFaded: "text-indigo-400/40" },
  chaotic: { line: "via-orange-400/30", text: "text-orange-400/60", textFaded: "text-orange-400/40" },
  mysterious: { line: "via-cyan-400/30", text: "text-cyan-400/60", textFaded: "text-cyan-400/40" },
  romantic: { line: "via-pink-400/30", text: "text-pink-400/60", textFaded: "text-pink-400/40" },
};
export const DEFAULT_SCENE_BREAK_CLASSES = { line: "via-text-ghost/30", text: "text-text-secondary", textFaded: "text-text-tertiary" };

// Should two consecutive turns merge into the same paragraph?
export function shouldMerge(prev: Turn, next: Turn): boolean {
  // Scene breaks and illustrations never merge
  if (prev.type === "scene-break" || next.type === "scene-break") return false;
  if (prev.type === "illustration" || next.type === "illustration") return false;

  const gmTypes = ["narration", "consequence"];
  const playerProseTypes = ["action", "dialogue", "reaction"];

  // GM narration + consequence merge
  if (gmTypes.includes(prev.type) && gmTypes.includes(next.type)) return true;
  // Same character's consecutive turns merge
  if (prev.userId === next.userId && playerProseTypes.includes(prev.type) && playerProseTypes.includes(next.type)) return true;
  // Description merges into preceding narration
  if (gmTypes.includes(prev.type) && next.type === "description") return true;
  // Reaction merges only with same character's preceding turn
  if (next.type === "reaction" && prev.userId === next.userId && playerProseTypes.includes(prev.type)) return true;

  return false;
}

// Group turns into paragraphs
export function groupIntoParagraphs(turns: Turn[]): Turn[][] {
  const groups: Turn[][] = [];
  for (const turn of turns) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && shouldMerge(lastGroup[lastGroup.length - 1], turn)) {
      lastGroup.push(turn);
    } else {
      groups.push([turn]);
    }
  }
  return groups;
}

// Mood tint and vignette color maps
export const MOOD_TINT_COLORS: Record<string, string> = {
  tense: "rgba(244,63,94,0.04)",
  calm: "rgba(120,180,130,0.04)",
  ominous: "rgba(139,92,246,0.06)",
  triumphant: "rgba(200,150,60,0.05)",
  melancholy: "rgba(99,102,241,0.05)",
  chaotic: "rgba(251,146,60,0.04)",
  mysterious: "rgba(34,211,238,0.04)",
  romantic: "rgba(236,72,153,0.04)",
};

export const MOOD_VIGNETTE_COLORS: Record<string, string> = {
  tense: "rgba(180,30,50,0.12)",
  ominous: "rgba(80,40,160,0.12)",
  death: "rgba(120,10,10,0.18)",
  melancholy: "rgba(50,50,140,0.10)",
  chaotic: "rgba(180,80,20,0.10)",
};
