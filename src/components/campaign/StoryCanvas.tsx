"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Turn, PlayerCharacter, RollRequest, SessionRosterEntry } from "@/types/campaign";
// getPlayerColor is used by TurnRenderer
import InitiativeBar from "./InitiativeBar";
import DiceRoller from "./DiceRoller";
import SessionLobby from "./SessionLobby";
import LoreMap from "./LoreMap";
import type { MapPin } from "./LoreMap";
import SessionHighlights from "./StoryHighlights";
import TurnRenderer from "./TurnRenderer";
import {
  groupIntoParagraphs,
  SCENE_BREAK_MOOD_CLASSES,
  DEFAULT_SCENE_BREAK_CLASSES,
  MOOD_TINT_COLORS,
  MOOD_VIGNETTE_COLORS,
} from "./ProseAssembler";

export type { MapPin };

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
  onExtendTimer?: () => void;
  onRollComplete: (total: number, modifier: number, attribute: string) => void;
  pendingRollRequest: RollRequest | null;
  myCharacterStatus: string | null;
  onLastWords: (content: string) => void;
  onReaction?: (reactionKey: string) => void;
  onEditTurn?: (turnId: string, newContent: string) => void;
  lobbyTheme?: string;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  onBeginSession?: () => void;
  mapImage?: string | null;
  mapPins?: MapPin[];
  onAddMapPin?: (pin: Omit<MapPin, "id">) => void;
  onRemoveMapPin?: (pinId: string) => void;
  logTurns?: Turn[];
  roster?: SessionRosterEntry[];
  rosterCharacters?: PlayerCharacter[];
  allCharacters?: PlayerCharacter[];
  onUpdateRoster?: (characterIds: string[]) => void;
}

// SessionHighlights and extractHighlights are now in StoryHighlights.tsx

// ── Session Ended Block (compile to chapter) ────────────────

function SessionEndedBlock({
  sessionId,
  storyId,
  isGM,
  storyTurns,
  logTurns,
}: {
  sessionId: string;
  storyId?: string;
  isGM: boolean;
  storyTurns: Turn[];
  logTurns: Turn[];
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
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setCompileState("error");
    }
  };

  return (
    <>
    <SessionHighlights storyTurns={storyTurns} logTurns={logTurns} />
    <div className="w-full max-w-[650px] mt-4">
      <div className="text-center py-8 border border-border-subtle rounded-2xl bg-subtle/20">
        <p className="text-text-tertiary text-sm font-serif italic">This session has ended.</p>

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
              <p className="text-xs text-text-tertiary">(Demo mode — no chapter was actually created)</p>
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
              className="text-xs text-text-tertiary hover:text-text-secondary underline underline-offset-2 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
    </>
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
  onExtendTimer,
  onRollComplete,
  pendingRollRequest,
  myCharacterStatus,
  onLastWords,
  onReaction,
  onEditTurn,
  lobbyTheme,
  previousEpilogue,
  previousMood,
  onBeginSession,
  mapImage,
  mapPins,
  onAddMapPin,
  onRemoveMapPin,
  logTurns = [],
  roster,
  rosterCharacters,
  allCharacters,
  onUpdateRoster,
}: StoryCanvasProps) {
  const TURNS_PER_BATCH = 50;
  const [visibleStartIndex, setVisibleStartIndex] = useState(() =>
    Math.max(0, storyTurns.length - TURNS_PER_BATCH)
  );
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

  // ── 30-second edit window ──────────────────────────────────
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSubmittedTurnId, setLastSubmittedTurnId] = useState<string | null>(null);
  const [editWindowOpen, setEditWindowOpen] = useState(false);

  // Track the most recent turn submitted by this user (within 30s)
  const editableTurn = storyTurns.length > 0
    ? (() => {
        const last = storyTurns[storyTurns.length - 1];
        if (last.id === lastSubmittedTurnId && last.userId === currentUserId && editWindowOpen) {
          return last;
        }
        return null;
      })()
    : null;

  // Close edit window when active player changes (GM passed the turn)
  useEffect(() => {
    if (editWindowOpen) {
      setEditWindowOpen(false);
      setEditingTurnId(null);
      setEditContent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerId]);

  const startEditWindow = useCallback((turnId: string) => {
    setLastSubmittedTurnId(turnId);
    setEditWindowOpen(true);
    // Auto-close after 30 seconds
    if (editWindowRef.current) clearTimeout(editWindowRef.current);
    editWindowRef.current = setTimeout(() => {
      setEditWindowOpen(false);
      setEditingTurnId(null);
      setEditContent("");
    }, 30000);
  }, []);

  const handleEditClick = useCallback((turn: Turn) => {
    setEditingTurnId(turn.id);
    setEditContent(turn.content);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingTurnId || !editContent.trim()) return;
    onEditTurn?.(editingTurnId, editContent.trim());
    setEditingTurnId(null);
    setEditContent("");
    // Keep the window open for further edits until 30s expires
  }, [editingTurnId, editContent, onEditTurn]);

  const handleEditCancel = useCallback(() => {
    setEditingTurnId(null);
    setEditContent("");
  }, []);

  // ── Voice-to-text (Speech Recognition) ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type SpeechRecognitionInstance = any;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);

  useEffect(() => {
    setHasSpeechSupport("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text;
        } else {
          interim = text;
        }
      }
      // Append finalized text to draft, show interim as preview
      setDraftContent((prev) => {
        const base = prev.endsWith(" ") || prev === "" ? prev : prev + " ";
        const finalized = finalTranscript ? base + finalTranscript : prev;
        finalTranscript = ""; // Reset after applying
        return interim ? finalized + (finalized.endsWith(" ") || finalized === "" ? "" : " ") + interim : finalized;
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Stop listening when component unmounts or draft is submitted
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // GM can always write. Players can write when it's their turn or floor is open. Dead/retired characters can't.
  const canWrite = isActive && !isCharGone && (isGM || isMyTurn || !activePlayerId);

  // Find who's currently writing for the lock screen
  const activeChar = characters.find((c) => c.userId === activePlayerId);
  const activePlayerName = activeChar
    ? `${activeChar.user?.displayName ?? "Someone"} (${activeChar.name})`
    : "another player";

  // Auto-scroll on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyTurns.length]);

  // Reset visible window when turns are cleared (e.g. new session)
  const prevTotalTurnsRef = useRef(storyTurns.length);
  useEffect(() => {
    if (storyTurns.length < prevTotalTurnsRef.current) {
      setVisibleStartIndex(Math.max(0, storyTurns.length - TURNS_PER_BATCH));
    }
    prevTotalTurnsRef.current = storyTurns.length;
  }, [storyTurns.length]);

  const hasEarlierTurns = visibleStartIndex > 0;

  const handleLoadEarlier = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const prevScrollHeight = scrollEl.scrollHeight;
    const prevScrollTop = scrollEl.scrollTop;

    setVisibleStartIndex((prev) => Math.max(0, prev - TURNS_PER_BATCH));

    // Preserve scroll position after new content renders above
    requestAnimationFrame(() => {
      const newScrollHeight = scrollEl.scrollHeight;
      scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    });
  }, []);

  // Detect when this user's new turn appears → start the 30s edit window
  const prevTurnCountRef = useRef(storyTurns.length);
  useEffect(() => {
    if (storyTurns.length > prevTurnCountRef.current) {
      const newest = storyTurns[storyTurns.length - 1];
      if (newest.userId === currentUserId && newest.type !== "scene-break") {
        startEditWindow(newest.id);
      }
    }
    prevTurnCountRef.current = storyTurns.length;
  }, [storyTurns.length, storyTurns, currentUserId, startEditWindow]);

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
    // Stop voice recording if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
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

  // ── Prose Assembly (imported from ProseAssembler.tsx) ──────

  // Slice to only the visible turns (paginated from the end)
  const visibleTurns = useMemo(() => storyTurns.slice(visibleStartIndex), [storyTurns, visibleStartIndex]);

  // Group turns into paragraphs
  const paragraphs = useMemo(() => groupIntoParagraphs(visibleTurns), [visibleTurns]);

  // Stable player color map
  const playerUserIds = useMemo(() => characters.filter((c) => c.status === "active").map((c) => c.userId), [characters]);

  // ── Mood & Aspects — derive from latest scene-break ──────────
  const { currentMood, currentSceneAspects } = useMemo(() => {
    for (let i = storyTurns.length - 1; i >= 0; i--) {
      if (storyTurns[i].type === "scene-break" && storyTurns[i].metadata) {
        try {
          const meta = JSON.parse(storyTurns[i].metadata!);
          return {
            currentMood: meta.mood ?? null,
            currentSceneAspects: (meta.aspects as string[]) ?? [],
          };
        } catch { /* ignore */ }
      }
    }
    return { currentMood: null, currentSceneAspects: [] };
  }, [storyTurns]);

  const moodTint = currentMood ? MOOD_TINT_COLORS[currentMood] ?? null : null;
  const moodVignette = currentMood ? MOOD_VIGNETTE_COLORS[currentMood] ?? null : null;

  return (
    <div className="flex-1 h-full flex flex-col relative bg-void">
      {/* Map Toggle */}
      <div className="absolute top-24 right-4 z-50 flex gap-2">
        <button
          onClick={() => setShowMap(!showMap)}
          className={`border rounded-full px-4 py-1.5 text-xs transition-colors flex items-center gap-2 backdrop-blur-md cursor-pointer ${
            showMap ? "bg-amber text-black border-amber" : "bg-subtle/30 text-text-secondary border-border hover:text-paper hover:bg-subtle/50"
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

        {/* Mood tint overlay — shifts color based on current scene mood */}
        {moodTint && (
          <div
            className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{ backgroundColor: moodTint }}
          />
        )}

        {/* Mood vignette — darker, more dramatic moods get an edge vignette */}
        {moodVignette && (
          <div
            className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{
              boxShadow: `inset 0 0 150px 40px ${moodVignette}`,
            }}
          />
        )}
      </div>

      {/* Initiative Bar */}
      <InitiativeBar
        characters={characters}
        rosterCharacters={rosterCharacters}
        activePlayerId={activePlayerId}
        currentUserId={currentUserId}
        isGM={isGM}
        sessionTitle={sessionTitle}
        sessionStatus={sessionStatus}
        onPassTurn={onPassTurn}
        onOpenFloor={onOpenFloor}
        onEndSession={onEndSession}
        onTurnExpired={onTurnExpired}
        onExtendTimer={onExtendTimer}
      />

      {/* Scene Aspect Tags — floating pills below initiative bar */}
      <AnimatePresence>
        {currentSceneAspects.length > 0 && sessionStatus === "active" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex items-center justify-center gap-2 px-8 py-2 z-20 shrink-0"
          >
            {currentSceneAspects.map((aspect, i) => {
              const moodBorderColors: Record<string, string> = {
                tense: "border-rose/30 text-rose/50",
                calm: "border-sage/30 text-sage/50",
                ominous: "border-violet/30 text-violet/50",
                triumphant: "border-amber/30 text-amber/50",
                melancholy: "border-indigo-400/30 text-indigo-400/50",
                chaotic: "border-orange-400/30 text-orange-400/50",
                mysterious: "border-cyan-400/30 text-cyan-400/50",
                romantic: "border-pink-400/30 text-pink-400/50",
              };
              const colors = moodBorderColors[currentMood ?? ""] ?? "border-border-active text-text-tertiary";
              return (
                <motion.span
                  key={aspect}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`px-3 py-1 rounded-full border bg-black/30 backdrop-blur-sm text-[10px] font-serif italic ${colors}`}
                >
                  {aspect}
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
            previousEpilogue={previousEpilogue}
            previousMood={previousMood}
            characters={rosterCharacters ?? characters}
            isGM={isGM}
            onBeginSession={onBeginSession ?? (() => {})}
            roster={roster}
            allCharacters={allCharacters ?? characters}
            onUpdateRoster={onUpdateRoster}
          />
        )}

        {/* Story Content */}
        <div className="w-full max-w-[650px] mb-8">
          <div className="mb-12">
            <h1 className="text-4xl font-display text-paper">{sessionTitle}</h1>
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
              <p className="text-text-ghost text-sm font-serif italic">
                {isGM ? "Set the scene with your opening narration." : "Waiting for the GM to begin..."}
              </p>
            </div>
          ) : (
            <div className="text-[19px] leading-[2.1] font-serif space-y-6 break-words">
              {/* Load earlier turns */}
              {hasEarlierTurns && (
                <div className="flex justify-center !mb-8">
                  <button
                    onClick={handleLoadEarlier}
                    className="bg-subtle/20 hover:bg-subtle/40 border border-border hover:border-border-active text-text-tertiary hover:text-text-secondary rounded-full px-5 py-2.5 text-[11px] uppercase tracking-widest font-display transition-all cursor-pointer group"
                  >
                    Load earlier turns
                    <span className="ml-2 text-text-ghost group-hover:text-text-tertiary transition-colors">
                      ({visibleStartIndex} more)
                    </span>
                  </button>
                </div>
              )}
              {(() => {
                let runningIdx = visibleStartIndex;
                return paragraphs.map((group, pi) => {
                const globalIdx = runningIdx;
                runningIdx += group.length;

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

                // Illustration turns render as visual breaks in the prose
                if (group[0].type === "illustration") {
                  let imageUrl = "";
                  let caption = "";
                  try {
                    const meta = group[0].metadata ? JSON.parse(group[0].metadata) : {};
                    imageUrl = meta.imageUrl ?? "";
                    caption = meta.caption ?? "";
                  } catch { /* ignore */ }

                  if (!imageUrl) return null;

                  return (
                    <motion.figure
                      key={group[0].id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="my-10 flex flex-col items-center"
                    >
                      <div className="max-w-full rounded-xl overflow-hidden border border-border shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                        <img
                          src={imageUrl}
                          alt={caption || "Illustration"}
                          loading="lazy"
                          className="max-w-full block"
                        />
                      </div>
                      {caption && (
                        <figcaption className="mt-3 text-sm text-paper/50 font-serif italic text-center max-w-md">
                          {caption}
                        </figcaption>
                      )}
                    </motion.figure>
                  );
                }

                const groupHasEditable = editableTurn && group.some((t) => t.id === editableTurn.id);

                return (
                  <div key={group[0].id}>
                    <p className="relative group/para">
                      {group.map((turn, ti) => (
                        <TurnRenderer key={turn.id} turn={turn} idx={ti} group={group} globalIdx={globalIdx + ti} playerUserIds={playerUserIds} />
                      ))}
                      {pi === paragraphs.length - 1 && !groupHasEditable && (
                        <span className="inline-block w-1.5 h-5 bg-amber/40 ml-1 animate-pulse align-middle" />
                      )}
                      {groupHasEditable && editingTurnId !== editableTurn.id && (
                        <button
                          onClick={() => handleEditClick(editableTurn)}
                          className="inline-flex items-center gap-1 ml-2 align-middle opacity-0 group-hover/para:opacity-100 transition-opacity cursor-pointer"
                          title="Edit (30s window)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          <span className="text-[9px] text-amber/30 uppercase tracking-wider">edit</span>
                        </button>
                      )}
                    </p>
                    {/* Inline edit box */}
                    <AnimatePresence>
                      {editingTurnId && editableTurn && group.some((t) => t.id === editingTurnId) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-amber/5 border border-amber/20 rounded-xl p-4 mt-2 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] uppercase tracking-widest text-amber/50 font-display">Quick Edit</span>
                              <span className="text-[9px] text-text-ghost">Changes apply instantly</span>
                            </div>
                            <textarea
                              className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[60px] placeholder:text-text-ghost"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-amber/10">
                              <button
                                onClick={handleEditCancel}
                                className="text-[10px] text-text-tertiary hover:text-text-secondary px-3 py-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleEditSave}
                                disabled={!editContent.trim()}
                                className="bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber text-[10px] uppercase tracking-wider font-bold rounded-full px-4 py-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              });
              })()}
            </div>
          )}
        </div>

        {/* Draft Box */}
        {canWrite && (
          <div className="w-full max-w-[650px] mt-auto">
            <div className="bg-ink border border-amber/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
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
                        : "bg-subtle/30 text-text-tertiary border-border hover:text-text-secondary"
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
                      ? "bg-subtle/50 border-border-active text-text-secondary"
                      : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary hover:bg-subtle/50"
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
                    <div className="bg-subtle/20 border border-border-subtle rounded-xl p-4 mb-3">
                      <div className="text-[10px] uppercase tracking-widest text-amber/60 font-bold mb-1">
                        {draftTypes.find((t) => t.key === draftType)?.label ?? draftType}
                      </div>
                      <div className="text-xs text-text-tertiary mb-2">
                        {TURN_DESCRIPTIONS[draftType]}
                      </div>
                      <div className="text-sm text-text-ghost font-serif italic leading-relaxed">
                        {isPlayerTurnType(draftType) && myCharName && (
                          <span className="text-text-tertiary not-italic">{myCharName} </span>
                        )}
                        {TURN_EXAMPLES[draftType]}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Render preview — shows how the turn will appear in the story */}
              {!isGM && renderPreview[draftType] && (
                <div className="mb-2 px-1 text-[11px] text-text-ghost font-serif italic">
                  Appears as: {renderPreview[draftType]}
                </div>
              )}

              <textarea
                className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[120px] placeholder:text-text-ghost"
                placeholder={draftPlaceholders[draftType] ?? "Write..."}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
                <div className="text-xs text-text-tertiary font-serif italic flex items-center gap-3">
                  <span>{isGM ? "The narrator sets the stage." : "Take your time. The party is waiting."}</span>
                  {draftSaved && draftContent && (
                    <span className="text-text-ghost text-[10px] not-italic">Draft saved</span>
                  )}
                  {isListening && (
                    <span className="text-rose/60 text-[10px] not-italic flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose animate-pulse" />
                      Listening...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasSpeechSupport && (
                    <button
                      onClick={toggleListening}
                      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isListening
                          ? "bg-rose/20 border-rose/40 text-rose shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                          : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary hover:bg-subtle/50"
                      }`}
                      title={isListening ? "Stop dictation" : "Voice dictation"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </button>
                  )}
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
          </div>
        )}

        {/* Waiting state — replaces draft box when player is locked out */}
        {!isGM && activePlayerId && !isMyTurn && isActive && !isCharGone && (() => {
          const isGMTurn = !characters.some((c) => c.userId === activePlayerId && c.status === "active");
          return (
            <div className="w-full max-w-[650px] mt-auto">
              <div className="bg-ink border border-border rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary">
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
                    <div className="flex items-center gap-3 text-text-tertiary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                      <p className="font-serif italic text-sm">Waiting for {activePlayerName} to write...</p>
                    </div>
                  )}
                </div>

                {/* Reaction buttons */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-border-subtle">
                  {REACTIONS.map((r) => (
                    <motion.button
                      key={r.key}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReactionClick(r.key)}
                      disabled={reactionCooldown}
                      className={`flex items-center gap-1.5 bg-subtle/30 border border-border rounded-full px-3 py-1.5 transition-all cursor-pointer ${
                        reactionCooldown
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-subtle/50 hover:border-border-active"
                      }`}
                    >
                      <span className="text-sm leading-none">{r.emoji}</span>
                      <span className="text-[10px] uppercase tracking-wider text-text-tertiary leading-none">{r.label}</span>
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
            <div className="bg-ink border border-rose/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-rose">
                Your character has fallen
              </div>

              <p className="text-xs text-text-tertiary font-serif italic mb-4">
                Write your final moment — a last breath, a whispered name, a defiant gaze. This is your character&apos;s goodbye.
              </p>

              <textarea
                className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[80px] placeholder:text-text-ghost"
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
                  className="bg-rose/10 hover:bg-rose border border-rose/20 text-rose hover:text-paper transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="text-center py-8 border border-border-subtle rounded-2xl bg-subtle/20">
              <p className="text-text-tertiary text-sm font-serif italic">
                {isCharDead
                  ? "Your character has passed. You are now a spectator."
                  : "Your character has retired from this adventure."}
              </p>
              <p className="text-text-ghost text-xs mt-2">You can still chat in the session log.</p>
            </div>
          </div>
        )}

        {/* Session ended — with compile-to-chapter option */}
        {sessionStatus === "completed" && (
          <SessionEndedBlock
            sessionId={sessionId}
            storyId={storyId}
            isGM={isGM}
            storyTurns={storyTurns}
            logTurns={logTurns}
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
            className="absolute inset-x-8 inset-y-8 z-40 bg-ink rounded-3xl border border-amber/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
            <LoreMap
              mapImage={mapImage ?? null}
              pins={mapPins ?? []}
              isGM={isGM}
              onAddPin={onAddMapPin ?? (() => {})}
              onRemovePin={onRemoveMapPin}
              onClose={() => setShowMap(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
