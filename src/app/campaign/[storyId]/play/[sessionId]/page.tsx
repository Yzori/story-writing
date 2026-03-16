"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { useCampaignSession } from "@/components/campaign/use-campaign-session";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import ContextPanel from "@/components/campaign/ContextPanel";
import type { RollRequest } from "@/components/campaign/types";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import StoryMoment from "@/components/campaign/StoryMoment";

export default function SessionPlayPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;

  const {
    story,
    campaignSession,
    turns,
    characters,
    roster,
    rosterCharacters,
    loading,
    error,
    toast,
    showToast,
    currentUserId,
    isGM,
    myCharacter,
    previousEpilogue,
    previousMood,
    sendTurn,
    setActivePlayer,
    updateSession,
    updateRoster,
    clocks,
    setClocks,
  } = useCampaignSession(storyId, sessionId);

  const [chatInput, setChatInput] = useState("");
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [epilogueText, setEpilogueText] = useState("");
  const [activeStoryMoment, setActiveStoryMoment] = useState<{
    mood: string;
    text: string;
    subtext?: string;
  } | null>(null);

  // Detect session ending via poll (for players) — play cinematic
  // Detect session transitions via poll — play cinematics for non-GM players
  const prevSessionStatusRef = useRef(campaignSession?.status);
  useEffect(() => {
    const prev = prevSessionStatusRef.current;
    const next = campaignSession?.status;

    if (!isGM && prev !== next) {
      // Session began — play opening cinematic
      if (prev === "draft" && next === "active" && campaignSession?.opening) {
        const opening = campaignSession.opening;
        setActiveStoryMoment({
          mood: "calm",
          text: opening.length > 120 ? opening.slice(0, 120).trimEnd() + "..." : opening,
          subtext: campaignSession?.title ?? "The story begins.",
        });
      }
      // Session ended — play closing cinematic
      if (prev === "active" && next === "completed") {
        setActiveStoryMoment({
          mood: campaignSession?.closingMood ?? "calm",
          text: campaignSession?.epilogue || "The story pauses here...",
          subtext: "Until next time.",
        });
      }
    }
    prevSessionStatusRef.current = next;
  }, [campaignSession?.status, campaignSession?.opening, campaignSession?.epilogue, campaignSession?.closingMood, campaignSession?.title, isGM]);

  // ── Turn routing ──────────────────────────────────────────
  // Left pillar: only meta/mechanical stuff (chat, dice, roll requests)
  const logTurns = useMemo(() => turns.filter((t) =>
    ["ooc", "roll", "roll-request"].includes(t.type)
  ), [turns]);
  // Center stage: all narrative content (no mechanical turns)
  const storyTurns = useMemo(() => turns.filter((t) =>
    ["narration", "consequence", "action", "dialogue", "reaction", "description", "scene-break", "illustration"].includes(t.type)
  ), [turns]);

  // ── Pending roll request for the current player ───────────
  const pendingRollRequest = useMemo((): RollRequest | null => {
    if (!currentUserId || isGM) return null;
    // Find the most recent roll-request targeting this player (or "everyone")
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.type !== "roll-request" || !t.metadata) continue;
      try {
        const meta = JSON.parse(t.metadata) as {
          targetUserId: string;
          attribute: string;
          reason: string;
          onSuccess?: string;
          onFailure?: string;
          fatal?: boolean;
        };
        if (meta.targetUserId !== currentUserId && meta.targetUserId !== "everyone") continue;
        const hasResponded = turns.some(
          (r) => r.type === "roll" && r.userId === currentUserId && r.sortOrder > t.sortOrder
        );
        if (hasResponded) continue;
        return {
          targetUserId: meta.targetUserId,
          attribute: meta.attribute,
          reason: meta.reason,
          onSuccess: meta.onSuccess ?? "",
          onFailure: meta.onFailure ?? "",
          fatal: meta.fatal === true,
          turnId: t.id,
          sortOrder: t.sortOrder,
        };
      } catch {
        continue;
      }
    }
    return null;
  }, [turns, currentUserId, isGM]);

  // ── Handlers ──────────────────────────────────────────────

  // OOC chat — always allowed
  const handleSendChat = useCallback(
    async (message: string) => {
      try {
        await sendTurn("ooc", message, myCharacter?.id);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send message");
      }
    },
    [sendTurn, myCharacter, showToast]
  );

  // Draft commit — after player writes, return control to GM
  const handleCommitDraft = useCallback(
    async (content: string, type: string) => {
      try {
        const gmTypes = ["narration", "consequence"];
        const characterId = gmTypes.includes(type) ? undefined : myCharacter?.id;
        await sendTurn(type, content, characterId);
        // After a player writes, return control to GM (set activePlayerId to GM's userId)
        // null = open floor (anyone can write), GM userId = GM's turn (players locked)
        if (!isGM && campaignSession?.activePlayerId && story) {
          await setActivePlayer(story.userId);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to commit");
      }
    },
    [sendTurn, myCharacter, isGM, campaignSession, setActivePlayer, showToast]
  );

  // GM picks who goes next
  const handlePassTurn = useCallback(
    async (userId: string) => {
      try {
        await setActivePlayer(userId);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to pass turn");
      }
    },
    [setActivePlayer, showToast]
  );

  // GM opens the floor (free-form)
  const handleOpenFloor = useCallback(async () => {
    try {
      await setActivePlayer(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open floor");
    }
  }, [setActivePlayer, showToast]);

  // GM ends the session — open confirmation modal
  const handleEndSession = useCallback(() => {
    setShowEndModal(true);
  }, []);

  // GM confirms ending — save epilogue, play cinematic, update status
  const handleConfirmEndSession = useCallback(async () => {
    try {
      // Detect closing mood from last scene-break
      let closingMood = "calm";
      for (let i = storyTurns.length - 1; i >= 0; i--) {
        if (storyTurns[i].type === "scene-break" && storyTurns[i].metadata) {
          try { closingMood = JSON.parse(storyTurns[i].metadata!).mood ?? "calm"; } catch { /* ignore */ }
          break;
        }
      }

      const epilogue = epilogueText.trim() || undefined;
      await updateSession({ status: "completed", epilogue, closingMood });

      setShowEndModal(false);

      // Play cinematic for the GM
      setActiveStoryMoment({
        mood: closingMood,
        text: epilogue || "The story pauses here...",
        subtext: "Until next time.",
      });

      setEpilogueText("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to end session");
    }
  }, [updateSession, showToast, epilogueText, storyTurns]);

  // Turn timer expired — return control to GM
  const handleTurnExpired = useCallback(async () => {
    if (!story) return;
    try {
      await setActivePlayer(story.userId);
      showToast("Turn timer expired — control returned to GM");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to expire turn");
    }
  }, [story, setActivePlayer, showToast]);

  // Player extends their turn timer
  const handleExtendTimer = useCallback(async () => {
    showToast("Timer extended by 3 minutes");
    try {
      const charName = myCharacter?.name ?? "A player";
      await sendTurn("ooc", `[${charName}] requested more time to write`);
    } catch {
      // Non-critical — don't show error for OOC message
    }
  }, [showToast, myCharacter, sendTurn]);

  // GM changes character status (kill / retire / revive)
  const handleChangeCharacterStatus = useCallback(
    async (characterId: string, status: "active" | "retired" | "dead") => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/characters/${characterId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? "Failed to update character");
        }
        const char = characters.find((c) => c.id === characterId);
        const label = status === "dead" ? "has fallen" : status === "retired" ? "has retired" : "has been revived";
        showToast(`${char?.name ?? "Character"} ${label}`);
        if (status === "dead") {
          setActiveStoryMoment({
            mood: "death",
            text: `${char?.name ?? "A hero"} has fallen`,
            subtext: "The story remembers.",
          });
          await sendTurn("narration", `${char?.name ?? "A hero"} falls. The story remembers.`);
        } else if (status === "retired") {
          await sendTurn("narration", `${char?.name ?? "A companion"} departs, their chapter in this tale complete.`);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update character");
      }
    },
    [storyId, characters, showToast, sendTurn]
  );

  // Player completes a roll (responding to a roll-request)
  // If the roll was fatal and the result is a failure, auto-trigger character death
  const handleRollComplete = useCallback(
    async (total: number, modifier: number, attribute: string) => {
      try {
        const characterId = myCharacter?.id;
        const tier = total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
        const isFatal = pendingRollRequest?.fatal === true || (() => {
          // Fallback: check the roll-request turn metadata for fatal flag
          const rr = turns.find((t) => t.id === pendingRollRequest?.turnId);
          if (!rr?.metadata) return false;
          try { return JSON.parse(rr.metadata).fatal === true; } catch { return false; }
        })();
        const metadata = JSON.stringify({ total, modifier, attribute, tier, die: "2d6", fatal: isFatal && tier === "failure" });
        const tierLabel =
          tier === "success" ? "Full Success" : tier === "partial" ? "Partial Success" : "Failure";
        const content =
          modifier !== 0
            ? `Rolled 2d6${modifier >= 0 ? "+" : ""}${modifier} (${attribute.toUpperCase()}) = ${total} — ${tierLabel}`
            : `Rolled 2d6 = ${total} — ${tierLabel}`;
        await sendTurn("roll", content, characterId, metadata);

        // Auto-post the stakes outcome as a consequence narration
        // Skip for "everyone" rolls — GM writes the combined consequence manually
        if (pendingRollRequest?.targetUserId !== "everyone") {
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
            await sendTurn("consequence", outcomeText);
          }
        }

        // Fatal failure: auto-kill the character + cinematic moment
        if (isFatal && tier === "failure" && characterId) {
          setActiveStoryMoment({
            mood: "death",
            text: `${myCharacter?.name ?? "A hero"} has fallen`,
            subtext: "The dice have spoken.",
          });
          await handleChangeCharacterStatus(characterId, "dead");
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to record roll");
      }
    },
    [sendTurn, myCharacter, showToast, pendingRollRequest, turns, handleChangeCharacterStatus]
  );

  // GM requests a roll from a player (with stakes, optionally fatal)
  const handleRequestRoll = useCallback(
    async (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
      try {
        const targetChar = characters.find((c) => c.userId === targetUserId);
        const targetName = targetChar?.name ?? "the party";
        const fatalTag = fatal ? " [FATAL]" : "";
        const content = `The GM calls for a ${attribute.toUpperCase()} check from ${targetName}${fatalTag} — ${reason}`;
        const metadata = JSON.stringify({ targetUserId, attribute, reason, onSuccess, onFailure, fatal: !!fatal });
        await sendTurn("roll-request", content, undefined, metadata);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to request roll");
      }
    },
    [sendTurn, characters, showToast]
  );

  // Player writes last words after character death
  const handleLastWords = useCallback(
    async (content: string) => {
      try {
        await sendTurn("description", content, myCharacter?.id);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send last words");
      }
    },
    [sendTurn, myCharacter, showToast]
  );

  // Player sends an ephemeral reaction while waiting
  const handleReaction = useCallback(
    (reactionKey: string) => {
      const reactions: Record<string, string> = { tension: "\u2694\uFE0F", gasp: "\uD83D\uDE2E", bravo: "\uD83D\uDC4F", laugh: "\uD83D\uDE02", dread: "\uD83D\uDC80" };
      const charName = myCharacter?.name ?? "Someone";
      showToast(`${charName} reacted: ${reactions[reactionKey] ?? reactionKey}`);
    },
    [myCharacter, showToast]
  );

  // Edit a recently submitted turn (30s window)
  const handleEditTurn = useCallback(
    async (turnId: string, newContent: string) => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns/${turnId}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: newContent }) }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message ?? "Failed to edit turn");
        }
        showToast("Turn updated");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to edit turn");
      }
    },
    [storyId, sessionId, showToast]
  );

  // GM invites a player to create a new character (after death)
  const handleInviteNewCharacter = useCallback(
    async (userId: string) => {
      try {
        await fetch(`/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type: "campaign-invite-character",
            message: `The GM invites you to create a new character for "${story?.title ?? "the campaign"}"`,
            link: `/campaign/${storyId}`,
          }),
        });
        showToast("Invitation sent — the player can create a new character from the campaign hub.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send invitation");
      }
    },
    [storyId, story?.title, showToast]
  );

  // GM pushes a narrative event
  const handlePushEvent = useCallback(
    async (content: string) => {
      try {
        await sendTurn("narration", content);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to push event");
      }
    },
    [sendTurn, showToast]
  );

  // GM creates a scene break (with optional aspect tags)
  const handleSceneBreak = useCallback(
    async (title: string, mood: string, aspects?: string[]) => {
      try {
        const metadata = JSON.stringify({ title, mood, ...(aspects && aspects.length > 0 ? { aspects } : {}) });
        await sendTurn("scene-break", "", undefined, metadata);
        showToast(title ? `Scene: ${title}` : `Scene break (${mood})`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to create scene break");
      }
    },
    [sendTurn, showToast]
  );

  // GM triggers a cinematic story moment overlay
  const handleStoryMoment = useCallback(
    async (text: string, mood: string, subtext?: string) => {
      setActiveStoryMoment({ mood, text, subtext });
      // Also create a scene-break turn so the moment leaves a trace in the story
      try {
        const metadata = JSON.stringify({ mood, title: text, cinematic: true });
        await sendTurn("scene-break", text, undefined, metadata);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to create story moment");
      }
    },
    [sendTurn, showToast]
  );

  // GM drops an illustration into the story canvas
  const handleAddIllustration = useCallback(
    async (imageUrl: string, caption?: string) => {
      try {
        const metadata = JSON.stringify({ imageUrl, caption: caption || undefined });
        await sendTurn("illustration", caption || "", undefined, metadata);
        showToast("Illustration placed");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to add illustration");
      }
    },
    [sendTurn, showToast]
  );

  // ── Clock API sync ────────────────────────────────────────
  const clocksRef = useRef(clocks);
  clocksRef.current = clocks;

  const handleClocksChange = useCallback(
    async (newClocks: ProgressClockData[]) => {
      const prevClocks = clocksRef.current;

      // Optimistic update
      setClocks(newClocks);

      const prevMap = new Map(prevClocks.map((c) => [c.id, c]));
      const newMap = new Map(newClocks.map((c) => [c.id, c]));

      // Deleted clocks (in prev but not in new)
      for (const prev of prevClocks) {
        if (!newMap.has(prev.id)) {
          try {
            await fetch(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks/${prev.id}`,
              { method: "DELETE" }
            );
          } catch { /* ignore */ }
        }
      }

      // Added clocks (in new but not in prev — temp IDs start with "clock-")
      for (const clock of newClocks) {
        if (!prevMap.has(clock.id)) {
          try {
            const res = await fetch(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: clock.name, segments: clock.segments, type: clock.type }),
              }
            );
            if (res.ok) {
              const json = await res.json();
              // Replace temp ID with real DB ID
              setClocks((prev) =>
                prev.map((c) => (c.id === clock.id ? { ...c, id: json.data.id } : c))
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Updated clocks (same ID but filled/name changed)
      for (const clock of newClocks) {
        const prev = prevMap.get(clock.id);
        if (prev && (prev.filled !== clock.filled || prev.name !== clock.name)) {
          const updates: Record<string, unknown> = {};
          if (prev.filled !== clock.filled) updates.filled = clock.filled;
          if (prev.name !== clock.name) updates.name = clock.name;
          try {
            await fetch(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks/${clock.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
              }
            );
          } catch { /* ignore */ }
        }
      }
    },
    [storyId, sessionId, setClocks]
  );

  // ── Loading / Error ────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#080808] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full"
        />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="w-screen h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl opacity-30">&#x2694;&#xFE0F;</div>
          <p className="text-white/60">{error ?? "Session not found"}</p>
          <button
            onClick={() => router.push(`/campaign/${storyId}`)}
            className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors text-sm cursor-pointer"
          >
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen bg-[#080808] text-white font-sans overflow-hidden selection:bg-amber/30">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
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
                maxLength={5000}
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

      {/* Mobile drawer toggle */}
      <button
        onClick={() => setShowLogDrawer(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-amber transition-colors cursor-pointer"
        title="Session Log"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Left Pillar — desktop */}
      <div className="hidden lg:flex">
        <SessionLog
          turns={logTurns}
          currentUserId={currentUserId}
          sessionTitle={campaignSession?.title ?? "Session"}
          storyTitle={story.title}
          onSendChat={handleSendChat}
          chatInput={chatInput}
          setChatInput={setChatInput}
        />
      </div>

      {/* Left Pillar — mobile drawer */}
      <AnimatePresence>
        {showLogDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowLogDrawer(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 lg:hidden"
            >
              <SessionLog
                turns={logTurns}
                currentUserId={currentUserId}
                sessionTitle={campaignSession?.title ?? "Session"}
                storyTitle={story.title}
                onSendChat={handleSendChat}
                chatInput={chatInput}
                setChatInput={setChatInput}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center Stage */}
      <StoryCanvas
        sessionId={sessionId}
        storyId={storyId}
        storyTurns={storyTurns}
        characters={characters}
        rosterCharacters={rosterCharacters}
        allCharacters={characters}
        roster={roster}
        onUpdateRoster={updateRoster}
        activePlayerId={campaignSession?.activePlayerId ?? null}
        currentUserId={currentUserId}
        isGM={isGM}
        sessionTitle={campaignSession?.title ?? "Session"}
        sessionStatus={campaignSession?.status ?? "draft"}
        sessionOpening={campaignSession?.opening ?? null}
        lobbyTheme="campfire"
        previousEpilogue={previousEpilogue}
        previousMood={previousMood}
        onBeginSession={async () => {
          try {
            await updateSession({ status: "active" });
            const opening = campaignSession?.opening;
            if (opening) {
              // Play opening narration as a cinematic moment
              setActiveStoryMoment({
                mood: "calm",
                text: opening.length > 120 ? opening.slice(0, 120).trimEnd() + "..." : opening,
                subtext: campaignSession?.title ?? "The story begins.",
              });
              // Post the opening as the first narration turn
              await sendTurn("narration", opening);
            } else {
              showToast("The story begins!");
            }
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to begin session");
          }
        }}
        showDiceRoller={showDiceRoller || !!pendingRollRequest}
        onCloseDiceRoller={() => setShowDiceRoller(false)}
        onCommitDraft={handleCommitDraft}
        onPassTurn={handlePassTurn}
        onOpenFloor={handleOpenFloor}
        onEndSession={handleEndSession}
        onTurnExpired={handleTurnExpired}
        onExtendTimer={handleExtendTimer}
        onRollComplete={handleRollComplete}
        pendingRollRequest={pendingRollRequest}
        myCharacterStatus={myCharacter?.status ?? null}
        onLastWords={handleLastWords}
        onReaction={handleReaction}
        onEditTurn={handleEditTurn}
        mapPins={[]}
        onAddMapPin={() => showToast("Map pins coming soon")}
        onRemoveMapPin={() => showToast("Map pins coming soon")}
      />

      {/* Right Pillar */}
      <ContextPanel
        isGM={isGM}
        myCharacter={myCharacter}
        characters={characters}
        activePlayerId={campaignSession?.activePlayerId ?? null}
        onRequestRoll={handleRequestRoll}
        onPushEvent={handlePushEvent}
        onSceneBreak={handleSceneBreak}
        onChangeCharacterStatus={handleChangeCharacterStatus}
        onStoryMoment={handleStoryMoment}
        onAddIllustration={handleAddIllustration}
        roster={roster}
        onInviteNewCharacter={handleInviteNewCharacter}
        clocks={clocks}
        onClocksChange={handleClocksChange}
      />
    </div>
  );
}
