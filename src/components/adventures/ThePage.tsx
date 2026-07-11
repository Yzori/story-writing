"use client";

import type {
  AdventurePassageView,
  AdventureSceneView,
  AdventureSeatView,
  AdventureView,
} from "@/types/adventure";
import { inkFor } from "@/components/adventures/ink";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

/**
 * The bound page: running head, scene rules, passages with a
 * right-aligned margin gloss column (who, as-whom), ink signatures,
 * the in-page "X has the spotlight — writing…" line, and a folio.
 * The page stays pure story — all controls live below it.
 */
export default function ThePage({
  adventure,
  seats,
  scenes,
  passages,
  mySeatId,
}: {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  scenes: AdventureSceneView[];
  passages: AdventurePassageView[];
  mySeatId: string;
}) {
  const seatById = new Map(seats.map((s) => [s.id, s] as const));
  const sceneById = new Map(scenes.map((s) => [s.id, s] as const));
  const spotlightSeat = adventure.spotlightSeatId
    ? (seatById.get(adventure.spotlightSeatId) ?? null)
    : null;
  const openScene = scenes.find((s) => s.status === "open") ?? null;

  // Group passages by scene, in page order.
  const seenScenes = new Set<string>();
  const blocks: Array<
    | { type: "scene"; scene: AdventureSceneView }
    | { type: "passage"; passage: AdventurePassageView }
  > = [];
  for (const passage of passages) {
    if (!seenScenes.has(passage.sceneId)) {
      seenScenes.add(passage.sceneId);
      const scene = sceneById.get(passage.sceneId);
      if (scene) blocks.push({ type: "scene", scene });
    }
    blocks.push({ type: "passage", passage });
  }
  // An open scene with no passages yet still gets its rule on the page.
  if (openScene && !seenScenes.has(openScene.id)) {
    blocks.push({ type: "scene", scene: openScene });
  }

  const totalWords = passages.reduce((sum, p) => sum + p.wordCount, 0);
  const folio = Math.max(1, Math.ceil(totalWords / 300));

  return (
    <div className="relative bg-gradient-to-b from-surface to-ink border border-border rounded-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_26px_64px_rgba(0,0,0,0.5)] px-6 sm:px-11 pt-9 pb-6 font-reading text-paper">
      <div className="text-center font-body font-medium text-[10px] tracking-[0.3em] uppercase text-text-ghost pb-3 border-b border-border">
        {adventure.title}
        {adventure.actNo > 0 && ` · Act ${adventure.actNo}`}
      </div>

      {blocks.length === 0 && (
        <p className="text-center font-reading italic text-text-secondary text-[15px] my-12">
          {adventure.status === "casting"
            ? "The table is still being cast — the page waits."
            : "The Director is about to open the first scene."}
        </p>
      )}

      {blocks.map((block) =>
        block.type === "scene" ? (
          <SceneMark key={`scene-${block.scene.id}`} scene={block.scene} />
        ) : (
          <Passage
            key={block.passage.id}
            passage={block.passage}
            seat={seatById.get(block.passage.seatId) ?? null}
            isMine={block.passage.seatId === mySeatId}
          />
        )
      )}

      {adventure.status === "running" &&
        spotlightSeat &&
        spotlightSeat.role === "writer" && (
          <div className="flex items-center justify-center gap-2.5 mt-9 font-reading italic text-[14.5px] text-teal">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full flex-none bg-teal shadow-[0_0_12px_3px_rgba(87,210,203,0.55)] animate-pulse"
            />
            {spotlightSeat.id === mySeatId
              ? "You have the spotlight — the page is yours"
              : `${spotlightSeat.userName ?? spotlightSeat.characterName} has the spotlight — writing…`}
          </div>
        )}

      <div className="text-center font-reading italic text-[12.5px] text-text-ghost mt-6">
        · {folio} ·
      </div>
    </div>
  );
}

function SceneMark({ scene }: { scene: AdventureSceneView }) {
  return (
    <div className="flex items-center gap-4 my-7 font-body text-[11px] tracking-[0.26em] uppercase text-gold whitespace-nowrap max-sm:whitespace-normal max-sm:tracking-[0.16em] max-sm:text-center">
      <span
        aria-hidden
        className="h-px flex-1 min-w-[18px] bg-gradient-to-r from-transparent to-gold/40"
      />
      <span>
        {scene.sceneNo === 1 && scene.actNo > 1
          ? `Act ${sceneWord(scene.actNo)} · `
          : ""}
        Scene {sceneWord(scene.sceneNo)}
        {scene.title ? ` — ${scene.title}` : ""}
      </span>
      <span
        aria-hidden
        className="h-px flex-1 min-w-[18px] bg-gradient-to-r from-gold/40 to-transparent"
      />
    </div>
  );
}

function Passage({
  passage,
  seat,
  isMine,
}: {
  passage: AdventurePassageView;
  seat: AdventureSeatView | null;
  isMine: boolean;
}) {
  const isDirection = passage.kind !== "character";
  const ink = isDirection ? inkFor("amber") : inkFor(seat?.inkColor ?? "amber");
  const who = seat?.userName ?? (isDirection ? "Director" : "—");

  return (
    <div className="grid md:grid-cols-[108px_minmax(0,1fr)] gap-x-6 gap-y-1.5 mb-7">
      <div className="md:text-right pt-1.5 max-md:flex max-md:flex-wrap max-md:items-baseline max-md:gap-x-2.5">
        <div
          className={`font-body font-bold text-[11px] tracking-[0.14em] uppercase ${isDirection ? "text-gold" : ink.text}`}
        >
          {who}
          {isMine && <span className="text-text-ghost font-normal normal-case tracking-normal"> (you)</span>}
        </div>
        <div className="font-body text-[10.5px] text-text-ghost leading-relaxed mt-0.5 max-md:mt-0">
          {isDirection
            ? "Director"
            : seat?.characterName
              ? `as ${seat.characterName}`
              : "writer"}
        </div>
      </div>
      <div className="min-w-0">
        <div
          className={`text-[16.5px] leading-[1.64] [&>p]:mb-3 [&>p:last-child]:mb-0 ${
            isDirection ? "text-text" : "text-paper"
          }`}
          // Sanitized on write; sanitized again here for defense in depth.
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlClient(passage.content) }}
        />
        {!isDirection && seat && (
          <div className="flex items-center justify-end gap-2.5 mt-2">
            <svg width="64" height="14" viewBox="0 0 64 14" aria-hidden>
              <path
                d="M2 9 C 14 2, 24 13, 36 7 S 56 3, 62 8"
                fill="none"
                stroke={ink.stroke}
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
            <span className="font-reading italic text-[13px] text-text-ghost">
              {seat.userName ?? seat.characterName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const SCENE_WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

function sceneWord(n: number): string {
  return SCENE_WORDS[n - 1] ?? String(n);
}
