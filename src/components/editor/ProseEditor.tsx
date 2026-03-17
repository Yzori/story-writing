"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import MentionDropdown from "./MentionDropdown";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";
import { CharacterMention, MentionCharacter } from "./extensions/CharacterMention";

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

const sceneBreakStyles = [
  { key: "asterism", label: "Asterism", ch: "\u2042" },
  { key: "fleuron", label: "Fleuron", ch: "\u2767" },
  { key: "dots", label: "Dots", ch: "\u2022 \u2022 \u2022" },
  { key: "line", label: "Line", ch: "\u2014\u2014\u2014" },
  { key: "space", label: "Space", ch: "(blank)" },
];

interface CharacterDetail {
  id: string;
  name: string;
  color: string;
  description: string;
  aliases: string[];
}

interface ProseEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady: (editor: Editor) => void;
  onComment?: () => void;
  onMentionClick?: (characterId: string) => void;
  characters?: MentionCharacter[];
  characterDetails?: CharacterDetail[];
}

export default function ProseEditor({
  content,
  onUpdate,
  onEditorReady,
  onComment,
  onMentionClick,
  characters = [],
  characterDetails = [],
}: ProseEditorProps) {
  const focusModeRef = useRef(false);

  const [sceneBreakPicker, setSceneBreakPicker] = useState<{ pos: DOMRect; currentStyle: string } | null>(null);
  const [mentionPreview, setMentionPreview] = useState<{
    character: CharacterDetail | null;
    rect: DOMRect;
  } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

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
      CharacterMention.configure({ characters }),
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

  // Scene break click handler — opens React-rendered style picker
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(".scene-break");
      if (!target) return;

      // Toggle picker off if already open
      if (sceneBreakPicker) {
        setSceneBreakPicker(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const currentText = target.textContent?.trim() ?? "\u2042";
      const matched = sceneBreakStyles.find((s) => s.ch === currentText);
      setSceneBreakPicker({ pos: rect, currentStyle: matched?.key ?? "asterism" });
    };

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, sceneBreakPicker]);

  // Close picker on outside click or Escape
  useEffect(() => {
    if (!sceneBreakPicker) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as HTMLElement)) {
        setSceneBreakPicker(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSceneBreakPicker(null);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const buttons = pickerButtonsRef.current.filter(Boolean) as HTMLButtonElement[];
        const focused = document.activeElement as HTMLElement;
        const idx = buttons.indexOf(focused as HTMLButtonElement);
        if (idx === -1) return;
        const next = e.key === "ArrowRight"
          ? buttons[(idx + 1) % buttons.length]
          : buttons[(idx - 1 + buttons.length) % buttons.length];
        next?.focus();
      }
    };

    // Defer so the click that opened the picker doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sceneBreakPicker]);

  // Focus first picker button when it opens
  useEffect(() => {
    if (sceneBreakPicker) {
      requestAnimationFrame(() => {
        pickerButtonsRef.current[0]?.focus();
      });
    }
  }, [sceneBreakPicker]);

  // Handle clicks on @mention spans
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const mention = (e.target as HTMLElement).closest("[data-mention]");
    if (mention && onMentionClick) {
      e.preventDefault();
      e.stopPropagation();
      onMentionClick(mention.getAttribute("data-mention")!);
    }
  }, [onMentionClick]);

  // Mention hover preview via event delegation
  const handleMentionMouseOver = useCallback((e: React.MouseEvent) => {
    const mention = (e.target as HTMLElement).closest("[data-mention]") as HTMLElement | null;
    if (!mention) return;
    const characterId = mention.getAttribute("data-mention");
    if (!characterId) return;
    const character = characterDetails.find((c) => c.id === characterId) ?? null;
    const rect = mention.getBoundingClientRect();
    setMentionPreview({ character, rect });
  }, [characterDetails]);

  const handleMentionMouseOut = useCallback((e: React.MouseEvent) => {
    const mention = (e.target as HTMLElement).closest("[data-mention]");
    if (mention) {
      setMentionPreview(null);
    }
  }, []);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-8 pb-64 min-h-full" onClick={handleEditorClick} onMouseOver={handleMentionMouseOver} onMouseOut={handleMentionMouseOut}>
        <FloatingToolbar editor={editor} onComment={onComment} />
        <SlashMenu editor={editor} />
        <MentionDropdown editor={editor} characters={characters} />
        <EditorContent
          editor={editor}
          className="prose-editor-content"
        />
      </div>

      {mentionPreview && mentionPreview.character && (
        <div
          className="fixed z-50 w-64 rounded-xl bg-elevated/95 backdrop-blur-xl border border-border-active shadow-2xl p-3 pointer-events-none"
          style={{
            left: `${mentionPreview.rect.left + mentionPreview.rect.width / 2}px`,
            top: `${mentionPreview.rect.top - 8}px`,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: `${mentionPreview.character.color}20`, color: mentionPreview.character.color }}
            >
              {mentionPreview.character.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-paper">{mentionPreview.character.name}</div>
              {mentionPreview.character.aliases && mentionPreview.character.aliases.length > 0 && (
                <div className="text-[10px] text-text-ghost">aka {mentionPreview.character.aliases.join(", ")}</div>
              )}
            </div>
          </div>
          {mentionPreview.character.description && (
            <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
              {mentionPreview.character.description}
            </p>
          )}
          <div className="mt-2 text-[9px] text-text-ghost">Click to open in Story Bible</div>
        </div>
      )}

      {sceneBreakPicker && (
        <div
          ref={pickerRef}
          role="listbox"
          aria-label="Scene break style"
          className="scene-break-picker"
          style={{
            position: "fixed",
            left: `${sceneBreakPicker.pos.left + sceneBreakPicker.pos.width / 2}px`,
            top: `${sceneBreakPicker.pos.bottom + 8}px`,
            transform: "translateX(-50%)",
          }}
        >
          {sceneBreakStyles.map((s, i) => {
            const isSelected = s.key === sceneBreakPicker.currentStyle;
            return (
              <button
                key={s.key}
                ref={(el) => { pickerButtonsRef.current[i] = el; }}
                role="option"
                aria-selected={isSelected}
                aria-label={`${s.label} scene break style`}
                className={`scene-break-picker-btn${isSelected ? " active" : ""}`}
                title={s.label}
                tabIndex={i === 0 ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent("scene-break-style-change", { detail: s.key }));
                  setSceneBreakPicker(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent("scene-break-style-change", { detail: s.key }));
                    setSceneBreakPicker(null);
                  }
                }}
              >
                <span className="sbp-preview">{s.ch}</span>
                <span className="sbp-label">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
