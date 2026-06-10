"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryProject } from "@/types/editor";

export type ChapterSaveState = "idle" | "saving" | "saved" | "error" | "conflict";

type PendingSave = {
  content: string;
  version: number;
};

export type LocalChapterDraft = {
  content: string;
  version: number;
  savedAt: string;
  reason: "autosave" | "failed-save" | "conflict";
};

type ChapterSaveResult = {
  chapterId: string;
  content: string;
  version: number;
  status: number;
  ok: boolean;
  json: {
    data?: {
      version?: number;
      id?: string;
      serverVersion?: number;
      clientVersion?: number;
    };
  } | null;
};

type UseChapterAutosaveOptions = {
  storyId: string;
  updateProject: (updater: (prev: StoryProject) => StoryProject) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
};

function conflictStorageKey(storyId: string, chapterId: string) {
  return `quiloria-conflict-${storyId}-${chapterId}`;
}

export function clearConflictChapterDraft(storyId: string, chapterId: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(conflictStorageKey(storyId, chapterId));
  } catch {
    // Best effort cleanup only.
  }
}

export function localDraftStorageKey(storyId: string, chapterId: string) {
  return `quiloria-draft-${storyId}-${chapterId}`;
}

export function readLocalChapterDraft(storyId: string, chapterId: string): LocalChapterDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(localDraftStorageKey(storyId, chapterId));
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<LocalChapterDraft>;
    if (typeof parsed.content !== "string") return null;
    if (typeof parsed.version !== "number") return null;
    if (typeof parsed.savedAt !== "string") return null;
    if (
      parsed.reason !== "autosave" &&
      parsed.reason !== "failed-save" &&
      parsed.reason !== "conflict"
    ) {
      return null;
    }

    return parsed as LocalChapterDraft;
  } catch {
    return null;
  }
}

export function writeLocalChapterDraft(
  storyId: string,
  chapterId: string,
  draft: Omit<LocalChapterDraft, "savedAt">,
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      localDraftStorageKey(storyId, chapterId),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Storage can be full or disabled; autosave still attempts the server write.
  }
}

export function clearLocalChapterDraft(storyId: string, chapterId: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(localDraftStorageKey(storyId, chapterId));
  } catch {
    // Best effort cleanup only.
  }
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

function reconcileSuccessfulResults(
  pendingSaves: Map<string, PendingSave>,
  storyId: string,
  results: ChapterSaveResult[],
) {
  const successfulResults = results.filter((result) => result.ok);
  reconcileSuccessfulChapterSaves(pendingSaves, successfulResults);

  for (const result of successfulResults) {
    if (!pendingSaves.has(result.chapterId)) {
      clearLocalChapterDraft(storyId, result.chapterId);
      clearConflictChapterDraft(storyId, result.chapterId);
    }
  }
}

function syncChapterVersions(
  updateProject: (updater: (prev: StoryProject) => StoryProject) => void,
  results: ChapterSaveResult[],
) {
  const versions = new Map<string, number>();
  for (const { chapterId, json, status } of results) {
    const version = status === 409 ? json?.data?.serverVersion : json?.data?.version;
    if (typeof version === "number") {
      versions.set(chapterId, version);
    }
  }

  if (versions.size === 0) return;

  updateProject((prev) => ({
    ...prev,
    chapters: prev.chapters.map((chapter) => {
      const version = versions.get(chapter.id);
      return version === undefined ? chapter : { ...chapter, version };
    }),
  }));
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
  // Lets runFlush's internal re-flush timer go through the serialized
  // flushPendingSaves path (flushPendingSaves is defined after runFlush).
  const flushPendingSavesRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

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
          try {
            json = await response.clone().json();
          } catch {
            // Ignore malformed response bodies; status still drives behavior.
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
        syncChapterVersions(updateProject, results);
        reconcileSuccessfulResults(pendingSaves.current, storyId, results);

        for (const { chapterId, content: snapshotContent, version, status } of results) {
          if (status !== 409) continue;
          const current = pendingSaves.current.get(chapterId);
          if (current && current.content === snapshotContent) {
            writeLocalChapterDraft(storyId, chapterId, {
              content: snapshotContent,
              version,
              reason: "conflict",
            });
            preserveConflictDraft(storyId, chapterId, snapshotContent);
            pendingSaves.current.delete(chapterId);
          }
        }

        failedSaves.current.clear();
        for (const result of results) {
          if (!result.ok && result.status !== 409) {
            const current = pendingSaves.current.get(result.chapterId);
            // Skip when newer content is already queued — the next flush
            // covers it, and the draft holds the newer keystrokes.
            if (current && current.content !== result.content) continue;
            failedSaves.current.set(result.chapterId, {
              content: result.content,
              version: result.version,
            });
            writeLocalChapterDraft(storyId, result.chapterId, {
              content: result.content,
              version: result.version,
              reason: "failed-save",
            });
          }
        }
        setSaveState("conflict");
        toast("Server version changed. Your draft is saved locally.", "error");
        return false;
      }

      // Reconcile successful saves even when other chapters failed, so saved
      // chapters drop stale baseVersions instead of false-conflicting later.
      syncChapterVersions(updateProject, results);
      reconcileSuccessfulResults(pendingSaves.current, storyId, results);
      failedSaves.current.clear();

      if (results.every((result) => result.ok)) {
        if (pendingSaves.current.size > 0) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            void flushPendingSavesRef.current();
          }, 1000);
          setSaveState("saving");
        } else {
          setSaveState("saved");
          savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
        }
        return true;
      }

      // Mixed results: only the genuinely failed chapters go to failedSaves.
      for (const { chapterId, content, version, ok } of results) {
        if (ok) continue;
        const current = pendingSaves.current.get(chapterId);
        if (!current || current.content === content) {
          failedSaves.current.set(chapterId, { content, version });
          writeLocalChapterDraft(storyId, chapterId, {
            content,
            version,
            reason: "failed-save",
          });
        }
      }
      setSaveState("error");
      return false;
    } catch {
      // Fall through to failure handling.
    }

    for (const { chapterId, content, version } of snapshot) {
      const current = pendingSaves.current.get(chapterId);
      if (!current || current.content === content) {
        failedSaves.current.set(chapterId, { content, version });
        writeLocalChapterDraft(storyId, chapterId, {
          content,
          version,
          reason: "failed-save",
        });
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

  useEffect(() => {
    flushPendingSavesRef.current = flushPendingSaves;
  }, [flushPendingSaves]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushPendingSaves();
    }, 1000);
  }, [flushPendingSaves]);

  const queueSave = useCallback((chapterId: string, content: string, version: number) => {
    pendingSaves.current.set(chapterId, { content, version });
    writeLocalChapterDraft(storyId, chapterId, {
      content,
      version,
      reason: "autosave",
    });
  }, [storyId]);

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
      // Merge failed snapshots back into the pending queue — preferring any
      // newer content the user has typed since the failure — and go through
      // flushPendingSaves so the retry serializes with in-flight flushes
      // instead of racing them with a second PATCH for the same chapter.
      for (const [chapterId, entry] of failedSaves.current.entries()) {
        if (!pendingSaves.current.has(chapterId)) {
          pendingSaves.current.set(chapterId, entry);
        }
      }
      failedSaves.current.clear();
      if (pendingSaves.current.size === 0) return;

      await flushPendingSaves();
    } finally {
      isRetrying.current = false;
    }
  }, [flushPendingSaves]);

  return {
    saveState,
    setSaveState,
    queueSave,
    scheduleSave,
    flushPendingSaves,
    retryFailedSaves,
  };
}
