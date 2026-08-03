"use client";

import { Node, mergeAttributes } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback } from "react";
import { compressImage } from "@/client/images";

// ─── Tiptap Node Extension ────────────────────────────────────────

const CHAPTER_IMAGE_MAX_DATA_URL_LENGTH = 420_000;

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    illustrationBlock: {
      setIllustrationBlock: (attrs?: {
        src?: string;
        alt?: string;
        caption?: string;
        layout?: string;
        prompt?: string;
      }) => ReturnType;
    };
  }
}

export const IllustrationBlock = Node.create({
  name: "illustrationBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-src") || el.getAttribute("src"),
        renderHTML: (attrs: Record<string, unknown>) => attrs.src ? { "data-src": attrs.src } : {},
      },
      alt: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-alt") || el.getAttribute("alt") || "",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-alt": attrs.alt }),
      },
      caption: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-caption": attrs.caption }),
      },
      layout: {
        default: "inline", // inline | full-bleed | chapter-header
        parseHTML: (el: HTMLElement) => el.getAttribute("data-layout") || "inline",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-layout": attrs.layout }),
      },
      prompt: {
        default: "", // description for illustrator
        parseHTML: (el: HTMLElement) => el.getAttribute("data-prompt") || "",
        renderHTML: (attrs: Record<string, unknown>) => attrs.prompt ? { "data-prompt": attrs.prompt } : {},
      },
    };
  },

  parseHTML() {
    // Also claim the illustrated editor's tag. The two editors are separate
    // nodes over the same picture, and only one is ever loaded at a time — so
    // reading both tags is what stops a chapter authored in the illustrated
    // studio from losing its images when opened here. floatSide has no meaning
    // in prose and drops on the way through; the picture survives.
    return [
      { tag: 'div[data-type="illustration"]' },
      { tag: 'div[data-type="illustrated"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "illustration" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IllustrationBlockView);
  },

  addCommands() {
    return {
      setIllustrationBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attrs || {},
          });
        },
    };
  },
});

// ─── React Component ──────────────────────────────────────────────

function IllustrationBlockView(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected, deleteNode } = props;
  const src = node.attrs.src as string | null;
  const caption = (node.attrs.caption as string) || "";
  const layout = (node.attrs.layout as string) || "inline";
  const prompt = (node.attrs.prompt as string) || "";
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const dataUrl = await compressImage(file, 900, 0.72, CHAPTER_IMAGE_MAX_DATA_URL_LENGTH);
        updateAttributes({ src: dataUrl });
      } catch (error) {
        console.error("Illustration compression failed:", error);
      }
    },
    [updateAttributes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const layoutStyles = {
    inline: "max-w-[540px] mx-auto rounded-lg",
    "full-bleed": "w-[calc(100%+6rem)] -mx-12 rounded-none",
    "chapter-header": "w-full rounded-t-lg -mt-16 mb-8",
  };

  return (
    <NodeViewWrapper
      className={`my-6 relative group ${selected ? "ring-2 ring-amber/30 rounded-lg" : ""}`}
      data-drag-handle
    >
      {src ? (
        /* ── Has Image ─────────────────────────────── */
        <figure className={layoutStyles[layout as keyof typeof layoutStyles] || layoutStyles.inline}>
          <div className="relative overflow-hidden">
            <img
              src={src}
              alt={(node.attrs.alt as string) || ""}
              className={`w-full object-cover ${
                layout === "full-bleed" ? "max-h-[70vh]" : "max-h-[500px] rounded-lg"
              }`}
            />

            {/* Hover overlay with controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {/* Layout toggle */}
              <div className="flex gap-1 bg-elevated/90 backdrop-blur rounded-lg p-1">
                {(["inline", "full-bleed", "chapter-header"] as const).map(
                  (l) => (
                    <button
                      key={l}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        updateAttributes({ layout: l });
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                        layout === l
                          ? "bg-amber/20 text-amber"
                          : "text-text-secondary hover:text-paper"
                      }`}
                    >
                      {l === "inline"
                        ? "Inline"
                        : l === "full-bleed"
                        ? "Full Bleed"
                        : "Header"}
                    </button>
                  )
                )}
              </div>

              {/* Replace / Delete */}
              <div className="flex gap-1 bg-elevated/90 backdrop-blur rounded-lg p-1">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    fileRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[11px] text-text-secondary hover:text-paper transition-colors"
                >
                  Replace
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    deleteNode();
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[11px] text-rose hover:text-rose transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="mt-2 px-1">
            <input
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
              placeholder="Add a caption..."
              className="w-full bg-transparent text-sm text-text-tertiary text-center outline-none placeholder:text-text-ghost italic"
            />
          </div>
        </figure>
      ) : (
        /* ── Empty / Placeholder ───────────────────── */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            relative border-2 border-dashed rounded-xl p-8 transition-all
            ${isDragOver
              ? "border-amber/50 bg-amber/5"
              : "border-border hover:border-border-active"
            }
          `}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-text-ghost">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>

            {/* Upload prompt */}
            <div>
              <p className="text-sm text-text-secondary">
                Drop an image here, or{" "}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    fileRef.current?.click();
                  }}
                  className="text-amber hover:text-amber-soft underline underline-offset-2 cursor-pointer"
                >
                  browse
                </button>
              </p>
              <p className="text-[11px] text-text-ghost mt-1">
                PNG, JPG, or WebP
              </p>
            </div>

            {/* Illustrator prompt */}
            <div className="w-full max-w-[400px] mt-2">
              <textarea
                value={prompt}
                onChange={(e) => updateAttributes({ prompt: e.target.value })}
                placeholder="Describe the illustration you envision... (for your illustrator)"
                rows={2}
                className="w-full bg-surface/50 border border-border rounded-lg px-3 py-2 text-sm text-text-secondary outline-none placeholder:text-text-ghost resize-none focus:border-amber/30 transition-colors"
              />
            </div>

            {/* Delete */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                deleteNode();
              }}
              className="text-[11px] text-text-ghost hover:text-rose transition-colors"
            >
              Remove block
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </NodeViewWrapper>
  );
}

export default IllustrationBlock;
