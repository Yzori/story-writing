"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import ContextPanel from "@/components/campaign/ContextPanel";
import type { Turn, PlayerCharacter, RollRequest } from "@/components/campaign/types";

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
  { id: "t6", sessionId: "s1", userId: "user-elara", characterId: "char-3", type: "description", content: "The air grows cold, impossibly cold, and a distant chime echoes through the chamber — a sound from somewhere outside of time.", metadata: null, sortOrder: 5, createdAt: "2026-03-14T20:03:30Z", user: { id: "user-elara", displayName: "Elena", avatarUrl: null }, characterName: "Elara", characterPortrait: null },
  { id: "t7", sessionId: "s1", userId: "user-kaelen", characterId: "char-2", type: "action", content: "draws his sword defensively, the blade ringing as it clears the scabbard.", metadata: null, sortOrder: 6, createdAt: "2026-03-14T20:04:00Z", user: { id: "user-kaelen", displayName: "James", avatarUrl: null }, characterName: "Kaelen", characterPortrait: null },
  { id: "t8", sessionId: "s1", userId: "user-elara", characterId: "char-3", type: "dialogue", content: "We should leave. Now.", metadata: null, sortOrder: 7, createdAt: "2026-03-14T20:04:30Z", user: { id: "user-elara", displayName: "Elena", avatarUrl: null }, characterName: "Elara", characterPortrait: null },
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
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [mockCharacters, setMockCharacters] = useState<PlayerCharacter[]>(() => INITIAL_CHARACTERS.map(c => ({ ...c })));

  const currentUserId = viewAs === "gm" ? "gm" : viewAs === "lyra" ? "user-lyra" : "user-kaelen";
  const isGM = viewAs === "gm";
  const myCharacter = mockCharacters.find((c) => c.userId === currentUserId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  let turnCounter = storyTurns.length + logTurns.length + 200;

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
      type: "ooc", content: message, metadata: null, sortOrder: ++turnCounter,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, displayName: isGM ? "AlexTheGM" : myCharacter?.user?.displayName ?? "Player", avatarUrl: null },
      characterName: myCharacter?.name ?? null, characterPortrait: null,
    }]);
  }, [currentUserId, isGM, myCharacter, turnCounter]);

  const handleCommitDraft = useCallback((content: string, type: string) => {
    const id = `turn-${Date.now()}`;
    const gmTypes = ["narration", "consequence"];
    setStoryTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: currentUserId, characterId: gmTypes.includes(type) ? null : myCharacter?.id ?? null,
      type, content, metadata: null, sortOrder: ++turnCounter,
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
  }, [currentUserId, isGM, myCharacter, activePlayerId, turnCounter, showToast]);

  const handlePassTurn = useCallback((userId: string) => {
    setActivePlayerId(userId);
    const char = mockCharacters.find((c) => c.userId === userId);
    showToast(`Turn given to ${char?.name ?? "player"}`);
  }, [showToast]);

  const handleOpenFloor = useCallback(() => {
    setActivePlayerId(null);
    showToast("Floor opened — anyone can write");
  }, [showToast]);

  const handleEndSession = useCallback(() => {
    showToast("Session ended (demo)");
  }, [showToast]);

  const handleTurnExpired = useCallback(() => {
    setActivePlayerId("gm");
    showToast("Turn timer expired — control returned to GM");
  }, [showToast]);

  const handleChangeCharacterStatus = useCallback((characterId: string, status: "active" | "retired" | "dead") => {
    setMockCharacters((prev) => prev.map((c) => c.id === characterId ? { ...c, status } : c));
    const char = mockCharacters.find((c) => c.id === characterId);
    const label = status === "dead" ? "has fallen" : status === "retired" ? "has retired" : "has been revived";
    showToast(`${char?.name ?? "Character"} ${label}`);
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
      sortOrder: ++turnCounter, createdAt: new Date().toISOString(),
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
          sortOrder: ++turnCounter, createdAt: new Date().toISOString(),
          user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
          characterName: null, characterPortrait: null,
        }]);
      }

      // Fatal failure: auto-kill
      if (pendingRollRequest?.fatal && tier === "failure") {
        handleChangeCharacterStatus(myCharacter?.id ?? "", "dead");
      }
    }

    showToast(`Rolled ${total} — ${tierLabel}`);
  }, [currentUserId, myCharacter, turnCounter, showToast, pendingRollRequest, handleChangeCharacterStatus]);

  const handleRequestRoll = useCallback((targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
    const targetChar = mockCharacters.find((c) => c.userId === targetUserId);
    const content = `The GM calls for a ${attribute.toUpperCase()} check from ${targetChar?.name ?? "the party"} — ${reason}`;
    const id = `rr-${Date.now()}`;
    setLogTurns((prev) => [...prev, {
      id, sessionId: "s1", userId: "gm", characterId: null,
      type: "roll-request", content, metadata: JSON.stringify({ targetUserId, attribute, reason, onSuccess, onFailure, fatal: !!fatal }),
      sortOrder: ++turnCounter, createdAt: new Date().toISOString(),
      user: { id: "gm", displayName: "AlexTheGM", avatarUrl: null },
      characterName: null, characterPortrait: null,
    }]);
    showToast(`Roll requested from ${targetChar?.name ?? "party"}`);
  }, [turnCounter, showToast]);

  const handlePushEvent = useCallback((content: string) => {
    handleCommitDraft(content, "narration");
  }, [handleCommitDraft]);

  const handleLastWords = useCallback((content: string) => {
    handleCommitDraft(content, "description");
  }, [handleCommitDraft]);

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
        <span className="text-[10px] text-white/30">
          {isGM ? "Click a player avatar to give them the turn" : activePlayerId === currentUserId ? "It's your turn — write!" : "Waiting..."}
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

        {/* Left Pillar */}
        <SessionLog
          turns={logTurns}
          currentUserId={currentUserId}
          sessionTitle="The Ruined Throne"
          storyTitle="The Obsidian Crown"
          onSendChat={handleSendChat}
          chatInput={chatInput}
          setChatInput={setChatInput}
        />

        {/* Center Stage */}
        <StoryCanvas
          storyTurns={storyTurns}
          characters={mockCharacters}
          activePlayerId={activePlayerId}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle="The Ruined Throne"
          sessionStatus="active"
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
        />
      </div>
    </div>
  );
}
