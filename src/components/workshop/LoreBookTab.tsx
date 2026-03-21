"use client";

import { motion } from "framer-motion";

interface LoreEntry {
  id: string;
  storyId: string;
  userId: string;
  category: string;
  title: string;
  content: string;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  character: "bg-amber/10 text-amber border-amber/20",
  place: "bg-teal/10 text-teal border-teal/20",
  event: "bg-lavender/10 text-lavender border-lavender/20",
  item: "bg-copper/10 text-copper border-copper/20",
  lore: "bg-violet/10 text-violet border-violet/20",
};

const CATEGORY_OPTIONS = ["character", "place", "event", "item", "lore"] as const;

interface LoreBookTabProps {
  isOwner: boolean;
  sessionUserId: string | undefined;
  loreEntries: LoreEntry[];
  loreLoading: boolean;
  loreByCategory: Record<string, LoreEntry[]>;
  showLoreForm: boolean;
  setShowLoreForm: (v: boolean) => void;
  loreCategory: string;
  setLoreCategory: (v: string) => void;
  loreTitle: string;
  setLoreTitle: (v: string) => void;
  loreContent: string;
  setLoreContent: (v: string) => void;
  submittingLore: boolean;
  handleAddLore: () => void;
  expandedLore: Set<string>;
  setExpandedLore: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingLore: string | null;
  setEditingLore: (v: string | null) => void;
  editLoreCategory: string;
  setEditLoreCategory: (v: string) => void;
  editLoreTitle: string;
  setEditLoreTitle: (v: string) => void;
  editLoreContent: string;
  setEditLoreContent: (v: string) => void;
  handleEditLore: (entryId: string) => void;
  handleDeleteLore: (entryId: string) => void;
}

export function LoreBookTab({
  isOwner,
  sessionUserId,
  loreEntries,
  loreLoading,
  loreByCategory,
  showLoreForm,
  setShowLoreForm,
  loreCategory,
  setLoreCategory,
  loreTitle,
  setLoreTitle,
  loreContent,
  setLoreContent,
  submittingLore,
  handleAddLore,
  expandedLore,
  setExpandedLore,
  editingLore,
  setEditingLore,
  editLoreCategory,
  setEditLoreCategory,
  editLoreTitle,
  setEditLoreTitle,
  editLoreContent,
  setEditLoreContent,
  handleEditLore,
  handleDeleteLore,
}: LoreBookTabProps) {
  return (
    <motion.div
      key="lore"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Add Entry button */}
      <div className="mb-6">
        {!showLoreForm ? (
          <button
            onClick={() => setShowLoreForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 border border-border text-paper font-medium text-[13px] rounded-full hover:border-amber/25 hover:text-amber transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add Entry
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/80 border border-border rounded-xl p-5"
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              New Lore Entry
            </span>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Category
                </label>
                <select
                  value={loreCategory}
                  onChange={(e) => setLoreCategory(e.target.value)}
                  className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] focus:outline-none focus:border-amber/30 transition-colors capitalize"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  value={loreTitle}
                  onChange={(e) => setLoreTitle(e.target.value)}
                  placeholder="Entry title..."
                  className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Content
                </label>
                <textarea
                  value={loreContent}
                  onChange={(e) => setLoreContent(e.target.value)}
                  placeholder="Describe this lore entry..."
                  rows={4}
                  className="w-full bg-ink border border-border rounded-lg px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddLore}
                  disabled={submittingLore || !loreTitle.trim()}
                  className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingLore ? "Adding..." : "Add Entry"}
                </button>
                <button
                  onClick={() => setShowLoreForm(false)}
                  className="text-text-secondary text-[12px] hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Lore entries grouped by category */}
      {loreLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : loreEntries.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(loreByCategory).map(([category, entries]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                    CATEGORY_COLORS[category] || CATEGORY_COLORS.lore
                  }`}
                >
                  {category}
                </span>
                <span className="text-[11px] text-text-ghost">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map((entry, i) => {
                  const isExpanded = expandedLore.has(entry.id);
                  const isEditing = editingLore === entry.id;
                  const canEdit =
                    isOwner || entry.userId === sessionUserId;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.03 }}
                      className="bg-surface/80 border border-border rounded-xl p-4"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <select
                            value={editLoreCategory}
                            onChange={(e) =>
                              setEditLoreCategory(e.target.value)
                            }
                            className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] focus:outline-none focus:border-amber/30 transition-colors"
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editLoreTitle}
                            onChange={(e) =>
                              setEditLoreTitle(e.target.value)
                            }
                            className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] focus:outline-none focus:border-amber/30 transition-colors"
                          />
                          <textarea
                            value={editLoreContent}
                            onChange={(e) =>
                              setEditLoreContent(e.target.value)
                            }
                            rows={4}
                            className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] font-reading resize-none focus:outline-none focus:border-amber/30 transition-colors"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditLore(entry.id)}
                              className="px-3 py-1.5 bg-amber text-void font-semibold text-[11px] rounded-full hover:bg-amber-light transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingLore(null)}
                              className="text-text-secondary text-[11px] hover:text-text transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-paper text-[14px] font-medium">
                              {entry.title}
                            </h3>
                            {canEdit && (
                              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                <button
                                  onClick={() => {
                                    setEditingLore(entry.id);
                                    setEditLoreCategory(entry.category);
                                    setEditLoreTitle(entry.title);
                                    setEditLoreContent(entry.content);
                                  }}
                                  className="text-text-ghost hover:text-amber transition-colors p-1"
                                  title="Edit"
                                >
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteLore(entry.id)}
                                  className="text-text-ghost hover:text-rose transition-colors p-1"
                                  title="Delete"
                                >
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                            {isExpanded
                              ? entry.content
                              : entry.content.length > 150
                                ? entry.content.slice(0, 150) + "..."
                                : entry.content}
                          </p>
                          {entry.content.length > 150 && (
                            <button
                              onClick={() =>
                                setExpandedLore((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(entry.id)) {
                                    next.delete(entry.id);
                                  } else {
                                    next.add(entry.id);
                                  }
                                  return next;
                                })
                              }
                              className="text-amber text-[11px] mt-2 hover:text-amber-light transition-colors"
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                          {entry.user && (
                            <p className="text-text-ghost text-[11px] mt-2">
                              by {entry.user.displayName || "Unknown"}
                            </p>
                          )}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <p className="text-text-secondary text-[13px]">
            No lore entries yet. Start building your world.
          </p>
        </div>
      )}
    </motion.div>
  );
}
