"use client";

import { useState } from "react";
import type { PlayerCharacter, SessionRosterEntry } from "@/types/campaign";
import { parseStats } from "@/types/campaign";
import ProgressClock from "./ProgressClock";
import type { ProgressClockData } from "./ProgressClock";
import StakesTracker from "./StakesTracker";
import CharacterSheetSection from "./CharacterSheetSection";
import RollRequestForm from "./RollRequestForm";

interface ContextPanelProps {
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
  onPushEvent: (content: string) => void;
  onChangeCharacterStatus: (characterId: string, status: "active" | "retired" | "dead") => void;
  onSceneBreak?: (title: string, mood: string, aspects?: string[]) => void;
  onStoryMoment?: (text: string, mood: string, subtext?: string) => void;
  onAddIllustration?: (imageUrl: string, caption?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  roster?: SessionRosterEntry[];
  onInviteNewCharacter?: (userId: string) => void;
  /** Tension clocks — local session-scoped state */
  clocks?: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
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
  onAddIllustration,
  isCollapsed = false,
  onToggleCollapse,
  roster = [],
  onInviteNewCharacter,
  clocks = [],
  onClocksChange,
}: ContextPanelProps) {
  const [pushEventText, setPushEventText] = useState("");
  const [showPushInput, setShowPushInput] = useState(false);

  // Scene break form state
  const [showSceneBreakForm, setShowSceneBreakForm] = useState(false);
  const [sceneBreakTitle, setSceneBreakTitle] = useState("");
  const [sceneBreakMood, setSceneBreakMood] = useState("ominous");
  const [sceneBreakAspects, setSceneBreakAspects] = useState<string[]>([]);
  const [sceneBreakAspectInput, setSceneBreakAspectInput] = useState("");

  // Story moment form state
  const [showStoryMomentForm, setShowStoryMomentForm] = useState(false);
  const [storyMomentText, setStoryMomentText] = useState("");
  const [storyMomentSubtext, setStoryMomentSubtext] = useState("");
  const [storyMomentMood, setStoryMomentMood] = useState("ominous");

  // Illustration form state
  const [showIllustrationForm, setShowIllustrationForm] = useState(false);
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [illustrationCaption, setIllustrationCaption] = useState("");

  const activeChars = characters.filter((c) => c.status === "active");

  // Helper: add aspect tag
  const addAspect = () => {
    const tag = sceneBreakAspectInput.trim();
    if (tag && !sceneBreakAspects.includes(tag)) {
      setSceneBreakAspects((prev) => [...prev, tag]);
    }
    setSceneBreakAspectInput("");
  };

  // Collapsed sidebar (shared between GM and player views)
  if (isCollapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-center border-l border-white/5 bg-[#050505] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden xl:flex py-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-all cursor-pointer"
          title={isGM ? "Expand GM Dashboard" : "Expand Character Sheet"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="w-px flex-1 bg-white/5" />
        <div className="flex flex-col items-center gap-2">
          {isGM ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          ) : (
            <div className="w-6 h-6 rounded-full bg-rose/20 flex items-center justify-center text-rose text-[10px] font-display border border-rose/30">
              {myCharacter?.name?.charAt(0) ?? "?"}
            </div>
          )}
          <span className="text-[9px] text-white/30 font-mono">{characters.filter(c => c.status === "active").length}P</span>
        </div>
      </div>
    );
  }

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
            <div className="flex-1">
              <h2 className="text-sm font-bold text-amber/90">Game Master</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Dashboard & Tools</p>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all cursor-pointer"
                title="Collapse GM Dashboard"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "none" }}>
          {/* Tension Clocks */}
          {(clocks.length > 0 || onClocksChange) && (
            <StakesTracker clocks={clocks} onClocksChange={onClocksChange} />
          )}

          {/* Party Status */}
          <CharacterSheetSection
            characters={characters}
            activePlayerId={activePlayerId}
            onChangeCharacterStatus={onChangeCharacterStatus}
            onInviteNewCharacter={onInviteNewCharacter}
            roster={roster}
          />

          {/* GM Actions */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber border-b border-amber/20 pb-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Direct Actions
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {/* Call for a Moment of Truth (formerly Request Roll) */}
              <RollRequestForm activeChars={activeChars} onRequestRoll={onRequestRoll} />

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

                  {/* Aspect tags input */}
                  <div>
                    <label className="text-[9px] uppercase text-white/30 tracking-wider">Scene Aspects (optional)</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sceneBreakAspects.map((aspect) => (
                        <span
                          key={aspect}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-white/50 font-serif italic"
                        >
                          {aspect}
                          <button
                            onClick={() => setSceneBreakAspects((prev) => prev.filter((a) => a !== aspect))}
                            className="text-white/30 hover:text-white/60 cursor-pointer"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={sceneBreakAspectInput}
                      onChange={(e) => setSceneBreakAspectInput(e.target.value)}
                      placeholder="e.g. Torrential Rain, No Escape..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addAspect();
                        }
                      }}
                    />
                    <p className="text-[8px] text-white/15 mt-0.5">Press Enter or comma to add</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        // Add any pending aspect text
                        const finalAspects = [...sceneBreakAspects];
                        if (sceneBreakAspectInput.trim()) {
                          finalAspects.push(sceneBreakAspectInput.trim());
                        }
                        onSceneBreak?.(sceneBreakTitle.trim(), sceneBreakMood, finalAspects.length > 0 ? finalAspects : undefined);
                        setSceneBreakTitle("");
                        setSceneBreakMood("ominous");
                        setSceneBreakAspects([]);
                        setSceneBreakAspectInput("");
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

              {/* Illustration */}
              {showIllustrationForm ? (
                <div className="relative bg-black/60 border border-amber/30 rounded-lg p-3 space-y-3 shadow-[0_0_20px_rgba(200,150,60,0.08),inset_0_1px_0_rgba(200,150,60,0.1)]">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-amber/5 to-transparent pointer-events-none" />
                  <div className="relative space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-amber font-bold flex items-center gap-2">
                      Set the Scene
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/60">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </p>

                    {/* Image URL */}
                    <div>
                      <label className="text-[9px] uppercase text-white/30 tracking-wider">Image URL</label>
                      <input
                        type="text"
                        value={illustrationUrl}
                        onChange={(e) => setIllustrationUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30"
                        autoFocus
                      />
                      <p className="text-[9px] text-white/20 mt-1">
                        Paste any image URL.{" "}
                        <a href="https://unsplash.com/s/photos/fantasy-landscape" target="_blank" rel="noopener noreferrer" className="text-amber/40 hover:text-amber/60 underline underline-offset-2 transition-colors">
                          Browse Unsplash for free images
                        </a>
                      </p>
                    </div>

                    {/* Image preview */}
                    {illustrationUrl.trim() && (
                      <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={illustrationUrl.trim()}
                          alt="Preview"
                          className="w-full max-h-32 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
                        />
                      </div>
                    )}

                    {/* Caption */}
                    <div>
                      <label className="text-[9px] uppercase text-white/30 tracking-wider">Caption (optional)</label>
                      <textarea
                        value={illustrationCaption}
                        onChange={(e) => setIllustrationCaption(e.target.value)}
                        placeholder="What does the party see?"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-amber/30 resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (illustrationUrl.trim()) {
                            onAddIllustration?.(illustrationUrl.trim(), illustrationCaption.trim() || undefined);
                            setIllustrationUrl("");
                            setIllustrationCaption("");
                            setShowIllustrationForm(false);
                          }
                        }}
                        disabled={!illustrationUrl.trim()}
                        className="flex-1 bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber text-[10px] uppercase tracking-wider font-bold rounded py-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Place in Story
                      </button>
                      <button onClick={() => { setShowIllustrationForm(false); setIllustrationUrl(""); setIllustrationCaption(""); }} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowIllustrationForm(true)}
                  className="bg-amber/5 hover:bg-amber/10 border border-amber/20 rounded-lg p-3 text-left transition-colors flex flex-col group cursor-pointer"
                >
                  <span className="text-sm text-amber/90 font-medium flex items-center gap-2">
                    Set the Scene...
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </span>
                  <span className="text-[10px] text-white/40 mt-1">Drop an illustration into the story.</span>
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
            <div className="bg-[#111] border border-white/5 rounded-lg p-3 opacity-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-white/50 font-medium">Cavern Ambience</span>
                <div className="w-8 h-4 bg-white/10 rounded-full flex items-center p-0.5 relative cursor-not-allowed" title="Coming soon">
                  <div className="w-3 h-3 bg-white/30 rounded-full absolute left-0.5" />
                </div>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-0 h-full bg-cyan-400/50" />
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/30" />
                <p className="text-[10px] text-cyan-400/40 uppercase tracking-widest font-bold">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ── Player View ──────────────────────────────────────────────
  const stats = myCharacter ? parseStats(myCharacter.stats) : null;

  // Check if the current player is spectating (dead/spectating, no active char)
  const currentUserId = myCharacter?.userId;
  const isSpectating = currentUserId && !myCharacter?.status?.match(/^active$/) && !characters.some(
    (c) => c.userId === currentUserId && c.id !== myCharacter?.id && c.status === "active"
  );

  return (
    <div className="w-[300px] h-full flex flex-col border-l border-white/5 bg-[#050505] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden xl:flex">
      <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center font-display text-rose text-lg border border-rose/30">
            {myCharacter ? myCharacter.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white/90">{myCharacter?.name ?? "No Character"}</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">{myCharacter?.traits ?? "Create a character to play"}</p>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all cursor-pointer"
              title="Collapse Character Sheet"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Player-visible tension clocks */}
      {clocks.length > 0 && (
        <div className="px-6 py-3 border-b border-white/5 bg-black/20">
          <div className="flex flex-wrap gap-3 justify-center">
            {clocks.map((clock) => (
              <ProgressClock
                key={clock.id}
                clock={clock}
                size={40}
                interactive={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spectator banner */}
      {isSpectating && myCharacter && (
        <div className="px-6 py-4 bg-gradient-to-r from-violet-500/10 to-rose/10 border-b border-white/5">
          <p className="text-xs text-white/50 font-serif italic leading-relaxed">
            Your character&rsquo;s story has ended. When the GM invites you, you can create a new character from the campaign hub.
          </p>
        </div>
      )}

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
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/30 border-b border-white/10 pb-2 mb-3">Defining Belief</h3>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-violet-300 font-serif italic leading-relaxed">&ldquo;{stats.aspect}&rdquo;</p>
                  <p className="text-[9px] text-violet-400/40 uppercase tracking-widest mt-2">Your character&rsquo;s essence</p>
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
