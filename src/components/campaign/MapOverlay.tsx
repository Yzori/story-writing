"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import { usePlaces } from "@/hooks/use-places";
import { parseSceneBreakMetadata } from "@/lib/campaign-turns";
import type { Turn } from "@/types/campaign";

import PlacesPanel, { type PlaceVisit } from "./PlacesPanel";
import SpatialMap from "./SpatialMap";

interface MapOverlayProps {
  storyId: string;
  storyTurns: Turn[];
  mapImageUrl: string | null;
  isGM: boolean;
  onClose: () => void;
  onUpdateMapImage: (url: string | null) => Promise<void> | void;
  /** Fires when the user picks a place. The overlay closes itself first
   *  and then the parent scrolls the prose canvas to the matching turn. */
  onJumpToTurn?: (turnId: string) => void;
  /** Counts up each time a new scene-break turn lands; the overlay uses it
   *  to refresh the places list so server-side auto-creates appear without
   *  the user having to close/reopen. */
  sceneBreakCount?: number;
}

const initialView: "places" | "map" = "places";

export default function MapOverlay({
  storyId,
  storyTurns,
  mapImageUrl,
  isGM,
  onClose,
  onUpdateMapImage,
  onJumpToTurn,
  sceneBreakCount,
}: MapOverlayProps) {
  const {
    places,
    refresh,
    createPlace,
    updatePlace,
    deletePlace,
  } = usePlaces(storyId);
  const [view, setView] = useState<"places" | "map">(initialView);

  // Refresh the place list whenever a new scene-break has landed since
  // the overlay was opened. The server upserts a place behind the turn
  // POST, so a fresh fetch is the simplest way to surface it without
  // chasing realtime state.
  useEffect(() => {
    if (sceneBreakCount === undefined) return;
    refresh();
  }, [sceneBreakCount, refresh]);

  // Derive visit info (latest scene-break turn id + count) and the
  // current place (= place referenced by the most recent scene-break).
  const { visits, currentPlaceId } = useMemo(() => {
    const visitMap = new Map<string, PlaceVisit>();
    let current: string | null = null;
    for (const turn of storyTurns) {
      if (turn.type !== "scene-break") continue;
      const meta = parseSceneBreakMetadata(turn.metadata);
      if (!meta?.locationId) continue;
      const existing = visitMap.get(meta.locationId);
      visitMap.set(meta.locationId, {
        latestTurnId: turn.id,
        visitCount: (existing?.visitCount ?? 0) + 1,
      });
      current = meta.locationId;
    }
    return { visits: visitMap, currentPlaceId: current };
  }, [storyTurns]);

  const handleJump = (turnId: string) => {
    onClose();
    // Defer the scroll one frame so the overlay's exit animation doesn't
    // intercept the new layout. The parent can also wire onJumpToTurn for
    // any extra behavior (highlight, toast, etc.).
    requestAnimationFrame(() => {
      const el = document.getElementById(`turn-${turnId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      onJumpToTurn?.(turnId);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Segmented toggle + close */}
      <header className="flex items-center justify-between gap-3 border-b border-border/30 bg-void/60 px-4 py-2.5 backdrop-blur-xl">
        <div className="inline-flex rounded-full border border-border bg-elevated/40 p-0.5 text-[11.5px]">
          {(["places", "map"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1 transition-colors ${
                view === option
                  ? "bg-amber/20 text-amber"
                  : "text-text-secondary hover:text-paper"
              }`}
            >
              {option === "places" ? "Places" : "Map"}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-elevated/40 text-text-secondary transition-colors hover:text-paper"
          aria-label="Close map overlay"
        >
          <X size={14} />
        </button>
      </header>

      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="flex-1 overflow-hidden"
      >
        {view === "places" ? (
          <PlacesPanel
            places={places}
            visits={visits}
            currentPlaceId={currentPlaceId}
            isGM={isGM}
            onJumpToTurn={handleJump}
            onCreatePlace={
              isGM
                ? async ({ name }) => {
                    await createPlace({ name });
                  }
                : undefined
            }
            onDeletePlace={
              isGM
                ? async (place) => {
                    await deletePlace(place.id);
                  }
                : undefined
            }
          />
        ) : (
          <SpatialMap
            places={places}
            visits={visits}
            currentPlaceId={currentPlaceId}
            mapImageUrl={mapImageUrl}
            isGM={isGM}
            onJumpToTurn={handleJump}
            onMovePlace={
              isGM
                ? async (placeId, x, y) => {
                    await updatePlace(placeId, { x, y });
                  }
                : undefined
            }
            onUnplacePlace={
              isGM
                ? async (placeId) => {
                    await updatePlace(placeId, { x: null, y: null });
                  }
                : undefined
            }
            onSetMapImage={isGM ? onUpdateMapImage : undefined}
          />
        )}
      </motion.div>
    </div>
  );
}
