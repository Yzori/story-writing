"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Shared live-data hook for the dashboard design mockups.
// Mirrors the real /dashboard feeds so each mockup renders against real stories,
// campaigns, and notifications — not placeholder data. Throwaway: lives under
// /dashboard-mockup and is not linked from the app shell.
// ─────────────────────────────────────────────────────────────────────────────

export interface MockNotification {
  id: string;
  type: "chapter" | "spark" | "follow" | "comment" | "update" | string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface MockCampaign {
  id: string;
  title: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  writingMode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  role: "gm" | "player" | "both";
  playerCount: number;
  chapterCount: number;
  totalWords: number;
  myCharacter: { id: string; name: string; status: string } | null;
  activeSession: {
    id: string;
    title: string;
    status: string;
    activePlayerId: string | null;
  } | null;
}

export function resumeHref(story: ApiStory | null, campaigns: MockCampaign[]): string {
  if (!story) return "/create";
  if (story.writingMode === "campaign") {
    const session = campaigns.find((c) => c.id === story.id)?.activeSession ?? null;
    return session ? `/campaign/${story.id}/play/${session.id}` : `/campaign/${story.id}`;
  }
  if (story.writingMode === "co-op") return `/write/${story.id}/co-op`;
  if (story.format === "webtoon") return `/write/${story.id}/webtoon`;
  return `/write/${story.id}`;
}

export function storyHref(story: ApiStory): string {
  if (story.writingMode === "campaign") return `/campaign/${story.id}`;
  if (story.format === "webtoon") return `/write/${story.id}/webtoon`;
  return `/write/${story.id}`;
}

// `pollMs` opts the surface into quiet background refreshes (no skeleton flash
// after the first load) so a live page can re-rank itself as signals change.
export function useDashboardData(pollMs?: number) {
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [campaigns, setCampaigns] = useState<MockCampaign[]>([]);
  const [notifs, setNotifs] = useState<MockNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const asJson = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return res.json();
    };

    const fetchAll = () => {
      const s = asJson("/api/stories?mine=true")
        .then((j) => {
          if (!cancelled && j.data?.stories) setStories(j.data.stories);
        })
        .catch(() => !cancelled && setError(true));
      const c = asJson("/api/campaigns/mine")
        .then((j) => {
          if (!cancelled && Array.isArray(j.data)) setCampaigns(j.data);
        })
        .catch(() => !cancelled && setError(true));
      const n = asJson("/api/notifications?limit=10")
        .then((j) => {
          if (!cancelled && Array.isArray(j.data)) setNotifs(j.data);
        })
        .catch(() => !cancelled && setError(true));
      // Only the first pass flips `loaded`; refreshes update silently.
      Promise.allSettled([s, c, n]).then(() => {
        if (!cancelled) setLoaded(true);
      });
    };

    fetchAll();
    const id = pollMs && pollMs > 0 ? window.setInterval(fetchAll, pollMs) : undefined;
    return () => {
      cancelled = true;
      if (id !== undefined) window.clearInterval(id);
    };
  }, [pollMs]);

  // Owned stories + campaigns joined as a player, deduped, newest first.
  const allStories = useMemo<ApiStory[]>(() => {
    const ownedIds = new Set(stories.map((s) => s.id));
    const projected: ApiStory[] = campaigns
      .filter((c) => !ownedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        title: c.title,
        format: "novel",
        synopsis: c.synopsis,
        coverImageUrl: c.coverImageUrl,
        genres: [],
        contentRating: "everyone",
        status: c.status,
        writingMode: c.writingMode,
        slug: null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        authorName: null,
        chapterCount: c.chapterCount,
        totalWords: c.totalWords,
        sparkCount: 0,
        playerCount: c.playerCount,
      }));
    return [...stories, ...projected].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [stories, campaigns]);

  const activeStory = allStories[0] ?? null;
  const unreadComments = notifs.filter((n) => n.type === "comment" && !n.read).length;
  const liveCampaigns = useMemo(
    () =>
      [...campaigns].sort((a, b) => {
        const al = a.activeSession ? 1 : 0;
        const bl = b.activeSession ? 1 : 0;
        if (al !== bl) return bl - al;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [campaigns],
  );

  return {
    loaded,
    error,
    stories,
    campaigns,
    notifs,
    allStories,
    activeStory,
    activeHref: resumeHref(activeStory, campaigns),
    unreadComments,
    liveCampaigns,
  };
}
