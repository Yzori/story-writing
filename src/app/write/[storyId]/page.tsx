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
  createTypography,
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
import MonetizationPanel from "@/components/editor/MonetizationPanel";
import StoryBiblePanel from "@/components/editor/StoryBiblePanel";
import FrontMatterPanel from "@/components/editor/FrontMatterPanel";
import ChapterSettingsPanel from "@/components/editor/ChapterSettingsPanel";
import HistoryPanel from "@/components/editor/HistoryPanel";
import OutlineView from "@/components/editor/OutlineView";
import TypographyPanel from "@/components/editor/TypographyPanel";
import SearchReplace from "@/components/editor/SearchReplace";
import GoalsPanel from "@/components/editor/GoalsPanel";
import StatusBar from "@/components/editor/StatusBar";
import { useToast } from "@/components/shared/Toast";
import { useModChord } from "@/lib/keys";
import { QuillRingMark } from "@/components/shared/BrandLogo";
import ChapterOutlinePanel from "@/components/editor/ChapterOutlinePanel";
import OnboardingHints from "@/components/editor/OnboardingHints";
import ShortcutsPanel from "@/components/editor/ShortcutsPanel";
import WorkshopChatPanel from "@/components/editor/WorkshopChatPanel";
import AIAssistantPanel from "@/components/editor/AIAssistantPanel";
import FirstChapterCoach from "@/components/editor/FirstChapterCoach";
import DeskView from "@/components/editor/DeskView";
import BibleCodex from "@/components/editor/BibleCodex";
import StoryJacket from "@/components/editor/StoryJacket";
import PublishCounter from "@/components/editor/PublishCounter";
import ReferenceVersions from "@/components/editor/ReferenceVersions";
import ChapterTicks from "@/components/editor/ChapterTicks";
import WritingPromptsBar from "@/components/editor/WritingPromptsBar";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useFeatureAccess } from "@/components/billing/FeatureGate";
import {
  clearConflictChapterDraft,
  clearLocalChapterDraft,
  readLocalChapterDraft,
  useChapterAutosave,
} from "@/hooks/use-chapter-autosave";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { canProceedAfterSaveFlush, getSaveGuardMessage } from "@/lib/editor-save-guard";
import { normalizeTypographySettings, typographyClassName } from "@/lib/typography";

type RightPanel = "none" | "comments" | "metadata" | "bible" | "frontmatter" | "chapter" | "typography" | "history" | "chat" | "monetization" | "ai";
type EditorMode = "write" | "plan" | "review" | "prepare" | "publish";

type DraftRecoveryNotice = {
  chapterId: string;
  chapterTitle: string;
  content: string;
  version: number;
  savedAt: string;
  reason: "autosave" | "failed-save" | "conflict";
};

const editorModes: Array<{
  id: EditorMode;
  label: string;
  icon: string;
}> = [
  { id: "write", label: "Write", icon: "M4 20h4L19 9l-4-4L4 16v4z M13 7l4 4" },
  { id: "plan", label: "Plan", icon: "M5 5h14M5 12h14M5 19h9" },
  { id: "review", label: "Review", icon: "M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9z" },
  { id: "prepare", label: "Prepare", icon: "M4 3h12l4 4v14H4V3z M16 3v5h5M8 13h8M8 17h5" },
  { id: "publish", label: "Publish", icon: "M12 3v13 M7 8l5-5 5 5 M5 21h14" },
];

function EditorModeRail({
  activeMode,
  onChange,
}: {
  activeMode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  return (
    <nav className="absolute inset-y-0 left-0 z-50 hidden w-14 flex-col items-center gap-2 border-r border-border bg-void/90 px-2 py-3 backdrop-blur-xl lg:flex" aria-label="Editor modes">
      <div className="mb-3 flex h-8 w-8 items-center justify-center text-paper/90">
        <QuillRingMark className="h-7 w-7" />
      </div>
      {editorModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            activeMode === mode.id
              ? "border-amber/25 bg-amber/[0.08] text-amber"
              : "border-transparent text-text-ghost hover:border-border hover:bg-paper/[0.05] hover:text-paper"
          }`}
          title={mode.label}
          aria-label={mode.label}
          aria-pressed={activeMode === mode.id}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={mode.icon} />
          </svg>
        </button>
      ))}
    </nav>
  );
}

// The ten flat panels, regrouped into three rooms. AI keeps its own sheet;
// monetization lives in Publish mode only.
const PANEL_ROOMS: Array<{
  label: string;
  tabs: Array<{ panel: RightPanel; label: string; teamOnly?: boolean }>;
}> = [
  {
    label: "Story",
    tabs: [
      { panel: "bible", label: "Characters & World" },
      { panel: "metadata", label: "Details" },
      { panel: "frontmatter", label: "Front matter" },
    ],
  },
  {
    label: "Feedback",
    tabs: [
      { panel: "comments", label: "Comments" },
      { panel: "chat", label: "Chat", teamOnly: true },
    ],
  },
  {
    label: "Craft",
    tabs: [
      { panel: "history", label: "History" },
      { panel: "chapter", label: "Chapter" },
      { panel: "typography", label: "Typography" },
    ],
  },
];

function PanelRoomTabs({
  current,
  hasTeam,
  onSwitch,
}: {
  current: RightPanel;
  hasTeam: boolean;
  onSwitch: (panel: RightPanel) => void;
}) {
  const room = PANEL_ROOMS.find((r) => r.tabs.some((t) => t.panel === current));
  if (!room) return null;
  const tabs = room.tabs.filter((t) => !t.teamOnly || hasTeam);
  if (tabs.length < 2) return null;
  return (
    <div className="hidden items-center gap-1 border-b border-l border-border bg-surface/95 px-3 py-2 backdrop-blur-2xl sm:flex">
      <span className="mr-1.5 text-[9px] uppercase tracking-[0.16em] text-text-ghost">{room.label}</span>
      {tabs.map((t) => (
        <button
          key={t.panel}
          type="button"
          onClick={() => onSwitch(t.panel)}
          className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
            current === t.panel
              ? "bg-amber/[0.08] text-amber border border-amber/20"
              : "border border-transparent text-text-ghost hover:text-text-secondary"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ContextAction({
  label,
  description,
  onClick,
  tone = "neutral",
}: {
  label: string;
  description: string;
  onClick: () => void;
  tone?: "neutral" | "accent" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
        tone === "accent"
          ? "border-amber/25 bg-amber/[0.06] text-amber hover:bg-amber/[0.1]"
          : tone === "danger"
            ? "border-rose/20 bg-rose/[0.04] text-rose hover:bg-rose/[0.08]"
            : "border-border bg-elevated/45 text-text-secondary hover:border-border-active hover:bg-elevated"
      }`}
    >
      <span className="block text-[13px] font-medium text-paper">{label}</span>
      <span className="mt-1 block text-[11px] leading-relaxed text-text-ghost">{description}</span>
    </button>
  );
}

function DraftRecoveryBanner({
  notice,
  onRestore,
  onDismiss,
  onCopy,
}: {
  notice: DraftRecoveryNotice;
  onRestore: () => void;
  onDismiss: () => void;
  onCopy: () => void;
}) {
  const savedAt = new Date(notice.savedAt);
  const savedLabel = Number.isNaN(savedAt.getTime())
    ? "recently"
    : savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const copy =
    notice.reason === "conflict"
      ? "The server has a newer version of this chapter. Your local draft is still safe."
      : notice.reason === "failed-save"
        ? "The last save did not reach the server, so this browser kept a copy."
        : "This browser has writing that has not been confirmed by the server.";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="mt-3 rounded-xl border border-amber/20 bg-amber/[0.06] px-3 py-3 text-amber shadow-lg shadow-black/10"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-paper">
            Unsynced draft found for {notice.chapterTitle || "this chapter"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            {copy} Last local copy: {savedLabel}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-paper"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-2.5 py-1.5 text-[11px] text-text-ghost transition-colors hover:text-text-secondary"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="rounded-lg border border-amber/30 bg-amber/15 px-2.5 py-1.5 text-[11px] font-medium text-amber transition-colors hover:bg-amber/25"
          >
            Restore
          </button>
        </div>
      </div>
    </motion.div>
  );
}

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

function editorCommentsKey(storyId: string, chapterId: string) {
  return `quiloria-editor-comments-${storyId}-${chapterId}`;
}

function loadEditorComments(storyId: string, chapterId: string): CommentThread[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(editorCommentsKey(storyId, chapterId));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveEditorComments(storyId: string, chapterId: string, threads: CommentThread[]) {
  try {
    localStorage.setItem(editorCommentsKey(storyId, chapterId), JSON.stringify(threads));
  } catch {}
}

type EditorCommentsResponse = {
  data?: CommentThread[];
  threadId?: string;
};

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
        aliases: stringArray(extra.aliases),
        description: e.description || "",
        imageDataUrl: nullableString(extra.imageDataUrl),
        color: stringValue(extra.color, "#D4A574"),
        tags: stringArray(extra.tags),
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
        imageDataUrl: nullableString(extra.imageDataUrl),
        tags: stringArray(extra.tags),
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
        tags: stringArray(extra.tags),
        createdAt: new Date(e.createdAt).getTime(),
        updatedAt: new Date(e.updatedAt).getTime(),
      };
    });

  return { characters, places, notes };
}

function parseDetails(details: string): Record<string, unknown> {
  if (!details) return {};
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
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
  const { mutateJson } = useApiMutation({ toast });
  const storyId = params.storyId as string;
  const deskChord = useModChord("E");
  const focusChord = useModChord(".");

  const [project, setProject] = useState<StoryProject | null>(null);
  const updateProject = useCallback(
    (updater: (prev: StoryProject) => StoryProject) => {
      setProject((prev) => {
        if (!prev) return prev;
        return updater(prev);
      });
    },
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showDesk, setShowDesk] = useState(false);
  const [deskOpensFlipped, setDeskOpensFlipped] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [showJacket, setShowJacket] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [undoAction, setUndoAction] = useState<{
    message: string;
    undo: () => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<DraftRecoveryNotice | null>(null);

  // Right panel
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [editorMode, setEditorMode] = useState<EditorMode>("write");
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  // Below `lg` the mode rail + chapter nav are hidden; this opens them as a
  // left drawer so chapter/mode switching is reachable on phones and tablets.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Collapsed by default — the canvas is the star; beats/context are summoned.
  const [rightContextCollapsed, setRightContextCollapsed] = useState(true);

  // Comments
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [commentPopover, setCommentPopover] = useState<{
    position: { x: number; y: number };
    selectedText: string;
    from: number;
    to: number;
  } | null>(null);
  const commentsLoadedChapter = useRef<string | null>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  // Goals
  const [showGoals, setShowGoals] = useState(false);
  // Outline view
  const [showOutline, setShowOutline] = useState(false);
  // Publish state
  const [isPublic, setIsPublic] = useState(false);
  const [writingMode, setWritingMode] = useState("solo");
  const [storySlug, setStorySlug] = useState("");
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);
  const [showRosterNudge, setShowRosterNudge] = useState(false);
  const [rosterNudgeDismissed, setRosterNudgeDismissed] = useState(false);
  // Publish-chapter confirmation dialog state
  const [publishDialog, setPublishDialog] = useState<{
    open: boolean;
    phase: "confirm" | "publishing" | "success";
    chapterId: string | null;
    chapterTitle: string;
    notifiedFollowers: number;
    shareUrl: string;
    linkCopied: boolean;
  }>({
    open: false,
    phase: "confirm",
    chapterId: null,
    chapterTitle: "",
    notifiedFollowers: 0,
    shareUrl: "",
    linkCopied: false,
  });
  // Co-op: collaborator presence
  const [collaborators, setCollaborators] = useState<{ id: string; userId: string; displayName: string | null; avatarUrl: string | null; role: string; status: string }[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  // Format-aware editor
  const [storyFormat, setStoryFormat] = useState("novel");

  // Subscription gates
  const hasProAccess = useFeatureAccess("pro");
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    feature: string;
    tier: "pro" | "premium";
  }>({
    isOpen: false,
    feature: "",
    tier: "pro",
  });

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  // Reference pane
  const [refPaneOpen, setRefPaneOpen] = useState(false);
  const [refPaneTab, setRefPaneTab] = useState<"bible" | "notes" | "versions">("bible");
  // Editor's Desk — docked in the right-panels block. This shim preserves the
  // existing setShowAIAssistant() call sites (Cmd+Shift+K, command palette, etc.)
  const setShowAIAssistant = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    if (typeof next === "function") {
      setRightPanel((p) => (next(p === "ai") ? "ai" : "none"));
    } else {
      setRightPanel(next ? "ai" : "none");
    }
  }, []);

  // Canvas UI state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const webtoonScriptTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const pendingWebtoonScriptSave = useRef<{ chapterId: string; outline: string } | null>(null);

  const {
    saveState,
    setSaveState,
    queueSave,
    scheduleSave,
    flushPendingSaves,
    retryFailedSaves,
  } = useChapterAutosave({ storyId, updateProject, toast });
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
        if (!isOwner) {
          // For co-op/campaign stories, check if user is an accepted collaborator
          if (story.writingMode !== "solo") {
            try {
              const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
              const collabJson = collabRes.ok ? await collabRes.json() : { data: [] };
              const isCollab = (collabJson.data || []).some(
                (c: { userId: string; status: string }) =>
                  c.userId === sessionData.user.id && c.status === "accepted"
              );
              if (!isCollab) {
                setError("You don\u2019t have permission to edit this story");
                setLoading(false);
                return;
              }
            } catch {
              setError("You don\u2019t have permission to edit this story");
              setLoading(false);
              return;
            }
          } else {
            setError("You don\u2019t have permission to edit this story");
            setLoading(false);
            return;
          }
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
          goals: settings.goals ?? { dailyWordTarget: story.dailyWordTarget || 500, sessions: [] },
          typography: normalizeTypographySettings({
            ...createTypography(),
            ...settings.typography,
            ...story,
          }),
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

        // Co-op: fetch collaborators for presence + gate
        if (story.writingMode === "co-op" || story.writingMode === "campaign") {
          try {
            const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
            if (collabRes.ok) {
              const collabJson = await collabRes.json();
              const allCollabs = (collabJson.data || []).map((c: { id: string; userId: string; role: string; status: string; user?: { displayName?: string | null; avatarUrl?: string | null } | null }) => ({
                id: c.id,
                userId: c.userId,
                displayName: c.user?.displayName || null,
                avatarUrl: c.user?.avatarUrl || null,
                role: c.role,
                status: c.status,
              }));
              setCollaborators(allCollabs);
              const accepted = allCollabs.filter((c: { status: string }) => c.status === "accepted");
              if (accepted.length === 0 && story.writingMode === "co-op") {
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
  }, [storyId, router]);

  // ── Editor settings persistence ───────────────────────────
  // Goals are editor-local. Typography is now story-backed, but we keep a
  // local copy as a quick draft cache for older/local projects.
  const projectGoals = project?.goals;
  const projectTypography = project?.typography;
  useEffect(() => {
    if (!projectGoals || !projectTypography) return;
    saveEditorSettings(storyId, {
      goals: projectGoals,
      typography: projectTypography,
    });
  }, [storyId, projectGoals, projectTypography]);

  // ── Right panel toggle ────────────────────────────────────
  const togglePanel = useCallback(
    (panel: RightPanel) => {
      setRightPanel((prev) => (prev === panel ? "none" : panel));
    },
    []
  );

  const flushWebtoonScriptSave = useCallback(async () => {
    if (webtoonScriptTimer.current) {
      clearTimeout(webtoonScriptTimer.current);
      webtoonScriptTimer.current = null;
    }

    const pending = pendingWebtoonScriptSave.current;
    if (!pending) return true;

    const json = await mutateJson(`/api/stories/${storyId}/chapters/${pending.chapterId}`, {
      body: { outline: pending.outline },
      errorMessage: "Couldn't save episode script",
    });

    if (!json) return false;
    pendingWebtoonScriptSave.current = null;
    return true;
  }, [mutateJson, storyId]);

  const handleSelectChapter = useCallback(
    async (id: string) => {
      if (isSwitching.current) return; // Prevent concurrent switches
      isSwitching.current = true;
      try {
        const flushed =
          (await flushPendingSaves()) && (await flushWebtoonScriptSave());
        if (!canProceedAfterSaveFlush(flushed)) {
          toast(getSaveGuardMessage("chapter-switch"), "error");
          return;
        }
        updateProject((prev) => (prev ? { ...prev, activeChapterId: id } : prev));
      } finally {
        isSwitching.current = false;
      }
    },
    [updateProject, flushPendingSaves, flushWebtoonScriptSave, toast]
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
      if (isMod && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      // Editor's Desk: Cmd+Shift+K
      if (isMod && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setShowAIAssistant((v) => !v);
        return;
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (isMod && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        const idx = project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? -1;
        const nextId = idx >= 0 ? project?.chapters[idx + 1]?.id : null;
        if (nextId) void handleSelectChapter(nextId);
      }
      if (isMod && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        const idx = project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? -1;
        const nextId = idx > 0 ? project?.chapters[idx - 1]?.id : null;
        if (nextId) void handleSelectChapter(nextId);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowGoals((v) => !v);
      }
      // Focus mode: Cmd/Ctrl+. — the writer's most important toggle
      if (isMod && e.key === ".") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setShowCodex((v) => !v);
      }
      // The Desk: Cmd/Ctrl+E zooms out to the chapters overview.
      // DeskView owns the close (capture-phase listener) so the
      // zoom-back animation always plays.
      if (isMod && e.key.toLowerCase() === "e" && !e.shiftKey) {
        e.preventDefault();
        if (!showDesk) {
          setCommandOpen(false);
          setDeskOpensFlipped(false);
          setShowDesk(true);
        }
      }
      // Ctrl+S — manual save
      if (isMod && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        void flushPendingSaves().then((ok) => {
          if (ok) void flushWebtoonScriptSave();
        });
      }
      // Ctrl+/ — keyboard shortcuts panel
      if (isMod && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }
      if (e.key === "Escape" && publishDialog.open && publishDialog.phase !== "publishing") {
        setPublishDialog((p) => ({ ...p, open: false }));
      }

    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [commandOpen, showDesk, publishDialog.open, publishDialog.phase, togglePanel, flushPendingSaves, flushWebtoonScriptSave, project?.chapters, project?.activeChapterId, handleSelectChapter, setShowAIAssistant]);

  // Typing detection — its own stable listener. It used to live in the
  // shortcuts effect above, whose cleanup cleared the pending 2s reset
  // every time a dep flipped (open the desk within 2s of typing and
  // isTyping stayed true forever, stranding the status bar hidden).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key.length !== 1) return;
      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (webtoonScriptTimer.current) clearTimeout(webtoonScriptTimer.current);
      const pending = pendingWebtoonScriptSave.current;
      if (!pending) return;

      fetch(`/api/stories/${storyId}/chapters/${pending.chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: pending.outline }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [storyId]);

  const activeChapter = useMemo(() =>
    project?.chapters.find((c) => c.id === project.activeChapterId),
    [project?.chapters, project?.activeChapterId]
  );
  const activeChapterIndex = useMemo(() =>
    project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? 0,
    [project?.chapters, project?.activeChapterId]
  );

  useEffect(() => {
    const chapter = project?.chapters.find((candidate) => candidate.id === project.activeChapterId);
    if (!chapter) {
      setDraftRecovery(null);
      return;
    }

    const draft = readLocalChapterDraft(storyId, chapter.id);
    if (!draft) {
      setDraftRecovery(null);
      return;
    }

    if (draft.content === chapter.content) {
      clearLocalChapterDraft(storyId, chapter.id);
      setDraftRecovery(null);
      return;
    }

    setDraftRecovery({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      content: draft.content,
      version: draft.version,
      savedAt: draft.savedAt,
      reason: draft.reason,
    });
    // Recovery should be checked when entering a chapter, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, project?.activeChapterId]);

  useEffect(() => {
    const chapterId = project?.activeChapterId;
    if (!chapterId) return;
    const localThreads = loadEditorComments(storyId, chapterId);
    setCommentThreads(localThreads);
    commentsLoadedChapter.current = chapterId;
    setActiveThreadId(null);
    setCommentPopover(null);

    let cancelled = false;
    fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json() as EditorCommentsResponse;
        if (!cancelled && Array.isArray(json.data)) {
          setCommentThreads(json.data);
          saveEditorComments(storyId, chapterId, json.data);
        }
      })
      .catch(() => {
        // Local comments are already loaded as an offline fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [storyId, project?.activeChapterId]);

  useEffect(() => {
    if (!project?.activeChapterId) return;
    if (commentsLoadedChapter.current !== project.activeChapterId) return;
    saveEditorComments(storyId, project.activeChapterId, commentThreads);
  }, [storyId, project?.activeChapterId, commentThreads]);

  // ── Chapter handlers ──────────────────────────────────────

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

    const json = await mutateJson<{ data?: ApiChapter }>(`/api/stories/${storyId}/chapters`, {
      method: "POST",
      body: { title },
      errorMessage: "Couldn't create chapter",
    });

    if (json?.data) {
      const newChapter = apiChapterToLocal(json.data);
      updateProject((prev) => ({
        ...prev,
        chapters: [...prev.chapters, newChapter],
        activeChapterId: newChapter.id,
      }));
    }
  }, [mutateJson, project?.chapters.length, storyFormat, updateProject, storyId]);

  const handleReorderChapters = useCallback(
    (chapters: Chapter[]) => {
      const previousChapters = project?.chapters ?? [];
      updateProject((prev) => ({ ...prev, chapters }));
      const reorderData = chapters.map((ch, i) => ({ id: ch.id, sortOrder: i }));
      void mutateJson(`/api/stories/${storyId}/chapters/reorder`, {
        body: { chapters: reorderData },
        errorMessage: "Couldn't reorder chapters",
        rollback: () => {
          updateProject((prev) => ({ ...prev, chapters: previousChapters }));
        },
      });
    },
    [mutateJson, project?.chapters, updateProject, storyId]
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
      void mutateJson(`/api/stories/${storyId}/chapters/${id}`, {
        body: { title: newTitle },
        errorMessage: "Couldn't rename chapter",
        rollback: () => {
          updateProject((prev) => ({
            ...prev,
            chapters: prev.chapters.map((c) =>
              c.id === id ? { ...c, title: oldTitle, updatedAt: Date.now() } : c
            ),
          }));
        },
      });
    },
    [mutateJson, updateProject, storyId]
  );

  // ── Unpublish (take a live chapter back to draft) ────────
  const handleUnpublishChapter = useCallback(
    (id: string) => {
      const previous = project?.chapters.find((c) => c.id === id)?.status;
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === id ? { ...c, status: "draft" } : c
        ),
      }));
      void mutateJson(`/api/stories/${storyId}/chapters/${id}`, {
        body: { status: "draft" },
        successMessage: "Chapter taken down",
        errorMessage: "Couldn't take the chapter down",
        rollback: previous
          ? () =>
              updateProject((prev) => ({
                ...prev,
                chapters: prev.chapters.map((c) =>
                  c.id === id ? { ...c, status: previous } : c
                ),
              }))
          : undefined,
      });
    },
    [mutateJson, project?.chapters, updateProject, storyId]
  );

  // ── Publish chapter flow (confirmation + share) ──────────
  const openPublishDialog = useCallback(
    (chapterId: string, chapterTitle: string) => {
      setPublishDialog({
        open: true,
        phase: "confirm",
        chapterId,
        chapterTitle,
        notifiedFollowers: 0,
        shareUrl: "",
        linkCopied: false,
      });
    },
    []
  );

  const confirmPublish = useCallback(async () => {
    const chapterId = publishDialog.chapterId;
    if (!chapterId) return;
    setPublishDialog((p) => ({ ...p, phase: "publishing" }));
    try {
      // Flush any unsaved content first so readers get the latest. If the
      // flush fails (network down, conflict, etc.) we must NOT publish —
      // doing so ships whatever the server already had, silently dropping
      // the user's recent edits.
      const flushed =
        (await flushPendingSaves()) && (await flushWebtoonScriptSave());
      if (!canProceedAfterSaveFlush(flushed)) {
        toast(getSaveGuardMessage("publish"), "error");
        setPublishDialog((p) => ({ ...p, open: false }));
        return;
      }
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) {
        toast("Couldn\u2019t publish chapter", "error");
        setPublishDialog((p) => ({ ...p, open: false }));
        return;
      }
      const json = await res.json();
      const notifiedFollowers: number = json?.meta?.notifiedFollowers ?? 0;
      const resolvedSlug: string =
        json?.meta?.storySlug || storySlug || storyId;
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/story/${resolvedSlug}/read/${chapterId}`;

      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId ? { ...c, status: "published" as const } : c
        ),
      }));

      setPublishDialog((p) => ({
        ...p,
        phase: "success",
        notifiedFollowers,
        shareUrl,
      }));
    } catch (err) {
      console.error("Publish failed:", err);
      toast("Network error. Try again.", "error");
      setPublishDialog((p) => ({ ...p, open: false }));
    }
  }, [publishDialog.chapterId, storyId, storySlug, flushPendingSaves, flushWebtoonScriptSave, toast, updateProject]);

  const copyShareLink = useCallback(async () => {
    if (!publishDialog.shareUrl) return;
    try {
      await navigator.clipboard.writeText(publishDialog.shareUrl);
      setPublishDialog((p) => ({ ...p, linkCopied: true }));
      setTimeout(
        () => setPublishDialog((p) => ({ ...p, linkCopied: false })),
        2000
      );
    } catch {
      toast("Couldn\u2019t copy link", "error");
    }
  }, [publishDialog.shareUrl, toast]);

  const closePublishDialog = useCallback(() => {
    setPublishDialog((p) => ({ ...p, open: false }));
  }, []);

  const handleDeleteChapter = useCallback(
    async (id: string) => {
      // Prevent deleting the last chapter
      if ((project?.chapters.length ?? 0) <= 1) {
        toast("Cannot delete the only chapter", "error");
        return;
      }
      const flushed =
        (await flushPendingSaves()) && (await flushWebtoonScriptSave());
      if (!canProceedAfterSaveFlush(flushed)) {
        toast(getSaveGuardMessage("delete"), "error");
        return;
      }
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
    [storyId, project, flushPendingSaves, flushWebtoonScriptSave, toast]
  );

  const handleUpdateContent = useCallback(
    (content: string, wordCount: number) => {
      const chapterId = project?.activeChapterId;
      if (chapterId) {
        const chapter = project?.chapters.find((c) => c.id === chapterId);
        queueSave(chapterId, content, chapter?.version ?? 1);
      }

      updateProject((prev) => {
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
      scheduleSave();
    },
    [project?.activeChapterId, project?.chapters, queueSave, scheduleSave, updateProject]
  );

  const handleUpdateStoryTitle = useCallback(
    (title: string) => {
      const previousTitle = project?.title ?? "";
      updateProject((prev) => ({ ...prev, title }));
      void mutateJson(`/api/stories/${storyId}`, {
        body: { title },
        errorMessage: "Couldn't rename story",
        rollback: () => updateProject((prev) => ({ ...prev, title: previousTitle })),
      });
    },
    [mutateJson, project?.title, updateProject, storyId]
  );

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  // ── Metadata handler ──────────────────────────────────────

  const handleUpdateMetadata = useCallback(
    (metadata: StoryMetadata) => {
      const previousMetadata = project?.metadata;
      updateProject((prev) => ({ ...prev, metadata }));
      const patchBody: Record<string, unknown> = {
        synopsis: metadata.synopsis,
        hook: metadata.hook,
        genres: metadata.genres,
        contentRating: metadata.contentRating,
        status: metadata.status,
        language: metadata.language,
        dedication: metadata.dedication,
      };
      // Sync cover image (data URL for MVP, URL for production)
      if (metadata.coverImageDataUrl) {
        patchBody.coverImageUrl = metadata.coverImageDataUrl;
      } else {
        patchBody.coverImageUrl = null;
      }
      void mutateJson(`/api/stories/${storyId}`, {
        body: patchBody,
        errorMessage: "Couldn't save story details",
        rollback: previousMetadata
          ? () => updateProject((prev) => ({ ...prev, metadata: previousMetadata }))
          : undefined,
      });
    },
    [mutateJson, project?.metadata, updateProject, storyId]
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
      const previousFrontMatter = project?.frontMatter;
      updateProject((prev) => ({ ...prev, frontMatter }));
      void mutateJson(`/api/stories/${storyId}`, {
        body: {
          epigraph: frontMatter.epigraph,
          epigraphAttribution: frontMatter.epigraphAttribution,
          foreword: frontMatter.foreword,
          showToc: frontMatter.showToc,
        },
        errorMessage: "Couldn't save front matter",
        rollback: previousFrontMatter
          ? () => updateProject((prev) => ({ ...prev, frontMatter: previousFrontMatter }))
          : undefined,
      });
    },
    [mutateJson, project?.frontMatter, updateProject, storyId]
  );

  // ── Typography handler ─────────────────────────────────

  const handleUpdateTypography = useCallback(
    (typography: TypographySettings) => {
      const previousTypography = project?.typography;
      updateProject((prev) => ({ ...prev, typography }));
      void mutateJson(`/api/stories/${storyId}`, {
        body: {
          dropCaps: typography.dropCaps,
          sceneBreakStyle: typography.sceneBreakStyle,
          paragraphIndent: typography.paragraphIndent,
          lineSpacing: typography.lineSpacing,
          textAlignment: typography.textAlignment,
          paragraphSpacing: typography.paragraphSpacing,
        },
        errorMessage: "Couldn't save typography settings",
        rollback: previousTypography
          ? () => updateProject((prev) => ({ ...prev, typography: previousTypography }))
          : undefined,
      });
    },
    [mutateJson, project?.typography, updateProject, storyId]
  );

  // ── Publish toggle handler ─────────────────────────────

  const handleTogglePublish = useCallback(() => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    void mutateJson(`/api/stories/${storyId}`, {
      body: { isPublic: newValue },
      successMessage: newValue ? "Story published" : "Story unpublished",
      errorMessage: "Couldn't update publish status",
      rollback: () => setIsPublic(!newValue),
    });
  }, [isPublic, mutateJson, storyId]);

  const handleDeleteStory = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) return;
    await mutateJson(`/api/stories/${storyId}`, {
      method: "DELETE",
      errorMessage: "Couldn't delete story",
      onSuccess: () => {
        toast("Story deleted", "info");
        router.push("/dashboard");
      },
    });
  }, [mutateJson, storyId, router, toast]);

  // ── Chapter settings handler ────────────────────────────

  const handleUpdateChapterFields = useCallback(
    (updates: Partial<Chapter>) => {
      const chapterId = project?.activeChapterId;
      if (!chapterId) return;
      const previousChapter = project?.chapters.find((chapter) => chapter.id === chapterId);

      if (updates.status === "published" && previousChapter?.status !== "published") {
        openPublishDialog(chapterId, previousChapter?.title ?? "Untitled");
        return;
      }

      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, ...updates, updatedAt: Date.now() }
            : chapter
        ),
      }));

      const apiUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) apiUpdates.status = updates.status;
      if (updates.authorNoteBefore !== undefined) apiUpdates.authorNoteBefore = updates.authorNoteBefore;
      if (updates.authorNoteAfter !== undefined) apiUpdates.authorNoteAfter = updates.authorNoteAfter;
      if (updates.outline !== undefined) apiUpdates.outline = updates.outline;

      if (Object.keys(apiUpdates).length === 0) return;

      void mutateJson(`/api/stories/${storyId}/chapters/${chapterId}`, {
        body: apiUpdates,
        errorMessage: "Couldn't save chapter settings",
        rollback: previousChapter
          ? () => updateProject((prev) => ({
              ...prev,
              chapters: prev.chapters.map((chapter) =>
                chapter.id === chapterId ? previousChapter : chapter
              ),
            }))
          : undefined,
        onSuccess: () => {
          if (updates.status === "published" && !rosterNudgeDismissed) {
            setShowRosterNudge(true);
          }
        },
      });
    },
    [mutateJson, project?.activeChapterId, project?.chapters, updateProject, storyId, rosterNudgeDismissed, openPublishDialog]
  );

  // ── Editor's Desk handlers ────────────────────────────────
  const handleAIAccept = useCallback(
    (suggestion: string) => {
      if (!editorInstance) return;

      const { from, to } = editorInstance.state.selection;
      editorInstance.chain().focus().insertContentAt({ from, to }, suggestion).run();
      setShowAIAssistant(false);
    },
    [editorInstance, setShowAIAssistant]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshot: ChapterSnapshot) => {
      const chapterId = project?.activeChapterId;
      if (chapterId) {
        const chapter = project.chapters.find((c) => c.id === chapterId);
        queueSave(chapterId, snapshot.content, chapter?.version ?? 1);
      }

      updateProject((prev) => {
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
      scheduleSave();
    },
    [project?.activeChapterId, project?.chapters, queueSave, scheduleSave, updateProject]
  );

  // ── Outline handler ─────────────────────────────────────

  const handleUpdateOutline = useCallback(
    (chapterId: string, outline: string) => {
      const previousOutline = project?.chapters.find((chapter) => chapter.id === chapterId)?.outline ?? "";
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId ? { ...c, outline, updatedAt: Date.now() } : c
        ),
      }));
      void mutateJson(`/api/stories/${storyId}/chapters/${chapterId}`, {
        body: { outline },
        errorMessage: "Couldn't save outline",
        rollback: () => {
          updateProject((prev) => ({
            ...prev,
            chapters: prev.chapters.map((chapter) =>
              chapter.id === chapterId
                ? { ...chapter, outline: previousOutline, updatedAt: Date.now() }
                : chapter
            ),
          }));
        },
      });
    },
    [mutateJson, project?.chapters, updateProject, storyId]
  );

  const handleUpdateWebtoonScript = useCallback(
    (chapterId: string, outline: string) => {
      updateProject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, outline, updatedAt: Date.now() }
            : chapter
        ),
      }));

      if (webtoonScriptTimer.current) clearTimeout(webtoonScriptTimer.current);
      pendingWebtoonScriptSave.current = { chapterId, outline };
      webtoonScriptTimer.current = setTimeout(() => {
        void flushWebtoonScriptSave();
      }, 700);
    },
    [flushWebtoonScriptSave, updateProject]
  );

  // ── Search handler ────────────────────────────────────────

  const handleUpdateChapterContent = useCallback(
    (chapterId: string, content: string) => {
      const chapter = project?.chapters.find((c) => c.id === chapterId);
      queueSave(chapterId, content, chapter?.version ?? 1);
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
      scheduleSave();
    },
    [updateProject, scheduleSave, project, queueSave]
  );

  const handleRestoreLocalDraft = useCallback(() => {
    if (!draftRecovery) return;

    const currentVersion =
      project?.chapters.find((chapter) => chapter.id === draftRecovery.chapterId)?.version ??
      draftRecovery.version;
    updateProject((prev) => ({
      ...prev,
      activeChapterId: draftRecovery.chapterId,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== draftRecovery.chapterId) return chapter;
        return {
          ...chapter,
          content: draftRecovery.content,
          wordCount: countWords(draftRecovery.content),
          updatedAt: Date.now(),
        };
      }),
    }));
    queueSave(draftRecovery.chapterId, draftRecovery.content, currentVersion);
    scheduleSave();
    setSaveState("saving");
    setDraftRecovery(null);
    toast("Recovered draft restored", "success");
  }, [draftRecovery, project?.chapters, queueSave, scheduleSave, setSaveState, toast, updateProject]);

  const handleDismissLocalDraft = useCallback(() => {
    if (!draftRecovery) return;
    clearLocalChapterDraft(storyId, draftRecovery.chapterId);
    setDraftRecovery(null);
    toast("Local draft dismissed", "info");
  }, [draftRecovery, storyId, toast]);

  const handleCopyLocalDraft = useCallback(async () => {
    if (!draftRecovery) return;
    try {
      await navigator.clipboard.writeText(draftRecovery.content);
      toast("Local draft copied", "success");
    } catch {
      toast("Couldn’t copy local draft", "error");
    }
  }, [draftRecovery, toast]);

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
    async (commentText: string) => {
      if (!editorInstance || !commentPopover) return;

      let thread = createCommentThread(commentPopover.selectedText, commentText);
      const chapterId = project?.activeChapterId;

      if (chapterId) {
        try {
          const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quotedText: commentPopover.selectedText,
              commentText,
              from: commentPopover.from,
              to: commentPopover.to,
            }),
          });
          if (res.ok) {
            const json = await res.json() as EditorCommentsResponse;
            if (json.threadId) {
              thread = { ...thread, id: json.threadId };
            }
            if (Array.isArray(json.data)) {
              setCommentThreads(json.data);
              saveEditorComments(storyId, chapterId, json.data);
            }
          } else {
            setCommentThreads((prev) => [...prev, thread]);
          }
        } catch {
          setCommentThreads((prev) => [...prev, thread]);
        }
      } else {
        setCommentThreads((prev) => [...prev, thread]);
      }

      editorInstance
        .chain()
        .focus()
        .setTextSelection({
          from: commentPopover.from,
          to: commentPopover.to,
        })
        .setComment(thread.id)
        .run();

      setActiveThreadId(thread.id);
      setRightPanel("comments");
      setCommentPopover(null);
    },
    [editorInstance, commentPopover, project?.activeChapterId, storyId]
  );

  const handleReplyToThread = useCallback(
    async (threadId: string, text: string) => {
      const chapterId = project?.activeChapterId;
      if (chapterId) {
        try {
          const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId, replyText: text }),
          });
          if (res.ok) {
            const json = await res.json() as EditorCommentsResponse;
            if (Array.isArray(json.data)) {
              setCommentThreads(json.data);
              saveEditorComments(storyId, chapterId, json.data);
              return;
            }
          }
        } catch {
          // Fall back to local reply below.
        }
      }
      setCommentThreads((prev) =>
        prev.map((t) => (t.id === threadId ? addReply(t, text) : t))
      );
    },
    [project?.activeChapterId, storyId]
  );

  // Strip a thread's comment marks from the text — one transaction, no
  // caret theft. Used on resolve and delete alike: a resolved note has
  // no business still highlighting the manuscript.
  const removeCommentMarks = useCallback(
    (threadId: string) => {
      if (!editorInstance) return;
      const { state } = editorInstance;
      const { tr } = state;
      let changed = false;
      state.doc.descendants((node, pos) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.threadId === threadId) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
            changed = true;
          }
        });
      });
      if (changed) editorInstance.view.dispatch(tr);
    },
    [editorInstance]
  );

  const handleResolveThread = useCallback(async (threadId: string) => {
    removeCommentMarks(threadId);
    const chapterId = project?.activeChapterId;
    if (chapterId) {
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, resolved: true }),
        });
        if (res.ok) {
          const json = await res.json() as EditorCommentsResponse;
          if (Array.isArray(json.data)) {
            setCommentThreads(json.data);
            saveEditorComments(storyId, chapterId, json.data);
            return;
          }
        }
      } catch {
        // Fall back to local resolve below.
      }
    }
    setCommentThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, resolved: true } : t))
    );
  }, [project?.activeChapterId, storyId, removeCommentMarks]);

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      const chapterId = project?.activeChapterId;
      if (chapterId) {
        try {
          const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId }),
          });
          if (res.ok) {
            const json = await res.json() as EditorCommentsResponse;
            if (Array.isArray(json.data)) {
              setCommentThreads(json.data);
              saveEditorComments(storyId, chapterId, json.data);
            }
          } else {
            setCommentThreads((prev) => prev.filter((t) => t.id !== threadId));
          }
        } catch {
          setCommentThreads((prev) => prev.filter((t) => t.id !== threadId));
        }
      } else {
        setCommentThreads((prev) => prev.filter((t) => t.id !== threadId));
      }
      removeCommentMarks(threadId);
      if (activeThreadId === threadId) setActiveThreadId(null);
    },
    [removeCommentMarks, activeThreadId, project?.activeChapterId, storyId]
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
  const handleToggleGoals = useCallback(() => setShowGoals((v) => !v), []);
  const handleOpenGrimoire = useCallback(() => setCommandOpen(true), []);
  const handleCloseGrimoire = useCallback(() => setCommandOpen(false), []);
  const handleCloseGoals = useCallback(() => setShowGoals(false), []);
  const handleClosePanel = useCallback(() => setRightPanel("none"), []);
  const handleToggleLeftSidebar = useCallback(() => setLeftSidebarCollapsed((collapsed) => !collapsed), []);
  const handleToggleRightContext = useCallback(() => setRightContextCollapsed((collapsed) => !collapsed), []);
  const handleChangeEditorMode = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
    setRightPanel("none");
    // Write mode opens with a clean canvas; the other modes ARE their
    // context column, so switching to them is an explicit ask for it.
    setRightContextCollapsed(mode === "write");
    setShowGoals(false);
    if (mode !== "plan") {
      setShowOutline(false);
    }
  }, []);
  // Comments, chapter settings and typography are companions now — they
  // slide in beside the page without dragging the old mode shell back.
  const handleToggleComments = useCallback(() => {
    togglePanel("comments");
  }, [togglePanel]);
  const handleToggleBible = useCallback(() => {
    setEditorMode("plan");
    togglePanel("bible");
  }, [togglePanel]);
  const handleToggleSettings = useCallback(() => {
    togglePanel("chapter");
  }, [togglePanel]);
  const handleOpenMetadata = useCallback(() => {
    setEditorMode("prepare");
    togglePanel("metadata");
  }, [togglePanel]);
  const handleOpenFrontMatter = useCallback(() => {
    setEditorMode("prepare");
    togglePanel("frontmatter");
  }, [togglePanel]);
  const handleOpenTypography = useCallback(() => {
    togglePanel("typography");
  }, [togglePanel]);
  const handleOpenMonetization = useCallback(() => {
    setEditorMode("publish");
    togglePanel("monetization");
  }, [togglePanel]);
  const handleOpenWorkshop = useCallback(() => {
    if (storySlug) router.push(`/story/${storySlug}/workshop?from=editor`);
  }, [router, storySlug]);
  const handleOpenOpenCalls = useCallback(() => {
    if (storySlug) router.push(`/story/${storySlug}/calls?from=editor`);
  }, [router, storySlug]);
  const handleToggleOutlineView = useCallback(() => {
    setEditorMode("plan");
    setRightPanel("none");
    setShowOutline((v) => !v);
  }, []);
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
  const handleCancelComment = useCallback(() => setCommentPopover(null), []);
  const handleOpenSearch = useCallback(() => setShowSearch(true), []);
  const handleWebtoonWordCount = useCallback((wordCount: number) => {
    updateProject((prev) => {
      const chapterId = prev.activeChapterId;
      const current = prev.chapters.find((chapter) => chapter.id === chapterId);
      if (!current || current.wordCount === wordCount) return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, wordCount } : chapter
        ),
      };
    });
  }, [updateProject]);

  // ── Dynamic export handlers ────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    // Check Pro access for exports
    if (!hasProAccess) {
      setUpgradeModal({
        isOpen: true,
        feature: "PDF Export",
        tier: "pro",
      });
      return;
    }

    if (!project) return;
    try {
      const { exportPdf } = await import("@/client/export-pdf");
      await exportPdf(project);
    } catch (err) {
      console.error("PDF export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project, hasProAccess, setSaveState]);

  const handleExportEpub = useCallback(async () => {
    // Check Pro access for exports
    if (!hasProAccess) {
      setUpgradeModal({
        isOpen: true,
        feature: "EPUB Export",
        tier: "pro",
      });
      return;
    }

    if (!project) return;
    try {
      const { exportEpub } = await import("@/client/export-pdf");
      exportEpub(project);
    } catch (err) {
      console.error("EPUB export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project, hasProAccess, setSaveState]);

  const handleExportDocx = useCallback(async () => {
    // Check Pro access for exports
    if (!hasProAccess) {
      setUpgradeModal({
        isOpen: true,
        feature: "DOCX Export",
        tier: "pro",
      });
      return;
    }

    if (!project) return;
    try {
      const { exportDocx } = await import("@/client/export-docx");
      exportDocx(project);
    } catch (err) {
      console.error("DOCX export failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [project, hasProAccess, setSaveState]);

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
  // The bare page: in write mode the rails step away entirely — chapter
  // ticks in the left margin are the only resident navigation, and the
  // desk (⌘E) carries everything heavier. The other modes ARE their
  // context columns, so they keep the rails.
  const barePage = editorMode === "write";
  const leftInsetClass = barePage
    ? "lg:pl-0"
    : leftSidebarCollapsed ? "lg:pl-[104px]" : "lg:pl-[344px]";
  const rightInsetClass = barePage
    ? "xl:pr-0"
    : rightPanel === "none"
      ? rightContextCollapsed ? "xl:pr-12" : "xl:pr-[360px]"
      : "xl:pr-[360px]";

  const rightPanelColumn = (
        <div className={`flex h-full flex-col ${rightPanel === "none" ? "w-0" : "w-full"}`}>
          {rightPanel !== "none" && (
            <PanelRoomTabs
              current={rightPanel}
              hasTeam={writingMode !== "solo" && collaborators.length > 0}
              onSwitch={setRightPanel}
            />
          )}
          <div className="relative flex min-h-0 w-full flex-1">
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
              storyId={storyId}
              isPublic={isPublic}
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
              onUpdate={handleUpdateChapterFields}
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
          {rightPanel === "chat" && sessionUserId && (
            <WorkshopChatPanel
              storyId={storyId}
              currentUserId={sessionUserId}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "monetization" && (
            <MonetizationPanel
              storyId={storyId}
              storyTitle={project.title}
              isPublic={isPublic}
              onOpenMetadata={() => { setCommandOpen(false); setShowJacket(true); }}
              onClose={handleClosePanel}
            />
          )}
          {rightPanel === "ai" && editorInstance && (
            <AIAssistantPanel
              storyId={storyId as string}
              selectedText={editorInstance.state.doc.textBetween(
                editorInstance.state.selection.from,
                editorInstance.state.selection.to,
              )}
              context={activeChapter?.content || ""}
              onAccept={handleAIAccept}
              onClose={handleClosePanel}
            />
          )}
        </AnimatePresence>
          </div>
        </div>
  );

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 w-screen overflow-hidden transition-colors duration-1000 bg-void">

      {/* ── 1. Cinematic Canvas Background ──────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Ambient amber glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[150px] rounded-full mix-blend-screen transition-all duration-1000 bg-amber/[0.03]" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 transition-opacity duration-1000 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {!barePage && <EditorModeRail activeMode={editorMode} onChange={handleChangeEditorMode} />}

      {/* ── 2a. Bare page: thumb-index ticks + first-night coach ── */}
      {barePage && !focusMode && (
        <>
          <ChapterTicks
            chapters={project.chapters}
            activeChapterId={project.activeChapterId}
            unitSingular={getFormatLabels(storyFormat).singular}
            dimmed={isTyping}
            onSelect={(id) => void handleSelectChapter(id)}
            onAdd={() => void handleAddChapter()}
            onOpenDesk={() => setShowDesk(true)}
          />
          <div className="fixed bottom-24 left-4 z-30 hidden w-[264px] lg:block">
            <FirstChapterCoach
              variant="inline"
              state={{
                hasTitle: !!project.title && project.title !== "Untitled story" && project.title !== "Untitled",
                hasGenre: (project.metadata?.genres?.length ?? 0) > 0,
                hasCover: !!project.metadata?.coverImageDataUrl,
                hasContent: (activeChapter?.wordCount ?? 0) >= 100,
              }}
              totalWords={totalWords}
              onOpenSetup={() => setShowJacket(true)}
            />
          </div>
        </>
      )}

      {/* ── 2. Book Navigation (Left) ──────────────────────── */}
      {!barePage && (
      <aside className="absolute inset-y-0 left-14 z-30 hidden border-r border-border bg-surface/80 backdrop-blur-2xl lg:flex">
        <ChapterNav
          chapters={project.chapters}
          activeChapterId={project.activeChapterId}
          storyTitle={project.title}
          collapsed={leftSidebarCollapsed}
          format={storyFormat}
          onSelectChapter={handleSelectChapter}
          onAddChapter={handleAddChapter}
          onReorderChapters={handleReorderChapters}
          onRenameChapter={handleRenameChapter}
          onDeleteChapter={handleDeleteChapter}
          onToggleCollapse={handleToggleLeftSidebar}
          onUpdateStoryTitle={handleUpdateStoryTitle}
          onOpenToolkit={handleOpenGrimoire}
          coachSlot={
            <FirstChapterCoach
              variant="inline"
              state={{
                hasTitle: !!project.title && project.title !== "Untitled story" && project.title !== "Untitled",
                hasGenre: (project.metadata?.genres?.length ?? 0) > 0,
                hasCover: !!project.metadata?.coverImageDataUrl,
                hasContent: (activeChapter?.wordCount ?? 0) >= 100,
              }}
              totalWords={totalWords}
              onOpenSetup={() => setShowJacket(true)}
            />
          }
        />
      </aside>
      )}

      {/* ── 3. Mobile nav drawer (below lg) ─────────────────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-[61] flex w-[272px] max-w-[88vw] flex-col border-r border-border bg-surface/95 backdrop-blur-2xl shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Mode switcher (the desktop rail, laid out horizontally) */}
              <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
                {editorModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleChangeEditorMode(mode.id)}
                    className={`flex h-9 flex-1 items-center justify-center rounded-lg border transition-all ${
                      editorMode === mode.id
                        ? "border-amber/25 bg-amber/[0.08] text-amber"
                        : "border-transparent text-text-ghost hover:bg-paper/[0.05] hover:text-paper"
                    }`}
                    title={mode.label}
                    aria-label={mode.label}
                    aria-pressed={editorMode === mode.id}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d={mode.icon} />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                <ChapterNav
                  chapters={project.chapters}
                  activeChapterId={project.activeChapterId}
                  storyTitle={project.title}
                  collapsed={false}
                  format={storyFormat}
                  onSelectChapter={(id) => { handleSelectChapter(id); setMobileNavOpen(false); }}
                  onAddChapter={() => { handleAddChapter(); setMobileNavOpen(false); }}
                  onReorderChapters={handleReorderChapters}
                  onRenameChapter={handleRenameChapter}
                  onDeleteChapter={handleDeleteChapter}
                  onToggleCollapse={() => setMobileNavOpen(false)}
                  onUpdateStoryTitle={handleUpdateStoryTitle}
                  onOpenToolkit={handleOpenGrimoire}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 4. The Canvas (Editor Center Stage) ─────────────── */}
      <div className={`relative z-10 w-full h-full flex flex-col items-center overflow-hidden transition-[opacity,padding] duration-500 ${leftInsetClass} ${rightInsetClass} ${commandOpen ? "opacity-30 blur-sm pointer-events-none" : "opacity-100"}`}>

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
                layoutId={barePage ? "page-sheet" : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={
                  barePage
                    ? { layout: { type: "spring", stiffness: 340, damping: 34 }, duration: 0.2, ease: "easeInOut" }
                    : { duration: 0.2, ease: "easeInOut" }
                }
                className={
                  barePage
                    ? `page-sheet w-full ${rightPanel !== "none" || refPaneOpen ? "max-w-[1180px]" : "max-w-[840px]"} lg:mx-auto flex-1 min-h-0 flex flex-col items-center mt-4 mb-16 rounded-2xl border border-border bg-ink shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden`
                    : "w-full flex-1 min-h-0 flex flex-col items-center"
                }
              >
                {/* Spacer to push content below navbar area */}
                <div className={barePage ? "w-full h-5 shrink-0" : "w-full h-16 shrink-0"} />

                {/* Sticky chapter header */}
                <div className={`w-full sticky top-0 z-20 backdrop-blur-sm border-b border-paper/[0.03] pt-3 ${barePage ? "bg-ink/70" : "bg-void/80"}`}>
                  <div className="max-w-[680px] mx-auto px-4 sm:px-8 pb-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* Mobile chapter/mode drawer toggle (rail + nav are lg-only) */}
                      <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className="lg:hidden -ml-1 mr-0.5 p-1 rounded-md text-text-ghost hover:text-paper transition-colors"
                        aria-label="Open chapters and modes"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 4h12M2 8h12M2 12h8" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDesk(true)}
                        className="text-[10px] text-amber/50 uppercase tracking-[0.15em] transition-colors hover:text-amber"
                        title={`Step back to the desk (${deskChord})`}
                      >
                        {project.title}
                      </button>
                      {writingMode === "co-op" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal/10 border border-teal/20 text-teal uppercase tracking-widest">Co-op</span>
                      )}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                        <path d="M3 2l4 3-4 3" />
                      </svg>
                      <span className="text-[10px] text-text-ghost uppercase tracking-[0.15em]">
                        {activeChapterIndex !== undefined ? `${getFormatLabels(storyFormat).singular} ${activeChapterIndex + 1}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h1
                        className="min-w-0 flex-1 truncate text-xl md:text-2xl font-display text-paper/90 outline-none focus:text-amber/90 transition-colors cursor-text"
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
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Co-op: Collaborator presence + team controls */}
                        {writingMode !== "solo" && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            {collaborators.length > 0 && (
                              <div className="flex -space-x-1.5">
                                {collaborators.filter((c) => c.status === "accepted").slice(0, 4).map((c) => (
                                  <div
                                    key={c.id}
                                    className="w-6 h-6 rounded-full border border-void bg-elevated flex items-center justify-center text-[8px] font-bold text-text-secondary overflow-hidden"
                                    title={c.displayName || "Collaborator"}
                                  >
                                    {c.avatarUrl ? (
                                      <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      (c.displayName || "?").charAt(0).toUpperCase()
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Workshop link */}
                            <button
                              onClick={handleOpenWorkshop}
                              className="p-1.5 rounded-md text-text-ghost hover:text-teal border border-transparent hover:border-teal/20 transition-all"
                              title="Workshop — team, suggestions, lore, agreement"
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="7" cy="7" r="3" />
                                <circle cx="14" cy="8" r="2.5" />
                                <path d="M2 16c0-2.8 2.2-5 5-5s5 2.2 5 5" />
                                <path d="M12 16c0-2.2 1.8-4 4-4s2 1 2 2" />
                              </svg>
                            </button>
                            {/* Chat toggle */}
                            {collaborators.length > 0 && (
                              <button
                                onClick={() => setRightPanel((p) => p === "chat" ? "none" : "chat")}
                                className={`p-1.5 rounded-md transition-all ${
                                  rightPanel === "chat"
                                    ? "bg-teal/10 text-teal border border-teal/20"
                                    : "text-text-ghost hover:text-text-secondary border border-transparent"
                                }`}
                                title="Workshop Chat"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                              </button>
                            )}
                            <div className="w-px h-4 bg-border" />
                          </div>
                        )}
                        {/* Focus mode toggle — reading-time metrics live in Review/Publish, not the drafting room */}
                        <button
                          onClick={() => setFocusMode((f) => !f)}
                          className={`px-2 py-1.5 rounded-md transition-all text-[11px] hidden sm:flex items-center gap-1.5 ${
                            focusMode
                              ? "bg-amber/10 text-amber border border-amber/20"
                              : "text-text-ghost hover:text-text-secondary border border-transparent"
                          }`}
                          title={`Focus mode (${focusChord})`}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                            <circle cx="7" cy="7" r="3" />
                            <path d="M7 1v2M7 11v2M1 7h2M11 7h2" />
                          </svg>
                          <span className="hidden lg:inline">Focus</span>
                        </button>
                        {/* Reference pane toggle */}
                        <button
                          onClick={() => setRefPaneOpen((r) => !r)}
                          className={`p-1.5 rounded-md transition-all text-[11px] hidden sm:flex items-center gap-1 ${
                            refPaneOpen
                              ? "bg-lavender/10 text-lavender border border-lavender/20"
                              : "text-text-ghost hover:text-text-secondary border border-transparent"
                          }`}
                          title="Reference pane"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                            <rect x="1" y="1" width="12" height="12" rx="2" />
                            <line x1="9" y1="1" x2="9" y2="13" />
                          </svg>
                        </button>
                        {/* Quick publish — earns its place once there's something to publish */}
                        {activeChapter.status !== "published" ? (
                          <button
                            onClick={() => {
                              if (activeChapter && (activeChapter.wordCount ?? 0) >= 100) {
                                openPublishDialog(activeChapter.id, activeChapter.title);
                              }
                            }}
                            disabled={(activeChapter.wordCount ?? 0) < 100}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                              (activeChapter.wordCount ?? 0) < 100
                                ? "border-border text-text-ghost/60 cursor-default opacity-50"
                                : "border-sage/30 text-sage hover:bg-sage/10"
                            }`}
                            title={
                              (activeChapter.wordCount ?? 0) < 100
                                ? "Write at least 100 words to publish this chapter"
                                : "Publish this chapter"
                            }
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                            <span className="hidden min-[420px]:inline">
                              {(activeChapter.wordCount ?? 0) < 100
                                ? `Publish · ${activeChapter.wordCount ?? 0}/100 words`
                                : "Publish Chapter"}
                            </span>
                            <span className="min-[420px]:hidden">Publish</span>
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-sage/10 text-sage/60" title="This chapter is visible to readers">
                            Chapter Live
                          </span>
                        )}
                      </div>
                    </div>
                    <AnimatePresence>
                      {draftRecovery?.chapterId === activeChapter.id && (
                        <DraftRecoveryBanner
                          notice={draftRecovery}
                          onRestore={handleRestoreLocalDraft}
                          onDismiss={handleDismissLocalDraft}
                          onCopy={handleCopyLocalDraft}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex pt-4 sm:pt-8">
                  <div
                    className={`flex-1 min-w-0 min-h-0 flex flex-col ${typographyClassName(project.typography)} ${
                      focusMode ? "focus-mode" : ""
                    }`}
                  >
                  {/* Format-aware "stuck?" prompts — auto-hide above 50 words */}
                  {activeChapter && storyFormat !== "webtoon" && (
                    <WritingPromptsBar
                      format={storyFormat}
                      chapterKey={activeChapter.id}
                      wordCount={activeChapter.wordCount ?? 0}
                      showBelowWords={1}
                      onPick={(text) => {
                        if (!editorInstance) return;
                        // Insert as italicized prose so the writer can clearly see
                        // what came from the prompt vs. their own writing.
                        const html = text
                          .split("\n\n")
                          .map((para) => `<p><em>${para.replace(/\n/g, "<br>")}</em></p>`)
                          .join("");
                        editorInstance.chain().focus("end").insertContent(html).run();
                      }}
                    />
                  )}

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
                        scriptContent={activeChapter.outline}
                        onScriptUpdate={(content) => handleUpdateWebtoonScript(activeChapter.id, content)}
                        onWordCountChange={handleWebtoonWordCount}
                      />
                    ) : storyFormat === "illustrated" ? (
                      <IllustratedEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                        editorClassName={typographyClassName(project.typography)}
                      />
                    ) : (
                      <ProseEditor
                        key={activeChapter.id}
                        content={activeChapter.content}
                        onUpdate={handleUpdateContent}
                        onEditorReady={handleEditorReady}
                        editorClassName={typographyClassName(project.typography)}
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
                              onClick={() => setRefPaneTab("versions")}
                              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                                refPaneTab === "versions"
                                  ? "bg-amber/[0.08] text-amber border border-amber/20"
                                  : "text-text-ghost hover:text-text-secondary"
                              }`}
                            >
                              Versions
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
                            {refPaneTab === "versions" && activeChapter ? (
                              <ReferenceVersions storyId={storyId} chapterId={activeChapter.id} />
                            ) : refPaneTab === "bible" ? (
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
                                  No characters yet. Add them in Characters & World.
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
                                  No notes yet. Add them in Characters & World.
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </motion.aside>
                    )}
                  </AnimatePresence>
                  {barePage && rightPanel !== "none" && (
                    <div className="hidden h-full shrink-0 lg:flex">{rightPanelColumn}</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── 5. Floating Status Bar ──────────────────────────── */}
      <AnimatePresence>
        {showUI && !focusMode && (
          <StatusBar
            chapterWordCount={activeChapter?.wordCount ?? 0}
            totalWords={totalWords}
            goals={project.goals}
            saveState={saveState}
            onOpenGrimoire={handleOpenGrimoire}
            insetClass={`${leftInsetClass} ${rightInsetClass}`}
          />
        )}
      </AnimatePresence>

      {/* ── Persistent Save Indicator (visible even while typing) ── */}
      <AnimatePresence>
        {(!showUI || focusMode) && saveState !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated/80 backdrop-blur-sm border border-border/30 text-[10px]"
          >
            {saveState === "saving" && (
              <>
                <div className="w-2 h-2 border border-text-ghost border-t-amber rounded-full animate-spin" />
                <span className="text-text-ghost">Saving</span>
              </>
            )}
            {saveState === "saved" && (
              <>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-sage/70">Saved</span>
              </>
            )}
            {saveState === "error" && (
              <>
                <div className="w-2 h-2 rounded-full bg-rose" />
                <span className="text-rose/70">Save failed</span>
              </>
            )}
          </motion.div>
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
            <span>Server version changed. Your draft is saved locally.</span>
            <button
              onClick={() => window.location.reload()}
              title="Load the latest server version. Your local draft remains recoverable."
              className="px-3 py-1.5 rounded-lg bg-amber/20 hover:bg-amber/30 transition-colors font-medium text-xs"
            >
              Load latest
            </button>
            <button
              onClick={() => {
                const ch = project?.chapters.find((c) => c.id === project.activeChapterId);
                if (!ch) return;
                const key = `quiloria-conflict-${storyId}-${ch.id}`;
                try {
                  const saved = localStorage.getItem(key);
                  if (saved) {
                    const { content } = JSON.parse(saved);
                    navigator.clipboard.writeText(content || "");
                    toast("Draft copied to clipboard", "success");
                  }
                } catch { toast("Could not recover draft", "error"); }
              }}
              className="px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:bg-surface transition-colors font-medium text-xs text-text-secondary"
            >
              Copy draft
            </button>
            <button
              onClick={async () => {
                const ch = project?.chapters.find((c) => c.id === project.activeChapterId);
                if (!ch) return;

                setSaveState("saving");
                try {
                  const response = await fetch(`/api/stories/${storyId}/chapters/${ch.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: ch.content }),
                  });

                  if (!response.ok) {
                    setSaveState("conflict");
                    toast("Couldn’t save your version. Your draft is still local.", "error");
                    return;
                  }

                  const json = await response.json();
                  const savedChapter = json.data;
                  if (savedChapter?.id && typeof savedChapter.version === "number") {
                    updateProject((prev) => ({
                      ...prev,
                      chapters: prev.chapters.map((c) =>
                        c.id === savedChapter.id ? { ...c, version: savedChapter.version } : c
                      ),
                    }));
                  }

                  clearLocalChapterDraft(storyId, ch.id);
                  clearConflictChapterDraft(storyId, ch.id);
                  setSaveState("saved");
                  window.setTimeout(() => setSaveState("idle"), 2000);
                  toast("Your version saved", "success");
                } catch {
                  setSaveState("conflict");
                  toast("Network error. Your draft is still local.", "error");
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:bg-surface transition-colors font-medium text-xs text-text-secondary"
            >
              Save my draft
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
            <button
              onClick={async () => {
                const current = project.chapters.find((chapter) => chapter.id === project.activeChapterId);
                if (!current) return;
                try {
                  await navigator.clipboard.writeText(current.content || "");
                  toast("Current draft copied", "success");
                } catch {
                  toast("Couldn’t copy draft", "error");
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-surface/60 border border-border hover:bg-surface transition-colors font-medium text-text-secondary"
            >
              Copy draft
            </button>
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

      {/* ── Publish Chapter Dialog ──────────────────────────── */}
      <AnimatePresence>
        {publishDialog.open && (
          <motion.div
            key="publish-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/70 backdrop-blur-sm px-4"
            onClick={publishDialog.phase !== "publishing" ? closePublishDialog : undefined}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md bg-elevated border border-border rounded-2xl p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {publishDialog.phase === "confirm" && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-sage/10 border border-sage/20 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text-ghost text-[10px] tracking-[0.2em] uppercase">Publish chapter</p>
                      <h3 className="font-display text-paper text-lg leading-tight">
                        {publishDialog.chapterTitle || "Untitled chapter"}
                      </h3>
                    </div>
                  </div>
                  <p className="text-text-secondary text-[13px] leading-relaxed mb-6">
                    Readers who follow this story will be notified. You can unpublish any time
                    from Chapter Settings.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={closePublishDialog}
                      className="text-text-ghost hover:text-paper text-[13px] tracking-wide transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmPublish}
                      className="px-5 py-2 rounded-lg bg-sage/15 border border-sage/40 text-sage hover:bg-sage/25 font-medium text-[13px] transition-all"
                    >
                      Publish now
                    </button>
                  </div>
                </>
              )}

              {publishDialog.phase === "publishing" && (
                <div className="flex flex-col items-center py-4">
                  <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin mb-4" />
                  <p className="text-text-ghost text-[12px] tracking-wide uppercase">
                    Publishing…
                  </p>
                </div>
              )}

              {publishDialog.phase === "success" && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-sage/15 border border-sage/30 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sage text-[10px] tracking-[0.2em] uppercase">Published</p>
                      <h3 className="font-display text-paper text-lg leading-tight truncate">
                        {publishDialog.chapterTitle || "Untitled chapter"}
                      </h3>
                    </div>
                  </div>

                  <p className="text-text-secondary text-[13px] leading-relaxed mb-5">
                    {publishDialog.notifiedFollowers === 0
                      ? "Your chapter is live. No followers to notify yet — share the link below."
                      : publishDialog.notifiedFollowers === 1
                        ? "Your chapter is live. 1 follower has been notified."
                        : `Your chapter is live. ${publishDialog.notifiedFollowers.toLocaleString()} followers have been notified.`}
                  </p>

                  {/* Share link row */}
                  <div className="mb-5">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-text-ghost mb-2">
                      Share link
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={publishDialog.shareUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 bg-void border border-border rounded-md px-3 py-2 text-[12px] text-text-secondary font-mono outline-none focus:border-sage/40"
                      />
                      <button
                        onClick={copyShareLink}
                        className={`px-3 py-2 rounded-md border text-[12px] transition-all whitespace-nowrap ${
                          publishDialog.linkCopied
                            ? "border-sage/50 bg-sage/15 text-sage"
                            : "border-border text-text-secondary hover:text-paper hover:border-border/80"
                        }`}
                      >
                        {publishDialog.linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <a
                      href={publishDialog.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sage hover:text-sage-light text-[12px] tracking-wide transition-colors"
                    >
                      View as a reader →
                    </a>
                    <button
                      onClick={closePublishDialog}
                      className="px-4 py-2 rounded-lg text-text-ghost hover:text-paper text-[13px] transition-colors"
                    >
                      Back to writing
                    </button>
                  </div>
                </>
              )}
            </motion.div>
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

      {/* ── 6. Right Context + Panels ─────────────────────── */}
      <div className={`editor-side-shell absolute inset-y-0 right-0 z-40 flex max-w-full transition-[width] duration-300 ${
        rightPanel === "none"
          ? rightContextCollapsed ? (barePage ? "w-0" : "w-0 xl:w-12") : "w-0 xl:w-[360px]"
          : barePage ? "w-full lg:w-0" : "w-full sm:w-[360px]"
      }`}>
        {rightPanel === "none" && rightContextCollapsed && !commandOpen && !barePage && (
          /* The quiet right edge: rooms live where they open. */
          <aside className="hidden h-full w-12 flex-col items-center border-l border-border bg-surface/80 py-3 backdrop-blur-2xl xl:flex">
            <button
              type="button"
              onClick={handleToggleRightContext}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-ghost transition-colors hover:bg-subtle/50 hover:text-amber"
              title="Expand context panel"
              aria-label="Expand context panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <div className="my-3 h-px w-6 bg-border" />
            {/* Story room */}
            <button
              type="button"
              onClick={() => setRightPanel("bible")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-ghost transition-colors hover:bg-subtle/50 hover:text-amber"
              title="Story — characters & world, details, front matter"
              aria-label="Open story room"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.04A9 9 0 0 0 6 3.75c-1.05 0-2.06.18-3 .51v14.25a9 9 0 0 1 3-.51c2.3 0 4.4.87 6 2.29m0-14.25a9 9 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25a9 9 0 0 0-3-.51 9 9 0 0 0-6 2.29m0-14.25v14.25" />
              </svg>
            </button>
            {/* Feedback room */}
            <button
              type="button"
              onClick={() => setRightPanel("comments")}
              className="mt-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-text-ghost transition-colors hover:bg-subtle/50 hover:text-amber"
              title="Feedback — comments and chat"
              aria-label="Open feedback room"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {/* Craft room */}
            <button
              type="button"
              onClick={() => setRightPanel("history")}
              className="mt-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-text-ghost transition-colors hover:bg-subtle/50 hover:text-amber"
              title="Craft — chapter settings, history, typography"
              aria-label="Open craft room"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </button>
          </aside>
        )}

        {rightPanel === "none" && !rightContextCollapsed && !commandOpen && (
          <aside className="hidden h-full w-full flex-col border-l border-border bg-surface/90 backdrop-blur-2xl xl:flex">
            {editorMode === "write" && activeChapter && (
              <ChapterOutlinePanel
                chapter={activeChapter}
                docked
                onUpdateOutline={(outline) => handleUpdateOutline(activeChapter.id, outline)}
                onClose={() => setEditorMode("plan")}
                onCollapse={handleToggleRightContext}
              />
            )}

            {editorMode !== "write" && (
              <>
                <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-paper">
                      {editorMode === "plan" && "Plan"}
                      {editorMode === "review" && "Review"}
                      {editorMode === "prepare" && "Prepare"}
                      {editorMode === "publish" && "Publish"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-ghost">
                      {editorMode === "plan" && "Structure, continuity, and reference material."}
                      {editorMode === "review" && "Feedback, comments, snapshots, and recovery."}
                      {editorMode === "prepare" && "Packaging tools for a ready manuscript."}
                      {editorMode === "publish" && "Visibility, reader access, monetization, and launch."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRightContext}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-ghost transition-colors hover:bg-subtle/50 hover:text-text-secondary"
                    title="Collapse context panel"
                    aria-label="Collapse context panel"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 3L5 7l4 4" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {editorMode === "plan" && (
                    <>
                      <ContextAction
                        label="Book Map"
                        description="Plan the whole book by chapter."
                        onClick={handleToggleOutlineView}
                        tone="accent"
                      />
                      <ContextAction
                        label="Characters & World"
                        description="Characters, places, lore, and continuity notes."
                        onClick={handleToggleBible}
                      />
                      <ContextAction
                        label="Chapter Beats"
                        description="Scene notes for the current chapter."
                        onClick={() => {
                          setEditorMode("write");
                          setRightPanel("none");
                        }}
                      />
                    </>
                  )}

                  {editorMode === "review" && (
                    <>
                      <ContextAction
                        label="Comments"
                        description={`${commentThreads.filter((thread) => !thread.resolved).length} open thread${commentThreads.filter((thread) => !thread.resolved).length === 1 ? "" : "s"}.`}
                        onClick={handleToggleComments}
                        tone="accent"
                      />
                      <ContextAction
                        label="Version History"
                        description={`${activeChapter?.snapshots.length ?? 0} snapshot${(activeChapter?.snapshots.length ?? 0) === 1 ? "" : "s"} for this chapter.`}
                        onClick={() => {
                          setEditorMode("review");
                          setRightPanel("history");
                        }}
                      />
                      <ContextAction
                        label="Workshop"
                        description="Team space, suggestions, lore book, and agreement."
                        onClick={handleOpenWorkshop}
                      />
                    </>
                  )}

                  {editorMode === "prepare" && (
                    <>
                      <ContextAction
                        label="Cover & Details"
                        description="Cover art, synopsis, genre, rating, and language."
                        onClick={handleOpenMetadata}
                        tone="accent"
                      />
                      <ContextAction
                        label="Front Matter"
                        description="Epigraph, foreword, and table of contents."
                        onClick={handleOpenFrontMatter}
                      />
                      <ContextAction
                        label="Typography"
                        description="Drop caps, scene breaks, and reading style."
                        onClick={handleOpenTypography}
                      />
                      <ContextAction
                        label="Chapter Settings"
                        description="Status, author notes, and chapter-level metadata."
                        onClick={handleToggleSettings}
                      />
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <button onClick={handleExportPdf} className="rounded-lg border border-border bg-elevated/45 px-2 py-2 text-[11px] text-text-secondary hover:text-paper">PDF</button>
                        <button onClick={handleExportEpub} className="rounded-lg border border-border bg-elevated/45 px-2 py-2 text-[11px] text-text-secondary hover:text-paper">EPUB</button>
                        <button onClick={handleExportDocx} className="rounded-lg border border-border bg-elevated/45 px-2 py-2 text-[11px] text-text-secondary hover:text-paper">DOCX</button>
                      </div>
                    </>
                  )}

                  {editorMode === "publish" && (
                    <>
                      <div className="rounded-xl border border-border bg-elevated/45 px-3 py-3">
                        <span className="block text-[13px] font-medium text-paper">
                          {isPublic ? "Story is public" : "Story is private"}
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-text-ghost">
                          {isPublic ? "Readers can discover this story." : "Only you and collaborators can see it."}
                        </span>
                      </div>
                      <ContextAction
                        label={isPublic ? "Make Story Private" : "Make Story Public"}
                        description="Control whether readers can discover the story."
                        onClick={handleTogglePublish}
                        tone="accent"
                      />
                      <ContextAction
                        label="Monetization"
                        description="Circle, chapter gating, and commissions."
                        onClick={handleOpenMonetization}
                      />
                      <ContextAction
                        label="Open Calls"
                        description="Post roles and recruit collaborators."
                        onClick={handleOpenOpenCalls}
                      />
                      {/* Delete moved here when the Toolkit (its only home) was removed */}
                      <ContextAction
                        label="Delete Story"
                        description="Remove this story and all its chapters. Cannot be undone."
                        onClick={handleDeleteStory}
                        tone="danger"
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
        {rightPanel !== "none" &&
          (!barePage ? (
            rightPanelColumn
          ) : (
            /* Mobile bare page: panels still need the overlay shell. */
            <div className="flex h-full w-full lg:hidden">{rightPanelColumn}</div>
          ))}

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

      {/* ── The Desk — zoom-out chapters overview (⌘E) ──────── */}
      <AnimatePresence>
        {showDesk && (
          <DeskView
            storyTitle={project.title}
            unit={getFormatLabels(storyFormat)}
            chapters={project.chapters}
            activeChapterId={project.activeChapterId}
            onClose={() => setShowDesk(false)}
            initialFlipped={deskOpensFlipped}
            morphEnabled={barePage}
            onUpdateOutline={handleUpdateOutline}
            onSelectChapter={(id) => void handleSelectChapter(id)}
            onNewChapter={() => void handleAddChapter()}
            onOpenBible={() => setShowCodex(true)}
            onOpenDetails={() => setShowJacket(true)}
            onOpenPublish={() => setShowCounter(true)}
            onOpenHistory={(id) => {
              void handleSelectChapter(id).then(() => setRightPanel("history"));
            }}
            onRenameChapter={handleRenameChapter}
            onMoveChapter={(id, dir) => {
              const chs = project.chapters;
              const idx = chs.findIndex((c) => c.id === id);
              const swap = idx + dir;
              if (idx < 0 || swap < 0 || swap >= chs.length) return;
              const next = [...chs];
              [next[idx], next[swap]] = [next[swap], next[idx]];
              handleReorderChapters(next);
            }}
            onDeleteChapter={(id) => void handleDeleteChapter(id)}
          />
        )}
      </AnimatePresence>

      {/* ── The Codex — the story bible as a place ──────────── */}
      <AnimatePresence>
        {showCodex && (
          <BibleCodex
            bible={project.bible}
            storyId={storyId}
            storyTitle={project.title}
            chapters={bibleChapters}
            onUpdate={handleUpdateBible}
            onBack={() => {
              setShowCodex(false);
              setShowDesk(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── The Jacket — story details as a place ───────────── */}
      <AnimatePresence>
        {showJacket && (
          <StoryJacket
            storyTitle={project.title}
            metadata={project.metadata}
            frontMatter={project.frontMatter}
            typography={project.typography}
            onUpdateTitle={handleUpdateStoryTitle}
            onUpdateMetadata={handleUpdateMetadata}
            onUpdateFrontMatter={handleUpdateFrontMatter}
            onUpdateTypography={handleUpdateTypography}
            onBack={() => {
              setShowJacket(false);
              setShowDesk(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── The Counter — publishing as a place ─────────────── */}
      <AnimatePresence>
        {showCounter && (
          <PublishCounter
            storyId={storyId}
            storyTitle={project.title}
            storySlug={storySlug}
            isPublic={isPublic}
            chapters={project.chapters}
            unit={getFormatLabels(storyFormat)}
            onTogglePublic={handleTogglePublish}
            onPublishChapter={openPublishDialog}
            holdEsc={publishDialog.open}
            onUnpublishChapter={handleUnpublishChapter}
            onBack={() => {
              setShowCounter(false);
              setShowDesk(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── 9. Command Palette / The Grimoire ───────────────── */}
      <CommandPalette
        open={commandOpen}
        onClose={handleCloseGrimoire}
        editor={editorInstance}
        onOpenDesk={() => { setCommandOpen(false); setDeskOpensFlipped(false); setShowDesk(true); }}
        onToggleFocus={() => { setCommandOpen(false); setFocusMode((f) => !f); }}
        isFocusMode={focusMode}
        onOpenSearch={handleOpenSearch}
        onOpenEditorDesk={() => { setCommandOpen(false); setShowAIAssistant(true); }}
        onOpenMetadata={() => { setCommandOpen(false); setShowJacket(true); }}
        onOpenBible={() => { setCommandOpen(false); setShowCodex(true); }}

        onOpenChapterSettings={handleToggleSettings}
        onOpenOutline={() => { setCommandOpen(false); setDeskOpensFlipped(true); setShowDesk(true); }}
        onOpenTypography={() => { setCommandOpen(false); setShowJacket(true); }}
        onOpenMonetization={() => { setCommandOpen(false); setShowCounter(true); }}
        onOpenWorkshop={handleOpenWorkshop}
        onOpenOpenCalls={handleOpenOpenCalls}
        onExportPdf={handleExportPdf}
        onExportEpub={handleExportEpub}
        onExportDocx={handleExportDocx}
        onOpenShortcuts={() => { setCommandOpen(false); setShowShortcuts(true); }}
        onOpenComments={handleToggleComments}
        onOpenHistory={() => { setCommandOpen(false); setRightPanel("history"); }}
        onOpenGoals={handleToggleGoals}
        onOpenBeats={() => {
          setCommandOpen(false);
          setEditorMode("write");
          setRightPanel("none");
          setRightContextCollapsed(false);
        }}
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

      {/* The tour waits for momentum: real words on the page, typing paused. */}
      <OnboardingHints enabled={totalWords >= 150 && !isTyping} />

      {/* Upgrade Modal for Premium Features */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        feature={upgradeModal.feature}
        tier={upgradeModal.tier}
      />
    </div>
  );
}
