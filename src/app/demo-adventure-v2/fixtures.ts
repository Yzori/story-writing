import type { FloorRound, PlayerCharacter, Turn } from "@/types/campaign";

// ── Fixture data shared by the demo-adventure surfaces ──────
// The demo is a fixture-only sandbox: no API, no persistence. Both the
// legacy shell page and the manuscript harness read from here.

export const GM_USER_ID = "demo-gm";
export const STORY_ID = "demo-story";
export const SESSION_ID = "demo-session";

// The chair left for the dark — the audience plays this character together.
// The Director wakes it with "/", frames its deeds, and the house chooses.
export const STRANGER_NAME = "the Gravekeeper";

export const CHARACTERS: PlayerCharacter[] = [
  {
    id: "char-lyra",
    userId: "user-lyra",
    name: "Lyra Varen",
    portrait: null,
    description: "A forgekeeper seeking the Obsidian Crown.",
    traits: "Believes every problem has a chemical solution.",
    stats: JSON.stringify({
      aspect: "Trusts chemicals more than people",
    }),
    status: "active",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
  },
  {
    id: "char-kaelen",
    userId: "user-kaelen",
    name: "Kaelen Vex",
    portrait: null,
    description: "A bladesinger haunted by a debt he can never repay.",
    traits: "A blade for every shadow.",
    stats: JSON.stringify({
      aspect: "Wears his oaths heavier than his sword",
    }),
    status: "active",
    user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
  },
  {
    id: "char-elara",
    userId: "user-elara",
    name: "Elara Moss",
    portrait: null,
    description: "A healer who hears the whispers of the dead.",
    traits: "Hears the dead whether she wants to or not.",
    stats: JSON.stringify({
      aspect: "Walks with one foot in the world after",
    }),
    status: "active",
    user: { id: "user-elara", displayName: "Elena", avatarUrl: null },
  },
];

export const ACTIVE_PLAYER_USER_IDS = CHARACTERS.map((c) => c.userId);

export const OPENING_NARRATION =
  "The Obsidian Crown had been lost for three hundred years, buried with its last king beneath the Shattered City. Tonight, prophecy says, it stirs.";

export const INITIAL_TURNS: Turn[] = [
  {
    id: "t-1",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "narration",
    content:
      "Moonlight filters through cracked arches across the throne room floor. At the far end, a stone altar pulses with a faint, sickly light. Carved runes wind across its base, dim but waiting.",
    metadata: null,
    sortOrder: 0,
    createdAt: "2026-05-15T20:00:00Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
  {
    id: "t-2",
    sessionId: SESSION_ID,
    userId: "user-lyra",
    characterId: "char-lyra",
    type: "action",
    content:
      "approaches the altar slowly, fingertips brushing the runes as if testing the temperature of a flame.",
    metadata: null,
    sortOrder: 1,
    createdAt: "2026-05-15T20:01:00Z",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
    characterName: "Lyra",
    characterPortrait: null,
  },
  {
    id: "t-3",
    sessionId: SESSION_ID,
    userId: "user-kaelen",
    characterId: "char-kaelen",
    type: "dialogue",
    content: "Is that blood on the blade?",
    metadata: null,
    sortOrder: 2,
    createdAt: "2026-05-15T20:01:30Z",
    user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
    characterName: "Kaelen",
    characterPortrait: null,
  },
  // The Stranger has already moved once tonight: the record line of set
  // type, then its deed in moon-silver — exactly what a resolved house
  // ballot prints.
  {
    id: "t-3b",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "ooc",
    content: "— the Gravekeeper stirred: the house chose its deed, 7 voices to 4.",
    metadata: JSON.stringify({
      kind: "stranger-record",
      prompt: "Something else is in the throne room with them.",
    }),
    sortOrder: 3,
    createdAt: "2026-05-15T20:01:40Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
  {
    id: "t-3c",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "narration",
    content:
      "Behind them, unseen, the Gravekeeper dragged one fingertip through the dust of the altar — and wrote Lyra's name in grave-script.",
    metadata: JSON.stringify({
      kind: "stranger",
      prompt: "Something else is in the throne room with them.",
    }),
    sortOrder: 4,
    createdAt: "2026-05-15T20:01:50Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
  {
    id: "t-4",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "roll-request",
    content:
      "The Director asks Lyra for a roll — Decipher the rune sequence before the altar finishes waking.",
    metadata: JSON.stringify({
      targetUserId: "user-lyra",
      reason: "Decipher the rune sequence before the altar finishes waking.",
      onSuccess: "You read the binding clear and find a way to bend the awakening to your will.",
      onFailure: "The runes burn your skin. The altar wakes on its own terms.",
      fatal: false,
      status: "open",
      requiredUserIds: ["user-lyra"],
    }),
    sortOrder: 5,
    createdAt: "2026-05-15T20:02:00Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
];

export const INITIAL_FLOOR_ROUND: FloorRound = {
  id: "fr-1",
  sessionId: SESSION_ID,
  openedBy: GM_USER_ID,
  prompt: "The altar splits open. What does the party do?",
  mode: "vote",
  status: "voting",
  audiencePulseEnabled: true,
  selectedSubmissionId: null,
  createdAt: "2026-05-15T20:03:00Z",
  updatedAt: "2026-05-15T20:03:00Z",
  submissions: [
    {
      id: "sub-1",
      roundId: "fr-1",
      userId: "user-kaelen",
      characterId: "char-kaelen",
      type: "action",
      content:
        "draws his blade and steps between Lyra and the altar, ready for whatever crawls out of the dark.",
      source: "player",
      sourceLabel: null,
      audienceSparkId: null,
      status: "submitted",
      createdAt: "2026-05-15T20:03:30Z",
      characterName: "Kaelen",
      user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
      voteCount: 1,
      audiencePulseCount: 12,
      isMine: false,
    },
    {
      id: "sub-2",
      roundId: "fr-1",
      userId: "user-elara",
      characterId: "char-elara",
      type: "description",
      content:
        "The dead in the walls start whispering at once. Elara raises a hand — not to fight, but to listen.",
      source: "player",
      sourceLabel: null,
      audienceSparkId: null,
      status: "submitted",
      createdAt: "2026-05-15T20:03:45Z",
      characterName: "Elara",
      user: { id: "user-elara", displayName: "Elena", avatarUrl: null },
      voteCount: 0,
      audiencePulseCount: 18,
      isMine: false,
    },
  ],
  myVoteSubmissionId: null,
  voteCount: 1,
  eligibleVoterCount: 3,
  allEligibleVotersVoted: false,
  isVoteEligible: true,
  audiencePulseCount: 30,
  myAudiencePulseSubmissionId: null,
};

// Map fixtures lived here under the old client-only MapPin model. The
// real map view now talks to /api/.../campaign/places — demo-adventure
// is a fixture-only sandbox so the map overlay just renders empty here.

export const GM_TURN_BASE = {
  userId: GM_USER_ID,
  characterId: null,
  user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
  characterName: null,
  characterPortrait: null,
} as const;

export type ViewAs = "gm" | "lyra" | "kaelen" | "elara" | "spectator";

export const VIEW_AS_OPTIONS: { key: ViewAs; label: string }[] = [
  { key: "gm", label: "GM" },
  { key: "lyra", label: "Lyra" },
  { key: "kaelen", label: "Kaelen" },
  { key: "elara", label: "Elara" },
  { key: "spectator", label: "Audience" },
];

export function viewAsToUserId(view: ViewAs): string | null {
  switch (view) {
    case "gm": return GM_USER_ID;
    case "lyra": return "user-lyra";
    case "kaelen": return "user-kaelen";
    case "elara": return "user-elara";
    default: return null;
  }
}
