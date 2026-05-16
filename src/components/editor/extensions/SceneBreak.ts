"use client";

import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";

export type SceneBreakStyleKey = "asterism" | "fleuron" | "dots" | "line" | "text-line" | "space";

export const sceneBreakStyles: Array<{ key: SceneBreakStyleKey; label: string; ch: string }> = [
  { key: "asterism", label: "Asterism", ch: "\u2042" },
  { key: "fleuron", label: "Fleuron", ch: "\u2767" },
  { key: "dots", label: "Dots", ch: "\u2022 \u2022 \u2022" },
  { key: "line", label: "Line", ch: "\u2014\u2014\u2014" },
  { key: "text-line", label: "Text Line", ch: "Text" },
  { key: "space", label: "Space", ch: "(blank)" },
];

function normalizeSceneBreakStyle(value: unknown): SceneBreakStyleKey | null {
  return sceneBreakStyles.some((style) => style.key === value) ? (value as SceneBreakStyleKey) : null;
}

export const SceneBreak = Node.create({
  name: "horizontalRule",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => normalizeSceneBreakStyle(element.getAttribute("data-scene-break-style")),
        renderHTML: (attributes) => {
          const style = normalizeSceneBreakStyle(attributes.style);
          return style ? { "data-scene-break-style": style } : {};
        },
      },
      label: {
        default: "ADD BEAT",
        parseHTML: (element) => element.getAttribute("data-scene-break-label") || "ADD BEAT",
        renderHTML: (attributes) => {
          if (normalizeSceneBreakStyle(attributes.style) !== "text-line") return {};
          const label = typeof attributes.label === "string" && attributes.label.trim()
            ? attributes.label.trim()
            : "ADD BEAT";
          return { "data-scene-break-label": label };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "hr" },
      { tag: "div.scene-break" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const label =
      typeof HTMLAttributes["data-scene-break-label"] === "string" &&
      HTMLAttributes["data-scene-break-label"].trim()
        ? HTMLAttributes["data-scene-break-label"].trim()
        : "ADD BEAT";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "scene-break",
        contenteditable: "false",
        "data-scene-break": "true",
      }),
      ["span", { class: "scene-break-label" }, label],
    ];
  },

  addCommands() {
    return {
      setHorizontalRule:
        (attributes?: { style?: SceneBreakStyleKey | null; label?: string }) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                style: attributes?.style ?? null,
                label: attributes?.label ?? "ADD BEAT",
              },
            })
            .createParagraphNear()
            .run(),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^(?:---|—-|___|\*\*\*)$/,
        type: this.type,
      }),
    ];
  },
});
