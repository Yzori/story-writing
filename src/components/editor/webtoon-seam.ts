/**
 * Webtoon "seam" — the vertical space between panels. In a vertical-scroll comic
 * the gap IS pacing (the beat between moments), so it's an authored property, not
 * a fixed gutter. Shared by the editor canvas, the reader-true preview, and the
 * real WebtoonReader so a seam renders identically everywhere.
 */
export type Seam = "none" | "beat" | "pause" | "breath" | "blackout";

export const SEAM_ORDER: Seam[] = ["none", "beat", "pause", "breath", "blackout"];

export const SEAM_LABELS: Record<Seam, string> = {
  none: "Flush",
  beat: "Beat",
  pause: "Pause",
  breath: "Breath",
  blackout: "Blackout",
};

/** Top-margin applied to a panel based on the seam ABOVE it. */
const SEAM_MARGIN: Record<Seam, string> = {
  none: "",
  beat: "mt-4",
  pause: "mt-12",
  breath: "mt-24",
  blackout: "mt-44",
};

export function normalizeSeam(value: string | null | undefined): Seam {
  return value && (SEAM_ORDER as string[]).includes(value) ? (value as Seam) : "none";
}

/**
 * Class for the vertical space above a panel. The first panel never gets a seam.
 * The canvas/reader background is `bg-void` (near-black), so larger seams read as
 * intentional dark space — "blackout" is just the most of it.
 */
export function getSeamClass(seam: string | null | undefined, isFirst: boolean): string {
  if (isFirst) return "";
  return SEAM_MARGIN[normalizeSeam(seam)];
}

/** Next seam in the cycle — for a click-to-cycle control. */
export function nextSeam(seam: string | null | undefined): Seam {
  const i = SEAM_ORDER.indexOf(normalizeSeam(seam));
  return SEAM_ORDER[(i + 1) % SEAM_ORDER.length];
}
