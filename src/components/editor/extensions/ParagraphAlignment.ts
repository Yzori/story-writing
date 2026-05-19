"use client";

import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export type ParagraphAlignmentKey = "left" | "center" | "right" | "justify";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphAlignment: {
      setParagraphAlignment: (alignment: ParagraphAlignmentKey) => ReturnType;
      unsetParagraphAlignment: () => ReturnType;
    };
  }
}

const ALIGNMENTS = new Set<ParagraphAlignmentKey>(["left", "center", "right", "justify"]);

function normalizeAlignment(value: unknown): ParagraphAlignmentKey | null {
  return typeof value === "string" && ALIGNMENTS.has(value as ParagraphAlignmentKey)
    ? (value as ParagraphAlignmentKey)
    : null;
}

export const ParagraphAlignment = Extension.create({
  name: "paragraphAlignment",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => normalizeAlignment(element.style.textAlign),
            renderHTML: (attributes) => {
              const alignment = normalizeAlignment(attributes.textAlign);
              return alignment && alignment !== "left"
                ? { style: `text-align: ${alignment}` }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphAlignment:
        (alignment) =>
        ({ state, dispatch }) => {
          const nextAlignment = normalizeAlignment(alignment);
          if (!nextAlignment) return false;

          const { from, to, empty } = state.selection;
          let changed = false;
          const tr = state.tr;
          const textAlign = nextAlignment === "left" ? null : nextAlignment;

          if (empty) {
            const anchor = state.selection.$from;
            for (let depth = anchor.depth; depth > 0; depth -= 1) {
              const node = anchor.node(depth);
              if (node.type.name !== "paragraph") continue;
              const pos = anchor.before(depth);
              if (node.attrs.textAlign !== textAlign) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign });
                dispatch?.(tr.scrollIntoView());
              }
              return true;
            }
          }

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name !== "paragraph") return;
            if (node.attrs.textAlign === textAlign) return;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign });
            changed = true;
          });

          if (!changed && state.selection instanceof TextSelection) {
            const anchor = state.selection.$from;
            for (let depth = anchor.depth; depth > 0; depth -= 1) {
              const node = anchor.node(depth);
              if (node.type.name !== "paragraph") continue;
              const pos = anchor.before(depth);
              if (node.attrs.textAlign === textAlign) return true;
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign });
              changed = true;
              break;
            }
          }

          if (!changed) return true;
          dispatch?.(tr.scrollIntoView());
          return true;
        },
      unsetParagraphAlignment:
        () =>
        ({ commands }) =>
          commands.setParagraphAlignment("left"),
    };
  },
});
