import type {
  CampaignSession,
  PlayerCharacter,
  RollRequest,
  FloorRound,
  Turn,
} from "@/types/campaign";
import {
  isStoryTurnType,
  parseRollMetadata,
  parseRollRequestMetadata,
  parseSceneBreakMetadata,
} from "@/lib/campaign-turns";

// Pure derivations for the campaign play surface. These are direct ports of
// logic that used to live inline in the play page (and InitiativeBar) — kept
// pure so the page shell stays thin and each rule is unit-testable.

/** A player asking the Director for the pen (derived from the OOC stream). */
export interface SpotlightBid {
  userId: string;
  characterName: string;
  sortOrder: number;
}

/** A non-owner active player — an Acting-GM handoff target (D2). */
export interface ActingGmPlayer {
  userId: string;
  name: string;
}

/**
 * Spotlight queue (hand-raises), derived from the OOC turn stream: a player's
 * latest {spotlightRequest} is "open" until they cancel it, post a story beat,
 * or get handed the pen. The Director never queues.
 */
export function deriveSpotlightQueue(
  turns: Turn[],
  characters: PlayerCharacter[],
  ownerId: string | null | undefined,
  activePlayerId: string | null | undefined,
): SpotlightBid[] {
  const latestRequest = new Map<string, number>();
  const latestCancel = new Map<string, number>();
  const latestStoryBy = new Map<string, number>();
  for (const t of turns) {
    if (!t.userId) continue;
    if (t.type === "ooc" && t.metadata) {
      let meta: { spotlightRequest?: boolean; spotlightCancel?: boolean } | null = null;
      try {
        meta = JSON.parse(t.metadata);
      } catch {
        meta = null;
      }
      if (meta?.spotlightRequest) {
        latestRequest.set(t.userId, Math.max(latestRequest.get(t.userId) ?? -1, t.sortOrder));
      } else if (meta?.spotlightCancel) {
        latestCancel.set(t.userId, Math.max(latestCancel.get(t.userId) ?? -1, t.sortOrder));
      }
    } else if (isStoryTurnType(t.type)) {
      latestStoryBy.set(t.userId, Math.max(latestStoryBy.get(t.userId) ?? -1, t.sortOrder));
    }
  }
  const out: SpotlightBid[] = [];
  for (const [userId, reqSort] of latestRequest) {
    if (userId === ownerId) continue; // the Director doesn't queue
    if ((latestCancel.get(userId) ?? -1) > reqSort) continue;
    if ((latestStoryBy.get(userId) ?? -1) > reqSort) continue;
    if (activePlayerId === userId) continue; // already holds the pen
    const char = characters.find((c) => c.userId === userId);
    out.push({ userId, characterName: char?.name ?? "A player", sortOrder: reqSort });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The most recent open roll-request targeting this player (or "everyone")
 * that they haven't answered yet. Null for the GM, and null when the
 * player's character isn't active — the server would reject every attempt
 * and the ritual modal cannot be dismissed.
 */
export function derivePendingRollRequest(
  turns: Turn[],
  currentUserId: string | null,
  isGM: boolean,
  myCharacterStatus: string | null | undefined,
): RollRequest | null {
  if (!currentUserId || isGM) return null;
  if (myCharacterStatus !== "active") return null;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.type !== "roll-request" || !t.metadata) continue;
    const meta = parseRollRequestMetadata(t.metadata);
    if (!meta) continue;
    if ((meta.status ?? "open") !== "open") continue;
    const requiredUserIds: string[] = meta.requiredUserIds?.length
      ? meta.requiredUserIds
      : meta.targetUserId === "everyone"
        ? [currentUserId]
        : [meta.targetUserId];
    if (!requiredUserIds.includes(currentUserId)) continue;
    const hasResponded = turns.some(
      (r) =>
        r.type === "roll" &&
        r.userId === currentUserId &&
        parseRollMetadata(r.metadata)?.rollRequestTurnId === t.id,
    );
    if (hasResponded) continue;
    return {
      targetUserId: meta.targetUserId,
      attribute: meta.attribute,
      reason: meta.reason,
      onSuccess: meta.onSuccess ?? "",
      onFailure: meta.onFailure ?? "",
      fatal: meta.fatal === true,
      status: meta.status ?? "open",
      requiredUserIds,
      turnId: t.id,
      sortOrder: t.sortOrder,
    };
  }
  return null;
}

/**
 * Save-trump availability: a scene resets at each scene-break. Base one save
 * (the aspect) + one per active vow the character carries (P1 #10). Mirrors
 * the server check in turns/route.ts so the dice UI disables a spent invoke.
 */
export function deriveAspectAvailable(
  turns: Turn[],
  currentUserId: string | null,
  myCharacter: PlayerCharacter | null | undefined,
): boolean {
  if (!currentUserId) return true;
  let sceneStart = -1;
  for (const t of turns) {
    if (t.type === "scene-break" && t.sortOrder > sceneStart) sceneStart = t.sortOrder;
  }
  const used = turns.filter(
    (t) =>
      t.type === "roll" &&
      t.userId === currentUserId &&
      t.sortOrder > sceneStart &&
      parseRollMetadata(t.metadata)?.aspectSaved === true,
  ).length;
  const vowCount = (myCharacter?.marks ?? []).filter((m) => m.kind === "vow").length;
  return used < 1 + vowCount;
}

/**
 * OOC turns carrying an "Extend +3min" request — the turn timer applies these
 * to every client's countdown (crucially the GM's, which auto-returns the pen).
 */
export function deriveExtensionTurns(logTurns: Turn[]): Turn[] {
  return logTurns.filter((t) => t.type === "ooc" && !!t.metadata?.includes("timerExtension"));
}

/**
 * "Extend +3min" requests travel as OOC turns with {timerExtension} metadata
 * so every client extends the same deadline. (Moved from InitiativeBar.)
 */
export function parseTimerExtensionSeconds(metadata: string | null | undefined): number {
  if (!metadata) return 0;
  try {
    const parsed = JSON.parse(metadata) as { timerExtension?: unknown } | null;
    return typeof parsed?.timerExtension === "number" && parsed.timerExtension > 0
      ? parsed.timerExtension
      : 0;
  } catch {
    return 0;
  }
}

export interface CurrentScene {
  title: string;
  mood: string;
  aspects: string[];
}

/**
 * The current scene, read back from the latest non-cinematic scene-break.
 * Falls back to the session title/status before the first break.
 */
export function deriveCurrentScene(
  storyTurns: Turn[],
  campaignSession: Pick<CampaignSession, "title" | "status"> | null,
): CurrentScene {
  for (let i = storyTurns.length - 1; i >= 0; i--) {
    const turn = storyTurns[i];
    if (turn.type === "scene-break" && turn.metadata) {
      const meta = parseSceneBreakMetadata(turn.metadata);
      if (meta?.cinematic) continue;
      return {
        title: meta?.title || campaignSession?.title || "Current Scene",
        mood: meta?.mood ?? "live",
        aspects: meta?.aspects ?? [],
      };
    }
  }
  return {
    title: campaignSession?.title ?? "Current Scene",
    mood: campaignSession?.status ?? "live",
    aspects: [],
  };
}

export type PhaseKey =
  | "draft"
  | "ended"
  | "director"
  | "spotlight"
  | "check"
  | "crossroads_open"
  | "crossroads_voting"
  | "crossroads_closed";

export interface PhaseState {
  key: PhaseKey;
  /** Short badge text — "Spotlight", "Check Pending", "Table Vote"… */
  label: string;
  /** One-line explanation of what the table is waiting on. */
  hint: string;
  /** Who holds the pen — character name, "Director", or "Player joining…". */
  spotlightLabel: string;
}

/**
 * The table's current phase — what everyone is waiting on. Drives the phase
 * banner. Port of the play page's inline phaseLabel/phaseHint derivation.
 */
export function derivePhase(input: {
  floorRound: FloorRound | null;
  pendingRollRequest: RollRequest | null;
  campaignSession: Pick<CampaignSession, "status" | "activePlayerId"> | null;
  characters: PlayerCharacter[];
  isGM: boolean;
}): PhaseState {
  const { floorRound, pendingRollRequest, campaignSession, characters, isGM } = input;
  const activePlayerId = campaignSession?.activePlayerId ?? null;
  const activePlayerCharacter = characters.find((c) => c.userId === activePlayerId);
  const spotlightLabel =
    activePlayerCharacter?.name ?? (activePlayerId ? "Player joining…" : "Director");

  if (campaignSession?.status === "draft") {
    return { key: "draft", label: "Preparing", hint: "The story is about to begin.", spotlightLabel };
  }
  if (campaignSession?.status === "completed") {
    return { key: "ended", label: "Ended", hint: "The session has closed.", spotlightLabel };
  }

  if (floorRound) {
    const key: PhaseKey =
      floorRound.status === "open"
        ? "crossroads_open"
        : floorRound.status === "voting"
          ? "crossroads_voting"
          : "crossroads_closed";
    const label =
      floorRound.status === "open"
        ? "Crossroads Open"
        : floorRound.status === "voting"
          ? "Table Vote"
          : floorRound.status === "closed"
            ? "Director Resolving"
            : "Crossroads";
    return { key, label, hint: floorRound.prompt, spotlightLabel };
  }

  if (pendingRollRequest) {
    return {
      key: "check",
      label: "Check Pending",
      hint: pendingRollRequest.reason,
      spotlightLabel,
    };
  }

  if (activePlayerId) {
    return {
      key: "spotlight",
      label: "Spotlight",
      hint: `${spotlightLabel} is writing the next beat.`,
      spotlightLabel,
    };
  }

  return {
    key: "director",
    label: "Director Beat",
    hint: isGM
      ? "Frame the scene, call a check, or pass the spotlight."
      : "Waiting for the Director to frame the next beat.",
    spotlightLabel,
  };
}

/**
 * Acting-GM continuity (D2): the table of active players (handoff targets +
 * name lookup), excluding the owner.
 */
export function deriveActingGmPlayers(
  characters: PlayerCharacter[],
  ownerId: string | null | undefined,
): ActingGmPlayer[] {
  const seen = new Set<string>();
  const list: ActingGmPlayer[] = [];
  for (const c of characters) {
    if (c.status !== "active" || c.userId === ownerId || seen.has(c.userId)) continue;
    seen.add(c.userId);
    list.push({ userId: c.userId, name: c.name || c.user?.displayName || "A player" });
  }
  return list;
}
