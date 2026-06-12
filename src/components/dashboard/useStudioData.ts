"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiStory } from "@/types/api";
import { editorHrefFor } from "@/lib/editor-links";

// ─────────────────────────────────────────────────────────────────────────────
// Production data hook for the live Studio dashboard. Fetches the existing
// feeds (stories / campaigns / notifications) plus the supplementary real
// signals from /api/dashboard. All real — no fabricated data. Quietly polls.
// ─────────────────────────────────────────────────────────────────────────────

export interface StudioCampaign {
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
  activeSession: { id: string; title: string; status: string; activePlayerId: string | null } | null;
}

export interface StudioNotification {
  id: string;
  type: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface StudioManuscript {
  storyId: string;
  slug: string | null;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  words: number;
  /** closing lines of the chapter, plain text, "…"-prefixed when mid-stream */
  lastLines: string;
  updatedAt: string;
}

export interface StudioReaderNote {
  id: string;
  content: string;
  author: string | null;
  storyTitle: string;
  slug: string | null;
  chapterId: string;
  createdAt: string;
}

export interface DashboardSignals {
  readingStreak: number;
  manuscript: StudioManuscript | null;
  readerNotes: StudioReaderNote[];
  newFollowersWeek: number;
  continueReading: {
    storyId: string;
    slug: string | null;
    storyTitle: string;
    coverImageUrl: string | null;
    genres: string[];
    author: string | null;
    chapterId: string;
    chapterTitle: string;
    chapterNumber: number;
    totalChapters: number;
    scrollPercent: number;
  } | null;
  wordsTrend: number[];
  sparksWeek: number;
  dropsWeek: number;
  suggestions: { count: number; latest: { storyId: string; storyTitle: string; storySlug: string | null; note: string; createdAt: string } | null };
  follows: { kind: "chapter" | "update"; storyId: string; slug: string | null; storyTitle: string; author: string | null; title: string; createdAt: string }[];
  commissions: { count: number; latest: { id: string; craft: string | null; title: string; patron: string | null; status: string; createdAt: string } | null };
}

export interface DiscoverData {
  trending: { id: string; title: string; slug: string | null; coverImageUrl: string | null; genres: string[]; author: string | null; sparkCount: number }[];
  jam: { id: string; title: string; theme: string; liveStatus: string } | null;
  openCall: { id: string; storyId: string; slug: string | null; storyTitle: string; role: string; title: string } | null;
}

const EMPTY_SIGNALS: DashboardSignals = {
  readingStreak: 0,
  manuscript: null,
  readerNotes: [],
  newFollowersWeek: 0,
  continueReading: null,
  wordsTrend: [],
  sparksWeek: 0,
  dropsWeek: 0,
  suggestions: { count: 0, latest: null },
  follows: [],
  commissions: { count: 0, latest: null },
};

const EMPTY_DISCOVER: DiscoverData = { trending: [], jam: null, openCall: null };

// Thin wrapper so dashboard surfaces keep one import; routing logic lives in
// the shared @/lib/editor-links helper (handles campaign/co-op/webtoon/novel).
export function storyHref(story: ApiStory): string {
  return editorHrefFor(story);
}

export function readingHref(s: DashboardSignals["continueReading"]): string {
  if (!s) return "/read";
  return s.slug ? `/story/${s.slug}/read/${s.chapterId}` : "/read";
}

export function useStudioData(pollMs?: number) {
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [campaigns, setCampaigns] = useState<StudioCampaign[]>([]);
  const [notifs, setNotifs] = useState<StudioNotification[]>([]);
  const [signals, setSignals] = useState<DashboardSignals>(EMPTY_SIGNALS);
  const [discover, setDiscover] = useState<DiscoverData>(EMPTY_DISCOVER);
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
      // Track the three core feeds per cycle — the page only goes fully dark
      // when every one of them failed; a successful cycle clears the error.
      const failed = { stories: false, campaigns: false, notifs: false };
      const s = asJson("/api/stories?mine=true")
        .then((j) => { if (!cancelled && j.data?.stories) setStories(j.data.stories); })
        .catch(() => { failed.stories = true; });
      const c = asJson("/api/campaigns/mine")
        .then((j) => { if (!cancelled && Array.isArray(j.data)) setCampaigns(j.data); })
        .catch(() => { failed.campaigns = true; });
      const n = asJson("/api/notifications?limit=10")
        .then((j) => { if (!cancelled && Array.isArray(j.data?.notifications)) setNotifs(j.data.notifications); })
        .catch(() => { failed.notifs = true; });
      const d = asJson("/api/dashboard")
        .then((j) => { if (!cancelled && j.data) setSignals(j.data); })
        .catch(() => { /* signals are supplementary — page still works without them */ });
      const v = asJson("/api/discover")
        .then((j) => { if (!cancelled && j.data) setDiscover(j.data); })
        .catch(() => { /* discovery is optional */ });
      Promise.allSettled([s, c, n, d, v]).then(() => {
        if (cancelled) return;
        setError(failed.stories && failed.campaigns && failed.notifs);
        setLoaded(true);
      });
    };
    fetchAll();
    // Poll quietly — but not in hidden tabs; catch up as soon as we're visible.
    const tick = () => { if (!document.hidden) fetchAll(); };
    const id = pollMs && pollMs > 0 ? window.setInterval(tick, pollMs) : undefined;
    const onVisible = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (id !== undefined) window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs]);

  // owned stories + campaigns joined as a player, deduped, newest first
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
  const activeHref = useMemo(() => {
    if (!activeStory) return "/create";
    const activeSession = campaigns.find((c) => c.id === activeStory.id)?.activeSession ?? null;
    return editorHrefFor(activeStory, activeSession);
  }, [activeStory, campaigns]);

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

  return { loaded, error, stories, campaigns, notifs, signals, discover, allStories, activeStory, activeHref, unreadComments, liveCampaigns };
}
