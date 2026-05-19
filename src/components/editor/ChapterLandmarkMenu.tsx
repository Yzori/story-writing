"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { AnimatePresence, motion } from "framer-motion";

type LandmarkType = "heading" | "scene" | "illustration";

interface Landmark {
  id: string;
  label: string;
  type: LandmarkType;
  pos: number;
}

interface ChapterLandmarkMenuProps {
  editor: Editor;
}

function nodeLabel(type: LandmarkType) {
  if (type === "heading") return "Heading";
  if (type === "illustration") return "Illustration";
  return "Scene";
}

function iconFor(type: LandmarkType) {
  if (type === "heading") {
    return <span className="text-[10px] font-semibold">H</span>;
  }

  if (type === "illustration") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <circle cx="5.5" cy="5.5" r="1" />
        <path d="M14 10l-3.5-3.5L3 14" />
      </svg>
    );
  }

  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="12" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

function collectLandmarks(editor: Editor): Landmark[] {
  const next: Landmark[] = [];
  let sceneCount = 0;
  let illustrationCount = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const text = node.textContent.trim();
      next.push({
        id: `heading-${pos}`,
        type: "heading",
        pos,
        label: text || `Heading ${next.filter((item) => item.type === "heading").length + 1}`,
      });
      return;
    }

    if (node.type.name === "horizontalRule") {
      sceneCount += 1;
      const label = typeof node.attrs.label === "string" && node.attrs.label.trim()
        ? node.attrs.label.trim()
        : `Scene break ${sceneCount}`;
      next.push({ id: `scene-${pos}`, type: "scene", pos, label });
      return;
    }

    if (node.type.name === "illustrationBlock" || node.type.name === "illustratedBlock") {
      illustrationCount += 1;
      const caption = typeof node.attrs.caption === "string" ? node.attrs.caption.trim() : "";
      next.push({
        id: `illustration-${pos}`,
        type: "illustration",
        pos,
        label: caption || `Illustration ${illustrationCount}`,
      });
    }
  });

  return next;
}

export default function ChapterLandmarkMenu({ editor }: ChapterLandmarkMenuProps) {
  const [open, setOpen] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => collectLandmarks(editor));
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setLandmarks(collectLandmarks(editor));
  }, [editor]);

  useEffect(() => {
    queueMicrotask(refresh);
    editor.on("update", refresh);
    return () => {
      editor.off("update", refresh);
    };
  }, [editor, refresh]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const grouped = useMemo(
    () =>
      landmarks.reduce<Record<LandmarkType, Landmark[]>>(
        (acc, landmark) => {
          acc[landmark.type].push(landmark);
          return acc;
        },
        { heading: [], scene: [], illustration: [] }
      ),
    [landmarks]
  );

  const jumpTo = useCallback(
    (landmark: Landmark) => {
      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (!dispatch) return true;

          const node = tr.doc.nodeAt(landmark.pos);
          if (node?.isAtom) {
            tr.setSelection(NodeSelection.create(tr.doc, landmark.pos));
          } else {
            tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(landmark.pos + 1, tr.doc.content.size))));
          }
          tr.scrollIntoView();
          dispatch(tr);
          return true;
        })
        .run();
      setOpen(false);
    },
    [editor]
  );

  if (landmarks.length === 0) return null;

  return (
    <div ref={menuRef} className="relative pointer-events-auto">
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-elevated/80 px-2.5 py-1 text-[11px] text-text-ghost shadow-lg shadow-black/10 backdrop-blur-md transition-all hover:border-amber/30 hover:bg-amber/[0.06] hover:text-paper"
        title="Jump to headings, scene breaks, or illustrations in this chapter"
        aria-label="Open chapter map"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v10l3-1.5L10 13l3-1.5V1.5L10 3 6 1.5 3 3z" />
          <path d="M6 1.5v10M10 3v10" />
        </svg>
        Map
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-2 w-[280px] overflow-hidden rounded-xl border border-border-active bg-elevated/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="border-b border-border/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Chapter map</p>
              <p className="mt-1 text-[11px] text-text-secondary">Jump through structure in this chapter.</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1.5">
              {(["heading", "scene", "illustration"] as const).map((type) => {
                const items = grouped[type];
                if (items.length === 0) return null;

                return (
                  <div key={type}>
                    <p className="px-3 pb-1 pt-2 text-[9px] uppercase tracking-[0.14em] text-text-ghost">
                      {nodeLabel(type)}
                    </p>
                    {items.map((landmark) => (
                      <button
                        key={landmark.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          jumpTo(landmark);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-text-secondary transition-colors hover:bg-amber/10 hover:text-paper"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-text-tertiary">
                          {iconFor(landmark.type)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px]">{landmark.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
