"use client";

import { useRef, useEffect, useMemo } from "react";
import type { Turn } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";
import { parseRollMetadata, parseRollRequestMetadata } from "@/lib/campaign-turns";

interface SessionLogProps {
  turns: Turn[];
  currentUserId: string | null;
  sessionTitle: string;
  storyTitle: string;
  onSendChat: (message: string) => void;
  chatInput: string;
  setChatInput: (val: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  readOnly?: boolean;
  isGM?: boolean;
  onUpdateRollRequest?: (turnId: string, status: "closed" | "cancelled") => void;
  fullWidth?: boolean;
}

export default function SessionLog({
  turns,
  currentUserId,
  sessionTitle,
  storyTitle,
  onSendChat,
  chatInput,
  setChatInput,
  isCollapsed = false,
  onToggleCollapse,
  readOnly = false,
  isGM = false,
  onUpdateRollRequest,
  fullWidth = false,
}: SessionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const userIds = useMemo(() => {
    return [...new Set(turns.map((t) => t.userId))];
  }, [turns]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput("");
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-center border-r border-border-subtle bg-void shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 py-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text hover:bg-subtle/60 transition-all cursor-pointer"
          title="Expand Canon Feed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div className="w-px flex-1 bg-subtle/30" />
        <div className="flex flex-col items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[9px] text-text-tertiary font-mono tabular-nums">{turns.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fullWidth ? "w-full max-w-none" : "w-[88vw] max-w-[380px] sm:w-[320px] lg:w-[380px]"} h-full flex flex-col border-r border-border-subtle bg-void shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0`}>
      {/* Header */}
      <div className="p-6 border-b border-border-subtle bg-black/40 backdrop-blur-md pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber mb-1">Canon Feed</h2>
            <p className="text-text-tertiary text-xs font-serif italic">{storyTitle} — {sessionTitle}</p>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-subtle/60 transition-all cursor-pointer"
              title="Collapse Canon Feed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col [scrollbar-width:thin] [scrollbar-color:rgba(224,169,62,0.24)_transparent]">
        {turns.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-ghost text-xs italic font-serif">No messages yet...</p>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col">
            {/* OOC Chat */}
            {turn.type === "ooc" && (
              <div className={`flex flex-col ${turn.userId === currentUserId ? "items-end" : "items-start"}`}>
                <span className={`text-[10px] mb-1 opacity-60 ${getPlayerColor(turn.userId, userIds)}`}>
                  {turn.user?.displayName ?? "Unknown"} &bull; {turn.characterName ?? "OOC"}
                </span>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed ${
                  turn.userId === currentUserId
                    ? "bg-amber/10 border border-amber/20 text-paper"
                    : "bg-subtle/30 border border-border-subtle text-text"
                }`}>
                  {turn.content}
                </div>
              </div>
            )}

            {/* Roll Requests (GM asking for a roll) */}
            {turn.type === "roll-request" && (() => {
              const meta = parseRollRequestMetadata(turn.metadata);
              const attribute = meta?.attribute ?? "";
              const reason = meta?.reason ?? "";
              const onSuccess = meta?.onSuccess ?? "";
              const onFailure = meta?.onFailure ?? "";
              const fatal = meta?.fatal === true;
              const status = meta?.status ?? "open";

              return (
                <div className="flex flex-col items-center my-2">
                  <div className={`rounded-xl p-3 w-full text-center relative overflow-hidden ${fatal ? "bg-rose/10 border border-rose/30" : "bg-violet-500/10 border border-violet-500/30"}`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${fatal ? "from-rose/0 via-rose/5 to-rose/0" : "from-violet-500/0 via-violet-500/5 to-violet-500/0"}`} />
                    <p className={`text-[10px] uppercase tracking-widest font-bold z-10 relative ${fatal ? "text-rose" : "text-violet-400"}`}>
                      {fatal ? "Fatal Roll" : "Roll Requested"}
                    </p>
                    {status !== "open" && (
                      <span className="inline-flex mt-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] uppercase tracking-widest text-text-tertiary">
                        {status}
                      </span>
                    )}
                    <p className="text-xs text-text-secondary mt-1 z-10 relative">
                      {attribute} check — {reason}
                    </p>
                    {(onSuccess || onFailure) && (
                      <div className="mt-2 space-y-1 z-10 relative">
                        {onSuccess && <p className="text-[11px] leading-relaxed text-sage"><span className="font-bold">Win:</span> {onSuccess}</p>}
                        {onFailure && <p className="text-[11px] leading-relaxed text-rose"><span className="font-bold">Lose:</span> {onFailure}</p>}
                      </div>
                    )}
                    {isGM && status === "open" && onUpdateRollRequest && (
                      <div className="mt-3 flex items-center justify-center gap-2 z-10 relative">
                        <button
                          type="button"
                          onClick={() => onUpdateRollRequest(turn.id, "closed")}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-widest text-text-secondary hover:border-amber/30 hover:text-amber transition-colors"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRollRequest(turn.id, "cancelled")}
                          className="rounded-lg border border-rose/20 bg-rose/5 px-3 py-2 text-[10px] uppercase tracking-widest text-rose/80 hover:border-rose/40 hover:text-rose transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Dice Rolls */}
            {turn.type === "roll" && (() => {
              const meta = parseRollMetadata(turn.metadata);
              const total: number | null = meta?.total ?? meta?.result ?? null;
              const tier = meta?.tier ?? "";
              const attribute = meta?.attribute ?? "";
              const modifier = meta?.modifier ?? 0;

              const tierColor = tier === "success"
                ? "text-amber drop-shadow-[0_0_10px_rgba(200,150,60,0.8)]"
                : tier === "partial"
                  ? "text-yellow-400"
                  : tier === "failure"
                    ? "text-red-400"
                    : "text-paper";

              const tierLabel = tier === "success" ? "Success" : tier === "partial" ? "Partial" : tier === "failure" ? "Fail" : "";

              return (
                <div className="flex flex-col items-center my-2">
                  <div className="bg-ink border border-amber/30 rounded-xl p-4 w-full flex items-center justify-between shadow-[0_5px_15px_rgba(200,150,60,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber/0 via-amber/5 to-amber/0" />
                    <div className="flex items-center gap-3 z-10">
                      <div className={`w-8 h-8 rounded bg-subtle/30 flex items-center justify-center font-bold text-sm ${getPlayerColor(turn.userId, userIds)}`}>
                        {(turn.characterName ?? turn.user?.displayName ?? "?").charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-widest">
                          2d6{attribute && attribute !== "none" ? ` + ${attribute.toUpperCase()}` : ""}{modifier !== 0 ? ` (${modifier >= 0 ? "+" : ""}${modifier})` : ""}
                        </span>
                        <span className="text-[13px] text-text font-medium">{turn.characterName ?? turn.user?.displayName} Rolled</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 z-10">
                      {tierLabel && (
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${tierColor}`}>{tierLabel}</span>
                      )}
                      <div className={`text-2xl font-display font-bold ${tierColor}`}>
                        {total ?? turn.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

        <div className="mt-auto pt-4" />
      </div>

      {/* Chat Input — OOC only, no dice button (hidden in read-only / spectator mode) */}
      {!readOnly && (
        <div className="p-4 border-t border-border-subtle bg-black/40 backdrop-blur-md shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message party (OOC)... Enter to send"
              className="flex-1 bg-ink border border-border rounded-xl py-3 px-4 text-sm text-paper outline-none focus:border-amber/40 transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="h-11 w-11 shrink-0 rounded-xl border border-amber/25 bg-amber/10 text-amber transition-all hover:bg-amber hover:text-black disabled:cursor-not-allowed disabled:border-border disabled:bg-subtle/20 disabled:text-text-tertiary"
              title="Send message"
              aria-label="Send message"
            >
              <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
