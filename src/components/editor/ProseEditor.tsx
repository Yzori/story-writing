"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";

// Custom HorizontalRule with ProseMirror-native NodeView (not React — avoids flushSync crash)
const CustomHorizontalRule = HorizontalRule.extend({
  addNodeView() {
    return ({ HTMLAttributes }) => {
      const dom = document.createElement("div");
      dom.className = "scene-break-node";
      dom.contentEditable = "false";
      Object.entries(HTMLAttributes).forEach(([key, val]) => {
        if (typeof val === "string") dom.setAttribute(key, val);
      });

      const ornament = document.createElement("div");
      ornament.className = "scene-break-ornament";
      dom.appendChild(ornament);

      // Click ornament to open style picker
      ornament.addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = dom.querySelector(".scene-break-picker");
        if (existing) { existing.remove(); return; }

        const picker = document.createElement("div");
        picker.className = "scene-break-picker";

        [
          { key: "asterism", label: "Asterism", preview: "\u2042" },
          { key: "fleuron", label: "Fleuron", preview: "\u2767" },
          { key: "dots", label: "Dots", preview: "\u2022 \u2022 \u2022" },
          { key: "line", label: "Line", preview: "\u2014\u2014\u2014" },
          { key: "space", label: "Space", preview: "(blank)" },
        ].forEach((s) => {
          const btn = document.createElement("button");
          btn.className = "scene-break-picker-btn";
          btn.title = s.label;
          btn.innerHTML = `<span class="scene-break-picker-preview">${s.preview}</span><span class="scene-break-picker-label">${s.label}</span>`;
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const outer = dom.closest("[class*='scene-break-']") ?? dom.closest(".tiptap-editor")?.parentElement;
            if (outer) {
              outer.className = outer.className.replace(/scene-break-\w+/g, "").trim() + ` scene-break-${s.key}`;
              window.dispatchEvent(new CustomEvent("scene-break-style-change", { detail: s.key }));
            }
            picker.remove();
          });
          picker.appendChild(btn);
        });

        dom.appendChild(picker);
        const close = (ev: MouseEvent) => {
          if (!dom.contains(ev.target as Node)) { picker.remove(); document.removeEventListener("mousedown", close); }
        };
        setTimeout(() => document.addEventListener("mousedown", close), 0);
      });

      return { dom };
    };
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
