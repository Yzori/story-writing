"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chapter, ChapterSnapshot } from "@/types/editor";
import { computeDiff, diffStats, type DiffSegment } from "@/lib/diff";
import { useToast } from "@/components/shared/Toast";

interface HistoryPanelProps {
  chapter: Chapter;
  storyId: string;
  onRestore: (snapshot: ChapterSnapshot) => void;
  onUpdate: (updates: Partial<Chapter>) => void;
  onClose: () => void;
}

interface SnapshotWithMeta extends ChapterSnapshot {
  userId?: string;
  userName?: string;
  version?: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel({
  chapter,
  storyId,
  onRestore,
  onUpdate,
  onClose,
}: HistoryPanelProps) {
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<SnapshotWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "diff" | "preview">("timeline");
  const [saving, setSaving] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const loadedChapterRef = useRef<string | null>(null);

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    if (loadedChapterRef.current === chapter.id && snapshots.length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapter.id}/snapshots`);
      if (res.ok) {
        const json = await res.json();
        const loaded: SnapshotWithMeta[] = (json.data || []).map(
          (s: { id: string; content: string; wordCount: number; createdAt: string; label: string; userId?: string; version?: number }) => ({
            id: s.id,
            content: s.content,
            wordCount: s.wordCount,
            createdAt: new Date(s.createdAt).getTime(),
            label: s.label || "",
            userId: s.userId || undefined,
            version: s.version || undefined,
          })
        );
        setSnapshots(loaded);
        onUpdate({ snapshots: loaded });
        loadedChapterRef.current = chapter.id;
      }
    } catch {
      toast("Couldn\u2019t load version history", "error");
    } finally {
      setLoading(false);
    }
  }, [chapter.id, storyId, onUpdate, toast, snapshots.length]);

  useEffect(() => {
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  const selected = snapshots.find((s) => s.id === selectedId) || null;

  // Compute diff between selected snapshot and current content
  const diff = selected ? computeDiff(selected.content, chapter.content) : null;
  const stats = diff ? diffStats(diff) : null;

  // Find the snapshot before the selected one (for context)
  const selectedIdx = selected ? snapshots.indexOf(selected) : -1;
  const prevSnapshot = selectedIdx >= 0 && selectedIdx < snapshots.length - 1
    ? snapshots[selectedIdx + 1]  // snapshots are newest-first
    : null;
  const diffFromPrev = selected && prevSnapshot
    ? computeDiff(prevSnapshot.content, selected.content)
    : null;
  const prevStats = diffFromPrev ? diffStats(diffFromPrev) : null;

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapter.id}/snapshots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: labelInput.trim() || `Version ${snapshots.length + 1}` }),
        }
      );
      if (res.ok) {
        const { data } = await res.json();
        const snap: SnapshotWithMeta = {
          id: data.id,
          content: data.content,
          wordCount: data.wordCount,
          createdAt: new Date(data.createdAt).getTime(),
          label: data.label || "",
          userId: data.userId,
          version: data.version,
        };
        setSnapshots((prev) => [snap, ...prev]);
        onUpdate({ snapshots: [snap, ...snapshots] });
        setLabelInput("");
        toast("Version saved", "success");
      }
    } catch {
      toast("Couldn\u2019t save version", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = () => {
    if (!selected) return;
    onRestore(selected);
    setConfirmRestore(false);
    setSelectedId(null);
    toast("Version restored", "success");
  };

  // Build "current" entry for the timeline
  const currentEntry: SnapshotWithMeta = {
    id: "__current__",
    content: chapter.content,
    wordCount: chapter.wordCount,
    createdAt: chapter.updatedAt,
    label: "Current version",
    version: chapter.version,
  };

  const timelineEntries = [currentEntry, ...snapshots];

  const labelClass = "text-[10px] uppercase tracking-[0.12em] text-text-ghost";

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 420, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[420px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-paper">Version History</h3>
            <p className="text-[10px] text-text-ghost mt-0.5 truncate">{chapter.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Save new version */}
        <div className="px-5 py-3 border-b border-border bg-surface/50">
          <div className="flex gap-2">
            <input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveSnapshot()}
              placeholder="Name this version..."
              maxLength={200}
              className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
            />
            <button
              onClick={handleSaveSnapshot}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-amber/15 text-amber text-[12px] font-medium hover:bg-amber/25 transition-colors shrink-0 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-3 h-3 border-2 border-amber/30 border-t-amber rounded-full animate-spin inline-block" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-elevated mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-elevated rounded" />
                    <div className="h-2 w-20 bg-elevated rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Timeline */}
              <div className="px-5 py-4">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[5px] top-3 bottom-3 w-px bg-border" />

                  <div className="space-y-1">
                    {timelineEntries.map((entry, i) => {
                      const isCurrent = entry.id === "__current__";
                      const isSelected = entry.id === selectedId;
                      const wordDelta = i < timelineEntries.length - 1
                        ? entry.wordCount - timelineEntries[i + 1].wordCount
                        : entry.wordCount;

                      return (
                        <button
                          key={entry.id}
                          onClick={() => {
                            if (isCurrent) {
                              setSelectedId(null);
                              setView("timeline");
                            } else {
                              setSelectedId(entry.id);
                              setView("diff");
                            }
                          }}
                          className={`w-full text-left flex gap-3 px-1 py-2.5 rounded-lg transition-all relative ${
                            isSelected
                              ? "bg-amber/[0.06] border border-amber/20"
                              : isCurrent
                                ? "bg-sage/[0.04] border border-sage/15"
                                : "border border-transparent hover:bg-subtle/30"
                          }`}
                        >
                          {/* Dot */}
                          <div className={`w-[10px] h-[10px] rounded-full mt-1 shrink-0 border-2 z-10 ${
                            isCurrent
                              ? "bg-sage border-sage/50"
                              : isSelected
                                ? "bg-amber border-amber/50"
                                : entry.label.startsWith("Auto-save")
                                  ? "bg-elevated border-border"
                                  : "bg-lavender/60 border-lavender/30"
                          }`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[12px] font-medium truncate ${
                                isCurrent ? "text-sage" : isSelected ? "text-amber" : "text-text-secondary"
                              }`}>
                                {entry.label || `Version ${timelineEntries.length - i}`}
                              </p>
                              {entry.version && (
                                <span className="text-[9px] text-text-ghost bg-elevated px-1.5 py-0.5 rounded-full shrink-0">
                                  v{entry.version}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-text-ghost">
                                {relativeTime(entry.createdAt)}
                              </span>
                              <span className="text-[10px] text-text-ghost">
                                {entry.wordCount.toLocaleString()}w
                              </span>
                              {wordDelta !== 0 && !isCurrent && (
                                <span className={`text-[10px] font-medium ${
                                  wordDelta > 0 ? "text-sage" : "text-rose"
                                }`}>
                                  {wordDelta > 0 ? "+" : ""}{wordDelta}
                                </span>
                              )}
                            </div>

                            {entry.userName && (
                              <p className="text-[10px] text-text-ghost mt-0.5">
                                by {entry.userName}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {snapshots.length === 0 && (
                  <div className="text-center py-8 mt-2">
                    <div className="w-12 h-12 rounded-full bg-elevated border border-border mx-auto mb-3 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 3" />
                      </svg>
                    </div>
                    <p className="text-[12px] text-text-secondary mb-1">No version history yet</p>
                    <p className="text-[11px] text-text-ghost leading-relaxed max-w-[240px] mx-auto">
                      Versions are saved automatically at milestones, or save one manually above.
                    </p>
                  </div>
                )}
              </div>

              {/* Detail view when a version is selected */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border"
                  >
                    {/* View tabs */}
                    <div className="flex border-b border-border px-5">
                      {(["diff", "preview"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setView(v)}
                          className={`px-3 py-2.5 text-[11px] transition-colors relative ${
                            view === v ? "text-amber" : "text-text-ghost hover:text-text-secondary"
                          }`}
                        >
                          {v === "diff" ? "Changes" : "Full Text"}
                          {view === v && (
                            <motion.div
                              layoutId="history-tab"
                              className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                            />
                          )}
                        </button>
                      ))}

                      {/* Stats */}
                      {stats && view === "diff" && (
                        <div className="ml-auto flex items-center gap-2 text-[10px]">
                          {stats.added > 0 && <span className="text-sage">+{stats.added}w</span>}
                          {stats.removed > 0 && <span className="text-rose">-{stats.removed}w</span>}
                        </div>
                      )}
                    </div>

                    {/* Diff view */}
                    {view === "diff" && diff && (
                      <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                        <p className={`${labelClass} mb-2`}>
                          Changes from this version to current
                        </p>
                        <div className="text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                          {diff.map((seg, i) => (
                            <span
                              key={i}
                              className={
                                seg.type === "added"
                                  ? "bg-sage/15 text-sage border-b border-sage/30"
                                  : seg.type === "removed"
                                    ? "bg-rose/15 text-rose line-through opacity-70"
                                    : "text-text-secondary"
                              }
                            >
                              {seg.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview view */}
                    {view === "preview" && selected && (
                      <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                        <p className={`${labelClass} mb-2`}>
                          Full text at {formatDate(selected.createdAt)}
                        </p>
                        <div
                          className="text-[13px] text-text-secondary leading-relaxed font-reading prose-preview"
                          dangerouslySetInnerHTML={{ __html: selected.content }}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                      {confirmRestore ? (
                        <>
                          <span className="text-[11px] text-rose flex-1">
                            Replace current content with this version?
                          </span>
                          <button
                            onClick={handleRestore}
                            className="px-3 py-1.5 rounded-lg bg-rose/15 text-rose text-[11px] font-medium hover:bg-rose/25 transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => setConfirmRestore(false)}
                            className="px-3 py-1.5 rounded-lg text-text-ghost text-[11px] hover:text-text-secondary transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmRestore(true)}
                            className="px-3 py-1.5 rounded-lg bg-amber/15 text-amber text-[11px] font-medium hover:bg-amber/25 transition-colors flex items-center gap-1.5"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M2 8a6 6 0 1 1 1.76 4.24" />
                              <path d="M2 12V8h4" />
                            </svg>
                            Restore this version
                          </button>
                          <button
                            onClick={() => {
                              setSelectedId(null);
                              setView("timeline");
                            }}
                            className="px-3 py-1.5 rounded-lg text-text-ghost text-[11px] hover:text-text-secondary transition-colors ml-auto"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
