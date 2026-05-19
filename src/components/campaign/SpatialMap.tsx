"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, MapPin } from "lucide-react";

import type { Place } from "@/hooks/use-places";
import type { PlaceVisit } from "./PlacesPanel";

const MOOD_FILL: Record<string, string> = {
  tense: "#e11d48",
  calm: "#82b084",
  ominous: "#8b5cf6",
  triumphant: "#d97706",
  melancholy: "#818cf8",
  chaotic: "#f97316",
  mysterious: "#22d3ee",
  romantic: "#f472b6",
};
const NEUTRAL_FILL = "#d4af37";

function moodColor(mood: string | null): string {
  if (!mood) return NEUTRAL_FILL;
  return MOOD_FILL[mood] ?? NEUTRAL_FILL;
}

interface SpatialMapProps {
  places: Place[];
  visits: Map<string, PlaceVisit>;
  currentPlaceId: string | null;
  mapImageUrl: string | null;
  isGM: boolean;
  onJumpToTurn: (turnId: string) => void;
  // GM-only writes. The parent gates these by checking isGM before calling.
  onMovePlace?: (placeId: string, x: number, y: number) => Promise<void> | void;
  onUnplacePlace?: (placeId: string) => Promise<void> | void;
  onSetMapImage?: (url: string | null) => Promise<void> | void;
}

/**
 * Drag-driven map of placed pins. Coordinates are percentages, so the
 * map scales freely with the container. Pins without coords live in the
 * unplaced rail and can be dragged onto the canvas (GM only). Pins on
 * the canvas can be dragged to reposition or pulled off into the rail
 * to un-place them.
 *
 * The map image itself is a URL on `stories.map_image_url`. The "set
 * image" dialog accepts a URL only — proper file storage is a follow-up,
 * but we deliberately don't accept inline data: URIs because the avatar
 * incident showed those balloon DB rows and auth cookies.
 */
export default function SpatialMap({
  places,
  visits,
  currentPlaceId,
  mapImageUrl,
  isGM,
  onJumpToTurn,
  onMovePlace,
  onUnplacePlace,
  onSetMapImage,
}: SpatialMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Drag state. `previewPos` is the pin's position during drag so we don't
  // beat the server with PATCH requests on every pointermove.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);

  const placed = useMemo(
    () => places.filter((p) => p.x !== null && p.y !== null),
    [places],
  );
  const unplaced = useMemo(
    () => places.filter((p) => p.x === null || p.y === null),
    [places],
  );

  const relativePos = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, Math.round(x))),
      y: Math.max(0, Math.min(100, Math.round(y))),
    };
  }, []);

  // Global pointer listeners run only while a drag is active. Keeps the
  // event count low and avoids leaking handlers when the parent unmounts.
  useEffect(() => {
    if (!draggingId) return;
    const handleMove = (e: PointerEvent) => {
      const pos = relativePos(e.clientX, e.clientY);
      if (pos) setPreviewPos(pos);
    };
    const handleUp = async (e: PointerEvent) => {
      const pos = relativePos(e.clientX, e.clientY);
      const id = draggingId;
      setDraggingId(null);
      setPreviewPos(null);
      if (pos && onMovePlace) {
        await onMovePlace(id, pos.x, pos.y);
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingId, relativePos, onMovePlace]);

  const startDrag = (placeId: string) => {
    if (!isGM) return;
    setDraggingId(placeId);
  };

  const handlePinClick = (place: Place) => {
    if (draggingId) return; // ignore the click that ends a drag
    const visit = visits.get(place.id);
    if (visit?.latestTurnId) {
      onJumpToTurn(visit.latestTurnId);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border/30 px-5 py-3">
        <div>
          <h2 className="font-display text-lg text-paper">Map</h2>
          <p className="mt-0.5 text-[11.5px] italic text-text-ghost">
            {mapImageUrl
              ? isGM
                ? "Drag places onto the map. Drag a pin back to the rail to un-place it."
                : "Tap a pin to jump to that scene."
              : isGM
                ? "Add a background image to draw pins on it."
                : "No map yet — the GM hasn't set a background."}
          </p>
        </div>
        {isGM && (
          <button
            onClick={() => setShowImageDialog(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-elevated/40 px-3 text-[11.5px] text-text-secondary transition-colors hover:border-amber/40 hover:text-paper"
          >
            <ImageIcon size={12} />
            {mapImageUrl ? "Change map" : "Set map"}
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden bg-ink">
          {mapImageUrl ? (
            <div
              ref={canvasRef}
              className="relative h-full w-full"
              style={{
                backgroundImage: `url("${mapImageUrl}")`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              {placed.map((place) => {
                const isCurrent = place.id === currentPlaceId;
                const isDragging = draggingId === place.id;
                const x = isDragging && previewPos ? previewPos.x : place.x!;
                const y = isDragging && previewPos ? previewPos.y : place.y!;
                const fill = moodColor(place.mood);
                const visit = visits.get(place.id);
                return (
                  <motion.div
                    key={place.id}
                    layout={!isDragging}
                    onPointerDown={(e) => {
                      if (!isGM) return;
                      e.preventDefault();
                      startDrag(place.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(place);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-full select-none ${
                      isGM ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${isDragging ? "z-50" : "z-10"}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shadow-lg ${
                          isCurrent ? "animate-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: fill,
                          borderColor: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <MapPin size={11} className="text-paper" />
                      </span>
                      <span
                        className={`mt-1 max-w-[160px] truncate rounded-md border px-1.5 py-0.5 text-[10.5px] font-display backdrop-blur-md ${
                          isCurrent
                            ? "border-amber/40 bg-void/85 text-amber"
                            : "border-border bg-void/80 text-paper"
                        }`}
                      >
                        {place.name}
                        {visit && visit.visitCount > 1 && (
                          <span className="ml-1 text-text-ghost">·{visit.visitCount}</span>
                        )}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-ghost">
              <ImageIcon size={32} className="opacity-40" />
              <p className="font-display text-base text-text-secondary">
                {isGM ? "Drop a map image to begin" : "The GM hasn't drawn a map yet."}
              </p>
              {isGM && (
                <button
                  onClick={() => setShowImageDialog(true)}
                  className="rounded-full border border-amber/40 bg-amber/10 px-4 py-1.5 text-[11.5px] text-amber transition-colors hover:bg-amber/15"
                >
                  Set map image
                </button>
              )}
            </div>
          )}
        </div>

        {/* GM-only unplaced rail */}
        {isGM && (
          <aside className="hidden w-52 shrink-0 flex-col border-l border-border/30 bg-void/40 sm:flex">
            <div className="border-b border-border/30 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                Unplaced
              </p>
              <p className="mt-0.5 text-[11px] italic text-text-ghost">
                Drag onto the map to pin.
              </p>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
              {unplaced.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11.5px] italic text-text-ghost">
                  All known places are on the map.
                </p>
              ) : (
                unplaced.map((place) => (
                  <button
                    key={place.id}
                    onPointerDown={(e) => {
                      if (!mapImageUrl) return;
                      e.preventDefault();
                      startDrag(place.id);
                    }}
                    disabled={!mapImageUrl}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-elevated/40 px-2.5 py-1.5 text-left transition-colors hover:border-amber/30 disabled:opacity-40"
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: moodColor(place.mood) }}
                    />
                    <span className="min-w-0 flex-1 truncate font-display text-[12.5px] text-paper">
                      {place.name}
                    </span>
                  </button>
                ))
              )}
            </div>
            {placed.length > 0 && onUnplacePlace && (
              <div className="border-t border-border/30 px-3 py-2 text-[10.5px] italic text-text-ghost">
                Drag a placed pin off-canvas to remove it.
              </div>
            )}
          </aside>
        )}
      </div>

      {showImageDialog && (
        <MapImageDialog
          currentUrl={mapImageUrl}
          onSubmit={async (url) => {
            await onSetMapImage?.(url);
            setShowImageDialog(false);
          }}
          onClose={() => setShowImageDialog(false)}
        />
      )}
    </div>
  );
}

function MapImageDialog({
  currentUrl,
  onSubmit,
  onClose,
}: {
  currentUrl: string | null;
  onSubmit: (url: string | null) => Promise<void> | void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (url: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      className="absolute inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-ink p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-paper">Map background</h3>
        <p className="mt-1 text-[12px] italic text-text-ghost">
          Paste an image URL. Keep it under 4 KB — real file uploads will
          land in a later release.
        </p>
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…"
          maxLength={4096}
          className="mt-4 w-full rounded-lg border border-border bg-elevated/40 px-3 py-2 text-[13px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/40"
          autoFocus
        />
        {error && (
          <p className="mt-2 text-[11.5px] text-rose">{error}</p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          {currentUrl ? (
            <button
              onClick={() => void save(null)}
              disabled={saving}
              className="text-[12px] text-rose transition-opacity hover:opacity-80"
            >
              Remove map
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-border px-4 py-1.5 text-[12px] text-text-secondary hover:text-paper"
            >
              Cancel
            </button>
            <button
              onClick={() => void save(value.trim() || null)}
              disabled={saving || (value.trim() === (currentUrl ?? ""))}
              className="rounded-full border border-amber/40 bg-amber/10 px-4 py-1.5 text-[12px] text-amber transition-colors hover:bg-amber/15 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
