"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Turn, PlayerCharacter, RollRequest } from "./types";
import { getPlayerColor } from "./types";
import InitiativeBar from "./InitiativeBar";
import DiceRoller from "./DiceRoller";

interface StoryCanvasProps {
  storyTurns: Turn[];
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  sessionTitle: string;
  sessionStatus: string;
  sessionOpening: string | null;
  showDiceRoller: boolean;
  onCloseDiceRoller: () => void;
  onCommitDraft: (content: string, type: string) => void;
  onPassTurn: (userId: string) => void;
  onOpenFloor: () => void;
  onEndSession: () => void;
  onTurnExpired: () => void;
  onRollComplete: (total: number, modifier: number, attribute: string) => void;
  pendingRollRequest: RollRequest | null;
  myCharacterStatus: string | null;
  onLastWords: (content: string) => void;
}

export default function StoryCanvas({
  storyTurns,
  characters,
  activePlayerId,
  currentUserId,
  isGM,
  sessionTitle,
  sessionStatus,
  sessionOpening,
  showDiceRoller,
  onCloseDiceRoller,
  onCommitDraft,
  onPassTurn,
  onOpenFloor,
  onEndSession,
  onTurnExpired,
  onRollComplete,
  pendingRollRequest,
  myCharacterStatus,
  onLastWords,
}: StoryCanvasProps) {
  const [draftContent, setDraftContent] = useState("");
  const [draftType, setDraftType] = useState<string>(isGM ? "narration" : "action");
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMyTurn = activePlayerId === currentUserId;
  const isActive = sessionStatus === "active";
  const [lastWordsContent, setLastWordsContent] = useState("");
  const [lastWordsSent, setLastWordsSent] = useState(false);
  const isDraft = sessionStatus === "draft";
  const isCharDead = myCharacterStatus === "dead";
  const isCharRetired = myCharacterStatus === "retired";
  const isCharGone = isCharDead || isCharRetired;

  // GM can always write. Players can write when it's their turn or floor is open. Dead/retired characters can't.
  const canWrite = isActive && !isCharGone && (isGM || isMyTurn || !activePlayerId);

  // Find who's currently writing for the lock screen
  const activeChar = characters.find((c) => c.userId === activePlayerId);
  const activePlayerName = activeChar
    ? `${activeChar.user?.displayName ?? "Someone"} (${activeChar.name})`
    : "another player";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyTurns.length]);

  // Find the current player's character name for the preview
  const myCharName = characters.find((c) => c.userId === currentUserId)?.name ?? null;

  const handleCommit = () => {
    if (!draftContent.trim()) return;
    let content = draftContent.trim();
    // Auto-strip character name if the player typed it at the start
    if (!isGM && myCharName) {
      const namePattern = new RegExp(`^${myCharName}\\s*`, "i");
      content = content.replace(namePattern, "");
      if (!content) return; // nothing left after stripping
    }
    onCommitDraft(content, draftType);
    setDraftContent("");
  };

  // Preview hints showing how the turn will render
  const renderPreview: Record<string, string> = myCharName ? {
    action: `${myCharName} [your text]`,
    dialogue: `${myCharName} said, "[your text]"`,
    reaction: `${myCharName} [your text] (italic)`,
    description: "[your text] (italic, no name)",
    narration: "[your text]",
    consequence: "[your text]",
  } : {};

  // Turn type options
  const GM_TYPES = [
    { key: "narration", label: "Narrate", hint: "Set the scene" },
    { key: "consequence", label: "Consequence", hint: "React to player" },
  ];

  const PLAYER_TYPES = [
    { key: "action", label: "Act", hint: "What you do" },
    { key: "dialogue", label: "Speak", hint: "What you say" },
    { key: "reaction", label: "React", hint: "Your response" },
    { key: "description", label: "Describe", hint: "Color & mood" },
  ];

  const draftTypes = isGM ? GM_TYPES : PLAYER_TYPES;

  const draftPlaceholders: Record<string, string> = {
    narration: "Describe the scene, introduce stakes, set the tone...",
    consequence: "What happens as a result of the player's action?",
    action: "What does your character do?",
    dialogue: "What does your character say?",
    reaction: "Your character's immediate response — a gasp, a flinch, a smile...",
    description: "Set the mood. Describe what it looks, sounds, or feels like...",
  };

  // ── Prose Assembly Engine ──────────────────────────────────
  // Groups turns into paragraphs and handles name/pronoun tracking

  // Dialogue verb templates — cycle through for variety
  const DIALOGUE_VERBS = ["said", "replied", "called out", "murmured", "whispered"];

  // Should two consecutive turns merge into the same paragraph?
  const shouldMerge = (prev: Turn, next: Turn): boolean => {
    const gmTypes = ["narration", "consequence"];
    const playerProseTypes = ["action", "dialogue", "reaction", "description"];

    // GM narration + consequence merge
    if (gmTypes.includes(prev.type) && gmTypes.includes(next.type)) return true;
    // Same character's consecutive turns merge
    if (prev.userId === next.userId && playerProseTypes.includes(prev.type) && playerProseTypes.includes(next.type)) return true;
    // Description merges into preceding narration
    if (gmTypes.includes(prev.type) && next.type === "description") return true;
    // Reaction merges only with same character's preceding turn
    if (next.type === "reaction" && prev.userId === next.userId && playerProseTypes.includes(prev.type)) return true;

    return false;
  };

  // Group turns into paragraphs
  const paragraphs: Turn[][] = [];
  for (const turn of storyTurns) {
    const lastGroup = paragraphs[paragraphs.length - 1];
    if (lastGroup && shouldMerge(lastGroup[lastGroup.length - 1], turn)) {
      lastGroup.push(turn);
    } else {
      paragraphs.push([turn]);
    }
  }

  // Stable player color map
  const playerUserIds = characters.filter((c) => c.status === "active").map((c) => c.userId);

  // Render a single turn within a paragraph, with context awareness
  const renderTurnInContext = (turn: Turn, idx: number, group: Turn[], globalIdx: number) => {
    const charName = turn.characterName ?? turn.user?.displayName ?? "Someone";
    const nameColor = getPlayerColor(turn.userId, playerUserIds);

    // Check if this character was already named recently in this paragraph
    const prevInGroup = group.slice(0, idx);
    const lastNamedSameChar = prevInGroup.findLastIndex((t) =>
      (t.characterName ?? t.user?.displayName) === charName &&
      ["action", "dialogue", "reaction"].includes(t.type)
    );
    const useFullName = lastNamedSameChar === -1 || idx - lastNamedSameChar > 2;

    // Pick dialogue verb based on position for variety
    const dialogueVerb = DIALOGUE_VERBS[globalIdx % DIALOGUE_VERBS.length];

    switch (turn.type) {
      case "narration":
      case "consequence":
        return <span key={turn.id} className="text-paper/80">{turn.content} </span>;

      case "dialogue":
        // Vary dialogue format
        if (globalIdx % 3 === 0 && useFullName) {
          return (
            <span key={turn.id}>
              <span className="text-paper/80">&ldquo;{turn.content},&rdquo; </span>
              <span className={nameColor}>{charName}</span>
              <span className="text-paper/80"> {dialogueVerb}. </span>
            </span>
          );
        }
        if (!useFullName) {
          return <span key={turn.id} className="text-paper/80">&ldquo;{turn.content}&rdquo; </span>;
        }
        return (
          <span key={turn.id}>
            <span className={nameColor}>{charName}</span>
            <span className="text-paper/80"> {dialogueVerb}, &ldquo;{turn.content}&rdquo; </span>
          </span>
        );

      case "reaction":
        if (!useFullName) {
          return <span key={turn.id} className="text-paper/70 italic">{turn.content} </span>;
        }
        return (
          <span key={turn.id}>
            <span className={nameColor}>{charName}</span>
            <span className="text-paper/70 italic"> {turn.content} </span>
          </span>
        );

      case "description":
        return <span key={turn.id} className="text-paper/60 italic">{turn.content} </span>;

      case "action":
      default:
        if (!useFullName) {
          return <span key={turn.id} className="text-paper/80">{turn.content} </span>;
        }
        return (
          <span key={turn.id}>
            <span className={nameColor}>{charName}</span>
            <span className="text-paper/80"> {turn.content} </span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col relative bg-[#0a0a0a]">
      {/* Map Toggle */}
      <div className="absolute top-24 right-4 z-50 flex gap-2">
        <button
          onClick={() => setShowMap(!showMap)}
          className={`border rounded-full px-4 py-1.5 text-xs transition-colors flex items-center gap-2 backdrop-blur-md cursor-pointer ${
            showMap ? "bg-amber text-black border-amber" : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          {showMap ? "Close Map" : "World Map"}
        </button>
      </div>

      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber/[0.02] blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Initiative Bar */}
      <InitiativeBar
        characters={characters}
        activePlayerId={activePlayerId}
        currentUserId={currentUserId}
        isGM={isGM}
        sessionTitle={sessionTitle}
        sessionStatus={sessionStatus}
        onPassTurn={onPassTurn}
        onOpenFloor={onOpenFloor}
        onEndSession={onEndSession}
        onTurnExpired={onTurnExpired}
      />

      {/* Story Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-16 pb-64 px-12 flex flex-col items-center z-10 relative scroll-smooth" style={{ scrollbarWidth: "none" }}>

        {/* Player lock — when it's not your turn and not open floor */}
        {!isGM && activePlayerId && !isMyTurn && isActive && (() => {
          // Check if the active player is another player character, or the GM
          const isGMTurn = !characters.some((c) => c.userId === activePlayerId && c.status === "active");
          return (
            <div className={`absolute inset-0 ${isGMTurn ? "bg-black/20 backdrop-blur-[1px]" : "bg-black/40 backdrop-blur-[2px]"} z-50 flex items-center justify-center pointer-events-none`}>
              {isGMTurn ? (
                <div className="flex flex-col items-center gap-3 text-amber/60">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <p className="font-serif italic text-sm">The GM is setting the scene...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/80 animate-pulse">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p className="font-serif italic text-lg opacity-80">Waiting for {activePlayerName} to write...</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Draft status */}
        {isDraft && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-4 text-white/50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              <p className="font-serif italic text-lg">Session has not started yet</p>
              {isGM && <p className="text-xs text-amber/50">Begin the session from the campaign dashboard.</p>}
            </div>
          </div>
        )}

        {/* Story Content */}
        <div className="w-full max-w-[650px] mb-8">
          <div className="mb-12">
            <h1 className="text-4xl font-display text-white/90">{sessionTitle}</h1>
            <div className="w-24 h-[1px] bg-gradient-to-r from-amber/40 to-transparent mt-6 mb-12" />
          </div>

          {/* Opening narration */}
          {sessionOpening && (
            <div className="mb-10 text-[19px] leading-[2.1] font-serif text-paper/60 italic border-l-2 border-amber/20 pl-6">
              {sessionOpening}
            </div>
          )}

          {storyTurns.length === 0 && !sessionOpening ? (
            <div className="text-center py-20">
              <p className="text-white/20 text-sm font-serif italic">
                {isGM ? "Set the scene with your opening narration." : "Waiting for the GM to begin..."}
              </p>
            </div>
          ) : (
            <div className="text-[19px] leading-[2.1] font-serif space-y-6">
              {paragraphs.map((group, pi) => {
                let globalIdx = 0;
                for (let p = 0; p < pi; p++) globalIdx += paragraphs[p].length;

                return (
                  <p key={group[0].id}>
                    {group.map((turn, ti) => renderTurnInContext(turn, ti, group, globalIdx + ti))}
                    {pi === paragraphs.length - 1 && (
                      <span className="inline-block w-1.5 h-5 bg-amber/40 ml-1 animate-pulse align-middle" />
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* Draft Box */}
        {canWrite && (
          <div className="w-full max-w-[650px] mt-auto">
            <div className="bg-[#111] border border-amber/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-amber">
                {isGM ? "Narrator" : "Your Turn"}
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {draftTypes.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDraftType(t.key)}
                    className={`px-3 py-1 text-[10px] uppercase tracking-[0.08em] font-medium rounded-full border transition-all cursor-pointer ${
                      draftType === t.key
                        ? "bg-amber/15 text-amber border-amber/30"
                        : "bg-white/5 text-white/40 border-white/10 hover:text-white/60"
                    }`}
                    title={t.hint}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Render preview — shows how the turn will appear in the story */}
              {!isGM && renderPreview[draftType] && (
                <div className="mb-2 px-1 text-[11px] text-white/25 font-serif italic">
                  Appears as: {renderPreview[draftType]}
                </div>
              )}

              <textarea
                className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[120px] placeholder:text-white/20"
                placeholder={draftPlaceholders[draftType] ?? "Write..."}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="text-xs text-white/40 font-serif italic">
                  {isGM ? "The narrator sets the stage." : "Take your time. The party is waiting."}
                </div>
                <button
                  onClick={handleCommit}
                  disabled={!draftContent.trim()}
                  className="bg-amber/10 hover:bg-amber border border-amber/20 text-amber hover:text-black transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.5)] disabled:opacity-50 disabled:hover:bg-amber/10 disabled:hover:text-amber disabled:cursor-not-allowed cursor-pointer"
                >
                  Ink to Story
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Last Words — when character has died */}
        {!isGM && isCharDead && !lastWordsSent && isActive && (
          <div className="w-full max-w-[650px] mt-auto">
            <div className="bg-[#111] border border-rose/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-rose">
                Your character has fallen
              </div>

              <p className="text-xs text-white/40 font-serif italic mb-4">
                Write your final moment — a last breath, a whispered name, a defiant gaze. This is your character&apos;s goodbye.
              </p>

              <textarea
                className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[80px] placeholder:text-white/20"
                placeholder="Their final words, their last thought..."
                value={lastWordsContent}
                onChange={(e) => setLastWordsContent(e.target.value)}
              />

              <div className="flex items-center justify-end mt-4 pt-4 border-t border-rose/10">
                <button
                  onClick={() => {
                    if (lastWordsContent.trim()) {
                      onLastWords(lastWordsContent.trim());
                      setLastWordsSent(true);
                    }
                  }}
                  disabled={!lastWordsContent.trim()}
                  className="bg-rose/10 hover:bg-rose border border-rose/20 text-rose hover:text-white transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Final Words
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spectator mode — after death/retirement */}
        {!isGM && isCharGone && (lastWordsSent || isCharRetired) && isActive && (
          <div className="w-full max-w-[650px] mt-8">
            <div className="text-center py-8 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-white/30 text-sm font-serif italic">
                {isCharDead
                  ? "Your character has passed. You are now a spectator."
                  : "Your character has retired from this adventure."}
              </p>
              <p className="text-white/20 text-xs mt-2">You can still chat in the session log.</p>
            </div>
          </div>
        )}

        {/* Session ended */}
        {sessionStatus === "completed" && (
          <div className="w-full max-w-[650px] mt-8">
            <div className="text-center py-8 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-white/40 text-sm font-serif italic">This session has ended.</p>
            </div>
          </div>
        )}
      </div>

      {/* Dice Roller — appears when GM requests a roll from this player */}
      <DiceRoller
        visible={showDiceRoller}
        onClose={onCloseDiceRoller}
        onRollComplete={(total, modifier, attribute) => {
          onRollComplete(total, modifier, attribute);
          onCloseDiceRoller();
        }}
        characters={characters}
        currentUserId={currentUserId}
        preSelectedAttribute={pendingRollRequest?.attribute ?? null}
        rollReason={pendingRollRequest?.reason ?? null}
        rollOnSuccess={pendingRollRequest?.onSuccess ?? null}
        rollOnFailure={pendingRollRequest?.onFailure ?? null}
        rollFatal={pendingRollRequest?.fatal ?? false}
      />

      {/* Map Overlay */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-x-8 inset-y-8 z-40 bg-[#15100a] rounded-3xl border border-amber/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
            <div className="p-6 relative z-10 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-sm">
              <h2 className="text-xl font-display text-amber/90 tracking-widest uppercase">World Map</h2>
              <button onClick={() => setShowMap(false)} className="text-white/40 hover:text-white cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 relative z-10 flex items-center justify-center">
              <div className="w-[80%] h-[80%] border-2 border-dashed border-amber/10 rounded-xl flex items-center justify-center flex-col gap-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber/30">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <p className="font-serif italic text-white/30 text-lg">Interactive Map Canvas</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
