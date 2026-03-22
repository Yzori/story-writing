"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tiptap/react";
import {
  Chapter,
  ChapterSnapshot,
  StoryProject,
  StoryMetadata,
  StoryBible,
  FrontMatter,
  TypographySettings,
  WritingGoals,
  createChapter,
  createStoryProject,
  countWords,
} from "@/types/editor";
import { CommentThread, createCommentThread, addReply } from "@/client/comments";
import { getOrCreateSession } from "@/client/goals";
// export functions are dynamically imported in handlers below
import ChapterNav from "@/components/editor/ChapterNav";
import ProseEditor from "@/components/editor/ProseEditor";
import PoetryEditor from "@/components/editor/PoetryEditor";
import ScreenplayEditor from "@/components/editor/ScreenplayEditor";
import WebtoonEditor from "@/components/editor/WebtoonEditor";
import IllustratedEditor from "@/components/editor/IllustratedEditor";
import EditorErrorBoundary from "@/components/editor/EditorErrorBoundary";
import CommandPalette from "@/components/editor/CommandPalette";
import CommentsSidebar from "@/components/editor/CommentsSidebar";
import CommentPopover from "@/components/editor/CommentPopover";
import MetadataPanel from "@/components/editor/MetadataPanel";
import StoryBiblePanel from "@/components/editor/StoryBiblePanel";
import FrontMatterPanel from "@/components/editor/FrontMatterPanel";
import ChapterSettingsPanel from "@/components/editor/ChapterSettingsPanel";
import HistoryPanel from "@/components/editor/HistoryPanel";
import OutlineView from "@/components/editor/OutlineView";
import TypographyPanel from "@/components/editor/TypographyPanel";
import ToolkitPanel from "@/components/editor/ToolkitPanel";
import SearchReplace from "@/components/editor/SearchReplace";
import GoalsPanel from "@/components/editor/GoalsPanel";
import StatusBar from "@/components/editor/StatusBar";
import { useToast } from "@/components/shared/Toast";
import ChapterOutlinePanel from "@/components/editor/ChapterOutlinePanel";
import OnboardingHints from "@/components/editor/OnboardingHints";
import ShortcutsPanel from "@/components/editor/ShortcutsPanel";

type RightPanel = "none" | "comments" | "metadata" | "bible" | "frontmatter" | "chapter" | "typography" | "history";

// Local storage key for editor-only settings (typography, goals, etc.)
function editorSettingsKey(storyId: string) {
  return `quiloria-editor-${storyId}`;
}

function loadEditorSettings(storyId: string) {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(editorSettingsKey(storyId));
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveEditorSettings(storyId: string, settings: Record<string, unknown>) {
  try {
    localStorage.setItem(editorSettingsKey(storyId), JSON.stringify(settings));
  } catch {}
}

// Convert API chapter data → store Chapter format
interface ApiBibleEntry {
  id: string;
  type: string;
  name: string;
  description: string;
  details: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function apiBibleToLocal(entries: ApiBibleEntry[]): StoryBible {
  const characters = entries
    .filter((e) => e.type === "character")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        name: e.name,
        aliases: extra.aliases || [],
        description: e.description || "",
        imageDataUrl: extra.imageDataUrl || null,
        color: extra.color || "#D4A574",
        tags: extra.tags || [],
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  const places = entries
    .filter((e) => e.type === "place")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        name: e.name,
        description: e.description || "",
        imageDataUrl: extra.imageDataUrl || null,
        tags: extra.tags || [],
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  const notes = entries
    .filter((e) => e.type === "note")
    .map((e) => {
      const extra = parseDetails(e.details);
      return {
        id: e.id,
        title: e.name,
        content: e.description || "",
        category: (extra.category || "custom") as "lore" | "timeline" | "research" | "custom",
        tags: extra.tags || [],
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  return { characters, places, notes };
}

function parseDetails(details: string): Record<string, any> {
  if (!details) return {};
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
}

interface ApiChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  sortOrder: number;
  status: "draft" | "published";
  authorNoteBefore: string;
  authorNoteAfter: string;
  outline: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const FORMAT_LABELS: Record<string, { singular: string; plural: string }> = {
  novel: { singular: "Chapter", plural: "Chapters" },
  poetry: { singular: "Poem", plural: "Poems" },
  webtoon: { singular: "Episode", plural: "Episodes" },
  illustrated: { singular: "Chapter", plural: "Chapters" },
  screenplay: { singular: "Scene", plural: "Scenes" },
};

function getFormatLabels(format: string) {
  return FORMAT_LABELS[format] || FORMAT_LABELS.novel;
}

function apiChapterToLocal(ch: ApiChapter): Chapter {
  return {
    id: ch.id,
    title: ch.title || "Untitled",
    content: ch.content || "",
    wordCount: ch.wordCount || 0,
    createdAt: new Date(ch.createdAt).getTime(),
    updatedAt: new Date(ch.updatedAt).getTime(),
    status: ch.status || "draft",
    authorNoteBefore: ch.authorNoteBefore || "",
    authorNoteAfter: ch.authorNoteAfter || "",
    outline: ch.outline || "",
    version: ch.version || 1,
    snapshots: [],
  };
}

export default function WriteStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.storyId as string;

  const [project, setProject] = useState<StoryProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [undoAction, setUndoAction] = useState<{
    message: string;
    undo: () => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Right panel
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");

  // Comments
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [commentPopover, setCommentPopover] = useState<{
    position: { x: number; y: number };
    selectedText: string;
    from: number;
    to: number;
  } | null>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  // Goals
  const [showGoals, setShowGoals] = useState(false);
  // Outline view
  const [showOutline, setShowOutline] = useState(false);
  // Toolkit
  const [showToolkit, setShowToolkit] = useState(false);
  // Publish state
  const [isPublic, setIsPublic] = useState(false);
  const [writingMode, setWritingMode] = useState("solo");
  const [storySlug, setStorySlug] = useState("");
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);
  const [showRosterNudge, setShowRosterNudge] = useState(false);
  const [rosterNudgeDismissed, setRosterNudgeDismissed] = useState(false);
  // Format-aware editor
  const [storyFormat, setStoryFormat] = useState("novel");

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  // Reference pane
  const [refPaneOpen, setRefPaneOpen] = useState(false);
  const [refPaneTab, setRefPaneTab] = useState<"bible" | "notes">("bible");

  // Canvas UI state
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [showChapterOutline, setShowChapterOutline] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Save state indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Track which chapters have unsaved content changes (content + version for optimistic locking)
  const pendingSaves = useRef<Map<string, { content: string; version: number }>>(new Map());
  const failedSaves = useRef<Map<string, { content: string; version: number }>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const isRetrying = useRef(false);
  const isSwitching = useRef(false);

  // ── Load story from API ──────────────────────────────────
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

        // Verify current user is the story owner
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (!sessionData?.user?.id || sessionData.user.id !== story.userId) {
          setError("You don\u2019t have permission to edit this story");
          setLoading(false);
          return;
        }

        const chaptersJson = await chaptersRes.json();
        const apiChapters = chaptersRes.ok ? chaptersJson.data : [];
        const bibleJson = bibleRes.ok ? await bibleRes.json() : { data: [] };
        const apiBibleEntries = bibleJson.data || [];

        // Load editor-only settings from localStorage
        const settings = loadEditorSettings(storyId);

        // Build StoryProject from API data + local settings
        const rawChapters: Chapter[] = apiChapters.map(apiChapterToLocal);
        const formatFirstUnit: Record<string, string> = { novel: "Chapter 1", poetry: "Poem 1", webtoon: "Episode 1", illustrated: "Chapter 1", screenplay: "Scene 1" };
        const firstTitle = formatFirstUnit[story.format || "novel"] || "Chapter 1";
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
          goals: settings.goals ?? { dailyWordTarget: story.dailyWordTarget || 500, sessions: [] },
          typography: settings.typography ?? { dropCaps: story.dropCaps ?? false, sceneBreakStyle: story.sceneBreakStyle || "asterism" },
        };

        // If no chapters existed, create the first one via API
        if (apiChapters.length === 0) {
          const res = await fetch(`/api/stories/${storyId}/chapters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: firstTitle }),
          });
          if (res.ok) {
            const json = await res.json();
            const ch = apiChapterToLocal(json.data);
            proj.chapters = [ch];
            proj.activeChapterId = ch.id;
          }
        }

        setProject(proj);
        setIsPublic(!!story.isPublic);
        setStoryFormat(story.format || "novel");
        setWritingMode(story.writingMode || "solo");
        setStorySlug(story.slug || storyId);

        // Co-op gate: check if any collaborators have accepted
        if (story.writingMode === "co-op") {
          try {
            const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
            if (collabRes.ok) {
              const collabJson = await collabRes.json();
              const accepted = (collabJson.data || []).filter(
                (c: { status: string }) => c.status === "accepted"
              );
              if (accepted.length === 0) {
                setNeedsTeamSetup(true);
              }
            }
          } catch {
            // Non-blocking — let them write if check fails
          }
        }
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [storyId]);

  // ── Debounced auto-save to API ────────────────────────────
  useEffect(() => {
    if (!project) return;

    // Save editor-only settings to localStorage
    saveEditorSettings(storyId, {
      goals: project.goals,
      typography: project.typography,
    });

    // Flush pending chapter saves with retry
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const entries = Array.from(pendingSaves.current.entries());
      if (entries.length === 0) return;

      setSaveState("saving");
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);

      const maxRetries = 3;
      let lastError = false;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }

        try {
          const saves = entries.map(([chapterId, { content, version }]) =>
            fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content, baseVersion: version }),
            })
          );
          const responses = await Promise.all(saves);
          // Check for auth expiry
          if (responses.some((r) => r.status === 401)) {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
            return;
          }
          // Check for version conflict
          if (responses.some((r) => r.status === 409)) {
            pendingSaves.current.clear();
            failedSaves.current.clear();
            setSaveState("conflict");
            toast("Another user edited this chapter. Reload to see their changes.", "error");
            return;
          }
          if (responses.every((r) => r.ok)) {
            // Update local chapter versions from server response
            for (const res of responses) {
              try {
                const json = await res.clone().json();
                if (json.data?.id && json.data?.version) {
                  updateProject((prev) => ({
                    ...prev,
                    chapters: prev.chapters.map((c) =>
                      c.id === json.data.id ? { ...c, version: json.data.version } : c
                    ),
                  }));
                }
              } catch { /* ignore parse errors */ }
            }
            pendingSaves.current.clear();
            failedSaves.current.clear();
            setSaveState("saved");
            savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
            return;
          }
        } catch {
          // will retry
        }
        lastError = true;
      }

      if (lastError) {
        // Store failed entries for manual retry
        for (const [chapterId, entry] of entries) {
          failedSaves.current.set(chapterId, entry);
        }
        setSaveState("error");
      }
    }, 1000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      // Fire-and-forget flush on unmount
      const entries = Array.from(pendingSaves.current.entries());
      for (const [chapterId, { content: chapterContent, version }] of entries) {
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: chapterContent, baseVersion: version }),
          keepalive: true,
        }).catch(() => {});
      }
      pendingSaves.current.clear();
    };
  }, [project, storyId]);

  // ── Flush pending saves immediately (reusable) ──────────
  const flushPendingSaves = useCallback(async (): Promise<boolean> => {
    // Clear the debounce timer so it doesn't fire after we flush
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const entries = Array.from(pendingSaves.current.entries());
    if (entries.length === 0) return true;

    setSaveState("saving");
    if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);

    try {
      const saves = entries.map(([chapterId, { content, version }]) =>
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, baseVersion: version }),
        })
      );
      const responses = await Promise.all(saves);
      // Check for auth expiry
      if (responses.some((r) => r.status === 401)) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return false;
      }
      // Check for version conflict
      if (responses.some((r) => r.status === 409)) {
        pendingSaves.current.clear();
        failedSaves.current.clear();
        setSaveState("conflict");
        toast("Another user edited this chapter. Reload to see their changes.", "error");
        return false;
      }
      if (responses.every((r) => r.ok)) {
        // Update local chapter versions from server response
        for (const res of responses) {
          try {
            const json = await res.clone().json();
            if (json.data?.id && json.data?.version) {
              updateProject((prev) => ({
                ...prev,
                chapters: prev.chapters.map((c) =>
                  c.id === json.data.id ? { ...c, version: json.data.version } : c
                ),
              }));
            }
          } catch { /* ignore parse errors */ }
        }
        pendingSaves.current.clear();
        failedSaves.current.clear();
        setSaveState("saved");
        savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
        return true;
      }
    } catch {
      // fall through to error handling
    }

    // On failure, store for manual retry
    for (const [chapterId, entry] of entries) {
      failedSaves.current.set(chapterId, entry);
    }
    setSaveState("error");
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, toast]);

  // ── Warn user about unsaved changes on navigation ──────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingSaves.current.size > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Retry failed saves manually ─────────────────────────
  const retryFailedSaves = useCallback(async () => {
    if (isRetrying.current) return; // Prevent concurrent retries
    isRetrying.current = true;
    try {
      const entries = Array.from(failedSaves.current.entries());
      if (entries.length === 0) return;

      setSaveState("saving");
      const saves = entries.map(([chapterId, { content, version }]) =>
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, baseVersion: version }),
        })
      );
      const responses = await Promise.all(saves);
      // Check for auth expiry
      if (responses.some((r) => r.status === 401)) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      // Check for version conflict
      if (responses.some((r) => r.status === 409)) {
        failedSaves.current.clear();
        setSaveState("conflict");
        toast("Another user edited this chapter. Reload to see their changes.", "error");
        return;
      }
      if (responses.every((r) => r.ok)) {
        failedSaves.current.clear();
        setSaveState("saved");
        if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
        savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    } finally {
      isRetrying.current = false;
    }
  }, [storyId]);

  // ── Right panel toggle ────────────────────────────────────
  const togglePanel = useCallback(
    (panel: RightPanel) => {
      setRightPanel((prev) => (prev === panel ? "none" : panel));
    },
    []
  );

  // ── Keyboard shortcuts + typing detection ────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Grimoire toggle: "/" when not in an input, or Cmd+K
      if (e.key === "/" && !isMod && !(e.target as HTMLElement)?.closest("[contenteditable], input, textarea, .tiptap-editor")) {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      if (isMod && e.key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (isMod && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        setProject((prev) => {
          if (!prev) return prev;
          const idx = prev.chapters.findIndex((c) => c.id === prev.activeChapterId);
          if (idx < prev.chapters.length - 1) {
            return { ...prev, activeChapterId: prev.chapters[idx + 1].id };
          }
          return prev;
        });
      }
      if (isMod && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        setProject((prev) => {
          if (!prev) return prev;
          const idx = prev.chapters.findIndex((c) => c.id === prev.activeChapterId);
          if (idx > 0) {
            return { ...prev, activeChapterId: prev.chapters[idx - 1].id };
          }
          return prev;
        });
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowGoals((v) => !v);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        togglePanel("bible");
      }
      if (isMod && e.key.toLowerCase() === "e" && !e.shiftKey) {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }

      // Typing detection — hide UI while writing
      if (!isMod && !e.shiftKey && e.key.length === 1) {
        setIsTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [commandOpen, togglePanel]);

  const activeChapter = useMemo(() =>
    project?.chapters.find((c) => c.id === project.activeChapterId),
    [project?.chapters, project?.activeChapterId]
  );
  const activeChapterIndex = useMemo(() =>
    project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? 0,
    [project?.chapters, project?.activeChapterId]
  );

  const updateProject = useCallback(
    (updater: (prev: StoryProject) => StoryProject) => {
      setProject((prev) => {
        if (!prev) return prev;
        return updater(prev);
      });
    },
    []
  );

  // ── Chapter handlers ──────────────────────────────────────

  const handleSelectChapter = useCallback(
    async (id: string) => {
      if (isSwitching.current) return; // Prevent concurrent switches
      isSwitching.current = true;
      try {
        await flushPendingSaves();
        updateProject((prev) => (prev ? { ...prev, activeChapterId: id } : prev));
      } finally {
        isSwitching.current = false;
      }
    },
    [updateProject, flushPendingSaves]
  );

  // ── Scene break style change (from inline picker in editor) ──
  useEffect(() => {
    const handler = (e: Event) => {
      const style = (e as CustomEvent).detail as "asterism" | "fleuron" | "dots" | "line" | "space";
      if (style) {
        updateProject((prev) => ({
          ...prev,
          typography: { ...prev.typography, sceneBreakStyle: style },
        }));
      }
    };
    window.addEventListener("scene-break-style-change", handler);
    return () => window.removeEventListener("scene-break-style-change", handler);
  }, [updateProject]);

  const handleAddChapter = useCallback(async () => {
    const unitLabels: Record<string, string> = {
      novel: "Chapter",
      poetry: "Poem",
      webtoon: "Episode",
      illustrated: "Chapter",
      screenplay: "Scene",
    };
    const unit = unitLabels[storyFormat] || "Chapter";
    const title = `${unit} ${(project?.chapters.length ?? 0) + 1}`;

    try {
      const res = await fetch(`/api/stories/${storyId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        const json = await res.json();
        const newChapter = apiChapterToLocal(json.data);
        updateProject((prev) => ({
          ...prev,
          chapters: [...prev.chapters, newChapter],
          activeChapterId: newChapter.id,
        }));
      } else {
        toast("Couldn\u2019t create chapter", "error");
      }
    } catch {
      // Fallback: add locally
      const newChapter = createChapter(title);
      updateProject((prev) => ({
        ...prev,
        chapters: [...prev.chapters, newChapter],
        activeChapterId: newChapter.id,
      }));
      toast("Saved locally \u2014 will sync when connection returns", "info");
    }
  }, [project?.chapters.length, updateProject, storyId, toast]);

  const handleReorderChapters = useCallback(
    (chapters: Chapter[]) => {
      updateProject((prev) => ({ ...prev, chapters }));
      // Save new order to API
      const reorderData = chapters.map((ch, i) => ({ id: ch.id, sortOrder: i }));
      fetch(`/api/stories/${storyId}/chapters/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: reorderData }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  const handleRenameChapter = useCallback(
    (id: string, newTitle: string) => {
      let oldTitle = newTitle;
      updateProject((prev) => {
        const chapter = prev.chapters.find((c) => c.id === id);
        oldTitle = chapter?.title ?? newTitle;
        return {
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
          ),
        };
      });
      fetch(`/api/stories/${storyId}/chapters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      }).catch(() => {
        // Revert on failure
        updateProject((prev) => ({
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === id ? { ...c, title: oldTitle, updatedAt: Date.now() } : c
          ),
        }));
      });
    },
    [updateProject, storyId]
  );

  const handleUpdateChapterStatus = useCallback(
    async (id: string, status: "draft" | "published") => {
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          updateProject((prev) => ({
            ...prev,
            chapters: prev.chapters.map((c) =>
              c.id === id ? { ...c, status } : c
            ),
          }));
        }
      } catch (err) {
        console.error("Failed to update chapter status:", err);
      }
    },
    [storyId, updateProject]
  );

  const handleDeleteChapter = useCallback(
    async (id: string) => {
      // Prevent deleting the last chapter
      if ((project?.chapters.length ?? 0) <= 1) {
        toast("Cannot delete the only chapter", "error");
        return;
      }
      await flushPendingSaves();
      // Auto-snapshot before delete
      const chapterToDelete = project?.chapters.find((c) => c.id === id);
      if (chapterToDelete && chapterToDelete.content) {
        fetch(`/api/stories/${storyId}/chapters/${id}/snapshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "Auto-save before delete" }),
          keepalive: true,
        }).catch(() => {});
      }
      // Capture state for rollback
      let snapshot: StoryProject | null = null;
      setProject((prev) => {
        snapshot = prev;
        if (!prev) return prev;
        const filtered = prev.chapters.filter((c) => c.id !== id);
        return {
          ...prev,
          chapters: filtered,
          activeChapterId:
            prev.activeChapterId === id
              ? filtered[0]?.id ?? null
              : prev.activeChapterId,
        };
      });
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        // Show undo toast on successful delete
        const timer = setTimeout(() => setUndoAction(null), 3000);
        setUndoAction({
          message: `"${chapterToDelete?.title ?? 'Chapter'}" deleted`,
          undo: () => {
            clearTimeout(timer);
            setUndoAction(null);
            // Rollback from snapshot
            if (snapshot) setProject(snapshot);
            window.location.reload();
          },
          timer,
        });
      } catch {
        // Rollback on failure
        if (snapshot) setProject(snapshot);
      }
    },
    [storyId, project, flushPendingSaves]
  );

  const handleUpdateContent = useCallback(
    (content: string, wordCount: number) => {
      updateProject((prev) => {
        const chapterId = prev.activeChapterId;
        if (chapterId) {
          const chapter = prev.chapters.find((c) => c.id === chapterId);
          pendingSaves.current.set(chapterId, { content, version: chapter?.version ?? 1 });
        }

        const updated = {
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === prev.activeChapterId
              ? { ...c, content, wordCount, updatedAt: Date.now() }
              : c
          ),
        };
        const totalWords = updated.chapters.reduce(
          (s, c) => s + c.wordCount,
          0
        );
        return {
          ...updated,
          goals: getOrCreateSession(updated.goals, totalWords),
        };
      });
    },
    [updateProject]
  );

  const handleUpdateStoryTitle = useCallback(
    (title: string) => {
      updateProject((prev) => ({ ...prev, title }));
      // Save to API
      fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  // ── Metadata handler ──────────────────────────────────────

  const handleUpdateMetadata = useCallback(
    (metadata: StoryMetadata) => {
      updateProject((prev) => ({ ...prev, metadata }));
      // Sync key fields to API
      const patchBody: Record<string, unknown> = {
        synopsis: metadata.synopsis,
        genres: metadata.genres,
        contentRating: metadata.contentRating,
        status: metadata.status,
        language: metadata.language,
      };
      // Sync cover image (data URL for MVP, URL for production)
      if (metadata.coverImageDataUrl) {
        patchBody.coverImageUrl = metadata.coverImageDataUrl;
      } else {
        patchBody.coverImageUrl = null;
      }
      fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  // ── Bible handler ─────────────────────────────────────────

  const handleUpdateBible = useCallback(
    (bible: StoryBible) => {
      updateProject((prev) => ({ ...prev, bible }));
    },
    [updateProject]
  );

  // ── Goals handler ─────────────────────────────────────────

  const handleUpdateGoals = useCallback(
    (goals: WritingGoals) => {
      updateProject((prev) => ({ ...prev, goals }));
    },
    [updateProject]
  );

  // ── Front matter handler ─────────────────────────────────

  const handleUpdateFrontMatter = useCallback(
    (frontMatter: FrontMatter) => {
      updateProject((prev) => ({ ...prev, frontMatter }));
      // Sync to API
      fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epigraph: frontMatter.epigraph,
          epigraphAttribution: frontMatter.epigraphAttribution,
          foreword: frontMatter.foreword,
          showToc: frontMatter.showToc,
        }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  // ── Typography handler ─────────────────────────────────

  const handleUpdateTypography = useCallback(
    (typography: TypographySettings) => {
      updateProject((prev) => ({ ...prev, typography }));
      // Sync to API
      fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropCaps: typography.dropCaps,
          sceneBreakStyle: typography.sceneBreakStyle,
        }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  // ── Publish toggle handler ─────────────────────────────

  const handleTogglePublish = useCallback(() => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    fetch(`/api/stories/${storyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: newValue }),
    }).then((res) => {
      if (res.ok) {
        toast(newValue ? "Story published" : "Story unpublished", "success");
      } else {
        setIsPublic(!newValue);
        toast("Couldn\u2019t update publish status", "error");
      }
    }).catch(() => {
      setIsPublic(!newValue);
      toast("Network error. Changes not saved.", "error");
    });
  }, [isPublic, storyId, toast]);

  const handleDeleteStory = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Story deleted", "info");
        router.push("/dashboard");
      } else {
        toast("Couldn\u2019t delete story", "error");
      }
    } catch {
      toast("Network error. Try again.", "error");
    }
  }, [storyId, router, toast]);

  // ── Chapter settings handler ────────────────────────────

  const handleUpdateChapterFields = useCallback(
    (updates: Partial<Chapter>) => {
      updateProject((prev) => {
        const chapterId = prev.activeChapterId;
        // Sync relevant fields to API
        if (chapterId) {
          const apiUpdates: Record<string, unknown> = {};
          if (updates.status !== undefined) apiUpdates.status = updates.status;
          if (updates.authorNoteBefore !== undefined) apiUpdates.authorNoteBefore = updates.authorNoteBefore;
          if (updates.authorNoteAfter !== undefined) apiUpdates.authorNoteAfter = updates.authorNoteAfter;
          if (updates.outline !== undefined) apiUpdates.outline = updates.outline;
          if (Object.keys(apiUpdates).length > 0) {
            fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(apiUpdates),
            }).then(() => {
              // Show roster nudge on first publish
              if (updates.status === "published" && !rosterNudgeDismissed) {
                setShowRosterNudge(true);
              }
            }).catch(() => {});
          }
        }
        return {
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === prev.activeChapterId
              ? { ...c, ...updates, updatedAt: Date.now() }
              : c
          ),
        };
      });
    },
    [updateProject, storyId, rosterNudgeDismissed]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshot: ChapterSnapshot) => {
      updateProject((prev) => {
        const chapterId = prev.activeChapterId;
        if (chapterId) {
          const chapter = prev.chapters.find((c) => c.id === chapterId);
          pendingSaves.current.set(chapterId, { content: snapshot.content, version: chapter?.version ?? 1 });
        }
        return {
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === prev.activeChapterId
              ? {
                  ...c,
                  content: snapshot.content,
                  wordCount: snapshot.wordCount,
                  updatedAt: Date.now(),
                }
              : c
          ),
        };
      });
    },
    [updateProject]
  );

  // ── Outline handler ─────────────────────────────────────

  const handleUpdateOutline = useCallback(
    (chapterId: string, outline: string) => {
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId ? { ...c, outline, updatedAt: Date.now() } : c
        ),
      }));
      fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  // ── Search handler ────────────────────────────────────────

  const handleUpdateChapterContent = useCallback(
    (chapterId: string, content: string) => {
      const chapter = project?.chapters.find((c) => c.id === chapterId);
      pendingSaves.current.set(chapterId, { content, version: chapter?.version ?? 1 });
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                content,
                wordCount: countWords(content),
                updatedAt: Date.now(),
              }
            : c
        ),
      }));
    },
    [updateProject]
  );

  // ── Comment handlers ──────────────────────────────────────

  const handleAddComment = useCallback(() => {
    if (!editorInstance) return;
    const { from, to, empty } = editorInstance.state.selection;
    if (empty) return;

    const selectedText = editorInstance.state.doc.textBetween(from, to, " ");

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;
    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setCommentPopover({
      position: { x: rect.left + rect.width / 2, y: rect.bottom },
      selectedText,
      from,
      to,
    });
  }, [editorInstance]);

  const handleSubmitComment = useCallback(
    (commentText: string) => {
      if (!editorInstance || !commentPopover) return;

      const thread = createCommentThread(
        commentPopover.selectedText,
        commentText
      );

      editorInstance
        .chain()
        .focus()
        .setTextSelection({
          from: commentPopover.from,
          to: commentPopover.to,
        })
        .setComment(thread.id)
        .run();

      setCommentThreads((prev) => [...prev, thread]);
      setActiveThreadId(thread.id);
      setRightPanel("comments");
      setCommentPopover(null);
    },
    [editorInstance, commentPopover]
  );

  const handleReplyToThread = useCallback(
    (threadId: string, text: string) => {
      setCommentThreads((prev) =>
        prev.map((t) => (t.id === threadId ? addReply(t, text) : t))
      );
    },
    []
  );

  const handleResolveThread = useCallback((threadId: string) => {
    setCommentThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, resolved: true } : t))
    );
  }, []);

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      setCommentThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (editorInstance) {
        const { doc } = editorInstance.state;
        doc.descendants((node, pos) => {
          node.marks.forEach((mark) => {
            if (
              mark.type.name === "comment" &&
              mark.attrs.threadId === threadId
            ) {
              editorInstance
                .chain()
                .focus()
                .setTextSelection({ from: pos, to: pos + node.nodeSize })
                .unsetComment()
                .run();
            }
          });
        });
      }
      if (activeThreadId === threadId) setActiveThreadId(null);
    },
    [editorInstance, activeThreadId]
  );

  // ── Memoized computed values ─────────────────────────────
  const mentionCharacters = useMemo(() =>
    (project?.bible?.characters ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color })),
    [project?.bible?.characters]
  );
  const mentionCharacterDetails = useMemo(() =>
    (project?.bible?.characters ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color, description: c.description, aliases: c.aliases })),
    [project?.bible?.characters]
  );
  const bibleChapters = useMemo(() =>
    (project?.chapters ?? []).map(c => ({ id: c.id, title: c.title, content: c.content })),
    [project?.chapters]
  );

  // ── Stable callbacks for JSX ──────────────────────────────
  const handleToggleOutline = useCallback(() => setShowChapterOutline((v) => !v), []);
  const handleToggleSearch = useCallback(() => setShowSearch((v) => !v), []);
  const handleToggleGoals = useCallback(() => setShowGoals((v) => !v), []);
  const handleOpenGrimoire = useCallback(() => setCommandOpen(true), []);
  const handleCloseGrimoire = useCallback(() => setCommandOpen(false), []);
  const handleCloseGoals = useCallback(() => setShowGoals(false), []);
  const handleClosePanel = useCallback(() => setRightPanel("none"), []);
  const handleToggleComments = useCallback(() => togglePanel("comments"), [togglePanel]);
  const handleToggleBible = useCallback(() => togglePanel("bible"), [togglePanel]);
  const handleToggleSettings = useCallback(() => togglePanel("chapter"), [togglePanel]);
  const handleOpenMetadata = useCallback(() => togglePanel("metadata"), [togglePanel]);
  const handleOpenFrontMatter = useCallback(() => togglePanel("frontmatter"), [togglePanel]);
  const handleOpenTypography = useCallback(() => togglePanel("typography"), [togglePanel]);
  const handleToggleOutlineView = useCallback(() => setShowOutline((v) => !v), []);
  const handleMentionClick = useCallback((characterId: string) => {
    setRightPanel("bible");
    setTimeout(() => {
      const el = document.querySelector(`[data-bible-entry="${characterId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-amber/50");
      setTimeout(() => el?.classList.remove("ring-2", "ring-amber/50"), 1500);
    }, 300);
  }, []);
  const noopCallback = useCallback(() => {}, []);
  const handleCloseSearch = useCallback(() => setShowSearch(false), []);
  const handleCloseToolkit = useCallback(() => setShowToolkit(false), []);
  const handleToggleToolkit = useCallback(() => setShowToolkit((v) => !v), []);
  const handleCloseSidebar = useCallback(() => { setIsSidebarHovered(false); setSidebarPinned(false); }, []);
  const handleCloseChapterOutline = useCallback(() => setShowChapterOutline(false), []);
  const handleCancelComment = useCallback(() => setCommentPopover(null), []);
  const handleOpenSearch = useCallback(() => setShowSearch(true), []);

  // ── Dynamic export handlers ────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!project) return;
    try {
      const { exportPdf } = await import("@/client/export-pdf");
      await exportPdf(project);
    } catch (err) {
      console.error("PDF export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project]);
  const handleExportEpub = useCallback(async () => {
    if (!project) return;
    try {
      const { exportEpub } = await import("@/client/export-pdf");
      exportEpub(project);
    } catch (err) {
      console.error("EPUB export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project]);
  const handleExportDocx = useCallback(async () => {
    if (!project) return;
    try {
      const { exportDocx } = await import("@/client/export-docx");
      exportDocx(project);
    } catch (err) {
      console.error("DOCX export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project]);

  const totalWords = useMemo(() =>
    project?.chapters.reduce((s, c) => s + c.wordCount, 0) ?? 0,
    [project?.chapters]
  );

  // ── Loading / Error states ────────────────────────────────

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-xs text-text-ghost">Loading your desk...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[calc(100vh-64px)] w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-text-secondary text-sm">{error || "Story not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-amber hover:text-amber/80 transition-colors text-sm"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Co-op gate: require at least one accepted collaborator before writing
  if (needsTeamSetup && writingMode === "co-op") {
    return (
      <div className="h-[calc(100vh-64px)] w-screen flex items-center justify-center bg-void">
        <div className="relative max-w-md w-full mx-4">
          {/* Ambient glow */}
          <div className="absolute -inset-20 rounded-full bg-teal/5 blur-[100px] pointer-events-none" />

          <div className="relative bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-teal/15 to-teal/5 border border-teal/15 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal/60">
                <circle cx="9" cy="7" r="4" />
                <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                <path d="M19 8v6M16 11h6" />
              </svg>
            </div>

            <h2 className="font-display text-2xl text-paper font-bold mb-2">
              Assemble your team first
            </h2>
            <p className="text-text-secondary text-[13px] leading-relaxed mb-6">
              Co-op stories need at least one collaborator before you can start writing.
              Head to the Workshop to invite your team, or browse the Roster to find creatives.
            </p>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => router.push(`/story/${storySlug}/workshop?setup=true`)}
                className="px-6 py-2.5 bg-teal text-void font-semibold text-[13px] rounded-full hover:bg-teal/90 transition-all duration-200"
              >
                Go to Workshop
              </button>
              <button
                onClick={() => router.push("/roster")}
                className="flex items-center gap-1.5 text-amber text-[12px] hover:text-amber-light transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                Browse the Roster
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-text-ghost text-[12px] hover:text-text-secondary transition-colors"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All formats now have dedicated editors — no FormatStub needed

  const showUI = !isTyping && !commandOpen;

  return (
    <div className="relative h-[calc(100vh-64px)] w-screen overflow-hidden selection:bg-amber/30 selection:text-white transition-colors duration-1000 bg-void">

      {/* ── 1. Cinematic Canvas Background ──────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Ambient amber glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[150px] rounded-full mix-blend-screen transition-all duration-1000 bg-amber/[0.03]" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 transition-opacity duration-1000 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {/* ── 2. Auto-Hiding Chapter Sidebar (Left) ───────────── */}
      <div
        className="absolute top-0 left-0 bottom-0 w-12 z-40"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* Sidebar affordance — visible tab when sidebar is hidden */}
        <AnimatePresence>
          {!isSidebarHovered && !sidebarPinned && !isTyping && !commandOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="absolute top-1/2 -translate-y-1/2 left-0 flex flex-col items-center gap-1 cursor-pointer"
            >
              {/* Pull tab with chapter count */}
              <div
                onClick={() => setSidebarPinned(true)}
                className="flex flex-col items-center gap-2 px-2 py-3.5 rounded-r-xl bg-amber/[0.06] border border-l-0 border-amber/[0.12] backdrop-blur-md shadow-[0_0_20px_rgba(200,150,60,0.06)]"
              >
                <svg className="w-4 h-4 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <span className="text-[9px] font-mono text-amber/50 tracking-tight font-medium">
                  {project.chapters.length}
                </span>
                <svg className="w-2.5 h-2.5 text-amber/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for pinned sidebar (mobile tap-to-close) */}
        {sidebarPinned && (
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setSidebarPinned(false)}
          />
        )}

        {/* Expanded sidebar panel */}
        <AnimatePresence>
          {(isSidebarHovered || sidebarPinned) && !commandOpen && !isTyping && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-4 bottom-4 left-4 w-72 rounded-2xl bg-paper/[0.02] border border-paper/5 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <ChapterNav
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                storyTitle={project.title}
                collapsed={false}
                format={storyFormat}
                onSelectChapter={handleSelectChapter}
                onAddChapter={handleAddChapter}
                onReorderChapters={handleReorderChapters}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                onToggleCollapse={handleCloseSidebar}
                onUpdateStoryTitle={handleUpdateStoryTitle}
                onOpenToolkit={handleToggleToolkit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Chapter Outline Panel (Right) ────────────────── */}
      <AnimatePresence>
        {showChapterOutline && !isTyping && !commandOpen && activeChapter && (
          <ChapterOutlinePanel
            chapter={activeChapter}
            onUpdateOutline={(outline) => handleUpdateOutline(activeChapter.id, outline)}
            onClose={handleCloseChapterOutline}
          />
        )}
      </AnimatePresence>

      {/* ── 4. The Canvas (Editor Center Stage) ─────────────── */}
      <div className={`relative z-10 w-full h-full flex flex-col items-center overflow-y-auto scroll-smooth transition-opacity duration-500 ${commandOpen ? "opacity-30 blur-sm pointer-events-none" : "opacity-100"}`}>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <div className="w-full max-w-[680px] px-8 relative z-20">
              <SearchReplace
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                onNavigateToChapter={handleSelectChapter}
                onUpdateChapterContent={handleUpdateChapterContent}
                onClose={handleCloseSearch}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Editor */}
        {showOutline ? (
          <div className="w-full max-w-[680px] px-8 flex-1 min-h-0">
            <OutlineView
              chapters={project.chapters}
              activeChapterId={project.activeChapterId}
              onSelectChapter={(id) => {
                handleSelectChapter(id);
                setShowOutline(false);
              }}
              onUpdateOutline={handleUpdateOutline}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeChapter && (
              <motion.div
                key={activeChapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full flex-1 min-h-0 flex flex-col items-center"
              >
                {/* Spacer to push content below navbar area */}
                <div className="w-full h-16 shrink-0" />

                {/* Sticky chapter header */}
                <div className="w-full sticky top-0 z-20 bg-void/80 backdrop-blur-sm border-b border-paper/[0.03] pt-3">
                  <div className="max-w-[680px] mx-auto px-8 pb-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-amber/50 uppercase tracking-[0.15em]">{project.title}</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-paper/15">
                        <path d="M3 2l4 3-4 3" />
                      </svg>
                      <span className="text-[10px] text-paper/30 uppercase tracking-[0.15em]">
                        {activeChapterIndex !== undefined ? `${getFormatLabels(storyFormat).singular} ${activeChapterIndex + 1}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <h1
                        className="text-xl md:text-2xl font-display text-paper/90 outline-none focus:text-amber/90 transition-colors cursor-text"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onBlur={(e) => {
                          const newTitle = e.currentTarget.textContent?.trim();
                          if (newTitle && activeChapter && newTitle !== activeChapter.title) {
                            handleRenameChapter(activeChapter.id, newTitle);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      >
                        {activeChapter.title ?? "Untitled"}
                      </h1>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Reading time */}
                        <span className="text-[11px] text-paper/20 hidden sm:block">
                          ~{Math.max(1, Math.ceil((activeChapter.wordCount || 0) / 238))} min read
                        </span>
                        {/* Focus mode toggle */}
                        <button
                          onClick={() => setFocusMode((f) => !f)}
                          className={`p-1.5 rounded-md transition-all text-[11px] hidden sm:flex items-center gap-1 ${
                            focusMode
                              ? "bg-amber/10 text-amber border border-amber/20"
                              : "text-paper/25 hover:text-paper/40 border border-transparent"
                          }`}
                          title="Focus mode"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                            <circle cx="7" cy="7" r="3" />
                            <path d="M7 1v2M7 11v2M1 7h2M11 7h2" />
                          </svg>
                        </button>
                        {/* Reference pane toggle */}
                        <button
                          onClick={() => setRefPaneOpen((r) => !r)}
                          className={`p-1.5 rounded-md transition-all text-[11px] hidden sm:flex items-center gap-1 ${
                            refPaneOpen
                              ? "bg-lavender/10 text-lavender border border-lavender/20"
                              : "text-paper/25 hover:text-paper/40 border border-transparent"
                          }`}
                          title="Reference pane"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                            <rect x="1" y="1" width="12" height="12" rx="2" />
                            <line x1="9" y1="1" x2="9" y2="13" />
                          </svg>
                        </button>
                        {/* Quick publish */}
                        {activeChapter.status !== "published" ? (
                          <button
                            onClick={() => {
                              if (activeChapter) {
                                handleUpdateChapterStatus(activeChapter.id, "published");
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-sage/30 text-sage hover:bg-sage/10 transition-all"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                            Publish
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-sage/10 text-sage/60">
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex pt-8">
                  <div
                    className={`flex-1 min-w-0 ${
                      project.typography.dropCaps ? "drop-caps" : ""
                    } scene-break-${project.typography.sceneBreakStyle || "asterism"} ${
                      focusMode ? "focus-mode" : ""
                    }`}
                  >
                  <EditorErrorBoundary>
                    {storyFormat === "screenplay" ? (
                      <ScreenplayEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                      />
                    ) : storyFormat === "poetry" ? (
                      <PoetryEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                        alignment="left"
                      />
                    ) : storyFormat === "webtoon" ? (
                      <WebtoonEditor
                        key={activeChapter.id}
                        storyId={storyId}
                        chapterId={activeChapter.id}
                      />
                    ) : storyFormat === "illustrated" ? (
                      <IllustratedEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                      />
                    ) : (
                      <ProseEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                        onComment={handleAddComment}
                        onMentionClick={handleMentionClick}
                        characters={mentionCharacters}
                        characterDetails={mentionCharacterDetails}
                      />
                    )}
                  </EditorErrorBoundary>
                  </div>

                  {/* Reference pane */}
                  <AnimatePresence>
                    {refPaneOpen && (
                      <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="shrink-0 border-l border-border bg-surface/50 overflow-hidden hidden sm:block"
                      >
                        <div className="min-w-[300px] flex flex-col h-full">
                          <div className="flex items-center gap-1 px-4 py-3 border-b border-border">
                            <button
                              onClick={() => setRefPaneTab("bible")}
                              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                                refPaneTab === "bible"
                                  ? "bg-amber/[0.08] text-amber border border-amber/20"
                                  : "text-text-ghost hover:text-text-secondary"
                              }`}
                            >
                              Characters
                            </button>
                            <button
                              onClick={() => setRefPaneTab("notes")}
                              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                                refPaneTab === "notes"
                                  ? "bg-amber/[0.08] text-amber border border-amber/20"
                                  : "text-text-ghost hover:text-text-secondary"
                              }`}
                            >
                              Notes
                            </button>
                            <button
                              onClick={() => setRefPaneOpen(false)}
                              className="ml-auto p-1 rounded text-text-ghost hover:text-text-secondary transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="4" y1="4" x2="10" y2="10" />
                                <line x1="10" y1="4" x2="4" y2="10" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {refPaneTab === "bible" ? (
                              project.bible.characters.length > 0 ? (
                                project.bible.characters.map((char) => (
                                  <div key={char.id} className="rounded-lg border border-border bg-elevated/50 p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: char.color }} />
                                      <span className="text-[13px] font-medium text-paper truncate">{char.name}</span>
                                    </div>
                                    {char.description && (
                                      <p className="text-[11px] text-text-ghost leading-relaxed line-clamp-3">
                                        {char.description}
                                      </p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[12px] text-text-ghost text-center py-8">
                                  No characters yet. Add them in the Story Bible.
                                </p>
                              )
                            ) : (
                              project.bible.notes.length > 0 ? (
                                project.bible.notes.map((note) => (
                                  <div key={note.id} className="rounded-lg border border-border bg-elevated/50 p-3">
                                    <p className="text-[13px] font-medium text-paper mb-1">{note.title}</p>
                                    <p className="text-[11px] text-text-ghost leading-relaxed line-clamp-4">
                                      {note.content}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[12px] text-text-ghost text-center py-8">
                                  No notes yet. Add them in the Story Bible.
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </motion.aside>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── 5. Floating Status Bar ──────────────────────────── */}
      <AnimatePresence>
        {showUI && (
          <StatusBar
            showOutline={showChapterOutline}
            chapterWordCount={activeChapter?.wordCount ?? 0}
            totalWords={totalWords}
            goals={project.goals}
            saveState={saveState}
            onToggleOutline={handleToggleOutline}
            onOpenGrimoire={handleOpenGrimoire}
            onToggleComments={handleToggleComments}
            onToggleSearch={handleToggleSearch}
            onToggleGoals={handleToggleGoals}
            onToggleBible={handleToggleBible}
            onToggleSettings={handleToggleSettings}
            onToggleHistory={() => setRightPanel((p) => (p === "history" ? "none" : "history"))}
            snapshotCount={activeChapter?.snapshots.length ?? 0}
          />
        )}
      </AnimatePresence>

      {/* ── Conflict Banner ───────────────────────────────── */}
      <AnimatePresence>
        {saveState === "conflict" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-amber/10 border border-amber/20 backdrop-blur-xl text-amber text-sm shadow-2xl"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Another collaborator edited this chapter</span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-amber/20 hover:bg-amber/30 transition-colors font-medium text-xs"
            >
              Reload
            </button>
            <button
              onClick={() => {
                setSaveState("idle");
                // Force save with current version (override)
                if (project) {
                  const ch = project.chapters.find((c) => c.id === project.activeChapterId);
                  if (ch) {
                    fetch(`/api/stories/${storyId}/chapters/${ch.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: ch.content }),
                    }).then((r) => {
                      if (r.ok) {
                        r.json().then((json) => {
                          if (json.data?.version) {
                            updateProject((prev) => ({
                              ...prev,
                              chapters: prev.chapters.map((c) =>
                                c.id === json.data.id ? { ...c, version: json.data.version } : c
                              ),
                            }));
                          }
                        });
                        toast("Your version saved", "success");
                      }
                    });
                  }
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:bg-surface transition-colors font-medium text-xs text-text-secondary"
            >
              Keep mine
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save Error Toast ──────────────────────────────── */}
      <AnimatePresence>
        {saveState === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl text-rose-300 text-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Changes couldn&apos;t be saved</span>
            <button onClick={retryFailedSaves} className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 transition-colors font-medium">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Undo Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {undoAction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface/95 border border-border-active backdrop-blur-xl text-sm text-text-secondary shadow-2xl"
          >
            <span>{undoAction.message}</span>
            <button
              onClick={undoAction.undo}
              className="px-2.5 py-1 rounded-lg bg-amber/10 border border-amber/20 text-amber text-xs font-medium hover:bg-amber/20 transition-colors"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Roster Nudge (after first publish) ─────────────── */}
      <AnimatePresence>
        {showRosterNudge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 max-w-xs bg-surface/95 border border-amber/20 backdrop-blur-xl rounded-xl p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                  <path d="M8 1l2 4 4.4.6-3.2 3.1.8 4.3L8 11l-4 2 .8-4.3L1.6 5.6 6 5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-paper text-[13px] font-medium mb-1">Chapter published!</p>
                <p className="text-text-secondary text-[11px] leading-relaxed mb-3">
                  Let other creators discover your work — post your card on the Roster.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="/roster/setup"
                    className="px-3 py-1 bg-amber text-void font-semibold text-[11px] rounded-full hover:bg-amber-light transition-all"
                  >
                    Post Your Card
                  </a>
                  <button
                    onClick={() => {
                      setShowRosterNudge(false);
                      setRosterNudgeDismissed(true);
                    }}
                    className="text-text-ghost text-[10px] hover:text-text-secondary transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. Right Panels (overlay) ───────────────────────── */}
      <div className="absolute top-0 right-0 bottom-0 z-40 flex">
        <AnimatePresence>
          {rightPanel === "comments" && (
            <CommentsSidebar
              threads={commentThreads}
              activeThreadId={activeThreadId}
              onSelectThread={setActiveThreadId}
              onReply={handleReplyToThread}
              onResolve={handleResolveThread}
              onDelete={handleDeleteThread}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "metadata" && (
            <MetadataPanel
              metadata={project.metadata}
              storyTitle={project.title}
              onUpdate={handleUpdateMetadata}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "bible" && (
            <StoryBiblePanel
              bible={project.bible}
              storyId={storyId}
              chapters={bibleChapters}
              onUpdate={handleUpdateBible}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "frontmatter" && (
            <FrontMatterPanel
              frontMatter={project.frontMatter}
              metadata={project.metadata}
              chapters={project.chapters}
              onUpdate={handleUpdateFrontMatter}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "chapter" && activeChapter && (
            <ChapterSettingsPanel
              chapter={activeChapter}
              storyId={storyId}
              onUpdate={handleUpdateChapterFields}
              onRestoreSnapshot={handleRestoreSnapshot}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "history" && activeChapter && (
            <HistoryPanel
              chapter={activeChapter}
              storyId={storyId}
              onRestore={handleRestoreSnapshot}
              onUpdate={handleUpdateChapterFields}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "typography" && (
            <TypographyPanel
              settings={project.typography}
              onUpdate={handleUpdateTypography}
              onClose={handleClosePanel}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── 7. Comment Popover ──────────────────────────────── */}
      <AnimatePresence>
        {commentPopover && (
          <CommentPopover
            position={commentPopover.position}
            selectedText={commentPopover.selectedText}
            onSubmit={handleSubmitComment}
            onCancel={handleCancelComment}
          />
        )}
      </AnimatePresence>

      {/* ── 8. Toolkit Panel ────────────────────────────────── */}
      <AnimatePresence>
        {showToolkit && (
          <ToolkitPanel
            onClose={handleCloseToolkit}
            isPublic={isPublic}
            onTogglePublish={handleTogglePublish}
            onDeleteStory={handleDeleteStory}
            onOpenMetadata={handleOpenMetadata}
            onOpenBible={handleToggleBible}
            onOpenFrontMatter={handleOpenFrontMatter}
            onOpenChapterSettings={handleToggleSettings}
            onOpenTypography={handleOpenTypography}
            onOpenOutline={handleToggleOutlineView}
            onExportPdf={handleExportPdf}
            onExportEpub={handleExportEpub}
            onExportDocx={handleExportDocx}
            hasCover={!!project.metadata.coverImageDataUrl}
            genreCount={project.metadata.genres.length}
            bibleEntryCount={
              project.bible.characters.length +
              project.bible.places.length +
              project.bible.notes.length
            }
            chapterStatus={activeChapter?.status ?? "draft"}
            snapshotCount={activeChapter?.snapshots.length ?? 0}
            dropCaps={project.typography.dropCaps}
            sceneBreakStyle={project.typography.sceneBreakStyle}
            hasEpigraph={!!project.frontMatter.epigraph}
            hasForeword={!!project.frontMatter.foreword}
            showToc={project.frontMatter.showToc}
          />
        )}
      </AnimatePresence>

      {/* ── 9. Command Palette / The Grimoire ───────────────── */}
      <CommandPalette
        open={commandOpen}
        onClose={handleCloseGrimoire}
        editor={editorInstance}
        onToggleZen={noopCallback}
        isZenMode={false}
        onOpenSearch={handleOpenSearch}
        onOpenMetadata={handleOpenMetadata}
        onOpenBible={handleToggleBible}
        onOpenFrontMatter={handleOpenFrontMatter}
        onOpenChapterSettings={handleToggleSettings}
        onOpenOutline={handleToggleOutlineView}
        onOpenTypography={handleOpenTypography}
        onExportPdf={handleExportPdf}
        onExportEpub={handleExportEpub}
        onExportDocx={handleExportDocx}
        onOpenShortcuts={() => { setCommandOpen(false); setShowShortcuts(true); }}
      />

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}

      {/* Goals popover */}
      <AnimatePresence>
        {showGoals && (
          <GoalsPanel
            goals={project.goals}
            onUpdate={handleUpdateGoals}
            onClose={handleCloseGoals}
          />
        )}
      </AnimatePresence>

      <OnboardingHints />
    </div>
  );
}
