/**
 * Format-aware writing prompts surfaced in the editor (and the public
 * /demo/try page) when a chapter is still empty or near-empty. The aim is to
 * unblock the first move; once the writer has momentum, prompts hide.
 *
 * Prompts are deliberately *technique* nudges, not story prompts — they teach
 * craft instead of giving away ideas. Inserts are scaffolds rather than
 * finished prose, so the writer stays in control of voice and specifics.
 */

export type WritingFormat =
  | "novel"
  | "poetry"
  | "screenplay"
  | "webtoon"
  | "illustrated";

interface PromptSet {
  /** Short label shown on the inline pill, ~3-5 words. */
  label: string;
  /** What gets inserted into the editor when accepted, italicized. */
  insert: string;
  /** Optional explainer shown on hover/focus. */
  hint?: string;
}

const PROMPTS: Record<WritingFormat, PromptSet[]> = {
  novel: [
    {
      label: "Drop into motion",
      insert: "[Someone] was already [doing something urgent] when [the interruption] arrived.",
      hint: "Skip the setup. Start with a person already moving toward or away from trouble.",
    },
    {
      label: "Use one sensation",
      insert: "The [place] smelled/sounded/felt like [one concrete detail].",
      hint: "Anchor the scene in one vivid sensation before explaining who is there.",
    },
    {
      label: "Start with conflict",
      insert: "\"[A line someone should not have said yet.]\"",
      hint: "Let the reader catch up. A charged first line buys you the next paragraph.",
    },
    {
      label: "Make ordinary wrong",
      insert: "[A normal routine]. Then [one detail that should not be there].",
      hint: "Two beats: the mundane, then the small thing that tilts it.",
    },
  ],

  poetry: [
    {
      label: "Name an image",
      insert: "[A concrete object]. [One precise detail about it].",
      hint: "Begin with the noun, not the action. Let the image breathe.",
    },
    {
      label: "Address something",
      insert: "Tell me again about [person/place/object], the way [memory or feeling] changes it.",
      hint: "Speak directly to a person, place, or thing — second person opens intimacy fast.",
    },
    {
      label: "Repeat to shift",
      insert: "I keep saying \"[word/phrase].\" I keep saying \"[same word/phrase].\"",
      hint: "Repetition creates rhythm and shifts meaning between iterations.",
    },
    {
      label: "End mid-sentence",
      insert: "What I meant to say was...",
      hint: "An interrupted line invites the reader to finish it.",
    },
  ],

  screenplay: [
    {
      label: "Set the shot",
      insert: "INT./EXT. [PLACE] - [TIME]\n\n[Weather/light/sound]. [CHARACTER], [age/vibe], [revealing action].",
      hint: "Standard slug + a single line of action. Establish location, time, mood.",
    },
    {
      label: "Hide a secret",
      insert: "INT./EXT. [PLACE] - [TIME]\n\n[CHARACTER] prepares for [expected person/event]. Only [wrong person/no one] appears.",
      hint: "Show the reader something the second character doesn't know.",
    },
    {
      label: "Action without dialogue",
      insert: "INT./EXT. [PLACE] - [TIME]\n\n[CHARACTER] [does action]. Stops. Does it again, differently.",
      hint: "Pure behavior — let what they do say what they feel.",
    },
    {
      label: "Mid-argument",
      insert: "                    [NAME]\n          You said you'd [promise/action].\n\n                    [NAME]\n          I am [doing/avoiding] it.",
      hint: "Drop in mid-fight. The reader will piece together what “it” is.",
    },
  ],

  webtoon: [
    {
      label: "Set the panel",
      insert: "PANEL 1: Wide shot - [place] at [time]. [One mood detail]. [A figure/object] sits in the frame.",
      hint: "Set place and mood before introducing dialogue or close-ups.",
    },
    {
      label: "Silent reaction",
      insert: "PANEL 1: Close-up on [body part/object].\nPANEL 2: Pull back - [character's expression or absence of expression].",
      hint: "Two-panel beats teach the reader how to slow down and feel the moment.",
    },
    {
      label: "Punchline reveal",
      insert: "PANEL 1: [Setup action].\nPANEL 2: [Someone reacts/opens/looks].\nPANEL 3: [The unexpected reveal].",
      hint: "Three panels: setup, action, reveal. Webtoon's natural rhythm.",
    },
    {
      label: "Let absence speak",
      insert: "PANEL 1: [A place prepared for someone].\nPANEL 2: [The missing person/detail made visible].",
      hint: "Let absence speak. Empty chairs and uneaten meals carry weight.",
    },
  ],

  illustrated: [
    {
      label: "Lead with image",
      insert: "[Full-page illustration: [place/object/person], with [one visual tension].]\n\n[One sentence that gives the reader a foothold.]",
      hint: "Lead with the image. The text that follows is the reader's foothold.",
    },
    {
      label: "Marginalia",
      insert: "[A confident sentence]. [A sentence that proves it wrong.]\n\n[Margin sketch: [small object/clue] that complicates the text.]",
      hint: "Small images alongside text feel like the narrator's own notes.",
    },
    {
      label: "Object as anchor",
      insert: "[Illustration: a single object - [object] on/in [setting].]\n\n[One sentence that makes the object matter.]",
      hint: "Pair a detailed object with a mysterious sentence. Let the reader hunt for connection.",
    },
    {
      label: "Wraparound text",
      insert: "[Illustration: [image that tempts or threatens the character].]\n\n[One sentence where the text resists what the image suggests.]",
      hint: "Image suggests the look. Text resists. Tension lives in the gap.",
    },
  ],
};

/** Returns prompts for a format, or novel as a safe default. */
export function getPromptsForFormat(format: string | undefined | null): PromptSet[] {
  if (!format) return PROMPTS.novel;
  if (format in PROMPTS) return PROMPTS[format as WritingFormat];
  return PROMPTS.novel;
}

/**
 * Returns three prompts deterministically rotated by chapter id, so the same
 * chapter shows the same prompts across reloads (less jarring than random).
 */
export function getRotatedPrompts(format: string | undefined | null, key: string, count = 3): PromptSet[] {
  const all = getPromptsForFormat(format);
  if (all.length <= count) return all;
  // Cheap deterministic hash of the key into the prompt list.
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const start = hash % all.length;
  return Array.from({ length: count }, (_, i) => all[(start + i) % all.length]);
}
