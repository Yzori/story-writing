"use client";

/**
 * Versions as a companion — a tab in the reference pane.
 *
 * The history panel is for *acting* on versions (restore, label,
 * delete). This is for *reading* one: pull up last week's draft beside
 * the page while you revise, the way you'd keep a marked-up printout
 * next to the keyboard. Read-only by design — restoring still lives in
 * the history panel where it can be deliberate.
 */

import { useEffect, useState } from "react";
import { formatTimeAgo, formatNumber } from "@/lib/format";

interface Snapshot {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  label: string;
}

interface ReferenceVersionsProps {
  storyId: string;
  chapterId: string;
}

function paragraphsOf(html: string): string[] {
  return html
    .split(/<\/(?:p|h[1-6]|blockquote|li)>/i)
    .map((chunk) =>
      chunk
        .replace(/<[^>]*>/g, " ")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

export default function ReferenceVersions({ storyId, chapterId }: ReferenceVersionsProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedId(null);
    fetch(`/api/stories/${storyId}/chapters/${chapterId}/snapshots`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setSnapshots(
          list.map((s: Snapshot) => ({
            id: s.id,
            content: s.content ?? "",
            wordCount: s.wordCount ?? 0,
            createdAt: s.createdAt,
            label: s.label || "",
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storyId, chapterId]);

  const selected = snapshots.find((s) => s.id === selectedId);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="group mb-3 flex items-center gap-1.5 text-[11px] text-text-secondary transition-colors hover:text-amber"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
            <path d="M19 12H5 M11 18l-6-6 6-6" />
          </svg>
          All versions
        </button>
        <p className="mb-1 text-[12px] font-medium text-paper">
          {selected.label || "Auto-save"}
        </p>
        <p className="mb-4 font-mono text-[10px] text-text-ghost">
          {formatTimeAgo(selected.createdAt)} · {formatNumber(selected.wordCount)} words · read-only
        </p>
        <div className="space-y-3">
          {paragraphsOf(selected.content).map((p, i) => (
            <p key={i} className="font-reading text-[12px] leading-[1.8] text-text-secondary">
              {p}
            </p>
          ))}
          {paragraphsOf(selected.content).length === 0 && (
            <p className="text-[11px] italic text-text-ghost">This version is empty.</p>
          )}
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-text-ghost">
        No saved versions of this chapter yet. Snapshots appear here as
        you write — and you can take one any time from Version History.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {snapshots.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setSelectedId(s.id)}
          className="w-full rounded-lg border border-border bg-elevated/50 p-3 text-left transition-colors hover:border-amber/25 hover:bg-elevated"
        >
          <span className="block truncate text-[12px] font-medium text-paper">
            {s.label || "Auto-save"}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-text-ghost">
            {formatTimeAgo(s.createdAt)} · {formatNumber(s.wordCount)} words
          </span>
        </button>
      ))}
    </div>
  );
}
