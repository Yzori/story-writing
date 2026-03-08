"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StoryProject } from "@/lib/store";
import ReaderToolbar, { ReadingMode } from "@/components/reader/ReaderToolbar";
import ReaderPaginated from "@/components/reader/ReaderPaginated";
import ReaderScroll from "@/components/reader/ReaderScroll";

const STORAGE_KEY = "inkwell-project";
const READER_PREFS_KEY = "inkwell-reader-prefs";

interface ReaderPrefs {
  mode: ReadingMode;
}

function loadPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return { mode: "paginated" };
  try {
    const saved = localStorage.getItem(READER_PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { mode: "paginated" };
}

function savePrefs(prefs: ReaderPrefs) {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export default function ReadPage() {
  const router = useRouter();
  const [project, setProject] = useState<StoryProject | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [mode, setMode] = useState<ReadingMode>("paginated");

  useEffect(() => {
    // Load project
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const proj: StoryProject = JSON.parse(saved);
        setProject(proj);
        setActiveChapterId(proj.activeChapterId ?? proj.chapters[0]?.id ?? null);
      }
    } catch {}

    // Load reading preferences
    const prefs = loadPrefs();
    setMode(prefs.mode);
  }, []);

  const handleModeChange = useCallback((newMode: ReadingMode) => {
    setMode(newMode);
    savePrefs({ mode: newMode });
  }, []);

  const activeChapter = project?.chapters.find((c) => c.id === activeChapterId);
  const activeChapterIndex = project?.chapters.findIndex((c) => c.id === activeChapterId) ?? 0;

  const handlePrevChapter = useCallback(() => {
    if (!project || activeChapterIndex <= 0) return;
    setActiveChapterId(project.chapters[activeChapterIndex - 1].id);
  }, [project, activeChapterIndex]);

  const handleNextChapter = useCallback(() => {
    if (!project || activeChapterIndex >= project.chapters.length - 1) return;
    setActiveChapterId(project.chapters[activeChapterIndex + 1].id);
  }, [project, activeChapterIndex]);

  // Loading
  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-xs text-text-ghost">Opening your story...</p>
        </div>
      </div>
    );
  }

  // No chapters
  if (!activeChapter) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text-secondary">No chapters to read yet.</p>
          <button
            onClick={() => router.push("/write")}
            className="text-sm text-amber hover:underline"
          >
            Start writing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden relative">
      <ReaderToolbar
        storyTitle={project.title}
        chapter={activeChapter}
        chapterIndex={activeChapterIndex}
        totalChapters={project.chapters.length}
        mode={mode}
        onModeChange={handleModeChange}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onBack={() => router.push("/write")}
        onSelectChapter={setActiveChapterId}
        chapters={project.chapters}
      />

      {/* Reader content — keyed on chapter to reset state */}
      {mode === "paginated" ? (
        <ReaderPaginated
          key={activeChapterId}
          htmlContent={activeChapter.content}
          chapterTitle={activeChapter.title}
        />
      ) : (
        <ReaderScroll
          key={activeChapterId}
          htmlContent={activeChapter.content}
          chapterTitle={activeChapter.title}
        />
      )}
    </div>
  );
}
