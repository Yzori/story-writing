import type { CharacterMark, CharacterMarkKind, PlayerCharacter, Turn } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import {
  isLegacyCinematicSceneBreak,
  isStoryTurnType,
  parseBargainMetadata,
  parseConsequenceMetadata,
  parseRollMetadata,
  parseRollRequestMetadata,
  parseStoryMomentMetadata,
  type BargainMetadata,
  type RollMetadata,
  type RollRequestMetadata,
} from "@/lib/campaign-turns";

/**
 * The manuscript's margin is one unified annotation stream: everything
 * mechanical that happens to the page (roll questions, ink stamps, clocks,
 * marks, bargains, the edit pencil) is derived here as pure data, then
 * rendered by MarginRail (desktop gutter) or InlineNoteFold (mobile slips).
 *
 * Anchoring rules:
 * - Log-stream events (roll-request, roll) anchor to the latest VISIBLE
 *   story turn written before them — the passage they interrupted.
 * - Clocks anchor to the latest non-cinematic scene-break — the scene they
 *   threaten. No scene yet → anchorTurnId null (top of the page).
 * - Marks anchor to their sourceTurnId when that turn is visible.
 * - Bargains and mark prompts on story turns anchor to the turn itself.
 * - anchorTurnId null means "pin to the head of the page".
 */

interface AnnotationBase {
  /** Unique, stable key for React lists. */
  id: string;
  /** Story turn this note sits beside; null pins to the page head. */
  anchorTurnId: string | null;
  /** Orders notes that share an anchor (and the margin overall). */
  sortOrder: number;
}

export interface RollQuestionAnnotation extends AnnotationBase {
  kind: "roll-question";
  turn: Turn;
  meta: RollRequestMetadata;
  /** The current user is (still) expected to answer this request. */
  isMine: boolean;
}

export interface RollStampAnnotation extends AnnotationBase {
  kind: "roll-stamp";
  turn: Turn;
  meta: RollMetadata;
}

export interface ClockAnnotation extends AnnotationBase {
  kind: "clock";
  clock: ProgressClockData;
}

export interface MarkPromptAnnotation extends AnnotationBase {
  kind: "mark-prompt";
  turn: Turn;
  characterId: string;
  defaultKind: CharacterMarkKind;
  preamble: string;
}

export interface MarkPlacedAnnotation extends AnnotationBase {
  kind: "mark-placed";
  mark: CharacterMark;
  characterName: string;
}

export interface BargainAnnotation extends AnnotationBase {
  kind: "bargain";
  turn: Turn;
  meta: BargainMetadata;
  /** The current user may answer (open bargain targeting them). */
  canRespond: boolean;
}

export interface EditWindowAnnotation extends AnnotationBase {
  kind: "edit-window";
  turn: Turn;
}

export type ManuscriptAnnotation =
  | RollQuestionAnnotation
  | RollStampAnnotation
  | ClockAnnotation
  | MarkPromptAnnotation
  | MarkPlacedAnnotation
  | BargainAnnotation
  | EditWindowAnnotation;

export interface DeriveAnnotationsInput {
  /** Story turns currently on the page (the visible pagination window). */
  storyTurns: Turn[];
  /** The ooc/roll/roll-request stream (full log). */
  logTurns: Turn[];
  clocks: ProgressClockData[];
  characters: PlayerCharacter[];
  myCharacter: PlayerCharacter | null;
  currentUserId: string | null;
  /** Mark prompts the player passed on this session (component state). */
  dismissedMarkTurnIds?: ReadonlySet<string>;
  /** The turn currently inside its 30s edit window (from useTurnEditing). */
  editableTurn?: Turn | null;
}

/** Cap mark prompts like MarkPromptRail did — keep the margin quiet. */
const MAX_MARK_PROMPTS = 3;

/** Latest visible story turn strictly before `sortOrder`; null when none. */
function anchorForLogEvent(storyTurns: Turn[], sortOrder: number): string | null {
  for (let i = storyTurns.length - 1; i >= 0; i--) {
    if (storyTurns[i].sortOrder < sortOrder) return storyTurns[i].id;
  }
  return storyTurns.length > 0 ? storyTurns[0].id : null;
}

function latestSceneBreakId(storyTurns: Turn[]): string | null {
  for (let i = storyTurns.length - 1; i >= 0; i--) {
    const turn = storyTurns[i];
    if (turn.type === "scene-break" && !isLegacyCinematicSceneBreak(turn.type, turn.metadata)) {
      return turn.id;
    }
  }
  return null;
}

/** Ported from MarkPromptRail: which turns invite the player to mark. */
function deriveMarkPrompts(input: DeriveAnnotationsInput): MarkPromptAnnotation[] {
  const { storyTurns, logTurns, myCharacter, currentUserId, dismissedMarkTurnIds } = input;
  if (!myCharacter || !currentUserId) return [];
  const alreadyMarked = new Set(
    (myCharacter.marks ?? []).map((m) => m.sourceTurnId).filter((id): id is string => !!id),
  );
  const prompts: MarkPromptAnnotation[] = [];

  const consider = (turn: Turn) => {
    if (alreadyMarked.has(turn.id) || dismissedMarkTurnIds?.has(turn.id)) return;

    if (turn.type === "roll" && turn.userId === currentUserId) {
      const meta = parseRollMetadata(turn.metadata);
      if (!meta?.markEligible) return;
      const fatal = meta.fatal === true;
      prompts.push({
        kind: "mark-prompt",
        id: `mark-prompt:${turn.id}`,
        anchorTurnId: anchorForLogEvent(storyTurns, turn.sortOrder),
        sortOrder: turn.sortOrder,
        turn,
        characterId: myCharacter.id,
        defaultKind: fatal ? "scar" : meta.tier === "partial" ? "debt" : "scar",
        preamble: fatal
          ? "This one almost cost you."
          : meta.tier === "partial"
            ? "Something was spent."
            : "The world refused you.",
      });
      return;
    }

    if (turn.type === "consequence") {
      const bargain = parseBargainMetadata(turn.metadata);
      if (bargain?.kind === "bargain") {
        if (
          bargain.status === "accepted" &&
          bargain.markEligible &&
          bargain.responseUserId === currentUserId
        ) {
          prompts.push({
            kind: "mark-prompt",
            id: `mark-prompt:${turn.id}`,
            anchorTurnId: turn.id,
            sortOrder: turn.sortOrder,
            turn,
            characterId: myCharacter.id,
            defaultKind: "debt",
            preamble: "You took the bargain.",
          });
        }
        return;
      }
      const cons = parseConsequenceMetadata(turn.metadata);
      if (cons?.markEligible) {
        prompts.push({
          kind: "mark-prompt",
          id: `mark-prompt:${turn.id}`,
          anchorTurnId: turn.id,
          sortOrder: turn.sortOrder,
          turn,
          characterId: myCharacter.id,
          defaultKind: "scar",
          preamble: "The Director says: this leaves a mark.",
        });
      }
      return;
    }

    if (turn.type === "story-moment") {
      const sm = parseStoryMomentMetadata(turn.metadata);
      if (sm?.markEligible) {
        prompts.push({
          kind: "mark-prompt",
          id: `mark-prompt:${turn.id}`,
          anchorTurnId: turn.id,
          sortOrder: turn.sortOrder,
          turn,
          characterId: myCharacter.id,
          defaultKind: sm.mood === "death" ? "scar" : "memory",
          preamble: "A moment to carry.",
        });
      }
    }
  };

  // Roll prompts live in the log stream; consequence/story-moment prompts in
  // the story stream. Walk both in sortOrder so the recency cap is honest.
  const merged = [...storyTurns, ...logTurns].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const turn of merged) consider(turn);
  return prompts.slice(-MAX_MARK_PROMPTS);
}

export function deriveAnnotations(input: DeriveAnnotationsInput): ManuscriptAnnotation[] {
  const { storyTurns, logTurns, clocks, characters, currentUserId, editableTurn } = input;
  const annotations: ManuscriptAnnotation[] = [];

  // ── Roll questions + ink stamps (log stream) ──
  const answeredBy = new Map<string, Set<string>>(); // requestTurnId -> userIds who rolled
  for (const turn of logTurns) {
    if (turn.type !== "roll") continue;
    const meta = parseRollMetadata(turn.metadata);
    if (!meta?.rollRequestTurnId) continue;
    const set = answeredBy.get(meta.rollRequestTurnId) ?? new Set<string>();
    set.add(turn.userId);
    answeredBy.set(meta.rollRequestTurnId, set);
  }

  for (const turn of logTurns) {
    if (turn.type === "roll-request") {
      const meta = parseRollRequestMetadata(turn.metadata);
      if (!meta || meta.status === "cancelled") continue;
      // A fully-answered or closed question keeps its place only while open.
      if (meta.status && meta.status !== "open") continue;
      const required = meta.requiredUserIds?.length
        ? meta.requiredUserIds
        : [meta.targetUserId];
      const answered = answeredBy.get(turn.id) ?? new Set<string>();
      if (required.every((id) => answered.has(id))) continue;
      annotations.push({
        kind: "roll-question",
        id: `roll-question:${turn.id}`,
        anchorTurnId: anchorForLogEvent(storyTurns, turn.sortOrder),
        sortOrder: turn.sortOrder,
        turn,
        meta,
        isMine:
          !!currentUserId && required.includes(currentUserId) && !answered.has(currentUserId),
      });
      continue;
    }
    if (turn.type === "roll") {
      const meta = parseRollMetadata(turn.metadata);
      if (!meta) continue;
      annotations.push({
        kind: "roll-stamp",
        id: `roll-stamp:${turn.id}`,
        anchorTurnId: anchorForLogEvent(storyTurns, turn.sortOrder),
        sortOrder: turn.sortOrder,
        turn,
        meta,
      });
    }
  }

  // ── Clocks beside the scene they threaten ──
  const sceneAnchor = latestSceneBreakId(storyTurns);
  const sceneSort =
    sceneAnchor !== null
      ? (storyTurns.find((t) => t.id === sceneAnchor)?.sortOrder ?? 0)
      : 0;
  clocks.forEach((clock, index) => {
    annotations.push({
      kind: "clock",
      id: `clock:${clock.id}`,
      anchorTurnId: sceneAnchor,
      sortOrder: sceneSort + index * 0.001,
      clock,
    });
  });

  // ── Bargains (offer + resolution live in the margin) ──
  for (const turn of storyTurns) {
    if (turn.type !== "consequence") continue;
    const meta = parseBargainMetadata(turn.metadata);
    if (meta?.kind !== "bargain" || meta.status === "cancelled") continue;
    annotations.push({
      kind: "bargain",
      id: `bargain:${turn.id}`,
      anchorTurnId: turn.id,
      sortOrder: turn.sortOrder,
      turn,
      meta,
      canRespond:
        meta.status === "open" && !!currentUserId && meta.targetUserId === currentUserId,
    });
  }

  // ── Placed marks, pinned to the passage that caused them ──
  const visibleIds = new Set(storyTurns.map((t) => t.id));
  const sortById = new Map(storyTurns.map((t) => [t.id, t.sortOrder]));
  for (const character of characters) {
    for (const mark of character.marks ?? []) {
      if (!mark.sourceTurnId || !visibleIds.has(mark.sourceTurnId)) continue;
      annotations.push({
        kind: "mark-placed",
        id: `mark-placed:${mark.id}`,
        anchorTurnId: mark.sourceTurnId,
        sortOrder: (sortById.get(mark.sourceTurnId) ?? 0) + 0.0001,
        mark,
        characterName: character.name,
      });
    }
  }

  // ── Mark prompts (ported MarkPromptRail eligibility) ──
  annotations.push(...deriveMarkPrompts(input));

  // ── The 30s edit pencil ──
  if (editableTurn && isStoryTurnType(editableTurn.type)) {
    annotations.push({
      kind: "edit-window",
      id: `edit-window:${editableTurn.id}`,
      anchorTurnId: editableTurn.id,
      sortOrder: editableTurn.sortOrder + 0.0002,
      turn: editableTurn,
    });
  }

  annotations.sort((a, b) => a.sortOrder - b.sortOrder);
  return annotations;
}

/** Group for InlineNoteFold: annotations under their anchor paragraph. */
export function groupAnnotationsByAnchor(
  annotations: ManuscriptAnnotation[],
): Map<string | null, ManuscriptAnnotation[]> {
  const groups = new Map<string | null, ManuscriptAnnotation[]>();
  for (const annotation of annotations) {
    const list = groups.get(annotation.anchorTurnId);
    if (list) list.push(annotation);
    else groups.set(annotation.anchorTurnId, [annotation]);
  }
  return groups;
}
