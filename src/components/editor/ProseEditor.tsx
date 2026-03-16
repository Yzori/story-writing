"use client";

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";

// Custom scene break node view — renders a visible ornamental divider
// Click to pick a style from an inline popover
function SceneBreakView() {
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const styles = [
    { key: "asterism", label: "Asterism", preview: "\u2042" },
    { key: "fleuron", label: "Fleuron", preview: "\u2767" },
    { key: "dots", label: "Dots", preview: "\u2022 \u2022 \u2022" },
    { key: "line", label: "Line", preview: "\u2014\u2014\u2014" },
    { key: "space", label: "Space", preview: "(blank)" },
  ];

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const applyStyle = (key: string) => {
    // Walk up to find the scene-break wrapper with the CSS class and swap it
    const editorWrapper = ref.current?.closest("[class*='scene-break-']") ?? ref.current?.closest(".tiptap-editor")?.parentElement;
    if (editorWrapper) {
      // Remove old scene-break-* classes
      editorWrapper.classList.forEach((cls: string) => {
        if (cls.startsWith("scene-break-")) editorWrapper.classList.remove(cls);
      });
      editorWrapper.classList.add(`scene-break-${key}`);
      // Persist to localStorage via a custom event the page listens for
      window.dispatchEvent(new CustomEvent("scene-break-style-change", { detail: key }));
    }
    setShowPicker(false);
  };

  return (
    <NodeViewWrapper className="scene-break-node" contentEditable={false} ref={ref}>
      <div
        className="scene-break-ornament cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => setShowPicker(!showPicker)}
        title="Click to change style"
      />
      {showPicker && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-50 bg-elevated/95 backdrop-blur-xl border border-border-active rounded-xl shadow-2xl shadow-black/50 py-1.5 px-1 flex gap-1">
          {styles.map((s) => (
            <button
              key={s.key}
              onClick={() => applyStyle(s.key)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-surface transition-colors cursor-pointer min-w-[56px]"
              title={s.label}
            >
              <span className="text-base text-amber/80">{s.preview}</span>
              <span className="text-[8px] uppercase tracking-wider text-text-ghost">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}

const CustomHorizontalRule = HorizontalRule.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SceneBreakView);
  },
});

const typewriterPluginKey = new PluginKey("typewriterScroll");

function createTypewriterExtension(enabledRef: React.RefObject<boolean>) {
  return Extension.create({
    name: "typewriterScroll",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: typewriterPluginKey,
          view() {
            return {
              update(view) {
                if (!enabledRef.current) return;
                // Find the DOM position of the cursor
                const { from } = view.state.selection;
                const coords = view.coordsAtPos(from);
                const editorElement = view.dom.closest(".overflow-y-auto");
                if (!editorElement || !coords) return;
                const containerRect = editorElement.getBoundingClientRect();
                // Target: cursor at ~40% from top of the container
                const targetY = containerRect.top + containerRect.height * 0.4;
                const offset = coords.top - targetY;
                if (Math.abs(offset) > 5) {
                  editorElement.scrollBy({ top: offset, behavior: "smooth" });
                }
              },
            };
          },
        }),
      ];
    },
  });
}

interface ProseEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady: (editor: Editor) => void;
  onComment?: () => void;
  isFocusMode: boolean;
}

export default function ProseEditor({
  content,
  onUpdate,
  onEditorReady,
  onComment,
  isFocusMode,
}: ProseEditorProps) {
  const focusModeRef = useRef(isFocusMode);
  useEffect(() => {
    focusModeRef.current = isFocusMode;
  }, [isFocusMode]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false, // replaced by CustomHorizontalRule below
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      CustomHorizontalRule,
      Placeholder.configure({
        placeholder: "Begin your story... (type / for commands)",
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: false }),
      Underline,
      IllustrationBlock,
      CommentMark,
      createTypewriterExtension(focusModeRef),
    ],
    content,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      onUpdate(html, words);
    },
    immediatelyRender: false,
  });

  // Sync content when switching chapters
  const setContent = useCallback(
    (newContent: string) => {
      if (editor && !editor.isDestroyed) {
        // Only update if content is actually different to avoid cursor jumps
        const currentHtml = editor.getHTML();
        if (currentHtml !== newContent) {
          editor.commands.setContent(newContent || "");
        }
      }
    },
    [editor]
  );

  useEffect(() => {
    setContent(content);
  }, [content, setContent]);

  // Expose editor to parent
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${isFocusMode ? "focus-mode" : ""}`}>
      <div className="max-w-[680px] mx-auto px-8 pb-64 min-h-full">
        <FloatingToolbar editor={editor} onComment={onComment} />
        <SlashMenu editor={editor} />
        <EditorContent
          editor={editor}
          className="prose-editor-content"
        />
      </div>
    </div>
  );
}
