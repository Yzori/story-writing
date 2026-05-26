/**
 * Central dictionary of Quiloria's coined vocabulary. Define a term once here,
 * reference it anywhere with <GlossaryTerm id="spark" />. Keep explanations to
 * one or two plain-language sentences — these are read in a small tooltip.
 */
export const GLOSSARY = {
  spark: {
    term: "spark",
    explain:
      "Quiloria's version of a like. Tap it to show a story moved you — sparks also help others discover it.",
  },
  liveTable: {
    term: "live table",
    explain:
      "An Adventure played out turn by turn: a Game Master narrates while players write their characters' actions, and dice decide the uncertain moments.",
  },
  coOp: {
    term: "co-op",
    explain:
      "A story written by a team. You invite collaborators, share a lore book, and settle credit before you begin.",
  },
  campaign: {
    term: "campaign",
    explain:
      "A run of Adventure sessions with the same characters and world, guided by a Game Master.",
  },
  loreBook: {
    term: "lore book",
    explain:
      "A shared reference for a story's world — characters, places, factions, and rules — so every collaborator stays consistent.",
  },
  readingTaste: {
    term: "reading taste",
    explain:
      "The genres, lengths, and comfort level you prefer. It tunes your For You feed. Private to you, and changeable anytime in Settings.",
  },
  crossroads: {
    term: "Crossroads",
    explain:
      "Reader polls that influence where a story goes next. Readers spend Ink Drops to weight their vote.",
  },
  openCall: {
    term: "open call",
    explain:
      "A public invitation to join a story in a specific role — writer, illustrator, editor, or worldbuilder.",
  },
} as const;

export type GlossaryId = keyof typeof GLOSSARY;
