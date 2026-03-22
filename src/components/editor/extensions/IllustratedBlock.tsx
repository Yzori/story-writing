"use client";

import { Node, mergeAttributes } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Layout Types ────────────────────────────────────────────────────

type IllustratedLayout = "inline" | "full-bleed" | "side-by-side" | "header" | "chapter-header";

const LAYOUTS: { key: IllustratedLayout; label: string; icon: React.ReactNode }[] = [
  {
    key: "inline",
    label: "Inline",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="2" width="8" height="6" rx="1" />
        <line x1="1" y1="10" x2="13" y2="10" />
        <line x1="1" y1="12" x2="10" y2="12" />
      </svg>
    ),
  },
  {
    key: "full-bleed",
    label: "Full Bleed",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="0.5" y="3" width="13" height="8" rx="0.5" />
      </svg>
    ),
  },
  {
    key: "side-by-side",
    label: "Side",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="1" y="1" width="5" height="7" rx="1" />
        <line x1="8" y1="1" x2="13" y2="1" />
        <line x1="8" y1="3" x2="13" y2="3" />
        <line x1="8" y1="5" x2="13" y2="5" />
        <line x1="8" y1="7" x2="13" y2="7" />
        <line x1="1" y1="10" x2="13" y2="10" />
        <line x1="1" y1="12" x2="10" y2="12" />
      </svg>
    ),
  },
  {
    key: "header",
    label: "Header",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="0.5" y="0.5" width="13" height="7" rx="0.5" />
        <line x1="1" y1="10" x2="13" y2="10" />
        <line x1="1" y1="12" x2="10" y2="12" />
      </svg>
    ),
  },
];

// ─── Tiptap Node Extension ──────────────────────────────────────────

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    illustratedBlock: {
      setIllustrationBlock: (attrs?: {
        src?: string;
        alt?: string;
        caption?: string;
        layout?: string;
        prompt?: string;
        floatSide?: string;
      }) => ReturnType;
    };
  }
}

export const IllustratedBlock = Node.create({
  name: "illustratedBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      layout: { default: "inline" },
      prompt: { default: "" },
      floatSide: { default: "left" }, // for side-by-side: "left" | "right"
      uploading: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="illustrated"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "illustrated" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IllustratedBlockView);
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

// ─── React NodeView Component ───────────────────────────────────────

function IllustratedBlockView(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected, deleteNode } = props;
  const src = node.attrs.src as string | null;
  const caption = (node.attrs.caption as string) || "";
  const alt = (node.attrs.alt as string) || "";
  const layout = (node.attrs.layout as IllustratedLayout) || "inline";
  const prompt = (node.attrs.prompt as string) || "";
  const floatSide = (node.attrs.floatSide as string) || "left";
  const uploading = node.attrs.uploading as boolean;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showAltInput, setShowAltInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        updateAttributes({
          src: e.target?.result as string,
          uploading: false,
        });
      };
      reader.readAsDataURL(file);
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

  // Normalize layout: treat "chapter-header" and "header" the same
  const normalizedLayout = layout === "chapter-header" ? "header" : layout;

  // Layout-specific container classes
  const layoutContainerClass = (() => {
    switch (normalizedLayout) {
      case "full-bleed":
        return "w-[calc(100%+6rem)] -mx-12";
      case "side-by-side":
        return floatSide === "left"
          ? "float-left mr-6 mb-4 w-[55%] max-w-[380px]"
          : "float-right ml-6 mb-4 w-[55%] max-w-[380px]";
      case "header":
        return "w-full -mt-8 mb-8";
      case "inline":
      default:
        return "max-w-[540px] mx-auto";
    }
  })();

  // Image-specific classes
  const imageClass = (() => {
    switch (normalizedLayout) {
      case "full-bleed":
        return "w-full object-cover max-h-[70vh]";
      case "header":
        return "w-full object-cover max-h-[50vh] rounded-t-lg";
      case "side-by-side":
        return "w-full object-cover max-h-[400px] rounded-lg";
      case "inline":
      default:
        return "w-full object-cover max-h-[500px] rounded-lg";
    }
  })();

  return (
    <NodeViewWrapper
      className={`my-6 relative group ${
        selected ? "ring-2 ring-amber/30 rounded-lg" : ""
      } ${normalizedLayout === "side-by-side" ? "clear-none" : "clear-both"}`}
      data-drag-handle
      data-layout={normalizedLayout}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {src ? (
        /* ── Has Image ─────────────────────────────── */
        <figure className={layoutContainerClass}>
          <div className="relative overflow-hidden">
            <img
              src={src}
              alt={alt}
              className={imageClass}
            />

            {/* Upload spinner overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-void/60 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
              </div>
            )}

            {/* Layout Control Bar — shown on hover or selection */}
            <AnimatePresence>
              {(isHovered || selected) && !uploading && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5"
                >
                  {/* Layout pills */}
                  <div className="flex gap-0.5 bg-elevated/95 backdrop-blur-xl rounded-lg p-1 shadow-xl border border-border/50">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.key}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateAttributes({ layout: l.key });
                        }}
                        title={l.label}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] transition-all ${
                          normalizedLayout === l.key
                            ? "bg-amber/20 text-amber shadow-sm"
                            : "text-text-secondary hover:text-paper hover:bg-surface/50"
                        }`}
                      >
                        {l.icon}
                        <span className="hidden sm:inline">{l.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Side toggle for side-by-side */}
                  {normalizedLayout === "side-by-side" && (
                    <div className="flex gap-0.5 bg-elevated/95 backdrop-blur-xl rounded-lg p-1 shadow-xl border border-border/50">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateAttributes({ floatSide: "left" });
                        }}
                        className={`px-2 py-1.5 rounded-md text-[11px] transition-all ${
                          floatSide === "left"
                            ? "bg-amber/20 text-amber"
                            : "text-text-secondary hover:text-paper"
                        }`}
                      >
                        Left
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateAttributes({ floatSide: "right" });
                        }}
                        className={`px-2 py-1.5 rounded-md text-[11px] transition-all ${
                          floatSide === "right"
                            ? "bg-amber/20 text-amber"
                            : "text-text-secondary hover:text-paper"
                        }`}
                      >
                        Right
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-0.5 bg-elevated/95 backdrop-blur-xl rounded-lg p-1 shadow-xl border border-border/50">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowAltInput(!showAltInput);
                      }}
                      title="Alt text"
                      className={`px-2 py-1.5 rounded-md text-[11px] transition-all ${
                        showAltInput
                          ? "bg-teal/20 text-teal"
                          : "text-text-secondary hover:text-paper"
                      }`}
                    >
                      Alt
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        fileRef.current?.click();
                      }}
                      className="px-2 py-1.5 rounded-md text-[11px] text-text-secondary hover:text-paper transition-all"
                    >
                      Replace
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        deleteNode();
                      }}
                      className="px-2 py-1.5 rounded-md text-[11px] text-rose hover:bg-rose/10 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alt text input (expandable) */}
          <AnimatePresence>
            {showAltInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <input
                  value={alt}
                  onChange={(e) => updateAttributes({ alt: e.target.value })}
                  placeholder="Describe this image for accessibility..."
                  className="w-full mt-2 bg-surface/50 border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary outline-none placeholder:text-text-ghost focus:border-teal/30 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption */}
          <div className="mt-2 px-1">
            <input
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
              placeholder="Add a caption or artist credit..."
              className="w-full bg-transparent text-xs text-text-ghost text-center outline-none placeholder:text-text-ghost/50 italic focus:text-text-secondary transition-colors"
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
            ${
              isDragOver
                ? "border-amber/50 bg-amber/5"
                : uploading
                  ? "border-amber/30 bg-amber/5"
                  : "border-border hover:border-border-active"
            }
          `}
        >
          {uploading ? (
            /* Upload in progress */
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-8 h-8 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">
                Uploading image...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-text-ghost">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                  onChange={(e) =>
                    updateAttributes({ prompt: e.target.value })
                  }
                  placeholder="Describe the illustration you envision... (for your illustrator)"
                  rows={2}
                  className="w-full bg-surface/50 border border-border rounded-lg px-3 py-2 text-sm text-text-secondary outline-none placeholder:text-text-ghost resize-none focus:border-amber/30 transition-colors"
                />
              </div>

              {/* Pre-select layout */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-text-ghost mr-1.5">
                  Layout:
                </span>
                {LAYOUTS.map((l) => (
                  <button
                    key={l.key}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateAttributes({ layout: l.key });
                    }}
                    title={l.label}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all ${
                      normalizedLayout === l.key
                        ? "bg-amber/15 text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {l.icon}
                    <span>{l.label}</span>
                  </button>
                ))}
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
          )}
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

export default IllustratedBlock;
