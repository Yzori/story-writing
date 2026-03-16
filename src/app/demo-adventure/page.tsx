"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import ContextPanel from "@/components/campaign/ContextPanel";
import type { Turn, PlayerCharacter, RollRequest, StarterItem } from "@/components/campaign/types";
import { rollStarterItems } from "@/components/campaign/types";
import type { MapPin } from "@/components/campaign/LoreMap";
import StoryMoment from "@/components/campaign/StoryMoment";
import { LOBBY_THEMES } from "@/components/campaign/SessionLobby";

// ── Mock Data ──────────────────────────────────────────────

const INITIAL_CHARACTERS: PlayerCharacter[] = [
  {
    id: "char-1", userId: "user-lyra", name: "Lyra Varen", portrait: null,
    description: "A forgekeeper seeking the Obsidian Crown", traits: "Lvl 4 Forgekeeper",
    stats: JSON.stringify({
      approaches: { Bold: -1, Keen: 2, Subtle: 0 },
      aspect: "Believes every problem has a chemical solution",
    }),
    status: "active",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
  },
  {
    id: "char-2", userId: "user-kaelen", name: "Kaelen", portrait: null,
    description: "A wandering bladesinger with a dark past", traits: "Lvl 4 Bladesinger",
    stats: JSON.stringify({
      approaches: { Bold: 2, Keen: -1, Subtle: 0 },
      aspect: "A blade for every shadow, a shadow for every blade",
    }),
    status: "active",
    user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
  },
  {
    id: "char-3", userId: "user-elara", name: "Elara", portrait: null,
    description: "A healer who hears the whispers of the dead", traits: "Lvl 4 Spiritseer",
    stats: JSON.stringify({
      approaches: { Bold: -1, Keen: 1, Subtle: 1 },
      aspect: "Hears the whispers of the dead whether she wants to or not",
    }),
    status: "active",
    user: { id: "user-elara", displayName: "Elena", avatarUrl: null },
  },
];

const OPENING = "The Obsidian Crown had been lost for three hundred years, buried with its last king in the depths of the Shattered City. But prophecy spoke of its return — and of a darkness that would walk the earth when it rose again.";

const INITIAL_TURNS: Turn[] = [
  { id: "t1", sessionId: "s1", userId: "gm", characterId: null, type: "narration", content: "You enter the ruined throne room. Moonlight filters through cracked arches, casting long shadows across the broken floor. At the far end, a stone altar pulses with a faint, sickly light.", metadata: null, sortOrder: 0, createdAt: "2026-03-14T20:00:00Z", user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null }, characterName: null, characterPortrait: null },
  { id: "t2", sessionId: "s1", userId: "user-lyra", characterId: "char-1", type: "action", content: "approaches the stone altar and runs her hand over the carved symbols, fingers tracing each rune with reverent care.", metadata: null, sortOrder: 1, createdAt: "2026-03-14T20:01:00Z", user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null }, characterName: "Lyra", characterPortrait: null },
  { id: "t3", sessionId: "s1", userId: "user-kaelen", characterId: "char-2", type: "dialogue", content: "Is that blood on the blade?", metadata: null, sortOrder: 2, createdAt: "2026-03-14T20:01:30Z", user: { id: "user-kaelen", displayName: "James", avatarUrl: null }, characterName: "Kaelen", characterPortrait: null },
  { id: "t4", sessionId: "s1", userId: "user-lyra", characterId: "char-1", type: "reaction", content: "Her breath catches. This was the weapon — the one the old histories claimed was lost forever.", metadata: null, sortOrder: 3, createdAt: "2026-03-14T20:02:00Z", user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null }, characterName: "Lyra", characterPortrait: null },
  { id: "t5", sessionId: "s1", userId: "gm", characterId: null, type: "consequence", content: "The altar begins to hum beneath her touch, a sound that seems to rise from the earth itself. Runes ignite with pale blue light, casting strange writhing shadows across the vaulted ceiling.", metadata: null, sortOrder: 4, createdAt: "2026-03-14T20:03:00Z", user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null }, characterName: null, characterPortrait: null },
  { id: "t-scene-1", sessionId: "s1", userId: "gm", characterId: null, type: "scene-break", content: "", metadata: JSON.stringify({ mood: "ominous", title: "The Awakening" }), sortOrder: 5, createdAt: "2026-03-14T20:03:15Z", user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null }, characterName: null, characterPortrait: null },
  { id: "t6", sessionId: "s1", userId: "user-elara", characterId: "char-3", type: "description", content: "The air grows cold, impossibly cold, and a distant chime echoes through the chamber — a sound from somewhere outside of time.", metadata: null, sortOrder: 6, createdAt: "2026-03-14T20:03:30Z", user: { id: "user-elara", displayName: "Elena", avatarUrl: null }, characterName: "Elara", characterPortrait: null },
  { id: "t7", sessionId: "s1", userId: "user-kaelen", characterId: "char-2", type: "action", content: "draws his sword defensively, the blade ringing as it clears the scabbard.", metadata: null, sortOrder: 7, createdAt: "2026-03-14T20:04:00Z", user: { id: "user-kaelen", displayName: "James", avatarUrl: null }, characterName: "Kaelen", characterPortrait: null },
  { id: "t8", sessionId: "s1", userId: "user-elara", characterId: "char-3", type: "dialogue", content: "We should leave. Now.", metadata: null, sortOrder: 8, createdAt: "2026-03-14T20:04:30Z", user: { id: "user-elara", displayName: "Elena", avatarUrl: null }, characterName: "Elara", characterPortrait: null },
  { id: "t-scene-2", sessionId: "s1", userId: "gm", characterId: null, type: "scene-break", content: "", metadata: JSON.stringify({ mood: "tense" }), sortOrder: 9, createdAt: "2026-03-14T20:05:00Z", user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null }, characterName: null, characterPortrait: null },
];

const INITIAL_LOG_TURNS: Turn[] = [
  { id: "l1", sessionId: "s1", userId: "user-lyra", characterId: "char-1", type: "ooc", content: "Okay I'm touching the altar. This is going to go badly isn't it?", metadata: null, sortOrder: 100, createdAt: "2026-03-14T20:01:00Z", user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null }, characterName: "Lyra", characterPortrait: null },
  { id: "l2", sessionId: "s1", userId: "user-kaelen", characterId: "char-2", type: "ooc", content: "lol definitely. RIP us.", metadata: null, sortOrder: 101, createdAt: "2026-03-14T20:01:15Z", user: { id: "user-kaelen", displayName: "James", avatarUrl: null }, characterName: "Kaelen", characterPortrait: null },
  { id: "l3", sessionId: "s1", userId: "user-lyra", characterId: "char-1", type: "roll", content: "Rolled 2d6+2 (DEX) = 9 — Partial Success", metadata: JSON.stringify({ total: 9, modifier: 2, attribute: "DEX", tier: "partial", die: "2d6" }), sortOrder: 102, createdAt: "2026-03-14T20:02:30Z", user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null }, characterName: "Lyra", characterPortrait: null },
];

// ── Demo Page ──────────────────────────────────────────────

export default function DemoAdventurePage() {
  const [viewAs, setViewAs] = useState<"gm" | "lyra" | "kaelen">("gm");
  const [storyTurns, setStoryTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [logTurns, setLogTurns] = useState<Turn[]>(INITIAL_LOG_TURNS);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("draft");
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [lobbyTheme, setLobbyTheme] = useState<string>("campfire");
  const [chatInput, setChatInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [mockCharacters, setMockCharacters] = useState<PlayerCharacter[]>(() => INITIAL_CHARACTERS.map(c => ({ ...c })));
  const [activeStoryMoment, setActiveStoryMoment] = useState<{
    mood: string;
    text: string;
    subtext?: string;
  } | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Starter items — each character gets 1 random item seeded by their ID
  const [characterItems, setCharacterItems] = useState<Record<string, StarterItem[]>>(() => {
    const items: Record<string, StarterItem[]> = {};
    for (const c of INITIAL_CHARACTERS) {
      items[c.id] = rollStarterItems(c.id, 1);
    }
    return items;
  });

  const [mapPins, setMapPins] = useState<MapPin[]>([
    { id: "pin-1", x: 25, y: 40, label: "The Ruined Throne Room", mood: "ominous", description: "Where the party first discovered the altar." },
    { id: "pin-2", x: 60, y: 65, label: "The Obsidian Gate", mood: "tense", description: "The sealed entrance to the lower chambers." },
    { id: "pin-3", x: 45, y: 25, label: "The Whispering Gallery", mood: "mysterious", description: "Elara hears the dead most clearly here." },
  ]);

  const currentUserId = viewAs === "gm" ? "gm" : viewAs === "lyra" ? "user-lyra" : "user-kaelen";
  const isGM = viewAs === "gm";
  const myCharacter = mockCharacters.find((c) => c.userId === currentUserId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const turnCounterRef = useRef(storyTurns.length + logTurns.length + 200);

  const pendingRollRequest = useMemo((): RollRequest | null => {
    if (!currentUserId || isGM) return null;
    for (let i = logTurns.length - 1; i >= 0; i--) {
      const t = logTurns[i];
      if (t.type !== "roll-request" || !t.metadata) continue;
      try {
        const meta = JSON.parse(t.metadata);
        if (meta.targetUserId !== currentUserId && meta.targetUserId !== "everyone") continue;
        const hasResponded = logTurns.some(
          (r) => r.type === "roll" && r.userId === currentUserId && r.sortOrder > t.sortOrder
        );
        if (hasResponded) continue;
        return { targetUserId: meta.targetUserId, attribute: meta.attribute, reason: meta.reason, onSuccess: meta.onSuccess ?? "", onFailure: meta.onFailure ?? "", fatal: meta.fatal === true, turnId: t.id, sortOrder: t.sortOrder };
      } catch { continue; }
    }
    return null;
  }, [logTurns, currentUserId, isGM]);

  const handleSendChat = useCallback((message: string) => {
    const id = `log-${Date.now()}`;
    setLogTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: currentUserId, characterId: myCharacter?.id ?? null,
      type: "ooc", content: message, metadata: null, sortOrder: ++turnCounterRef.current,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, displayName: isGM ? "AlexTheGM" : myCharacter?.user?.displayName ?? "Player", avatarUrl: null },
      characterName: myCharacter?.name ?? null, characterPortrait: null,
    }]);
  }, [currentUserId, isGM, myCharacter]);

  const handleCommitDraft = useCallback((content: string, type: string) => {
    const id = `turn-${Date.now()}`;
    const gmTypes = ["narration", "consequence"];
    setStoryTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: currentUserId, characterId: gmTypes.includes(type) ? null : myCharacter?.id ?? null,
      type, content, metadata: null, sortOrder: ++turnCounterRef.current,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, displayName: isGM ? "AlexTheGM" : myCharacter?.user?.displayName ?? "Player", avatarUrl: null },
      characterName: gmTypes.includes(type) ? null : myCharacter?.name ?? null, characterPortrait: null,
    }]);
    // Return control to GM after player writes (set to GM's userId, not null)
    // null = open floor, "gm" = GM's turn (players locked)
    if (!isGM && activePlayerId) {
      setActivePlayerId("gm");
    }
    showToast(isGM ? "Narration added" : "Turn committed");
  }, [currentUserId, isGM, myCharacter, activePlayerId, showToast]);

  const handlePassTurn = useCallback((userId: string) => {
    setActivePlayerId(userId);
    const char = mockCharacters.find((c) => c.userId === userId);
    showToast(`Turn given to ${char?.name ?? "player"}`);
  }, [showToast]);

  const handleOpenFloor = useCallback(() => {
    setActivePlayerId(null);
    showToast("Floor opened — anyone can write");
  }, [showToast]);

  const [showEndModal, setShowEndModal] = useState(false);
  const [epilogueText, setEpilogueText] = useState("");
  const [demoEpilogue, setDemoEpilogue] = useState<string | null>(null);
  const [demoClosingMood, setDemoClosingMood] = useState<string | null>(null);

  const handleEndSession = useCallback(() => {
    setShowEndModal(true);
  }, []);

  const handleConfirmEndSession = useCallback(() => {
    // Detect closing mood from last scene-break
    let closingMood = "calm";
    for (let i = storyTurns.length - 1; i >= 0; i--) {
      if (storyTurns[i].type === "scene-break" && storyTurns[i].metadata) {
        try { closingMood = JSON.parse(storyTurns[i].metadata!).mood ?? "calm"; } catch { /* ignore */ }
        break;
      }
    }

    const epilogue = epilogueText.trim() || undefined;
    setDemoEpilogue(epilogue ?? null);
    setDemoClosingMood(closingMood);
    setSessionStatus("completed");
    setActivePlayerId(null);
    setShowEndModal(false);

    // Play cinematic
    setActiveStoryMoment({
      mood: closingMood,
      text: epilogue || "The story pauses here...",
      subtext: "Until next time.",
    });

    setEpilogueText("");
  }, [epilogueText, storyTurns]);

  const handleTurnExpired = useCallback(() => {
    setActivePlayerId("gm");
    showToast("Turn timer expired — control returned to GM");
  }, [showToast]);

  const handleChangeCharacterStatus = useCallback((characterId: string, status: "active" | "retired" | "dead") => {
    setMockCharacters((prev) => prev.map((c) => c.id === characterId ? { ...c, status } : c));
    const char = mockCharacters.find((c) => c.id === characterId);
    const label = status === "dead" ? "has fallen" : status === "retired" ? "has retired" : "has been revived";
    showToast(`${char?.name ?? "Character"} ${label}`);
    if (status === "dead") {
      setActiveStoryMoment({
        mood: "death",
        text: `${char?.name ?? "A hero"} has fallen`,
        subtext: "The story remembers.",
      });
    }
  }, [showToast, mockCharacters]);

  const handleRollComplete = useCallback((total: number, modifier: number, attribute: string) => {
    const tier = total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
    const tierLabel = tier === "success" ? "Full Success" : tier === "partial" ? "Partial Success" : "Failure";
    const content = modifier !== 0
      ? `Rolled 2d6${modifier >= 0 ? "+" : ""}${modifier} (${attribute.toUpperCase()}) = ${total} — ${tierLabel}`
      : `Rolled 2d6 = ${total} — ${tierLabel}`;
    const id = `roll-${Date.now()}`;
    setLogTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: currentUserId, characterId: myCharacter?.id ?? null,
      type: "roll", content, metadata: JSON.stringify({ total, modifier, attribute, tier, die: "2d6" }),
      sortOrder: ++turnCounterRef.current, createdAt: new Date().toISOString(),
      user: { id: currentUserId, displayName: myCharacter?.user?.displayName ?? "Player", avatarUrl: null },
      characterName: myCharacter?.name ?? null, characterPortrait: null,
    }]);

    // Auto-post stakes outcome as a story consequence
    {
      const isFatalRoll = pendingRollRequest?.fatal === true;
      const genericOutcomes: Record<string, string> = {
        success: isFatalRoll ? "Against all odds, fate is kind. They survive." : "The attempt succeeds.",
        partial: isFatalRoll ? "They cling to life — but barely. The cost is terrible." : "A partial success — but not without cost.",
        failure: isFatalRoll ? "The dice have spoken. There is no escape from this fate." : "The attempt fails.",
      };

      let outcomeText = "";
      if (pendingRollRequest) {
        outcomeText = tier === "failure"
          ? (pendingRollRequest.onFailure || genericOutcomes.failure)
          : tier === "success"
            ? (pendingRollRequest.onSuccess || genericOutcomes.success)
            : pendingRollRequest.onSuccess && pendingRollRequest.onFailure
              ? `${pendingRollRequest.onSuccess} — but ${pendingRollRequest.onFailure.charAt(0).toLowerCase()}${pendingRollRequest.onFailure.slice(1)}`
              : genericOutcomes.partial;
      } else {
        outcomeText = genericOutcomes[tier] ?? "";
      }

      if (outcomeText) {
        const outcomeId = `outcome-${Date.now()}`;
        setStoryTurns((prev) => [...prev, {
          id: outcomeId, sessionId: "s1", userId: "gm", characterId: null,
          type: "consequence", content: outcomeText, metadata: null,
          sortOrder: ++turnCounterRef.current, createdAt: new Date().toISOString(),
          user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
          characterName: null, characterPortrait: null,
        }]);
      }

      // Fatal failure: auto-kill + cinematic moment
      if (pendingRollRequest?.fatal && tier === "failure") {
        setActiveStoryMoment({
          mood: "death",
          text: `${myCharacter?.name ?? "A hero"} has fallen`,
          subtext: "The dice have spoken.",
        });
        handleChangeCharacterStatus(myCharacter?.id ?? "", "dead");
      }
    }

    showToast(`Rolled ${total} — ${tierLabel}`);
  }, [currentUserId, myCharacter, showToast, pendingRollRequest, handleChangeCharacterStatus]);

  const handleRequestRoll = useCallback((targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
    const targetChar = mockCharacters.find((c) => c.userId === targetUserId);
    const content = `The GM calls for a ${attribute.toUpperCase()} check from ${targetChar?.name ?? "the party"} — ${reason}`;
    const id = `rr-${Date.now()}`;
    setLogTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: "gm", characterId: null,
      type: "roll-request", content, metadata: JSON.stringify({ targetUserId, attribute, reason, onSuccess, onFailure, fatal: !!fatal }),
      sortOrder: ++turnCounterRef.current, createdAt: new Date().toISOString(),
      user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
      characterName: null, characterPortrait: null,
    }]);
    showToast(`Roll requested from ${targetChar?.name ?? "party"}`);
  }, [showToast]);

  const handleSceneBreak = useCallback((title: string, mood: string) => {
    const id = `scene-${Date.now()}`;
    setStoryTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: "gm", characterId: null,
      type: "scene-break", content: "", metadata: JSON.stringify({ mood, title: title || undefined }),
      sortOrder: ++turnCounterRef.current, createdAt: new Date().toISOString(),
      user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
      characterName: null, characterPortrait: null,
    }]);
    showToast(`Scene break: ${title || mood}`);
  }, [showToast]);

  const handleStoryMoment = useCallback((text: string, mood: string, subtext?: string) => {
    setActiveStoryMoment({ mood, text, subtext });
    // Also create a scene-break turn so the moment leaves a trace in the story
    const id = `moment-${Date.now()}`;
    setStoryTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: "gm", characterId: null,
      type: "scene-break", content: text, metadata: JSON.stringify({ mood, title: text, cinematic: true }),
      sortOrder: ++turnCounterRef.current, createdAt: new Date().toISOString(),
      user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
      characterName: null, characterPortrait: null,
    }]);
  }, []);

  const handlePushEvent = useCallback((content: string) => {
    handleCommitDraft(content, "narration");
  }, [handleCommitDraft]);

  const handleLastWords = useCallback((content: string) => {
    handleCommitDraft(content, "description");
  }, [handleCommitDraft]);

  const handleReaction = useCallback((reactionKey: string) => {
    const reactions: Record<string, string> = { tension: "\u2694\uFE0F", gasp: "\uD83D\uDE2E", bravo: "\uD83D\uDC4F", laugh: "\uD83D\uDE02", dread: "\uD83D\uDC80" };
    const charName = myCharacter?.name ?? "Someone";
    showToast(`${charName} reacted: ${reactions[reactionKey] ?? reactionKey}`);
  }, [myCharacter, showToast]);

  const handleEditTurn = useCallback((turnId: string, newContent: string) => {
    setStoryTurns((prev) => prev.map((t) =>
      t.id === turnId ? { ...t, content: newContent } : t
    ));
    showToast("Turn updated");
  }, [showToast]);

  const handleBeginSession = useCallback(() => {
    setSessionStatus("active");
    showToast("The story begins!");
  }, [showToast]);

  const handleAddMapPin = useCallback((pin: Omit<MapPin, "id">) => {
    const id = `pin-${Date.now()}`;
    setMapPins((prev) => [...prev, { ...pin, id }]);
    showToast(`Pin placed: ${pin.label}`);
  }, [showToast]);

  const handleRemoveMapPin = useCallback((pinId: string) => {
    setMapPins((prev) => prev.filter((p) => p.id !== pinId));
    showToast("Pin removed");
  }, [showToast]);

  const handleUseItem = useCallback((characterId: string, item: StarterItem) => {
    const char = mockCharacters.find((c) => c.id === characterId);
    if (!char) return;

    // Create a story turn describing the item use
    const id = `item-use-${Date.now()}`;
    setStoryTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: char.userId, characterId,
      type: "action",
      content: `reaches for the ${item.name} and ${item.effect}.`,
      metadata: JSON.stringify({ itemUsed: item.name, itemTag: item.tag }),
      sortOrder: ++turnCounterRef.current,
      createdAt: new Date().toISOString(),
      user: { id: char.userId, displayName: char.user?.displayName ?? "Player", avatarUrl: null },
      characterName: char.name, characterPortrait: null,
    }]);

    // Remove the item
    setCharacterItems((prev) => ({
      ...prev,
      [characterId]: (prev[characterId] ?? []).filter((i) => i.id !== item.id),
    }));

    showToast(`${char.name} used ${item.name}!`);
  }, [mockCharacters, showToast]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#080808] text-white font-sans overflow-hidden">
      {/* Demo Controls Bar */}
      <div className="h-12 bg-violet-500/10 border-b border-violet-500/20 flex items-center justify-center gap-4 px-6 shrink-0 z-[60]">
        <span className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Demo Mode</span>
        <div className="w-px h-5 bg-violet-500/20" />
        <span className="text-[10px] text-white/40">View as:</span>
        {[
          { key: "gm" as const, label: "GM (Alex)" },
          { key: "lyra" as const, label: "Lyra (Sarah)" },
          { key: "kaelen" as const, label: "Kaelen (James)" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setViewAs(v.key)}
            className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
              viewAs === v.key
                ? "bg-violet-500/20 border-violet-500/40 text-violet-400 font-bold"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
            }`}
          >
            {v.label}
          </button>
        ))}
        <div className="w-px h-5 bg-violet-500/20" />
        {sessionStatus === "draft" && (
          <>
            <span className="text-[10px] text-white/40">Lobby:</span>
            <div className="flex items-center gap-1">
              {LOBBY_THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setLobbyTheme(t.key)}
                  title={t.label}
                  className={`w-7 h-5 rounded-sm overflow-hidden border transition-all cursor-pointer ${
                    lobbyTheme === t.key
                      ? "border-violet-400 ring-1 ring-violet-400/50"
                      : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={t.image}
                    alt={t.label}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-violet-500/20" />
          </>
        )}
        {sessionStatus === "completed" && (
          <>
            <div className="w-px h-5 bg-violet-500/20" />
            <button
              onClick={() => {
                setSessionStatus("draft");
                setStoryTurns([]);
                setLogTurns([]);
              }}
              className="px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-all cursor-pointer"
            >
              Reset to Lobby
            </button>
          </>
        )}
        <span className="text-[10px] text-white/30">
          {sessionStatus === "draft"
            ? demoEpilogue ? "Lobby with \"Previously on...\" — GM can begin again" : "Pre-session lobby — GM can begin the story"
            : sessionStatus === "completed"
              ? "Session ended — GM can compile to chapter"
              : isGM ? "Click a player avatar to give them the turn" : activePlayerId === currentUserId ? "It's your turn — write!" : "Waiting..."}
        </span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden selection:bg-amber/30">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-amber/90 text-black px-4 py-2 rounded-xl text-sm font-medium shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* End Session Confirmation Modal */}
        <AnimatePresence>
          {showEndModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowEndModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-[#111] border border-amber/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-display text-amber">End Session</span>
                </div>
                <p className="text-sm text-white/60 mb-5">
                  This will close the session for all players. You can optionally leave a closing thought — a teaser, a reflection, or a &ldquo;to be continued...&rdquo;
                </p>
                <textarea
                  value={epilogueText}
                  onChange={(e) => setEpilogueText(e.target.value)}
                  placeholder="The road stretches on, and the shadows grow longer..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-paper/80 font-serif italic placeholder:text-white/15 outline-none focus:border-amber/30 resize-none transition-colors"
                  rows={3}
                />
                <p className="text-[9px] text-white/20 mt-1 mb-5">Optional — shown to players as a closing moment</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmEndSession}
                    className="flex-1 bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber text-[11px] uppercase tracking-wider font-bold rounded-full py-2.5 cursor-pointer transition-colors"
                  >
                    End Session
                  </button>
                  <button
                    onClick={() => setShowEndModal(false)}
                    className="px-5 text-[11px] text-white/40 hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Moment Overlay */}
        <AnimatePresence>
          {activeStoryMoment && (
            <StoryMoment
              key="story-moment"
              mood={activeStoryMoment.mood}
              text={activeStoryMoment.text}
              subtext={activeStoryMoment.subtext}
              onComplete={() => setActiveStoryMoment(null)}
            />
          )}
        </AnimatePresence>

        {/* Left Pillar */}
        <SessionLog
          turns={logTurns}
          currentUserId={currentUserId}
          sessionTitle="The Ruined Throne"
          storyTitle="The Obsidian Crown"
          onSendChat={handleSendChat}
          chatInput={chatInput}
          setChatInput={setChatInput}
          isCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((v) => !v)}
        />

        {/* Center Stage */}
        <StoryCanvas
          sessionId="demo-session"
          storyId="demo-story"
          storyTurns={storyTurns}
          characters={mockCharacters}
          activePlayerId={activePlayerId}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle="The Ruined Throne"
          sessionStatus={sessionStatus}
          sessionOpening={OPENING}
          showDiceRoller={showDiceRoller || !!pendingRollRequest}
          onCloseDiceRoller={() => setShowDiceRoller(false)}
          onCommitDraft={handleCommitDraft}
          onPassTurn={handlePassTurn}
          onOpenFloor={handleOpenFloor}
          onEndSession={handleEndSession}
          onTurnExpired={handleTurnExpired}
          onRollComplete={handleRollComplete}
          pendingRollRequest={pendingRollRequest}
          myCharacterStatus={myCharacter?.status ?? null}
          onLastWords={handleLastWords}
          onReaction={handleReaction}
          onEditTurn={handleEditTurn}
          lobbyTheme={lobbyTheme}
          previousEpilogue={demoEpilogue}
          previousMood={demoClosingMood}
          onBeginSession={handleBeginSession}
          mapPins={mapPins}
          onAddMapPin={handleAddMapPin}
          onRemoveMapPin={handleRemoveMapPin}
          logTurns={logTurns}
        />

        {/* Right Pillar */}
        <ContextPanel
          isGM={isGM}
          myCharacter={myCharacter}
          characters={mockCharacters}
          activePlayerId={activePlayerId}
          onRequestRoll={handleRequestRoll}
          onPushEvent={handlePushEvent}
          onChangeCharacterStatus={handleChangeCharacterStatus}
          onSceneBreak={handleSceneBreak}
          onStoryMoment={handleStoryMoment}
          isCollapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed((v) => !v)}
          characterItems={characterItems}
          onUseItem={handleUseItem}
        />
      </div>
    </div>
  );
}
