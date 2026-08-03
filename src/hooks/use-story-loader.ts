"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  type Chapter,
  type StoryProject,
  type WritingGoals,
  type TypographySettings,
  createChapter,
  createTypography,
} from "@/types/editor";
import { normalizeTypographySettings } from "@/lib/typography";
import { firstChapterTitleFor } from "@/lib/constants";
import {
  apiChapterToLocal,
  apiBibleToLocal,
  loadEditorSettings,
  saveEditorSettings,
} from "@/lib/editor-story-mappers";

export interface EditorCollaborator {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
}

export interface UseStoryLoaderResult {
  project: StoryProject | null;
  setProject: Dispatch<SetStateAction<StoryProject | null>>;
  loading: boolean;
  error: string | null;
  isPublic: boolean;
  setIsPublic: Dispatch<SetStateAction<boolean>>;
  storyFormat: string;
  writingMode: string;
  storySlug: string;
  collaborators: EditorCollaborator[];
  sessionUserId: string | null;
  needsTeamSetup: boolean;
}

/**
 * Loads the story, its chapters (with content), and bible into a StoryProject,
 * verifies edit permission, redirects webtoons to their standalone studio, and
 * mirrors editor-local settings (goals/typography) to localStorage.
 *
 * Owns all load-derived state — the page reads it and threads `setProject`
 * into its updateProject + autosave plumbing. Everything the page mutates
 * afterward (chapters, fields) flows through that returned setter.
 */
export function useStoryLoader(storyId: string): UseStoryLoaderResult {
  const router = useRouter();
  const [project, setProject] = useState<StoryProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [storyFormat, setStoryFormat] = useState("novel");
  const [writingMode, setWritingMode] = useState("solo");
  const [storySlug, setStorySlug] = useState("");
  const [collaborators, setCollaborators] = useState<EditorCollaborator[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);

  useEffect(() => {
    async function loadStory() {
      try {
        // Fetch story, chapters, and bible entries all in parallel
        const [storyRes, chaptersRes, bibleRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`, { cache: "no-store" }),
          fetch(`/api/stories/${storyId}/chapters?withContent=true`, { cache: "no-store" }),
          fetch(`/api/stories/${storyId}/bible`, { cache: "no-store" }),
        ]);
        if (!storyRes.ok) {
          setError("Story not found");
          setLoading(false);
          return;
        }
        const storyJson = await storyRes.json();
        const story = storyJson.data;

        // Webtoon is a vertical-panel comic, not a prose document — it has its
        // own full-bleed studio. Send it there instead of the prose cockpit.
        if (story.format === "webtoon") {
          router.replace(`/write/${storyId}/webtoon`);
          return;
        }

        // Verify current user is the story owner or an accepted collaborator
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (!sessionData?.user?.id) {
          setError("You must be logged in to edit this story");
          setLoading(false);
          return;
        }
        setSessionUserId(sessionData.user.id);
        const isOwner = sessionData.user.id === story.userId;

        // One collaborator fetch feeds three decisions: who may edit, whether a
        // co-op story has a team yet, and the presence strip. `teamKnown` stays
        // false if the call fails, so a network blip never invents an empty team.
        let allCollabs: EditorCollaborator[] = [];
        let teamKnown = false;
        if (story.writingMode !== "solo") {
          try {
            const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
            if (collabRes.ok) {
              const collabJson = await collabRes.json();
              allCollabs = (collabJson.data || []).map(
                (c: { id: string; userId: string; role: string; status: string; user?: { displayName?: string | null; avatarUrl?: string | null } | null }) => ({
                  id: c.id,
                  userId: c.userId,
                  displayName: c.user?.displayName || null,
                  avatarUrl: c.user?.avatarUrl || null,
                  role: c.role,
                  status: c.status,
                })
              );
              teamKnown = true;
            }
          } catch {
            // Leave teamKnown false — handled per-caller below.
          }
        }
        const acceptedCollabs = allCollabs.filter((c) => c.status === "accepted");

        if (!isOwner) {
          const isCollab = acceptedCollabs.some((c) => c.userId === sessionData.user.id);
          if (!isCollab) {
            setError("You don’t have permission to edit this story");
            setLoading(false);
            return;
          }
        }

        // Co-op is written at a shared scroll with a passed pen, not alone at
        // the desk. Only send them there once a team exists — a co-op story with
        // no accepted collaborators falls through to the prose page, which shows
        // the "assemble your team" gate.
        if (story.writingMode === "co-op" && acceptedCollabs.length > 0) {
          router.replace(`/write/${storyId}/co-op`);
          return;
        }

        const chaptersJson = await chaptersRes.json();
        const apiChapters = chaptersRes.ok ? chaptersJson.data : [];
        const bibleJson = bibleRes.ok ? await bibleRes.json() : { data: [] };
        const apiBibleEntries = bibleJson.data || [];

        // Load editor-only settings from localStorage
        const settings = loadEditorSettings(storyId);
        const savedGoals = settings.goals as WritingGoals | undefined;
        const savedTypography = (settings.typography ?? {}) as Partial<TypographySettings>;

        // Build StoryProject from API data + local settings
        const rawChapters: Chapter[] = apiChapters.map(apiChapterToLocal);
        const firstTitle = firstChapterTitleFor(story.format);
        const chaptersToUse = rawChapters.length > 0 ? rawChapters : [createChapter(firstTitle)];

        const proj: StoryProject = {
          id: story.id,
          title: story.title,
          format: story.format || "novel",
          chapters: chaptersToUse,
          activeChapterId: chaptersToUse[0]?.id ?? null,
          metadata: {
            coverImageDataUrl: story.coverImageUrl || null,
            synopsis: story.synopsis || "",
            hook: story.hook || "",
            genres: story.genres || [],
            contentRating: story.contentRating || "G",
            status: story.status || "draft",
            language: story.language || "English",
            dedication: story.dedication || "",
          },
          frontMatter: {
            epigraph: story.epigraph || "",
            epigraphAttribution: story.epigraphAttribution || "",
            foreword: story.foreword || "",
            showToc: story.showToc ?? true,
          },
          bible: apiBibleToLocal(apiBibleEntries),
          goals: savedGoals ?? { dailyWordTarget: story.dailyWordTarget || 500, sessions: [] },
          typography: normalizeTypographySettings({
            ...createTypography(),
            ...savedTypography,
            ...story,
          }),
        };

        // Legacy stories from before the server seeded chapter 1 arrive empty.
        // The client-minted chapter above only exists in memory — without a real
        // row nothing can ever save, so a failed create is a load error, not a
        // silent editor.
        if (apiChapters.length === 0) {
          try {
            const res = await fetch(`/api/stories/${storyId}/chapters`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: firstTitle }),
            });
            if (!res.ok) throw new Error(`Chapter create failed: ${res.status}`);
            const json = await res.json();
            const ch = apiChapterToLocal(json.data);
            proj.chapters = [ch];
            proj.activeChapterId = ch.id;
          } catch {
            setError("Couldn’t start the first chapter. Reload to try again.");
            setLoading(false);
            return;
          }
        }

        setProject(proj);
        setIsPublic(!!story.isPublic);
        setStoryFormat(story.format || "novel");
        setWritingMode(story.writingMode || "solo");
        setStorySlug(story.slug || storyId);

        // Collaborators drive the presence strip and the co-op team gate. If the
        // roster never loaded, let them write rather than gating on a failed call.
        if (story.writingMode === "co-op" || story.writingMode === "campaign") {
          setCollaborators(allCollabs);
          if (teamKnown && acceptedCollabs.length === 0 && story.writingMode === "co-op") {
            setNeedsTeamSetup(true);
          }
        }
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [storyId, router]);

  // Editor settings persistence — goals are editor-local; typography is now
  // story-backed but kept locally as a quick draft cache for older projects.
  const projectGoals = project?.goals;
  const projectTypography = project?.typography;
  useEffect(() => {
    if (!projectGoals || !projectTypography) return;
    saveEditorSettings(storyId, { goals: projectGoals, typography: projectTypography });
  }, [storyId, projectGoals, projectTypography]);

  return {
    project,
    setProject,
    loading,
    error,
    isPublic,
    setIsPublic,
    storyFormat,
    writingMode,
    storySlug,
    collaborators,
    sessionUserId,
    needsTeamSetup,
  };
}
