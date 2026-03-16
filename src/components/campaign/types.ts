export interface Turn {
  id: string;
  sessionId: string;
  userId: string;
  characterId: string | null;
  type: string;
  content: string;
  metadata: string | null;
  sortOrder: number;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  characterName: string | null;
  characterPortrait: string | null;
}

export interface CampaignSession {
  id: string;
  storyId: string;
  title: string;
  summary: string;
  opening: string | null;
  epilogue: string | null;
  closingMood: string | null;
  activePlayerId: string | null;
  status: string;
}

export interface RollRequest {
  targetUserId: string;
  attribute: string;
  reason: string;
  onSuccess: string;
  onFailure: string;
  fatal: boolean;
  turnId: string;
  sortOrder: number;
}

export interface PlayerCharacter {
  id: string;
  userId: string;
  name: string;
  portrait: string | null;
  description: string | null;
  traits: string | null;
  stats: string | null;
  status: string;
  user?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface StoryData {
  id: string;
  userId: string;
  title: string;
}

export interface CharacterStats {
  approaches: {
    Bold: number;
    Keen: number;
    Subtle: number;
  };
  aspect: string;
}

// Legacy shape for backward compat
interface LegacyStats {
  hp?: { current: number; max: number };
  mp?: { current: number; max: number };
  attributes?: Record<string, number>;
  items?: string[];
}

export function parseStats(statsJson: string | null): CharacterStats | null {
  if (!statsJson) return null;
  try {
    const raw = JSON.parse(statsJson);
    // New shape
    if (raw.approaches) return raw as CharacterStats;
    // Migrate legacy D&D stats to approaches
    if (raw.attributes) {
      const legacy = raw as LegacyStats;
      const attrs = legacy.attributes ?? {};
      // Map legacy attributes to approaches heuristically
      const bold = Math.max((attrs.STR ?? 10) >= 14 ? 1 : 0, (attrs.CON ?? 10) >= 14 ? 1 : 0);
      const keen = Math.max((attrs.INT ?? 10) >= 14 ? 1 : 0, (attrs.WIS ?? 10) >= 14 ? 1 : 0);
      const subtle = Math.max((attrs.DEX ?? 10) >= 14 ? 1 : 0, (attrs.CHA ?? 10) >= 14 ? 1 : 0);
      return { approaches: { Bold: bold, Keen: keen, Subtle: subtle }, aspect: "" };
    }
    return null;
  } catch {
    return null;
  }
}

export const APPROACHES = ["Bold", "Keen", "Subtle"] as const;
export type Approach = (typeof APPROACHES)[number];

// Stable color assignment for players based on index
const PLAYER_COLORS = [
  "text-rose",
  "text-indigo-400",
  "text-emerald-400",
  "text-violet-400",
  "text-cyan-400",
  "text-orange-400",
  "text-pink-400",
  "text-lime-400",
];

export function getPlayerColor(userId: string, allUserIds: string[]): string {
  const idx = allUserIds.indexOf(userId);
  return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : "text-white/80";
}

// ── Starter Items ──────────────────────────────────────────────

export interface StarterItem {
  id: string;
  name: string;
  description: string;
  effect: string; // what happens narratively when used
  tag: "escape" | "reveal" | "protect" | "distract" | "heal" | "empower" | "summon" | "deceive";
}

export const STARTER_ITEM_POOL: Omit<StarterItem, "id">[] = [
  { name: "Smoke Pellet", description: "A small clay sphere filled with acrid powder.", effect: "hurls the pellet to the ground — a choking cloud of grey smoke erupts, obscuring everything within ten paces", tag: "escape" },
  { name: "Whispering Coin", description: "A tarnished copper coin that hums when rubbed.", effect: "presses the coin and hears a whisper revealing a hidden truth about this place", tag: "reveal" },
  { name: "Iron Ward Charm", description: "A crude iron pendant etched with warding runes.", effect: "clutches the charm — a brief shimmer of protection flares around them, deflecting the blow", tag: "protect" },
  { name: "Bottled Firefly Swarm", description: "A glass jar pulsing with trapped light.", effect: "shatters the jar — a swarm of luminous insects erupts outward, blinding and confusing everything nearby", tag: "distract" },
  { name: "Salve of Mending", description: "A tin of thick, herb-scented paste that tingles on contact.", effect: "applies the salve — warmth spreads through the wound as flesh knits itself closed", tag: "heal" },
  { name: "Ember Vial", description: "A stoppered vial containing a single bead of liquid fire.", effect: "throws the vial — it shatters in a burst of searing flame, igniting everything it touches", tag: "empower" },
  { name: "Raven Feather Token", description: "A jet-black feather that never seems to settle.", effect: "releases the feather into the wind — a spectral raven materializes, circling overhead before diving toward the danger", tag: "summon" },
  { name: "Mask of Borrowed Faces", description: "A thin silk mask that shifts color in the light.", effect: "dons the mask — their features blur and reshape, becoming unrecognizable for a fleeting moment", tag: "deceive" },
  { name: "Anchor Stone", description: "A smooth river stone, impossibly heavy for its size.", effect: "places the stone on the ground — the air grows still, and the chaos around them seems to slow", tag: "protect" },
  { name: "Widow's Thread", description: "A spool of nearly invisible silk thread, cold to the touch.", effect: "stretches the thread across the passage — it catches the light like a blade's edge, thin and lethal", tag: "distract" },
  { name: "Phantom Bell", description: "A small silver bell with no clapper that rings anyway.", effect: "shakes the bell — a sound only the dead can hear echoes through the chamber, and something stirs in response", tag: "summon" },
  { name: "Dustwort Pouch", description: "A leather pouch of dried herbs that smell faintly of rain.", effect: "scatters the herbs — a wave of calm washes over everyone nearby, dulling pain and steadying nerves", tag: "heal" },
  { name: "Trickster's Loaded Die", description: "A bone die with all sixes. Somehow, it still rolls fair.", effect: "rolls the die and calls out a dare — fate itself seems to bend, turning an impossible moment into a plausible one", tag: "deceive" },
  { name: "Splinter of Dawn", description: "A shard of pale crystal that glows faintly in darkness.", effect: "raises the crystal — a blinding lance of warm light cuts through the shadows, revealing what was hidden", tag: "reveal" },
  { name: "Bramble Seed", description: "A thorned seed that pulses like a heartbeat.", effect: "throws the seed — thick, thorned vines erupt from the ground in seconds, creating a living barricade", tag: "protect" },
  { name: "Echo Flask", description: "An empty flask that replays the last sound it heard.", effect: "uncorks the flask — the voice of someone long gone fills the room, speaking words they once said here", tag: "reveal" },
  { name: "Last Breath Candle", description: "A stub of black wax that burns with a blue flame.", effect: "lights the candle — the flame flickers and points unerringly toward the nearest danger", tag: "reveal" },
  { name: "Nightshade Dart", description: "A thin dart tipped with something that glistens violet.", effect: "flicks the dart — it finds its mark, and the target's limbs grow heavy as the poison takes hold", tag: "distract" },
  { name: "Stormcatcher Ring", description: "A copper ring that sparks when you clench your fist.", effect: "raises a fist — a crack of electricity arcs from the ring, striking with the fury of a caged storm", tag: "empower" },
  { name: "Memory Moth", description: "A preserved moth in a glass locket. Its wings still twitch.", effect: "opens the locket — the moth dissolves into glowing dust that drifts into someone's eyes, replaying a forgotten memory", tag: "reveal" },
];

/** Pick n random items from the pool (no duplicates). Deterministic given a seed string. */
export function rollStarterItems(seed: string, count: number = 1): StarterItem[] {
  // Simple hash to seed randomness
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const seededRandom = () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return ((hash >>> 0) / 0xffffffff);
  };

  const pool = [...STARTER_ITEM_POOL];
  const picked: StarterItem[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(seededRandom() * pool.length);
    const item = pool.splice(idx, 1)[0];
    picked.push({ ...item, id: `item-${seed}-${i}` });
  }
  return picked;
}
