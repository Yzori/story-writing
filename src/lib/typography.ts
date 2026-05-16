import type { TypographySettings } from "@/types/editor";
import { createTypography } from "@/types/editor";

export const SCENE_BREAK_STYLE_VALUES = [
  "asterism",
  "fleuron",
  "dots",
  "line",
  "text-line",
  "space",
] as const;

const LINE_SPACING_VALUES = ["compact", "comfortable", "relaxed"] as const;
const TEXT_ALIGNMENT_VALUES = ["left", "center", "justified"] as const;
const PARAGRAPH_SPACING_VALUES = ["tight", "normal", "loose"] as const;

type StoryTypographyFields = Partial<TypographySettings> & {
  paragraphIndent?: boolean | null;
  lineSpacing?: string | null;
  textAlignment?: string | null;
  paragraphSpacing?: string | null;
};

function includesValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function normalizeTypographySettings(
  input?: StoryTypographyFields | null
): TypographySettings {
  const defaults = createTypography();
  if (!input) return defaults;

  return {
    dropCaps: input.dropCaps ?? defaults.dropCaps,
    sceneBreakStyle: includesValue(SCENE_BREAK_STYLE_VALUES, input.sceneBreakStyle)
      ? input.sceneBreakStyle
      : defaults.sceneBreakStyle,
    paragraphIndent: input.paragraphIndent ?? defaults.paragraphIndent,
    lineSpacing: includesValue(LINE_SPACING_VALUES, input.lineSpacing)
      ? input.lineSpacing
      : defaults.lineSpacing,
    textAlignment: includesValue(TEXT_ALIGNMENT_VALUES, input.textAlignment)
      ? input.textAlignment
      : defaults.textAlignment,
    paragraphSpacing: includesValue(PARAGRAPH_SPACING_VALUES, input.paragraphSpacing)
      ? input.paragraphSpacing
      : defaults.paragraphSpacing,
  };
}

export function typographyClassName(settings?: StoryTypographyFields | null): string {
  const typography = normalizeTypographySettings(settings);
  return [
    typography.dropCaps ? "drop-caps" : "",
    `scene-break-${typography.sceneBreakStyle}`,
    typography.paragraphIndent ? "typography-indent" : "",
    `typography-line-${typography.lineSpacing}`,
    `typography-align-${typography.textAlignment}`,
    `typography-paragraph-${typography.paragraphSpacing}`,
  ]
    .filter(Boolean)
    .join(" ");
}
