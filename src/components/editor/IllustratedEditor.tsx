"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { motion, AnimatePresence } from "framer-motion";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import { IllustratedBlock } from "./extensions/IllustratedBlock";

// ─── Scene Break (identical to ProseEditor) ─────────────────────────
const SceneBreak = Node.create({
  name: "horizontalRule",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: "hr" }, { tag: "div.scene-break" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "scene-break",
        contenteditable: "false",
      }),
      "\u2042",
    ];
  },

  addCommands() {
    return {
      setHorizontalRule:
        () =>
        ({ chain, state }) => {
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
                    tr.setSelection(
                      TextSelection.create(tr.doc, posAfter + 1)
                    );
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

// ─── Drag-and-Drop Image Plugin ──────────────────────────────────────
const dropImagePluginKey = new PluginKey("dropImage");

function createDropImageExtension(
  onImageUpload?: (file: File) => Promise<string>
) {
  return Extension.create({
    name: "dropImage",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: dropImagePluginKey,
          props: {
            handleDrop(view, event) {
              if (!event) return false;
              const files = event.dataTransfer?.files;
              if (!files || files.length === 0) return false;

              const file = files[0];
              if (!file.type.startsWith("image/")) return false;

              event.preventDefault();

              // Find drop position
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return false;

              // Insert a placeholder block immediately
              const placeholderAttrs = {
                src: null,
                alt: "",
                caption: "",
                layout: "inline",
                prompt: "",
                uploading: true,
              };

              const node = view.state.schema.nodes.illustratedBlock?.create(
                placeholderAttrs
              );
              if (!node) return false;

              const tr = view.state.tr.insert(pos.pos, node);
              view.dispatch(tr);

              // Process the file
              if (onImageUpload) {
                onImageUpload(file).then((dataUrl) => {
                  // Find the placeholder node and update it
                  view.state.doc.descendants((n, p) => {
                    if (
                      n.type.name === "illustratedBlock" &&
                      n.attrs.uploading === true &&
                      n.attrs.src === null
                    ) {
                      const tr = view.state.tr.setNodeMarkup(p, undefined, {
                        ...n.attrs,
                        src: dataUrl,
                        uploading: false,
                      });
                      view.dispatch(tr);
                      return false;
                    }
                    return true;
                  });
                });
              } else {
                // Fallback: read as data URL
                const reader = new FileReader();
                reader.onload = (e) => {
                  view.state.doc.descendants((n, p) => {
                    if (
                      n.type.name === "illustratedBlock" &&
                      n.attrs.uploading === true &&
                      n.attrs.src === null
                    ) {
                      const tr = view.state.tr.setNodeMarkup(p, undefined, {
                        ...n.attrs,
                        src: e.target?.result as string,
                        uploading: false,
                      });
                      view.dispatch(tr);
                      return false;
                    }
                    return true;
                  });
                };
                reader.readAsDataURL(file);
              }

              return true;
            },
            handlePaste(view, event) {
              const items = event.clipboardData?.items;
              if (!items) return false;

              for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                  event.preventDefault();
                  const file = item.getAsFile();
                  if (!file) return false;

                  const { from } = view.state.selection;
                  const node = view.state.schema.nodes.illustratedBlock?.create(
                    {
                      src: null,
                      uploading: true,
                    }
                  );
                  if (!node) return false;

                  const tr = view.state.tr.insert(from, node);
                  view.dispatch(tr);

                  if (onImageUpload) {
                    onImageUpload(file).then((dataUrl) => {
                      view.state.doc.descendants((n, p) => {
                        if (
                          n.type.name === "illustratedBlock" &&
                          n.attrs.uploading === true &&
                          n.attrs.src === null
                        ) {
                          const tr = view.state.tr.setNodeMarkup(
                            p,
                            undefined,
                            {
                              ...n.attrs,
                              src: dataUrl,
                              uploading: false,
                            }
                          );
                          view.dispatch(tr);
                          return false;
                        }
                        return true;
                      });
                    });
                  } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      view.state.doc.descendants((n, p) => {
                        if (
                          n.type.name === "illustratedBlock" &&
                          n.attrs.uploading === true &&
                          n.attrs.src === null
                        ) {
                          const tr = view.state.tr.setNodeMarkup(
                            p,
                            undefined,
                            {
                              ...n.attrs,
                              src: e.target?.result as string,
                              uploading: false,
                            }
                          );
                          view.dispatch(tr);
                          return false;
                        }
                        return true;
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                  return true;
                }
              }
              return false;
            },
          },
        }),
      ];
    },
  });
}

// ─── Image / Text Ratio Calculator ───────────────────────────────────
function useContentRatio(editor: Editor | null) {
  const [ratio, setRatio] = useState({ images: 0, text: 100 });

  useEffect(() => {
    if (!editor) return;

    const calculate = () => {
      let imageBlocks = 0;
      let textBlocks = 0;

      editor.state.doc.descendants((node) => {
        if (node.type.name === "illustratedBlock") {
          imageBlocks++;
        } else if (
          node.type.name === "paragraph" ||
          node.type.name === "heading" ||
          node.type.name === "blockquote" ||
          node.type.name === "bulletList" ||
          node.type.name === "orderedList"
        ) {
          textBlocks++;
        }
        return true;
      });

      const total = imageBlocks + textBlocks;
      if (total === 0) {
        setRatio({ images: 0, text: 100 });
        return;
      }

      // Weight images more heavily since they occupy more visual space
      const weightedImages = imageBlocks * 3;
      const weightedTotal = weightedImages + textBlocks;
      const imagePct = Math.round((weightedImages / weightedTotal) * 100);
      setRatio({ images: imagePct, text: 100 - imagePct });
    };

    calculate();
    editor.on("update", calculate);
    return () => {
      editor.off("update", calculate);
    };
  }, [editor]);

  return ratio;
}

// ─── Scene Break Styles ──────────────────────────────────────────────
const sceneBreakStyles = [
  { key: "asterism", label: "Asterism", ch: "\u2042" },
  { key: "fleuron", label: "Fleuron", ch: "\u2767" },
  { key: "dots", label: "Dots", ch: "\u2022 \u2022 \u2022" },
  { key: "line", label: "Line", ch: "\u2014\u2014\u2014" },
  { key: "space", label: "Space", ch: "(blank)" },
];

// ─── Main Component ─────────────────────────────────────────────────

interface IllustratedEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function IllustratedEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
  placeholder = "Begin your illustrated story... (type / for commands)",
  onImageUpload,
}: IllustratedEditorProps) {
  const [sceneBreakPicker, setSceneBreakPicker] = useState<{
    pos: DOMRect;
    currentStyle: string;
  } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      SceneBreak,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: false }),
      Underline,
      IllustratedBlock,
      createDropImageExtension(onImageUpload),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: "tiptap-editor illustrated-editor",
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

  const ratio = useContentRatio(editor);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && !editor.isDestroyed && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync content when prop changes
  const setContent = useCallback(
    (newContent: string) => {
      if (editor && !editor.isDestroyed) {
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

  // Scene break click handler
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(".scene-break");
      if (!target) return;

      if (sceneBreakPicker) {
        setSceneBreakPicker(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const currentText = target.textContent?.trim() ?? "\u2042";
      const matched = sceneBreakStyles.find((s) => s.ch === currentText);
      setSceneBreakPicker({
        pos: rect,
        currentStyle: matched?.key ?? "asterism",
      });
    };

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, sceneBreakPicker]);

  // Close picker on outside click or Escape
  useEffect(() => {
    if (!sceneBreakPicker) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as HTMLElement)
      ) {
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
        const buttons = pickerButtonsRef.current.filter(
          Boolean
        ) as HTMLButtonElement[];
        const focused = document.activeElement as HTMLElement;
        const idx = buttons.indexOf(focused as HTMLButtonElement);
        if (idx === -1) return;
        const next =
          e.key === "ArrowRight"
            ? buttons[(idx + 1) % buttons.length]
            : buttons[(idx - 1 + buttons.length) % buttons.length];
        next?.focus();
      }
    };

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

  // Global drag-over indicator for the editor area
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the editor container itself
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  // Add illustration via button
  const handleAddIllustration = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setIllustrationBlock({}).run();
  }, [editor]);

  // Handle file input for the floating add button
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      if (onImageUpload) {
        onImageUpload(file).then((dataUrl) => {
          editor
            .chain()
            .focus()
            .setIllustrationBlock({ src: dataUrl })
            .run();
        });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          editor
            .chain()
            .focus()
            .setIllustrationBlock({
              src: ev.target?.result as string,
            })
            .run();
        };
        reader.readAsDataURL(file);
      }

      // Reset input
      e.target.value = "";
    },
    [editor, onImageUpload]
  );

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-void/80 backdrop-blur-sm border-2 border-dashed border-amber/40 rounded-xl pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-amber/10 flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <p className="text-sm text-amber font-medium">
                Drop image to insert illustration
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[680px] mx-auto px-8 pb-64 min-h-full">
        <FloatingToolbar editor={editor} />
        <SlashMenu editor={editor} />
        <EditorContent editor={editor} className="illustrated-editor-content" />
      </div>

      {/* Floating Add Illustration Button */}
      {editable && (
        <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
          {/* Image/Text Ratio Indicator */}
          <div className="flex items-center gap-2 bg-elevated/90 backdrop-blur-xl border border-border rounded-xl px-3 py-2 shadow-lg">
            <div className="flex items-center gap-1.5">
              <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-surface">
                <div
                  className="h-full bg-amber/70 transition-all duration-300"
                  style={{ width: `${ratio.text}%` }}
                />
                <div
                  className="h-full bg-lavender/70 transition-all duration-300"
                  style={{ width: `${ratio.images}%` }}
                />
              </div>
              <span className="text-[10px] text-text-ghost whitespace-nowrap">
                {ratio.text}% text / {ratio.images}% images
              </span>
            </div>
          </div>

          {/* Add Illustration Button */}
          <button
            onClick={handleAddIllustration}
            className="group flex items-center gap-2 bg-elevated/90 backdrop-blur-xl border border-border hover:border-amber/40 rounded-xl px-4 py-2.5 shadow-lg transition-all hover:shadow-amber/5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
              <line x1="16" y1="5" x2="16" y2="11" />
              <line x1="13" y1="8" x2="19" y2="8" />
            </svg>
            <span className="text-xs text-text-secondary group-hover:text-paper transition-colors">
              Add Illustration
            </span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Scene Break Picker */}
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
                ref={(el) => {
                  pickerButtonsRef.current[i] = el;
                }}
                role="option"
                aria-selected={isSelected}
                aria-label={`${s.label} scene break style`}
                className={`scene-break-picker-btn${isSelected ? " active" : ""}`}
                title={s.label}
                tabIndex={i === 0 ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(
                    new CustomEvent("scene-break-style-change", {
                      detail: s.key,
                    })
                  );
                  setSceneBreakPicker(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent("scene-break-style-change", {
                        detail: s.key,
                      })
                    );
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
