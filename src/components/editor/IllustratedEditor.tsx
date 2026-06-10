"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type UIEvent } from "react";
import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { motion, AnimatePresence } from "framer-motion";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import ChapterLandmarkMenu from "./ChapterLandmarkMenu";
import { IllustratedBlock } from "./extensions/IllustratedBlock";
import { SceneBreak, SceneBreakStyleKey, sceneBreakStyles } from "./extensions/SceneBreak";
import { ParagraphAlignment } from "./extensions/ParagraphAlignment";
import { compressImage } from "@/client/images";

const CHAPTER_IMAGE_MAX_DATA_URL_LENGTH = 420_000;

// ─── Drag-and-Drop Image Plugin ──────────────────────────────────────
const dropImagePluginKey = new PluginKey("dropImage");

// Patch the placeholder block that belongs to this specific upload.
// Matching by uploadId (instead of "first uploading block") keeps
// concurrent drops/pastes from resolving against each other's placeholder.
function patchUploadPlaceholder(
  view: EditorView,
  uploadId: string,
  patch: { src?: string; uploading: boolean; uploadId: null },
) {
  let found = false;
  view.state.doc.descendants((n, p) => {
    if (found) return false;
    if (n.type.name === "illustratedBlock" && n.attrs.uploadId === uploadId) {
      found = true;
      const tr = view.state.tr.setNodeMarkup(p, undefined, {
        ...n.attrs,
        ...patch,
      });
      view.dispatch(tr);
      return false;
    }
    return true;
  });
}

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
              const uploadId = crypto.randomUUID();
              const placeholderAttrs = {
                src: null,
                alt: "",
                caption: "",
                layout: "inline",
                prompt: "",
                uploading: true,
                uploadId,
              };

              const node = view.state.schema.nodes.illustratedBlock?.create(
                placeholderAttrs
              );
              if (!node) return false;

              const tr = view.state.tr.insert(pos.pos, node);
              view.dispatch(tr);

              const resolveImage = onImageUpload
                ? onImageUpload(file)
                : compressImage(file, 900, 0.72, CHAPTER_IMAGE_MAX_DATA_URL_LENGTH);

              resolveImage
                .then((dataUrl) => {
                  patchUploadPlaceholder(view, uploadId, {
                    src: dataUrl,
                    uploading: false,
                    uploadId: null,
                  });
                })
                .catch((error) => {
                  console.error("Dropped image compression failed:", error);
                  patchUploadPlaceholder(view, uploadId, {
                    uploading: false,
                    uploadId: null,
                  });
                });

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
                  const uploadId = crypto.randomUUID();
                  const node = view.state.schema.nodes.illustratedBlock?.create(
                    {
                      src: null,
                      uploading: true,
                      uploadId,
                    }
                  );
                  if (!node) return false;

                  const tr = view.state.tr.insert(from, node);
                  view.dispatch(tr);

                  const resolveImage = onImageUpload
                    ? onImageUpload(file)
                    : compressImage(file, 900, 0.72, CHAPTER_IMAGE_MAX_DATA_URL_LENGTH);

                  resolveImage
                    .then((dataUrl) => {
                      patchUploadPlaceholder(view, uploadId, {
                        src: dataUrl,
                        uploading: false,
                        uploadId: null,
                      });
                    })
                    .catch((error) => {
                      console.error("Pasted image compression failed:", error);
                      patchUploadPlaceholder(view, uploadId, {
                        uploading: false,
                        uploadId: null,
                      });
                    });
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

// ─── Main Component ─────────────────────────────────────────────────

interface IllustratedEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor) => void;
  editorClassName?: string;
  editable?: boolean;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function IllustratedEditor({
  content,
  onUpdate,
  onEditorReady,
  editorClassName = "",
  editable = true,
  placeholder = "Begin your illustrated story...",
  onImageUpload,
}: IllustratedEditorProps) {
  const rootClassName = `tiptap-editor illustrated-editor ${editorClassName}`.trim();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [sceneBreakPicker, setSceneBreakPicker] = useState<{
    pos: DOMRect;
    nodePos: number;
    currentStyle: SceneBreakStyleKey;
    label: string;
  } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [insertMenuRequest, setInsertMenuRequest] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertButtonRef = useRef<HTMLButtonElement>(null);
  const sceneBreakLabelInputRef = useRef<HTMLInputElement>(null);
  const sceneBreakPickerNodePos = sceneBreakPicker?.nodePos;
  const isTextLinePicker = sceneBreakPicker?.currentStyle === "text-line";

  const handleEditorScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const maxScroll = element.scrollHeight - element.clientHeight;
    setScrollProgress(maxScroll > 0 ? element.scrollTop / maxScroll : 0);
  }, []);

  const scrollToTrackPoint = useCallback((clientY: number) => {
    const container = scrollContainerRef.current;
    const track = scrollTrackRef.current;
    if (!container || !track) return;

    const rect = track.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = progress * maxScroll;
    setScrollProgress(progress);
  }, []);

  const handleMagicScrollPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingScroll(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollToTrackPoint(event.clientY);
  }, [scrollToTrackPoint]);

  const handleMagicScrollPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    scrollToTrackPoint(event.clientY);
  }, [scrollToTrackPoint]);

  const handleMagicScrollPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDraggingScroll(false);
  }, []);

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
        class: rootClassName,
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

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: rootClassName,
        },
      },
    });
  }, [editor, rootClassName]);

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
      if (!editor || editor.isDestroyed) return;

      queueMicrotask(() => {
        if (editor.isDestroyed) return;
        const currentHtml = editor.getHTML();
        if (currentHtml !== newContent) {
          // emitUpdate: false — this is an external sync, not a user edit;
          // Tiptap v3 defaults to true, which would trigger a phantom autosave.
          editor.commands.setContent(newContent || "", { emitUpdate: false });
        }
      });
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

      e.preventDefault();
      e.stopPropagation();

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
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as HTMLElement)
      ) {
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
        compressImage(file, 900, 0.72, CHAPTER_IMAGE_MAX_DATA_URL_LENGTH)
          .then((dataUrl) => {
            editor
              .chain()
              .focus()
              .setIllustrationBlock({ src: dataUrl })
              .run();
          })
          .catch((error) => {
            console.error("Illustration compression failed:", error);
          });
      }

      // Reset input
      e.target.value = "";
    },
    [editor, onImageUpload]
  );

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
    <div
      ref={scrollContainerRef}
      className={`flex-1 min-h-0 overflow-y-auto editor-scrollbar editor-scroll-stage relative ${
        isDraggingScroll ? "editor-scroll-stage-dragging" : "scroll-smooth"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onScroll={handleEditorScroll}
      style={{ "--editor-scroll-progress": scrollProgress } as CSSProperties}
    >
      <div className="editor-scroll-glass editor-scroll-glass-top" aria-hidden="true" />
      <div className="editor-scroll-glass editor-scroll-glass-bottom" aria-hidden="true" />
      <div className="editor-scroll-magic" aria-hidden="true">
        <div
          ref={scrollTrackRef}
          className="editor-scroll-magic-track"
          onPointerDown={handleMagicScrollPointerDown}
          onPointerMove={handleMagicScrollPointerMove}
          onPointerUp={handleMagicScrollPointerEnd}
          onPointerCancel={handleMagicScrollPointerEnd}
        >
          <div className="editor-scroll-magic-fill" />
          <div className="editor-scroll-magic-spark" />
        </div>
      </div>
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

      <div className="max-w-[680px] mx-auto px-4 sm:px-8 pb-64 min-h-full">
        <FloatingToolbar editor={editor} />
        {editable && (
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
              title="Add blocks: illustration, scene break, heading, quote. Shortcut: /"
              aria-label="Insert block"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              Insert block
            </button>
            <ChapterLandmarkMenu editor={editor} />
          </div>
        )}
        <SlashMenu editor={editor} anchorRef={insertButtonRef} openSignal={insertMenuRequest} />
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
