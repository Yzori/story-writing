"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type RefObject } from "react";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";

interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashMenuItem[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <span className="text-xs font-bold">H1</span>,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <span className="text-xs font-bold">H2</span>,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <span className="text-xs font-bold">H3</span>,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "A blockquote for dialogue or emphasis",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 5h3L4.5 11H3" />
        <path d="M9 5h3L10.5 11H9" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "align-left",
    label: "Align Left",
    description: "Align the current paragraph left",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="11" y2="8" />
        <line x1="2" y1="12" x2="13" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setParagraphAlignment("left").run(),
  },
  {
    id: "align-center",
    label: "Center Paragraph",
    description: "Center the current paragraph",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="4" y1="8" x2="12" y2="8" />
        <line x1="3" y1="12" x2="13" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setParagraphAlignment("center").run(),
  },
  {
    id: "align-right",
    label: "Align Right",
    description: "Align the current paragraph right",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="5" y1="8" x2="14" y2="8" />
        <line x1="3" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setParagraphAlignment("right").run(),
  },
  {
    id: "align-justify",
    label: "Justify Paragraph",
    description: "Justify the current paragraph",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setParagraphAlignment("justify").run(),
  },
  {
    id: "scene-break",
    label: "Scene Break",
    description: "A divider between scenes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeLinecap="round">
        <circle cx="4" cy="8" r="1.5" fill="currentColor" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    description: "An unordered list",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="3" cy="4" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
        <line x1="6" y1="4" x2="14" y2="4" />
        <line x1="6" y1="8" x2="14" y2="8" />
        <line x1="6" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Numbered List",
    description: "An ordered list",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <text x="1" y="5.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">1</text>
        <text x="1" y="9.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">2</text>
        <text x="1" y="13.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">3</text>
        <line x1="6" y1="4" x2="14" y2="4" />
        <line x1="6" y1="8" x2="14" y2="8" />
        <line x1="6" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "illustration",
    label: "Illustration",
    description: "Add or request an illustration",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <circle cx="5.5" cy="5.5" r="1" />
        <path d="M14 10l-3.5-3.5L3 14" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setIllustrationBlock({ layout: "inline" }).run(),
  },
  {
    id: "illustration-full",
    label: "Full-Bleed Illustration",
    description: "Edge-to-edge dramatic visual",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="14" height="10" rx="1" />
        <circle cx="4.5" cy="6.5" r="1" />
        <path d="M15 10l-4-4L3 14" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setIllustrationBlock({ layout: "full-bleed" }).run(),
  },
  {
    id: "illustration-header",
    label: "Chapter Header Art",
    description: "Visual at the top of a chapter",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="12" height="7" rx="2" />
        <line x1="3" y1="11" x2="13" y2="11" />
        <line x1="3" y1="14" x2="10" y2="14" />
      </svg>
    ),
    action: (editor) => editor.chain().focus().setIllustrationBlock({ layout: "chapter-header" }).run(),
  },
];

const INSERT_PRIORITY = [
  "illustration",
  "illustration-full",
  "illustration-header",
  "scene-break",
  "h1",
  "h2",
  "h3",
  "quote",
  "align-left",
  "align-center",
  "align-right",
  "align-justify",
  "bullet-list",
  "ordered-list",
];

const MENU_WIDTH = 320;
const MENU_MARGIN = 8;
const MENU_BOTTOM_CLEARANCE = 96;

function getMenuPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { x, y, maxHeight: 520 };
  }

  const clampedX = Math.max(
    MENU_MARGIN,
    Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
  );
  const availableHeight = window.innerHeight - y - MENU_BOTTOM_CLEARANCE;

  return {
    x: clampedX,
    y,
    maxHeight: Math.max(240, Math.min(520, availableHeight)),
  };
}

function getInsertCategory(id: string) {
  if (id.startsWith("illustration")) return "Visual";
  if (id === "scene-break" || id.startsWith("h") || id === "quote") return "Structure";
  if (id.startsWith("align")) return "Paragraph";
  return "Lists";
}

interface SlashMenuProps {
  editor: Editor;
  anchorRef?: RefObject<HTMLElement | null>;
  openSignal?: number;
}

export default function SlashMenu({ editor, anchorRef, openSignal = 0 }: SlashMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0, maxHeight: 520 });
  const [openedFromButton, setOpenedFromButton] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const matches = normalizedQuery
      ? SLASH_ITEMS.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery)
        )
      : SLASH_ITEMS;

    return [...matches].sort((a, b) => {
      const aPriority = INSERT_PRIORITY.indexOf(a.id);
      const bPriority = INSERT_PRIORITY.indexOf(b.id);
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    });
  }, [query]);

  const groupedItems = useMemo(
    () =>
      filtered.map((item, index) => {
        const category = getInsertCategory(item.id);
        const previous = index > 0 ? getInsertCategory(filtered[index - 1].id) : null;
        return {
          item,
          category,
          showCategory: category !== previous,
        };
      }),
    [filtered]
  );

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
    setOpenedFromButton(false);
  }, []);

  const executeItem = useCallback(
    (item: SlashMenuItem) => {
      if (openedFromButton) {
        editor.chain().focus().run();
      } else {
        // Delete the slash and any query text first.
        const { from } = editor.state.selection;
        const slashPos = from - query.length - 1;

        editor
          .chain()
          .focus()
          .deleteRange({ from: Math.max(0, slashPos), to: from })
          .run();
      }

      // Run the action after a microtask so the editor state settles
      requestAnimationFrame(() => {
        item.action(editor);
      });
      closeMenu();
    },
    [editor, query, openedFromButton, closeMenu]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeItem(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, filtered, selectedIndex, executeItem, closeMenu]);

  // Listen to editor transactions to detect "/" typed on empty line
  useEffect(() => {
    const handleUpdate = () => {
      if (openedFromButton) return;

      const { from, empty: selectionEmpty } = editor.state.selection;
      if (!selectionEmpty) {
        closeMenu();
        return;
      }

      // Get text of the current block
      const resolvedPos = editor.state.doc.resolve(from);
      const blockStart = resolvedPos.start();
      const textInBlock = editor.state.doc.textBetween(blockStart, from, "");

      // Check if it starts with / (slash command trigger)
      if (textInBlock.startsWith("/")) {
        const searchQuery = textInBlock.slice(1);
        setQuery(searchQuery);
        setSelectedIndex(0);
        setOpenedFromButton(false);

        // Position the menu below the cursor
        const coords = editor.view.coordsAtPos(from);
        setPosition(getMenuPosition(coords.left, coords.bottom + 8));

        if (!open) setOpen(true);
      } else if (open) {
        closeMenu();
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, open, openedFromButton, closeMenu]);

  useEffect(() => {
    if (openSignal === 0) return;

    const frame = requestAnimationFrame(() => {
      const anchor = anchorRef?.current;
      const rect = anchor?.getBoundingClientRect();
      const fallbackCoords = editor.view.coordsAtPos(editor.state.selection.from);

      setQuery("");
      setSelectedIndex(0);
      setOpenedFromButton(true);
      setPosition(getMenuPosition(
        rect ? rect.left : fallbackCoords.left,
        rect ? rect.bottom + 8 : fallbackCoords.bottom + 8
      ));
      setOpen(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [anchorRef, editor, openSignal]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, closeMenu]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="fixed z-50"
          style={{ left: position.x, top: position.y }}
        >
          <div
            role="listbox"
            aria-label="Insert block"
            aria-activedescendant={filtered[selectedIndex] ? `slash-menu-item-${selectedIndex}` : undefined}
            className="w-[320px] max-w-[calc(100vw-1rem)] overflow-y-auto py-1.5 rounded-xl bg-elevated/95 backdrop-blur-xl border border-border-active shadow-2xl shadow-black/50"
            style={{ maxHeight: position.maxHeight }}
          >
            <div className="px-3 py-2 border-b border-border/60">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                Add to chapter
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Images, dividers, headings, quotes, and paragraph layout.
              </p>
            </div>
            {filtered.length > 0 ? (
              groupedItems.map(({ item, category, showCategory }, index) => (
                <div key={item.id}>
                  {showCategory && (
                    <p className="px-3 pb-1 pt-2 text-[9px] uppercase tracking-[0.14em] text-text-ghost">
                      {category}
                    </p>
                  )}
                  <button
                    id={`slash-menu-item-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeItem(item);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-amber/10 text-paper"
                        : "text-text-secondary hover:text-paper"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      index === selectedIndex ? "bg-amber/15 text-amber" : "bg-surface text-text-tertiary"
                    }`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">{item.label}</p>
                      <p className="text-[11px] text-text-ghost truncate">{item.description}</p>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <p className="px-3 py-3 text-[12px] text-text-ghost">
                No matching inserts
              </p>
            )}
            <div className="border-t border-border/60 px-3 py-2 text-[10px] text-text-ghost">
              Type <span className="font-mono text-text-secondary">/</span> on an empty line to open this menu while writing.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
