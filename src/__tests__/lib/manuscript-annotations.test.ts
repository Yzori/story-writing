import { describe, expect, it } from "vitest";
import type { CharacterMark, PlayerCharacter, Turn } from "@/types/campaign";
import type { CampaignTurnType } from "@/lib/campaign-turns";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import {
  deriveAnnotations,
  groupAnnotationsByAnchor,
  type DeriveAnnotationsInput,
} from "@/lib/manuscript-annotations";

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

function mark(overrides: Partial<CharacterMark> = {}): CharacterMark {
  return {
    id: overrides.id ?? "mark-1",
    characterId: "char-player-1",
    storyId: "story-1",
    sessionId: "session-1",
    sourceTurnId: null,
    kind: "scar",
    text: "It never healed.",
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function clock(overrides: Partial<ProgressClockData> = {}): ProgressClockData {
  return {
    id: overrides.id ?? "clock-1",
    name: "The garrison wakes",
    segments: 6,
    filled: 2,
    type: "danger",
    ...overrides,
  };
}

const GM = "gm-user";
const P1 = "player-1";
const P2 = "player-2";

function input(overrides: Partial<DeriveAnnotationsInput> = {}): DeriveAnnotationsInput {
  return {
    storyTurns: [],
    logTurns: [],
    clocks: [],
    characters: [],
    myCharacter: null,
    currentUserId: P1,
    ...overrides,
  };
}

const rollRequestMeta = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    targetUserId: P1,
    attribute: "Bold",
    reason: "Hold the door",
    ...over,
  });

const rollMeta = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    total: 9,
    result: 7,
    modifier: 2,
    attribute: "Bold",
    tier: "partial",
    die: "2d6",
    dice: [4, 3],
    fatal: false,
    markEligible: false,
    aspectSaved: false,
    ...over,
  });

// ── Roll questions ──────────────────────────────────────────

describe("roll-question annotations", () => {
  it("anchors an open request to the story turn it interrupted", () => {
    const narration = turn("narration", GM);
    const request = turn("roll-request", GM, { metadata: rollRequestMeta() });
    const result = deriveAnnotations(
      input({ storyTurns: [narration], logTurns: [request] }),
    );
    const question = result.find((a) => a.kind === "roll-question");
    expect(question?.anchorTurnId).toBe(narration.id);
  });

  it("marks the request mine only while I have not answered", () => {
    const request = turn("roll-request", GM, { metadata: rollRequestMeta() });
    const before = deriveAnnotations(input({ logTurns: [request] }));
    expect(before.find((a) => a.kind === "roll-question")?.isMine).toBe(true);

    const answer = turn("roll", P1, {
      metadata: rollMeta({ rollRequestTurnId: request.id }),
    });
    const after = deriveAnnotations(input({ logTurns: [request, answer] }));
    expect(after.find((a) => a.kind === "roll-question")).toBeUndefined();
  });

  it("keeps an everyone-request open until all required users answered", () => {
    const request = turn("roll-request", GM, {
      metadata: rollRequestMeta({ requiredUserIds: [P1, P2] }),
    });
    const p1Answer = turn("roll", P1, {
      metadata: rollMeta({ rollRequestTurnId: request.id }),
    });
    const partial = deriveAnnotations(input({ logTurns: [request, p1Answer] }));
    const question = partial.find((a) => a.kind === "roll-question");
    expect(question).toBeDefined();
    expect(question && "isMine" in question ? question.isMine : null).toBe(false);

    const p2Answer = turn("roll", P2, {
      metadata: rollMeta({ rollRequestTurnId: request.id }),
    });
    const done = deriveAnnotations(input({ logTurns: [request, p1Answer, p2Answer] }));
    expect(done.find((a) => a.kind === "roll-question")).toBeUndefined();
  });

  it("drops cancelled and closed requests", () => {
    const cancelled = turn("roll-request", GM, {
      metadata: rollRequestMeta({ status: "cancelled" }),
    });
    const closed = turn("roll-request", GM, {
      metadata: rollRequestMeta({ status: "closed" }),
    });
    const result = deriveAnnotations(input({ logTurns: [cancelled, closed] }));
    expect(result.filter((a) => a.kind === "roll-question")).toHaveLength(0);
  });
});

// ── Roll stamps ─────────────────────────────────────────────

describe("roll-stamp annotations", () => {
  it("stamps every parsed roll beside the preceding passage", () => {
    const narration = turn("narration", GM);
    const action = turn("action", P1);
    const roll = turn("roll", P1, { metadata: rollMeta() });
    const result = deriveAnnotations(
      input({ storyTurns: [narration, action], logTurns: [roll] }),
    );
    const stamp = result.find((a) => a.kind === "roll-stamp");
    expect(stamp?.anchorTurnId).toBe(action.id);
  });

  it("falls back to the first visible turn when the roll predates the window", () => {
    const late = turn("narration", GM, { sortOrder: 100 });
    const roll = turn("roll", P1, { sortOrder: 50, metadata: rollMeta() });
    const result = deriveAnnotations(input({ storyTurns: [late], logTurns: [roll] }));
    expect(result.find((a) => a.kind === "roll-stamp")?.anchorTurnId).toBe(late.id);
  });

  it("skips rolls with unparseable metadata", () => {
    const roll = turn("roll", P1, { metadata: "{broken" });
    const result = deriveAnnotations(input({ logTurns: [roll] }));
    expect(result.filter((a) => a.kind === "roll-stamp")).toHaveLength(0);
  });
});

// ── Clocks ──────────────────────────────────────────────────

describe("clock annotations", () => {
  it("anchors clocks to the latest non-cinematic scene-break", () => {
    const oldScene = turn("scene-break", GM, {
      metadata: JSON.stringify({ title: "The Gate", mood: "tense" }),
    });
    const cinematic = turn("scene-break", GM, {
      metadata: JSON.stringify({ title: "Later", cinematic: true }),
    });
    const result = deriveAnnotations(
      input({ storyTurns: [oldScene, cinematic], clocks: [clock()] }),
    );
    expect(result.find((a) => a.kind === "clock")?.anchorTurnId).toBe(oldScene.id);
  });

  it("pins clocks to the page head when no scene exists", () => {
    const result = deriveAnnotations(input({ clocks: [clock()] }));
    expect(result.find((a) => a.kind === "clock")?.anchorTurnId).toBeNull();
  });

  it("keeps multiple clocks in stable order", () => {
    const result = deriveAnnotations(
      input({ clocks: [clock({ id: "a" }), clock({ id: "b" })] }),
    );
    const ids = result.filter((a) => a.kind === "clock").map((a) => a.id);
    expect(ids).toEqual(["clock:a", "clock:b"]);
  });
});

// ── Bargains ────────────────────────────────────────────────

describe("bargain annotations", () => {
  const bargainMeta = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      kind: "bargain",
      targetUserId: P1,
      targetLabel: "Kael",
      gain: "The door holds",
      price: "Your sword arm",
      status: "open",
      ...over,
    });

  it("lets only the open bargain's target respond", () => {
    const offer = turn("consequence", GM, { metadata: bargainMeta() });
    const mine = deriveAnnotations(input({ storyTurns: [offer], currentUserId: P1 }));
    const theirs = deriveAnnotations(input({ storyTurns: [offer], currentUserId: P2 }));
    const mineNote = mine.find((a) => a.kind === "bargain");
    const theirsNote = theirs.find((a) => a.kind === "bargain");
    expect(mineNote && "canRespond" in mineNote ? mineNote.canRespond : null).toBe(true);
    expect(theirsNote && "canRespond" in theirsNote ? theirsNote.canRespond : null).toBe(false);
  });

  it("keeps resolved bargains as stamps but drops cancelled ones", () => {
    const accepted = turn("consequence", GM, { metadata: bargainMeta({ status: "accepted" }) });
    const cancelled = turn("consequence", GM, { metadata: bargainMeta({ status: "cancelled" }) });
    const result = deriveAnnotations(input({ storyTurns: [accepted, cancelled] }));
    const notes = result.filter((a) => a.kind === "bargain");
    expect(notes).toHaveLength(1);
    expect(notes[0].anchorTurnId).toBe(accepted.id);
  });
});

// ── Mark prompts (ported MarkPromptRail eligibility) ────────

describe("mark-prompt annotations", () => {
  const me = character(P1, { marks: [] });

  it("prompts on my own mark-eligible roll, anchored to the passage", () => {
    const action = turn("action", P1);
    const roll = turn("roll", P1, {
      metadata: rollMeta({ markEligible: true, tier: "partial" }),
    });
    const result = deriveAnnotations(
      input({ storyTurns: [action], logTurns: [roll], myCharacter: me }),
    );
    const prompt = result.find((a) => a.kind === "mark-prompt");
    expect(prompt).toMatchObject({
      anchorTurnId: action.id,
      defaultKind: "debt",
      preamble: "Something was spent.",
    });
  });

  it("does not prompt on someone else's roll", () => {
    const roll = turn("roll", P2, { metadata: rollMeta({ markEligible: true }) });
    const result = deriveAnnotations(input({ logTurns: [roll], myCharacter: me }));
    expect(result.filter((a) => a.kind === "mark-prompt")).toHaveLength(0);
  });

  it("prompts the accepter of a mark-eligible bargain with a debt", () => {
    const offer = turn("consequence", GM, {
      metadata: JSON.stringify({
        kind: "bargain",
        targetUserId: P1,
        targetLabel: "Kael",
        gain: "g",
        price: "p",
        status: "accepted",
        responseUserId: P1,
        markEligible: true,
      }),
    });
    const result = deriveAnnotations(input({ storyTurns: [offer], myCharacter: me }));
    const prompt = result.find((a) => a.kind === "mark-prompt");
    expect(prompt).toMatchObject({ defaultKind: "debt", anchorTurnId: offer.id });
  });

  it("broadcasts GM leaves-a-mark consequences and story moments", () => {
    const consequence = turn("consequence", GM, {
      metadata: JSON.stringify({ markEligible: true }),
    });
    const moment = turn("story-moment", GM, {
      metadata: JSON.stringify({ markEligible: true, mood: "death" }),
    });
    const result = deriveAnnotations(
      input({ storyTurns: [consequence, moment], myCharacter: me }),
    );
    const prompts = result.filter((a) => a.kind === "mark-prompt");
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatchObject({ defaultKind: "scar" });
  });

  it("suppresses already-marked and dismissed turns", () => {
    const consequence = turn("consequence", GM, {
      metadata: JSON.stringify({ markEligible: true }),
    });
    const marked = character(P1, {
      marks: [mark({ sourceTurnId: consequence.id })],
    });
    const viaMark = deriveAnnotations(
      input({ storyTurns: [consequence], myCharacter: marked }),
    );
    expect(viaMark.filter((a) => a.kind === "mark-prompt")).toHaveLength(0);

    const viaDismiss = deriveAnnotations(
      input({
        storyTurns: [consequence],
        myCharacter: me,
        dismissedMarkTurnIds: new Set([consequence.id]),
      }),
    );
    expect(viaDismiss.filter((a) => a.kind === "mark-prompt")).toHaveLength(0);
  });

  it("caps prompts at the three most recent", () => {
    const turns = Array.from({ length: 5 }, () =>
      turn("consequence", GM, { metadata: JSON.stringify({ markEligible: true }) }),
    );
    const result = deriveAnnotations(input({ storyTurns: turns, myCharacter: me }));
    const prompts = result.filter((a) => a.kind === "mark-prompt");
    expect(prompts).toHaveLength(3);
    expect(prompts.map((p) => p.anchorTurnId)).toEqual(turns.slice(-3).map((t) => t.id));
  });
});

// ── Placed marks ────────────────────────────────────────────

describe("mark-placed annotations", () => {
  it("pins visible-source marks and skips off-page ones", () => {
    const passage = turn("action", P1);
    const chars = [
      character(P1, {
        marks: [
          mark({ id: "m1", sourceTurnId: passage.id }),
          mark({ id: "m2", sourceTurnId: "not-on-page" }),
          mark({ id: "m3", sourceTurnId: null }),
        ],
      }),
    ];
    const result = deriveAnnotations(input({ storyTurns: [passage], characters: chars }));
    const placed = result.filter((a) => a.kind === "mark-placed");
    expect(placed).toHaveLength(1);
    expect(placed[0]).toMatchObject({ id: "mark-placed:m1", anchorTurnId: passage.id });
  });
});

// ── Edit window + ordering + grouping ───────────────────────

describe("edit-window and ordering", () => {
  it("wraps the editable turn and orders the margin by sortOrder", () => {
    const a = turn("narration", GM);
    const request = turn("roll-request", GM, { metadata: rollRequestMeta() });
    const b = turn("action", P1);
    const result = deriveAnnotations(
      input({ storyTurns: [a, b], logTurns: [request], editableTurn: b }),
    );
    expect(result.map((x) => x.kind)).toEqual(["roll-question", "edit-window"]);
    expect(result[0].sortOrder).toBeLessThan(result[1].sortOrder);
  });

  it("ignores an editable turn that is not a story turn", () => {
    const ooc = turn("ooc", P1);
    const result = deriveAnnotations(input({ editableTurn: ooc }));
    expect(result).toHaveLength(0);
  });

  it("groups annotations by anchor for the mobile folds", () => {
    const passage = turn("narration", GM);
    const request = turn("roll-request", GM, { metadata: rollRequestMeta() });
    const result = deriveAnnotations(
      input({ storyTurns: [passage], logTurns: [request], clocks: [clock()] }),
    );
    const groups = groupAnnotationsByAnchor(result);
    expect(groups.get(passage.id)?.map((a) => a.kind)).toEqual(["roll-question"]);
    // No scene-break on the page → the clock pins to the head (null anchor).
    expect(groups.get(null)?.map((a) => a.kind)).toEqual(["clock"]);
  });
});
