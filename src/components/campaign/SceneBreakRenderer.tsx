import type { Turn } from "@/types/campaign";
import { parseSceneBreakMetadata } from "@/lib/campaign-turns";
import {
  DEFAULT_SCENE_BREAK_CLASSES,
  SCENE_BREAK_MOOD_CLASSES,
} from "./ProseAssembler";

interface SceneBreakRendererProps {
  turn: Turn;
}

export default function SceneBreakRenderer({ turn }: SceneBreakRendererProps) {
  const meta = parseSceneBreakMetadata(turn.metadata);
  const mood = meta?.mood ?? "";
  const title = meta?.title ?? "";
  const classes = SCENE_BREAK_MOOD_CLASSES[mood] ?? DEFAULT_SCENE_BREAK_CLASSES;

  return (
    <div className="flex items-center gap-4 my-12 px-4">
      <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
      {title ? (
        <span className={`text-[10px] uppercase tracking-[0.3em] font-display ${classes.text}`}>
          {title}
        </span>
      ) : mood ? (
        <span className={`text-[10px] uppercase tracking-[0.3em] font-display ${classes.textFaded} italic`}>
          {mood}
        </span>
      ) : null}
      <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
    </div>
  );
}
