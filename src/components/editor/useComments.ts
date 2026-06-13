"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  CommentThread,
  createCommentThread,
  addReply,
} from "@/client/comments";

/**
 * The comments subsystem, lifted out of the editor page.
 *
 * Threads are anchored to the manuscript by a Tiptap CommentMark that stores
 * only the thread id — the mark rides along with its text as the writer edits,
 * so the live document is the source of truth for *where* a comment sits. The
 * DB keeps `fromPos`/`toPos` purely to apply the mark on first paint. This hook
 * owns the thread data, the create popover, and the five mutations; the margin
 * dots (MarginaliaLayer) and the ⌘K list are pure consumers of what it returns.
 */

export type EditorCommentsResponse = {
  data?: CommentThread[];
  threadId?: string;
};

export interface CommentPopoverState {
  position: { x: number; y: number };
  selectedText: string;
  from: number;
  to: number;
}

function storageKey(storyId: string, chapterId: string) {
  return `quiloria-editor-comments-${storyId}-${chapterId}`;
}

function loadEditorComments(storyId: string, chapterId: string): CommentThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(storyId, chapterId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CommentThread[]) : [];
  } catch {
    return [];
  }
}

function saveEditorComments(
  storyId: string,
  chapterId: string,
  threads: CommentThread[]
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(storyId, chapterId),
      JSON.stringify(threads)
    );
  } catch {
    // Storage full / unavailable — the API copy remains canonical.
  }
}

interface UseCommentsArgs {
  editor: Editor | null;
  storyId: string;
  chapterId: string | null;
}

export function useComments({ editor, storyId, chapterId }: UseCommentsArgs) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [commentPopover, setCommentPopover] =
    useState<CommentPopoverState | null>(null);
  const loadedChapter = useRef<string | null>(null);

  // Load on chapter switch — localStorage first (offline cache), then the API
  // overwrites once it answers.
  useEffect(() => {
    if (!chapterId) return;
    const localThreads = loadEditorComments(storyId, chapterId);
    setThreads(localThreads);
    loadedChapter.current = chapterId;
    setActiveThreadId(null);
    setCommentPopover(null);

    let cancelled = false;
    fetch(`/api/stories/${storyId}/chapters/${chapterId}/editor-comments`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as EditorCommentsResponse;
        if (!cancelled && Array.isArray(json.data)) {
          setThreads(json.data);
          saveEditorComments(storyId, chapterId, json.data);
        }
      })
      .catch(() => {
        // Local comments already loaded as a fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [storyId, chapterId]);

  // Mirror thread changes into the offline cache for the loaded chapter.
  useEffect(() => {
    if (!chapterId) return;
    if (loadedChapter.current !== chapterId) return;
    saveEditorComments(storyId, chapterId, threads);
  }, [storyId, chapterId, threads]);

  const handleAddComment = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    const selectedText = editor.state.doc.textBetween(from, to, " ");

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;
    const rect = domSelection.getRangeAt(0).getBoundingClientRect();

    setCommentPopover({
      position: { x: rect.left + rect.width / 2, y: rect.bottom },
      selectedText,
      from,
      to,
    });
  }, [editor]);

  // One round-trip to the editor-comments route. On success the server's full
  // thread list becomes canonical (and is mirrored to the offline cache); the
  // parsed body is returned so callers can read e.g. a freshly-minted threadId.
  // A null return — no chapter yet, network error, or a non-OK response — is
  // each caller's cue to fall back to an optimistic local update.
  const persist = useCallback(
    async (
      method: "POST" | "PATCH" | "DELETE",
      body: Record<string, unknown>
    ): Promise<EditorCommentsResponse | null> => {
      if (!chapterId) return null;
      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}/editor-comments`,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) return null;
        const json = (await res.json()) as EditorCommentsResponse;
        if (Array.isArray(json.data)) {
          setThreads(json.data);
          saveEditorComments(storyId, chapterId, json.data);
        }
        return json;
      } catch {
        return null;
      }
    },
    [chapterId, storyId]
  );

  const handleSubmitComment = useCallback(
    async (commentText: string) => {
      if (!editor || !commentPopover) return;

      let thread = createCommentThread(commentPopover.selectedText, commentText);
      const json = await persist("POST", {
        quotedText: commentPopover.selectedText,
        commentText,
        from: commentPopover.from,
        to: commentPopover.to,
      });
      if (json?.threadId) thread = { ...thread, id: json.threadId };
      if (!json) setThreads((prev) => [...prev, thread]); // offline fallback

      editor
        .chain()
        .focus()
        .setTextSelection({ from: commentPopover.from, to: commentPopover.to })
        .setComment(thread.id)
        .run();

      setActiveThreadId(thread.id);
      setCommentPopover(null);
    },
    [editor, commentPopover, persist]
  );

  const handleReply = useCallback(
    async (threadId: string, text: string) => {
      const json = await persist("PATCH", { threadId, replyText: text });
      if (!json) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? addReply(t, text) : t))
        );
      }
    },
    [persist]
  );

  // Strip a thread's marks from the text in one transaction — no caret theft.
  // Used on resolve and delete alike: a closed note has no business still
  // highlighting the manuscript.
  const removeCommentMarks = useCallback(
    (threadId: string) => {
      if (!editor) return;
      const { state } = editor;
      const { tr } = state;
      let changed = false;
      state.doc.descendants((node, pos) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.threadId === threadId) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
            changed = true;
          }
        });
      });
      if (changed) editor.view.dispatch(tr);
    },
    [editor]
  );

  const handleResolve = useCallback(
    async (threadId: string) => {
      removeCommentMarks(threadId);
      if (activeThreadId === threadId) setActiveThreadId(null);
      const json = await persist("PATCH", { threadId, resolved: true });
      if (!json) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, resolved: true } : t))
        );
      }
    },
    [persist, removeCommentMarks, activeThreadId]
  );

  const handleDelete = useCallback(
    async (threadId: string) => {
      const json = await persist("DELETE", { threadId });
      if (!json) setThreads((prev) => prev.filter((t) => t.id !== threadId));
      removeCommentMarks(threadId);
      if (activeThreadId === threadId) setActiveThreadId(null);
    },
    [persist, removeCommentMarks, activeThreadId]
  );

  const handleCancelComment = useCallback(() => setCommentPopover(null), []);

  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    commentPopover,
    handleAddComment,
    handleSubmitComment,
    handleReply,
    handleResolve,
    handleDelete,
    handleCancelComment,
  };
}
