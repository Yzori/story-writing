/**
 * Format-aware writing prompts surfaced in the editor (and the public
 * /demo/try page) when a chapter is still empty or near-empty. The aim is to
 * unblock the first 100 words; once the writer has momentum, prompts hide.
 *
 * Prompts are deliberately *technique* nudges, not story prompts — they teach
 * craft instead of giving away ideas. Each one is short enough to be the
 * actual first line if the writer accepts it.
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
      label: "Open mid-action",
      insert: "She was already halfway across the bridge when she heard her name.",
      hint: "Skip the setup. Drop the reader into a moment already in motion.",
    },
    {
      label: "Sensory detail first",
      insert: "The kitchen smelled like cardamom and burnt sugar.",
      hint: "Anchor the scene in a single concrete sensation before introducing anyone.",
    },
    {
      label: "Dialogue cold open",
      insert: "“You weren't supposed to be here.”",
      hint: "Let the reader catch up. Conflict in line one buys you the next paragraph.",
    },
    {
      label: "Ordinary, then wrong",
      insert: "He poured the coffee, the way he had every morning for thirty years. Then he noticed the second cup.",
      hint: "Two-beat opening: the mundane, then the small thing that tilts it.",
    },
  ],

  poetry: [
    {
      label: "Image, no verb",
      insert: "A blue door. The hinges crusted with salt.",
      hint: "Begin with the noun, not the action. Let the image breathe.",
    },
    {
      label: "Address something",
      insert: "Tell me again about the orchard, the way you remember it.",
      hint: "Speak directly to a person, place, or thing — second person opens intimacy fast.",
    },
    {
      label: "Repeat to mean",
      insert: "I keep saying “soon.” I keep saying “soon.”",
      hint: "Repetition creates rhythm and shifts meaning between iterations.",
    },
    {
      label: "End mid-sentence",
      insert: "What I meant to say was—",
      hint: "An interrupted line invites the reader to finish it.",
    },
  ],

  screenplay: [
    {
      label: "Scene heading",
      insert: "INT. CAR — NIGHT\n\nRain hammers the windshield. MARA, 30s, hands tight on the wheel.",
      hint: "Standard slug + a single line of action. Establish location, time, mood.",
    },
    {
      label: "Character with a secret",
      insert: "INT. KITCHEN — MORNING\n\nDANIEL pours two coffees. Only one person walks in.",
      hint: "Show the reader something the second character doesn't know.",
    },
    {
      label: "Action without dialogue",
      insert: "INT. APARTMENT — LATE NIGHT\n\nShe reads the letter. Folds it. Reads it again. Folds it more carefully this time.",
      hint: "Pure behavior — let what they do say what they feel.",
    },
    {
      label: "Mid-argument",
      insert: "                    SAM\n          You said you'd handle it.\n\n                    JESS\n          I am handling it.",
      hint: "Drop in mid-fight. The reader will piece together what “it” is.",
    },
  ],

  webtoon: [
    {
      label: "Establishing panel",
      insert: "PANEL 1: Wide shot — the city at dawn, fog on the river. A lone figure stands on the bridge.",
      hint: "Set place and mood before introducing dialogue or close-ups.",
    },
    {
      label: "Silent reaction",
      insert: "PANEL 1: Close-up on her hands, holding the letter.\nPANEL 2: Pull back — her face, unreadable.",
      hint: "Two-panel beats teach the reader how to slow down and feel the moment.",
    },
    {
      label: "Punchline reveal",
      insert: "PANEL 1: He slides the box across the table.\nPANEL 2: She opens it.\nPANEL 3: Empty.",
      hint: "Three panels: setup, action, reveal. Webtoon's natural rhythm.",
    },
    {
      label: "Speak through environment",
      insert: "PANEL 1: A kitchen. Two plates set. Steam rising.\nPANEL 2: One chair pushed back. The other untouched.",
      hint: "Let absence speak. Empty chairs and uneaten meals carry weight.",
    },
  ],

  illustrated: [
    {
      label: "Full-bleed open",
      insert: "[Full-page illustration: a forest at dusk, the path narrowing toward something the reader cannot quite see.]\n\nShe had not been here before. That was the strangest part.",
      hint: "Lead with the image. The text that follows is the reader's foothold.",
    },
    {
      label: "Marginalia",
      insert: "The map said three days to the coast. The map was wrong.\n\n[Margin sketch: a half-finished compass, the needle bent toward the wrong north.]",
      hint: "Small images alongside text feel like the narrator's own notes.",
    },
    {
      label: "Object as anchor",
      insert: "[Illustration: a single object — a brass key on a velvet cloth.]\n\nIt belonged to no door she had ever seen.",
      hint: "Pair a detailed object with a mysterious sentence. Let the reader hunt for connection.",
    },
    {
      label: "Wraparound text",
      insert: "[Illustration: a window, curtains parted just enough to see something outside.]\n\nShe told herself she would not look.",
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
