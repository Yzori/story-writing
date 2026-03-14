"use client";

import { useRef, useEffect, useMemo } from "react";
import type { Turn } from "./types";
import { getPlayerColor } from "./types";

interface SessionLogProps {
  turns: Turn[];
  currentUserId: string | null;
  sessionTitle: string;
  storyTitle: string;
  onSendChat: (message: string) => void;
  chatInput: string;
  setChatInput: (val: string) => void;
}

export default function SessionLog({
  turns,
  currentUserId,
  sessionTitle,
  storyTitle,
  onSendChat,
  chatInput,
  setChatInput,
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

  return (
    <div className="w-[320px] lg:w-[380px] h-full flex flex-col border-r border-white/5 bg-[#050505] shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md pb-4 shrink-0">
        <h2 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber mb-1">Session Log</h2>
        <p className="text-white/40 text-xs font-serif italic">{storyTitle} — {sessionTitle}</p>
      </div>

      {/* Event Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col" style={{ scrollbarWidth: "none" }}>
        {turns.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/20 text-xs italic font-serif">No messages yet...</p>
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
                    ? "bg-amber/10 border border-amber/20 text-white"
                    : "bg-white/5 border border-white/5 text-white/80"
                }`}>
                  {turn.content}
                </div>
              </div>
            )}

            {/* Roll Requests (GM asking for a roll) */}
            {turn.type === "roll-request" && (() => {
              let attribute = "";
              let reason = "";
              try {
                const meta = JSON.parse(turn.metadata ?? "{}");
                attribute = meta.attribute ?? "";
                reason = meta.reason ?? "";
              } catch { /* ignore */ }

              return (
                <div className="flex flex-col items-center my-2">
                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 w-full text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0" />
                    <p className="text-[10px] text-violet-400 uppercase tracking-widest font-bold z-10 relative">
                      Roll Requested
                    </p>
                    <p className="text-xs text-white/60 mt-1 z-10 relative">
                      {attribute.toUpperCase()} check — {reason}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Dice Rolls */}
            {turn.type === "roll" && (() => {
              let total: number | null = null;
              let tier = "";
              let attribute = "";
              let modifier = 0;
              if (turn.metadata) {
                try {
                  const meta = JSON.parse(turn.metadata);
                  total = meta.total ?? meta.result ?? null;
                  tier = meta.tier ?? "";
                  attribute = meta.attribute ?? "";
                  modifier = meta.modifier ?? 0;
                } catch { /* ignore */ }
              }

              const tierColor = tier === "success"
                ? "text-amber drop-shadow-[0_0_10px_rgba(200,150,60,0.8)]"
                : tier === "partial"
                  ? "text-yellow-400"
                  : tier === "failure"
                    ? "text-red-400"
                    : "text-white";

              const tierLabel = tier === "success" ? "Success" : tier === "partial" ? "Partial" : tier === "failure" ? "Fail" : "";

              return (
                <div className="flex flex-col items-center my-2">
                  <div className="bg-[#111] border border-amber/30 rounded-xl p-4 w-full flex items-center justify-between shadow-[0_5px_15px_rgba(200,150,60,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber/0 via-amber/5 to-amber/0" />
                    <div className="flex items-center gap-3 z-10">
                      <div className={`w-8 h-8 rounded bg-white/5 flex items-center justify-center font-bold text-sm ${getPlayerColor(turn.userId, userIds)}`}>
                        {(turn.characterName ?? turn.user?.displayName ?? "?").charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">
                          2d6{attribute && attribute !== "none" ? ` + ${attribute.toUpperCase()}` : ""}{modifier !== 0 ? ` (${modifier >= 0 ? "+" : ""}${modifier})` : ""}
                        </span>
                        <span className="text-[13px] text-white/80 font-medium">{turn.characterName ?? turn.user?.displayName} Rolled</span>
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

      {/* Chat Input — OOC only, no dice button */}
      <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Message party (OOC)..."
            className="flex-1 bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-amber/40 transition-colors"
          />
        </form>
      </div>
    </div>
  );
}
