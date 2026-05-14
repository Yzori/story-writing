"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryProject } from "@/types/editor";

export type ChapterSaveState = "idle" | "saving" | "saved" | "error" | "conflict";

type PendingSave = {
  content: string;
  version: number;
};

type ChapterSaveResult = {
  chapterId: string;
  content: string;
  version: number;
  status: number;
  ok: boolean;
  json: { data?: { version?: number; id?: string } } | null;
};

type UseChapterAutosaveOptions = {
  storyId: string;
  updateProject: (updater: (prev: StoryProject) => StoryProject) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
};

function conflictStorageKey(storyId: string, chapterId: string) {
  return `quiloria-conflict-${storyId}-${chapterId}`;
}

function preserveConflictDraft(storyId: string, chapterId: string, content: string) {
  try {
    localStorage.setItem(
      conflictStorageKey(storyId, chapterId),
      JSON.stringify({ content, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Storage can be full or disabled; the UI still reports the conflict.
  }
}

export function reconcileSuccessfulChapterSaves(
  pendingSaves: Map<string, PendingSave>,
  results: ChapterSaveResult[],
) {
  for (const { chapterId, content: snapshotContent, json } of results) {
    const newVersion = json?.data?.version;
    const current = pendingSaves.get(chapterId);
    if (!current) continue;

    if (current.content === snapshotContent) {
      pendingSaves.delete(chapterId);
    } else if (typeof newVersion === "number") {
      pendingSaves.set(chapterId, {
        content: current.content,
        version: newVersion,
      });
    }
  }
}

export function useChapterAutosave({
  storyId,
  updateProject,
  toast,
}: UseChapterAutosaveOptions) {
  const [saveState, setSaveState] = useState<ChapterSaveState>("idle");
  const pendingSaves = useRef<Map<string, PendingSave>>(new Map());
  const failedSaves = useRef<Map<string, PendingSave>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const flushPromise = useRef<Promise<boolean> | null>(null);
  const isRetrying = useRef(false);

  useEffect(() => {
    const pending = pendingSaves.current;

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);

      const entries = Array.from(pending.entries());
      for (const [chapterId, { content, version }] of entries) {
        fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, baseVersion: version }),
          keepalive: true,
        }).catch(() => {});
      }
      pending.clear();
    };
  }, [storyId]);

  const runFlush = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const snapshot = Array.from(pendingSaves.current.entries()).map(
      ([chapterId, entry]) => ({
        chapterId,
        content: entry.content,
        version: entry.version,
      }),
    );
    if (snapshot.length === 0) return true;

    setSaveState("saving");
    if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);

    try {
      const results: ChapterSaveResult[] = await Promise.all(
        snapshot.map(async ({ chapterId, content, version }) => {
          const response = await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, baseVersion: version }),
          });

          let json: ChapterSaveResult["json"] = null;
          if (response.ok) {
            try {
              json = await response.clone().json();
            } catch {
              // Ignore malformed response bodies; status still drives behavior.
            }
          }

          return {
            chapterId,
            content,
            version,
            status: response.status,
            ok: response.ok,
            json,
          };
        }),
      );

      if (results.some((result) => result.status === 401)) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return false;
      }

      if (results.some((result) => result.status === 409)) {
        for (const { chapterId, content: snapshotContent, status } of results) {
          if (status !== 409) continue;
          const current = pendingSaves.current.get(chapterId);
          if (current && current.content === snapshotContent) {
            preserveConflictDraft(storyId, chapterId, snapshotContent);
            pendingSaves.current.delete(chapterId);
          }
        }
        failedSaves.current.clear();
        setSaveState("conflict");
        toast("Another user edited this chapter. Your draft has been saved locally.", "error");
        return false;
      }

      if (results.every((result) => result.ok)) {
        for (const { chapterId, json } of results) {
          const newVersion = json?.data?.version;
          if (typeof newVersion === "number") {
            updateProject((prev) => ({
              ...prev,
              chapters: prev.chapters.map((chapter) =>
                chapter.id === chapterId ? { ...chapter, version: newVersion } : chapter,
              ),
            }));
          }
        }

        reconcileSuccessfulChapterSaves(pendingSaves.current, results);
        failedSaves.current.clear();

        if (pendingSaves.current.size > 0) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            void runFlush();
          }, 1000);
          setSaveState("saving");
        } else {
          setSaveState("saved");
          savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
        }
        return true;
      }
    } catch {
      // Fall through to failure handling.
    }

    for (const { chapterId, content, version } of snapshot) {
      const current = pendingSaves.current.get(chapterId);
      if (!current || current.content === content) {
        failedSaves.current.set(chapterId, { content, version });
      }
    }
    setSaveState("error");
    return false;
  }, [storyId, toast, updateProject]);

  const flushPendingSaves = useCallback((): Promise<boolean> => {
    const prior = flushPromise.current;
    const next = (async (): Promise<boolean> => {
      const priorOk = prior ? await prior.catch(() => false) : true;
      if (!priorOk && pendingSaves.current.size === 0) return false;
      return runFlush();
    })();

    flushPromise.current = next;
    next.finally(() => {
      if (flushPromise.current === next) flushPromise.current = null;
    });
    return next;
  }, [runFlush]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushPendingSaves();
    }, 1000);
  }, [flushPendingSaves]);

  const queueSave = useCallback((chapterId: string, content: string, version: number) => {
    pendingSaves.current.set(chapterId, { content, version });
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (pendingSaves.current.size > 0) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const retryFailedSaves = useCallback(async () => {
    if (isRetrying.current) return;
    isRetrying.current = true;

    try {
      const entries = Array.from(failedSaves.current.entries());
      if (entries.length === 0) return;

      setSaveState("saving");
      const responses = await Promise.all(
        entries.map(([chapterId, { content, version }]) =>
          fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, baseVersion: version }),
          }),
        ),
      );

      if (responses.some((response) => response.status === 401)) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (responses.some((response) => response.status === 409)) {
        for (const [chapterId, { content }] of entries) {
          preserveConflictDraft(storyId, chapterId, content);
        }
        failedSaves.current.clear();
        setSaveState("conflict");
        toast("Another user edited this chapter. Your draft has been saved locally.", "error");
        return;
      }

      if (responses.every((response) => response.ok)) {
        failedSaves.current.clear();
        setSaveState("saved");
        if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
        savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    } finally {
      isRetrying.current = false;
    }
  }, [storyId, toast]);

  return {
    saveState,
    setSaveState,
    queueSave,
    scheduleSave,
    flushPendingSaves,
    retryFailedSaves,
  };
}
