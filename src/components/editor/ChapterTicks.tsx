"use client";

/**
 * Thumb-index chapter ticks for the bare-page writing view.
 *
 * When the cockpit is in write mode the rails step away and these ticks
 * are the only resident navigation: one mark per chapter along the left
 * margin, like the thumb-index cut into a dictionary's edge. Hover for
 * the title, click to jump. The desk (⌘E) is one step up for anything
 * heavier — reordering, renaming, the rooms.
 */

interface TickChapter {
  id: string;
  title: string;
  wordCount: number;
  status: "draft" | "published";
}

interface ChapterTicksProps {
  chapters: TickChapter[];
  activeChapterId: string | null;
  unitSingular: string;
  /** Fade back while the writer is typing. */
  dimmed: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onOpenDesk: () => void;
}

export default function ChapterTicks({
  chapters,
  activeChapterId,
  unitSingular,
  dimmed,
  onSelect,
  onAdd,
  onOpenDesk,
}: ChapterTicksProps) {
  return (
    <nav
      className={`fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-start gap-3 transition-opacity duration-500 lg:flex ${
        dimmed ? "opacity-20" : "opacity-100"
      }`}
      aria-label={`${unitSingular} navigation`}
    >
      <button
        type="button"
        onClick={onOpenDesk}
        className="group relative -ml-1 mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-text-ghost transition-colors hover:bg-paper/[0.05] hover:text-amber"
        title="The desk (⌘E)"
        aria-label="Step back to the desk"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="18" height="5" rx="1.5" />
        </svg>
      </button>

      {chapters.map((c, i) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="group relative flex h-3.5 items-center"
          aria-label={`${unitSingular} ${i + 1}: ${c.title || "Untitled"}`}
          aria-current={c.id === activeChapterId ? "true" : undefined}
        >
          <span
            className={`block h-[2px] rounded-full transition-all ${
              c.id === activeChapterId
                ? "w-6 bg-amber"
                : "w-3.5 bg-text-ghost/40 group-hover:w-5 group-hover:bg-text-secondary"
            }`}
          />
          <span className="pointer-events-none absolute left-9 top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-elevated px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <span className="mr-1.5 font-mono text-[10px] text-text-ghost">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[11px] text-text-secondary">
              {c.title || "Untitled"}
            </span>
            <span className="ml-1.5 font-mono text-[10px] text-text-ghost">
              {c.wordCount.toLocaleString()}
              {c.status === "published" ? " · live" : ""}
            </span>
          </span>
        </button>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="group relative -ml-0.5 mt-1 flex h-5 w-5 items-center justify-center rounded-md text-text-ghost/60 transition-colors hover:bg-paper/[0.05] hover:text-amber"
        title={`New ${unitSingular.toLowerCase()}`}
        aria-label={`New ${unitSingular.toLowerCase()}`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 5v14 M5 12h14" />
        </svg>
      </button>
    </nav>
  );
}
