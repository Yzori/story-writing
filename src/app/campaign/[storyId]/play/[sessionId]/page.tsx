"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { useCampaignSession } from "@/hooks/use-campaign-session";
import SessionLog from "@/components/campaign/SessionLog";
import StoryStage from "@/components/campaign/play/StoryStage";
import ActionDock from "@/components/campaign/play/ActionDock";
import CharacterSheetPanel from "@/components/campaign/manuscript/CharacterLeaf";
import PartyStatusPanel from "@/components/campaign/manuscript/PartyLedger";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import StoryMoment from "@/components/campaign/StoryMoment";
import ActingGmBar from "@/components/campaign/ActingGmBar";
import EndSessionModal from "@/components/campaign/EndSessionModal";
import OpenFloorForm from "@/components/campaign/OpenFloorForm";
import DirectRow from "@/components/campaign/play/DirectRow";
import PlaySessionShell from "@/components/campaign/play/PlaySessionShell";
import PlayHeader from "@/components/campaign/play/PlayHeader";
import PhaseBanner from "@/components/campaign/play/PhaseBanner";
import TableRail from "@/components/campaign/play/TableRail";
import CastRail from "@/components/campaign/play/CastRail";
import ClocksSection from "@/components/campaign/play/ClocksSection";
import ChatPeek from "@/components/campaign/play/ChatPeek";
import {
  parseRollMetadata,
  parseSceneBreakMetadata,
  parseStoryMomentMetadata,
} from "@/lib/campaign-turns";
import { campaignJsonRequest } from "@/lib/campaign-api";
import { usePlayDerived } from "@/hooks/use-play-derived";
import { useTurnTimer } from "@/hooks/use-turn-timer";
import { useMediaQuery } from "@/hooks/use-media-query";
import CastStrip from "@/components/campaign/play/CastStrip";
import DeckSheet, { type DeckSegment } from "@/components/campaign/play/DeckSheet";

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
    floorRound,
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
    patchStory,
    updateSession,
    updateActingGm,
    updateRoster,
    editTurn,
    updateRollRequest,
    updateBargain,
    submitFloorResponse,
    voteFloorSubmission,
    updateFloorRound,
    clocks,
    setClocks,
    refreshClocks,
    createMark,
    removeMark,
    tableReactions,
    sendReaction,
  } = useCampaignSession(storyId, sessionId);

  const [chatInput, setChatInput] = useState("");
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [logTab, setLogTab] = useState<"talk" | "rolls">("talk");
  // Below lg the rail and chat drawer give way to the deck sheet. JS-gated
  // (not CSS-hidden) so the composer's draft state only ever mounts once.
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckSegment, setDeckSegment] = useState<DeckSegment>("you");
  const openDeck = useCallback((segment: DeckSegment) => {
    setDeckSegment(segment);
    setDeckOpen(true);
  }, []);
  const openChat = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setShowLogDrawer(true);
    else {
      setDeckSegment("talk");
      setDeckOpen(true);
    }
  }, []);
  const [floorFormOpen, setFloorFormOpen] = useState(false);
  const [floorPrompt, setFloorPrompt] = useState("");
  const [floorPulse, setFloorPulse] = useState(false);
  const [floorSubmitting, setFloorSubmitting] = useState(false);
  const [houseCount, setHouseCount] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [epilogueText, setEpilogueText] = useState("");
  const [cliffhangerText, setCliffhangerText] = useState("");
  const [activeStoryMoment, setActiveStoryMoment] = useState<{
    mood: string;
    text: string;
    subtext?: string;
  } | null>(null);
  const playedStoryMomentIdsRef = useRef(new Set<string>());
  const storyMomentPlaybackReadyRef = useRef(false);

  // The table feels the house: poll the live spectator count (read-only — the
  // GM/players don't register as spectators) while the session is live.
  const sessionStatus = campaignSession?.status;
  useEffect(() => {
    if (!storyId || !sessionId || sessionStatus !== "active") {
      setHouseCount(0);
      return;
    }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/presence`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && typeof json.spectatorCount === "number") setHouseCount(json.spectatorCount);
      } catch {
        // a missing count shouldn't disrupt play
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [storyId, sessionId, sessionStatus]);

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
        const timeoutId = setTimeout(() => {
          setActiveStoryMoment({
            mood: "calm",
            text: opening.length > 120 ? opening.slice(0, 120).trimEnd() + "..." : opening,
            subtext: campaignSession?.title ?? "The story begins.",
          });
        }, 0);
        prevSessionStatusRef.current = next;
        return () => clearTimeout(timeoutId);
      }
      // Session ended — play closing cinematic
      if (prev === "active" && next === "completed") {
        const timeoutId = setTimeout(() => {
          setActiveStoryMoment({
            mood: campaignSession?.closingMood ?? "calm",
            text: campaignSession?.epilogue || "The story pauses here...",
            subtext: "Until next time.",
          });
        }, 0);
        prevSessionStatusRef.current = next;
        return () => clearTimeout(timeoutId);
      }
    }
    prevSessionStatusRef.current = next;
  }, [campaignSession?.status, campaignSession?.opening, campaignSession?.epilogue, campaignSession?.closingMood, campaignSession?.title, isGM]);

  // ── Derived play state (see use-play-derived / campaign-play-derive) ──
  const ownerId = story?.userId ?? null;
  const {
    logTurns,
    storyTurns,
    extensionTurns,
    spotlightQueue,
    myHandRaised,
    pendingRollRequest,
    myAspectAvailable,
    actingGmPlayers,
    isActivePlayer,
    incomingReactions,
    currentScene,
    phase,
  } = usePlayDerived({
    turns,
    characters,
    ownerId,
    campaignSession,
    floorRound,
    currentUserId,
    isGM,
    myCharacter,
    tableReactions,
  });

  const handleActingGm = useCallback(
    async (action: "handoff" | "reclaim" | "propose" | "confirm" | "cancel", targetUserId?: string) => {
      try {
        await updateActingGm(action, targetUserId);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Couldn't update the GM seat");
      }
    },
    [updateActingGm, showToast],
  );

  useEffect(() => {
    if (loading) return;
    if (!storyMomentPlaybackReadyRef.current) {
      for (const turn of storyTurns) {
        if (turn.type === "story-moment") {
          playedStoryMomentIdsRef.current.add(turn.id);
        }
      }
      storyMomentPlaybackReadyRef.current = true;
      return;
    }

    const latest = [...storyTurns].reverse().find((turn) => turn.type === "story-moment");
    if (!latest || playedStoryMomentIdsRef.current.has(latest.id)) return;

    const meta = parseStoryMomentMetadata(latest.metadata);
    playedStoryMomentIdsRef.current.add(latest.id);
    setActiveStoryMoment({
      mood: meta?.mood ?? "ominous",
      text: latest.content,
      subtext: meta?.subtext,
    });
  }, [loading, storyTurns]);

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

  const handleUpdateRollRequest = useCallback(
    async (turnId: string, status: "closed" | "cancelled") => {
      try {
        await updateRollRequest(turnId, status);
        showToast(status === "closed" ? "Roll request closed" : "Roll request cancelled");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update roll request");
      }
    },
    [showToast, updateRollRequest],
  );

  // Draft commit — server hands the spotlight back to the GM automatically
  // after a player's story-type turn, so we no longer call setActivePlayer
  // from the client (that endpoint is GM-only and was 403'ing for players,
  // leaving the spotlight stuck on whoever had been assigned the turn).
  const handleCommitDraft = useCallback(
    async (content: string, type: string, metadata?: string) => {
      try {
        const gmTypes = ["narration", "consequence"];
        const characterId = gmTypes.includes(type) ? undefined : myCharacter?.id;
        await sendTurn(type, content, characterId, metadata);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to commit");
        throw err;
      }
    },
    [sendTurn, myCharacter, showToast]
  );

  const handleOfferBargain = useCallback(
    async (body: { targetUserId: string; targetLabel: string; gain: string; price: string }) => {
      try {
        const content =
          `The Director offers ${body.targetLabel} a bargain: ${body.gain} The price: ${body.price}`;
        await sendTurn(
          "consequence",
          content,
          undefined,
          JSON.stringify({
            kind: "bargain",
            targetUserId: body.targetUserId,
            targetLabel: body.targetLabel,
            gain: body.gain,
            price: body.price,
            status: "open",
          }),
        );
        showToast("Bargain offered");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to offer bargain");
        throw err;
      }
    },
    [sendTurn, showToast],
  );

  const handleResolveBargain = useCallback(
    async (turnId: string, response: "accepted" | "refused") => {
      try {
        await updateBargain(turnId, response);
        showToast(response === "accepted" ? "Bargain accepted" : "Bargain refused");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to answer bargain");
      }
    },
    [showToast, updateBargain],
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

  const handleSubmitFloorResponse = useCallback(
    async (roundId: string, body: { characterId: string; type: string; content: string }) => {
      try {
        await submitFloorResponse(roundId, body);
        showToast("Response submitted");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to submit response");
      }
    },
    [submitFloorResponse, showToast],
  );

  const handleVoteFloorSubmission = useCallback(
    async (roundId: string, submissionId: string) => {
      try {
        await voteFloorSubmission(roundId, submissionId);
        showToast("Vote cast");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to cast vote");
      }
    },
    [voteFloorSubmission, showToast],
  );

  const handleUpdateFloorRound = useCallback(
    async (
      roundId: string,
      body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
    ) => {
      try {
        await updateFloorRound(roundId, body);
        const label =
          body.status === "voting"
            ? "Voting is open"
            : body.status === "closed"
              ? "Voting closed"
            : body.status === "resolved"
              ? "Response canonized"
              : "Crossroads closed";
        showToast(label);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update Crossroads");
      }
    },
    [updateFloorRound, showToast],
  );

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
          const meta = parseSceneBreakMetadata(storyTurns[i].metadata);
          if (meta?.cinematic) continue;
          closingMood = meta?.mood ?? "calm";
          break;
        }
      }

      const epilogue = epilogueText.trim() || undefined;
      const cliffhanger = cliffhangerText.trim() || undefined;
      await updateSession({ status: "completed", epilogue, cliffhanger, closingMood });

      setShowEndModal(false);

      // Play cinematic for the GM
      setActiveStoryMoment({
        mood: closingMood,
        text: epilogue || "The story pauses here...",
        subtext: cliffhanger ? `Next: ${cliffhanger}` : "Until next time.",
      });

      setEpilogueText("");
      setCliffhangerText("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to end session");
    }
  }, [updateSession, showToast, epilogueText, cliffhangerText, storyTurns]);

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

  // Open the floor — players write competing responses, the table votes,
  // the GM canonizes. (One Crossroads shape since the 2026-07 feature kills.)
  const handleOpenFloor = async () => {
    if (!floorPrompt.trim() || floorSubmitting) return;
    setFloorSubmitting(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/floor-rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: floorPrompt.trim(),
          audiencePulseEnabled: floorPulse,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to open the floor");
      setFloorFormOpen(false);
      setFloorPrompt("");
      setFloorPulse(false);
      showToast("The floor is open — the table writes the next beat");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open the floor");
    } finally {
      setFloorSubmitting(false);
    }
  };

  // Player extends their turn timer. The {timerExtension} metadata rides
  // along on the OOC turn so the GM's InitiativeBar countdown — the one
  // that auto-returns the spotlight on expiry — extends too, instead of
  // the extension only existing on this player's screen.
  const handleExtendTimer = useCallback(async () => {
    showToast("Timer extended by 3 minutes");
    try {
      const charName = myCharacter?.name ?? "A player";
      await sendTurn(
        "ooc",
        `[${charName}] requested more time to write`,
        undefined,
        JSON.stringify({ timerExtension: 180 }),
      );
    } catch {
      // Non-critical — don't show error for OOC message
    }
  }, [showToast, myCharacter, sendTurn]);

  // ── The turn countdown — ONE per client ────────────────────
  // Lives at the page level (not in a rail/strip) so switching between the
  // desktop rail and the mobile strip can never double-mount it — a second
  // instance would double-fire the GM's auto-expiry.
  const timerActivePlayerId = campaignSession?.activePlayerId ?? null;
  const isSessionActive = campaignSession?.status === "active";
  const isPlayerTurnForTimer =
    timerActivePlayerId !== null &&
    characters.some((c) => c.userId === timerActivePlayerId && c.status === "active");
  const {
    progress: timerProgress,
    timeStr: timerTimeStr,
    urgency: timerUrgency,
    extendLocally,
    showExtendButton,
  } = useTurnTimer({
    activePlayerId: timerActivePlayerId,
    isPlayerTurn: isPlayerTurnForTimer,
    isActive: isSessionActive,
    isGM,
    currentUserId,
    extensionTurns,
    onTurnExpired: handleTurnExpired,
  });
  const seatTimer =
    isPlayerTurnForTimer && isSessionActive
      ? { progress: timerProgress, timeStr: timerTimeStr, urgency: timerUrgency }
      : null;
  // The seat owner's +3 min: bump this client instantly, then broadcast the
  // OOC {timerExtension} turn so every other countdown follows.
  const handleSeatExtend = useCallback(() => {
    extendLocally();
    void handleExtendTimer();
  }, [extendLocally, handleExtendTimer]);

  // GM changes character status (kill / retire / revive)
  const handleChangeCharacterStatus = useCallback(
    async (characterId: string, status: "active" | "retired" | "dead") => {
      try {
        await campaignJsonRequest(
          `/api/stories/${storyId}/campaign/characters/${characterId}`,
          {
            method: "PATCH",
            body: { status },
            fallbackError: "Failed to update character",
          },
        );
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
  // Server-authoritative roll: the client posts intent (attribute + aspect
  // invoked flag); the server rolls 2d6 with crypto, computes the modifier
  // from the player's actual character stats, writes the turn, generates the
  // consequence, and (on fatal failure) marks the character dead — all in one
  // transaction. The dice values come back so the DiceRoller can animate to
  // the real result.
  const handleRollSubmit = useCallback(
    async (intent: { attribute: string; aspectInvoked: boolean }) => {
      try {
        const characterId = myCharacter?.id;
        const metadata = JSON.stringify({
          attribute: intent.attribute,
          aspectInvoked: intent.aspectInvoked,
          ...(pendingRollRequest?.turnId ? { rollRequestTurnId: pendingRollRequest.turnId } : {}),
        });
        // The server overwrites content + metadata for roll turns; a placeholder
        // here just satisfies the non-empty-content validator.
        const turn = await sendTurn("roll", "Rolling…", characterId, metadata);
        const meta = parseRollMetadata(turn.metadata);
        if (!meta?.dice || meta.total === undefined || meta.modifier === undefined || !meta.tier) {
          throw new Error("Server returned an incomplete roll");
        }

        if (meta.fatal && meta.tier === "failure" && characterId) {
          setActiveStoryMoment({
            mood: "death",
            text: `${myCharacter?.name ?? "A hero"} has fallen`,
            subtext: "The dice have spoken.",
          });
        }

        return {
          dice: meta.dice,
          modifier: meta.modifier,
          total: meta.total,
          tier: meta.tier,
        };
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to record roll");
        throw err;
      }
    },
    [sendTurn, myCharacter, showToast, pendingRollRequest]
  );

  // GM requests a roll from a player (with stakes, optionally fatal)
  const handleRequestRoll = useCallback(
    async (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
      try {
        const targetChar = characters.find((c) => c.userId === targetUserId);
        const targetName = targetChar?.name ?? "the party";
        const fatalTag = fatal ? " [FATAL]" : "";
        const content = `The Director calls for a ${attribute} roll from ${targetName}${fatalTag} — ${reason}`;
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
        await sendTurn("description", content, myCharacter?.id, JSON.stringify({ lastWords: true }));
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send last words");
      }
    },
    [sendTurn, myCharacter, showToast]
  );

  // Player sends an ephemeral reaction while waiting \u2014 broadcast to the whole
  // table AND floated locally over the stage (the dock has no room to float).
  // Capped so the guard set / array can't grow without bound in long sessions.
  const [localFloats, setLocalFloats] = useState<Array<{ id: string; type: string }>>([]);
  const handleReaction = useCallback(
    (reactionKey: string) => {
      void sendReaction(reactionKey);
      setLocalFloats((prev) => [
        ...prev.slice(-19),
        { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: reactionKey },
      ]);
    },
    [sendReaction]
  );
  const reactionFloats = useMemo(
    () => [...incomingReactions, ...localFloats],
    [incomingReactions, localFloats],
  );

  // \u2500\u2500 Hand-raise (spotlight bid) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // A waiting player asks the Director for the pen. Rides the OOC turn stream
  // (same pattern as the timer-extension signal) so every client \u2014 crucially
  // the GM's \u2014 sees the request without a new endpoint or table.
  const handleRaiseHand = useCallback(async () => {
    const charName = myCharacter?.name ?? "A player";
    try {
      await sendTurn("ooc", `${charName} raises a hand for the spotlight.`, myCharacter?.id, JSON.stringify({ spotlightRequest: true }));
      showToast("Hand raised \u2014 the Director can pass you the pen");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to raise your hand");
    }
  }, [myCharacter, sendTurn, showToast]);

  const handleLowerHand = useCallback(async () => {
    const charName = myCharacter?.name ?? "A player";
    try {
      await sendTurn("ooc", `${charName} lowers their hand.`, myCharacter?.id, JSON.stringify({ spotlightCancel: true }));
    } catch {
      /* non-critical */
    }
  }, [myCharacter, sendTurn]);

  // Edit a recently submitted turn (30s window)
  const handleEditTurn = useCallback(
    async (turnId: string, newContent: string) => {
      try {
        await editTurn(turnId, newContent);
        showToast("Turn updated");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to edit turn");
      }
    },
    [editTurn, showToast]
  );

  // GM invites a player to create a new character (after death)
  const handleInviteNewCharacter = useCallback(
    async (userId: string) => {
      try {
        await campaignJsonRequest(`/api/notifications`, {
          method: "POST",
          body: {
            userId,
            type: "campaign-invite-character",
            message: `The GM invites you to create a new character for "${story?.title ?? "the campaign"}"`,
            link: `/campaign/${storyId}`,
          },
          fallbackError: "Failed to send invitation",
        });
        showToast("Invitation sent — the player can create a new character from the campaign hub.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send invitation");
      }
    },
    [storyId, story, showToast]
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
    async (
      text: string,
      mood: string,
      subtext?: string,
      options?: { importance?: "normal" | "major"; leavesMark?: boolean },
    ) => {
      try {
        const newTurn = await sendTurn(
          "story-moment",
          text,
          undefined,
          JSON.stringify({
            mood,
            ...(subtext ? { subtext } : {}),
            importance: options?.importance ?? "normal",
            ...(options?.leavesMark ? { markEligible: true } : {}),
          }),
        );
        playedStoryMomentIdsRef.current.add(newTurn.id);
        setActiveStoryMoment({ mood, text, subtext });
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
  const handleClocksChange = useCallback(
    async (newClocks: ProgressClockData[]) => {
      const prevClocks = clocks;
      let committedClocks = newClocks;

      // Optimistic update
      setClocks(newClocks);

      try {
        const prevMap = new Map(prevClocks.map((c) => [c.id, c]));
        const newMap = new Map(newClocks.map((c) => [c.id, c]));

        // Deleted clocks (in prev but not in new)
        for (const prev of prevClocks) {
          if (!newMap.has(prev.id)) {
            await campaignJsonRequest(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks/${prev.id}`,
              { method: "DELETE", fallbackError: "Failed to delete clock" },
            );
          }
        }

        // Added clocks (in new but not in prev)
        for (const clock of newClocks) {
          if (!prevMap.has(clock.id)) {
            const json = await campaignJsonRequest<ProgressClockData>(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks`,
              {
                method: "POST",
                body: { name: clock.name, segments: clock.segments, type: clock.type },
                fallbackError: "Failed to create clock",
              },
            );
            if (json.data) {
              committedClocks = committedClocks.map((c) =>
                c.id === clock.id ? { ...c, id: json.data!.id } : c,
              );
              setClocks(committedClocks);
            }
          }
        }

        // Updated clocks (same ID but filled/name changed)
        for (const clock of committedClocks) {
          const prev = prevMap.get(clock.id);
          if (prev && (prev.filled !== clock.filled || prev.name !== clock.name)) {
            const updates: Record<string, unknown> = {};
            if (prev.filled !== clock.filled) updates.filled = clock.filled;
            if (prev.name !== clock.name) updates.name = clock.name;
            await campaignJsonRequest(
              `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks/${clock.id}`,
              {
                method: "PATCH",
                body: updates,
                fallbackError: "Failed to update clock",
              },
            );
          }
        }
      } catch (err) {
        setClocks(prevClocks);
        showToast(err instanceof Error ? err.message : "Failed to sync clocks");
        refreshClocks().catch(() => undefined);
      }
    },
    [storyId, sessionId, clocks, setClocks, showToast, refreshClocks]
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

  const canPassSpotlight = isGM && campaignSession?.status === "active" && !floorRound;

  return (
    <PlaySessionShell
      focusMode={focusMode}
      header={
        <PlayHeader
          storyTitle={story.title}
          sceneTitle={currentScene.title}
          sessionStatus={campaignSession?.status ?? "draft"}
          houseCount={houseCount}
          firstClock={clocks[0] ?? null}
          isGM={isGM}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((value) => !value)}
          onEndSession={handleEndSession}
          onOpenCharacter={!isGM && !isDesktop ? () => openDeck("you") : undefined}
        />
      }
      banner={
        campaignSession ? (
          <PhaseBanner
            phase={phase}
            sceneMood={currentScene.mood}
            sceneAspects={currentScene.aspects}
            actingGmSlot={
              <ActingGmBar
                inline
                sessionStatus={campaignSession.status}
                ownerId={ownerId}
                actingGmId={campaignSession.actingGmId}
                takeoverProposerId={campaignSession.takeoverProposerId}
                currentUserId={currentUserId}
                players={actingGmPlayers}
                isActivePlayer={isActivePlayer}
                onAction={handleActingGm}
              />
            }
          />
        ) : undefined
      }
      rail={
        isDesktop ? (
          <TableRail>
            <CastRail
              characters={rosterCharacters.length > 0 ? rosterCharacters : characters}
              ownerId={ownerId}
              activePlayerId={campaignSession?.activePlayerId ?? null}
              currentUserId={currentUserId}
              isGM={isGM}
              sessionStatus={campaignSession?.status ?? "draft"}
              canPassSpotlight={canPassSpotlight}
              onPassTurn={handlePassTurn}
              spotlightQueue={spotlightQueue}
              seatTimer={seatTimer}
              showExtendButton={showExtendButton}
              onExtend={handleSeatExtend}
            />
            <ClocksSection clocks={clocks} isGM={isGM} onClocksChange={handleClocksChange} />
            {isGM ? (
              <PartyStatusPanel
                characters={characters}
                activePlayerId={campaignSession?.activePlayerId ?? null}
                onChangeCharacterStatus={handleChangeCharacterStatus}
                onInviteNewCharacter={handleInviteNewCharacter}
                roster={roster}
                currentUserId={currentUserId}
                onCreateMark={createMark}
                onRemoveMark={removeMark}
              />
            ) : (
              <CharacterSheetPanel
                myCharacter={myCharacter ?? null}
                onCreateMark={createMark}
                onRemoveMark={removeMark}
              />
            )}
            <ChatPeek logTurns={logTurns} onOpenChat={openChat} />
          </TableRail>
        ) : undefined
      }
      stage={
        <StoryStage
          sessionId={sessionId}
          storyId={storyId}
          storyTurns={storyTurns}
          logTurns={logTurns}
          characters={characters}
          rosterCharacters={rosterCharacters}
          allCharacters={characters}
          roster={roster}
          onUpdateRoster={updateRoster}
          activePlayerId={campaignSession?.activePlayerId ?? null}
          currentUserId={currentUserId}
          isGM={isGM}
          myCharacter={myCharacter}
          floorRound={floorRound}
          sessionTitle={campaignSession?.title ?? "Session"}
          sessionStatus={campaignSession?.status ?? "draft"}
          sessionOpening={campaignSession?.opening ?? null}
          storyTitle={story.title}
          sessionEpilogue={campaignSession?.epilogue ?? null}
          sessionCliffhanger={campaignSession?.cliffhanger ?? null}
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
              } else {
                showToast("The story begins!");
              }
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Failed to begin session");
            }
          }}
          showDiceRoller={showDiceRoller || !!pendingRollRequest}
          onCloseDiceRoller={() => setShowDiceRoller(false)}
          onResolveBargain={handleResolveBargain}
          onSubmitFloorResponse={handleSubmitFloorResponse}
          onVoteFloorSubmission={handleVoteFloorSubmission}
          onUpdateFloorRound={handleUpdateFloorRound}
          onCreateMark={createMark}
          onRollSubmit={handleRollSubmit}
          aspectAvailable={myAspectAvailable}
          pendingRollRequest={pendingRollRequest}
          reactionFloats={reactionFloats}
          onEditTurn={handleEditTurn}
          mapImageUrl={story?.mapImageUrl ?? null}
          onUpdateMapImage={async (url) => {
            try {
              await patchStory({ mapImageUrl: url });
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Failed to update map");
            }
          }}
        />
      }
      dock={
        <>
        {!isDesktop && (
          <CastStrip
            characters={rosterCharacters.length > 0 ? rosterCharacters : characters}
            ownerId={ownerId}
            activePlayerId={campaignSession?.activePlayerId ?? null}
            currentUserId={currentUserId}
            isGM={isGM}
            sessionStatus={campaignSession?.status ?? "draft"}
            canPassSpotlight={canPassSpotlight}
            onPassTurn={handlePassTurn}
            spotlightQueue={spotlightQueue}
            seatTimer={seatTimer}
            onOpenSheet={() => openDeck(isGM ? "cast" : "you")}
            onOpenChat={openChat}
          />
        )}
        <ActionDock
          sessionId={sessionId}
          sessionStatus={campaignSession?.status ?? "draft"}
          activePlayerId={campaignSession?.activePlayerId ?? null}
          currentUserId={currentUserId}
          isGM={isGM}
          myCharacter={myCharacter ?? null}
          characters={characters}
          floorRound={floorRound}
          pendingRollRequest={pendingRollRequest}
          onCommitDraft={handleCommitDraft}
          onViewChat={openChat}
          onReaction={handleReaction}
          myHandRaised={myHandRaised}
          onRaiseHand={handleRaiseHand}
          onLowerHand={handleLowerHand}
          onLastWords={handleLastWords}
          onOpenDiceRoller={() => setShowDiceRoller(true)}
          onUpdateFloorRound={handleUpdateFloorRound}
          penHolderName={
            characters.find((c) => c.userId === campaignSession?.activePlayerId)?.name ?? null
          }
          onReclaimPen={() => (story ? handlePassTurn(story.userId) : undefined)}
          directSlot={
            isGM ? (
              <DirectRow
                activeChars={characters.filter((c) => c.status === "active")}
                onRequestRoll={handleRequestRoll}
                onPushEvent={handlePushEvent}
                onSceneBreak={handleSceneBreak}
                onStoryMoment={handleStoryMoment}
                onAddIllustration={handleAddIllustration}
                onOfferBargain={handleOfferBargain}
                clocks={clocks}
                onClocksChange={handleClocksChange}
                onOpenFloor={() => setFloorFormOpen(true)}
                onOpenCast={isDesktop ? undefined : () => openDeck("cast")}
              />
            ) : undefined
          }
        />
        </>
      }
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-rose/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Session Confirmation Modal */}
      <EndSessionModal
        open={showEndModal}
        epilogueText={epilogueText}
        setEpilogueText={setEpilogueText}
        cliffhangerText={cliffhangerText}
        setCliffhangerText={setCliffhangerText}
        onConfirm={handleConfirmEndSession}
        onClose={() => setShowEndModal(false)}
      />

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

      {/* Open the floor — GM ritual */}
      {isGM && (
        <OpenFloorForm
          open={floorFormOpen}
          prompt={floorPrompt}
          setPrompt={setFloorPrompt}
          audiencePulse={floorPulse}
          setAudiencePulse={setFloorPulse}
          submitting={floorSubmitting}
          onSubmit={handleOpenFloor}
          onClose={() => setFloorFormOpen(false)}
        />
      )}

      <AnimatePresence>
        {showLogDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
              onClick={() => setShowLogDrawer(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 right-0 top-0 z-40 w-[min(390px,92vw)] border-l border-border"
            >
              <button
                onClick={() => setShowLogDrawer(false)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-void/80 text-text-secondary hover:text-paper"
                aria-label="Close feed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
              <SessionLog
                turns={logTurns}
                currentUserId={currentUserId}
                sessionTitle={campaignSession?.title ?? "Session"}
                storyTitle={story.title}
                onSendChat={handleSendChat}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isGM={isGM}
                onUpdateRollRequest={handleUpdateRollRequest}
                fullWidth
                view={logTab}
                onChangeView={setLogTab}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

        {/* The deck sheet — mobile home for character / table talk / cast.
            Desktop gets the same panels in the always-on rail instead. */}
        {!isDesktop && (
          <DeckSheet
            open={deckOpen}
            segment={deckSegment}
            onChangeSegment={setDeckSegment}
            onClose={() => setDeckOpen(false)}
            youLabel={isGM ? "Party" : "You"}
            renderSegment={(segment) => {
              if (segment === "talk") {
                return (
                  <div className="h-full">
                    <SessionLog
                      turns={logTurns}
                      currentUserId={currentUserId}
                      sessionTitle={campaignSession?.title ?? "Session"}
                      storyTitle={story.title}
                      onSendChat={handleSendChat}
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      isGM={isGM}
                      onUpdateRollRequest={handleUpdateRollRequest}
                      fullWidth
                      view={logTab}
                      onChangeView={setLogTab}
                    />
                  </div>
                );
              }
              if (segment === "cast") {
                return (
                  <div className="space-y-6 px-3 py-4">
                    <CastRail
                      characters={rosterCharacters.length > 0 ? rosterCharacters : characters}
                      ownerId={ownerId}
                      activePlayerId={campaignSession?.activePlayerId ?? null}
                      currentUserId={currentUserId}
                      isGM={isGM}
                      sessionStatus={campaignSession?.status ?? "draft"}
                      canPassSpotlight={canPassSpotlight}
                      onPassTurn={handlePassTurn}
                      spotlightQueue={spotlightQueue}
                      seatTimer={seatTimer}
                      showExtendButton={showExtendButton}
                      onExtend={handleSeatExtend}
                    />
                    <ClocksSection clocks={clocks} isGM={isGM} onClocksChange={handleClocksChange} />
                  </div>
                );
              }
              return (
                <div className="space-y-6 px-4 py-4">
                  {isGM ? (
                    <PartyStatusPanel
                      characters={characters}
                      activePlayerId={campaignSession?.activePlayerId ?? null}
                      onChangeCharacterStatus={handleChangeCharacterStatus}
                      onInviteNewCharacter={handleInviteNewCharacter}
                      roster={roster}
                      currentUserId={currentUserId}
                      onCreateMark={createMark}
                      onRemoveMark={removeMark}
                    />
                  ) : (
                    <CharacterSheetPanel
                      myCharacter={myCharacter ?? null}
                      onCreateMark={createMark}
                      onRemoveMark={removeMark}
                    />
                  )}
                  <ClocksSection clocks={clocks} isGM={isGM} onClocksChange={handleClocksChange} />
                </div>
              );
            }}
          />
        )}
    </PlaySessionShell>
  );
}
