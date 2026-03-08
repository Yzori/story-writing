import { Mark, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (threadId: string) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: "comment",

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-thread-id"),
        renderHTML: (attributes: Record<string, string>) => {
          if (!attributes.threadId) return {};
          return { "data-thread-id": attributes.threadId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-thread-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (threadId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { threadId });
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default CommentMark;
