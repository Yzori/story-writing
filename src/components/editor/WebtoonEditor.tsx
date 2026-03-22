"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { compressImage } from "@/client/images";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Panel {
  id: string;
  imageDataUrl: string;
  caption: string;
  order: number;
}

interface WebtoonEditorProps {
  content: string; // JSON stringified array of panels
  onUpdate: (content: string, wordCount: number) => void;
  editable?: boolean;
  placeholder?: string;
  scriptContent?: string;
  onScriptUpdate?: (content: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parsePanels(content: string): Panel[] {
  if (!content || content.trim() === "" || content === "[]") return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function countWords(panels: Panel[]): number {
  const allText = panels.map((p) => p.caption).join(" ");
  const trimmed = allText.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// Larger max dim for webtoon panels — they need decent resolution
const PANEL_MAX_DIM = 1200;
const PANEL_QUALITY = 0.8;

// ---------------------------------------------------------------------------
// Panel Card
// ---------------------------------------------------------------------------

function PanelCard({
  panel,
  index,
  editable,
  onCaptionChange,
  onDelete,
}: {
  panel: Panel;
  index: number;
  editable: boolean;
  onCaptionChange: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-surface border border-border rounded-xl overflow-hidden group"
    >
      {/* Image area */}
      <div className="relative">
        {/* Panel number badge */}
        <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-amber text-void text-xs font-bold flex items-center justify-center shadow-lg">
          {index + 1}
        </div>

        {/* Delete button */}
        {editable && (
          <button
            onClick={() => onDelete(panel.id)}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-void/70 backdrop-blur-sm text-text-ghost hover:text-rose hover:bg-void/90 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Remove panel"
            aria-label="Remove panel"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
        )}

        {/* The panel image */}
        <img
          src={panel.imageDataUrl}
          alt={`Panel ${index + 1}`}
          className="w-full block"
          draggable={false}
        />
      </div>

      {/* Caption area */}
      <div className="bg-elevated px-4 py-3">
        {editable ? (
          <textarea
            value={panel.caption}
            onChange={(e) => onCaptionChange(panel.id, e.target.value)}
            placeholder="Caption or dialogue..."
            rows={2}
            className="w-full bg-transparent text-paper text-sm leading-relaxed outline-none resize-none placeholder:text-text-ghost"
          />
        ) : (
          <p className="text-paper text-sm leading-relaxed whitespace-pre-wrap">
            {panel.caption || (
              <span className="text-text-ghost italic">No caption</span>
            )}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Upload Zone
// ---------------------------------------------------------------------------

function UploadZone({
  onFilesSelected,
  isLoading,
}: {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
        // Reset so re-selecting the same file triggers onChange
        e.target.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
        ${
          isDragOver
            ? "border-amber bg-amber/[0.06] scale-[1.01]"
            : "border-border hover:border-text-ghost bg-surface/50 hover:bg-surface/70"
        }
        px-8 py-12 flex flex-col items-center justify-center gap-3
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Processing panels...</p>
        </div>
      ) : (
        <>
          {/* Upload icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              isDragOver
                ? "bg-amber/15 text-amber"
                : "bg-surface text-text-ghost"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="22" height="22" rx="3" />
              <circle cx="10" cy="10" r="2" />
              <path d="M3 20l6-6 4 4 3-3 9 9" />
              <path d="M19 3v6h6" />
              <path d="M22 6l-3-3" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-secondary font-medium">
              Drop panels here or click to upload
            </p>
            <p className="text-xs text-text-ghost mt-1">
              PNG, JPG, or WebP. Multiple files supported.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Script View (Tiptap for script text)
// ---------------------------------------------------------------------------

function ScriptPane({
  content,
  onUpdate,
}: {
  content: string;
  onUpdate?: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Write your episode script here...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: content || "",
    editable: !!onUpdate,
    editorProps: {
      attributes: {
        class: "tiptap-editor script-editor",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (onUpdate) {
        onUpdate(ed.getHTML());
      }
    },
    immediatelyRender: false,
  });

  // Sync content changes from parent
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const current = editor.getHTML();
      if (current !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[560px] mx-auto">
        <EditorContent editor={editor} className="prose-editor-content" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WebtoonEditor({
  content,
  onUpdate,
  editable = true,
  placeholder,
  scriptContent,
  onScriptUpdate,
}: WebtoonEditorProps) {
  const [panels, setPanels] = useState<Panel[]>(() => parsePanels(content));
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "script">("visual");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Track whether we initialized from content
  const initializedRef = useRef(false);

  // Sync panels from parent content on content change (e.g. switching episodes)
  useEffect(() => {
    const incoming = parsePanels(content);
    // Only re-sync if the serialized form differs
    const currentSerialized = JSON.stringify(panels);
    const incomingSerialized = JSON.stringify(incoming);
    if (currentSerialized !== incomingSerialized) {
      setPanels(incoming);
    }
    // We intentionally only depend on content, not panels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Emit updates to parent
  const emitUpdate = useCallback(
    (updated: Panel[]) => {
      const serialized = JSON.stringify(updated);
      const words = countWords(updated);
      onUpdate(serialized, words);
    },
    [onUpdate]
  );

  // ---- Panel operations ----

  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      setPanels((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, caption } : p));
        emitUpdate(next);
        return next;
      });
    },
    [emitUpdate]
  );

  const handleDeletePanel = useCallback(
    (id: string) => {
      setPanels((prev) => {
        const next = prev
          .filter((p) => p.id !== id)
          .map((p, i) => ({ ...p, order: i }));
        emitUpdate(next);
        return next;
      });
    },
    [emitUpdate]
  );

  const handleReorder = useCallback(
    (reordered: Panel[]) => {
      const updated = reordered.map((p, i) => ({ ...p, order: i }));
      setPanels(updated);
      emitUpdate(updated);
    },
    [emitUpdate]
  );

  const handleFilesSelected = useCallback(
    async (files: FileList) => {
      setIsUploading(true);
      setUploadError(null);

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        setUploadError("No valid image files selected.");
        setIsUploading(false);
        return;
      }

      try {
        const newPanels: Panel[] = [];

        for (const file of imageFiles) {
          const dataUrl = await compressImage(
            file,
            PANEL_MAX_DIM,
            PANEL_QUALITY
          );
          newPanels.push({
            id: generateId(),
            imageDataUrl: dataUrl,
            caption: "",
            order: 0, // will be recalculated
          });
        }

        setPanels((prev) => {
          const combined = [...prev, ...newPanels].map((p, i) => ({
            ...p,
            order: i,
          }));
          emitUpdate(combined);
          return combined;
        });
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to process images."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [emitUpdate]
  );

  // ---- Render ----

  const panelCount = panels.length;
  const wordCount = useMemo(() => countWords(panels), [panels]);

  return (
    <div className="flex-1 flex flex-col h-full bg-void overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-surface/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-text-ghost">
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="2" width="10" height="10" rx="1.5" />
                <path d="M5 2v10M9 2v10M2 5h10M2 9h10" />
              </svg>
              {panelCount} {panelCount === 1 ? "panel" : "panels"}
            </span>
            <span className="text-text-ghost/30">|</span>
            <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
          </div>
        </div>

        {/* View toggle */}
        {scriptContent !== undefined && (
          <div className="flex items-center bg-void/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("visual")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "visual"
                  ? "bg-surface text-paper shadow-sm"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setViewMode("script")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "script"
                  ? "bg-surface text-paper shadow-sm"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              Script
            </button>
          </div>
        )}
      </div>

      {/* Main content area */}
      {viewMode === "visual" ? (
        /* ---- Visual Mode ---- */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 py-8 space-y-6">
            {/* Panel list */}
            {panelCount > 0 && editable ? (
              <Reorder.Group
                axis="y"
                values={panels}
                onReorder={handleReorder}
                className="space-y-6"
              >
                <AnimatePresence mode="popLayout">
                  {panels.map((panel, i) => (
                    <Reorder.Item
                      key={panel.id}
                      value={panel}
                      className="list-none"
                    >
                      <PanelCard
                        panel={panel}
                        index={i}
                        editable={editable}
                        onCaptionChange={handleCaptionChange}
                        onDelete={handleDeletePanel}
                      />
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            ) : panelCount > 0 ? (
              /* Read-only mode — no reorder */
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {panels.map((panel, i) => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      index={i}
                      editable={false}
                      onCaptionChange={handleCaptionChange}
                      onDelete={handleDeletePanel}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Empty state / upload zone */}
            {editable && (
              <>
                {panelCount === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4"
                  >
                    <h2 className="font-display text-xl text-paper mb-2">
                      {placeholder || "Start your episode"}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Upload your panels to begin building the episode. You can
                      reorder them by dragging.
                    </p>
                  </motion.div>
                )}

                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  isLoading={isUploading}
                />

                {/* Upload error */}
                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose/10 border border-rose/20 text-rose text-sm"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v4M8 11v0.5" />
                      </svg>
                      {uploadError}
                      <button
                        onClick={() => setUploadError(null)}
                        className="ml-auto text-rose/60 hover:text-rose"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <line x1="3" y1="3" x2="9" y2="9" />
                          <line x1="9" y1="3" x2="3" y2="9" />
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ---- Script Mode ---- */
        <div className="flex-1 flex overflow-hidden">
          {/* Left pane: script text editor */}
          <div className="w-1/2 border-r border-border bg-surface flex flex-col">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Episode Script
              </h3>
            </div>
            <ScriptPane
              content={scriptContent || ""}
              onUpdate={onScriptUpdate}
            />
          </div>

          {/* Right pane: panel sequence */}
          <div className="w-1/2 bg-void flex flex-col">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Panel Sequence
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-6 space-y-4">
                {panelCount > 0 ? (
                  panels.map((panel, i) => (
                    <div
                      key={panel.id}
                      className="bg-surface border border-border rounded-lg overflow-hidden"
                    >
                      <div className="relative">
                        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-amber text-void text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <img
                          src={panel.imageDataUrl}
                          alt={`Panel ${i + 1}`}
                          className="w-full block"
                          draggable={false}
                        />
                      </div>
                      {panel.caption && (
                        <div className="bg-elevated px-3 py-2">
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {panel.caption}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-text-ghost">
                      No panels uploaded yet. Switch to Visual mode to add
                      panels.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
