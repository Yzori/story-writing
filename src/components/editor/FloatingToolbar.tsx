"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParagraphAlignmentKey } from "./extensions/ParagraphAlignment";

interface FloatingToolbarProps {
  editor: Editor;
  onComment?: () => void;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  ariaLabel,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  ariaLabel?: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={ariaLabel || title}
      className={`
        p-1.5 rounded-md transition-all duration-150 cursor-pointer
        ${active
          ? "bg-amber/20 text-amber"
          : "text-text-secondary hover:text-paper hover:bg-subtle/50"
        }
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

function getActiveParagraphAlignment(editor: Editor): ParagraphAlignmentKey {
  if (editor.isActive("paragraph", { textAlign: "center" })) return "center";
  if (editor.isActive("paragraph", { textAlign: "right" })) return "right";
  if (editor.isActive("paragraph", { textAlign: "justify" })) return "justify";
  return "left";
}

const ALIGNMENT_OPTIONS: Array<{
  key: ParagraphAlignmentKey;
  title: string;
  icon: React.ReactNode;
}> = [
  {
    key: "left",
    title: "Align paragraph left",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="11" y2="8" />
        <line x1="2" y1="12" x2="13" y2="12" />
      </svg>
    ),
  },
  {
    key: "center",
    title: "Center paragraph",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="4" y1="8" x2="12" y2="8" />
        <line x1="3" y1="12" x2="13" y2="12" />
      </svg>
    ),
  },
  {
    key: "right",
    title: "Align paragraph right",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="5" y1="8" x2="14" y2="8" />
        <line x1="3" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    key: "justify",
    title: "Justify paragraph",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
];

function FloatingToolbar({ editor, onComment }: FloatingToolbarProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, flipBelow: false });
  const activeParagraphAlignment = getActiveParagraphAlignment(editor);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { empty } = editor.state.selection;

    if (empty) {
      setShow(false);
      return;
    }

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setShow(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      setShow(false);
      return;
    }

    const viewportWidth = window.innerWidth;
    const margin = 8;
    // Estimated width — actual width clamped after layout via ref check below
    const estHalfWidth = (toolbarRef.current?.offsetWidth ?? 360) / 2;
    const estHeight = toolbarRef.current?.offsetHeight ?? 40;

    const idealX = rect.left + rect.width / 2;
    const x = Math.min(
      Math.max(idealX, margin + estHalfWidth),
      viewportWidth - margin - estHalfWidth,
    );

    // If there isn't room above the selection, flip below
    const flipBelow = rect.top - estHeight - margin < 0;
    const y = flipBelow ? rect.bottom + margin : rect.top - margin;

    setPosition({ x, y, flipBelow });
    setShow(true);
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updatePosition);

    const handleBlur = () => {
      hideTimeout.current = setTimeout(() => setShow(false), 200);
    };
    const handleFocus = () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };

    editor.on("blur", handleBlur);
    editor.on("focus", handleFocus);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("blur", handleBlur);
      editor.off("focus", handleFocus);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [editor, updatePosition]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className={`fixed z-50 -translate-x-1/2 ${position.flipBelow ? "" : "-translate-y-full"} pointer-events-auto`}
          style={{ left: position.x, top: position.y, maxWidth: "calc(100vw - 1rem)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div ref={toolbarRef} role="toolbar" aria-orientation="horizontal" aria-label="Text formatting" className="flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-elevated/95 backdrop-blur-xl border border-border-active shadow-2xl shadow-black/50 relative overflow-x-auto scrollbar-hide">
            {/* Bold */}
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
              ariaLabel="Bold (Ctrl+B)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 3h5.5a2.5 2.5 0 0 1 0 5H4V3z" />
                <path d="M4 8h6.5a2.5 2.5 0 0 1 0 5H4V8z" />
              </svg>
            </ToolbarButton>

            {/* Italic */}
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
              ariaLabel="Italic (Ctrl+I)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="10" y1="3" x2="6" y2="13" />
                <line x1="7" y1="3" x2="12" y2="3" />
                <line x1="4" y1="13" x2="9" y2="13" />
              </svg>
            </ToolbarButton>

            {/* Strikethrough */}
            <ToolbarButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              ariaLabel="Strikethrough"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 3.5C5 3.5 6 3 8 3c2.5 0 3.5 1.5 3.5 2.5 0 1-0.5 1.5-1 2" />
                <path d="M11 12.5c0 0-1 0.5-3 0.5-2.5 0-3.5-1.5-3.5-2.5 0-1 0.5-1.5 1-2" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </ToolbarButton>

            {/* Highlight */}
            <ToolbarButton
              active={editor.isActive("highlight")}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="Highlight"
              ariaLabel="Highlight"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2l5 5-6.5 6.5L2 8z" />
                <path d="M2 13.5h4" />
              </svg>
            </ToolbarButton>

            <Divider />

            {/* Heading 1 */}
            <ToolbarButton
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1 (Ctrl+Alt+1)"
              ariaLabel="Heading 1 (Ctrl+Alt+1)"
            >
              <span className="text-xs font-bold leading-none">H1</span>
            </ToolbarButton>

            {/* Heading 2 */}
            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2 (Ctrl+Alt+2)"
              ariaLabel="Heading 2 (Ctrl+Alt+2)"
            >
              <span className="text-xs font-bold leading-none">H2</span>
            </ToolbarButton>

            <Divider />

            {ALIGNMENT_OPTIONS.map((option) => (
              <ToolbarButton
                key={option.key}
                active={activeParagraphAlignment === option.key}
                onClick={() => editor.chain().focus().setParagraphAlignment(option.key).run()}
                title={option.title}
                ariaLabel={option.title}
              >
                {option.icon}
              </ToolbarButton>
            ))}

            <Divider />

            {/* Blockquote */}
            <ToolbarButton
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
              ariaLabel="Quote"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 5h3L4.5 11H3" />
                <path d="M9 5h3L10.5 11H9" />
              </svg>
            </ToolbarButton>

            {/* Scene Break */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Scene Break — insert a divider between scenes"
              ariaLabel="Scene Break — insert a divider between scenes"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
              </svg>
            </ToolbarButton>

            {onComment && (
              <>
                <Divider />
                {/* Comment */}
                <ToolbarButton
                  onClick={onComment}
                  title="Add Comment"
                  ariaLabel="Add Comment"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.5V11H3a1 1 0 0 1-1-1V4z" />
                    <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
                    <line x1="5.5" y1="8" x2="8.5" y2="8" />
                  </svg>
                </ToolbarButton>
              </>
            )}

            {/* Bubble tail */}
            {!position.flipBelow && (
              <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-elevated/95 border-b border-r border-border-active rotate-45" />
            )}
            {position.flipBelow && (
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-elevated/95 border-t border-l border-border-active rotate-45" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(FloatingToolbar);
