"use client";

import { useCallback, useMemo, useState } from "react";
import SessionLog from "@/components/campaign/SessionLog";
import StoryStage from "@/components/campaign/play/StoryStage";
import ActionDock from "@/components/campaign/play/ActionDock";
import DirectRow from "@/components/campaign/play/DirectRow";
import TableRail from "@/components/campaign/play/TableRail";
import CastRail from "@/components/campaign/play/CastRail";
import ClocksSection from "@/components/campaign/play/ClocksSection";
import CharacterSheetPanel from "@/components/campaign/manuscript/CharacterLeaf";
import PartyStatusPanel from "@/components/campaign/manuscript/PartyLedger";
import AudiencePulsePanel from "@/components/campaign/spectator/AudiencePulsePanel";
import ThemeToggle from "@/components/editor/ThemeToggle";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import { parseRollRequestMetadata } from "@/lib/campaign-turns";
import { APPROACHES, parseStats } from "@/types/campaign";
import type { FloorRound, RollRequest, Turn } from "@/types/campaign";
import {
  ACTIVE_PLAYER_USER_IDS,
  CHARACTERS,
  GM_TURN_BASE,
  GM_USER_ID,
  INITIAL_FLOOR_ROUND,
  INITIAL_TURNS,
  OPENING_NARRATION,
  SESSION_ID,
  STORY_ID,
  VIEW_AS_OPTIONS,
  viewAsToUserId,
  type ViewAs,
} from "./fixtures";

// ── Component ───────────────────────────────────────────────

export default function DemoAdventurePage() {
  const [viewAs, setViewAs] = useState<ViewAs>("gm");
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [floorRound, setFloorRound] = useState<FloorRound | null>(INITIAL_FLOOR_ROUND);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"log" | "context" | null>(null);

  const currentUserId = viewAsToUserId(viewAs);
  const isGM = viewAs === "gm";
  const isSpectator = viewAs === "spectator";
  const myCharacter = useMemo(
    () => CHARACTERS.find((c) => c.userId === currentUserId) ?? null,
    [currentUserId],
  );

  const pendingRollRequest: RollRequest | null = (() => {
    if (!currentUserId || isGM || isSpectator) return null;
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.type !== "roll-request" || !t.metadata) continue;
      const meta = parseRollRequestMetadata(t.metadata);
      if (!meta || (meta.status ?? "open") !== "open") continue;
      const required = meta.requiredUserIds?.length
        ? meta.requiredUserIds
        : meta.targetUserId === "everyone"
          ? ACTIVE_PLAYER_USER_IDS
          : [meta.targetUserId];
      if (!required.includes(currentUserId)) continue;
      const responded = turns.some((r) => {
        if (r.type !== "roll" || r.userId !== currentUserId || !r.metadata) return false;
        try {
          return JSON.parse(r.metadata)?.rollRequestTurnId === t.id;
        } catch { return false; }
      });
      if (responded) continue;
      return {
        targetUserId: meta.targetUserId,
        attribute: meta.attribute,
        reason: meta.reason,
        onSuccess: meta.onSuccess ?? "",
        onFailure: meta.onFailure ?? "",
        fatal: meta.fatal === true,
        status: meta.status ?? "open",
        requiredUserIds: required,
        turnId: t.id,
        sortOrder: t.sortOrder,
      };
    }
    return null;
  })();

  const storyTurns = useMemo(
    () => turns.filter((t) => t.type !== "ooc" && t.type !== "roll" && t.type !== "roll-request"),
    [turns],
  );
  const logTurns = useMemo(
    () => turns.filter((t) => t.type === "ooc" || t.type === "roll" || t.type === "roll-request"),
    [turns],
  );

  // ── Handlers ────────────────────────────────────────────────

  const appendTurn = useCallback((partial: Omit<Turn, "id" | "sessionId" | "sortOrder" | "createdAt">) => {
    setTurns((prev) => [
      ...prev,
      {
        ...partial,
        id: `t-${prev.length}-${Date.now()}`,
        sessionId: SESSION_ID,
        sortOrder: Math.max(0, ...prev.map((t) => t.sortOrder)) + 1,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleSendChat = useCallback((message: string) => {
    if (!message.trim() || !currentUserId) return;
    appendTurn({
      userId: currentUserId,
      characterId: myCharacter?.id ?? null,
      type: "ooc",
      content: message.trim(),
      metadata: null,
      user: myCharacter?.user ?? { id: currentUserId, displayName: isGM ? "Alex (GM)" : "You", avatarUrl: null },
      characterName: myCharacter?.name ?? null,
      characterPortrait: null,
    });
    setChatInput("");
  }, [currentUserId, myCharacter, isGM, appendTurn]);

  const handleCommitDraft = useCallback((content: string, type: string) => {
    if (!content.trim() || !currentUserId) return;
    appendTurn({
      userId: currentUserId,
      characterId: myCharacter?.id ?? null,
      type: type as Turn["type"],
      content: content.trim(),
      metadata: null,
      user: myCharacter?.user ?? { id: currentUserId, displayName: isGM ? "Alex (GM)" : "You", avatarUrl: null },
      characterName: myCharacter?.name ?? null,
      characterPortrait: null,
    });
  }, [currentUserId, myCharacter, isGM, appendTurn]);

  const handleRollSubmit = useCallback(async (intent: { attribute: string; aspectInvoked: boolean }) => {
    if (!currentUserId || !pendingRollRequest) {
      throw new Error("No pending roll request");
    }

    // Demo is client-only — mirror the server's roll resolution so the
    // DiceRoller stays on the new intent-based contract.
    const matchedApproach = APPROACHES.find((a) => a.toLowerCase() === intent.attribute.toLowerCase());
    const stats = myCharacter ? parseStats(myCharacter.stats) : null;
    const approaches = stats?.approaches ?? { Bold: 0, Keen: 0, Subtle: 0 };
    const aspect = stats?.aspect ?? "";
    const approachMod = matchedApproach ? approaches[matchedApproach] ?? 0 : 0;
    const aspectMod = intent.aspectInvoked && aspect ? 1 : 0;
    const modifier = approachMod + aspectMod;
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    const total = r1 + r2 + modifier;
    const tier: "success" | "partial" | "failure" = total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
    const attribute = matchedApproach ?? intent.attribute;
    const tierLabel = tier === "success" ? "Full Success" : tier === "partial" ? "Partial Success" : "Failure";
    const rollContent = modifier !== 0
      ? `Rolled 2d6${modifier >= 0 ? "+" : ""}${modifier} (${attribute.toUpperCase()}) = ${total} — ${tierLabel}`
      : `Rolled 2d6 = ${total} — ${tierLabel}`;

    const outcomeText = tier === "failure"
      ? (pendingRollRequest.onFailure || "The attempt fails.")
      : tier === "success"
        ? (pendingRollRequest.onSuccess || "The attempt succeeds.")
        : pendingRollRequest.onSuccess && pendingRollRequest.onFailure
          ? `${pendingRollRequest.onSuccess} — but ${pendingRollRequest.onFailure.charAt(0).toLowerCase()}${pendingRollRequest.onFailure.slice(1)}`
          : "A partial success — but not without cost.";

    setTurns((prev) => {
      const rollTurnId = `roll-${Date.now()}`;
      const rollSort = Math.max(0, ...prev.map((t) => t.sortOrder)) + 1;
      return [
        ...prev,
        {
          id: rollTurnId,
          sessionId: SESSION_ID,
          userId: currentUserId,
          characterId: myCharacter?.id ?? null,
          type: "roll",
          content: rollContent,
          metadata: JSON.stringify({
            total,
            modifier,
            attribute,
            tier,
            die: "2d6",
            rollRequestTurnId: pendingRollRequest.turnId,
          }),
          sortOrder: rollSort,
          createdAt: new Date().toISOString(),
          user: myCharacter?.user ?? { id: currentUserId, displayName: "You", avatarUrl: null },
          characterName: myCharacter?.name ?? null,
          characterPortrait: null,
        },
        {
          id: `cons-${Date.now()}`,
          sessionId: SESSION_ID,
          userId: GM_USER_ID,
          characterId: null,
          type: "consequence",
          content: outcomeText,
          metadata: JSON.stringify({
            rollRequestTurnId: pendingRollRequest.turnId,
            rollTurnId,
            generated: true,
          }),
          sortOrder: rollSort + 1,
          createdAt: new Date().toISOString(),
          user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
          characterName: null,
          characterPortrait: null,
        },
      ];
    });

    setShowDiceRoller(false);
    return { dice: [r1, r2] as [number, number], modifier, total, tier };
  }, [currentUserId, myCharacter, pendingRollRequest]);

  const handleUpdateRollRequest = useCallback((turnId: string, status: "closed" | "cancelled") => {
    setTurns((prev) => prev.map((t) => {
      if (t.id !== turnId) return t;
      const meta = parseRollRequestMetadata(t.metadata);
      if (!meta) return t;
      return { ...t, metadata: JSON.stringify({ ...meta, status }) };
    }));
  }, []);

  const handleRequestRoll = useCallback(
    (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
      const targetChar = CHARACTERS.find((c) => c.userId === targetUserId);
      const targetName = targetUserId === "everyone" ? "the party" : targetChar?.name ?? "the party";
      const fatalTag = fatal ? " [FATAL]" : "";
      const content = `The GM calls for a ${attribute.toUpperCase()} check from ${targetName}${fatalTag} — ${reason}`;
      const requiredUserIds = targetUserId === "everyone" ? ACTIVE_PLAYER_USER_IDS : [targetUserId];
      appendTurn({
        userId: GM_USER_ID,
        characterId: null,
        type: "roll-request",
        content,
        metadata: JSON.stringify({
          targetUserId,
          attribute,
          reason,
          onSuccess,
          onFailure,
          fatal: !!fatal,
          status: "open",
          requiredUserIds,
        }),
        user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
        characterName: null,
        characterPortrait: null,
      });
    },
    [appendTurn],
  );

  const handleSubmitFloorResponse = useCallback(
    async (roundId: string, body: { characterId: string; type: string; content: string }) => {
      if (!currentUserId) return;
      const char = CHARACTERS.find((c) => c.id === body.characterId);
      setFloorRound((prev) => prev && prev.id === roundId ? {
        ...prev,
        submissions: [...prev.submissions, {
          id: `sub-${Date.now()}`,
          roundId,
          userId: currentUserId,
          characterId: body.characterId,
          type: body.type as Turn["type"],
          content: body.content,
          source: "player",
          sourceLabel: null,
          audienceSparkId: null,
          status: "submitted",
          createdAt: new Date().toISOString(),
          characterName: char?.name ?? null,
          user: char?.user ?? { id: currentUserId, displayName: "You", avatarUrl: null },
          voteCount: 0,
          audiencePulseCount: 0,
          isMine: true,
        }],
      } : prev);
    },
    [currentUserId],
  );

  const handleVoteFloorSubmission = useCallback(async (roundId: string, submissionId: string) => {
    setFloorRound((prev) => {
      if (!prev || prev.id !== roundId) return prev;
      const prior = prev.myVoteSubmissionId;
      if (prior === submissionId) return prev;
      return {
        ...prev,
        myVoteSubmissionId: submissionId,
        voteCount: prior ? prev.voteCount : prev.voteCount + 1,
        submissions: prev.submissions.map((s) => {
          if (s.id === prior) return { ...s, voteCount: Math.max(0, s.voteCount - 1) };
          if (s.id === submissionId) return { ...s, voteCount: s.voteCount + 1 };
          return s;
        }),
      };
    });
  }, []);

  const handleUpdateFloorRound = useCallback(
    async (roundId: string, body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string }) => {
      setFloorRound((prev) => {
        if (!prev || prev.id !== roundId) return prev;
        if (body.status === "resolved" && body.selectedSubmissionId) {
          const selected = prev.submissions.find((s) => s.id === body.selectedSubmissionId);
          if (selected) {
            appendTurn({
              userId: selected.userId ?? GM_USER_ID,
              characterId: selected.characterId,
              type: selected.type,
              content: selected.content,
              metadata: null,
              user: selected.user,
              characterName: selected.characterName,
              characterPortrait: null,
            });
          }
          return null;
        }
        if (body.status === "cancelled") return null;
        return { ...prev, status: body.status };
      });
    },
    [appendTurn],
  );

  const handleSpectatorPulse = useCallback(async (submissionId: string) => {
    setFloorRound((prev) => {
      if (!prev) return prev;
      const prior = prev.myAudiencePulseSubmissionId;
      if (prior === submissionId) return prev;
      return {
        ...prev,
        myAudiencePulseSubmissionId: submissionId,
        audiencePulseCount: prior ? prev.audiencePulseCount : prev.audiencePulseCount + 1,
        submissions: prev.submissions.map((s) => {
          if (s.id === prior) return { ...s, audiencePulseCount: Math.max(0, s.audiencePulseCount - 1) };
          if (s.id === submissionId) return { ...s, audiencePulseCount: s.audiencePulseCount + 1 };
          return s;
        }),
      };
    });
  }, []);

  const handlePassTurn = useCallback((userId: string) => {
    if (!isGM || floorRound) return;
    setActivePlayerId(userId === GM_USER_ID ? null : userId);
  }, [floorRound, isGM]);

  // ── New-shell demo wiring (Director row, clocks, reactions) ──

  const [demoClocks, setDemoClocks] = useState<ProgressClockData[]>([]);
  const [demoFloats, setDemoFloats] = useState<Array<{ id: string; type: string }>>([]);

  const handlePushEvent = useCallback((content: string) => {
    appendTurn({ ...GM_TURN_BASE, type: "narration", content, metadata: null });
  }, [appendTurn]);

  const handleSceneBreak = useCallback((title: string, mood: string, aspects?: string[]) => {
    appendTurn({
      ...GM_TURN_BASE,
      type: "scene-break",
      content: "",
      metadata: JSON.stringify({ title, mood, ...(aspects?.length ? { aspects } : {}) }),
    });
  }, [appendTurn]);

  const handleStoryMoment = useCallback(
    (text: string, mood: string, subtext?: string, options?: { importance?: "normal" | "major" }) => {
      appendTurn({
        ...GM_TURN_BASE,
        type: "story-moment",
        content: text,
        metadata: JSON.stringify({ mood, ...(subtext ? { subtext } : {}), importance: options?.importance ?? "normal" }),
      });
    },
    [appendTurn],
  );

  const handleAddIllustration = useCallback((imageUrl: string, caption?: string) => {
    appendTurn({
      ...GM_TURN_BASE,
      type: "illustration",
      content: caption ?? "",
      metadata: JSON.stringify({ imageUrl, caption: caption || undefined }),
    });
  }, [appendTurn]);

  const handleOfferBargain = useCallback(
    (body: { targetUserId: string; targetLabel: string; gain: string; price: string }) => {
      appendTurn({
        ...GM_TURN_BASE,
        type: "consequence",
        content: `The Director offers ${body.targetLabel} a bargain: ${body.gain} The price: ${body.price}`,
        metadata: JSON.stringify({ kind: "bargain", ...body, status: "open" }),
      });
    },
    [appendTurn],
  );

  const handleReopenFloor = useCallback(() => {
    setFloorRound((prev) => prev ?? { ...INITIAL_FLOOR_ROUND, id: `fr-${Date.now()}` });
  }, []);

  const handleDemoReaction = useCallback((key: string) => {
    setDemoFloats((prev) => [
      ...prev.slice(-19),
      { id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: key },
    ]);
  }, []);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="adventure-mode flex h-screen flex-col overflow-hidden bg-void text-paper">
      {/* Demo banner */}
      <div className="sticky top-0 z-[60] flex flex-col gap-2 border-b border-amber/20 bg-amber/10 px-3 py-2 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center justify-between gap-3 text-[11px]">
          <span className="shrink-0 uppercase tracking-widest text-amber font-bold">Demo · Adventure Mode</span>
          <span className="hidden truncate text-text-tertiary sm:inline">Fixture data, no API calls. Switch perspectives below.</span>
          <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-subtle/30 py-0.5 pl-2 pr-0.5 sm:hidden" title="Toggle light or dark mode">
            <span className="text-[9px] uppercase tracking-wider text-text-secondary">Theme</span>
            <div className="scale-[0.62]">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
          <span className="hidden shrink-0 uppercase tracking-wider text-text-tertiary sm:inline">View as:</span>
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
            {VIEW_AS_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setViewAs(option.key);
                  setMobilePanel(null);
                }}
                className={`min-h-8 shrink-0 rounded-full px-3 py-1.5 uppercase tracking-wider transition-colors cursor-pointer sm:min-h-9 sm:py-2 ${
                  viewAs === option.key
                    ? "border border-amber/40 bg-amber/20 text-amber"
                    : "border border-border bg-black/20 text-text-secondary hover:text-paper"
                }`}
              >
              {option.label}
            </button>
          ))}
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-border bg-subtle/30 py-0.5 pl-2 pr-0.5 sm:flex" title="Toggle light or dark mode">
            <span className="text-[9px] uppercase tracking-wider text-text-secondary">Theme</span>
            <div className="scale-[0.62]">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: Session Log */}
        <div className="hidden lg:flex">
          <SessionLog
            turns={logTurns}
            currentUserId={currentUserId}
            sessionTitle="The Obsidian Crown — Session I"
            storyTitle="Tales of the Shattered City"
            onSendChat={handleSendChat}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isGM={isGM}
            onUpdateRollRequest={handleUpdateRollRequest}
            readOnly={isSpectator}
          />
        </div>

        {/* Center: story stage over the action dock — the new play shell */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <StoryStage
              sessionId={SESSION_ID}
              storyId={STORY_ID}
              storyTurns={storyTurns}
              logTurns={logTurns}
              characters={CHARACTERS}
              activePlayerId={activePlayerId}
              currentUserId={currentUserId}
              isGM={isGM}
              myCharacter={myCharacter}
              sessionTitle="The Obsidian Crown — Session I"
              sessionStatus="active"
              sessionOpening={OPENING_NARRATION}
              showDiceRoller={showDiceRoller || !!pendingRollRequest}
              onCloseDiceRoller={() => setShowDiceRoller(false)}
              onRollSubmit={handleRollSubmit}
              pendingRollRequest={pendingRollRequest}
              reactionFloats={demoFloats}
              spectatorMode={isSpectator}
              floorRound={floorRound}
              onSubmitFloorResponse={handleSubmitFloorResponse}
              onVoteFloorSubmission={handleVoteFloorSubmission}
              onUpdateFloorRound={handleUpdateFloorRound}
            />

            {isSpectator && (
              <AudiencePulsePanel floorRound={floorRound} onPulse={handleSpectatorPulse} />
            )}
          </div>

          {!isSpectator && (
            <ActionDock
              sessionId={SESSION_ID}
              sessionStatus="active"
              activePlayerId={activePlayerId}
              currentUserId={currentUserId}
              isGM={isGM}
              myCharacter={myCharacter}
              characters={CHARACTERS}
              floorRound={floorRound}
              pendingRollRequest={pendingRollRequest}
              onCommitDraft={handleCommitDraft}
              onViewChat={() => setMobilePanel("log")}
              onReaction={handleDemoReaction}
              onLastWords={() => {}}
              onOpenDiceRoller={() => setShowDiceRoller(true)}
              onUpdateFloorRound={handleUpdateFloorRound}
              penHolderName={CHARACTERS.find((c) => c.userId === activePlayerId)?.name ?? null}
              onReclaimPen={() => setActivePlayerId(null)}
              directSlot={
                isGM ? (
                  <DirectRow
                    activeChars={CHARACTERS}
                    onRequestRoll={handleRequestRoll}
                    onPushEvent={handlePushEvent}
                    onSceneBreak={handleSceneBreak}
                    onStoryMoment={handleStoryMoment}
                    onAddIllustration={handleAddIllustration}
                    onOfferBargain={handleOfferBargain}
                    clocks={demoClocks}
                    onClocksChange={setDemoClocks}
                    onOpenFloor={handleReopenFloor}
                  />
                ) : undefined
              }
            />
          )}
        </div>

        {/* Right: the Table rail (desktop) */}
        {!isSpectator && (
          <div className="hidden w-[300px] shrink-0 lg:block xl:w-[332px]">
            <TableRail>
              <CastRail
                characters={CHARACTERS}
                ownerId={GM_USER_ID}
                activePlayerId={activePlayerId}
                currentUserId={currentUserId}
                isGM={isGM}
                sessionStatus="active"
                canPassSpotlight={isGM && !floorRound}
                onPassTurn={handlePassTurn}
                spotlightQueue={[]}
                seatTimer={null}
              />
              <ClocksSection clocks={demoClocks} isGM={isGM} onClocksChange={setDemoClocks} />
              {isGM ? (
                <PartyStatusPanel
                  characters={CHARACTERS}
                  activePlayerId={activePlayerId}
                  onChangeCharacterStatus={() => {}}
                  currentUserId={currentUserId}
                />
              ) : (
                <CharacterSheetPanel myCharacter={myCharacter} />
              )}
            </TableRail>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-void/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel((panel) => panel === "log" ? null : "log")}
          className={`min-h-10 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${
            mobilePanel === "log" ? "bg-amber/20 text-amber" : "text-text-secondary hover:text-paper"
          }`}
        >
          Log
        </button>
        {!isSpectator && (
          <button
            type="button"
            onClick={() => setMobilePanel((panel) => panel === "context" ? null : "context")}
            className={`min-h-10 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              mobilePanel === "context" ? "bg-amber/20 text-amber" : "text-text-secondary hover:text-paper"
            }`}
          >
            {isGM ? "GM" : "Sheet"}
          </button>
        )}
      </div>

      {mobilePanel && (
        <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close panel"
            onClick={() => setMobilePanel(null)}
          />
          <div className="absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-2xl border border-border bg-void shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
            <button
              type="button"
              onClick={() => setMobilePanel(null)}
              className="absolute right-3 top-3 z-10 h-10 w-10 rounded-full border border-border bg-subtle/40 text-text-secondary transition-colors hover:text-paper"
              aria-label="Close panel"
              title="Close panel"
            >
              <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {mobilePanel === "log" ? (
              <SessionLog
                turns={logTurns}
                currentUserId={currentUserId}
                sessionTitle="The Obsidian Crown — Session I"
                storyTitle="Tales of the Shattered City"
                onSendChat={handleSendChat}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isGM={isGM}
                onUpdateRollRequest={handleUpdateRollRequest}
                readOnly={isSpectator}
                fullWidth
              />
            ) : (
              <div className="h-full space-y-6 overflow-y-auto bg-void px-4 py-5 pt-14 [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin]">
                <CastRail
                  characters={CHARACTERS}
                  ownerId={GM_USER_ID}
                  activePlayerId={activePlayerId}
                  currentUserId={currentUserId}
                  isGM={isGM}
                  sessionStatus="active"
                  canPassSpotlight={isGM && !floorRound}
                  onPassTurn={handlePassTurn}
                  spotlightQueue={[]}
                  seatTimer={null}
                />
                <ClocksSection clocks={demoClocks} isGM={isGM} onClocksChange={setDemoClocks} />
                {isGM ? (
                  <PartyStatusPanel
                    characters={CHARACTERS}
                    activePlayerId={activePlayerId}
                    onChangeCharacterStatus={() => {}}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <CharacterSheetPanel myCharacter={myCharacter} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
