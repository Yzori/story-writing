"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Trash2 } from "lucide-react";

import type { Place } from "@/hooks/use-places";

// Mood → pill colour map. Mirrors the scheme used by scene-break renderers
// so the same scene reads the same colour wherever it shows up. Keep the
// list in sync with PLACE_MOOD_VALUES in validations.ts.
const MOOD_PILL: Record<string, string> = {
  tense: "bg-rose/15 text-rose border-rose/30",
  calm: "bg-sage/15 text-sage border-sage/30",
  ominous: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  triumphant: "bg-amber/15 text-amber border-amber/30",
  melancholy: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
  chaotic: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  mysterious: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  romantic: "bg-pink-400/15 text-pink-300 border-pink-400/30",
};
const NEUTRAL_PILL = "bg-subtle/30 text-text-secondary border-border-subtle";

export interface PlaceVisit {
  latestTurnId: string;
  visitCount: number;
}

interface PlacesPanelProps {
  places: Place[];
  /** Map of placeId → which scene-break turns reference it. Drives the
   *  visit count badge + the click-to-jump target. */
  visits: Map<string, PlaceVisit>;
  /** The place from the most recent scene-break, if any. */
  currentPlaceId: string | null;
  isGM: boolean;
  onJumpToTurn: (turnId: string) => void;
  onCreatePlace?: (input: { name: string }) => Promise<void> | void;
  onDeletePlace?: (place: Place) => Promise<void> | void;
}

export default function PlacesPanel({
  places,
  visits,
  currentPlaceId,
  isGM,
  onJumpToTurn,
  onCreatePlace,
  onDeletePlace,
}: PlacesPanelProps) {
  const [creatingName, setCreatingName] = useState("");
  const [creating, setCreating] = useState(false);

  // Sort: current place first, then visited (recent first), then unvisited
  // (alphabetical). This matches the natural reading order — "where we are
  // now, where we've been, where we might go."
  const ordered = useMemo(() => {
    return [...places].sort((a, b) => {
      if (a.id === currentPlaceId) return -1;
      if (b.id === currentPlaceId) return 1;
      const av = visits.get(a.id);
      const bv = visits.get(b.id);
      const aVisited = av ? 1 : 0;
      const bVisited = bv ? 1 : 0;
      if (aVisited !== bVisited) return bVisited - aVisited;
      if (av && bv) {
        // Both visited — recent first. Lacking timestamps on visits, fall
        // back to visit count then name.
        if (bv.visitCount !== av.visitCount) return bv.visitCount - av.visitCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [places, currentPlaceId, visits]);

  const handleCreate = async () => {
    const name = creatingName.trim();
    if (!name || !onCreatePlace) return;
    setCreating(true);
    try {
      await onCreatePlace({ name });
      setCreatingName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/30 px-5 py-4">
        <h2 className="font-display text-lg text-paper">Places</h2>
        <p className="mt-1 text-[12px] italic text-text-ghost">
          {places.length === 0
            ? "Scene breaks build this list as the story moves."
            : `${places.length} location${places.length === 1 ? "" : "s"} in this campaign.`}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {ordered.length === 0 ? (
          <div className="px-3 py-12 text-center text-[13px] italic text-text-ghost">
            No places yet. Drop a scene break in the story and one lands here
            automatically.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {ordered.map((place) => {
              const visit = visits.get(place.id);
              const isCurrent = place.id === currentPlaceId;
              const moodKey = place.mood ?? "";
              const pill = MOOD_PILL[moodKey] ?? NEUTRAL_PILL;
              const canJump = Boolean(visit?.latestTurnId);

              return (
                <li key={place.id}>
                  <motion.button
                    layout
                    onClick={() => {
                      if (visit?.latestTurnId) onJumpToTurn(visit.latestTurnId);
                    }}
                    disabled={!canJump}
                    className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      isCurrent
                        ? "border-amber/40 bg-amber/[0.07]"
                        : visit
                          ? "border-border bg-elevated/40 hover:border-amber/30"
                          : "border-border-subtle bg-elevated/20 opacity-70 hover:opacity-100"
                    } ${canJump ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${pill}`}
                      aria-hidden
                    >
                      <MapPin size={11} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-display text-[14.5px] text-paper">
                          {place.name}
                        </span>
                        {isCurrent && (
                          <span className="shrink-0 rounded-full border border-amber/40 bg-amber/10 px-1.5 py-px text-[9px] uppercase tracking-[0.18em] text-amber">
                            here
                          </span>
                        )}
                        {place.autoCreated && !isCurrent && !visit && (
                          <span className="shrink-0 text-[10px] italic text-text-ghost">
                            unvisited
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
                        {place.mood && (
                          <span className={`rounded-full border px-1.5 py-px text-[9.5px] uppercase tracking-wider ${pill}`}>
                            {place.mood}
                          </span>
                        )}
                        {visit && visit.visitCount > 1 && (
                          <span className="text-text-ghost">
                            · {visit.visitCount} scenes
                          </span>
                        )}
                        {place.x !== null && place.y !== null && (
                          <span className="text-text-ghost">· on map</span>
                        )}
                      </span>
                      {place.description && (
                        <p className="mt-1 line-clamp-2 text-[12px] italic text-text-ghost">
                          {place.description}
                        </p>
                      )}
                    </span>
                    {isGM && onDeletePlace && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${place.name}"? Scenes that reference it stay intact.`)) {
                            void onDeletePlace(place);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.stopPropagation();
                          if (window.confirm(`Delete "${place.name}"?`)) {
                            void onDeletePlace(place);
                          }
                        }}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete ${place.name}`}
                      >
                        <Trash2 size={13} className="text-text-ghost hover:text-rose" />
                      </span>
                    )}
                  </motion.button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isGM && onCreatePlace && (
        <footer className="border-t border-border/30 px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              placeholder="Add a place…"
              maxLength={120}
              className="flex-1 rounded-lg border border-border bg-elevated/40 px-3 py-1.5 text-[13px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/40"
              disabled={creating}
            />
            <button
              type="submit"
              disabled={!creatingName.trim() || creating}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/40 bg-amber/10 text-amber transition-colors hover:bg-amber/15 disabled:opacity-40"
              aria-label="Add place"
            >
              <Plus size={14} />
            </button>
          </form>
          <p className="mt-1.5 text-[10.5px] italic text-text-ghost">
            Scene breaks auto-create entries; this is for places you want on
            the list before they're visited.
          </p>
        </footer>
      )}
    </div>
  );
}
