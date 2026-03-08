"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  migrateProject,
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

const STORAGE_KEY = "inkwell-project";

type RightPanel = "none" | "comments" | "metadata" | "bible" | "frontmatter" | "chapter" | "typography";

function loadProject(): StoryProject {
  if (typeof window === "undefined") return createStoryProject();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return migrateProject(JSON.parse(saved));
  } catch {}
  return createStoryProject();
}

function saveProject(project: StoryProject) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {}
}

export default function WritePage() {
  const [project, setProject] = useState<StoryProject | null>(null);
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

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Load on mount
  useEffect(() => {
    setProject(loadProject());
  }, []);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!project) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveProject(project), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project]);

  // Keyboard shortcuts
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

  const handleAddChapter = useCallback(() => {
    const newChapter = createChapter(
      `Chapter ${(project?.chapters.length ?? 0) + 1}`
    );
    updateProject((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
      activeChapterId: newChapter.id,
    }));
  }, [project?.chapters.length, updateProject]);

  const handleReorderChapters = useCallback(
    (chapters: Chapter[]) => {
      updateProject((prev) => ({ ...prev, chapters }));
    },
    [updateProject]
  );

  const handleRenameChapter = useCallback(
    (id: string, title: string) => {
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === id ? { ...c, title, updatedAt: Date.now() } : c
        ),
      }));
    },
    [updateProject]
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
    },
    [updateProject]
  );

  const handleUpdateContent = useCallback(
    (content: string, wordCount: number) => {
      updateProject((prev) => {
        const updated = {
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === prev.activeChapterId
              ? { ...c, content, wordCount, updatedAt: Date.now() }
              : c
          ),
        };
        // Track writing session
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
    },
    [updateProject]
  );

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  // ── Metadata handler ──────────────────────────────────────

  const handleUpdateMetadata = useCallback(
    (metadata: StoryMetadata) => {
      updateProject((prev) => ({ ...prev, metadata }));
    },
    [updateProject]
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
    },
    [updateProject]
  );

  // ── Typography handler ─────────────────────────────────

  const handleUpdateTypography = useCallback(
    (typography: TypographySettings) => {
      updateProject((prev) => ({ ...prev, typography }));
    },
    [updateProject]
  );

  // ── Chapter settings handler ────────────────────────────

  const handleUpdateChapterFields = useCallback(
    (updates: Partial<Chapter>) => {
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === prev.activeChapterId
            ? { ...c, ...updates, updatedAt: Date.now() }
            : c
        ),
      }));
    },
    [updateProject]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshot: ChapterSnapshot) => {
      updateProject((prev) => ({
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
      }));
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
    },
    [updateProject]
  );

  // ── Search handler ────────────────────────────────────────

  const handleUpdateChapterContent = useCallback(
    (chapterId: string, content: string) => {
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

  // Loading state
  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-xs text-text-ghost">Loading your desk...</p>
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
