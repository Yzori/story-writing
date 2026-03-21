import type { Turn } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";
import { DIALOGUE_VERBS } from "./ProseAssembler";

interface TurnRendererProps {
  turn: Turn;
  idx: number;
  group: Turn[];
  globalIdx: number;
  playerUserIds: string[];
}

export default function TurnRenderer({ turn, idx, group, globalIdx, playerUserIds }: TurnRendererProps) {
  const charName = turn.characterName ?? turn.user?.displayName ?? "Someone";
  const nameColor = getPlayerColor(turn.userId, playerUserIds);

  // Check if this character was already named recently in this paragraph
  const prevInGroup = group.slice(0, idx);
  const lastNamedSameChar = prevInGroup.findLastIndex((t) =>
    (t.characterName ?? t.user?.displayName) === charName &&
    ["action", "dialogue", "reaction"].includes(t.type)
  );
  const useFullName = lastNamedSameChar === -1 || idx - lastNamedSameChar > 2;

  // Pick dialogue verb based on position for variety
  const dialogueVerb = DIALOGUE_VERBS[globalIdx % DIALOGUE_VERBS.length];

  switch (turn.type) {
    case "scene-break":
      // Scene breaks are rendered at the paragraph level, not inline
      return null;

    case "illustration":
      // Illustrations are rendered at the paragraph level, not inline
      return null;

    case "narration":
    case "consequence":
      return <span key={turn.id} className="text-paper/80">{turn.content} </span>;

    case "dialogue":
      // Vary dialogue format
      if (globalIdx % 3 === 0 && useFullName) {
        return (
          <span key={turn.id}>
            <span className="text-paper/80">&ldquo;{turn.content},&rdquo; </span>
            <span className={nameColor}>{charName}</span>
            <span className="text-paper/80"> {dialogueVerb}. </span>
          </span>
        );
      }
      if (!useFullName) {
        return <span key={turn.id} className="text-paper/80">&ldquo;{turn.content}&rdquo; </span>;
      }
      return (
        <span key={turn.id}>
          <span className={nameColor}>{charName}</span>
          <span className="text-paper/80"> {dialogueVerb}, &ldquo;{turn.content}&rdquo; </span>
        </span>
      );

    case "reaction":
      if (!useFullName) {
        return <span key={turn.id} className="text-paper/70 italic">{turn.content} </span>;
      }
      return (
        <span key={turn.id}>
          <span className={nameColor}>{charName}</span>
          <span className="text-paper/70 italic"> {turn.content} </span>
        </span>
      );

    case "description":
      return <span key={turn.id} className="text-paper/60 italic">{turn.content} </span>;

    case "action":
    default:
      if (!useFullName) {
        return <span key={turn.id} className="text-paper/80">{turn.content} </span>;
      }
      return (
        <span key={turn.id}>
          <span className={nameColor}>{charName}</span>
          <span className="text-paper/80"> {turn.content} </span>
        </span>
      );
  }
}
