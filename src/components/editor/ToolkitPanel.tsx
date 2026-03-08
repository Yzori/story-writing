"use client";

import { motion } from "framer-motion";

interface ToolkitPanelProps {
  onClose: () => void;
  // Story tools
  onOpenMetadata: () => void;
  onOpenBible: () => void;
  onOpenFrontMatter: () => void;
  // Writing tools
  onOpenChapterSettings: () => void;
  onOpenTypography: () => void;
  onOpenOutline: () => void;
  // Export
  onExportPdf: () => void;
  onExportEpub: () => void;
  onExportDocx: () => void;
  // State info
  hasCover: boolean;
  genreCount: number;
  bibleEntryCount: number;
  chapterStatus: string;
  snapshotCount: number;
  dropCaps: boolean;
  sceneBreakStyle: string;
  hasEpigraph: boolean;
  hasForeword: boolean;
  showToc: boolean;
}

interface ToolCard {
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}

export default function ToolkitPanel({
  onClose,
  onOpenMetadata,
  onOpenBible,
  onOpenFrontMatter,
  onOpenChapterSettings,
  onOpenTypography,
  onOpenOutline,
  onExportPdf,
  onExportEpub,
  onExportDocx,
  hasCover,
  genreCount,
  bibleEntryCount,
  chapterStatus,
  snapshotCount,
  dropCaps,
  sceneBreakStyle,
  hasEpigraph,
  hasForeword,
  showToc,
}: ToolkitPanelProps) {
  const storyTools: ToolCard[] = [
    {
      label: "Cover & Details",
      description: "Cover art, synopsis, genres, rating",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="1.5" width="14" height="17" rx="2" />
          <rect x="5.5" y="3.5" width="9" height="6" rx="1" />
          <path d="M7 12.5h6M7 15h4" />
        </svg>
      ),
      badge: hasCover
        ? genreCount > 0
          ? `${genreCount} genre${genreCount !== 1 ? "s" : ""}`
          : "Cover set"
        : "No cover",
      onClick: onOpenMetadata,
    },
    {
      label: "Story Bible",
      description: "Characters, places, world notes",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3.5A2.5 2.5 0 0 1 5.5 1H17v14H5.5A2.5 2.5 0 0 0 3 17.5V3.5z" />
          <path d="M3 17.5A2.5 2.5 0 0 1 5.5 15H17" />
          <circle cx="10" cy="7" r="2" />
          <path d="M7.5 12c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5" />
        </svg>
      ),
      badge: bibleEntryCount > 0 ? `${bibleEntryCount} entries` : undefined,
      onClick: onOpenBible,
    },
    {
      label: "Front Matter",
      description: "Epigraph, foreword, table of contents",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2v16M5 2h10l-3.5 3.5L15 9H5" />
        </svg>
      ),
      badge: [hasEpigraph && "Epigraph", hasForeword && "Foreword", showToc && "TOC"]
        .filter(Boolean)
        .join(", ") || undefined,
      onClick: onOpenFrontMatter,
    },
  ];

  const writingTools: ToolCard[] = [
    {
      label: "Chapter Settings",
      description: "Status, notes, version history",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.2 4.2l1.8 1.8M14 14l1.8 1.8M15.8 4.2L14 6M6 14l-1.8 1.8" />
        </svg>
      ),
      badge: chapterStatus === "published" ? "Published" : "Draft",
      onClick: onOpenChapterSettings,
    },
    {
      label: "Typography",
      description: "Drop caps, scene breaks",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 16L6.5 3h1L12 16M3.8 12h6.4" />
          <path d="M15 8v8M15 4v1" />
        </svg>
      ),
      badge: [dropCaps && "Drop caps", sceneBreakStyle !== "asterism" && sceneBreakStyle]
        .filter(Boolean)
        .join(", ") || undefined,
      onClick: onOpenTypography,
    },
    {
      label: "Outline View",
      description: "Plan chapters, bird's-eye view",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M6 5h10M6 10h10M6 15h7M2.5 5h0M2.5 10h0M2.5 15h0" />
        </svg>
      ),
      onClick: onOpenOutline,
    },
  ];

  const exportTools: ToolCard[] = [
    {
      label: "PDF",
      description: "Print-ready document",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <polyline points="12 2 12 6 16 6" />
          <path d="M7 12h6M7 15h4" />
        </svg>
      ),
      onClick: onExportPdf,
    },
    {
      label: "EPUB",
      description: "E-reader format",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <path d="M7 6h6M7 9h6M7 12h4" />
          <path d="M3 2v16" />
        </svg>
      ),
      onClick: onExportEpub,
    },
    {
      label: "DOCX",
      description: "Word document",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <polyline points="12 2 12 6 16 6" />
          <path d="M7 10l1.5 5 1.5-3.5L11.5 15 13 10" />
        </svg>
      ),
      onClick: onExportDocx,
    },
  ];

  const sections = [
    { title: "Story", tools: storyTools },
    { title: "Writing", tools: writingTools },
    { title: "Export", tools: exportTools },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="fixed bottom-14 left-4 z-50 w-[400px] max-h-[calc(100vh-120px)] bg-surface border border-border rounded-2xl shadow-2xl shadow-void/40 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber/10 flex items-center justify-center text-amber">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 1.5L2 9l4.5 4.5L14 6" />
                <path d="M11.5 3.5l1 1" />
                <path d="M2 9l2-0.5L3.5 11z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-paper">Toolkit</h3>
              <p className="text-[10px] text-text-ghost">Your writing tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[9px] uppercase tracking-[0.15em] text-text-ghost px-2 mb-2">
                {section.title}
              </p>
              <div className={`grid gap-1.5 ${section.tools.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {section.tools.map((tool) => (
                  <button
                    key={tool.label}
                    onClick={() => {
                      tool.onClick();
                      onClose();
                    }}
                    className="group flex flex-col items-start gap-2 p-3 rounded-xl border border-border hover:border-amber/20 hover:bg-amber/[0.03] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-subtle/50 group-hover:bg-amber/10 flex items-center justify-center text-text-ghost group-hover:text-amber transition-colors">
                      {tool.icon}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[12px] font-medium text-text-secondary group-hover:text-paper transition-colors truncate">
                        {tool.label}
                      </p>
                      <p className="text-[10px] text-text-ghost mt-0.5 leading-snug line-clamp-2">
                        {tool.description}
                      </p>
                      {tool.badge && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-amber/10 text-amber text-[9px] truncate max-w-full">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <p className="text-[10px] text-text-ghost">
            <kbd className="px-1 py-0.5 rounded bg-subtle text-[9px] font-mono">Ctrl K</kbd>
            {" "}for all commands
          </p>
          <p className="text-[10px] text-text-ghost">
            {snapshotCount > 0 && `${snapshotCount} snapshot${snapshotCount !== 1 ? "s" : ""} saved`}
          </p>
        </div>
      </motion.div>
    </>
  );
}
