"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { campaignJsonRequest } from "@/lib/campaign-api";

export interface Place {
  id: string;
  storyId: string;
  name: string;
  nameKey: string;
  mood: string | null;
  description: string;
  x: number | null;
  y: number | null;
  autoCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceWritable {
  name?: string;
  description?: string;
  mood?: string | null;
  x?: number | null;
  y?: number | null;
}

interface UsePlacesResult {
  places: Place[];
  loading: boolean;
  error: string | null;
  /** Re-fetch from the server. Called after scene-breaks arrive so newly
   *  auto-created places show up immediately. */
  refresh: () => Promise<void>;
  createPlace: (input: { name: string } & PlaceWritable) => Promise<Place | null>;
  updatePlace: (placeId: string, patch: PlaceWritable) => Promise<Place | null>;
  deletePlace: (placeId: string) => Promise<boolean>;
  placeById: (id: string | null | undefined) => Place | null;
}

/**
 * Loads + manages the per-campaign place registry that backs the Places
 * sidebar and the SpatialMap overlay. Mutations are GM-only on the server;
 * players get a 403 if they call create/update/delete, which the parent
 * surfaces as a toast.
 *
 * The hook deliberately does not own its own polling cadence — the play
 * page already polls turns at 5s, and the parent calls `refresh()` when a
 * new scene-break turn arrives. That keeps us from running two pollers
 * against the same campaign.
 */
export function usePlaces(storyId: string | null): UsePlacesResult {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!storyId) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/places`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        // Forbidden = not a collaborator on this story; that's expected
        // for spectators / unauthenticated viewers. Treat as empty list
        // rather than surfacing a banner.
        if (res.status === 403 || res.status === 404) {
          setPlaces([]);
          setError(null);
          return;
        }
        throw new Error(`Failed to load places (${res.status})`);
      }
      const json = await res.json();
      setPlaces(Array.isArray(json.data) ? json.data : []);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load places");
    } finally {
      if (inflight.current === controller) {
        setLoading(false);
        inflight.current = null;
      }
    }
  }, [storyId]);

  useEffect(() => {
    refresh();
    return () => inflight.current?.abort();
  }, [refresh]);

  const createPlace = useCallback<UsePlacesResult["createPlace"]>(
    async (input) => {
      if (!storyId) return null;
      const json = await campaignJsonRequest<Place>(
        `/api/stories/${storyId}/campaign/places`,
        {
          method: "POST",
          body: input,
          fallbackError: "Failed to create place",
        },
      );
      const created = json.data ?? null;
      if (created) {
        setPlaces((prev) => {
          const idx = prev.findIndex((p) => p.id === created.id);
          if (idx === -1) return [...prev, created];
          const next = prev.slice();
          next[idx] = created;
          return next;
        });
      }
      return created;
    },
    [storyId],
  );

  const updatePlace = useCallback<UsePlacesResult["updatePlace"]>(
    async (placeId, patch) => {
      if (!storyId) return null;
      const json = await campaignJsonRequest<Place>(
        `/api/stories/${storyId}/campaign/places/${placeId}`,
        {
          method: "PATCH",
          body: patch,
          fallbackError: "Failed to update place",
        },
      );
      const updated = json.data ?? null;
      if (updated) {
        setPlaces((prev) =>
          prev.map((p) => (p.id === placeId ? updated : p)),
        );
      }
      return updated;
    },
    [storyId],
  );

  const deletePlace = useCallback<UsePlacesResult["deletePlace"]>(
    async (placeId) => {
      if (!storyId) return false;
      await campaignJsonRequest(
        `/api/stories/${storyId}/campaign/places/${placeId}`,
        { method: "DELETE", fallbackError: "Failed to delete place" },
      );
      setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      return true;
    },
    [storyId],
  );

  const placeById = useCallback(
    (id: string | null | undefined): Place | null => {
      if (!id) return null;
      return places.find((p) => p.id === id) ?? null;
    },
    [places],
  );

  return useMemo(
    () => ({
      places,
      loading,
      error,
      refresh,
      createPlace,
      updatePlace,
      deletePlace,
      placeById,
    }),
    [places, loading, error, refresh, createPlace, updatePlace, deletePlace, placeById],
  );
}
