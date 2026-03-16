"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";

// Scene break as a normal block node (not void <hr>).
// Renders as <div class="scene-break">⁂</div> — a real element CSS can style.
const SceneBreak = Node.create({
  name: "horizontalRule", // keep the name so setHorizontalRule() still works
  group: "block",
  atom: true, // non-editable, treated as a single unit

  parseHTML() {
    return [
      { tag: "hr" },
      { tag: 'div.scene-break' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "scene-break", contenteditable: "false" }), "\u2042"];
  },

  addCommands() {
    return {
      setHorizontalRule: () => ({ chain, state }) => {
        return chain()
          .insertContent({ type: this.name })
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const { $to } = tr.selection;
              const posAfter = $to.end();
              if ($to.nodeAfter) {
                tr.setSelection(
                  state.schema.nodes.paragraph
                    ? TextSelection.create(tr.doc, $to.pos + 1)
                    : tr.selection
                );
              } else {
                const node = state.schema.nodes.paragraph?.create();
                if (node) {
                  tr.insert(posAfter, node);
                  tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
                }
              }
              tr.scrollIntoView();
            }
            return true;
          })
          .run();
      },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        type: this.type,
      }),
    ];
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
        horizontalRule: false,
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      SceneBreak,
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

  // Scene break click handler — shows style picker via delegated event
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(".scene-break");
      if (!target) return;

      // Remove any existing picker
      const existing = document.querySelector(".scene-break-picker");
      if (existing) { existing.remove(); return; }

      const picker = document.createElement("div");
      picker.className = "scene-break-picker";
      const styles = [
        { key: "asterism", label: "Asterism", ch: "\u2042" },
        { key: "fleuron", label: "Fleuron", ch: "\u2767" },
        { key: "dots", label: "Dots", ch: "\u2022 \u2022 \u2022" },
        { key: "line", label: "Line", ch: "\u2014\u2014\u2014" },
        { key: "space", label: "Space", ch: "(blank)" },
      ];
      styles.forEach((s) => {
        const btn = document.createElement("button");
        btn.className = "scene-break-picker-btn";
        btn.title = s.label;
        btn.innerHTML = `<span class="sbp-preview">${s.ch}</span><span class="sbp-label">${s.label}</span>`;
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          window.dispatchEvent(new CustomEvent("scene-break-style-change", { detail: s.key }));
          picker.remove();
        });
        picker.appendChild(btn);
      });

      // Position below the scene break
      const rect = target.getBoundingClientRect();
      const scrollParent = target.closest(".overflow-y-auto") ?? document.body;
      const scrollRect = scrollParent.getBoundingClientRect();
      picker.style.position = "fixed";
      picker.style.left = `${rect.left + rect.width / 2}px`;
      picker.style.top = `${rect.bottom + 8}px`;
      picker.style.transform = "translateX(-50%)";
      document.body.appendChild(picker);

      // Close on outside click
      const close = (ev: MouseEvent) => {
        if (!picker.contains(ev.target as HTMLElement)) {
          picker.remove();
          document.removeEventListener("mousedown", close);
        }
      };
      setTimeout(() => document.addEventListener("mousedown", close), 0);
    };

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor]);

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
