"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes, Extension, type Editor as CoreEditor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback, useState, useRef } from "react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  estimateScreenplayMetrics,
  type ScreenplayMetrics,
} from "@/lib/craft/screenplay-metrics";

// ── Custom Tiptap Nodes for Screenplay Elements ────────────────────────

/**
 * Enter inside a screenplay element: only flow into the next element type
 * when the cursor is at the very end of the block — a mid-block split moves
 * the remaining text into the new block, and retyping it would silently
 * reformat the user's content (e.g. turn the rest of a speech into action).
 */
function splitToNextElement(editor: CoreEditor, nextType: string): boolean {
  const { $head } = editor.state.selection;
  const atEnd = $head.parentOffset === $head.parent.content.size;
  const chain = editor.chain().splitBlock();
  if (atEnd) {
    chain.setNode(nextType);
  }
  return chain.run();
}

const SceneHeading = Node.create({
  name: "sceneHeading",
  group: "block",
  content: "inline*",

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: 'div[data-type="scene-heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "scene-heading" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("sceneHeading")) return false;
        return splitToNextElement(editor, "action");
      },
    };
  },
});

const Action = Node.create({
  name: "action",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="action"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "action" }),
      0,
    ];
  },
});

const CharacterName = Node.create({
  name: "characterName",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="character-name"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "character-name" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("characterName")) return false;
        return splitToNextElement(editor, "dialogue");
      },
    };
  },
});

const Dialogue = Node.create({
  name: "dialogue",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="dialogue"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "dialogue" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("dialogue")) return false;
        // After dialogue, go back to action
        return splitToNextElement(editor, "action");
      },
    };
  },
});

const Parenthetical = Node.create({
  name: "parenthetical",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="parenthetical"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "parenthetical" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("parenthetical")) return false;
        return splitToNextElement(editor, "dialogue");
      },
    };
  },
});

const Transition = Node.create({
  name: "transition",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="transition"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "transition" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("transition")) return false;
        return splitToNextElement(editor, "sceneHeading");
      },
    };
  },
});

// ── Gutter Decoration Plugin (element labels + scene numbers) ───────────

const ELEMENT_LABELS: Record<string, string> = {
  sceneHeading: "SCN",
  action: "ACT",
  characterName: "CHR",
  dialogue: "DLG",
  parenthetical: "PAR",
  transition: "TRN",
};

/**
 * Plugin state is the scene-numbers preference. React flips it by dispatching
 * a meta-only transaction — no doc change, so it never triggers an autosave.
 */
const gutterPluginKey = new PluginKey<boolean>("elementLabels");

function gutterWidget(className: string, text: string) {
  return () => {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
  };
}

const GutterPlugin = Extension.create({
  name: "elementLabels",

  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key: gutterPluginKey,
        state: {
          init: () => false,
          apply: (tr, value) => {
            const next = tr.getMeta(gutterPluginKey);
            return typeof next === "boolean" ? next : value;
          },
        },
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc, selection } = state;
            const activePos = selection.$head.pos;
            const showSceneNumbers = gutterPluginKey.getState(state) ?? false;
            let sceneNumber = 0;

            doc.descendants((node, pos) => {
              const label = ELEMENT_LABELS[node.type.name];
              if (!label) return;

              const isScene = node.type.name === "sceneHeading";
              if (isScene) sceneNumber += 1;

              // Numbered scenes carry their number always; every other block
              // shows its element label only while the cursor is inside it.
              const numbered = isScene && showSceneNumbers;
              const isActive = activePos >= pos && activePos <= pos + node.nodeSize;
              if (!numbered && !isActive) return;

              const text = numbered ? String(sceneNumber) : label;
              const className = numbered
                ? "screenplay-scene-number"
                : "screenplay-element-label";

              decorations.push(
                Decoration.widget(pos + 1, gutterWidget(className, text), {
                  side: -1,
                  key: `${className}:${text}`,
                })
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

// ── Tab Cycling Extension ───────────────────────────────────────────────

const TAB_CYCLE = ["action", "characterName", "dialogue", "parenthetical"] as const;

const TabCycleExtension = Extension.create({
  name: "tabCycle",

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { $head } = editor.state.selection;
        const currentNode = $head.parent;
        const isAtStart = $head.parentOffset === 0;
        const isEmpty = currentNode.textContent.length === 0;

        if (!isAtStart && !isEmpty) return false;

        const currentType = currentNode.type.name;
        const currentIndex = TAB_CYCLE.indexOf(currentType as typeof TAB_CYCLE[number]);

        if (currentIndex === -1) {
          // If not in the cycle (e.g. sceneHeading, transition, paragraph), go to action
          return editor.chain().setNode("action").run();
        }

        const nextIndex = (currentIndex + 1) % TAB_CYCLE.length;
        const nextType = TAB_CYCLE[nextIndex];
        return editor.chain().setNode(nextType).run();
      },
    };
  },
});

// ── Auto-Detection Extension ────────────────────────────────────────────

const autoDetectPluginKey = new PluginKey("autoDetect");

const AutoDetectExtension = Extension.create({
  name: "autoDetect",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoDetectPluginKey,
        view() {
          let hintWidget: HTMLElement | null = null;

          return {
            update(view, prevState) {
              const { state } = view;
              const { $head } = state.selection;
              const currentNode = $head.parent;
              const text = currentNode.textContent;

              // Remove existing hint
              if (hintWidget) {
                hintWidget.remove();
                hintWidget = null;
              }

              // Only auto-convert in response to typing: the block's text must
              // have just changed. Type-only changes (toolbar "Action" button,
              // Tab cycling) keep the same text, and converting on those would
              // instantly fight the user's explicit element choice.
              const textJustChanged =
                !!prevState &&
                prevState.doc !== state.doc &&
                prevState.selection.$head.parent.textContent !== text;

              // Auto-convert: INT. or EXT. → sceneHeading
              // Deferred via requestAnimationFrame to avoid dispatching inside update()
              if (
                textJustChanged &&
                currentNode.type.name === "action" &&
                /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/.test(text.toUpperCase())
              ) {
                const pos = $head.before();
                requestAnimationFrame(() => {
                  if (!view.isDestroyed) {
                    const tr = view.state.tr.setNodeMarkup(pos, view.state.schema.nodes.sceneHeading);
                    view.dispatch(tr);
                  }
                });
                return;
              }

              // Hint: all-caps short text in action → suggest character
              if (
                currentNode.type.name === "action" &&
                text.length > 1 &&
                text.length < 40 &&
                text === text.toUpperCase() &&
                /^[A-Z\s.'-]+$/.test(text)
              ) {
                // Show hint after the current line
                const coords = view.coordsAtPos($head.pos);
                hintWidget = document.createElement("div");
                hintWidget.className = "screenplay-char-hint";
                hintWidget.textContent = "Tab → Character Name";
                hintWidget.style.position = "fixed";
                hintWidget.style.left = `${coords.right + 12}px`;
                hintWidget.style.top = `${coords.top - 2}px`;
                document.body.appendChild(hintWidget);
              }
            },
            destroy() {
              if (hintWidget) {
                hintWidget.remove();
                hintWidget = null;
              }
            },
          };
        },
      }),
    ];
  },
});

// ── Screenplay Editor Component ─────────────────────────────────────────

interface ScreenplayEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
  placeholder?: string;
}

const SCENE_NUMBERS_KEY = "quiloria-screenplay-scene-numbers";
const METRICS_DEBOUNCE_MS = 300;

export default function ScreenplayEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
  placeholder = "INT. YOUR STORY BEGINS - DAY",
}: ScreenplayEditorProps) {
  const [activeElement, setActiveElement] = useState<string>("action");
  const [sceneNumbers, setSceneNumbers] = useState(false);
  const [metrics, setMetrics] = useState<ScreenplayMetrics>(() =>
    estimateScreenplayMetrics(null)
  );

  const editor = useEditor({
    extensions: [
      // Action registered first so it becomes the default block node
      Action.extend({
        // Make "action" the default node by aliasing paragraph parsing
        parseHTML() {
          return [
            { tag: 'div[data-type="action"]' },
            { tag: "p" },
          ];
        },
      }),
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        paragraph: false,
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      SceneHeading,
      CharacterName,
      Dialogue,
      Parenthetical,
      Transition,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      GutterPlugin,
      TabCycleExtension,
      AutoDetectExtension,
    ],
    content: content || "",
    editable,
    editorProps: {
      attributes: {
        class: "screenplay-editor-content",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      onUpdate(html, words);
    },
    onSelectionUpdate: ({ editor }) => {
      // Track active element type for the toolbar
      for (const type of Object.keys(ELEMENT_LABELS)) {
        if (editor.isActive(type)) {
          setActiveElement(type);
          return;
        }
      }
      setActiveElement("action");
    },
    immediatelyRender: false,
  });

  // Notify parent when editor is ready (once per editor instance)
  const hasCalledReady = useRef(false);
  useEffect(() => {
    if (editor && !editor.isDestroyed && onEditorReady && !hasCalledReady.current) {
      hasCalledReady.current = true;
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync content when it changes externally
  const setContent = useCallback(
    (newContent: string) => {
      if (!editor || editor.isDestroyed) return;

      queueMicrotask(() => {
        if (editor.isDestroyed) return;
        const currentHtml = editor.getHTML();
        if (currentHtml !== newContent) {
          // emitUpdate: false — external sync, not a user edit; Tiptap v3
          // defaults to true, which would trigger a phantom autosave.
          editor.commands.setContent(newContent || "", { emitUpdate: false });
        }
      });
    },
    [editor]
  );

  useEffect(() => {
    setContent(content);
  }, [content, setContent]);

  // Update editable state
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Scene-number preference: read once, then keep the gutter plugin in sync
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setSceneNumbers(localStorage.getItem(SCENE_NUMBERS_KEY) === "true");
      } catch {
        // Private browsing / storage disabled — the default (off) is fine.
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(gutterPluginKey, sceneNumbers));
  }, [editor, sceneNumbers]);

  const toggleSceneNumbers = useCallback(() => {
    setSceneNumbers((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SCENE_NUMBERS_KEY, String(next));
      } catch {
        // Preference just won't persist.
      }
      return next;
    });
    editor?.commands.focus();
  }, [editor]);

  // Page/runtime estimate, recomputed off the doc after typing settles.
  // Runs after the content-sync effect above, so its microtask lands later.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const recompute = () => {
      if (editor.isDestroyed) return;
      setMetrics(estimateScreenplayMetrics(editor.getJSON()));
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(recompute, METRICS_DEBOUNCE_MS);
    };

    queueMicrotask(recompute);
    editor.on("update", schedule);
    return () => {
      clearTimeout(timer);
      editor.off("update", schedule);
    };
  }, [editor, content]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  const setElementType = (type: string) => {
    editor.chain().focus().setNode(type).run();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-void">
      <div className="flex-1 overflow-y-auto">
        {/* ── Element Type Toolbar ──────────────────────────── */}
        {editable && (
          <div className="sticky top-0 z-30 bg-void/90 backdrop-blur-sm border-b border-border/40">
            <div className="max-w-[740px] mx-auto flex items-center gap-1 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-hide">
              {(
                [
                  { type: "sceneHeading", label: "Scene", shortcut: "" },
                  { type: "action", label: "Action", shortcut: "" },
                  { type: "characterName", label: "Character", shortcut: "" },
                  { type: "dialogue", label: "Dialogue", shortcut: "" },
                  { type: "parenthetical", label: "Paren", shortcut: "" },
                  { type: "transition", label: "Transition", shortcut: "" },
                ] as const
              ).map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setElementType(type)}
                  className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    activeElement === type
                      ? "bg-amber/15 text-amber border border-amber/30"
                      : "text-text-ghost hover:text-text-secondary hover:bg-surface/50 border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 pl-2">
                <button
                  onClick={toggleSceneNumbers}
                  aria-pressed={sceneNumbers}
                  className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    sceneNumbers
                      ? "bg-amber/15 text-amber border border-amber/30"
                      : "text-text-ghost hover:text-text-secondary hover:bg-surface/50 border border-transparent"
                  }`}
                >
                  Scene numbers
                </button>
                <span className="shrink-0 text-[10px] text-text-ghost font-mono tracking-wide tabular-nums">
                  {editor.storage.characterCount.words()} words
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Script Page ──────────────────────────────────── */}
        <div className="max-w-[740px] mx-auto px-3 sm:px-4 py-6 sm:py-8 min-h-full">
          <div className="relative bg-[#FAFAF5] rounded-sm shadow-2xl shadow-black/40 px-6 sm:px-10 md:px-16 py-8 sm:py-10 md:py-12 min-h-[800px]">
            {/* Brass brads decoration */}
            <div className="absolute top-8 left-3 sm:left-6 w-3 h-3 rounded-full bg-[#B8A04A] shadow-inner opacity-40" />
            <div className="absolute bottom-8 left-3 sm:left-6 w-3 h-3 rounded-full bg-[#B8A04A] shadow-inner opacity-40" />

            <EditorContent
              editor={editor}
              className="screenplay-content-area"
            />
          </div>
        </div>
      </div>

      {/* ── Slate strip: what the script runs to ─────────── */}
      <div className="shrink-0 border-t border-border/40 bg-void/90 backdrop-blur-sm">
        <div className="max-w-[740px] mx-auto px-3 sm:px-4 py-1.5 flex justify-end">
          <span className="font-mono text-[10px] tracking-wide text-text-ghost tabular-nums">
            ~{metrics.pages.toFixed(1)} pages · ~{metrics.runtimeMinutes} min ·{" "}
            {metrics.sceneCount} {metrics.sceneCount === 1 ? "scene" : "scenes"}
          </span>
        </div>
      </div>

      {/* ── Stylesheet ───────────────────────────────────── */}
      <style jsx global>{`
        /* ── Base Editor ─────────────────────────────────── */
        .screenplay-editor-content {
          font-family: "Courier New", "Courier", monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #1a1a1a;
          outline: none;
          caret-color: #b45309;
          position: relative;
        }

        /* The editor root carries both classes ("screenplay-editor-content tiptap") */
        .screenplay-editor-content.tiptap {
          outline: none;
          min-height: 600px;
        }

        /* ── Scene Heading ───────────────────────────────── */
        .screenplay-editor-content div[data-type="scene-heading"] {
          text-transform: uppercase;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.02em;
          margin-top: 2em;
          margin-bottom: 1em;
          padding: 2px 4px;
          border-left: 3px solid #b45309;
          background: rgba(180, 83, 9, 0.04);
        }

        .screenplay-editor-content div[data-type="scene-heading"]:first-child {
          margin-top: 0;
        }

        /* ── Action ──────────────────────────────────────── */
        .screenplay-editor-content div[data-type="action"],
        .screenplay-editor-content p {
          margin-bottom: 1em;
          font-size: 13px;
        }

        /* ── Character Name ──────────────────────────────── */
        .screenplay-editor-content div[data-type="character-name"] {
          text-transform: uppercase;
          font-weight: 600;
          text-align: left;
          padding-left: 38%;
          margin-bottom: 0;
          margin-top: 1.5em;
          font-size: 13px;
          letter-spacing: 0.03em;
        }

        /* ── Dialogue ────────────────────────────────────── */
        .screenplay-editor-content div[data-type="dialogue"] {
          padding-left: 20%;
          padding-right: 20%;
          margin-bottom: 0.5em;
          font-size: 13px;
        }

        /* ── Parenthetical ───────────────────────────────── */
        .screenplay-editor-content div[data-type="parenthetical"] {
          padding-left: 30%;
          padding-right: 30%;
          font-style: italic;
          font-size: 12px;
          color: #555;
          margin-bottom: 0.25em;
        }

        .screenplay-editor-content div[data-type="parenthetical"]::before {
          content: "(";
        }

        .screenplay-editor-content div[data-type="parenthetical"]::after {
          content: ")";
        }

        /* ── Transition ──────────────────────────────────── */
        .screenplay-editor-content div[data-type="transition"] {
          text-transform: uppercase;
          text-align: right;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.03em;
          margin-top: 1.5em;
          margin-bottom: 1.5em;
        }

        /* ── Element Label (left gutter) ─────────────────── */
        .screenplay-element-label {
          position: absolute;
          left: -52px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #b45309;
          background: rgba(180, 83, 9, 0.08);
          padding: 1px 5px;
          border-radius: 3px;
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          line-height: 1.5;
          margin-top: 2px;
        }

        /* ── Scene Number (left gutter) ──────────────────── */
        /* Right-aligned in a fixed box so 9 → 10 doesn't shift the column */
        .screenplay-scene-number {
          position: absolute;
          left: -52px;
          width: 34px;
          text-align: right;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: rgba(180, 83, 9, 0.7);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          line-height: 1.5;
          margin-top: 2px;
        }

        /* Hide gutter labels on narrow screens — they get clipped off-screen */
        @media (max-width: 768px) {
          .screenplay-element-label,
          .screenplay-scene-number {
            display: none;
          }
        }

        /* ── Auto-detect Character Hint ──────────────────── */
        .screenplay-char-hint {
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          padding: 2px 8px;
          border-radius: 4px;
          pointer-events: none;
          user-select: none;
          z-index: 100;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          animation: hintFadeIn 0.2s ease-out;
        }

        @keyframes hintFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Placeholder ─────────────────────────────────── */
        /* Tiptap puts is-editor-empty (+ data-placeholder) on the empty block
           node inside the editor root, not on the root itself */
        .screenplay-editor-content div.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #b8b8a8;
          font-family: "Courier New", "Courier", monospace;
          font-size: 13px;
          text-transform: uppercase;
          font-weight: 700;
          pointer-events: none;
          height: 0;
        }

        /* ── Selection ───────────────────────────────────── */
        .screenplay-editor-content ::selection {
          background: rgba(180, 83, 9, 0.15);
        }
      `}</style>
    </div>
  );
}
