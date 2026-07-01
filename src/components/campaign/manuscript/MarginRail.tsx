"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ManuscriptAnnotation } from "@/lib/manuscript-annotations";
import AnnotationBody, { type MarginActions } from "./annotations/AnnotationBody";

/**
 * The margin engine (desktop gutter). Notes are absolutely positioned inside
 * the sheet's gutter, each aligned to its anchor paragraph's top edge and
 * pushed down when neighbors collide — the same content-space technique as
 * the editor's MarginaliaLayer, but measured against the sheet (which scrolls
 * as one piece, so positions ride the scroll for free).
 *
 * Anchors are the `data-turn-id` attributes PageProse stamps on paragraphs.
 * Anchorless notes (anchorTurnId null) pin to the head of the page. Notes
 * whose anchor is off the visible window simply don't render.
 */
const NOTE_GAP = 12;
const FALLBACK_NOTE_HEIGHT = 64;
const HEAD_TOP = 8;

export default function MarginRail({
  annotations,
  actions,
}: {
  annotations: ManuscriptAnnotation[];
  actions: MarginActions;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const sheet = rail.closest(".manuscript-sheet") as HTMLElement | null;
    if (!sheet) return;
    const sheetTop = sheet.getBoundingClientRect().top;

    // Desired top = the anchor paragraph's top edge in sheet space.
    const desired: Array<{ id: string; top: number; height: number }> = [];
    for (const annotation of annotations) {
      let top: number;
      if (annotation.anchorTurnId === null) {
        top = HEAD_TOP;
      } else {
        const anchor = sheet.querySelector(
          `[data-turn-id="${annotation.anchorTurnId}"]`,
        ) as HTMLElement | null;
        if (!anchor) continue; // anchor is off the visible window
        top = anchor.getBoundingClientRect().top - sheetTop;
      }
      const el = noteRefs.current.get(annotation.id);
      desired.push({
        id: annotation.id,
        top,
        height: el?.offsetHeight || FALLBACK_NOTE_HEIGHT,
      });
    }

    // Collision pass: keep sortOrder (the array is already ordered), push down.
    desired.sort((a, b) => a.top - b.top);
    const next: Record<string, number> = {};
    let floor = 0;
    for (const note of desired) {
      const top = Math.max(note.top, floor);
      next[note.id] = top;
      floor = top + note.height + NOTE_GAP;
    }
    setTops((prev) => {
      const keys = Object.keys(next);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every((k) => Math.abs((prev[k] ?? -1) - next[k]) < 0.5)
      ) {
        return prev;
      }
      return next;
    });
  }, [annotations]);

  // Measure after paint, when annotations change, and whenever the sheet or
  // its text reflows (images, fonts, the quill growing). Deferred a frame —
  // notes render hidden (top: -9999, opacity 0) until placed, so nothing
  // flashes, and the effect never sets state synchronously.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(measure);
    const settle = setTimeout(measure, 300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [measure]);

  useEffect(() => {
    const rail = railRef.current;
    const sheet = rail?.closest(".manuscript-sheet");
    if (!sheet) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(sheet);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div ref={railRef} className="relative h-full px-3">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          ref={(el) => {
            if (el) noteRefs.current.set(annotation.id, el);
            else noteRefs.current.delete(annotation.id);
          }}
          className="absolute left-3 right-3 transition-[top] duration-300 ease-out"
          style={{ top: tops[annotation.id] ?? -9999, opacity: annotation.id in tops ? 1 : 0 }}
        >
          <AnnotationBody annotation={annotation} actions={actions} />
        </div>
      ))}
    </div>
  );
}
