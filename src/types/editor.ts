/**
 * Client-side data models and factories for the Quiloria editor.
 */

import { ContentRating, StoryStatus } from "@/config/genres";

// ── Core ────────────────────────────────────────────────────

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  // Per-chapter controls
  status: "draft" | "published";
  authorNoteBefore: string;
  authorNoteAfter: string;
  // Outline
  outline: string;
  // Optimistic locking
  version: number;
  // The Hemingway bridge — a line left for tomorrow-you on the way out
  bridgeNote?: string | null;
  // Version history
  snapshots: ChapterSnapshot[];
}

export interface ChapterSnapshot {
  id: string;
  content: string;
  wordCount: number;
  createdAt: number;
  label: string;
  userId?: string;
  userName?: string;
  version?: number;
}

// ── Front Matter ────────────────────────────────────────────

export interface FrontMatter {
  epigraph: string;
  epigraphAttribution: string;
  foreword: string;
  showToc: boolean;
}

// ── Story Metadata ──────────────────────────────────────────

export interface StoryMetadata {
  coverImageDataUrl: string | null;
  synopsis: string;
  /** Author-curated 1-2 sentence pitch — surfaced on cards and feeds. */
  hook: string;
  genres: string[];
  contentRating: ContentRating;
  status: StoryStatus;
  language: string;
  dedication: string;
}

// ── Story Bible ─────────────────────────────────────────────

export interface StoryCharacter {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  imageDataUrl: string | null;
  color: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoryPlace {
  id: string;
  name: string;
  description: string;
  imageDataUrl: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoryNote {
  id: string;
  title: string;
  content: string;
  category: "lore" | "timeline" | "research" | "custom";
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoryBible {
  characters: StoryCharacter[];
  places: StoryPlace[];
  notes: StoryNote[];
}

// ── Writing Goals ───────────────────────────────────────────

export interface WritingSession {
  date: string; // "YYYY-MM-DD"
  wordsWritten: number;
  wordsAtStart: number;
  wordsAtEnd: number;
}

export interface WritingGoals {
  dailyWordTarget: number;
  sessions: WritingSession[];
}

// ── Typography Settings ─────────────────────────────────────

export interface TypographySettings {
  dropCaps: boolean;
  sceneBreakStyle: "asterism" | "fleuron" | "dots" | "line" | "text-line" | "space";
  paragraphIndent: boolean;
  lineSpacing: "compact" | "comfortable" | "relaxed";
  textAlignment: "left" | "center" | "justified";
  paragraphSpacing: "tight" | "normal" | "loose";
}

// ── Project ─────────────────────────────────────────────────

export interface StoryProject {
  id: string;
  title: string;
  format: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  metadata: StoryMetadata;
  frontMatter: FrontMatter;
  bible: StoryBible;
  goals: WritingGoals;
  typography: TypographySettings;
}

// ── Factories ───────────────────────────────────────────────

export function createChapter(title: string = "Untitled Chapter"): Chapter {
  return {
    id: crypto.randomUUID(),
    title,
    content: "",
    wordCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "draft",
    authorNoteBefore: "",
    authorNoteAfter: "",
    outline: "",
    version: 1,
    snapshots: [],
  };
}

export function createSnapshot(
  content: string,
  wordCount: number,
  label: string = ""
): ChapterSnapshot {
  return {
    id: crypto.randomUUID(),
    content,
    wordCount,
    createdAt: Date.now(),
    label: label || `Snapshot ${new Date().toLocaleString()}`,
  };
}

function createMetadata(): StoryMetadata {
  return {
    coverImageDataUrl: null,
    synopsis: "",
    hook: "",
    genres: [],
    contentRating: "everyone",
    status: "draft",
    language: "English",
    dedication: "",
  };
}

function createFrontMatter(): FrontMatter {
  return {
    epigraph: "",
    epigraphAttribution: "",
    foreword: "",
    showToc: true,
  };
}

function createBible(): StoryBible {
  return {
    characters: [],
    places: [],
    notes: [],
  };
}

function createGoals(): WritingGoals {
  return {
    dailyWordTarget: 1000,
    sessions: [],
  };
}

export function createTypography(): TypographySettings {
  return {
    dropCaps: false,
    sceneBreakStyle: "asterism",
    paragraphIndent: false,
    lineSpacing: "comfortable",
    textAlignment: "left",
    paragraphSpacing: "normal",
  };
}

export function createStoryProject(title: string = "Untitled Story"): StoryProject {
  const firstChapter = createChapter("Chapter 1");
  return {
    id: crypto.randomUUID(),
    title,
    format: "novel",
    chapters: [firstChapter],
    activeChapterId: firstChapter.id,
    metadata: createMetadata(),
    frontMatter: createFrontMatter(),
    bible: createBible(),
    goals: createGoals(),
    typography: createTypography(),
  };
}

/**
 * Migrate old project data that may lack new fields.
 */
export function migrateProject(raw: Record<string, unknown>): StoryProject {
  const base = createStoryProject();
  const project = { ...base, ...raw } as StoryProject;

  // Ensure nested objects exist
  if (!project.metadata) project.metadata = createMetadata();
  else project.metadata = { ...createMetadata(), ...project.metadata };

  if (!project.frontMatter) project.frontMatter = createFrontMatter();
  else project.frontMatter = { ...createFrontMatter(), ...project.frontMatter };

  if (!project.bible) project.bible = createBible();
  else {
    project.bible = {
      characters: project.bible.characters ?? [],
      places: project.bible.places ?? [],
      notes: project.bible.notes ?? [],
    };
  }

  if (!project.goals) project.goals = createGoals();
  else project.goals = { ...createGoals(), ...project.goals };

  if (!project.typography) project.typography = createTypography();
  else project.typography = { ...createTypography(), ...project.typography };

  // Migrate chapters
  project.chapters = project.chapters.map((ch) => ({
    ...createChapter(),
    ...ch,
    status: ch.status ?? "draft",
    authorNoteBefore: ch.authorNoteBefore ?? "",
    authorNoteAfter: ch.authorNoteAfter ?? "",
    outline: ch.outline ?? "",
    snapshots: ch.snapshots ?? [],
  }));

  return project;
}

// ── Story Bible Factories ───────────────────────────────────

export function createCharacter(name: string = "New Character"): StoryCharacter {
  return {
    id: crypto.randomUUID(),
    name,
    aliases: [],
    description: "",
    imageDataUrl: null,
    color: "#C48B4A",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createPlace(name: string = "New Place"): StoryPlace {
  return {
    id: crypto.randomUUID(),
    name,
    description: "",
    imageDataUrl: null,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createNote(title: string = "New Note"): StoryNote {
  return {
    id: crypto.randomUUID(),
    title,
    content: "",
    category: "custom",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Utilities ───────────────────────────────────────────────

export function countWords(text: string): number {
  const cleaned = text.replace(/<[^>]*>/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function estimateReadingTime(words: number): string {
  const minutes = Math.ceil(words / 238);
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

// ── Webtoon Text Overlays ───────────────────────────────────

export const BUBBLE_STYLES = [
  "speech",
  "thought",
  "narration",
  "shout",
  "caption",
  "sfx",
] as const;
export const TAIL_DIRECTIONS = [
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right",
  "none",
] as const;
export const OVERLAY_FONT_SIZES = ["small", "medium", "large"] as const;
export const BUBBLE_INKS = ["ink", "paper", "gold", "rose", "teal"] as const;

export type BubbleStyle = (typeof BUBBLE_STYLES)[number];
export type TailDirection = (typeof TAIL_DIRECTIONS)[number];
export type OverlayFontSize = (typeof OVERLAY_FONT_SIZES)[number];
export type BubbleInk = (typeof BUBBLE_INKS)[number];

/** Rotation is capped where lettering still reads as lettering, not decoration. */
export const OVERLAY_ROTATION_LIMIT = 45;
export const OVERLAY_SCALE_MIN = 0.5;
export const OVERLAY_SCALE_MAX = 2;
/** Matches the per-overlay text cap enforced server-side in validations.ts. */
export const OVERLAY_TEXT_MAX = 2000;

export interface TextOverlay {
  id: string;
  text: string;
  x: number;       // 0-100 percentage from left
  y: number;       // 0-100 percentage from top
  width: number;   // 0-100 percentage
  style: BubbleStyle;
  tailDirection: TailDirection;
  fontSize: OverlayFontSize;
  /** Lettering color scheme. Undefined keeps the style's own default palette. */
  ink?: BubbleInk;
  /** Degrees, -45..45. Undefined means the style's own tilt (SFX leans -4deg). */
  rotation?: number;
  /** Multiplier on the named font size, 0.5..2. Undefined means 1. */
  scale?: number;
}

export function createTextOverlay(x = 50, y = 50): TextOverlay {
  return {
    id: crypto.randomUUID(),
    text: "",
    x,
    y,
    width: 30,
    style: "speech",
    tailDirection: "bottom-left",
    fontSize: "medium",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampedNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Reads the `overlays` column, which is stored as an opaque JSON string and can
 * hold anything a past client wrote. Everything that reaches a class name or a
 * style attribute is whitelisted or clamped here, so the renderer never has to
 * trust the row. Legacy rows (no ink/rotation/scale) parse unchanged.
 */
export function parseOverlays(json: string): TextOverlay[] {
  if (!json || json === "[]") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((raw, index): TextOverlay[] => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;

    const overlay: TextOverlay = {
      id: typeof o.id === "string" && o.id ? o.id.slice(0, 100) : `overlay-${index}`,
      text: typeof o.text === "string" ? o.text.slice(0, OVERLAY_TEXT_MAX) : "",
      x: clampedNumber(o.x, 0, 100, 50),
      y: clampedNumber(o.y, 0, 100, 50),
      width: clampedNumber(o.width, 1, 100, 30),
      style: pick(o.style, BUBBLE_STYLES, "speech"),
      tailDirection: pick(o.tailDirection, TAIL_DIRECTIONS, "none"),
      fontSize: pick(o.fontSize, OVERLAY_FONT_SIZES, "medium"),
    };

    if (BUBBLE_INKS.includes(o.ink as BubbleInk)) overlay.ink = o.ink as BubbleInk;
    if (o.rotation !== undefined && o.rotation !== null) {
      overlay.rotation = clampedNumber(
        o.rotation,
        -OVERLAY_ROTATION_LIMIT,
        OVERLAY_ROTATION_LIMIT,
        0
      );
    }
    if (o.scale !== undefined && o.scale !== null) {
      overlay.scale = clampedNumber(o.scale, OVERLAY_SCALE_MIN, OVERLAY_SCALE_MAX, 1);
    }

    return [overlay];
  });
}
