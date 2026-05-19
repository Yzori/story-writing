"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Chapter, TypographySettings } from "@/types/editor";
import type { ApiStoryData } from "@/types/api";
import ReaderToolbar, { ReadingMode, FontSizeKey, FONT_SIZE_OPTIONS } from "@/components/reader/ReaderToolbar";
import ReaderPaginated from "@/components/reader/ReaderPaginated";
import ReaderScroll from "@/components/reader/ReaderScroll";
import ChapterComments from "@/components/reader/ChapterComments";
import ChapterReactions from "@/components/reader/ChapterReactions";
import WebtoonReader from "@/components/reader/WebtoonReader";
import PoetryReader from "@/components/reader/PoetryReader";
import ScreenplayReader from "@/components/reader/ScreenplayReader";
import AnnotationLayer from "@/components/reader/AnnotationLayer";
import IllustratedReader from "@/components/reader/IllustratedReader";
import SceneClip from "@/components/reader/SceneClip";
import ClipSelectionFAB from "@/components/reader/ClipSelectionFAB";
import ChapterLockScreen from "@/components/reader/ChapterLockScreen";
import SupportFooter from "@/components/story/SupportFooter";
import { normalizeTypographySettings } from "@/lib/typography";

const READER_PREFS_KEY = "quiloria-reader-prefs";
const READING_FONT_KEY = "quiloria-reading-font";
const FONT_SIZE_KEY = "quiloria-reader-font-size";

type ReadingFont = "default" | "serif" | "sans" | "mono";

const FONT_CLASS_MAP: Record<ReadingFont, string> = {
  default: "",
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
};

function loadReadingFont(): ReadingFont {
  if (typeof window === "undefined") return "default";
  try {
    const saved = localStorage.getItem(READING_FONT_KEY);
    if (saved && saved in FONT_CLASS_MAP) return saved as ReadingFont;
  } catch {}
  return "default";
}

function loadFontSize(): FontSizeKey {
  if (typeof window === "undefined") return "medium";
  try {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved && FONT_SIZE_OPTIONS.some((o) => o.key === saved)) return saved as FontSizeKey;
  } catch {}
  return "medium";
}

function saveFontSize(size: FontSizeKey) {
  try {
    localStorage.setItem(FONT_SIZE_KEY, size);
  } catch {}
}

function getFontSizeValue(key: FontSizeKey): string {
  return FONT_SIZE_OPTIONS.find((o) => o.key === key)?.value || "1.1rem";
}


interface ReaderApiChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  authorNoteBefore: string | null;
  authorNoteAfter: string | null;
  outline: string | null;
}

function apiChapterToChapter(ch: ReaderApiChapter): Chapter {
  return {
    id: ch.id,
    title: ch.title,
    content: ch.content || "",
    wordCount: ch.wordCount,
    createdAt: new Date(ch.createdAt).getTime(),
    updatedAt: new Date(ch.updatedAt).getTime(),
    status: ch.status as "draft" | "published",
    authorNoteBefore: ch.authorNoteBefore || "",
    authorNoteAfter: ch.authorNoteAfter || "",
    outline: ch.outline || "",
    version: 1,
    snapshots: [],
  };
}

function loadReadingMode(): ReadingMode {
  if (typeof window === "undefined") return "scroll";
  try {
    const saved = localStorage.getItem(READER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.mode || "scroll";
    }
  } catch {}
  return "scroll";
}

function saveReadingMode(mode: ReadingMode) {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify({ mode }));
  } catch {}
}

export default function ChapterReadPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const slug = params.slug as string;
  const chapterId = params.chapterId as string;

  const [storyTitle, setStoryTitle] = useState("");
  const [storyFormat, setStoryFormat] = useState("novel");
  const [storyCoverUrl, setStoryCoverUrl] = useState<string | null>(null);
  const [storyAuthorName, setStoryAuthorName] = useState<string>("");
  const [clipPassage, setClipPassage] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyUserId, setStoryUserId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [mode, setMode] = useState<ReadingMode>("paginated");
  const [fontSize, setFontSize] = useState<FontSizeKey>("medium");
  const [fontFamily, setFontFamily] = useState<ReadingFont>("default");
  const [fontClass, setFontClass] = useState("");
  const [typography, setTypography] = useState<TypographySettings>(() =>
    normalizeTypographySettings()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatingInfo, setGatingInfo] = useState<{ unlocked: boolean; price: number; tier: string; isEarlyAccess?: boolean; earlyAccessUntil?: string } | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const annotationContentRef = useRef<HTMLDivElement>(null);

  // Find the prose-reader div for annotations after content renders
  useEffect(() => {
    if (storyFormat !== "novel" || !activeChapter) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(".prose-reader") as HTMLDivElement | null;
      if (el) annotationContentRef.current = el;
    }, 200);
    return () => clearTimeout(timer);
  }, [activeChapter, storyFormat, mode]);
  const [initialScrollPercent, setInitialScrollPercent] = useState<number | null>(null);
  const [initialPageNumber, setInitialPageNumber] = useState<number | null>(null);
  const lastSaveRef = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load story metadata and chapter list
  useEffect(() => {
    setMode(loadReadingMode());
    setFontSize(loadFontSize());
    const loaded = loadReadingFont();
    setFontFamily(loaded);
    setFontClass(FONT_CLASS_MAP[loaded]);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Fetch story by slug
        const storyRes = await fetch(`/api/stories/by-slug/${slug}`);
        const storyJson = await storyRes.json();

        if (!storyRes.ok) {
          setError(storyJson.error?.message || "Story not found");
          setLoading(false);
          return;
        }

        const story: ApiStoryData = storyJson.data;
        setStoryTitle(story.title);
        setStoryFormat(story.format || "novel");
        setStoryId(story.id);
        setStoryCoverUrl(story.coverImageUrl || null);
        setStoryAuthorName(story.author?.displayName || "");
        setStoryUserId(story.author?.id || story.userId || null);
        setTypography(normalizeTypographySettings(story));

        // Convert chapter list (these are summaries from the story endpoint)
        const chapterList = (story.chapters as ReaderApiChapter[]).map(apiChapterToChapter);
        setChapters(chapterList);

        // Fetch the full chapter content
        const chapterRes = await fetch(
          `/api/stories/${story.id}/chapters/${chapterId}`
        );
        const chapterJson = await chapterRes.json();

        if (!chapterRes.ok) {
          setError(chapterJson.error?.message || "Chapter not found");
          setLoading(false);
          return;
        }

        const fullChapter = apiChapterToChapter(chapterJson.data as ReaderApiChapter);
        setActiveChapter(fullChapter);

        // Update the chapter in the list with full content
        setChapters((prev) =>
          prev.map((ch) => (ch.id === fullChapter.id ? fullChapter : ch))
        );

        // Check chapter gating
        const gateRes = await fetch(`/api/stories/${story.id}/chapters/${chapterId}/unlock`);
        if (gateRes.ok) {
          const gateJson = await gateRes.json();
          setGatingInfo(gateJson);
        }
      } catch {
        setError("Failed to load chapter");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, chapterId]);

  // ── Reading progress: save helper ──────────────────────────
  const saveProgress = useCallback(
    (opts: { scrollPercent?: number; pageNumber?: number }) => {
      if (!session?.user?.id || !storyId) return;
      const now = Date.now();
      // Debounce: skip if saved less than 5 seconds ago
      if (now - lastSaveRef.current < 5000) {
        // Schedule a trailing save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveProgress(opts), 5000);
        return;
      }
      lastSaveRef.current = now;
      fetch("/api/reading-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          chapterId,
          scrollPercent: opts.scrollPercent ?? 0,
          pageNumber: opts.pageNumber ?? 1,
        }),
      }).catch(() => {});
    },
    [session?.user?.id, storyId, chapterId]
  );

  // Fetch initial reading progress for this story to restore position
  useEffect(() => {
    if (!session?.user?.id || !storyId) return;
    fetch(`/api/reading-progress?storyId=${storyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && json.data.chapterId === chapterId) {
          setInitialScrollPercent(json.data.scrollPercent);
          setInitialPageNumber(json.data.pageNumber);
        }
      })
      .catch(() => {});
  }, [session?.user?.id, storyId, chapterId]);

  // Flush pending save on unmount so progress is never lost
  useEffect(() => {
    const saveRef = saveTimerRef;
    return () => {
      if (saveRef.current) {
        clearTimeout(saveRef.current);
        // Fire immediate save with last known position
        saveProgress({});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollProgress = useCallback(
    (percent: number) => {
      saveProgress({ scrollPercent: Math.round(percent) });
    },
    [saveProgress]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      saveProgress({ pageNumber: page });
    },
    [saveProgress]
  );

  const activeChapterIndex = chapters.findIndex((ch) => ch.id === chapterId);
  const supportsPagedMode = storyFormat === "novel" || storyFormat === "illustrated";
  const fixedModeLabel =
    storyFormat === "webtoon"
      ? "Vertical scroll"
      : storyFormat === "poetry"
        ? "Poetry scroll"
        : storyFormat === "screenplay"
          ? "Script page"
          : undefined;

  const handleModeChange = useCallback((newMode: ReadingMode) => {
    setMode(newMode);
    saveReadingMode(newMode);
  }, []);

  const handleFontSizeChange = useCallback((newSize: FontSizeKey) => {
    setFontSize(newSize);
    saveFontSize(newSize);
  }, []);

  const handleFontFamilyChange = useCallback((newFont: ReadingFont) => {
    setFontFamily(newFont);
    setFontClass(FONT_CLASS_MAP[newFont]);
    try {
      localStorage.setItem(READING_FONT_KEY, newFont);
    } catch {}
  }, []);

  const navigateToChapter = useCallback(
    (id: string) => {
      // Save progress immediately when switching chapters
      if (session?.user?.id && storyId) {
        lastSaveRef.current = Date.now();
        fetch("/api/reading-progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId,
            chapterId: id,
            scrollPercent: 0,
            pageNumber: 1,
          }),
        }).catch(() => {});
      }
      router.push(`/story/${slug}/read/${id}`);
    },
    [router, slug, session?.user?.id, storyId]
  );

  const handlePrevChapter = useCallback(() => {
    if (activeChapterIndex <= 0) return;
    navigateToChapter(chapters[activeChapterIndex - 1].id);
  }, [activeChapterIndex, chapters, navigateToChapter]);

  const handleNextChapter = useCallback(() => {
    if (activeChapterIndex >= chapters.length - 1) return;
    navigateToChapter(chapters[activeChapterIndex + 1].id);
  }, [activeChapterIndex, chapters, navigateToChapter]);

  const handleBack = useCallback(() => {
    router.push(`/story/${slug}`);
  }, [router, slug]);

  const handleShowDiscussion = useCallback(() => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-text-ghost/20 border-t-amber rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-amber/60"
              >
                <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                <path d="M5 5h6M5 8h4" />
              </svg>
            </div>
          </div>
          <p className="text-[12px] text-text-ghost tracking-wide">
            Loading chapter...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !activeChapter) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-rose/10 border border-border flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-rose/50"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16v.5" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-paper">
            {error || "Chapter not found"}
          </h2>
          <p className="text-text-secondary text-[13px]">
            This chapter may have been removed or is not available.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="text-amber hover:text-amber/80 transition-colors text-[13px] font-medium"
            >
              Try again
            </button>
            <button
              onClick={handleBack}
              className="text-text-ghost hover:text-text-secondary transition-colors text-[13px]"
            >
              Back to story
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gating guard: show lock screen for locked chapters
  if (gatingInfo && !gatingInfo.unlocked) {
    return (
      <div className="min-h-screen w-screen flex flex-col bg-void">
        <ReaderToolbar
          storyTitle={storyTitle}
          chapter={activeChapter}
          chapterIndex={activeChapterIndex}
          totalChapters={chapters.length}
          mode={mode}
          onModeChange={handleModeChange}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          fontFamily={fontFamily}
          onFontFamilyChange={handleFontFamilyChange}
          disableFontFamily={storyFormat === "screenplay" || storyFormat === "webtoon"}
          disableModeSwitch={!supportsPagedMode}
          modeLabel={fixedModeLabel}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onBack={handleBack}
          onSelectChapter={navigateToChapter}
          chapters={chapters}
          wordCount={activeChapter.wordCount}
        />
        <div className="flex-1 flex items-center justify-center">
          <ChapterLockScreen
            storyId={storyId!}
            chapterId={chapterId}
            chapterTitle={activeChapter.title}
            wordCount={activeChapter.wordCount}
            authorName={storyTitle}
            tier={gatingInfo.tier as "standard" | "extended" | "premium"}
            price={gatingInfo.price}
            isEarlyAccess={gatingInfo.isEarlyAccess}
            earlyAccessUntil={gatingInfo.earlyAccessUntil}
            onUnlocked={() => {
              setGatingInfo({ ...gatingInfo, unlocked: true });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-void relative">
      <div className="h-screen w-screen flex flex-col overflow-hidden relative flex-shrink-0">
        <ReaderToolbar
          storyTitle={storyTitle}
          chapter={activeChapter}
          chapterIndex={activeChapterIndex}
          totalChapters={chapters.length}
          mode={mode}
          onModeChange={handleModeChange}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          fontFamily={fontFamily}
          onFontFamilyChange={handleFontFamilyChange}
          disableFontFamily={storyFormat === "screenplay" || storyFormat === "webtoon"}
          disableModeSwitch={!supportsPagedMode}
          modeLabel={fixedModeLabel}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onBack={handleBack}
          onSelectChapter={navigateToChapter}
          chapters={chapters}
          wordCount={activeChapter.wordCount}
        />

        {storyFormat === "webtoon" && storyId ? (
          <WebtoonReader
            key={chapterId}
            storyId={storyId}
            chapterId={chapterId}
            content={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
          />
        ) : storyFormat === "poetry" ? (
          <PoetryReader
            key={chapterId}
            content={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            fontClass={fontClass}
            fontSizeValue={getFontSizeValue(fontSize)}
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
          />
        ) : storyFormat === "screenplay" ? (
          <ScreenplayReader
            key={chapterId}
            content={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
          />
        ) : storyFormat === "illustrated" && mode === "paginated" ? (
          <ReaderPaginated
            key={chapterId}
            htmlContent={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            fontClass={fontClass}
            fontSizeValue={getFontSizeValue(fontSize)}
            typography={typography}
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
            initialPage={initialPageNumber ?? undefined}
            onPageChange={handlePageChange}
          />
        ) : storyFormat === "illustrated" ? (
          <IllustratedReader
            key={chapterId}
            content={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            fontClass={fontClass}
            fontSizeValue={getFontSizeValue(fontSize)}
            typography={typography}
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
          />
        ) : mode === "paginated" ? (
          <ReaderPaginated
            key={chapterId}
            htmlContent={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            onShowDiscussion={handleShowDiscussion}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            authorNoteBefore={activeChapter.authorNoteBefore}
            authorNoteAfter={activeChapter.authorNoteAfter}
            fontClass={fontClass}
            fontSizeValue={getFontSizeValue(fontSize)}
            typography={typography}
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
            initialPage={initialPageNumber ?? undefined}
            onPageChange={handlePageChange}
          />
        ) : (
          <ReaderScroll
            key={chapterId}
            htmlContent={activeChapter.content}
            chapterTitle={activeChapter.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            hasPrevChapter={activeChapterIndex > 0}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
            nextChapterTitle={
              activeChapterIndex < chapters.length - 1
                ? chapters[activeChapterIndex + 1].title
                : undefined
            }
            authorNoteBefore={activeChapter.authorNoteBefore}
            authorNoteAfter={activeChapter.authorNoteAfter}
            fontClass={fontClass}
            fontSizeValue={getFontSizeValue(fontSize)}
            typography={typography}
            initialScrollPercent={initialScrollPercent ?? undefined}
            onScrollProgress={handleScrollProgress}
            reactionsElement={
              storyId ? (
                <ChapterReactions storyId={storyId} chapterId={chapterId} />
              ) : undefined
            }
          />
        )}
      </div>

      {/* Annotation layer for marginalia */}
      {storyId && storyFormat === "novel" && (
        <AnnotationLayer
          storyId={storyId}
          chapterId={chapterId}
          contentRef={annotationContentRef}
        />
      )}

      {/* Unified support footer at chapter end */}
      {storyId && storyUserId && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SupportFooter
            storyId={storyId}
            writerId={storyUserId}
            writerName={storyAuthorName || "the author"}
            chapterTitle={activeChapter?.title}
            hasNextChapter={activeChapterIndex < chapters.length - 1}
            isAuthenticated={Boolean(session?.user)}
            isOwner={session?.user?.id === storyUserId}
          />
        </div>
      )}

      {/* Comments section */}
      {storyId && (
        <div ref={commentsRef}>
          <ChapterComments storyId={storyId} chapterId={chapterId} />
        </div>
      )}

      {/* "Clip" floating button — shows when a passage is selected in prose */}
      <ClipSelectionFAB onClip={(text) => setClipPassage(text)} />

      {/* Scene-clip share dialog */}
      <SceneClip
        open={!!clipPassage}
        onClose={() => setClipPassage(null)}
        passage={clipPassage ?? ""}
        storyTitle={storyTitle}
        authorName={storyAuthorName || "the author"}
        coverUrl={storyCoverUrl}
        shareUrl={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}
