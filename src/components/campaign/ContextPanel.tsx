"use client";

import { useState } from "react";
import type { PlayerCharacter } from "./types";
import { parseStats, APPROACHES } from "./types";

interface ContextPanelProps {
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
  onPushEvent: (content: string) => void;
  onChangeCharacterStatus: (characterId: string, status: "active" | "retired" | "dead") => void;
  onSceneBreak?: (title: string, mood: string) => void;
  onStoryMoment?: (text: string, mood: string, subtext?: string) => void;
}

export default function ContextPanel({
  isGM,
  myCharacter,
  characters,
  activePlayerId,
  onRequestRoll,
  onPushEvent,
  onChangeCharacterStatus,
  onSceneBreak,
  onStoryMoment,
}: ContextPanelProps) {
  const [pushEventText, setPushEventText] = useState("");
  const [showPushInput, setShowPushInput] = useState(false);

  // Scene break form state
  const [showSceneBreakForm, setShowSceneBreakForm] = useState(false);
  const [sceneBreakTitle, setSceneBreakTitle] = useState("");
  const [sceneBreakMood, setSceneBreakMood] = useState("ominous");

  // Story moment form state
  const [showStoryMomentForm, setShowStoryMomentForm] = useState(false);
  const [storyMomentText, setStoryMomentText] = useState("");
  const [storyMomentSubtext, setStoryMomentSubtext] = useState("");
  const [storyMomentMood, setStoryMomentMood] = useState("ominous");

  // Roll request form state
  const [showRollForm, setShowRollForm] = useState(false);
  const [rollTarget, setRollTarget] = useState<string>("everyone");
  const [rollAttribute, setRollAttribute] = useState("Bold");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");
  const [rollFatal, setRollFatal] = useState(false);

  const activeChars = characters.filter((c) => c.status === "active");

  const availableApproaches = [...APPROACHES];

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
            {characters.length === 0 && (
              <p className="text-[11px] text-white/20 italic font-serif">No players have joined yet.</p>
            )}
            {characters.map((c) => {
              const stats = parseStats(c.stats);
              const isDead = c.status === "dead";
              const isRetired = c.status === "retired";
              const isInactive = isDead || isRetired;

              return (
                <div key={c.id} className={`bg-white/[0.02] p-3 rounded-lg border border-white/5 transition-colors relative overflow-hidden ${isInactive ? "opacity-40" : "hover:border-white/10"}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        isDead ? "bg-rose shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                        : isRetired ? "bg-lavender/50"
                        : c.userId === activePlayerId ? "bg-amber shadow-[0_0_8px_rgba(200,150,60,0.5)]"
                        : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      }`} />
                      <span className={`text-xs ${isInactive ? "text-white/40 line-through" : "text-white/80"}`}>{c.name}</span>
                      {isDead && <span className="text-[9px] text-rose/60 uppercase tracking-wider">Fallen</span>}
                      {isRetired && <span className="text-[9px] text-lavender/60 uppercase tracking-wider">Retired</span>}
                    </div>
                    <span className="text-[10px] text-white/40">
                      {stats && !isInactive ? `B${stats.approaches.Bold >= 0 ? "+" : ""}${stats.approaches.Bold} K${stats.approaches.Keen >= 0 ? "+" : ""}${stats.approaches.Keen} S${stats.approaches.Subtle >= 0 ? "+" : ""}${stats.approaches.Subtle}` : ""}
                    </span>
                  </div>

                  {/* GM character actions */}
                  {!isInactive && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => onChangeCharacterStatus(c.id, "retired")}
                        className="text-[9px] text-lavender/50 hover:text-lavender uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Retire
                      </button>
                      <button
                        onClick={() => onChangeCharacterStatus(c.id, "dead")}
                        className="text-[9px] text-rose/50 hover:text-rose uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Kill
                      </button>
                    </div>
                  )}
                  {isInactive && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => onChangeCharacterStatus(c.id, "active")}
                        className="text-[9px] text-sage/50 hover:text-sage uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Revive
                      </button>
                    </div>
                  )}
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

                  {/* Approach */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Approach</label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {availableApproaches.map((approach) => (
                        <button
                          key={approach}
                          onClick={() => setRollAttribute(approach)}
                          className={`px-2.5 py-1.5 text-[10px] rounded border transition-all cursor-pointer ${
                            rollAttribute === approach
                              ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                          }`}
                        >
                          {approach}
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

                  {/* Fatal stakes toggle */}
                  <button
                    type="button"
                    onClick={() => setRollFatal(!rollFatal)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer w-full ${
                      rollFatal
                        ? "bg-rose/15 border-rose/30 text-rose"
                        : "bg-white/[0.02] border-white/10 text-white/30 hover:text-white/50"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a5 5 0 0 1 5 5c0 2-1 3-2 4l-1 1v2h-4v-2l-1-1c-1-1-2-2-2-4a5 5 0 0 1 5-5z" />
                      <path d="M10 20h4" /><path d="M10 22h4" />
                    </svg>
                    {rollFatal ? "Fatal stakes active" : "Fatal stakes"}
                    {rollFatal && <span className="text-[8px] text-rose/50 font-normal normal-case ml-auto">Failure = death</span>}
                  </button>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (rollReason.trim()) {
                          onRequestRoll(rollTarget, rollAttribute, rollReason.trim(), rollOnSuccess.trim(), rollOnFailure.trim(), rollFatal);
                          setRollReason(""); setRollOnSuccess(""); setRollOnFailure(""); setRollFatal(false);
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

              {/* Scene Break */}
              {showSceneBreakForm ? (
                <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-amber font-bold">Scene Break</p>

                  {/* Title */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Title (optional)</label>
                    <input
                      type="text"
                      value={sceneBreakTitle}
                      onChange={(e) => setSceneBreakTitle(e.target.value)}
                      placeholder="The Descent Begins..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30"
                      autoFocus
                    />
                  </div>

                  {/* Mood pills */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Mood</label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {(["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic"] as const).map((mood) => {
                        const moodColors: Record<string, string> = {
                          tense: "bg-rose/20 border-rose/40 text-rose",
                          calm: "bg-sage/20 border-sage/40 text-sage",
                          ominous: "bg-violet/20 border-violet/40 text-violet",
                          triumphant: "bg-amber/20 border-amber/40 text-amber",
                          melancholy: "bg-indigo-400/20 border-indigo-400/40 text-indigo-400",
                          chaotic: "bg-orange-400/20 border-orange-400/40 text-orange-400",
                          mysterious: "bg-cyan-400/20 border-cyan-400/40 text-cyan-400",
                          romantic: "bg-pink-400/20 border-pink-400/40 text-pink-400",
                        };
                        return (
                          <button
                            key={mood}
                            onClick={() => setSceneBreakMood(mood)}
                            className={`px-2.5 py-1.5 text-[10px] rounded border transition-all cursor-pointer capitalize ${
                              sceneBreakMood === mood
                                ? moodColors[mood]
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                            }`}
                          >
                            {mood}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        onSceneBreak?.(sceneBreakTitle.trim(), sceneBreakMood);
                        setSceneBreakTitle("");
                        setSceneBreakMood("ominous");
                        setShowSceneBreakForm(false);
                      }}
                      className="flex-1 bg-amber/20 hover:bg-amber/30 text-amber text-[10px] uppercase tracking-wider font-bold rounded py-1.5 cursor-pointer"
                    >
                      Set Scene
                    </button>
                    <button onClick={() => setShowSceneBreakForm(false)} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSceneBreakForm(true)}
                  className="bg-amber/5 hover:bg-amber/10 border border-amber/20 rounded-lg p-3 text-left transition-colors flex flex-col group cursor-pointer"
                >
                  <span className="text-sm text-amber/90 font-medium">Scene Break...</span>
                  <span className="text-[10px] text-white/40 mt-1">Mark a new scene or act in the story.</span>
                </button>
              )}

              {/* Story Moment */}
              {showStoryMomentForm ? (
                <div className="relative bg-black/60 border border-amber/30 rounded-lg p-3 space-y-3 shadow-[0_0_20px_rgba(200,150,60,0.08),inset_0_1px_0_rgba(200,150,60,0.1)]">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-amber/5 to-rose/5 pointer-events-none" />
                  <div className="relative space-y-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                      <span className="bg-gradient-to-r from-amber to-rose bg-clip-text text-transparent">Story Moment</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#moment-grad)" strokeWidth="2">
                        <defs>
                          <linearGradient id="moment-grad" x1="0" y1="0" x2="24" y2="24">
                            <stop offset="0%" stopColor="rgb(200,150,60)" />
                            <stop offset="100%" stopColor="rgb(244,63,94)" />
                          </linearGradient>
                        </defs>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </p>

                    {/* Text */}
                    <div>
                      <label className="text-[9px] uppercase text-white/30 tracking-wider">Text</label>
                      <input
                        type="text"
                        value={storyMomentText}
                        onChange={(e) => setStoryMomentText(e.target.value)}
                        placeholder="The temple crumbles around them..."
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30"
                        autoFocus
                      />
                    </div>

                    {/* Subtext */}
                    <div>
                      <label className="text-[9px] uppercase text-white/30 tracking-wider">Subtext (optional)</label>
                      <input
                        type="text"
                        value={storyMomentSubtext}
                        onChange={(e) => setStoryMomentSubtext(e.target.value)}
                        placeholder="Optional secondary line..."
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30"
                      />
                    </div>

                    {/* Mood pills */}
                    <div>
                      <label className="text-[9px] uppercase text-white/30 tracking-wider">Mood</label>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {(["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic", "death", "betrayal"] as const).map((mood) => {
                          const moodColors: Record<string, string> = {
                            tense: "bg-rose/20 border-rose/40 text-rose",
                            calm: "bg-sage/20 border-sage/40 text-sage",
                            ominous: "bg-violet/20 border-violet/40 text-violet",
                            triumphant: "bg-amber/20 border-amber/40 text-amber",
                            melancholy: "bg-indigo-400/20 border-indigo-400/40 text-indigo-400",
                            chaotic: "bg-orange-400/20 border-orange-400/40 text-orange-400",
                            mysterious: "bg-cyan-400/20 border-cyan-400/40 text-cyan-400",
                            romantic: "bg-pink-400/20 border-pink-400/40 text-pink-400",
                            death: "bg-red-900/30 border-red-700/50 text-red-400",
                            betrayal: "bg-fuchsia-900/30 border-fuchsia-700/50 text-fuchsia-400",
                          };
                          return (
                            <button
                              key={mood}
                              onClick={() => setStoryMomentMood(mood)}
                              className={`px-2.5 py-1.5 text-[10px] rounded border transition-all cursor-pointer capitalize ${
                                storyMomentMood === mood
                                  ? moodColors[mood]
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                              }`}
                            >
                              {mood}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (storyMomentText.trim()) {
                            onStoryMoment?.(storyMomentText.trim(), storyMomentMood, storyMomentSubtext.trim() || undefined);
                            setStoryMomentText("");
                            setStoryMomentSubtext("");
                            setStoryMomentMood("ominous");
                            setShowStoryMomentForm(false);
                          }
                        }}
                        disabled={!storyMomentText.trim()}
                        className="flex-1 bg-gradient-to-r from-amber/30 to-rose/30 hover:from-amber/40 hover:to-rose/40 text-white text-[10px] uppercase tracking-wider font-bold rounded py-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-amber/20 shadow-[0_0_12px_rgba(200,150,60,0.15)]"
                      >
                        Play Moment
                      </button>
                      <button onClick={() => setShowStoryMomentForm(false)} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowStoryMomentForm(true)}
                  className="relative bg-black/40 hover:bg-black/60 border border-amber/15 hover:border-amber/30 rounded-lg p-3 text-left transition-all flex flex-col group cursor-pointer overflow-hidden shadow-[0_0_15px_rgba(200,150,60,0.05)]"
                >
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber/5 to-rose/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className="relative text-sm font-medium flex items-center gap-2">
                    <span className="bg-gradient-to-r from-amber to-rose bg-clip-text text-transparent">Story Moment...</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <span className="relative text-[10px] text-white/40 mt-1">Play a cinematic overlay moment.</span>
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
            {/* Aspect */}
            {stats.aspect && (
              <div className="mb-6">
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2 mb-3">Aspect</h3>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-violet-300 font-serif italic leading-relaxed">&ldquo;{stats.aspect}&rdquo;</p>
                  <p className="text-[9px] text-violet-400/40 uppercase tracking-widest mt-2">Invoke for +1 when relevant</p>
                </div>
              </div>
            )}

            {/* Approaches */}
            <div className="space-y-4 mb-8">
              <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2">Approaches</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stats.approaches).map(([key, val]) => {
                  const isHighest = val === Math.max(...Object.values(stats.approaches));
                  const descriptions: Record<string, string> = { Bold: "Force & courage", Keen: "Wit & cunning", Subtle: "Grace & finesse" };
                  return (
                    <div key={key} className={`rounded-lg p-3 flex flex-col items-center ${isHighest ? "bg-[#111] border border-amber/30 shadow-[inset_0_2px_10px_rgba(200,150,60,0.1)]" : "bg-[#111] border border-white/10"}`}>
                      <span className={`text-[9px] uppercase ${isHighest ? "text-amber/60" : "text-white/40"}`}>{key}</span>
                      <span className={`text-2xl font-display mt-1 ${isHighest ? "text-amber" : val < 0 ? "text-red-400/60" : "text-white"}`}>
                        {val >= 0 ? `+${val}` : val}
                      </span>
                      <span className="text-[8px] text-white/20 mt-1">{descriptions[key]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
