"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tiptap/react";

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

// Scannable glyphs per command — a path for an SVG stroke icon, or a
// short text glyph for the typographic ones (B, H1, Aa…).
const COMMAND_ICONS: Record<string, { path?: string; text?: string }> = {
  // Go
  desk: { path: "M3 4h7v8H3z M14 4h7v8h-7z M3 16h18v5H3z" },
  outline: { path: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" },
  codex: { path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
  jacket: { path: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" },
  counter: { path: "M12 19V5 M5 12l7-7 7 7" },
  workshop: { path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  "open-calls": { path: "M3 11l18-7-7 18-2-7-9-4z" },
  // Insert
  "scene-break": { path: "M5 12h3 M10.5 12h3 M16 12h3" },
  "heading-1": { text: "H1" },
  "heading-2": { text: "H2" },
  blockquote: { path: "M10 15H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6z M20 15h-4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6z" },
  "bullet-list": { path: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" },
  "ordered-list": { path: "M10 6h11 M10 12h11 M10 18h11 M4 6h1v4 M4 10h2 M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" },
  illustration: { path: "M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6" },
  "full-bleed-illustration": { path: "M2 7h20v10H2z M2 13l5-4 4 3 3-2 6 4" },
  "chapter-header-art": { path: "M3 4h18v8H3z M3 9l5-3 4 2 3-1 6 3 M5 16h14 M5 20h9" },
  // Format
  bold: { text: "B" },
  italic: { text: "I" },
  strikethrough: { text: "S" },
  highlight: { path: "M9 11l-6 6v3h9l3-3 M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" },
  "align-left": { path: "M4 6h16 M4 12h10 M4 18h14" },
  "align-center": { path: "M4 6h16 M7 12h10 M5 18h14" },
  "align-right": { path: "M4 6h16 M10 12h10 M6 18h14" },
  "align-justify": { path: "M4 6h16 M4 12h16 M4 18h16" },
  "clear-formatting": { path: "M4 7V5h16v2 M9 5l6 14 M5 19h8 M18 14l4 4 M22 14l-4 4" },
  // View / Chapter / Tools
  "focus-mode": { path: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3" },
  search: { path: "M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" },
  "ai-assistant": { path: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" },
  comments: { path: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  history: { path: "M12 8v4l2.5 2.5 M3.05 11a9 9 0 1 1 .5 4 M3 16v-5h5" },
  goals: { path: "M4 21V4 M4 4h12l-2 4 2 4H4" },
  beats: { path: "M4 6h16 M4 12h10 M4 18h7" },
  "chapter-settings": { path: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 12h4 M18 16h4" },
  typography: { text: "Aa" },
  "keyboard-shortcuts": { path: "M2 6h20v12H2z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M7 14h10" },
  // Export
  "export-pdf": { path: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" },
  "export-epub": { path: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" },
  "export-docx": { path: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" },
};

function CommandGlyph({ id, active }: { id: string; active: boolean }) {
  const icon = COMMAND_ICONS[id];
  return (
    <span
      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-amber/30 bg-amber/10 text-amber"
          : "border-border bg-paper/[0.03] text-text-ghost"
      }`}
      aria-hidden
    >
      {icon?.text ? (
        <span className="font-mono text-[10px] font-semibold">{icon.text}</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon?.path ?? "M12 5v14 M5 12h14"} />
        </svg>
      )}
    </span>
  );
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  onOpenSearch?: () => void;
  onOpenJacket?: () => void;
  onOpenCodex?: () => void;
  onOpenChapterSettings?: () => void;
  onOpenOutline?: () => void;
  onOpenTypography?: () => void;
  onOpenCounter?: () => void;
  onOpenWorkshop?: () => void;
  onOpenOpenCalls?: () => void;
  onExportPdf?: () => void;
  onExportEpub?: () => void;
  onExportDocx?: () => void;
  onOpenShortcuts?: () => void;
  onOpenEditorDesk?: () => void;
  onOpenComments?: () => void;
  onOpenHistory?: () => void;
  onOpenGoals?: () => void;
  onOpenBeats?: () => void;
  onOpenDesk?: () => void;
  onToggleFocus?: () => void;
  isFocusMode?: boolean;
}

export default function CommandPalette({
  open,
  onClose,
  editor,
  onOpenDesk,
  onToggleFocus,
  isFocusMode,
  onOpenSearch,
  onOpenJacket,
  onOpenCodex,
  onOpenChapterSettings,
  onOpenOutline,
  onOpenTypography,
  onOpenCounter,
  onOpenWorkshop,
  onOpenOpenCalls,
  onExportPdf,
  onExportEpub,
  onExportDocx,
  onOpenShortcuts,
  onOpenEditorDesk,
  onOpenComments,
  onOpenHistory,
  onOpenGoals,
  onOpenBeats,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const modKey = isMac ? '\u2318' : 'Ctrl+';
  const supportsIllustrations = Boolean(
    editor?.extensionManager.extensions.some((extension) =>
      extension.name === "illustrationBlock" || extension.name === "illustratedBlock"
    )
  );
  const supportsParagraphAlignment = Boolean(
    editor?.extensionManager.extensions.some((extension) => extension.name === "paragraphAlignment")
  );

  const commands = useMemo<Command[]>(() => [
    // Go — the places off the desk
    ...(onOpenDesk
      ? [
          {
            id: "desk",
            label: "The Desk",
            description: "Your chapters, laid out as sheets",
            shortcut: `${modKey}E`,
            category: "Go",
            action: onOpenDesk,
          },
        ]
      : []),
    // Insert
    {
      id: "scene-break",
      label: "Scene Break",
      description: "Insert a scene divider",
      category: "Insert",
      action: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "heading-1",
      label: "Heading 1",
      description: "Large section heading",
      category: "Insert",
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "heading-2",
      label: "Heading 2",
      description: "Medium section heading",
      category: "Insert",
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "blockquote",
      label: "Quote",
      description: "Insert a blockquote",
      category: "Insert",
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "bullet-list",
      label: "Bullet List",
      category: "Insert",
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      label: "Numbered List",
      category: "Insert",
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    ...(supportsIllustrations
      ? [
          {
            id: "illustration",
            label: "Illustration",
            description: "Insert an image block",
            category: "Insert",
            action: () => editor?.chain().focus().setIllustrationBlock({ layout: "inline" }).run(),
          },
          {
            id: "full-bleed-illustration",
            label: "Full-Bleed Illustration",
            description: "Insert a wide image block",
            category: "Insert",
            action: () => editor?.chain().focus().setIllustrationBlock({ layout: "full-bleed" }).run(),
          },
          {
            id: "chapter-header-art",
            label: "Chapter Header Art",
            description: "Insert image art at the top of the chapter",
            category: "Insert",
            action: () => editor?.chain().focus().setIllustrationBlock({ layout: "chapter-header" }).run(),
          },
        ]
      : []),
    // Format
    {
      id: "bold",
      label: "Bold",
      shortcut: `${modKey}B`,
      category: "Format",
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: "Italic",
      shortcut: `${modKey}I`,
      category: "Format",
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      id: "strikethrough",
      label: "Strikethrough",
      category: "Format",
      action: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      id: "highlight",
      label: "Highlight",
      category: "Format",
      action: () => editor?.chain().focus().toggleHighlight().run(),
    },
    ...(supportsParagraphAlignment
      ? [
          {
            id: "align-left",
            label: "Align Paragraph Left",
            description: "Align selected/current paragraph left",
            category: "Format",
            action: () => editor?.chain().focus().setParagraphAlignment("left").run(),
          },
          {
            id: "align-center",
            label: "Center Paragraph",
            description: "Center selected/current paragraph",
            category: "Format",
            action: () => editor?.chain().focus().setParagraphAlignment("center").run(),
          },
          {
            id: "align-right",
            label: "Align Paragraph Right",
            description: "Align selected/current paragraph right",
            category: "Format",
            action: () => editor?.chain().focus().setParagraphAlignment("right").run(),
          },
          {
            id: "align-justify",
            label: "Justify Paragraph",
            description: "Justify selected/current paragraph",
            category: "Format",
            action: () => editor?.chain().focus().setParagraphAlignment("justify").run(),
          },
        ]
      : []),
    {
      id: "clear-formatting",
      label: "Clear Formatting",
      category: "Format",
      action: () => editor?.chain().focus().clearNodes().unsetAllMarks().run(),
    },
    // View
    ...(onToggleFocus
      ? [
          {
            id: "focus-mode",
            label: isFocusMode ? "Leave Focus Mode" : "Focus Mode",
            description: "Dim everything but the line you're writing",
            shortcut: `${modKey}.`,
            category: "View",
            action: onToggleFocus,
          },
        ]
      : []),
    // Tools
    ...(onOpenSearch
      ? [
          {
            id: "search",
            label: "Search & Replace",
            description: "Find and replace across chapters",
            shortcut: `${modKey}${isMac ? '\u21E7' : 'Shift+'}H`,
            category: "Chapter",
            action: onOpenSearch,
          },
        ]
      : []),
    ...(onOpenEditorDesk
      ? [
          {
            id: "ai-assistant",
            label: "Editor’s Desk",
            description: "Private editorial checks and story notes",
            shortcut: `${modKey}${isMac ? '\u21E7' : 'Shift+'}K`,
            category: "Tools",
            action: onOpenEditorDesk,
          },
        ]
      : []),
    ...(onOpenJacket
      ? [
          {
            id: "jacket",
            label: "The Jacket",
            description: "Cover, synopsis, genres, dedication, front matter",
            category: "Go",
            action: onOpenJacket,
          },
        ]
      : []),
    ...(onOpenCodex
      ? [
          {
            id: "codex",
            label: "The Codex",
            description: "Characters, places, lore — the story bible",
            shortcut: `${modKey}${isMac ? '\u21E7' : 'Shift+'}L`,
            category: "Go",
            action: onOpenCodex,
          },
        ]
      : []),
    ...(onOpenComments
      ? [
          {
            id: "comments",
            label: "Comments",
            description: "Review notes and threads",
            category: "Chapter",
            action: onOpenComments,
          },
        ]
      : []),
    ...(onOpenHistory
      ? [
          {
            id: "history",
            label: "Version History",
            description: "Snapshots and recovery",
            category: "Chapter",
            action: onOpenHistory,
          },
        ]
      : []),
    ...(onOpenGoals
      ? [
          {
            id: "goals",
            label: "Writing Goals",
            description: "Daily target and streaks",
            category: "Tools",
            action: onOpenGoals,
          },
        ]
      : []),
    ...(onOpenBeats
      ? [
          {
            id: "beats",
            label: "Chapter Beats",
            description: "Scene notes for the current chapter",
            category: "Chapter",
            action: onOpenBeats,
          },
        ]
      : []),
    ...(onOpenCounter
      ? [
          {
            id: "counter",
            label: "The Counter",
            description: "Publishing, chapter gates, income",
            category: "Go",
            action: onOpenCounter,
          },
        ]
      : []),
    ...(onOpenWorkshop
      ? [
          {
            id: "workshop",
            label: "Workshop",
            description: "Team, suggestions, lore book, agreement",
            category: "Go",
            action: onOpenWorkshop,
          },
        ]
      : []),
    ...(onOpenOpenCalls
      ? [
          {
            id: "open-calls",
            label: "Open Calls",
            description: "Post roles and recruit collaborators",
            category: "Go",
            action: onOpenOpenCalls,
          },
        ]
      : []),
    ...(onOpenChapterSettings
      ? [
          {
            id: "chapter-settings",
            label: "Chapter Settings",
            description: "Author notes and chapter status",
            category: "Chapter",
            action: onOpenChapterSettings,
          },
        ]
      : []),
    ...(onOpenOutline
      ? [
          {
            id: "outline",
            label: "Outline — Flip the Sheets",
            description: "Every chapter's outline, on the backs of the sheets",
            category: "Go",
            action: onOpenOutline,
          },
        ]
      : []),
    ...(onOpenTypography
      ? [
          {
            id: "typography",
            label: "Typography",
            description: "Drop caps, scene break styles",
            category: "Tools",
            action: onOpenTypography,
          },
        ]
      : []),
    ...(onOpenShortcuts
      ? [
          {
            id: "keyboard-shortcuts",
            label: "Keyboard Shortcuts",
            description: "View all available shortcuts",
            category: "Tools",
            action: onOpenShortcuts,
          },
        ]
      : []),
    // Export
    ...(onExportPdf
      ? [
          {
            id: "export-pdf",
            label: "Export as PDF",
            description: "Print-ready PDF of your story",
            category: "Export",
            action: onExportPdf,
          },
        ]
      : []),
    ...(onExportEpub
      ? [
          {
            id: "export-epub",
            label: "Export as EPUB",
            description: "E-reader format",
            category: "Export",
            action: onExportEpub,
          },
        ]
      : []),
    ...(onExportDocx
      ? [
          {
            id: "export-docx",
            label: "Export as DOCX",
            description: "Word document format",
            category: "Export",
            action: onExportDocx,
          },
        ]
      : []),
  ], [editor, supportsIllustrations, supportsParagraphAlignment, onOpenDesk, onToggleFocus, isFocusMode, onOpenSearch, onOpenJacket, onOpenCodex, onOpenChapterSettings, onOpenOutline, onOpenTypography, onOpenCounter, onOpenWorkshop, onOpenOpenCalls, onOpenShortcuts, onOpenEditorDesk, onOpenComments, onOpenHistory, onOpenGoals, onOpenBeats, onExportPdf, onExportEpub, onExportDocx, modKey, isMac]);

  const filtered = useMemo(() =>
    query
      ? commands.filter(
          (c) =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.category.toLowerCase().includes(query.toLowerCase()) ||
            (c.description?.toLowerCase().includes(query.toLowerCase()))
        )
      : commands,
    [query, commands]
  );

  // ── The launcher (rest state) ──────────────────────────────
  // Going somewhere is the 90% case and there are only a handful of
  // places — those get tiles. A short list of frequent verbs sits
  // beneath. Everything else exists the moment you type.
  const isLauncher = !query;
  const places = useMemo(() => commands.filter((c) => c.category === "Go"), [commands]);
  const quick = useMemo(() => {
    const ids = ["focus-mode", "history", "comments", "goals", "search"];
    return ids
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => Boolean(c));
  }, [commands]);
  // One linear selection across tiles then quick rows.
  const navList = useMemo(
    () => (isLauncher ? [...places, ...quick] : filtered),
    [isLauncher, places, quick, filtered]
  );
  const TILE_COLS = 4;

  const moveSelection = useCallback(
    (key: string): boolean => {
      const max = navList.length - 1;
      if (max < 0) return false;
      const tiles = isLauncher ? places.length : 0;
      const step = (i: number, d: number) => Math.min(Math.max(i + d, 0), max);
      if (key === "ArrowDown") {
        setSelectedIndex((i) =>
          isLauncher && i < tiles
            ? i + TILE_COLS < tiles
              ? i + TILE_COLS
              : Math.min(tiles, max)
            : step(i, 1)
        );
        return true;
      }
      if (key === "ArrowUp") {
        setSelectedIndex((i) =>
          isLauncher && i >= tiles
            ? i === tiles
              ? Math.max(tiles - 1, 0)
              : i - 1
            : isLauncher
              ? Math.max(i - TILE_COLS, 0)
              : step(i, -1)
        );
        return true;
      }
      if (isLauncher && (key === "ArrowRight" || key === "ArrowLeft")) {
        setSelectedIndex((i) => step(i, key === "ArrowRight" ? 1 : -1));
        return true;
      }
      return false;
    },
    [navList.length, isLauncher, places.length]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (moveSelection(e.key)) {
        e.preventDefault();
      } else if (e.key === "Enter" && navList[selectedIndex]) {
        e.preventDefault();
        navList[selectedIndex].action();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [moveSelection, navList, selectedIndex, onClose]
  );

  useEffect(() => {
    if (open) {
      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) return;
        setQuery("");
        setSelectedIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
        setTimeout(() => inputRef.current?.focus(), 100);
      });

      return () => {
        cancelled = true;
      };
    }
  }, [open]);

  // Global keyboard handler when palette is open — catches arrow keys
  // even if the input hasn't received focus yet
  useEffect(() => {
    if (!open) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // The input has its own handler — running both double-steps the arrows.
      if (e.target === inputRef.current) return;
      if (moveSelection(e.key)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = navList[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, moveSelection, navList, selectedIndex, onClose]);

  // Focus trap: cycle Tab/Shift+Tab within the palette
  useEffect(() => {
    if (!open) return;
    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const palette = paletteRef.current;
      if (!palette) return;
      const focusable = palette.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleTrap);
    return () => window.removeEventListener("keydown", handleTrap);
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setSelectedIndex(0);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  // Group by category
  const grouped = useMemo(() =>
    filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    }, {}),
    [filtered]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            ref={paletteRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed top-[12%] sm:top-[20%] left-1/2 -translate-x-1/2 w-[calc(100vw-1rem)] sm:w-[480px] max-h-[min(70vh,420px)] bg-elevated border border-border-active rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden flex flex-col"
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-tertiary shrink-0">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-text-ghost"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-ghost border border-border font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div role="listbox" aria-label="Commands" className="overflow-y-auto py-2 px-2">
              {isLauncher ? (
                <>
                  {/* the rooms, as tiles */}
                  <div className="grid grid-cols-4 gap-2 px-1 pt-1" role="presentation">
                    {places.map((cmd) => {
                      const idx = navList.indexOf(cmd);
                      const active = idx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            cmd.action();
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
                            active
                              ? "border-amber/30 bg-amber/[0.08]"
                              : "border-border bg-paper/[0.02] hover:border-border-active hover:bg-paper/[0.04]"
                          }`}
                        >
                          <CommandGlyph id={cmd.id} active={active} />
                          <span
                            className={`text-[11px] leading-tight ${
                              active ? "text-paper" : "text-text-secondary"
                            }`}
                          >
                            {cmd.label.replace(" — Flip the Sheets", "")}
                          </span>
                          {cmd.shortcut ? (
                            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px] text-text-ghost">
                              {cmd.shortcut}
                            </kbd>
                          ) : (
                            <span className="h-[17px]" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* frequent verbs — no scrolling, everything else is one keystroke away */}
                  {quick.length > 0 && (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost px-2 py-1.5 mt-2">
                        Quick
                      </p>
                      {quick.map((cmd) => {
                        const idx = navList.indexOf(cmd);
                        const active = idx === selectedIndex;
                        return (
                          <button
                            key={cmd.id}
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              cmd.action();
                              onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                              active ? "bg-amber/10 text-paper" : "text-text-secondary hover:text-paper"
                            }`}
                          >
                            <CommandGlyph id={cmd.id} active={active} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{cmd.label}</span>
                            </div>
                            {cmd.shortcut && (
                              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-ghost border border-border font-mono shrink-0">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              ) : (
                <>
              {Object.entries(grouped).map(([category, cmds]) => (
                <div key={category}>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost px-2 py-1.5 mt-1 first:mt-0">
                    {category}
                  </p>
                  {cmds.map((cmd) => {
                    const globalIndex = filtered.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        role="option"
                        aria-selected={globalIndex === selectedIndex}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          globalIndex === selectedIndex
                            ? "bg-amber/10 text-paper"
                            : "text-text-secondary hover:text-paper"
                        }`}
                      >
                        <CommandGlyph id={cmd.id} active={globalIndex === selectedIndex} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{cmd.label}</span>
                          {cmd.description && (
                            <span className="block sm:inline text-xs text-text-ghost sm:ml-2">
                              {cmd.description}
                            </span>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-ghost border border-border font-mono shrink-0">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-text-ghost text-center py-8">
                  No commands found
                </p>
              )}
                </>
              )}
            </div>

            {/* Help hint */}
            <div className="hidden px-4 py-2 text-[10px] text-text-ghost border-t border-border/30 sm:flex items-center gap-2">
              <kbd className="px-1 py-0.5 rounded bg-surface/50 border border-border/50 text-[9px]">/</kbd>
              <span>in editor for quick insert</span>
              <span className="mx-1 text-border">&middot;</span>
              <kbd className="px-1 py-0.5 rounded bg-surface/50 border border-border/50 text-[9px]">{modKey}K</kbd>
              <span>anywhere for commands</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
