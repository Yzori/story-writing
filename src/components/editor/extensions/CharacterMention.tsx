"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// ── Mention Node ────────────────────────────────────────────
// Inline atom node that renders as a styled <span> with the character's color.

export interface MentionCharacter {
  id: string;
  name: string;
  color: string;
}

export const mentionPluginKey = new PluginKey("characterMention");

export const CharacterMention = Node.create({
  name: "characterMention",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      name: { default: null },
      color: { default: "#D4A574" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention": HTMLAttributes.id,
        class: "character-mention",
        style: `background: ${HTMLAttributes.color}18; color: ${HTMLAttributes.color}; padding: 0 4px; border-radius: 4px; font-weight: 500;`,
      }),
      `@${HTMLAttributes.name}`,
    ];
  },

  addCommands() {
    return {
      insertMention:
        (attrs: { id: string; name: string; color: string }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .insertContent(" ")
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    const characters: MentionCharacter[] =
      this.options.characters || [];

    return [
      new Plugin({
        key: mentionPluginKey,
        state: {
          init() {
            return {
              active: false,
              query: "",
              from: 0,
              characters,
            };
          },
          apply(tr, prev) {
            // Check for meta updates (character list changes)
            const meta = tr.getMeta(mentionPluginKey);
            if (meta) {
              return { ...prev, ...meta };
            }

            // If no selection change or not active trigger, recompute
            const { selection } = tr;
            if (!selection.empty) {
              return { ...prev, active: false, query: "" };
            }

            const $pos = selection.$from;
            const textBefore = $pos.parent.textBetween(
              0,
              $pos.parentOffset,
              undefined,
              "\ufffc"
            );

            // Find the last @ that starts a mention query
            const match = textBefore.match(/@([\w\s'\-\u00C0-\u024F]*)$/);
            if (match) {
              const query = match[1];
              const from = $pos.start() + $pos.parentOffset - match[0].length;
              return {
                ...prev,
                active: true,
                query,
                from,
                characters: prev.characters,
              };
            }

            return { ...prev, active: false, query: "" };
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = mentionPluginKey.getState(view.state);
            if (!state?.active) return false;

            // Let the React dropdown handle these keys via window event
            if (
              event.key === "ArrowDown" ||
              event.key === "ArrowUp" ||
              event.key === "Enter" ||
              event.key === "Tab" ||
              event.key === "Escape"
            ) {
              // Dispatch a custom event for the dropdown to handle
              window.dispatchEvent(
                new CustomEvent("mention-keydown", { detail: event.key })
              );
              event.preventDefault();
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },

  addOptions() {
    return {
      characters: [] as MentionCharacter[],
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    characterMention: {
      insertMention: (attrs: {
        id: string;
        name: string;
        color: string;
      }) => ReturnType;
    };
  }
}

export default CharacterMention;
