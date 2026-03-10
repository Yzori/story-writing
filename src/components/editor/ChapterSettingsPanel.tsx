"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chapter, ChapterSnapshot } from "@/lib/store";

interface ChapterSettingsPanelProps {
  chapter: Chapter;
  storyId: string;
  onUpdate: (updates: Partial<Chapter>) => void;
  onRestoreSnapshot: (snapshot: ChapterSnapshot) => void;
  onClose: () => void;
}

export default function ChapterSettingsPanel({
  chapter,
  storyId,
  onUpdate,
  onRestoreSnapshot,
  onClose,
}: ChapterSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "notes" | "history">("settings");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const loadedChapterRef = useRef<string | null>(null);

  // Lazy-load snapshots from API when History tab is opened
  useEffect(() => {
    if (activeTab !== "history") return;
    if (snapshotsLoaded && loadedChapterRef.current === chapter.id) return;

    async function loadSnapshots() {
      setSnapshotsLoading(true);
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${chapter.id}/snapshots`);
        if (res.ok) {
          const json = await res.json();
          const loaded: ChapterSnapshot[] = (json.data || []).map((s: { id: string; content: string; wordCount: number; createdAt: string; label: string }) => ({
            id: s.id,
            content: s.content,
            wordCount: s.wordCount,
            createdAt: new Date(s.createdAt).getTime(),
            label: s.label || "",
          }));
          onUpdate({ snapshots: loaded });
          loadedChapterRef.current = chapter.id;
          setSnapshotsLoaded(true);
        }
      } catch {} finally {
        setSnapshotsLoading(false);
      }
    }
    loadSnapshots();
  }, [activeTab, chapter.id, storyId]);

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapter.id}/snapshots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: snapshotLabel || `Snapshot ${chapter.snapshots.length + 1}` }),
        }
      );
      if (res.ok) {
        const { data } = await res.json();
        const snapshot: ChapterSnapshot = {
          id: data.id,
          content: data.content,
          wordCount: data.wordCount,
          createdAt: new Date(data.createdAt).getTime(),
          label: data.label || "",
        };
        onUpdate({ snapshots: [...chapter.snapshots, snapshot] });
        setSnapshotLabel("");
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    onUpdate({
      snapshots: chapter.snapshots.filter((s) => s.id !== id),
    });
  };

  const tabs = [
    { key: "settings" as const, label: "Settings" },
    { key: "notes" as const, label: "Author Notes" },
    { key: "history" as const, label: "History" },
  ];

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-paper truncate">{chapter.title}</h3>
            <p className="text-[10px] text-text-ghost mt-0.5">Chapter settings</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-[11px] transition-all relative ${
                activeTab === t.key
                  ? "text-amber"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              {t.label}
              {t.key === "history" && chapter.snapshots.length > 0 && (
                <span className="ml-1 text-[9px] opacity-60">{chapter.snapshots.length}</span>
              )}
              {activeTab === t.key && (
                <motion.div
                  layoutId="chapter-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Settings tab */}
          {activeTab === "settings" && (
            <>
              {/* Publish status */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdate({ status: "draft" })}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                      chapter.status === "draft"
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    <span className="block font-medium">Draft</span>
                    <span className="text-[10px] opacity-70">Work in progress</span>
                  </button>
                  <button
                    onClick={() => onUpdate({ status: "published" })}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                      chapter.status === "published"
                        ? "border-sage/30 bg-sage/[0.06] text-sage"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    <span className="block font-medium">Published</span>
                    <span className="text-[10px] opacity-70">Visible to readers</span>
                  </button>
                </div>
              </section>

              {/* Outline */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Chapter Outline
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Plan what happens in this chapter. Only visible to you.
                </p>
                <textarea
                  value={chapter.outline}
                  onChange={(e) => onUpdate({ outline: e.target.value })}
                  placeholder="Key events, character arcs, plot points..."
                  rows={5}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>
            </>
          )}

          {/* Author Notes tab */}
          {activeTab === "notes" && (
            <>
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Note Before Chapter
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Shown to readers before the chapter content begins.
                </p>
                <textarea
                  value={chapter.authorNoteBefore}
                  onChange={(e) => onUpdate({ authorNoteBefore: e.target.value })}
                  placeholder="A note to your readers before this chapter..."
                  rows={4}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>

              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Note After Chapter
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Shown to readers after the chapter content ends. Good for reflections, thanks, or teasers.
                </p>
                <textarea
                  value={chapter.authorNoteAfter}
                  onChange={(e) => onUpdate({ authorNoteAfter: e.target.value })}
                  placeholder="Thanks for reading! Next week we'll..."
                  rows={4}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>
            </>
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <>
              {/* Save snapshot */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Save Current Version
                </label>
                <div className="flex gap-2">
                  <input
                    value={snapshotLabel}
                    onChange={(e) => setSnapshotLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSnapshot();
                    }}
                    placeholder="Label (optional)"
                    className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                  />
                  <button
                    onClick={handleSaveSnapshot}
                    disabled={saving}
                    className="px-3 py-2 rounded-lg bg-amber/15 text-amber text-[12px] hover:bg-amber/25 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-[10px] text-text-ghost mt-1.5">
                  {chapter.wordCount.toLocaleString()} words currently
                </p>
              </section>

              {/* Snapshot list */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Saved Versions ({chapter.snapshots.length})
                </label>

                {snapshotsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                  </div>
                )}

                {!snapshotsLoading && chapter.snapshots.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[12px] text-text-tertiary">No saved versions yet</p>
                    <p className="text-[11px] text-text-ghost mt-1">
                      Save snapshots to keep a history of your drafts
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  {[...chapter.snapshots].reverse().map((snap) => (
                    <div
                      key={snap.id}
                      className="bg-elevated border border-border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[12px] text-text-secondary font-medium truncate">
                          {snap.label}
                        </p>
                        <span className="text-[10px] text-text-ghost shrink-0 tabular-nums">
                          {snap.wordCount.toLocaleString()}w
                        </span>
                      </div>
                      <p className="text-[10px] text-text-ghost mb-2">
                        {new Date(snap.createdAt).toLocaleString()}
                      </p>

                      <div className="flex items-center gap-2">
                        {confirmRestore === snap.id ? (
                          <>
                            <span className="text-[11px] text-rose">Replace current content?</span>
                            <button
                              onClick={() => {
                                onRestoreSnapshot(snap);
                                setConfirmRestore(null);
                              }}
                              className="px-2 py-1 rounded text-[11px] bg-rose/15 text-rose hover:bg-rose/25 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              className="px-2 py-1 rounded text-[11px] text-text-ghost hover:text-text-secondary transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setConfirmRestore(snap.id)}
                              className="px-2 py-1 rounded text-[11px] text-text-ghost hover:text-amber transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="px-2 py-1 rounded text-[11px] text-text-ghost hover:text-rose transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
