"use client";

import { useEffect, useState } from "react";

/**
 * Shared loader for the editor routes: resolves the signed-in user, the story,
 * and its chapters (with content), and verifies the viewer owns the story or is
 * an accepted collaborator. Extracted from the inline `loadStory()` in
 * `write/[storyId]/page.tsx` so the standalone editors (webtoon today, others
 * later) don't each reimplement it.
 */
export interface StoryMeta {
  id: string;
  title: string;
  slug: string | null;
  userId: string;
  format: string;
  writingMode: string | null;
}

export interface StoryChapter {
  id: string;
  title: string;
  sortOrder: number;
  status: string;
  content: string;
  /** Webtoon "script" / beats — persisted to chapters.outline. */
  outline: string;
  wordCount: number;
}

interface UseStoryChaptersResult {
  story: StoryMeta | null;
  chapters: StoryChapter[];
  activeChapterId: string | null;
  setActiveChapterId: (id: string) => void;
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}

interface RawChapter {
  id: string;
  title?: string;
  sortOrder?: number;
  status?: string;
  content?: string;
  outline?: string;
  wordCount?: number;
}

export function useStoryChapters(storyId: string): UseStoryChaptersResult {
  const [story, setStory] = useState<StoryMeta | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const sData = await fetch("/api/auth/session").then((r) => r.json());
        if (!sData?.user?.id) {
          if (typeof window !== "undefined") {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          }
          return;
        }
        if (cancelled) return;
        setCurrentUserId(sData.user.id);

        const [storyRes, chRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`, { cache: "no-store" }),
          fetch(`/api/stories/${storyId}/chapters?withContent=true`, { cache: "no-store" }),
        ]);
        if (!storyRes.ok) {
          if (!cancelled) { setError("Story not found"); setLoading(false); }
          return;
        }
        const s = (await storyRes.json()).data;

        // Access check: owner, or an accepted collaborator.
        if (s.userId !== sData.user.id) {
          const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
          const collabs = collabRes.ok ? (await collabRes.json()).data || [] : [];
          const ok = collabs.some(
            (c: { userId: string; status: string }) => c.userId === sData.user.id && c.status === "accepted",
          );
          if (!ok) {
            if (!cancelled) { setError("You don’t have access to this story"); setLoading(false); }
            return;
          }
        }

        if (cancelled) return;
        setStory({
          id: s.id,
          title: s.title,
          slug: s.slug ?? null,
          userId: s.userId,
          format: s.format,
          writingMode: s.writingMode ?? null,
        });

        if (chRes.ok) {
          const raw: RawChapter[] = (await chRes.json()).data || [];
          const mapped: StoryChapter[] = raw
            .map((c) => ({
              id: c.id,
              title: c.title || "Untitled",
              sortOrder: c.sortOrder ?? 0,
              status: c.status || "draft",
              content: c.content || "",
              outline: c.outline || "",
              wordCount: c.wordCount ?? 0,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
          if (!cancelled) {
            setChapters(mapped);
            if (mapped.length > 0) setActiveChapterId((prev) => prev ?? mapped[0].id);
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return { story, chapters, activeChapterId, setActiveChapterId, currentUserId, loading, error };
}
