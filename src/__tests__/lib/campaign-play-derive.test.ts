import { describe, expect, it } from "vitest";
import type { PlayerCharacter, Turn } from "@/types/campaign";
import type { CampaignTurnType } from "@/lib/campaign-turns";
import {
  deriveActingGmPlayers,
  deriveAspectAvailable,
  deriveCurrentScene,
  deriveExtensionTurns,
  derivePendingRollRequest,
  derivePhase,
  deriveSpotlightQueue,
  parseTimerExtensionSeconds,
} from "@/lib/campaign-play-derive";

// ── Fixtures ────────────────────────────────────────────────

let nextSort = 0;

function turn(
  type: CampaignTurnType,
  userId: string,
  overrides: Partial<Turn> = {},
): Turn {
  nextSort += 1;
  return {
    id: overrides.id ?? `turn-${nextSort}`,
    sessionId: "session-1",
    userId,
    characterId: null,
    type,
    content: "",
    metadata: null,
    sortOrder: overrides.sortOrder ?? nextSort,
    createdAt: new Date(0).toISOString(),
    user: { id: userId, displayName: null, avatarUrl: null },
    characterName: null,
    characterPortrait: null,
    ...overrides,
  };
}

function character(userId: string, overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    id: `char-${userId}`,
    userId,
    name: `Hero of ${userId}`,
    portrait: null,
    description: null,
    traits: null,
    stats: null,
    status: "active",
    ...overrides,
  };
}

const GM = "gm-user";
const P1 = "player-1";
const P2 = "player-2";

// ── Spotlight queue ─────────────────────────────────────────

describe("deriveSpotlightQueue", () => {
  const chars = [character(P1, { name: "Kael" }), character(P2, { name: "Mira" })];

  it("surfaces an open hand-raise with the character name", () => {
    const turns = [
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
    ];
    const queue = deriveSpotlightQueue(turns, chars, GM, null);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ userId: P1, characterName: "Kael" });
  });

  it("orders bids by when they were raised", () => {
    const turns = [
      turn("ooc", P2, { metadata: JSON.stringify({ spotlightRequest: true }) }),
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
    ];
    const queue = deriveSpotlightQueue(turns, chars, GM, null);
    expect(queue.map((q) => q.userId)).toEqual([P2, P1]);
  });

  it("drops a bid once the player cancels it", () => {
    const turns = [
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightCancel: true }) }),
    ];
    expect(deriveSpotlightQueue(turns, chars, GM, null)).toHaveLength(0);
  });

  it("drops a bid after the player posts a story beat", () => {
    const turns = [
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
      turn("action", P1),
    ];
    expect(deriveSpotlightQueue(turns, chars, GM, null)).toHaveLength(0);
  });

  it("keeps a bid raised again after a story beat", () => {
    const turns = [
      turn("action", P1),
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
    ];
    expect(deriveSpotlightQueue(turns, chars, GM, null)).toHaveLength(1);
  });

  it("excludes the pen-holder and the Director", () => {
    const turns = [
      turn("ooc", P1, { metadata: JSON.stringify({ spotlightRequest: true }) }),
      turn("ooc", GM, { metadata: JSON.stringify({ spotlightRequest: true }) }),
    ];
    expect(deriveSpotlightQueue(turns, chars, GM, P1)).toHaveLength(0);
  });

  it("ignores malformed metadata", () => {
    const turns = [turn("ooc", P1, { metadata: "{not json" })];
    expect(deriveSpotlightQueue(turns, chars, GM, null)).toHaveLength(0);
  });
});

// ── Pending roll request ────────────────────────────────────

describe("derivePendingRollRequest", () => {
  const rollRequestTurn = (target: string, overrides: Record<string, unknown> = {}) =>
    turn("roll-request", GM, {
      metadata: JSON.stringify({
        targetUserId: target,
        attribute: "Bold",
        reason: "The bridge is collapsing",
        ...overrides,
      }),
    });

  it("finds the open request targeting the current player", () => {
    const req = rollRequestTurn(P1);
    const pending = derivePendingRollRequest([req], P1, false, "active");
    expect(pending).not.toBeNull();
    expect(pending).toMatchObject({
      attribute: "Bold",
      turnId: req.id,
      fatal: false,
      requiredUserIds: [P1],
    });
  });

  it('resolves an "everyone" target to the current player', () => {
    const pending = derivePendingRollRequest([rollRequestTurn("everyone")], P1, false, "active");
    expect(pending?.requiredUserIds).toEqual([P1]);
  });

  it("returns null for the GM and for missing users", () => {
    const turns = [rollRequestTurn(P1)];
    expect(derivePendingRollRequest(turns, P1, true, "active")).toBeNull();
    expect(derivePendingRollRequest(turns, null, false, "active")).toBeNull();
  });

  it("returns null when the player's character is dead or retired", () => {
    const turns = [rollRequestTurn(P1)];
    expect(derivePendingRollRequest(turns, P1, false, "dead")).toBeNull();
    expect(derivePendingRollRequest(turns, P1, false, "retired")).toBeNull();
  });

  it("skips closed or cancelled requests", () => {
    expect(
      derivePendingRollRequest([rollRequestTurn(P1, { status: "closed" })], P1, false, "active"),
    ).toBeNull();
    expect(
      derivePendingRollRequest([rollRequestTurn(P1, { status: "cancelled" })], P1, false, "active"),
    ).toBeNull();
  });

  it("skips requests targeting someone else", () => {
    expect(derivePendingRollRequest([rollRequestTurn(P2)], P1, false, "active")).toBeNull();
  });

  it("skips requests the player already answered", () => {
    const req = rollRequestTurn(P1);
    const answer = turn("roll", P1, {
      metadata: JSON.stringify({ rollRequestTurnId: req.id, total: 8 }),
    });
    expect(derivePendingRollRequest([req, answer], P1, false, "active")).toBeNull();
  });

  it("returns the most recent matching request", () => {
    const first = rollRequestTurn(P1, { reason: "old" });
    const second = rollRequestTurn(P1, { reason: "new" });
    const pending = derivePendingRollRequest([first, second], P1, false, "active");
    expect(pending?.turnId).toBe(second.id);
  });
});

// ── Aspect availability ─────────────────────────────────────

describe("deriveAspectAvailable", () => {
  const savedRoll = (userId: string) =>
    turn("roll", userId, { metadata: JSON.stringify({ aspectSaved: true }) });

  it("is available before any save is spent", () => {
    expect(deriveAspectAvailable([], P1, character(P1))).toBe(true);
  });

  it("is spent after one aspect save in the scene", () => {
    expect(deriveAspectAvailable([savedRoll(P1)], P1, character(P1))).toBe(false);
  });

  it("ignores other players' saves and non-saving rolls", () => {
    const turns = [
      savedRoll(P2),
      turn("roll", P1, { metadata: JSON.stringify({ total: 5 }) }),
    ];
    expect(deriveAspectAvailable(turns, P1, character(P1))).toBe(true);
  });

  it("resets at a scene break", () => {
    const turns = [savedRoll(P1), turn("scene-break", GM)];
    expect(deriveAspectAvailable(turns, P1, character(P1))).toBe(true);
  });

  it("grants one extra save per active vow (P1 #10)", () => {
    const withVow = character(P1, {
      marks: [
        {
          id: "m1",
          characterId: `char-${P1}`,
          storyId: "s1",
          sessionId: null,
          sourceTurnId: null,
          kind: "vow",
          text: "Never abandon the weak",
          createdAt: new Date(0).toISOString(),
        },
      ],
    });
    expect(deriveAspectAvailable([savedRoll(P1)], P1, withVow)).toBe(true);
    expect(deriveAspectAvailable([savedRoll(P1), savedRoll(P1)], P1, withVow)).toBe(false);
  });
});

// ── Extension turns + parsing ───────────────────────────────

describe("extension turns", () => {
  it("selects only OOC turns carrying timerExtension metadata", () => {
    const ext = turn("ooc", P1, { metadata: JSON.stringify({ timerExtension: 180 }) });
    const chat = turn("ooc", P1, { metadata: null });
    const roll = turn("roll", P1, { metadata: JSON.stringify({ timerExtension: 180 }) });
    expect(deriveExtensionTurns([ext, chat, roll])).toEqual([ext]);
  });

  it("parses extension seconds defensively", () => {
    expect(parseTimerExtensionSeconds(JSON.stringify({ timerExtension: 180 }))).toBe(180);
    expect(parseTimerExtensionSeconds(JSON.stringify({ timerExtension: -5 }))).toBe(0);
    expect(parseTimerExtensionSeconds(JSON.stringify({ timerExtension: "180" }))).toBe(0);
    expect(parseTimerExtensionSeconds("{bad json")).toBe(0);
    expect(parseTimerExtensionSeconds(null)).toBe(0);
  });
});

// ── Current scene ───────────────────────────────────────────

describe("deriveCurrentScene", () => {
  const session = { title: "Session One", status: "active" };

  it("falls back to the session before any scene break", () => {
    expect(deriveCurrentScene([], session)).toEqual({
      title: "Session One",
      mood: "active",
      aspects: [],
    });
  });

  it("reads the latest non-cinematic scene break", () => {
    const turns = [
      turn("scene-break", GM, {
        metadata: JSON.stringify({ title: "The Descent", mood: "ominous", aspects: ["No Escape"] }),
      }),
      turn("scene-break", GM, { metadata: JSON.stringify({ cinematic: true, title: "Flash" }) }),
    ];
    expect(deriveCurrentScene(turns, session)).toEqual({
      title: "The Descent",
      mood: "ominous",
      aspects: ["No Escape"],
    });
  });
});

// ── Phase ───────────────────────────────────────────────────

describe("derivePhase", () => {
  const chars = [character(P1, { name: "Kael" })];
  const base = {
    floorRound: null,
    pendingRollRequest: null,
    characters: chars,
    isGM: false,
  };
  const session = (activePlayerId: string | null, status = "active") => ({
    status,
    activePlayerId,
  });

  it("is a Director beat when nobody holds the pen", () => {
    const phase = derivePhase({ ...base, campaignSession: session(null), isGM: true });
    expect(phase).toMatchObject({ key: "director", label: "Director Beat", spotlightLabel: "Director" });
  });

  it("is a spotlight when a player holds the pen", () => {
    const phase = derivePhase({ ...base, campaignSession: session(P1) });
    expect(phase).toMatchObject({ key: "spotlight", label: "Spotlight", spotlightLabel: "Kael" });
    expect(phase.hint).toContain("Kael");
  });

  it("check pending outranks the spotlight", () => {
    const phase = derivePhase({
      ...base,
      campaignSession: session(P1),
      pendingRollRequest: {
        targetUserId: P1,
        attribute: "Bold",
        reason: "Leap the chasm",
        onSuccess: "",
        onFailure: "",
        fatal: false,
        status: "open",
        requiredUserIds: [P1],
        turnId: "t1",
        sortOrder: 1,
      },
    });
    expect(phase).toMatchObject({ key: "check", label: "Check Pending", hint: "Leap the chasm" });
  });

  it("crossroads outranks everything and maps each status", () => {
    const round = (status: string) =>
      ({ status, prompt: "Which gate?" }) as never;
    expect(
      derivePhase({ ...base, campaignSession: session(P1), floorRound: round("open") }).label,
    ).toBe("Crossroads Open");
    expect(
      derivePhase({ ...base, campaignSession: session(P1), floorRound: round("voting") }).label,
    ).toBe("Table Vote");
    expect(
      derivePhase({ ...base, campaignSession: session(P1), floorRound: round("closed") }).label,
    ).toBe("Director Resolving");
  });

  it("labels draft and completed sessions", () => {
    expect(derivePhase({ ...base, campaignSession: session(null, "draft") }).key).toBe("draft");
    expect(derivePhase({ ...base, campaignSession: session(null, "completed") }).key).toBe("ended");
  });

  it("labels a pen-holder without a character as joining", () => {
    const phase = derivePhase({ ...base, campaignSession: session("stranger") });
    expect(phase.spotlightLabel).toBe("Player joining…");
  });
});

// ── Acting-GM handoff targets ───────────────────────────────

describe("deriveActingGmPlayers", () => {
  it("lists unique active non-owner players", () => {
    const chars = [
      character(P1, { name: "Kael" }),
      character(P1, { id: "char-p1-alt", name: "Kael II" }), // second character, same player
      character(P2, { name: "Mira", status: "dead" }),
      character(GM, { name: "The Director" }),
    ];
    const players = deriveActingGmPlayers(chars, GM);
    expect(players).toEqual([{ userId: P1, name: "Kael" }]);
  });

  it("falls back to display name, then a generic label", () => {
    const chars = [
      character(P1, { name: "", user: { id: P1, displayName: "Ana", avatarUrl: null } }),
      character(P2, { name: "" }),
    ];
    expect(deriveActingGmPlayers(chars, GM).map((p) => p.name)).toEqual(["Ana", "A player"]);
  });
});
