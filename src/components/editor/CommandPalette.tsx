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

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  onToggleZen: () => void;
  isZenMode: boolean;
  onOpenSearch?: () => void;
  onOpenMetadata?: () => void;
  onOpenBible?: () => void;
  onOpenFrontMatter?: () => void;
  onOpenChapterSettings?: () => void;
  onOpenOutline?: () => void;
  onOpenTypography?: () => void;
  onOpenMonetization?: () => void;
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
}

export default function CommandPalette({
  open,
  onClose,
  editor,
  onToggleZen,
  isZenMode,
  onOpenSearch,
  onOpenMetadata,
  onOpenBible,
  onOpenFrontMatter,
  onOpenChapterSettings,
  onOpenOutline,
  onOpenTypography,
  onOpenMonetization,
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
    {
      id: "zen-mode",
      label: isZenMode ? "Exit Zen Mode" : "Zen Mode",
      description: "Full immersion — just you and the page",
      shortcut: `${modKey}${isMac ? '\u21E7' : 'Shift+'}Z`,
      category: "View",
      action: onToggleZen,
    },
    // Tools
    ...(onOpenSearch
      ? [
          {
            id: "search",
            label: "Search & Replace",
            description: "Find and replace across chapters",
            shortcut: `${modKey}${isMac ? '\u21E7' : 'Shift+'}H`,
            category: "Tools",
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
    ...(onOpenMetadata
      ? [
          {
            id: "metadata",
            label: "Story Details",
            description: "Cover, synopsis, genres, rating",
            category: "Tools",
            action: onOpenMetadata,
          },
        ]
      : []),
    ...(onOpenBible
      ? [
          {
            id: "bible",
            label: "Characters & World",
            description: "Characters, places, and lore — your story bible",
            category: "Tools",
            action: onOpenBible,
          },
        ]
      : []),
    ...(onOpenComments
      ? [
          {
            id: "comments",
            label: "Comments",
            description: "Review notes and threads",
            category: "Tools",
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
            category: "Tools",
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
            category: "Tools",
            action: onOpenBeats,
          },
        ]
      : []),
    ...(onOpenMonetization
      ? [
          {
            id: "monetization",
            label: "Monetization",
            description: "Circle, chapter gating, commissions",
            category: "Tools",
            action: onOpenMonetization,
          },
        ]
      : []),
    ...(onOpenWorkshop
      ? [
          {
            id: "workshop",
            label: "Workshop",
            description: "Team, suggestions, lore book, agreement",
            category: "Tools",
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
            category: "Tools",
            action: onOpenOpenCalls,
          },
        ]
      : []),
    ...(onOpenFrontMatter
      ? [
          {
            id: "frontmatter",
            label: "Front Matter",
            description: "Epigraph, foreword, table of contents",
            category: "Tools",
            action: onOpenFrontMatter,
          },
        ]
      : []),
    ...(onOpenChapterSettings
      ? [
          {
            id: "chapter-settings",
            label: "Chapter Settings",
            description: "Status, outline, and author notes",
            category: "Tools",
            action: onOpenChapterSettings,
          },
        ]
      : []),
    ...(onOpenOutline
      ? [
          {
            id: "outline",
            label: "Book Map",
            description: "Plan the whole book by chapter",
            category: "View",
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
  ], [editor, supportsIllustrations, supportsParagraphAlignment, onToggleZen, isZenMode, onOpenSearch, onOpenMetadata, onOpenBible, onOpenFrontMatter, onOpenChapterSettings, onOpenOutline, onOpenTypography, onOpenMonetization, onOpenWorkshop, onOpenOpenCalls, onOpenShortcuts, onOpenEditorDesk, onOpenComments, onOpenHistory, onOpenGoals, onOpenBeats, onExportPdf, onExportEpub, onExportDocx, modKey, isMac]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, onClose]
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
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        inputRef.current?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        inputRef.current?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
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
  }, [open, filtered, selectedIndex, onClose]);

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
