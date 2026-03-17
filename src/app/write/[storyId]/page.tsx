"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "@/lib/store";
import { CommentThread, createCommentThread, addReply } from "@/lib/comments";
import { getOrCreateSession } from "@/lib/goals";
import { exportPdf, exportEpub } from "@/lib/export";
import { exportDocx } from "@/lib/export-docx";
import ChapterNav from "@/components/editor/ChapterNav";
import ProseEditor from "@/components/editor/ProseEditor";
import FormatStub from "@/components/editor/FormatStub";
import CommandPalette from "@/components/editor/CommandPalette";
import CommentsSidebar from "@/components/editor/CommentsSidebar";
import CommentPopover from "@/components/editor/CommentPopover";
import MetadataPanel from "@/components/editor/MetadataPanel";
import StoryBiblePanel from "@/components/editor/StoryBiblePanel";
import FrontMatterPanel from "@/components/editor/FrontMatterPanel";
import ChapterSettingsPanel from "@/components/editor/ChapterSettingsPanel";
import OutlineView from "@/components/editor/OutlineView";
import TypographyPanel from "@/components/editor/TypographyPanel";
import ToolkitPanel from "@/components/editor/ToolkitPanel";
import SearchReplace from "@/components/editor/SearchReplace";
import GoalsPanel from "@/components/editor/GoalsPanel";
import StatusBar from "@/components/editor/StatusBar";
import ChapterOutlinePanel from "@/components/editor/ChapterOutlinePanel";

type RightPanel = "none" | "comments" | "metadata" | "bible" | "frontmatter" | "chapter" | "typography";

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
  createdAt: string;
  updatedAt: string;
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
    snapshots: [],
  };
}

export default function WriteStoryPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;

  const [project, setProject] = useState<StoryProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

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
  // Format-aware editor
  const [storyFormat, setStoryFormat] = useState("novel");
  const [useProseAnyway, setUseProseAnyway] = useState(false);

  // Canvas UI state
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showChapterOutline, setShowChapterOutline] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Save state indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Track which chapters have unsaved content changes
  const pendingSaves = useRef<Map<string, string>>(new Map());
  const failedSaves = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Load story from API ──────────────────────────────────
  useEffect(() => {
    async function loadStory() {
      try {
        // Fetch story metadata (no-store to avoid stale cache on refresh)
        const storyRes = await fetch(`/api/stories/${storyId}`, { cache: "no-store" });
        if (!storyRes.ok) {
          setError("Story not found");
          setLoading(false);
          return;
        }
        const storyJson = await storyRes.json();
        const story = storyJson.data;

        // Fetch chapters and bible entries in parallel (no-store to avoid stale cache)
        const [chaptersRes, bibleRes] = await Promise.all([
          fetch(`/api/stories/${storyId}/chapters?withContent=true`, { cache: "no-store" }),
          fetch(`/api/stories/${storyId}/bible`, { cache: "no-store" }),
        ]);
        const chaptersJson = await chaptersRes.json();
        const apiChapters = chaptersRes.ok ? chaptersJson.data : [];
        const bibleJson = bibleRes.ok ? await bibleRes.json() : { data: [] };
        const apiBibleEntries = bibleJson.data || [];

        // Load editor-only settings from localStorage
        const settings = loadEditorSettings(storyId);

        // Build StoryProject from API data + local settings
        const chapters: Chapter[] = apiChapters.map(apiChapterToLocal);

        const proj: StoryProject = {
          id: story.id,
          title: story.title,
          chapters: chapters.length > 0 ? chapters : [createChapter("Chapter 1")],
          activeChapterId: chapters[0]?.id ?? null,
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
            body: JSON.stringify({ title: "Chapter 1" }),
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
      pendingSaves.current.clear();

      const maxRetries = 3;
      let lastError = false;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }

        try {
          const saves = entries.map(([chapterId, content]) =>
            fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            })
          );
          const responses = await Promise.all(saves);
          if (responses.every((r) => r.ok)) {
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
        for (const [chapterId, content] of entries) {
          failedSaves.current.set(chapterId, content);
        }
        setSaveState("error");
      }
    }, 1000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
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
    pendingSaves.current.clear();

    try {
      const saves = entries.map(([chapterId, content]) =>
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
      );
      const responses = await Promise.all(saves);
      if (responses.every((r) => r.ok)) {
        failedSaves.current.clear();
        setSaveState("saved");
        savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
        return true;
      }
    } catch {
      // fall through to error handling
    }

    // On failure, store for manual retry
    for (const [chapterId, content] of entries) {
      failedSaves.current.set(chapterId, content);
    }
    setSaveState("error");
    return false;
  }, [storyId]);

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
    const entries = Array.from(failedSaves.current.entries());
    if (entries.length === 0) return;

    setSaveState("saving");
    try {
      const saves = entries.map(([chapterId, content]) =>
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
      );
      const responses = await Promise.all(saves);
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
    }
  }, [storyId]);

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
      if (isMod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsFocusMode((v) => !v);
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
  }, [commandOpen]);

  const activeChapter = project?.chapters.find(
    (c) => c.id === project.activeChapterId
  );
  const activeChapterIndex =
    project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? 0;

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
      await flushPendingSaves();
      updateProject((prev) => ({ ...prev, activeChapterId: id }));
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
    const title = `Chapter ${(project?.chapters.length ?? 0) + 1}`;

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
      }
    } catch {
      // Fallback: add locally
      const newChapter = createChapter(title);
      updateProject((prev) => ({
        ...prev,
        chapters: [...prev.chapters, newChapter],
        activeChapterId: newChapter.id,
      }));
    }
  }, [project?.chapters.length, updateProject, storyId]);

  const handleReorderChapters = useCallback(
    (chapters: Chapter[]) => {
      updateProject((prev) => ({ ...prev, chapters }));
      // Save new order to API
      const reorderData = chapters.map((ch, i) => ({ id: ch.id, sortOrder: i }));
      fetch(`/api/stories/${storyId}/chapters/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: reorderData }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  const handleRenameChapter = useCallback(
    (id: string, title: string) => {
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === id ? { ...c, title, updatedAt: Date.now() } : c
        ),
      }));
      // Save to API
      fetch(`/api/stories/${storyId}/chapters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).catch(() => {});
    },
    [updateProject, storyId]
  );

  const handleDeleteChapter = useCallback(
    async (id: string) => {
      await flushPendingSaves();
      updateProject((prev) => {
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
      // Delete from API
      fetch(`/api/stories/${storyId}/chapters/${id}`, {
        method: "DELETE",
      }).catch(() => {});
    },
    [updateProject, storyId, flushPendingSaves]
  );

  const handleUpdateContent = useCallback(
    (content: string, wordCount: number) => {
      updateProject((prev) => {
        const chapterId = prev.activeChapterId;
        if (chapterId) {
          pendingSaves.current.set(chapterId, content);
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
    }).catch(() => {
      // Revert on failure
      setIsPublic(!newValue);
    });
  }, [isPublic, storyId]);

  const handleDeleteStory = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      }
    } catch {
      // silently fail
    }
  }, [storyId, router]);

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
    [updateProject, storyId]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshot: ChapterSnapshot) => {
      updateProject((prev) => {
        const chapterId = prev.activeChapterId;
        if (chapterId) {
          pendingSaves.current.set(chapterId, snapshot.content);
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
      pendingSaves.current.set(chapterId, content);
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

  // ── Right panel toggle ────────────────────────────────────

  const togglePanel = useCallback(
    (panel: RightPanel) => {
      setRightPanel((prev) => (prev === panel ? "none" : panel));
    },
    []
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

  // Show format stub for non-novel formats (unless user opted into novel mode)
  if (storyFormat !== "novel" && !useProseAnyway) {
    return (
      <FormatStub
        format={storyFormat}
        storyTitle={project.title}
        storyId={storyId}
        onUseProse={() => setUseProseAnyway(true)}
      />
    );
  }

  const totalWords = project.chapters.reduce((s, c) => s + c.wordCount, 0);
  const showUI = !isTyping && !commandOpen;

  return (
    <div className={`relative h-[calc(100vh-64px)] w-screen overflow-hidden selection:bg-amber/30 selection:text-white transition-colors duration-1000 ${isFocusMode ? "bg-[#030303]" : "bg-void"}`}>

      {/* ── 1. Cinematic Canvas Background ──────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Ambient amber glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[150px] rounded-full mix-blend-screen transition-all duration-1000 ${isFocusMode ? "bg-amber/[0.01] w-[400px]" : "bg-amber/[0.03]"}`} />
        {/* Subtle vignette */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isFocusMode ? "shadow-[inset_0_0_250px_rgba(0,0,0,0.95)]" : "shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"}`} />
      </div>

      {/* ── 2. Auto-Hiding Chapter Sidebar (Left) ───────────── */}
      <div
        className="absolute top-0 left-0 bottom-0 w-12 z-40"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* Sidebar affordance — visible tab when sidebar is hidden */}
        <AnimatePresence>
          {!isSidebarHovered && !isTyping && !commandOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="absolute top-1/2 -translate-y-1/2 left-0 flex flex-col items-center gap-1 cursor-pointer"
            >
              {/* Pull tab with chapter count */}
              <div className="flex flex-col items-center gap-2 px-2 py-3.5 rounded-r-xl bg-amber/[0.06] border border-l-0 border-amber/[0.12] backdrop-blur-md shadow-[0_0_20px_rgba(200,150,60,0.06)]">
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

        {/* Expanded sidebar panel */}
        <AnimatePresence>
          {isSidebarHovered && !commandOpen && !isTyping && (
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
                onSelectChapter={handleSelectChapter}
                onAddChapter={handleAddChapter}
                onReorderChapters={handleReorderChapters}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                onToggleCollapse={() => setIsSidebarHovered(false)}
                onUpdateStoryTitle={handleUpdateStoryTitle}
                onOpenToolkit={() => setShowToolkit((v) => !v)}
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
            onClose={() => setShowChapterOutline(false)}
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
                onClose={() => setShowSearch(false)}
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
                {/* Chapter title area — fades out in focus mode */}
                <div className={`w-full max-w-[680px] px-8 pt-24 transition-opacity duration-700 ${isFocusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                  <p className="font-display text-[11px] tracking-[0.25em] text-amber/50 uppercase mb-4">{project.title}</p>
                  <h1
                    className="text-3xl md:text-4xl font-display text-paper/90 mb-2 outline-none focus:text-amber/90 transition-colors cursor-text"
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
                  <div className="w-24 h-[1px] bg-gradient-to-r from-amber/40 to-transparent mb-8" />
                </div>

                <div
                  className={`w-full flex-1 min-h-0 ${
                    project.typography.dropCaps ? "drop-caps" : ""
                  } scene-break-${project.typography.sceneBreakStyle || "asterism"}`}
                >
                  <ProseEditor
                    key={activeChapter.id}
                    content={activeChapter.content}
                    onUpdate={handleUpdateContent}
                    onEditorReady={handleEditorReady}
                    onComment={handleAddComment}
                    isFocusMode={isFocusMode}
                    characters={(project?.bible?.characters ?? []).map((c) => ({
                      id: c.id,
                      name: c.name,
                      color: c.color,
                    }))}
                  />
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
            isFocusMode={isFocusMode}
            isAudioPlaying={false}
            showOutline={showChapterOutline}
            chapterWordCount={activeChapter?.wordCount ?? 0}
            totalWords={totalWords}
            goals={project.goals}
            saveState={saveState}
            onToggleFocus={() => setIsFocusMode((v) => !v)}
            onToggleAudio={() => {}}
            onToggleOutline={() => setShowChapterOutline((v) => !v)}
            onOpenGrimoire={() => setCommandOpen(true)}
            onToggleComments={() => togglePanel("comments")}
            onToggleSearch={() => setShowSearch((v) => !v)}
          />
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
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "metadata" && (
            <MetadataPanel
              metadata={project.metadata}
              storyTitle={project.title}
              onUpdate={handleUpdateMetadata}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "bible" && (
            <StoryBiblePanel
              bible={project.bible}
              storyId={storyId}
              onUpdate={handleUpdateBible}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "frontmatter" && (
            <FrontMatterPanel
              frontMatter={project.frontMatter}
              metadata={project.metadata}
              chapters={project.chapters}
              onUpdate={handleUpdateFrontMatter}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "chapter" && activeChapter && (
            <ChapterSettingsPanel
              chapter={activeChapter}
              storyId={storyId}
              onUpdate={handleUpdateChapterFields}
              onRestoreSnapshot={handleRestoreSnapshot}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "typography" && (
            <TypographyPanel
              settings={project.typography}
              onUpdate={handleUpdateTypography}
              onClose={() => setRightPanel("none")}
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
            onCancel={() => setCommentPopover(null)}
          />
        )}
      </AnimatePresence>

      {/* ── 8. Toolkit Panel ────────────────────────────────── */}
      <AnimatePresence>
        {showToolkit && (
          <ToolkitPanel
            onClose={() => setShowToolkit(false)}
            isPublic={isPublic}
            onTogglePublish={handleTogglePublish}
            onDeleteStory={handleDeleteStory}
            onOpenMetadata={() => togglePanel("metadata")}
            onOpenBible={() => togglePanel("bible")}
            onOpenFrontMatter={() => togglePanel("frontmatter")}
            onOpenChapterSettings={() => togglePanel("chapter")}
            onOpenTypography={() => togglePanel("typography")}
            onOpenOutline={() => setShowOutline((v) => !v)}
            onExportPdf={() => exportPdf(project)}
            onExportEpub={() => exportEpub(project)}
            onExportDocx={() => exportDocx(project)}
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
        onClose={() => setCommandOpen(false)}
        editor={editorInstance}
        onToggleFocus={() => setIsFocusMode((v) => !v)}
        onToggleZen={() => {}}
        isFocusMode={isFocusMode}
        isZenMode={false}
        onOpenSearch={() => setShowSearch(true)}
        onOpenMetadata={() => togglePanel("metadata")}
        onOpenBible={() => togglePanel("bible")}
        onOpenFrontMatter={() => togglePanel("frontmatter")}
        onOpenChapterSettings={() => togglePanel("chapter")}
        onOpenOutline={() => setShowOutline((v) => !v)}
        onOpenTypography={() => togglePanel("typography")}
        onExportPdf={() => project && exportPdf(project)}
        onExportEpub={() => project && exportEpub(project)}
        onExportDocx={() => project && exportDocx(project)}
      />

      {/* Goals popover */}
      <AnimatePresence>
        {showGoals && (
          <GoalsPanel
            goals={project.goals}
            onUpdate={handleUpdateGoals}
            onClose={() => setShowGoals(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
