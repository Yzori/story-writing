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

type RightPanel = "none" | "comments" | "metadata" | "bible" | "frontmatter" | "chapter" | "typography";

// Local storage key for editor-only settings (typography, goals, etc.)
function editorSettingsKey(storyId: string) {
  return `inkwell-editor-${storyId}`;
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

function apiChapterToLocal(ch: any): Chapter {
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
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
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

  // Track which chapters have unsaved content changes
  const pendingSaves = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Load story from API ──────────────────────────────────
  useEffect(() => {
    async function loadStory() {
      try {
        // Fetch story metadata
        const storyRes = await fetch(`/api/stories/${storyId}`);
        if (!storyRes.ok) {
          setError("Story not found");
          setLoading(false);
          return;
        }
        const storyJson = await storyRes.json();
        const story = storyJson.data;

        // Fetch chapters and bible entries in parallel
        const [chaptersRes, bibleRes] = await Promise.all([
          fetch(`/api/stories/${storyId}/chapters?withContent=true`),
          fetch(`/api/stories/${storyId}/bible`),
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
            contentRating: story.contentRating || "everyone",
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
          typography: settings.typography ?? { dropCaps: story.dropCaps ?? true, sceneBreakStyle: story.sceneBreakStyle || "asterism" },
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

    // Flush pending chapter saves
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pendingSaves.current.forEach((content, chapterId) => {
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }).catch(() => {}); // silent fail, will retry on next save
      });
      pendingSaves.current.clear();
    }, 1000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project, storyId]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsFocusMode((v) => !v);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setIsZenMode((v) => !v);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode]);

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
    (id: string) => {
      updateProject((prev) => ({ ...prev, activeChapterId: id }));
    },
    [updateProject]
  );

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
    (id: string) => {
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
    [updateProject, storyId]
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
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-xs text-text-ghost">Loading your desk...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
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

  const totalWords = project.chapters.reduce((s, c) => s + c.wordCount, 0);

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden">
      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chapter Navigator — hidden in zen mode */}
        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ChapterNav
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                storyTitle={project.title}
                collapsed={navCollapsed}
                onSelectChapter={handleSelectChapter}
                onAddChapter={handleAddChapter}
                onReorderChapters={handleReorderChapters}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                onToggleCollapse={() => setNavCollapsed((v) => !v)}
                onUpdateStoryTitle={handleUpdateStoryTitle}
                onOpenToolkit={() => setShowToolkit((v) => !v)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Search bar */}
          <AnimatePresence>
            {showSearch && (
              <SearchReplace
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                onNavigateToChapter={handleSelectChapter}
                onUpdateChapterContent={handleUpdateChapterContent}
                onClose={() => setShowSearch(false)}
              />
            )}
          </AnimatePresence>

          {/* Zen mode escape hint */}
          <AnimatePresence>
            {isZenMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 z-40"
              >
                <button
                  onClick={() => setIsZenMode(false)}
                  className="px-3 py-1.5 rounded-lg bg-elevated/80 backdrop-blur border border-border text-[11px] text-text-ghost hover:text-text-secondary transition-colors"
                >
                  ESC to exit Zen
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editor or Outline View */}
          {showOutline ? (
            <OutlineView
              chapters={project.chapters}
              activeChapterId={project.activeChapterId}
              onSelectChapter={(id) => {
                handleSelectChapter(id);
                setShowOutline(false);
              }}
              onUpdateOutline={handleUpdateOutline}
            />
          ) : (
            activeChapter && (
              <div
                className={`flex-1 min-h-0 ${
                  project.typography.dropCaps ? "drop-caps" : ""
                } ${
                  project.typography.sceneBreakStyle !== "asterism"
                    ? `scene-break-${project.typography.sceneBreakStyle}`
                    : ""
                }`}
              >
                <ProseEditor
                  key={activeChapter.id}
                  content={activeChapter.content}
                  onUpdate={handleUpdateContent}
                  onEditorReady={handleEditorReady}
                  onComment={handleAddComment}
                  isFocusMode={isFocusMode}
                />
              </div>
            )
          )}
        </div>

        {/* Right Panel */}
        <AnimatePresence>
          {rightPanel === "comments" && !isZenMode && (
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
          {rightPanel === "metadata" && !isZenMode && (
            <MetadataPanel
              metadata={project.metadata}
              storyTitle={project.title}
              onUpdate={handleUpdateMetadata}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "bible" && !isZenMode && (
            <StoryBiblePanel
              bible={project.bible}
              onUpdate={handleUpdateBible}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "frontmatter" && !isZenMode && (
            <FrontMatterPanel
              frontMatter={project.frontMatter}
              metadata={project.metadata}
              chapters={project.chapters}
              onUpdate={handleUpdateFrontMatter}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "chapter" && !isZenMode && activeChapter && (
            <ChapterSettingsPanel
              chapter={activeChapter}
              onUpdate={handleUpdateChapterFields}
              onRestoreSnapshot={handleRestoreSnapshot}
              onClose={() => setRightPanel("none")}
            />
          )}
          {rightPanel === "typography" && !isZenMode && (
            <TypographyPanel
              settings={project.typography}
              onUpdate={handleUpdateTypography}
              onClose={() => setRightPanel("none")}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar — hidden in zen mode */}
      <AnimatePresence>
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            <StatusBar
              wordCount={totalWords}
              chapterWordCount={activeChapter?.wordCount ?? 0}
              chapterTitle={activeChapter?.title ?? ""}
              chapterIndex={activeChapterIndex}
              totalChapters={project.chapters.length}
              isFocusMode={isFocusMode}
              isZenMode={isZenMode}
              showComments={rightPanel === "comments"}
              commentCount={
                commentThreads.filter((t) => !t.resolved).length
              }
              goals={project.goals}
              onToggleFocus={() => setIsFocusMode((v) => !v)}
              onToggleZen={() => setIsZenMode((v) => !v)}
              onToggleComments={() => togglePanel("comments")}
              onToggleSearch={() => setShowSearch((v) => !v)}
              onToggleGoals={() => setShowGoals((v) => !v)}
              onOpenCommand={() => setCommandOpen(true)}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Popover */}
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

      {/* Toolkit Panel */}
      <AnimatePresence>
        {showToolkit && !isZenMode && (
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

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        editor={editorInstance}
        onToggleFocus={() => setIsFocusMode((v) => !v)}
        onToggleZen={() => setIsZenMode((v) => !v)}
        isFocusMode={isFocusMode}
        isZenMode={isZenMode}
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
    </div>
  );
}
