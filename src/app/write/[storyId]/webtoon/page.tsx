"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import WebtoonEditor from "@/components/editor/WebtoonEditor";
import EditorErrorBoundary from "@/components/editor/EditorErrorBoundary";
import { useToast } from "@/components/shared/Toast";
import { useStoryChapters, type StoryChapter } from "@/hooks/use-story-chapters";

/**
 * Standalone webtoon editor. A vertical-panel comic is not a prose document, so
 * it gets its own full-bleed workspace (wide panel board + episode rail) instead
 * of being squeezed into the prose cockpit's 680px column. Mirrors the co-op
 * route's standalone pattern; reuses {@link useStoryChapters} for loading and the
 * existing {@link WebtoonEditor} for the panel board + its API-backed CRUD.
 */
export default function WebtoonWorkspacePage() {
  const params = useParams();
  const storyId = String(params.storyId);
  const { toast } = useToast();

  const { story, chapters, activeChapterId, setActiveChapterId, loading, error } =
    useStoryChapters(storyId);

  const [localChapters, setLocalChapters] = useState<StoryChapter[] | null>(null);
  const [creating, setCreating] = useState(false);
  const scriptSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const episodes = localChapters ?? chapters;
  const activeEpisode = episodes.find((c) => c.id === activeChapterId) ?? episodes[0] ?? null;

  // Persist the episode "script" (beats) to chapters.outline, debounced. This
  // restores the Script↔Visual loop: write beats, then "Storyboard from script".
  const saveScript = (chapterId: string, outline: string) => {
    if (scriptSaveTimer.current) clearTimeout(scriptSaveTimer.current);
    scriptSaveTimer.current = setTimeout(() => {
      fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      }).catch(() => {});
    }, 800);
    setLocalChapters(episodes.map((c) => (c.id === chapterId ? { ...c, outline } : c)));
  };

  const addEpisode = async () => {
    if (creating) return;
    setCreating(true);
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
      setLocalChapters([...episodes, next]);
      setActiveChapterId(created.id);
    } catch {
      toast("Network error — please try again", "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
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
      {/* ── Workspace bar: breadcrumb + episode rail ─────────── */}
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
          {story.slug && (
            <Link
              href={`/story/${story.slug}`}
              className="ml-auto text-[12px] text-text-ghost transition-colors hover:text-paper"
            >
              View story
            </Link>
          )}
        </div>

        {/* Episode rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border-subtle px-4 py-2 sm:px-6 scrollbar-hide">
          {episodes.map((ep, i) => (
            <button
              key={ep.id}
              type="button"
              onClick={() => setActiveChapterId(ep.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-all ${
                ep.id === activeEpisode?.id
                  ? "border border-lavender/30 bg-lavender/[0.08] text-lavender"
                  : "border border-transparent text-text-ghost hover:bg-elevated/60 hover:text-paper"
              }`}
              title={ep.title}
            >
              <span className="mr-1.5 font-mono text-[10px] opacity-60">{i + 1}</span>
              {ep.title}
            </button>
          ))}
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
    </div>
  );
}
