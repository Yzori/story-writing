"use client";

import { useState } from "react";
import type { PlayerCharacter } from "./types";
import { parseStats } from "./types";

interface ContextPanelProps {
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string) => void;
  onPushEvent: (content: string) => void;
}

export default function ContextPanel({
  isGM,
  myCharacter,
  characters,
  activePlayerId,
  onRequestRoll,
  onPushEvent,
}: ContextPanelProps) {
  const [pushEventText, setPushEventText] = useState("");
  const [showPushInput, setShowPushInput] = useState(false);

  // Roll request form state
  const [showRollForm, setShowRollForm] = useState(false);
  const [rollTarget, setRollTarget] = useState<string>("everyone");
  const [rollAttribute, setRollAttribute] = useState("STR");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");

  const activeChars = characters.filter((c) => c.status === "active");

  // Get available attributes from the first character that has stats (as a template)
  const sampleStats = activeChars.length > 0 ? parseStats(activeChars[0].stats) : null;
  const availableAttributes = sampleStats ? Object.keys(sampleStats.attributes) : ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  if (isGM) {
    return (
      <div className="w-[300px] h-full flex flex-col border-l border-white/5 bg-[#050505] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden xl:flex">
        {/* GM Header */}
        <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center font-display text-amber text-lg border border-amber/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber/90">Game Master</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Dashboard & Tools</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "none" }}>
          {/* Party Status */}
          <div className="space-y-4 mb-8">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Party Status</h3>
            {activeChars.length === 0 && (
              <p className="text-[11px] text-white/20 italic font-serif">No players have joined yet.</p>
            )}
            {activeChars.map((c) => {
              const stats = parseStats(c.stats);
              return (
                <div key={c.id} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.02] to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.userId === activePlayerId ? "bg-amber shadow-[0_0_8px_rgba(200,150,60,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} />
                    <span className="text-xs text-white/80">{c.name}</span>
                  </div>
                  <span className="text-[10px] text-white/40 uppercase">
                    {stats ? `HP ${stats.hp.current}/${stats.hp.max}` : c.user?.displayName ?? "Player"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* GM Actions */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber border-b border-amber/20 pb-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Direct Actions
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {/* Request Roll — structured form */}
              {showRollForm ? (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Request Roll</p>

                  {/* Target */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Who</label>
                    <select
                      value={rollTarget}
                      onChange={(e) => setRollTarget(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      {activeChars.map((c) => (
                        <option key={c.userId} value={c.userId}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Attribute */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Attribute</label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {availableAttributes.map((attr) => (
                        <button
                          key={attr}
                          onClick={() => setRollAttribute(attr)}
                          className={`px-2 py-1 text-[10px] uppercase rounded border transition-all cursor-pointer ${
                            rollAttribute === attr
                              ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                          }`}
                        >
                          {attr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">What for</label>
                    <input
                      type="text"
                      value={rollReason}
                      onChange={(e) => setRollReason(e.target.value)}
                      placeholder="to pick the lock, to notice the trap..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20"
                    />
                  </div>

                  {/* Stakes */}
                  <div>
                    <label className="text-[9px] uppercase text-emerald-400/60 tracking-wider">On success</label>
                    <input
                      type="text"
                      value={rollOnSuccess}
                      onChange={(e) => setRollOnSuccess(e.target.value)}
                      placeholder="You slip through undetected"
                      className="w-full bg-black/30 border border-emerald-500/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase text-red-400/60 tracking-wider">On failure</label>
                    <input
                      type="text"
                      value={rollOnFailure}
                      onChange={(e) => setRollOnFailure(e.target.value)}
                      placeholder="The lockpick snaps — guards hear you"
                      className="w-full bg-black/30 border border-red-500/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-red-500/30"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (rollReason.trim()) {
                          onRequestRoll(rollTarget, rollAttribute, rollReason.trim(), rollOnSuccess.trim(), rollOnFailure.trim());
                          setRollReason(""); setRollOnSuccess(""); setRollOnFailure("");
                          setShowRollForm(false);
                        }
                      }}
                      disabled={!rollReason.trim()}
                      className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-[10px] uppercase tracking-wider font-bold rounded py-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Request
                    </button>
                    <button onClick={() => setShowRollForm(false)} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRollForm(true)}
                  className="bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 rounded-lg p-3 text-left transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-sm text-violet-400 font-medium">Request Roll...</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400/50 group-hover:translate-x-1 transition-transform">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}

              {/* Push Turn Event */}
              {showPushInput ? (
                <div className="bg-[#111] border border-white/10 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={pushEventText}
                    onChange={(e) => setPushEventText(e.target.value)}
                    placeholder="e.g. A sudden tremor shakes the chamber..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/30"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pushEventText.trim()) {
                        onPushEvent(pushEventText.trim());
                        setPushEventText("");
                        setShowPushInput(false);
                      }
                      if (e.key === "Escape") setShowPushInput(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (pushEventText.trim()) {
                          onPushEvent(pushEventText.trim());
                          setPushEventText("");
                          setShowPushInput(false);
                        }
                      }}
                      disabled={!pushEventText.trim()}
                      className="flex-1 bg-white/10 hover:bg-white/15 text-white/80 text-[10px] uppercase tracking-wider font-bold rounded py-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Push
                    </button>
                    <button onClick={() => setShowPushInput(false)} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPushInput(true)}
                  className="bg-[#111] hover:bg-white/5 border border-white/10 rounded-lg p-3 text-left transition-colors flex flex-col group cursor-pointer"
                >
                  <span className="text-sm text-white/80 shrink-0">Push Narrative Event</span>
                  <span className="text-[10px] text-white/40 mt-1">Inject an unexpected turn of events.</span>
                </button>
              )}
            </div>
          </div>

          {/* Audio Mixer Stub */}
          <div className="space-y-4 mt-8 pb-8">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-cyan-400 border-b border-cyan-400/20 pb-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Synchronized Audio
            </h3>
            <div className="bg-[#111] border border-white/5 rounded-lg p-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-white/80 font-medium">Cavern Ambience</span>
                <div className="w-8 h-4 bg-cyan-400/20 rounded-full flex items-center p-0.5 relative cursor-pointer">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full absolute right-0.5 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                </div>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[65%] h-full bg-cyan-400/50" />
              </div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mt-3 text-center">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Player View ──────────────────────────────────────────────
  const stats = myCharacter ? parseStats(myCharacter.stats) : null;

  return (
    <div className="w-[300px] h-full flex flex-col border-l border-white/5 bg-[#050505] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden xl:flex">
      <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center font-display text-rose text-lg border border-rose/30">
            {myCharacter ? myCharacter.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white/90">{myCharacter?.name ?? "No Character"}</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">{myCharacter?.traits ?? "Create a character to play"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "none" }}>
        {!myCharacter ? (
          <div className="text-center py-12">
            <p className="text-white/30 text-xs font-serif italic">Join the campaign to see your character sheet here.</p>
          </div>
        ) : stats ? (
          <>
            <div className="space-y-4 mb-8">
              <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Vitals</h3>
              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                <span className="text-xs text-white/60">Health Points</span>
                <span className="text-sm text-rose font-medium">{stats.hp.current} <span className="text-white/30">/ {stats.hp.max}</span></span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                <span className="text-xs text-white/60">Magic Spark</span>
                <span className="text-sm text-indigo-400 font-medium">{stats.mp.current} <span className="text-white/30">/ {stats.mp.max}</span></span>
              </div>
            </div>

            {Object.keys(stats.attributes).length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Attributes</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(stats.attributes).map(([key, val]) => {
                    const isHighest = val === Math.max(...Object.values(stats.attributes));
                    return (
                      <div key={key} className={`rounded-lg p-2 flex flex-col items-center ${isHighest ? "bg-[#111] border border-amber/30 shadow-[inset_0_2px_10px_rgba(200,150,60,0.1)]" : "bg-[#111] border border-white/10"}`}>
                        <span className={`text-[9px] uppercase ${isHighest ? "text-amber/60" : "text-white/40"}`}>{key}</span>
                        <span className={`text-lg font-display mt-1 ${isHighest ? "text-amber" : "text-white"}`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.items.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Key Items</h3>
                <ul className="text-xs text-white/60 font-serif space-y-2 leading-relaxed">
                  {stats.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={i === 0 ? "text-amber" : "text-white/30"}>{i === 0 ? "✦" : "-"}</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {myCharacter.description && (
              <div>
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2 mb-3">About</h3>
                <p className="text-xs text-white/60 font-serif leading-relaxed">{myCharacter.description}</p>
              </div>
            )}
            {myCharacter.traits && (
              <div>
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2 mb-3">Traits</h3>
                <p className="text-xs text-white/60 font-serif leading-relaxed">{myCharacter.traits}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
