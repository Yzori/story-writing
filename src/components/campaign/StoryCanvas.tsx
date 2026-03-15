"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Turn, PlayerCharacter, RollRequest } from "./types";
import { getPlayerColor } from "./types";
import InitiativeBar from "./InitiativeBar";
import DiceRoller from "./DiceRoller";
import SessionLobby from "./SessionLobby";

interface StoryCanvasProps {
  sessionId: string;
  storyId?: string;
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
  onReaction?: (reactionKey: string) => void;
  lobbyTheme?: string;
  onBeginSession?: () => void;
}

// ── Session Ended Block (compile to chapter) ────────────────

function SessionEndedBlock({
  sessionId,
  storyId,
  isGM,
}: {
  sessionId: string;
  storyId?: string;
  isGM: boolean;
}) {
  const [compileState, setCompileState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [compiledChapterId, setCompiledChapterId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCompile = async () => {
    if (!storyId) return;

    // Demo mode — show a toast-style message instead of calling the API
    if (storyId.startsWith("demo")) {
      setCompileState("done");
      setCompiledChapterId("demo-chapter");
      return;
    }

    setCompileState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/compile`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Compilation failed");
      }
      const { data } = await res.json();
      setCompiledChapterId(data.chapterId);
      setCompileState("done");
    } catch (err: any) {
      setErrorMessage(err.message ?? "Something went wrong");
      setCompileState("error");
    }
  };

  return (
    <div className="w-full max-w-[650px] mt-8">
      <div className="text-center py-8 border border-white/5 rounded-2xl bg-white/[0.02]">
        <p className="text-white/40 text-sm font-serif italic">This session has ended.</p>

        {isGM && compileState === "idle" && (
          <button
            onClick={handleCompile}
            className="mt-4 bg-amber/10 hover:bg-amber border border-amber/20 text-amber hover:text-black transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.5)] cursor-pointer"
          >
            Compile to Chapter
          </button>
        )}

        {compileState === "loading" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-amber/60">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-serif italic">Compiling session into prose...</span>
          </div>
        )}

        {compileState === "done" && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-sage text-sm font-serif italic">Chapter draft created!</p>
            {compiledChapterId && !compiledChapterId.startsWith("demo") && storyId && (
              <a
                href={`/write/${storyId}`}
                className="text-xs text-amber/60 hover:text-amber underline underline-offset-2 transition-colors"
              >
                Open in editor
              </a>
            )}
            {compiledChapterId?.startsWith("demo") && (
              <p className="text-xs text-white/30">(Demo mode — no chapter was actually created)</p>
            )}
          </div>
        )}

        {compileState === "error" && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-rose text-sm font-serif italic">
              {errorMessage ?? "Failed to compile session"}
            </p>
            <button
              onClick={() => setCompileState("idle")}
              className="text-xs text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reaction System ──────────────────────────────────────────

const REACTIONS = [
  { emoji: "\u2694\uFE0F", label: "Tension", key: "tension" },
  { emoji: "\uD83D\uDE2E", label: "Gasp", key: "gasp" },
  { emoji: "\uD83D\uDC4F", label: "Bravo", key: "bravo" },
  { emoji: "\uD83D\uDE02", label: "Haha", key: "laugh" },
  { emoji: "\uD83D\uDC80", label: "Oh no", key: "dread" },
];

const REACTION_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.key, r.emoji])
);

function FloatingReaction({
  emoji,
  x,
  onComplete,
}: {
  emoji: string;
  x: number;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute top-2 pointer-events-none z-50 text-3xl select-none"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  );
}

export default function StoryCanvas({
  sessionId,
  storyId,
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
  onReaction,
  lobbyTheme,
  onBeginSession,
}: StoryCanvasProps) {
  const [draftContent, setDraftContent] = useState("");
  const [draftType, setDraftType] = useState<string>(isGM ? "narration" : "action");
  const [hydratedDraft, setHydratedDraft] = useState(false);

  // Hydrate draft from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (hydratedDraft) return;
    try {
      const savedContent = localStorage.getItem(`inkwell-draft-${sessionId}`);
      const savedType = localStorage.getItem(`inkwell-draft-type-${sessionId}`);
      if (savedContent) setDraftContent(savedContent);
      if (savedType) setDraftType(savedType);
    } catch { /* ignore */ }
    setHydratedDraft(true);
  }, [sessionId, hydratedDraft]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showTurnHelp, setShowTurnHelp] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss turn help when user starts typing
  const prevDraftContentRef = useRef(draftContent);
  useEffect(() => {
    if (prevDraftContentRef.current === "" && draftContent !== "") {
      setShowTurnHelp(false);
    }
    prevDraftContentRef.current = draftContent;
  }, [draftContent]);

  // Debounce-save draft content to localStorage
  useEffect(() => {
    setDraftSaved(false);
    const timer = setTimeout(() => {
      try {
        if (draftContent) {
          localStorage.setItem(`inkwell-draft-${sessionId}`, draftContent);
          setDraftSaved(true);
        } else {
          localStorage.removeItem(`inkwell-draft-${sessionId}`);
        }
      } catch { /* quota exceeded, ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [draftContent, sessionId]);

  // Save draft type immediately on change
  useEffect(() => {
    try {
      if (draftType) {
        localStorage.setItem(`inkwell-draft-type-${sessionId}`, draftType);
      } else {
        localStorage.removeItem(`inkwell-draft-type-${sessionId}`);
      }
    } catch { /* ignore */ }
  }, [draftType, sessionId]);

  const isMyTurn = activePlayerId === currentUserId;
  const isActive = sessionStatus === "active";
  const [lastWordsContent, setLastWordsContent] = useState("");
  const [lastWordsSent, setLastWordsSent] = useState(false);
  const isDraft = sessionStatus === "draft";
  const isCharDead = myCharacterStatus === "dead";
  const isCharRetired = myCharacterStatus === "retired";
  const isCharGone = isCharDead || isCharRetired;

  // Reset lastWordsSent when character is revived (status changes from dead/retired to active)
  useEffect(() => {
    if (!isCharGone) {
      setLastWordsSent(false);
    }
  }, [isCharGone]);

  // ── Reaction state ──────────────────────────────────────
  const [floatingReactions, setFloatingReactions] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    timestamp: number;
  }>>([]);
  const [reactionCooldown, setReactionCooldown] = useState(false);

  const handleReactionClick = useCallback((reactionKey: string) => {
    if (reactionCooldown) return;

    // Fire the callback
    onReaction?.(reactionKey);

    // Add floating reaction at a semi-random horizontal position (30-70%)
    const x = 30 + Math.random() * 40;
    const id = `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const emoji = REACTION_EMOJI_MAP[reactionKey] ?? reactionKey;
    setFloatingReactions((prev) => [...prev, { id, emoji, x, timestamp: Date.now() }]);

    // Cooldown
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), 2000);
  }, [reactionCooldown, onReaction]);

  const removeFloatingReaction = useCallback((id: string) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

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
    setDraftSaved(false);
    try {
      localStorage.removeItem(`inkwell-draft-${sessionId}`);
      localStorage.removeItem(`inkwell-draft-type-${sessionId}`);
    } catch { /* ignore */ }
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

  // Turn type help — examples and descriptions for new players
  const TURN_EXAMPLES: Record<string, string> = {
    action: "draws her blade and steps into the light, eyes scanning the shadows for movement.",
    dialogue: "We don't have much time. Whatever we do, we do it now.",
    reaction: "A chill runs down her spine. She'd heard stories about this place — none of them good.",
    description: "The torchlight catches the edges of something metallic embedded in the wall — ancient, ornate, and unmistakably deliberate.",
    narration: "The corridor stretches ahead, its walls slick with moisture. From somewhere below, a rhythmic drumming echoes.",
    consequence: "The ground gives way beneath their feet — not a collapse, but a design. Someone built this trap centuries ago, and it still works perfectly.",
  };

  const TURN_DESCRIPTIONS: Record<string, string> = {
    action: "What your character physically does — movement, combat, interaction.",
    dialogue: "What your character says aloud. Auto-wrapped in quotes.",
    reaction: "Your character's immediate emotional or instinctive response.",
    description: "Set the mood. Describe what the scene looks, sounds, or feels like.",
    narration: "Set the scene, describe the world, introduce what happens next.",
    consequence: "What happens as a direct result of a player's action or choice.",
  };

  const isPlayerTurnType = (type: string) => ["action", "dialogue", "reaction"].includes(type);

  // ── Prose Assembly Engine ──────────────────────────────────
  // Groups turns into paragraphs and handles name/pronoun tracking

  // Dialogue verb templates — cycle through for variety
  const DIALOGUE_VERBS = ["said", "replied", "called out", "murmured", "whispered"];

  // Mood-to-class lookup for scene breaks (Tailwind needs full class strings)
  const SCENE_BREAK_MOOD_CLASSES: Record<string, { line: string; text: string; textFaded: string }> = {
    tense: { line: "via-rose/30", text: "text-rose/60", textFaded: "text-rose/40" },
    calm: { line: "via-sage/30", text: "text-sage/60", textFaded: "text-sage/40" },
    ominous: { line: "via-violet/30", text: "text-violet/60", textFaded: "text-violet/40" },
    triumphant: { line: "via-amber/30", text: "text-amber/60", textFaded: "text-amber/40" },
    melancholy: { line: "via-indigo-400/30", text: "text-indigo-400/60", textFaded: "text-indigo-400/40" },
    chaotic: { line: "via-orange-400/30", text: "text-orange-400/60", textFaded: "text-orange-400/40" },
    mysterious: { line: "via-cyan-400/30", text: "text-cyan-400/60", textFaded: "text-cyan-400/40" },
    romantic: { line: "via-pink-400/30", text: "text-pink-400/60", textFaded: "text-pink-400/40" },
  };
  const DEFAULT_SCENE_BREAK_CLASSES = { line: "via-white/30", text: "text-white/60", textFaded: "text-white/40" };

  // Should two consecutive turns merge into the same paragraph?
  const shouldMerge = (prev: Turn, next: Turn): boolean => {
    // Scene breaks never merge
    if (prev.type === "scene-break" || next.type === "scene-break") return false;

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
      case "scene-break":
        // Scene breaks are rendered at the paragraph level, not inline
        return null;

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

        {/* Floating reaction bubbles — positioned above story content */}
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <FloatingReaction
              key={r.id}
              emoji={r.emoji}
              x={r.x}
              onComplete={() => removeFloatingReaction(r.id)}
            />
          ))}
        </AnimatePresence>

        {/* Pre-session lobby */}
        {isDraft && (
          <SessionLobby
            lobbyTheme={lobbyTheme ?? "campfire"}
            sessionTitle={sessionTitle}
            sessionOpening={sessionOpening}
            characters={characters}
            isGM={isGM}
            onBeginSession={onBeginSession ?? (() => {})}
          />
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

                // Scene-break turns render as ornamental dividers
                if (group[0].type === "scene-break") {
                  let mood = "";
                  let title = "";
                  try {
                    const meta = group[0].metadata ? JSON.parse(group[0].metadata) : {};
                    mood = meta.mood ?? "";
                    title = meta.title ?? "";
                  } catch { /* ignore */ }
                  const classes = SCENE_BREAK_MOOD_CLASSES[mood] ?? DEFAULT_SCENE_BREAK_CLASSES;

                  return (
                    <div key={group[0].id} className="flex items-center gap-4 my-12 px-4">
                      <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
                      {title ? (
                        <span className={`text-[10px] uppercase tracking-[0.3em] font-display ${classes.text}`}>
                          {title}
                        </span>
                      ) : mood ? (
                        <span className={`text-[10px] uppercase tracking-[0.3em] font-display ${classes.textFaded} italic`}>
                          {mood}
                        </span>
                      ) : null}
                      <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${classes.line} to-transparent`} />
                    </div>
                  );
                }

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
                <button
                  onClick={() => setShowTurnHelp((v) => !v)}
                  className={`w-6 h-6 rounded-full border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                    showTurnHelp
                      ? "bg-white/10 border-white/20 text-white/50"
                      : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:bg-white/10"
                  }`}
                  title="Show turn type help"
                >
                  ?
                </button>
              </div>

              {/* Turn type help panel */}
              <AnimatePresence>
                {showTurnHelp && TURN_DESCRIPTIONS[draftType] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-3">
                      <div className="text-[10px] uppercase tracking-widest text-amber/60 font-bold mb-1">
                        {draftTypes.find((t) => t.key === draftType)?.label ?? draftType}
                      </div>
                      <div className="text-xs text-white/40 mb-2">
                        {TURN_DESCRIPTIONS[draftType]}
                      </div>
                      <div className="text-sm text-white/25 font-serif italic leading-relaxed">
                        {isPlayerTurnType(draftType) && myCharName && (
                          <span className="text-white/35 not-italic">{myCharName} </span>
                        )}
                        {TURN_EXAMPLES[draftType]}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                <div className="text-xs text-white/40 font-serif italic flex items-center gap-3">
                  <span>{isGM ? "The narrator sets the stage." : "Take your time. The party is waiting."}</span>
                  {draftSaved && draftContent && (
                    <span className="text-white/20 text-[10px] not-italic">Draft saved</span>
                  )}
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

        {/* Waiting state — replaces draft box when player is locked out */}
        {!isGM && activePlayerId && !isMyTurn && isActive && !isCharGone && (() => {
          const isGMTurn = !characters.some((c) => c.userId === activePlayerId && c.status === "active");
          return (
            <div className="w-full max-w-[650px] mt-auto">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-white/30">
                  {isGMTurn ? "GM Narrating" : "Waiting"}
                </div>

                <div className="flex items-center justify-center gap-3 py-4">
                  {isGMTurn ? (
                    <div className="flex items-center gap-3 text-amber/50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <p className="font-serif italic text-sm">The GM is setting the scene...</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-white/40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                      <p className="font-serif italic text-sm">Waiting for {activePlayerName} to write...</p>
                    </div>
                  )}
                </div>

                {/* Reaction buttons */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/5">
                  {REACTIONS.map((r) => (
                    <motion.button
                      key={r.key}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReactionClick(r.key)}
                      disabled={reactionCooldown}
                      className={`flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 transition-all cursor-pointer ${
                        reactionCooldown
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className="text-sm leading-none">{r.emoji}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/40 leading-none">{r.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Session ended — with compile-to-chapter option */}
        {sessionStatus === "completed" && (
          <SessionEndedBlock
            sessionId={sessionId}
            storyId={storyId}
            isGM={isGM}
          />
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
