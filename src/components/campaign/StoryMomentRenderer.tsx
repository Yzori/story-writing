import type { Turn } from "@/types/campaign";
import { parseSceneBreakMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";

interface StoryMomentRendererProps {
  turn: Turn;
  amplificationCount?: number;
  amplifiedByMe?: boolean;
  onAmplify?: (turnId: string) => void;
}

const MOOD_CLASSES: Record<string, { line: string; label: string; text: string }> = {
  tense: { line: "via-rose/35", label: "text-rose", text: "text-rose/80" },
  calm: { line: "via-sage/35", label: "text-sage", text: "text-sage/80" },
  ominous: { line: "via-violet/35", label: "text-violet-300", text: "text-violet-200/80" },
  triumphant: { line: "via-amber/40", label: "text-amber", text: "text-amber/85" },
  melancholy: { line: "via-indigo-400/35", label: "text-indigo-300", text: "text-indigo-300/80" },
  chaotic: { line: "via-orange-400/35", label: "text-orange-300", text: "text-orange-300/80" },
  mysterious: { line: "via-cyan-400/35", label: "text-cyan-300", text: "text-cyan-300/80" },
  romantic: { line: "via-pink-400/35", label: "text-pink-300", text: "text-pink-300/80" },
  death: { line: "via-rose/45", label: "text-rose", text: "text-rose/85" },
  betrayal: { line: "via-fuchsia-400/35", label: "text-fuchsia-300", text: "text-fuchsia-300/80" },
};

function getMomentData(turn: Turn) {
  if (turn.type === "story-moment") {
    const meta = parseStoryMomentMetadata(turn.metadata);
    return {
      text: turn.content,
      mood: meta?.mood ?? "ominous",
      subtext: meta?.subtext ?? "",
      importance: meta?.importance ?? "normal",
    };
  }

  const meta = parseSceneBreakMetadata(turn.metadata);
  return {
    text: turn.content || meta?.title || "",
    mood: meta?.mood ?? "ominous",
    subtext: "",
    importance: "normal",
  };
}

export default function StoryMomentRenderer({
  turn,
  amplificationCount = 0,
  amplifiedByMe = false,
  onAmplify,
}: StoryMomentRendererProps) {
  const { text, mood, subtext, importance } = getMomentData(turn);
  const classes = MOOD_CLASSES[mood] ?? MOOD_CLASSES.ominous;
  const isMajor = importance === "major";

  return (
    <div
      id={`turn-${turn.id}`}
      data-turn-id={turn.id}
      className={`my-12 scroll-mt-24 px-4 text-center ${isMajor ? "sm:my-16" : ""}`}
    >
      <div className="mb-4 flex items-center gap-4">
        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
        <span className={`text-[9px] font-display uppercase tracking-[0.28em] ${classes.label}`}>
          Story Moment
        </span>
        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
      </div>
      <p className={`mx-auto max-w-[560px] font-display leading-relaxed ${isMajor ? "text-[21px] sm:text-[26px]" : "text-[17px] sm:text-[21px]"} ${classes.text}`}>
        {text}
      </p>
      {subtext && (
        <p className="mx-auto mt-3 max-w-[520px] font-reading text-[13px] italic leading-relaxed text-text-tertiary sm:text-[14px]">
          {subtext}
        </p>
      )}
      {(onAmplify || amplificationCount > 0) && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {onAmplify && (
            <button
              type="button"
              onClick={() => onAmplify(turn.id)}
              disabled={amplifiedByMe}
              className={`min-h-9 rounded-full border px-4 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                amplifiedByMe
                  ? "cursor-default border-amber/25 bg-amber/10 text-amber/70"
                  : "border-amber/30 bg-black/30 text-amber hover:bg-amber/15"
              }`}
            >
              {amplifiedByMe ? "Held by you" : "Hold this moment"}
            </button>
          )}
          {amplificationCount > 0 && (
            <span className="rounded-full border border-border bg-subtle/20 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              Held by the Chorus · {amplificationCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
