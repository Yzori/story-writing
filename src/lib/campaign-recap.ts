import type { PlayerCharacter, Turn } from "@/types/campaign";
import { parseRollMetadata, parseSceneBreakMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";

// ── Session highlights ───────────────────────────────────────
// Pure extraction shared by the in-session highlights rail and the end-of-
// session Episode Card. Kept framework-free so it stays testable.

export interface Highlight {
  icon: string;
  label: string;
  text: string;
  color: string; // tailwind text color
}

export function extractHighlights(storyTurns: Turn[], logTurns: Turn[]): Highlight[] {
  const highlights: Highlight[] = [];

  // Single-pass through story turns: extract scene breaks, deaths, and count stats
  let playerTurnCount = 0;
  let gmTurnCount = 0;
  let sceneCount = 0;

  for (const t of storyTurns) {
    // Stats counting
    if (t.type === "narration" || t.type === "consequence") {
      gmTurnCount++;
    } else if (t.type === "scene-break") {
      sceneCount++;
    } else if (t.type === "story-moment") {
      gmTurnCount++;
    } else {
      playerTurnCount++;
    }

    // Scene break highlights (scenes, story moments, deaths)
    if (t.type === "scene-break" && t.metadata) {
      const meta = parseSceneBreakMetadata(t.metadata);
      if (!meta) continue;
      if (meta.cinematic && meta.title) {
        highlights.push({
          icon: meta.mood === "death" ? "💀" : "✨",
          label: "Story Moment",
          text: meta.title,
          color: meta.mood === "death" ? "text-rose" : "text-amber",
        });
      } else if (meta.mood === "death" && !meta.cinematic) {
        highlights.push({
          icon: "†",
          label: "Fallen",
          text: meta.title || "A hero has fallen",
          color: "text-rose",
        });
      } else if (meta.title) {
        highlights.push({
          icon: "🎬",
          label: "Scene",
          text: meta.title,
          color: "text-text-secondary",
        });
      }
    }

    if (t.type === "story-moment") {
      const meta = parseStoryMomentMetadata(t.metadata);
      highlights.push({
        icon: meta?.mood === "death" ? "💀" : meta?.importance === "major" ? "✦" : "✨",
        label: "Story Moment",
        text: t.content,
        color: meta?.mood === "death" ? "text-rose" : "text-amber",
      });
    }
  }

  // Single-pass through log turns: dramatic rolls and roll count
  let rollCount = 0;
  for (const t of logTurns) {
    if (t.type !== "roll") continue;
    rollCount++;
    if (!t.metadata) continue;
    const meta = parseRollMetadata(t.metadata);
    if (!meta) continue;
    const total = meta.total ?? meta.result ?? 0;
    const tier = meta.tier ?? "";
    const charName = t.characterName ?? t.user?.displayName ?? "Someone";

    if (tier === "success" && total >= 11) {
      highlights.push({
        icon: "🎲",
        label: "Critical Roll",
        text: `${charName} rolled ${total} — a triumphant success`,
        color: "text-amber",
      });
    } else if (tier === "failure" && total <= 4) {
      highlights.push({
        icon: "🎲",
        label: "Dramatic Failure",
        text: `${charName} rolled ${total} — a devastating miss`,
        color: "text-red-400",
      });
    }
  }

  // Session stats summary
  const totalTurns = playerTurnCount + gmTurnCount;
  if (totalTurns > 0) {
    const parts: string[] = [];
    parts.push(`${totalTurns} turns written`);
    if (sceneCount > 0) parts.push(`${sceneCount} scene${sceneCount > 1 ? "s" : ""}`);
    if (rollCount > 0) parts.push(`${rollCount} roll${rollCount > 1 ? "s" : ""}`);

    highlights.push({
      icon: "📜",
      label: "Session Stats",
      text: parts.join(" · "),
      color: "text-text-secondary",
    });
  }

  return highlights;
}

// ── Episode Card recap ───────────────────────────────────────
// The peak-end keepsake: the session's defining beats, the marks it left on
// the cast, and the closing thought — assembled from data the session already
// records so it can be rendered to screen and shared as an image.

const MARK_GLYPH: Record<string, string> = {
  scar: "⚔", // ⚔
  vow: "✳", // ✳
  debt: "⛓", // ⛓
  memory: "✦", // ✦
};

const MARK_LABEL: Record<string, string> = {
  scar: "Scar",
  vow: "Vow",
  debt: "Debt",
  memory: "Memory",
};

export interface RecapBeat {
  glyph: string;
  label: string;
  text: string;
}

export interface RecapMark {
  glyph: string;
  label: string;
  text: string;
  character: string;
}

export interface EpisodeRecap {
  title: string;
  beats: RecapBeat[];
  marks: RecapMark[];
  stats: string | null;
  epilogue: string | null;
  cliffhanger: string | null;
  isEmpty: boolean;
}

export interface EpisodeRecapInput {
  storyTurns: Turn[];
  logTurns: Turn[];
  characters: PlayerCharacter[];
  sessionId: string;
  sessionTitle: string;
  epilogue?: string | null;
  cliffhanger?: string | null;
}

// How many dramatic beats / marks a single card can hold before it stops
// reading as a keepsake and starts reading as a changelog.
const MAX_BEATS = 6;
const MAX_MARKS = 4;

export function buildEpisodeRecap({
  storyTurns,
  logTurns,
  characters,
  sessionId,
  sessionTitle,
  epilogue,
  cliffhanger,
}: EpisodeRecapInput): EpisodeRecap {
  const highlights = extractHighlights(storyTurns, logTurns);

  // The trailing "Session Stats" highlight becomes the footer line, not a beat.
  const statsHighlight = highlights.find((h) => h.label === "Session Stats");
  const beats: RecapBeat[] = highlights
    .filter((h) => h.label !== "Session Stats")
    .slice(0, MAX_BEATS)
    .map((h) => ({ glyph: h.icon, label: h.label, text: h.text }));

  // Marks earned *this* session — the lasting damage and devotion.
  const marks: RecapMark[] = [];
  for (const c of characters) {
    for (const m of c.marks ?? []) {
      if (m.sessionId !== sessionId) continue;
      marks.push({
        glyph: MARK_GLYPH[m.kind] ?? "✦",
        label: MARK_LABEL[m.kind] ?? "Mark",
        text: m.text,
        character: c.name,
      });
      if (marks.length >= MAX_MARKS) break;
    }
    if (marks.length >= MAX_MARKS) break;
  }

  const epi = epilogue?.trim() || null;
  const cliff = cliffhanger?.trim() || null;

  return {
    title: sessionTitle,
    beats,
    marks,
    stats: statsHighlight?.text ?? null,
    epilogue: epi,
    cliffhanger: cliff,
    isEmpty: beats.length === 0 && marks.length === 0 && !epi,
  };
}
