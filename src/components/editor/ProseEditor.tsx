"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Focus from "@tiptap/extension-focus";
import { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import MentionDropdown from "./MentionDropdown";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";
import { CharacterMention, MentionCharacter } from "./extensions/CharacterMention";
import { SceneBreak, SceneBreakStyleKey, sceneBreakStyles } from "./extensions/SceneBreak";
import { ParagraphAlignment } from "./extensions/ParagraphAlignment";

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

  const [sceneBreakPicker, setSceneBreakPicker] = useState<{
    pos: DOMRect;
    nodePos: number;
    currentStyle: SceneBreakStyleKey;
    label: string;
  } | null>(null);
  const [mentionPreview, setMentionPreview] = useState<{
    character: CharacterDetail | null;
    rect: DOMRect;
  } | null>(null);
  const [insertMenuRequest, setInsertMenuRequest] = useState(0);
  const insertButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneBreakLabelInputRef = useRef<HTMLInputElement>(null);
  const sceneBreakPickerNodePos = sceneBreakPicker?.nodePos;
  const isTextLinePicker = sceneBreakPicker?.currentStyle === "text-line";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      ParagraphAlignment,
      SceneBreak,
      Placeholder.configure({
        placeholder: "Begin your story...",
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: false }),
      Underline,
      Focus.configure({ className: "has-focus", mode: "deepest" }),
      IllustrationBlock,
      CommentMark,
      CharacterMention.configure({ characters }),
      // Typewriter scrolling reads this ref inside the ProseMirror plugin, not during React render.
      // eslint-disable-next-line react-hooks/refs
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
      if (!editor || editor.isDestroyed) return;

      queueMicrotask(() => {
        if (editor.isDestroyed) return;
        const currentHtml = editor.getHTML();
        if (currentHtml !== newContent) {
          editor.commands.setContent(newContent || "");
        }
      });
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

      e.preventDefault();
      e.stopPropagation();

      // Toggle picker off if already open
      if (sceneBreakPicker) {
        setSceneBreakPicker(null);
        return;
      }

      const nodePos = editor.view.posAtDOM(target, 0);
      const node = editor.state.doc.nodeAt(nodePos);
      if (!node || node.type.name !== "horizontalRule") return;

      editor.view.dispatch(
        editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, nodePos))
      );

      const rect = target.getBoundingClientRect();
      setSceneBreakPicker({
        pos: rect,
        nodePos,
        currentStyle: node.attrs.style ?? "asterism",
        label: typeof node.attrs.label === "string" ? node.attrs.label : "",
      });
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
      if ((e.target as HTMLElement | null)?.closest("input, textarea")) return;
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

  // Focus first picker button only when a picker opens for a new divider.
  useEffect(() => {
    if (sceneBreakPickerNodePos != null) {
      requestAnimationFrame(() => {
        pickerButtonsRef.current[0]?.focus();
      });
    }
  }, [sceneBreakPickerNodePos]);

  useEffect(() => {
    if (isTextLinePicker) {
      requestAnimationFrame(() => {
        sceneBreakLabelInputRef.current?.focus();
        sceneBreakLabelInputRef.current?.select();
      });
    }
  }, [sceneBreakPickerNodePos, isTextLinePicker]);

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

  const updateSceneBreakStyle = useCallback((style: SceneBreakStyleKey) => {
    if (!editor || !sceneBreakPicker) return;
    const node = editor.state.doc.nodeAt(sceneBreakPicker.nodePos);
    if (!node || node.type.name !== "horizontalRule") return;

    const nextAttrs: Record<string, unknown> = { ...node.attrs, style };
    if (style === "text-line") {
      nextAttrs.label = typeof node.attrs.label === "string" ? node.attrs.label : "";
    }

    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        if (!dispatch) return true;
        tr.setNodeMarkup(sceneBreakPicker.nodePos, undefined, nextAttrs);
        tr.setSelection(NodeSelection.create(tr.doc, sceneBreakPicker.nodePos));
        tr.scrollIntoView();
        dispatch(tr);
        return true;
      })
      .run();
    if (style === "text-line") {
      setSceneBreakPicker((current) =>
        current ? { ...current, currentStyle: "text-line", label: String(nextAttrs.label ?? "") } : current
      );
    } else {
      setSceneBreakPicker(null);
    }
  }, [editor, sceneBreakPicker]);

  const updateSceneBreakLabel = useCallback((label: string) => {
    if (!editor || !sceneBreakPicker) return;
    const node = editor.state.doc.nodeAt(sceneBreakPicker.nodePos);
    if (!node || node.type.name !== "horizontalRule") return;
    const nextLabel = label.trim();

    setSceneBreakPicker((current) =>
      current ? { ...current, currentStyle: "text-line", label } : current
    );

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(sceneBreakPicker.nodePos, undefined, {
        ...node.attrs,
        style: "text-line",
        label: nextLabel,
      })
    );
  }, [editor, sceneBreakPicker]);

  const deleteSceneBreak = useCallback(() => {
    if (!editor || !sceneBreakPicker) return;
    const node = editor.state.doc.nodeAt(sceneBreakPicker.nodePos);
    if (!node || node.type.name !== "horizontalRule") return;

    editor
      .chain()
      .focus()
      .deleteRange({
        from: sceneBreakPicker.nodePos,
        to: sceneBreakPicker.nodePos + node.nodeSize,
      })
      .run();
    setSceneBreakPicker(null);
  }, [editor, sceneBreakPicker]);

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
        <div className="sticky top-4 z-20 mb-4 flex items-center gap-2 pointer-events-none">
          <button
            ref={insertButtonRef}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().run();
              setInsertMenuRequest((value) => value + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-elevated/80 px-2.5 py-1 text-[11px] text-text-ghost shadow-lg shadow-black/10 backdrop-blur-md transition-all hover:border-amber/30 hover:bg-amber/[0.06] hover:text-paper pointer-events-auto"
            title="Insert heading, scene break, quote, or illustration"
            aria-label="Insert block"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Insert
          </button>
        </div>
        <SlashMenu editor={editor} anchorRef={insertButtonRef} openSignal={insertMenuRequest} />
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
                  updateSceneBreakStyle(s.key);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    updateSceneBreakStyle(s.key);
                  }
                }}
              >
                <span className="sbp-preview">{s.ch}</span>
                <span className="sbp-label">{s.label}</span>
              </button>
            );
          })}
          {sceneBreakPicker.currentStyle === "text-line" && (
            <label className="scene-break-picker-label">
              <span>Text</span>
              <input
                ref={sceneBreakLabelInputRef}
                type="text"
                value={sceneBreakPicker.label}
                placeholder="Type label"
                onChange={(e) => updateSceneBreakLabel(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </label>
          )}
          <button
            type="button"
            className="scene-break-picker-delete"
            onClick={(e) => {
              e.stopPropagation();
              deleteSceneBreak();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
