"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { useEffect, useCallback, useState, useRef } from "react";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import type { ResolvedPos } from "@tiptap/pm/model";
import FloatingToolbar from "./FloatingToolbar";

// ── Custom Nodes ──────────────────────────────────────────────────────────────

/**
 * A poetry line — renders as a <div> with no paragraph spacing.
 * Enter creates a new line within the same stanza.
 */
const PoetryLine = Node.create({
  name: "poetryLine",
  content: "inline*",
  group: "block",
  defining: true,

  parseHTML() {
    return [
      { tag: "div.poetry-line" },
      // Also accept plain <p> for pasting regular content
      { tag: "p", priority: 40 },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "poetry-line" }),
      0,
    ];
  },
});

/**
 * A stanza — wraps one or more poetryLine nodes.
 * Visually separated from other stanzas with generous vertical spacing.
 * A double-Enter (creating an empty line then pressing Enter again)
 * splits into a new stanza.
 */
const Stanza = Node.create({
  name: "stanza",
  content: "poetryLine+",
  group: "block",
  defining: true,

  parseHTML() {
    return [{ tag: "div.stanza" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "stanza" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Check if we're inside a stanza
        const stanzaDepth = findAncestorDepth($from, "stanza");
        if (stanzaDepth === null) return false;

        const lineDepth = findAncestorDepth($from, "poetryLine");
        if (lineDepth === null) return false;

        const currentLine = $from.node(lineDepth);
        const isLineEmpty = currentLine.textContent.length === 0;

        if (isLineEmpty) {
          // Empty line + Enter = new stanza
          const stanzaNode = $from.node(stanzaDepth);
          const lineIndex = $from.index(stanzaDepth);

          // If this empty line is the only line in the stanza, the stanza
          // already IS a fresh empty stanza — there is nothing to split.
          // (Deleting the line would be refilled by ProseMirror's fitter,
          // since the stanza schema is "poetryLine+", and inserting another
          // stanza after it would stack phantom empties.) Consume the key.
          if (stanzaNode.childCount === 1) {
            return true;
          }

          // If empty line is at the end of a stanza with other lines
          if (lineIndex === stanzaNode.childCount - 1) {
            return editor
              .chain()
              .command(({ tr, dispatch }) => {
                if (!dispatch) return true;
                const linePos = $from.before(lineDepth);
                const stanzaEnd = $from.after(stanzaDepth);
                tr.delete(linePos, linePos + currentLine.nodeSize);
                const newStanza = state.schema.nodes.stanza.create(
                  null,
                  state.schema.nodes.poetryLine.create()
                );
                const mappedEnd = tr.mapping.map(stanzaEnd);
                tr.insert(mappedEnd, newStanza);
                const targetPos = mappedEnd + 2;
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(targetPos))
                );
                return true;
              })
              .run();
          }

          // Empty line at the start of a multi-line stanza — the stanza
          // boundary above already provides the break, so just remove the
          // empty line and leave the cursor on the (new) first line.
          // (Splitting here via delete-to-stanza-end would empty the stanza,
          // which the fitter refills, leaving a phantom empty stanza.)
          if (lineIndex === 0) {
            return editor
              .chain()
              .command(({ tr, dispatch }) => {
                if (!dispatch) return true;
                const linePos = $from.before(lineDepth);
                tr.delete(linePos, linePos + currentLine.nodeSize);
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(linePos))
                );
                return true;
              })
              .run();
          }

          // Empty line in the middle — split the stanza
          return editor
            .chain()
            .command(({ tr, dispatch }) => {
              if (!dispatch) return true;
              const linePos = $from.before(lineDepth);
              const linesAfter: Array<typeof stanzaNode> = [];
              for (let i = lineIndex + 1; i < stanzaNode.childCount; i++) {
                linesAfter.push(stanzaNode.child(i));
              }
              const stanzaEnd = $from.after(stanzaDepth);
              const deleteTo = stanzaEnd - 1;
              tr.delete(linePos, deleteTo);
              const newStanzaContent =
                linesAfter.length > 0
                  ? linesAfter
                  : [state.schema.nodes.poetryLine.create()];
              const newStanza = state.schema.nodes.stanza.create(
                null,
                newStanzaContent
              );
              const insertPos = tr.mapping.map(stanzaEnd);
              tr.insert(insertPos, newStanza);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(insertPos + 2))
              );
              return true;
            })
            .run();
        }

        // Non-empty line: create a new poetry line within the same stanza
        return editor.chain().splitBlock().run();
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        if ($from.parentOffset !== 0) return false;

        const stanzaDepth = findAncestorDepth($from, "stanza");
        if (stanzaDepth === null) return false;

        const lineIndex = $from.index(stanzaDepth);
        if (lineIndex !== 0) return false;

        const stanzaIndex = $from.index(stanzaDepth - 1);
        if (stanzaIndex === 0) return false;

        return editor.chain().joinBackward().run();
      },
    };
  },
});

/** Find the depth of an ancestor node with the given name */
function findAncestorDepth(
  $pos: ResolvedPos,
  nodeName: string
): number | null {
  for (let d = $pos.depth; d >= 0; d--) {
    if ($pos.node(d).type.name === nodeName) return d;
  }
  return null;
}

// ── Floating Toolbar ──────────────────────────────────────────────────────────
// Poetry shares the prose FloatingToolbar (configured to bold/italic/strike/
// em-dash) — see the render site below — so the four editors read as one family.


// ── Component ─────────────────────────────────────────────────────────────────

interface PoetryEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
  alignment?: "left" | "center";
  showLineNumbers?: boolean;
  placeholder?: string;
}

export default function PoetryEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
  alignment = "left",
  showLineNumbers = false,
  placeholder = "Begin writing...",
}: PoetryEditorProps) {
  const [lineNumbers, setLineNumbers] = useState(showLineNumbers);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        bold: undefined,
        italic: undefined,
        strike: undefined,
        paragraph: false,
        hardBreak: false,
        dropcursor: { color: "var(--t-gold)", width: 2 },
      }),
      Stanza,
      PoetryLine,
      Placeholder.configure({
        placeholder,
        // Stanza is not a textblock, so the decoration must descend into
        // its poetryLine children for the empty-editor placeholder to land.
        includeChildren: true,
        emptyEditorClass: "is-editor-empty",
        emptyNodeClass: "is-empty-line",
      }),
      CharacterCount,
      Typography,
    ],
    content: wrapInStanzas(content),
    editable,
    editorProps: {
      attributes: {
        class: `poetry-editor-content ${alignment === "center" ? "poetry-centered" : "poetry-left"}`,
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
          editor.commands.setContent(wrapInStanzas(newContent) || "", { emitUpdate: false });
        }
      });
    },
    [editor]
  );

  useEffect(() => {
    setContent(content);
  }, [content, setContent]);

  // Update alignment class when prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const el = editor.view.dom;
      el.classList.remove("poetry-centered", "poetry-left");
      el.classList.add(
        alignment === "center" ? "poetry-centered" : "poetry-left"
      );
    }
  }, [alignment, editor]);

  // Update editable state
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Sync showLineNumbers prop
  useEffect(() => {
    setLineNumbers(showLineNumbers);
  }, [showLineNumbers]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={`max-w-[680px] mx-auto px-8 pb-64 pt-8 min-h-full ${
          lineNumbers ? "poetry-line-numbers" : ""
        }`}
      >
        <FloatingToolbar editor={editor} features={["bold", "italic", "strike", "emdash"]} />

        {/* Line numbers toggle */}
        {editable && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setLineNumbers((v) => !v)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors duration-200 ${
                lineNumbers
                  ? "bg-amber/10 border-amber/30 text-amber"
                  : "bg-transparent border-border text-text-ghost hover:text-text-secondary hover:border-border-active"
              }`}
              title="Toggle line numbers"
            >
              Line numbers
            </button>
          </div>
        )}

        <EditorContent editor={editor} className="poetry-editor-wrapper" />
      </div>

      {/* Styles for poetry editor */}
      <style jsx global>{`
        /* ── Poetry Editor Base ─────────────────────────────── */
        .poetry-editor-content {
          outline: none;
          font-family: var(--font-literata, "Literata", serif);
          font-size: 1.0625rem;
          line-height: 1.85;
          color: var(--color-paper, #f5f0e8);
          caret-color: var(--color-amber, #d4a574);
          min-height: 60vh;
        }

        .poetry-editor-content.poetry-centered .stanza {
          text-align: center;
        }

        .poetry-editor-content.poetry-left .stanza {
          text-align: left;
        }

        /* ── Stanza spacing ────────────────────────────────── */
        .poetry-editor-content .stanza {
          margin-bottom: 2.5rem;
          position: relative;
        }

        .poetry-editor-content .stanza:last-child {
          margin-bottom: 0;
        }

        /* ── Poetry line ───────────────────────────────────── */
        .poetry-editor-content .poetry-line {
          margin: 0;
          padding: 0;
          min-height: 1.85em;
          position: relative;
        }

        /* ── Placeholder ───────────────────────────────────── */
        .poetry-editor-content .is-empty-line::before {
          content: none;
        }

        /* The Placeholder decoration puts is-editor-empty + data-placeholder
           on the empty poetryLine itself (only when the whole doc is empty) */
        .poetry-editor-content .poetry-line.is-editor-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          color: var(--color-text-ghost, #6b6560);
          pointer-events: none;
          font-style: italic;
          opacity: 0.6;
        }

        /* ── Line numbers ──────────────────────────────────── */
        .poetry-line-numbers .poetry-editor-content .stanza {
          counter-reset: none;
        }

        .poetry-line-numbers .poetry-editor-content {
          counter-reset: poetry-line;
        }

        .poetry-line-numbers .poetry-editor-content .poetry-line {
          padding-left: 3rem;
        }

        .poetry-line-numbers .poetry-editor-content .poetry-line::before {
          counter-increment: poetry-line;
          content: counter(poetry-line);
          position: absolute;
          left: 0;
          width: 2rem;
          text-align: right;
          color: var(--color-text-ghost, #6b6560);
          font-family: var(--font-mono, "IBM Plex Mono", monospace);
          font-size: 0.7rem;
          line-height: 1.85em;
          opacity: 0.5;
          user-select: none;
          pointer-events: none;
        }

        /* ── Formatting marks ──────────────────────────────── */
        .poetry-editor-content strong {
          font-weight: 700;
          color: var(--color-paper, #f5f0e8);
        }

        .poetry-editor-content em {
          font-style: italic;
          color: var(--color-amber, #d4a574);
        }

        .poetry-editor-content s {
          text-decoration: line-through;
          opacity: 0.6;
        }

        /* ── Selection ─────────────────────────────────────── */
        .poetry-editor-content ::selection {
          background-color: var(--color-amber, #d4a574);
          color: var(--color-void, #0d0c0b);
        }
      `}</style>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wrap plain HTML content in stanza/line structure if it isn't already.
 * Accepts existing stanza-wrapped content as-is.
 * Converts <p> tags and plain text into stanza > poetryLine structure.
 */
function wrapInStanzas(html: string): string {
  if (!html || html === "<p></p>") {
    return '<div class="stanza"><div class="poetry-line"></div></div>';
  }

  // Already wrapped in stanzas (handle both single and double quotes)
  if (html.includes('class="stanza"') || html.includes("class='stanza'")) {
    return html;
  }

  // Normalize: convert <p>...</p> to lines
  const normalized = html
    .replace(/<p><\/p>/g, "\n\n")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  // Split into stanzas by double newlines
  const stanzas = normalized
    .split("\n\n")
    .filter((s) => s.trim().length > 0);

  if (stanzas.length === 0) {
    return '<div class="stanza"><div class="poetry-line"></div></div>';
  }

  return stanzas
    .map((stanza) => {
      const lines = stanza
        .split("\n")
        .filter(
          (l) => l.length > 0 || stanza.split("\n").length === 1
        );
      const lineHtml =
        lines.length > 0
          ? lines
              .map((l) => `<div class="poetry-line">${l.trim()}</div>`)
              .join("")
          : '<div class="poetry-line"></div>';
      return `<div class="stanza">${lineHtml}</div>`;
    })
    .join("");
}
