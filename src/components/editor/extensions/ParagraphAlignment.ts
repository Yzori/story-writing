"use client";

import { Extension } from "@tiptap/core";

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

          const { from, to } = state.selection;
          let changed = false;
          const tr = state.tr;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name !== "paragraph") return;
            const textAlign = nextAlignment === "left" ? null : nextAlignment;
            if (node.attrs.textAlign === textAlign) return;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign });
            changed = true;
          });

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

