"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { useCampaignSession } from "@/hooks/use-campaign-session";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import ContextPanel from "@/components/campaign/ContextPanel";
import type { RollRequest } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import StoryMoment from "@/components/campaign/StoryMoment";
import ActingGmBar, { type ActingGmPlayer } from "@/components/campaign/ActingGmBar";
import EndSessionModal from "@/components/campaign/EndSessionModal";
import OpenFloorForm from "@/components/campaign/OpenFloorForm";
import DirectorsHand from "@/components/campaign/DirectorsHand";
import {
  isLogTurnType,
  isStoryTurnType,
  parseRollMetadata,
  parseRollRequestMetadata,
  parseSceneBreakMetadata,
  parseStoryMomentMetadata,
} from "@/lib/campaign-turns";
import { campaignJsonRequest } from "@/lib/campaign-api";

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
    updateAudienceSpark,
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
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [handOpen, setHandOpen] = useState(false);
  // First-run discoverability for the Director's hand: the fan holds every GM
  // stage move (rolls, scenes, bargains, clocks) but it's a single glyph, so a
  // first-time GM can miss it entirely. Show a labeled pulse until they open it
  // once. Default true to avoid an SSR/first-paint flash; hydrate from storage.
  const [directHintSeen, setDirectHintSeen] = useState(true);
  useEffect(() => {
    try {
      setDirectHintSeen(localStorage.getItem("quiloria.gm.directHintSeen") === "1");
    } catch {
      /* storage blocked — just skip the hint */
    }
  }, []);
  const openDirectorsHand = useCallback(() => {
    setHandOpen((v) => !v);
    if (!directHintSeen) {
      setDirectHintSeen(true);
      try {
        localStorage.setItem("quiloria.gm.directHintSeen", "1");
      } catch {
        /* ignore */
      }
    }
  }, [directHintSeen]);
  // First-run coaching for players: the turn protocol (you write when handed the
  // pen; otherwise react or raise your hand) is enforced but never taught. P0 #3.
  const [playerCoachSeen, setPlayerCoachSeen] = useState(true);
  useEffect(() => {
    try {
      setPlayerCoachSeen(localStorage.getItem("quiloria.player.coachSeen") === "1");
    } catch {
      /* storage blocked — skip the coach */
    }
  }, []);
  const dismissPlayerCoach = useCallback(() => {
    setPlayerCoachSeen(true);
    try {
      localStorage.setItem("quiloria.player.coachSeen", "1");
    } catch {
      /* ignore */
    }
  }, []);
  const [consoleFocus, setConsoleFocus] = useState<null | "roll" | "scene" | "story" | "illustration" | "bargain" | "pressure">(null);
  const [floorFormOpen, setFloorFormOpen] = useState(false);
  const [floorPrompt, setFloorPrompt] = useState("");
  const [floorOptions, setFloorOptions] = useState<string[]>(["", ""]);
  const [floorBinding, setFloorBinding] = useState(false);
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

  // ── Turn routing ──────────────────────────────────────────
  // Left pillar: only meta/mechanical stuff (chat, dice, roll requests)
  const logTurns = useMemo(() => turns.filter((t) =>
    isLogTurnType(t.type)
  ), [turns]);
  // Center stage: all narrative content (no mechanical turns)
  const storyTurns = useMemo(() => turns.filter((t) =>
    isStoryTurnType(t.type)
  ), [turns]);
  // Save-trump availability: a scene resets at each scene-break. Base one save
  // (the aspect) + one per active vow the character carries (P1 #10). Mirrors
  // the server check in turns/route.ts so the dice UI disables a spent invoke.
  const myAspectAvailable = useMemo(() => {
    if (!currentUserId) return true;
    let sceneStart = -1;
    for (const t of turns) {
      if (t.type === "scene-break" && t.sortOrder > sceneStart) sceneStart = t.sortOrder;
    }
    const used = turns.filter(
      (t) =>
        t.type === "roll" &&
        t.userId === currentUserId &&
        t.sortOrder > sceneStart &&
        parseRollMetadata(t.metadata)?.aspectSaved === true,
    ).length;
    const vowCount = (myCharacter?.marks ?? []).filter((m) => m.kind === "vow").length;
    return used < 1 + vowCount;
  }, [turns, currentUserId, myCharacter]);

  // Acting-GM continuity (D2): the table of active players (handoff targets +
  // name lookup), excluding the owner, and whether I'm one of them.
  const ownerId = story?.userId ?? null;
  const actingGmPlayers = useMemo<ActingGmPlayer[]>(() => {
    const seen = new Set<string>();
    const list: ActingGmPlayer[] = [];
    for (const c of characters) {
      if (c.status !== "active" || c.userId === ownerId || seen.has(c.userId)) continue;
      seen.add(c.userId);
      list.push({ userId: c.userId, name: c.name || c.user?.displayName || "A player" });
    }
    return list;
  }, [characters, ownerId]);
  const isActivePlayer = !!currentUserId && actingGmPlayers.some((p) => p.userId === currentUserId);

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
  // OOC turns carrying an "Extend +3min" request — InitiativeBar applies
  // these to every client's countdown (see handleExtendTimer below).
  const extensionTurns = useMemo(
    () => logTurns.filter((t) => t.type === "ooc" && !!t.metadata?.includes("timerExtension")),
    [logTurns],
  );

  // ── Spotlight queue (hand-raises) ─────────────────────────
  // Derived from the OOC turn stream: a player's latest {spotlightRequest} is
  // "open" until they cancel it, post a story beat, or get handed the pen.
  const spotlightQueue = useMemo(() => {
    const latestRequest = new Map<string, number>();
    const latestCancel = new Map<string, number>();
    const latestStoryBy = new Map<string, number>();
    for (const t of turns) {
      if (!t.userId) continue;
      if (t.type === "ooc" && t.metadata) {
        let meta: { spotlightRequest?: boolean; spotlightCancel?: boolean } | null = null;
        try { meta = JSON.parse(t.metadata); } catch { meta = null; }
        if (meta?.spotlightRequest) {
          latestRequest.set(t.userId, Math.max(latestRequest.get(t.userId) ?? -1, t.sortOrder));
        } else if (meta?.spotlightCancel) {
          latestCancel.set(t.userId, Math.max(latestCancel.get(t.userId) ?? -1, t.sortOrder));
        }
      } else if (isStoryTurnType(t.type)) {
        latestStoryBy.set(t.userId, Math.max(latestStoryBy.get(t.userId) ?? -1, t.sortOrder));
      }
    }
    const out: Array<{ userId: string; characterName: string; sortOrder: number }> = [];
    for (const [userId, reqSort] of latestRequest) {
      if (userId === story?.userId) continue; // the Director doesn't queue
      if ((latestCancel.get(userId) ?? -1) > reqSort) continue;
      if ((latestStoryBy.get(userId) ?? -1) > reqSort) continue;
      if (campaignSession?.activePlayerId === userId) continue; // already holds the pen
      const char = characters.find((c) => c.userId === userId);
      out.push({ userId, characterName: char?.name ?? "A player", sortOrder: reqSort });
    }
    return out.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [turns, characters, story?.userId, campaignSession?.activePlayerId]);

  const myHandRaised = !!currentUserId && spotlightQueue.some((q) => q.userId === currentUserId);

  // Reactions from everyone but me — my own clicks already float locally.
  const incomingReactions = useMemo(
    () => tableReactions.filter((r) => r.userId !== currentUserId).map((r) => ({ id: r.id, type: r.type })),
    [tableReactions, currentUserId],
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

  // ── Pending roll request for the current player ───────────
  const pendingRollRequest = ((): RollRequest | null => {
    if (!currentUserId || isGM) return null;
    // A roll needs a living character. If this player's character died or
    // retired after the request was issued, don't force the ritual open —
    // the server rejects every attempt and the modal cannot be dismissed.
    if (myCharacter?.status !== "active") return null;
    // Find the most recent roll-request targeting this player (or "everyone")
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.type !== "roll-request" || !t.metadata) continue;
      const meta = parseRollRequestMetadata(t.metadata);
      if (!meta) continue;
      if ((meta.status ?? "open") !== "open") continue;
      const requiredUserIds: string[] = meta.requiredUserIds?.length
        ? meta.requiredUserIds
        : meta.targetUserId === "everyone"
          ? [currentUserId]
          : [meta.targetUserId];
      if (!requiredUserIds.includes(currentUserId)) continue;
      const hasResponded = turns.some(
        (r) =>
          r.type === "roll" &&
          r.userId === currentUserId &&
          parseRollMetadata(r.metadata)?.rollRequestTurnId === t.id
      );
      if (hasResponded) continue;
      return {
        targetUserId: meta.targetUserId,
        attribute: meta.attribute,
        reason: meta.reason,
        onSuccess: meta.onSuccess ?? "",
        onFailure: meta.onFailure ?? "",
        fatal: meta.fatal === true,
        status: meta.status ?? "open",
        requiredUserIds,
        turnId: t.id,
        sortOrder: t.sortOrder,
      };
    }
    return null;
  })();

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

  const handleUpdateAudienceSpark = useCallback(
    async (roundId: string, sparkId: string, action: "promote" | "reject") => {
      try {
        await updateAudienceSpark(roundId, sparkId, action);
        showToast(action === "promote" ? "Audience Spark promoted to vote options" : "Audience Spark passed");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update Audience Spark");
      }
    },
    [updateAudienceSpark, showToast],
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

  // Open the floor to the house — a GM-authored vote the gallery decides.
  const handleOpenFloor = async () => {
    const opts = floorOptions.map((o) => o.trim()).filter(Boolean);
    if (!floorPrompt.trim() || opts.length < 2 || floorSubmitting) return;
    setFloorSubmitting(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/floor-rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: floorPrompt.trim(),
          mode: "house_fork",
          constituency: "gallery",
          binding: floorBinding,
          options: opts.map((label) => ({ label })),
          closesInSeconds: 120,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to open the floor");
      setFloorFormOpen(false);
      setFloorPrompt("");
      setFloorOptions(["", ""]);
      setFloorBinding(false);
      showToast("The floor is open to the house");
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
  // table (and floated locally by the canvas), no longer a self-only toast.
  const handleReaction = useCallback(
    (reactionKey: string) => {
      void sendReaction(reactionKey);
    },
    [sendReaction]
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

  const activePlayerCharacter = characters.find((c) => c.userId === campaignSession?.activePlayerId);
  const spotlightLabel = activePlayerCharacter?.name
    ?? (campaignSession?.activePlayerId ? "Player joining…" : "Director");
  const activeCharacters = rosterCharacters.length > 0
    ? rosterCharacters.filter((c) => c.status === "active")
    : characters.filter((c) => c.status === "active");
  const canPassSpotlight = isGM && campaignSession?.status === "active" && !floorRound;
  // The Director is a first-class seat: holds the pen when no player is on the spotlight.
  const directorHolds = !campaignSession?.activePlayerId || campaignSession?.activePlayerId === story?.userId;
  const currentScene = (() => {
    for (let i = storyTurns.length - 1; i >= 0; i--) {
      const turn = storyTurns[i];
      if (turn.type === "scene-break" && turn.metadata) {
        const meta = parseSceneBreakMetadata(turn.metadata);
        if (meta?.cinematic) continue;
        return {
          title: meta?.title || campaignSession?.title || "Current Scene",
          mood: meta?.mood ?? "live",
          aspects: meta?.aspects ?? [],
        };
      }
    }
    return {
      title: campaignSession?.title ?? "Current Scene",
      mood: campaignSession?.status ?? "live",
      aspects: [] as string[],
    };
  })();
  const phaseLabel = floorRound
    ? floorRound.status === "open"
      ? "Crossroads Open"
      : floorRound.status === "voting"
        ? "Table Vote"
        : floorRound.status === "closed"
          ? "Director Resolving"
          : "Crossroads"
    : pendingRollRequest
      ? "Check Pending"
      : campaignSession?.activePlayerId
        ? "Spotlight"
        : "Director Beat";
  const phaseHint = floorRound
    ? floorRound.prompt
    : pendingRollRequest
      ? pendingRollRequest.reason
      : campaignSession?.activePlayerId
        ? `${spotlightLabel} is writing the next beat.`
        : isGM
          ? "Frame the scene, call a check, or pass the spotlight."
          : "Waiting for the Director to frame the next beat.";

  return (
    <div className={`adventure-mode flex w-screen flex-col overflow-hidden bg-void text-paper selection:bg-amber/30 ${
      focusMode
        ? "fixed inset-0 z-[80] h-screen"
        : "mt-14 h-[calc(100vh-3.5rem)]"
    }`}>
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

      <header className="z-30 shrink-0 border-b border-border bg-void/92 backdrop-blur-xl">
        <div className="flex min-h-16 items-center gap-3 px-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-[17px] text-paper sm:text-[22px]">{story.title}</h1>
              <span className="hidden rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-amber sm:inline-flex">
                Live Canon
              </span>
            </div>
            <p className="truncate text-[11px] text-text-tertiary" aria-live="polite">
              {currentScene.title} · <span className="text-amber/75">{phaseLabel}</span> — {phaseHint}
            </p>
            {(clocks.length > 0 || houseCount > 0) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                {clocks.length > 0 && (
                  <span className="flex items-center gap-2" title={`${clocks[0].name} — ${clocks[0].filled}/${clocks[0].segments}`}>
                    <span className="text-[11px] leading-none text-amber/80">⛓</span>
                    <span className="max-w-[180px] truncate text-[11px] text-text-secondary">{clocks[0].name}</span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: clocks[0].segments }).map((_, i) => (
                        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < clocks[0].filled ? "bg-amber" : "bg-subtle"}`} />
                      ))}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-amber/70">{clocks[0].filled}/{clocks[0].segments}</span>
                  </span>
                )}
                {houseCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-text-secondary" title={`${houseCount} watching`}>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet [animation:pulse_1.8s_ease-in-out_infinite]" />
                    {houseCount} in the house
                  </span>
                )}
              </div>
            )}
          </div>

          {/* The spotlight — whose turn it is. The Director is a seat, lit when
              they hold the pen; the GM taps a seat to pass it. (StoryCanvas's
              InitiativeBar is disabled here via showSessionChrome=false, so this
              header rail is the canonical control.) */}
          <div className="hidden shrink-0 items-center justify-center gap-1.5 md:flex" role="group" aria-label="Whose turn it is">
            <button
              type="button"
              onClick={() => (canPassSpotlight ? setActivePlayer(story.userId) : undefined)}
              title={canPassSpotlight ? "Return the pen to the Director" : "The Director"}
              aria-label={`The Director${directorHolds ? " — holds the pen" : ""}`}
              className={`flex min-h-9 items-center gap-2 rounded-full border px-2.5 transition-colors ${
                directorHolds
                  ? "border-amber/45 bg-amber/[0.12] text-amber shadow-[0_0_18px_-4px_rgba(216,178,90,0.6)]"
                  : "border-border bg-subtle/20 text-text-secondary hover:border-border-active hover:text-paper"
              } ${canPassSpotlight ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-amber/30 bg-elevated text-[10px]">✦</span>
              <span className="hidden text-[10px] lg:inline">Director</span>
            </button>
            {activeCharacters.slice(0, 5).map((character) => {
              const lit = campaignSession?.activePlayerId === character.userId;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => (canPassSpotlight ? handlePassTurn(character.userId) : undefined)}
                  title={canPassSpotlight ? `Pass the pen to ${character.name}` : character.name}
                  aria-label={`${character.name}${lit ? " — holds the pen" : ""}`}
                  className={`flex min-h-9 items-center gap-2 rounded-full border px-2.5 transition-colors ${
                    lit
                      ? "border-amber/45 bg-amber/[0.12] text-amber shadow-[0_0_18px_-4px_rgba(216,178,90,0.6)]"
                      : "border-border bg-subtle/20 text-text-secondary hover:border-border-active hover:text-paper"
                  } ${canPassSpotlight ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-elevated text-[10px]">
                    {character.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[90px] truncate text-[10px] lg:inline">{character.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            {isGM && (
              <button
                type="button"
                onClick={handleEndSession}
                className="hidden min-h-10 rounded-full border border-border bg-subtle/20 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-rose/30 hover:text-rose sm:inline-flex sm:items-center"
              >
                End Session
              </button>
            )}
            <button
              type="button"
              onClick={() => setFocusMode((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
              aria-label={focusMode ? "Show platform navigation" : "Enter focus mode"}
              title={focusMode ? "Show platform navigation" : "Enter focus mode"}
            >
              {focusMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M8 3v5H3" />
                  <path d="M16 3v5h5" />
                  <path d="M8 21v-5H3" />
                  <path d="M16 21v-5h5" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M3 9V3h6" />
                  <path d="M21 9V3h-6" />
                  <path d="M3 15v6h6" />
                  <path d="M21 15v6h-6" />
                </svg>
              )}
            </button>
            {/* Table talk (OOC chat) is reached from the bottom bar / composer's
                "View chat", not a header icon. GM directs from the Director's
                hand (the ✦ button); only players need the character drawer. */}
            {!isGM && (
              <button
                type="button"
                onClick={() => setShowContextDrawer(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                aria-label="Your character"
                title="Your character"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live-play continuity (D2) — in-flow band directly under the header rail
          so it never overlaps the turn/scene info above. Renders only when there's
          something to show or do. */}
      {campaignSession && (
        <ActingGmBar
          sessionStatus={campaignSession.status}
          ownerId={ownerId}
          actingGmId={campaignSession.actingGmId}
          takeoverProposerId={campaignSession.takeoverProposerId}
          currentUserId={currentUserId}
          players={actingGmPlayers}
          isActivePlayer={isActivePlayer}
          onAction={handleActingGm}
        />
      )}

      <main className="relative min-h-0 flex-1">
        {/* Hand-raise queue — the Director sees who's asking for the pen and
            grants it with a tap. Players bid from the waiting bar below. */}
        {isGM && campaignSession?.status === "active" && spotlightQueue.length > 0 && (
          <div className="pointer-events-none absolute left-4 top-4 z-20 w-[250px] space-y-2">
            <p className="flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber">
              <span>✋</span> Asking for the spotlight
            </p>
            {spotlightQueue.map((req) => (
              <div
                key={req.userId}
                className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg border border-amber/25 bg-void/80 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-md"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] text-paper">{req.characterName}</span>
                <button
                  type="button"
                  onClick={() => handlePassTurn(req.userId)}
                  disabled={!canPassSpotlight}
                  className="shrink-0 rounded-full border border-amber/40 bg-amber/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Give the pen
                </button>
              </div>
            ))}
          </div>
        )}

        {!showLogDrawer && !showContextDrawer && logTurns.length > 0 && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 hidden w-[270px] space-y-2 xl:block">
            {logTurns.slice(-2).reverse().map((turn) => (
              <button
                key={turn.id}
                type="button"
                onClick={() => setShowLogDrawer(true)}
                className="pointer-events-auto w-full rounded-lg border border-border bg-void/70 px-3 py-2 text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors hover:border-amber/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber">
                    {turn.type === "roll-request" ? "Check Pending" : turn.type === "roll" ? "Roll" : "Table Whisper"}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-text-ghost">{turn.characterName ?? turn.user?.displayName ?? "Table"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{turn.content}</p>
              </button>
            ))}
          </div>
        )}

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
        onCommitDraft={handleCommitDraft}
        onResolveBargain={handleResolveBargain}
        onSubmitFloorResponse={handleSubmitFloorResponse}
        onVoteFloorSubmission={handleVoteFloorSubmission}
        onUpdateAudienceSpark={handleUpdateAudienceSpark}
        onUpdateFloorRound={handleUpdateFloorRound}
        onCreateMark={createMark}
        onPassTurn={handlePassTurn}
        onEndSession={handleEndSession}
        onTurnExpired={handleTurnExpired}
        onExtendTimer={handleExtendTimer}
        extensionTurns={extensionTurns}
        onRollSubmit={handleRollSubmit}
        aspectAvailable={myAspectAvailable}
        pendingRollRequest={pendingRollRequest}
        myCharacterStatus={myCharacter?.status ?? null}
        onLastWords={handleLastWords}
        onReaction={handleReaction}
        incomingReactions={incomingReactions}
        myHandRaised={myHandRaised}
        onRaiseHand={handleRaiseHand}
        onLowerHand={handleLowerHand}
        onEditTurn={handleEditTurn}
        mapImageUrl={story?.mapImageUrl ?? null}
        onUpdateMapImage={async (url) => {
          try {
            await patchStory({ mapImageUrl: url });
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to update map");
          }
        }}
        showSessionChrome={false}
        onViewChat={() => setShowLogDrawer(true)}
      />


      {/* First-run player coaching — teaches the turn protocol once (P0 #3) */}
      <AnimatePresence>
        {!focusMode && !isGM && currentUserId && myCharacter &&
          campaignSession?.status === "active" && !playerCoachSeen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none fixed inset-x-0 bottom-44 z-40 flex justify-center px-3 sm:bottom-48"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber/35 bg-gradient-to-b from-amber/[0.10] to-ink/95 p-4 shadow-[0_18px_50px_-28px_rgba(216,178,90,0.7)] backdrop-blur-md">
              <p className="text-[13px] font-semibold text-amber">You&rsquo;re at the table.</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
                You&rsquo;ll write when the Director hands you the pen. Until then, react to the
                story or <strong className="text-paper">raise your hand</strong> to ask for the
                spotlight. When a roll is called, your <strong className="text-paper">aspect</strong>{" "}
                can save a miss — once per scene.
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={dismissPlayerCoach}
                  className="rounded-full bg-amber px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-void transition-colors hover:bg-amber/90"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Director's hand — GM-only floating summoner for stage-gestures.
          The fan is the discoverable affordance; each gesture opens the
          Director Console where its ritual lives. */}
      {isGM && campaignSession?.status === "active" && !focusMode && (
        <DirectorsHand
          handOpen={handOpen}
          directHintSeen={directHintSeen}
          onToggle={openDirectorsHand}
          onOpenFloor={() => {
            setHandOpen(false);
            setFloorFormOpen(true);
          }}
          onConsoleGesture={(focus) => {
            setHandOpen(false);
            setConsoleFocus(focus);
            setShowContextDrawer(true);
          }}
        />
      )}

      {/* Open the floor — GM ritual */}
      {isGM && (
        <OpenFloorForm
          open={floorFormOpen}
          prompt={floorPrompt}
          setPrompt={setFloorPrompt}
          options={floorOptions}
          setOptions={setFloorOptions}
          binding={floorBinding}
          setBinding={setFloorBinding}
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-[min(390px,92vw)]"
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

        <AnimatePresence>
          {showContextDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
                onClick={() => {
                  setShowContextDrawer(false);
                  setConsoleFocus(null);
                }}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 right-0 top-0 z-50 w-[min(390px,92vw)]"
              >
                <button
                  onClick={() => {
                    setShowContextDrawer(false);
                    setConsoleFocus(null);
                  }}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-void/80 text-text-secondary hover:text-paper"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
                <ContextPanel
                  forceVisible
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
                  currentUserId={currentUserId}
                  onCreateMark={createMark}
                  onRemoveMark={removeMark}
                  onOfferBargain={handleOfferBargain}
                  focus={isGM ? consoleFocus : null}
                  onClose={() => {
                    setShowContextDrawer(false);
                    setConsoleFocus(null);
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
