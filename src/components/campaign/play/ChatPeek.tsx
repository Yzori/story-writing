"use client";

import type { Turn } from "@/types/campaign";

interface ChatPeekProps {
  logTurns: Turn[];
  onOpenChat: () => void;
}

/**
 * The last murmurs from the table — a two-card peek at the OOC/roll log,
 * with the door into the full Table Talk drawer.
 */
export default function ChatPeek({ logTurns, onOpenChat }: ChatPeekProps) {
  const recent = logTurns.slice(-2).reverse();

  return (
    <section aria-label="Table talk">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">
          Table Talk
        </p>
        <button
          type="button"
          onClick={onOpenChat}
          className="flex items-center gap-1.5 rounded-full border border-border bg-subtle/20 px-2.5 py-1 text-[10px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
          </svg>
          Open
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="px-2 py-2 text-center font-serif text-[11px] italic text-text-ghost">
          The table is quiet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {recent.map((turn) => (
            <button
              key={turn.id}
              type="button"
              onClick={onOpenChat}
              className="w-full rounded-lg border border-border bg-ink/50 px-3 py-2 text-left transition-colors hover:border-amber/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber">
                  {turn.type === "roll-request" ? "Check Pending" : turn.type === "roll" ? "Roll" : "Table Whisper"}
                </span>
                <span className="truncate text-[9px] uppercase tracking-[0.12em] text-text-ghost">
                  {turn.characterName ?? turn.user?.displayName ?? "Table"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                {turn.content}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
