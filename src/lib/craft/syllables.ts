/**
 * Heuristic English syllable counting.
 *
 * English spelling does not encode syllables reliably, so this is an
 * ESTIMATE, not a dictionary lookup. It gets the common cases right —
 * silent final "e", "-ed"/"-es" endings, consonant + "-le", vowel pairs
 * that are really two syllables ("poet", "dial") — and will be wrong on
 * loanwords, names, and words whose scansion the poet chooses
 * ("fire", "flower", "evening" can each be read one way or another).
 *
 * Treat the numbers as a nudge for the ear, never as a verdict.
 *
 * Pure functions, no DOM, no I/O.
 */

/** Words the rules below get wrong often enough to be worth naming. */
const EXCEPTIONS: Record<string, number> = {
  business: 2,
  wednesday: 2,
  every: 2,
  everyone: 3,
  everything: 3,
  science: 2,
  sciences: 3,
  rhythm: 2,
  rhythms: 2,
  lion: 2,
  lions: 2,
  create: 2,
  creates: 2,
  created: 3,
  real: 2,
  idea: 3,
  ideas: 3,
  area: 3,
  areas: 3,
  theory: 3,
  video: 3,
  choir: 2,
  choirs: 2,
  colonel: 2,
  familiar: 4,
  ourselves: 3,
  people: 2,
  peoples: 3,
  once: 1,
  shoe: 1,
  shoes: 1,
  // Poetic elisions — the apostrophe is doing the work
  "o'er": 1,
  "e'er": 1,
  "ne'er": 1,
  "ope'd": 1,
};

/** Endings where a written "e" is silent but the vowel-group scan still counts it. */
const SILENT_E_SUFFIXES = [
  /[^aeiouy]ely$/, // lovely, barely
  /[^aeiouy]eless$/, // hopeless
  /[^aeiouy]eful$/, // hopeful
  /[^aeiouy]eness$/, // lateness
  /[^aeiouy]ement$/, // movement
];

/** Vowel pairs that are really two syllables (hiatus), with their usual exceptions. */
const HIATUS_PATTERNS = [
  /[^tscxl]io/, // violet, riot — but not nation, vision, million
  /[^tscx]ia/, // dial, giant, familiar — but not special, martial
  /[^gq]ua/, // usual, gradual — but not guard, quart
  /[^gq]uo/, // duo — but not quote
  /oe(?![s]|$)/, // poem, poet, poetry — but not shoe, goes
  /uie/, // quiet, quietly
  /ao/, // chaos
  /ii/, // skiing
  /[aeiouy]ing$/, // being, seeing, doing, dying — but not singing, writing
  /(?<=.)[aeiou]ye/, // player, layer — but not eye, eyes
];

/**
 * Estimate the number of syllables in a single English word.
 *
 * Hyphenated input is split and summed, so `countSyllables("moon-lit")` is 2.
 * Tokens with no letters (numbers, punctuation) count as 0; any token with
 * letters counts as at least 1.
 */
export function countSyllables(word: string): number {
  if (!word) return 0;

  const normalized = word
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'") // curly apostrophes → straight
    .replace(/[^a-z'\-‐-―]/g, "");

  // Hyphens and dashes join separate words: "moon-lit", "self-same"
  const parts = normalized.split(/[-‐-―]+/).filter(Boolean);
  if (parts.length > 1) {
    return parts.reduce((sum, part) => sum + countSyllables(part), 0);
  }

  const cleaned = parts[0]?.replace(/^'+|'+$/g, "") ?? "";
  if (!cleaned || !/[a-z]/.test(cleaned)) return 0;

  const exception = EXCEPTIONS[cleaned] ?? EXCEPTIONS[cleaned.replace(/'/g, "")];
  if (exception !== undefined) return exception;

  // Apostrophes are transparent to the vowel scan: "heaven's", "o'er"
  let w = cleaned.replace(/'/g, "");
  let extra = 0;

  // Compounds keep the first word's silent "e" in spelling only:
  // something, sometimes, someone, lifetime
  w = w.replace(
    /(?<=[^aeiouy])e(?=(?:thing|times|time|where|one|body|how|made|wise)$)/,
    ""
  );

  // Consonant + "-le" is its own syllable: table, candle, little, people
  if (/[^aeiouyl]le$/.test(w) && w.length > 2) {
    w = w.slice(0, -1);
    extra += 1;
  } else if (/[^aeiouy]ed$/.test(w) && !/[td]ed$/.test(w)) {
    // Silent "-ed": hoped, walked — but not wanted, folded
    w = w.slice(0, -2);
  } else if (/(?:[sxzcg]|[cs]h)es$/.test(w)) {
    // "-es" is voiced here: wishes, races, ages — leave it alone
  } else if (/[^aeiouy]es$/.test(w)) {
    // Silent "-es": hopes, makes
    w = w.slice(0, -2);
  } else if (/[^aeiouy]e$/.test(w)) {
    // Silent final "e": smile, whale
    w = w.slice(0, -1);
  }

  for (const suffix of SILENT_E_SUFFIXES) {
    if (suffix.test(w)) extra -= 1;
  }

  // "-ism" carries its own syllable in longer words (realism), not in prism
  if (/ism$/.test(w) && w.length > 6) extra += 1;

  if (/^mc/.test(w)) extra += 1;

  for (const pattern of HIATUS_PATTERNS) {
    if (pattern.test(w)) extra += 1;
  }

  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  return Math.max(1, groups + extra);
}

/**
 * Estimate the total syllables in a line of text.
 * Splits on whitespace and punctuation; em-dashes and hyphens separate words.
 */
export function countLineSyllables(text: string): number {
  if (!text) return 0;
  const words = text.split(/[^A-Za-z'‘’ʼ]+/).filter(Boolean);
  return words.reduce((sum, word) => sum + countSyllables(word), 0);
}
