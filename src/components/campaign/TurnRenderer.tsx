import type { Turn } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";
import { parseBargainMetadata } from "@/lib/campaign-turns";

interface TurnRendererProps {
  turn: Turn;
  idx: number;
  group: Turn[];
  playerUserIds: string[];
  currentUserId?: string | null;
  isGM?: boolean;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
}

export default function TurnRenderer({
  turn,
  idx,
  group,
  playerUserIds,
  currentUserId,
  isGM = false,
  onResolveBargain,
}: TurnRendererProps) {
  const charName = turn.characterName ?? turn.user?.displayName ?? "Someone";
  const nameColor = getPlayerColor(turn.userId, playerUserIds);
  const bargain = turn.type === "consequence" ? parseBargainMetadata(turn.metadata) : null;

  if (bargain) {
    const status = bargain.status ?? "open";
    const canAnswer =
      status === "open" &&
      !isGM &&
      !!currentUserId &&
      (bargain.targetUserId === "everyone" || bargain.targetUserId === currentUserId);

    return (
      <span key={turn.id} className="my-4 inline-block w-full rounded-xl border border-amber/25 bg-elevated/90 p-4 align-middle shadow-[0_14px_42px_rgba(0,0,0,0.28)]">
        <span className="mb-3 flex items-start justify-between gap-3">
          <span>
            <span className="block text-[10px] font-display uppercase tracking-[0.18em] text-amber">Bargain Offered</span>
            <span className="mt-1 block text-[12px] text-text-tertiary">For {bargain.targetLabel}</span>
          </span>
          <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
            status === "accepted"
              ? "border-sage/25 bg-sage/10 text-sage"
              : status === "refused"
                ? "border-rose/25 bg-rose/10 text-rose"
                : "border-amber/25 bg-amber/10 text-amber"
          }`}>
            {status}
          </span>
        </span>
        <span className="grid gap-3 sm:grid-cols-2">
          <span className="rounded-lg border border-sage/15 bg-sage/[0.04] px-3 py-2.5">
            <span className="block text-[10px] uppercase tracking-[0.16em] text-sage">They Get</span>
            <span className="mt-1 block font-reading text-[15px] leading-relaxed text-paper">{bargain.gain}</span>
          </span>
          <span className="rounded-lg border border-rose/15 bg-rose/[0.04] px-3 py-2.5">
            <span className="block text-[10px] uppercase tracking-[0.16em] text-rose">It Costs</span>
            <span className="mt-1 block font-reading text-[15px] leading-relaxed text-paper">{bargain.price}</span>
          </span>
        </span>
        {bargain.responseLabel && (
          <span className="mt-3 block text-[12px] text-text-tertiary">
            Answered by {bargain.responseLabel}.
          </span>
        )}
        {canAnswer && (
          <span className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onResolveBargain?.(turn.id, "refused")}
              className="min-h-9 rounded-full border border-border bg-subtle/20 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:text-paper"
            >
              Refuse
            </button>
            <button
              type="button"
              onClick={() => onResolveBargain?.(turn.id, "accepted")}
              className="min-h-9 rounded-full border border-amber/35 bg-amber/15 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber/20"
            >
              Accept
            </button>
          </span>
        )}
      </span>
    );
  }

  // Check if this character was already named recently in this paragraph
  const prevInGroup = group.slice(0, idx);
  const lastNamedSameChar = prevInGroup.findLastIndex((t) =>
    (t.characterName ?? t.user?.displayName) === charName &&
    ["action", "dialogue", "reaction"].includes(t.type)
  );
  const useFullName = lastNamedSameChar === -1 || idx - lastNamedSameChar > 2;

  switch (turn.type) {
    case "scene-break":
      // Scene breaks are rendered at the paragraph level, not inline
      return null;

    case "story-moment":
      // Story moments are rendered at the paragraph level, not inline
      return null;

    case "illustration":
      // Illustrations are rendered at the paragraph level, not inline
      return null;

    case "narration":
    case "consequence":
      return <span key={turn.id} className="text-paper/80">{turn.content} </span>;

    case "dialogue":
      // Deterministic attribution with the neutral "said" — invisible in prose
      // and never contradicts the line's tone. (The old position-based verb
      // cycling + format switch could render a shouted threat as "murmured" and
      // changed unrelated lines when a turn was inserted upstream. Audit P2.)
      if (!useFullName) {
        return <span key={turn.id} className="text-paper/80">&ldquo;{turn.content}&rdquo; </span>;
      }
      return (
        <span key={turn.id}>
          <span className={nameColor}>{charName}</span>
          <span className="text-paper/80"> said, &ldquo;{turn.content}&rdquo; </span>
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
