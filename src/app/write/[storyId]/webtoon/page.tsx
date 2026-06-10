"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, ArrowLeft, MoreHorizontal } from "lucide-react";
import WebtoonEditor from "@/components/editor/WebtoonEditor";
import EditorErrorBoundary from "@/components/editor/EditorErrorBoundary";
import { useToast } from "@/components/shared/Toast";
import { useStoryChapters, type StoryChapter } from "@/hooks/use-story-chapters";
import { editorHrefFor } from "@/lib/editor-links";

interface PublishDialogState {
  open: boolean;
  phase: "confirm" | "publishing" | "success";
  chapterId: string;
  chapterTitle: string;
  notifiedFollowers: number;
  shareUrl: string;
  linkCopied: boolean;
}

const CLOSED_PUBLISH_DIALOG: PublishDialogState = {
  open: false,
  phase: "confirm",
  chapterId: "",
  chapterTitle: "",
  notifiedFollowers: 0,
  shareUrl: "",
  linkCopied: false,
};

/**
 * Standalone webtoon editor. A vertical-panel comic is not a text document, so
 * it gets its own full-bleed workspace (wide panel board + episode rail) instead
 * of being squeezed into the novel cockpit's 680px column. Mirrors the co-op
 * route's standalone pattern; reuses {@link useStoryChapters} for loading and the
 * existing {@link WebtoonEditor} for the panel board + its API-backed CRUD.
 */
export default function WebtoonWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const storyId = String(params.storyId);
  const { toast } = useToast();

  const { story, chapters, activeChapterId, setActiveChapterId, loading, error } =
    useStoryChapters(storyId);

  const [localChapters, setLocalChapters] = useState<StoryChapter[] | null>(null);
  const [creating, setCreating] = useState(false);

  // Episode management UI state
  const [episodeMenu, setEpisodeMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<StoryChapter | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StoryChapter | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState<StoryChapter | null>(null);
  const [unpublishBusy, setUnpublishBusy] = useState(false);
  const [publishDialog, setPublishDialog] = useState<PublishDialogState>(CLOSED_PUBLISH_DIALOG);

  const episodes = localChapters ?? chapters;
  const activeEpisode = episodes.find((c) => c.id === activeChapterId) ?? episodes[0] ?? null;

  const updateEpisodes = useCallback(
    (fn: (eps: StoryChapter[]) => StoryChapter[]) => {
      setLocalChapters((prev) => fn(prev ?? chapters));
    },
    [chapters],
  );

  // ── Inverse format guard ───────────────────────────────────
  // /write/[id] redirects webtoon stories here; everything else belongs in its
  // canonical editor. Without this, a novel/poetry story opened at /webtoon
  // would mount the panel board. No loop: /write/[id] only redirects when
  // format === "webtoon", and we only redirect when it isn't.
  const wrongFormat = !!story && story.format !== "webtoon";
  useEffect(() => {
    if (story && story.format !== "webtoon") {
      router.replace(editorHrefFor(story));
    }
  }, [story, router]);

  // ── Script persistence (chapters.outline), debounced ──────
  // One pending save at a time, keyed by chapter. If a save arrives for a
  // DIFFERENT episode while one is pending, the pending save is flushed
  // immediately (never discarded). Pending work is also flushed on episode
  // switch and on unmount, so fast episode-hopping can't drop beats.
  const pendingScript = useRef<{ chapterId: string; outline: string } | null>(null);
  const scriptSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scriptSaveError, setScriptSaveError] = useState(false);

  const flushScriptSave = useCallback(async (): Promise<boolean> => {
    if (scriptSaveTimer.current) {
      clearTimeout(scriptSaveTimer.current);
      scriptSaveTimer.current = null;
    }
    const pending = pendingScript.current;
    if (!pending) return true;
    pendingScript.current = null;
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${pending.chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: pending.outline }),
      });
      if (!res.ok) throw new Error("Script save failed");
      setScriptSaveError(false);
      return true;
    } catch {
      setScriptSaveError(true);
      return false;
    }
  }, [storyId]);

  const saveScript = (chapterId: string, outline: string) => {
    // A different episode's save is still pending — flush it now instead of
    // silently discarding it with the shared timer.
    if (pendingScript.current && pendingScript.current.chapterId !== chapterId) {
      void flushScriptSave();
    }
    if (scriptSaveTimer.current) clearTimeout(scriptSaveTimer.current);
    pendingScript.current = { chapterId, outline };
    scriptSaveTimer.current = setTimeout(() => {
      scriptSaveTimer.current = null;
      void flushScriptSave();
    }, 800);
    updateEpisodes((eps) => eps.map((c) => (c.id === chapterId ? { ...c, outline } : c)));
  };

  // Flush any pending script save when the studio unmounts (keepalive so the
  // request survives navigation).
  useEffect(() => {
    return () => {
      if (scriptSaveTimer.current) clearTimeout(scriptSaveTimer.current);
      const pending = pendingScript.current;
      if (pending) {
        pendingScript.current = null;
        fetch(`/api/stories/${storyId}/chapters/${pending.chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outline: pending.outline }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [storyId]);

  const selectEpisode = (id: string) => {
    if (id !== activeEpisode?.id) void flushScriptSave();
    setActiveChapterId(id);
  };

  // ── Episode CRUD ───────────────────────────────────────────

  const addEpisode = async () => {
    if (creating) return;
    setCreating(true);
    void flushScriptSave();
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Episode ${episodes.length + 1}` }),
      });
      const json = await res.json();
      const created = json?.data;
      if (!res.ok || !created?.id) {
        toast(json?.error?.message || "Couldn’t add an episode", "error");
        return;
      }
      const next: StoryChapter = {
        id: created.id,
        title: created.title || `Episode ${episodes.length + 1}`,
        sortOrder: created.sortOrder ?? episodes.length,
        status: created.status || "draft",
        content: "",
        outline: "",
        wordCount: 0,
      };
      updateEpisodes((eps) => [...eps, next]);
      setActiveChapterId(created.id);
    } catch {
      toast("Network error — please try again", "error");
    } finally {
      setCreating(false);
    }
  };

  const openRename = (episode: StoryChapter) => {
    setEpisodeMenu(null);
    setRenameTarget(episode);
    setRenameValue(episode.title);
  };

  const submitRename = async () => {
    const target = renameTarget;
    const newTitle = renameValue.trim();
    if (!target || !newTitle || newTitle === target.title) {
      setRenameTarget(null);
      return;
    }
    const oldTitle = target.title;
    // Optimistic, same as the cockpit's handleRenameChapter (PATCH { title }).
    updateEpisodes((eps) => eps.map((c) => (c.id === target.id ? { ...c, title: newTitle } : c)));
    setRenameTarget(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Rename failed");
    } catch {
      updateEpisodes((eps) => eps.map((c) => (c.id === target.id ? { ...c, title: oldTitle } : c)));
      toast("Couldn’t rename the episode", "error");
    }
  };

  const openDelete = (episode: StoryChapter) => {
    setEpisodeMenu(null);
    if (episodes.length <= 1) {
      toast("Cannot delete the only episode", "error");
      return;
    }
    setDeleteTarget(episode);
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target || deleteBusy) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      // Drop any pending script save for the deleted episode.
      if (pendingScript.current?.chapterId === target.id) {
        pendingScript.current = null;
        if (scriptSaveTimer.current) {
          clearTimeout(scriptSaveTimer.current);
          scriptSaveTimer.current = null;
        }
      }
      const remaining = episodes.filter((c) => c.id !== target.id);
      updateEpisodes((eps) => eps.filter((c) => c.id !== target.id));
      if (activeEpisode?.id === target.id && remaining[0]) {
        setActiveChapterId(remaining[0].id);
      }
      setDeleteTarget(null);
      toast(`“${target.title}” deleted`, "info");
    } catch {
      toast("Couldn’t delete the episode", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Publish / unpublish (same API + payloads as the cockpit) ──

  const openPublishDialog = (episode: StoryChapter) => {
    setEpisodeMenu(null);
    setPublishDialog({
      ...CLOSED_PUBLISH_DIALOG,
      open: true,
      chapterId: episode.id,
      chapterTitle: episode.title,
    });
  };

  const closePublishDialog = () => setPublishDialog((p) => ({ ...p, open: false }));

  const confirmPublish = async () => {
    const chapterId = publishDialog.chapterId;
    if (!chapterId) return;
    setPublishDialog((p) => ({ ...p, phase: "publishing" }));
    // Flush unsaved script beats first — publishing must not ship stale beats.
    const flushed = await flushScriptSave();
    if (!flushed) {
      toast("Couldn’t save your latest script changes. Fix your connection and try again.", "error");
      setPublishDialog((p) => ({ ...p, open: false }));
      return;
    }
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) {
        toast("Couldn’t publish the episode", "error");
        setPublishDialog((p) => ({ ...p, open: false }));
        return;
      }
      const json = await res.json();
      const notifiedFollowers: number = json?.meta?.notifiedFollowers ?? 0;
      const resolvedSlug: string = json?.meta?.storySlug || story?.slug || storyId;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/story/${resolvedSlug}/read/${chapterId}`;

      updateEpisodes((eps) =>
        eps.map((c) => (c.id === chapterId ? { ...c, status: "published" } : c)),
      );
      setPublishDialog((p) => ({ ...p, phase: "success", notifiedFollowers, shareUrl }));
    } catch {
      toast("Network error. Try again.", "error");
      setPublishDialog((p) => ({ ...p, open: false }));
    }
  };

  const copyShareLink = async () => {
    if (!publishDialog.shareUrl) return;
    try {
      await navigator.clipboard.writeText(publishDialog.shareUrl);
      setPublishDialog((p) => ({ ...p, linkCopied: true }));
      setTimeout(() => setPublishDialog((p) => ({ ...p, linkCopied: false })), 2000);
    } catch {
      toast("Couldn’t copy link", "error");
    }
  };

  const confirmUnpublish = async () => {
    const target = unpublishTarget;
    if (!target || unpublishBusy) return;
    setUnpublishBusy(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error("Unpublish failed");
      updateEpisodes((eps) =>
        eps.map((c) => (c.id === target.id ? { ...c, status: "draft" } : c)),
      );
      setUnpublishTarget(null);
      toast("Episode moved back to draft", "info");
    } catch {
      toast("Couldn’t unpublish the episode", "error");
    } finally {
      setUnpublishBusy(false);
    }
  };

  const menuEpisode = episodeMenu ? episodes.find((c) => c.id === episodeMenu.id) ?? null : null;

  if (loading || wrongFormat) {
    return (
      <div className="fixed inset-x-0 top-14 bottom-0 flex items-center justify-center bg-void text-text-ghost">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="fixed inset-x-0 top-14 bottom-0 flex flex-col items-center justify-center gap-3 bg-void text-text-secondary">
        <p className="text-sm">{error || "Story not found"}</p>
        <Link href="/dashboard" className="text-[13px] text-amber hover:text-amber-light">
          ← Back to your study
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 flex flex-col overflow-hidden bg-void text-paper">
      {/* ── Workspace bar: breadcrumb + publish + episode rail ── */}
      <header className="shrink-0 border-b border-border bg-surface/70 backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] text-text-ghost transition-colors hover:text-paper"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Study</span>
          </Link>
          <span className="h-4 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-lavender/25 bg-lavender/10 text-lavender">
              <BookOpen size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm text-paper">{story.title}</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Webtoon studio</span>
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {story.slug && (
              <Link
                href={`/story/${story.slug}`}
                className="hidden text-[12px] text-text-ghost transition-colors hover:text-paper sm:inline"
              >
                View story
              </Link>
            )}
            {activeEpisode &&
              (activeEpisode.status === "published" ? (
                <button
                  type="button"
                  onClick={() => setUnpublishTarget(activeEpisode)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sage/30 bg-sage/[0.08] px-3 py-1.5 text-[12px] text-sage transition-colors hover:bg-sage/[0.14]"
                  title="This episode is live — click to unpublish"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  Published
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openPublishDialog(activeEpisode)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sage/40 bg-sage/15 px-3.5 py-1.5 text-[12px] font-medium text-sage transition-all hover:bg-sage/25"
                  title="Publish this episode"
                >
                  <span className="text-[10px] uppercase tracking-[0.14em] text-sage/60">Draft</span>
                  <span className="h-3 w-px bg-sage/25" />
                  Publish
                </button>
              ))}
          </div>
        </div>

        {/* Episode rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border-subtle px-4 py-2 sm:px-6 scrollbar-hide">
          {episodes.map((ep, i) => {
            const isActive = ep.id === activeEpisode?.id;
            return (
              <div
                key={ep.id}
                className={`flex shrink-0 items-center rounded-full transition-all ${
                  isActive
                    ? "border border-lavender/30 bg-lavender/[0.08] text-lavender"
                    : "border border-transparent text-text-ghost hover:bg-elevated/60 hover:text-paper"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectEpisode(ep.id)}
                  className="flex items-center py-1.5 pl-3 pr-1 text-[12px]"
                  title={ep.title}
                >
                  <span className="mr-1.5 font-mono text-[10px] opacity-60">{i + 1}</span>
                  {ep.title}
                  {ep.status === "published" && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-sage" title="Published" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setEpisodeMenu({
                      id: ep.id,
                      x: Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 0) - 176),
                      y: rect.bottom + 6,
                    });
                  }}
                  className="mr-1 rounded-full p-1 opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Episode options for ${ep.title}`}
                  title="Episode options"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addEpisode}
            disabled={creating}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-[12px] text-text-ghost transition-colors hover:border-lavender/30 hover:text-lavender disabled:opacity-50"
          >
            <Plus size={13} />
            Episode
          </button>
        </div>
      </header>

      {/* ── Canvas ───────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {activeEpisode ? (
          <EditorErrorBoundary>
            <WebtoonEditor
              key={activeEpisode.id}
              storyId={storyId}
              chapterId={activeEpisode.id}
              wide
              scriptContent={activeEpisode.outline}
              onScriptUpdate={(content) => saveScript(activeEpisode.id, content)}
              scriptSaveError={scriptSaveError}
            />
          </EditorErrorBoundary>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-text-ghost">
            <p className="text-sm">No episodes yet.</p>
            <button
              type="button"
              onClick={addEpisode}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-[13px] font-semibold text-void disabled:opacity-50"
            >
              <Plus size={14} />
              Create the first episode
            </button>
          </div>
        )}
      </div>

      {/* ── Episode "•••" menu (fixed so the scrollable rail can't clip it) ── */}
      <AnimatePresence>
        {episodeMenu && menuEpisode && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setEpisodeMenu(null)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[71] w-40 overflow-hidden rounded-lg border border-border bg-elevated py-1 shadow-2xl"
              style={{ top: episodeMenu.y, left: episodeMenu.x }}
            >
              <button
                type="button"
                onClick={() => openRename(menuEpisode)}
                className="block w-full px-3 py-2 text-left text-[12px] text-text-secondary transition-colors hover:bg-surface hover:text-paper"
              >
                Rename
              </button>
              {menuEpisode.status === "published" ? (
                <button
                  type="button"
                  onClick={() => {
                    setEpisodeMenu(null);
                    setUnpublishTarget(menuEpisode);
                  }}
                  className="block w-full px-3 py-2 text-left text-[12px] text-text-secondary transition-colors hover:bg-surface hover:text-paper"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openPublishDialog(menuEpisode)}
                  className="block w-full px-3 py-2 text-left text-[12px] text-sage transition-colors hover:bg-surface"
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                onClick={() => openDelete(menuEpisode)}
                className="block w-full px-3 py-2 text-left text-[12px] text-rose transition-colors hover:bg-surface"
              >
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Rename dialog ────────────────────────────────────── */}
      <AnimatePresence>
        {renameTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/70 px-4 backdrop-blur-sm"
            onClick={() => setRenameTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-text-ghost">Rename episode</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRename();
                }}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={500}
                  className="mt-2 w-full rounded-md border border-border bg-void px-3 py-2 text-[13px] text-paper outline-none focus:border-lavender/40"
                />
                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(null)}
                    className="text-[13px] tracking-wide text-text-ghost transition-colors hover:text-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!renameValue.trim()}
                    className="rounded-lg border border-lavender/40 bg-lavender/15 px-5 py-2 text-[13px] font-medium text-lavender transition-all hover:bg-lavender/25 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm dialog ────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/70 px-4 backdrop-blur-sm"
            onClick={() => !deleteBusy && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-text-ghost">Delete episode</p>
              <h3 className="font-display text-lg leading-tight text-paper">{deleteTarget.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
                This removes the episode and its panels from your story. Readers will no longer see it.
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteBusy}
                  className="text-[13px] tracking-wide text-text-ghost transition-colors hover:text-paper disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  disabled={deleteBusy}
                  className="rounded-lg border border-rose/40 bg-rose/15 px-5 py-2 text-[13px] font-medium text-rose transition-all hover:bg-rose/25 disabled:opacity-50"
                >
                  {deleteBusy ? "Deleting…" : "Delete episode"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unpublish confirm dialog ─────────────────────────── */}
      <AnimatePresence>
        {unpublishTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/70 px-4 backdrop-blur-sm"
            onClick={() => !unpublishBusy && setUnpublishTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-text-ghost">Unpublish episode</p>
              <h3 className="font-display text-lg leading-tight text-paper">{unpublishTarget.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
                The episode goes back to draft and disappears from readers. You can publish it again any time.
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUnpublishTarget(null)}
                  disabled={unpublishBusy}
                  className="text-[13px] tracking-wide text-text-ghost transition-colors hover:text-paper disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmUnpublish()}
                  disabled={unpublishBusy}
                  className="rounded-lg border border-amber/40 bg-amber/15 px-5 py-2 text-[13px] font-medium text-amber transition-all hover:bg-amber/25 disabled:opacity-50"
                >
                  {unpublishBusy ? "Unpublishing…" : "Unpublish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Publish dialog (mirrors the cockpit's confirm → publishing → success flow) ── */}
      <AnimatePresence>
        {publishDialog.open && (
          <motion.div
            key="publish-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/70 px-4 backdrop-blur-sm"
            onClick={publishDialog.phase !== "publishing" ? closePublishDialog : undefined}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md rounded-2xl border border-border bg-elevated p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {publishDialog.phase === "confirm" && (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage/20 bg-sage/10">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">Publish episode</p>
                      <h3 className="font-display text-lg leading-tight text-paper">
                        {publishDialog.chapterTitle || "Untitled episode"}
                      </h3>
                    </div>
                  </div>
                  <p className="mb-6 text-[13px] leading-relaxed text-text-secondary">
                    Readers who follow this story will be notified. You can unpublish any time from
                    the episode rail.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={closePublishDialog}
                      className="text-[13px] tracking-wide text-text-ghost transition-colors hover:text-paper"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void confirmPublish()}
                      className="rounded-lg border border-sage/40 bg-sage/15 px-5 py-2 text-[13px] font-medium text-sage transition-all hover:bg-sage/25"
                    >
                      Publish now
                    </button>
                  </div>
                </>
              )}

              {publishDialog.phase === "publishing" && (
                <div className="flex flex-col items-center py-4">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-sage/30 border-t-sage" />
                  <p className="text-[12px] uppercase tracking-wide text-text-ghost">Publishing…</p>
                </div>
              )}

              {publishDialog.phase === "success" && (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage/30 bg-sage/15">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sage">Published</p>
                      <h3 className="truncate font-display text-lg leading-tight text-paper">
                        {publishDialog.chapterTitle || "Untitled episode"}
                      </h3>
                    </div>
                  </div>

                  <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">
                    {publishDialog.notifiedFollowers === 0
                      ? "Your episode is live. No followers to notify yet — share the link below."
                      : publishDialog.notifiedFollowers === 1
                        ? "Your episode is live. 1 follower has been notified."
                        : `Your episode is live. ${publishDialog.notifiedFollowers.toLocaleString()} followers have been notified.`}
                  </p>

                  <div className="mb-5">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-text-ghost">Share link</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={publishDialog.shareUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 rounded-md border border-border bg-void px-3 py-2 font-mono text-[12px] text-text-secondary outline-none focus:border-sage/40"
                      />
                      <button
                        onClick={() => void copyShareLink()}
                        className={`whitespace-nowrap rounded-md border px-3 py-2 text-[12px] transition-all ${
                          publishDialog.linkCopied
                            ? "border-sage/50 bg-sage/15 text-sage"
                            : "border-border text-text-secondary hover:border-border/80 hover:text-paper"
                        }`}
                      >
                        {publishDialog.linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-4">
                    <a
                      href={publishDialog.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] tracking-wide text-sage transition-colors hover:text-sage-light"
                    >
                      View as a reader →
                    </a>
                    <button
                      onClick={closePublishDialog}
                      className="rounded-lg px-4 py-2 text-[13px] text-text-ghost transition-colors hover:text-paper"
                    >
                      Back to the board
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
