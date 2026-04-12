"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { getTextOffset, highlightAnnotations } from "@/lib/text-offsets";
import type { AnnotationData } from "@/lib/text-offsets";
import AnnotationPopover from "./AnnotationPopover";

interface AnnotationLayerProps {
  storyId: string;
  chapterId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

interface Annotation extends AnnotationData {
  createdAt: string;
  avatarUrl: string | null;
}

export default function AnnotationLayer({
  storyId,
  chapterId,
  contentRef,
}: AnnotationLayerProps) {
  const { data: session } = useSession();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [createPosition, setCreatePosition] = useState({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "public">("private");
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [submitting, setSubmitting] = useState(false);

  const userId = session?.user?.id;

  // Fetch annotations
  const fetchAnnotations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/annotations`
      );
      if (res.ok) {
        const { data } = await res.json();
        setAnnotations(data || []);
      }
    } catch {
      // ignore
    }
  }, [storyId, chapterId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  // Apply highlights when annotations change
  useEffect(() => {
    const container = contentRef.current;
    if (!container || annotations.length === 0) return;

    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      highlightAnnotations(container, annotations, userId);

      // Add click listeners to marks
      container.querySelectorAll("mark[data-annotation-id]").forEach((mark) => {
        mark.addEventListener("click", (e) => {
          const id = (mark as HTMLElement).getAttribute("data-annotation-id");
          const ann = annotations.find((a) => a.id === id);
          if (ann) {
            const rect = (mark as HTMLElement).getBoundingClientRect();
            setPopoverPosition({ top: rect.bottom + 4, left: rect.left });
            setActiveAnnotation(ann);
          }
          e.stopPropagation();
        });
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [annotations, contentRef, userId]);

  // Listen for text selection
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !userId) return;

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setShowCreatePopover(false);
        return;
      }

      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setShowCreatePopover(false);
        return;
      }

      const start = getTextOffset(container, range.startContainer, range.startOffset);
      const end = getTextOffset(container, range.endContainer, range.endOffset);

      if (end > start) {
        const rect = range.getBoundingClientRect();
        setSelectedRange({ start, end });
        setCreatePosition({ top: rect.bottom + 8, left: rect.left });
        setShowCreatePopover(true);
      }
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [contentRef, userId]);

  // Close popovers on outside click
  useEffect(() => {
    const handleClick = () => {
      setActiveAnnotation(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleCreate = async () => {
    if (!selectedRange || !noteContent.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/annotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startOffset: selectedRange.start,
            endOffset: selectedRange.end,
            content: noteContent.trim(),
            visibility: noteVisibility,
          }),
        }
      );

      if (res.ok) {
        setNoteContent("");
        setShowCreatePopover(false);
        window.getSelection()?.removeAllRanges();
        fetchAnnotations();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (annotationId: string) => {
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/annotations/${annotationId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setActiveAnnotation(null);
        fetchAnnotations();
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Create annotation popover */}
      <AnimatePresence>
        {showCreatePopover && selectedRange && userId && (
          <div
            style={{ top: createPosition.top, left: createPosition.left }}
            className="fixed z-50 w-72 bg-elevated border border-border rounded-lg shadow-xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value.slice(0, 2000))}
              placeholder="Add a note..."
              rows={3}
              className="w-full bg-surface/50 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-ghost resize-none focus:outline-none focus:border-lavender/30 mb-2"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNoteVisibility("private")}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    noteVisibility === "private"
                      ? "border-gold/30 text-gold bg-gold/10"
                      : "border-border text-text-ghost"
                  }`}
                >
                  Private
                </button>
                <button
                  onClick={() => setNoteVisibility("public")}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    noteVisibility === "public"
                      ? "border-lavender/30 text-lavender bg-lavender/10"
                      : "border-border text-text-ghost"
                  }`}
                >
                  Public
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreatePopover(false)}
                  className="text-[11px] text-text-ghost hover:text-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!noteContent.trim() || submitting}
                  className="text-[11px] px-3 py-1 bg-lavender/15 border border-lavender/25 text-lavender rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? "..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* View annotation popover */}
      <AnimatePresence>
        {activeAnnotation && (
          <AnnotationPopover
            content={activeAnnotation.content}
            displayName={activeAnnotation.displayName}
            createdAt={activeAnnotation.createdAt}
            isOwn={activeAnnotation.userId === userId}
            position={popoverPosition}
            onDelete={
              activeAnnotation.userId === userId
                ? () => handleDelete(activeAnnotation.id)
                : undefined
            }
            onClose={() => setActiveAnnotation(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
