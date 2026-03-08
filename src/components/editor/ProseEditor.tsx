"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import FloatingToolbar from "./FloatingToolbar";
import SlashMenu from "./SlashMenu";
import { IllustrationBlock } from "./extensions/IllustrationBlock";
import { CommentMark } from "./extensions/CommentMark";

interface ProseEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  onEditorReady: (editor: Editor) => void;
  onComment?: () => void;
  isFocusMode: boolean;
}

export default function ProseEditor({
  content,
  onUpdate,
  onEditorReady,
  onComment,
  isFocusMode,
}: ProseEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {},
        dropcursor: { color: "#C48B4A", width: 2 },
      }),
      Placeholder.configure({
        placeholder: "Begin your story... (type / for commands)",
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: false }),
      Underline,
      IllustrationBlock,
      CommentMark,
    ],
    content,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
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

  // Sync content when switching chapters
  const setContent = useCallback(
    (newContent: string) => {
      if (editor && !editor.isDestroyed) {
        // Only update if content is actually different to avoid cursor jumps
        const currentHtml = editor.getHTML();
        if (currentHtml !== newContent) {
          editor.commands.setContent(newContent || "");
        }
      }
    },
    [editor]
  );

  useEffect(() => {
    setContent(content);
  }, [content, setContent]);

  // Expose editor to parent
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${isFocusMode ? "focus-mode" : ""}`}>
      <div className="max-w-[680px] mx-auto px-8 py-16 min-h-full">
        <FloatingToolbar editor={editor} onComment={onComment} />
        <SlashMenu editor={editor} />
        <EditorContent
          editor={editor}
          className="prose-editor-content"
        />
      </div>
    </div>
  );
}
