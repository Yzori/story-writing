"use client";

import { useCallback, useMemo, useState } from "react";
import SessionLog from "@/components/campaign/SessionLog";
import StoryCanvas from "@/components/campaign/StoryCanvas";
import type { MapPin } from "@/components/campaign/StoryCanvas";
import ContextPanel from "@/components/campaign/ContextPanel";
import AudiencePulsePanel from "@/components/campaign/spectator/AudiencePulsePanel";
import ThemeToggle from "@/components/editor/ThemeToggle";
import { parseRollRequestMetadata } from "@/lib/campaign-turns";
import type {
  FloorRound,
  FloorRoundMode,
  PlayerCharacter,
  RollRequest,
  Turn,
} from "@/types/campaign";

// ── Fixture data ────────────────────────────────────────────

const GM_USER_ID = "demo-gm";
const STORY_ID = "demo-story";
const SESSION_ID = "demo-session";

const CHARACTERS: PlayerCharacter[] = [
  {
    id: "char-lyra",
    userId: "user-lyra",
    name: "Lyra Varen",
    portrait: null,
    description: "A forgekeeper seeking the Obsidian Crown.",
    traits: "Believes every problem has a chemical solution.",
    stats: JSON.stringify({
      approaches: { Bold: -1, Keen: 2, Subtle: 0 },
      aspect: "Trusts chemicals more than people",
    }),
    status: "active",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
  },
  {
    id: "char-kaelen",
    userId: "user-kaelen",
    name: "Kaelen Vex",
    portrait: null,
    description: "A bladesinger haunted by a debt he can never repay.",
    traits: "A blade for every shadow.",
    stats: JSON.stringify({
      approaches: { Bold: 2, Keen: -1, Subtle: 0 },
      aspect: "Wears his oaths heavier than his sword",
    }),
    status: "active",
    user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
  },
  {
    id: "char-elara",
    userId: "user-elara",
    name: "Elara Moss",
    portrait: null,
    description: "A healer who hears the whispers of the dead.",
    traits: "Hears the dead whether she wants to or not.",
    stats: JSON.stringify({
      approaches: { Bold: -1, Keen: 1, Subtle: 1 },
      aspect: "Walks with one foot in the world after",
    }),
    status: "active",
    user: { id: "user-elara", displayName: "Elena", avatarUrl: null },
  },
];

const ACTIVE_PLAYER_USER_IDS = CHARACTERS.map((c) => c.userId);

const OPENING_NARRATION =
  "The Obsidian Crown had been lost for three hundred years, buried with its last king beneath the Shattered City. Tonight, prophecy says, it stirs.";

const INITIAL_TURNS: Turn[] = [
  {
    id: "t-1",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "narration",
    content:
      "Moonlight filters through cracked arches across the throne room floor. At the far end, a stone altar pulses with a faint, sickly light. Carved runes wind across its base, dim but waiting.",
    metadata: null,
    sortOrder: 0,
    createdAt: "2026-05-15T20:00:00Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
  {
    id: "t-2",
    sessionId: SESSION_ID,
    userId: "user-lyra",
    characterId: "char-lyra",
    type: "action",
    content:
      "approaches the altar slowly, fingertips brushing the runes as if testing the temperature of a flame.",
    metadata: null,
    sortOrder: 1,
    createdAt: "2026-05-15T20:01:00Z",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
    characterName: "Lyra",
    characterPortrait: null,
  },
  {
    id: "t-3",
    sessionId: SESSION_ID,
    userId: "user-kaelen",
    characterId: "char-kaelen",
    type: "dialogue",
    content: "Is that blood on the blade?",
    metadata: null,
    sortOrder: 2,
    createdAt: "2026-05-15T20:01:30Z",
    user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
    characterName: "Kaelen",
    characterPortrait: null,
  },
  {
    id: "t-4",
    sessionId: SESSION_ID,
    userId: GM_USER_ID,
    characterId: null,
    type: "roll-request",
    content:
      "The GM calls for a KEEN check from Lyra — Decipher the rune sequence before the altar finishes waking.",
    metadata: JSON.stringify({
      targetUserId: "user-lyra",
      attribute: "Keen",
      reason: "Decipher the rune sequence before the altar finishes waking.",
      onSuccess: "You read the binding clear and find a way to bend the awakening to your will.",
      onFailure: "The runes burn your skin. The altar wakes on its own terms.",
      fatal: false,
      status: "open",
      requiredUserIds: ["user-lyra"],
    }),
    sortOrder: 3,
    createdAt: "2026-05-15T20:02:00Z",
    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
    characterName: null,
    characterPortrait: null,
  },
];

const INITIAL_FLOOR_ROUND: FloorRound = {
  id: "fr-1",
  sessionId: SESSION_ID,
  openedBy: GM_USER_ID,
  prompt: "The altar splits open. What does the party do?",
  mode: "vote",
  status: "voting",
  audiencePulseEnabled: true,
  selectedSubmissionId: null,
  createdAt: "2026-05-15T20:03:00Z",
  updatedAt: "2026-05-15T20:03:00Z",
  submissions: [
    {
      id: "sub-1",
      roundId: "fr-1",
      userId: "user-kaelen",
      characterId: "char-kaelen",
      type: "action",
      content:
        "draws his blade and steps between Lyra and the altar, ready for whatever crawls out of the dark.",
      status: "submitted",
      createdAt: "2026-05-15T20:03:30Z",
      characterName: "Kaelen",
      user: { id: "user-kaelen", displayName: "James", avatarUrl: null },
      voteCount: 1,
      audiencePulseCount: 12,
      isMine: false,
    },
    {
      id: "sub-2",
      roundId: "fr-1",
      userId: "user-elara",
      characterId: "char-elara",
      type: "description",
      content:
        "The dead in the walls start whispering at once. Elara raises a hand — not to fight, but to listen.",
      status: "submitted",
      createdAt: "2026-05-15T20:03:45Z",
      characterName: "Elara",
      user: { id: "user-elara", displayName: "Elena", avatarUrl: null },
      voteCount: 0,
      audiencePulseCount: 18,
      isMine: false,
    },
  ],
  myVoteSubmissionId: null,
  voteCount: 1,
  eligibleVoterCount: 3,
  allEligibleVotersVoted: false,
  isVoteEligible: true,
  audiencePulseCount: 30,
  myAudiencePulseSubmissionId: null,
};

const INITIAL_MAP_PINS: MapPin[] = [
  {
    id: "map-gate",
    x: 31,
    y: 62,
    label: "Shattered Gate",
    mood: "melancholy",
    description: "Where the party entered beneath broken moonlit arches.",
  },
  {
    id: "map-throne",
    x: 52,
    y: 48,
    label: "Old Throne Room",
    mood: "ominous",
    description: "Cracked pillars, dead banners, and the first pulse of the Crown.",
  },
  {
    id: "map-altar",
    x: 64,
    y: 42,
    label: "Waking Altar",
    mood: "tense",
    description: "Current scene. The runes are heating under Lyra's hand.",
  },
  {
    id: "map-tunnel",
    x: 74,
    y: 58,
    label: "Collapsed Escape Tunnel",
    mood: "mysterious",
    description: "Half-buried stairs descend toward moving air.",
  },
];

type ViewAs = "gm" | "lyra" | "kaelen" | "elara" | "spectator";

const VIEW_AS_OPTIONS: { key: ViewAs; label: string }[] = [
  { key: "gm", label: "GM" },
  { key: "lyra", label: "Lyra" },
  { key: "kaelen", label: "Kaelen" },
  { key: "elara", label: "Elara" },
  { key: "spectator", label: "Audience" },
];

function viewAsToUserId(view: ViewAs): string | null {
  switch (view) {
    case "gm": return GM_USER_ID;
    case "lyra": return "user-lyra";
    case "kaelen": return "user-kaelen";
    case "elara": return "user-elara";
    default: return null;
  }
}

// ── Component ───────────────────────────────────────────────

export default function DemoAdventurePage() {
  const [viewAs, setViewAs] = useState<ViewAs>("gm");
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [floorRound, setFloorRound] = useState<FloorRound | null>(INITIAL_FLOOR_ROUND);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [mapPins, setMapPins] = useState<MapPin[]>(INITIAL_MAP_PINS);
  const [currentMapPinId, setCurrentMapPinId] = useState("map-altar");
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

  const handleRollComplete = useCallback((total: number, modifier: number, attribute: string) => {
    if (!currentUserId || !pendingRollRequest) return;
    const tier: "success" | "partial" | "failure" = total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
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

  const handleCreateFloorRound = useCallback(
    async (prompt: string, mode: FloorRoundMode, audiencePulseEnabled?: boolean) => {
      setFloorRound({
        id: `fr-${Date.now()}`,
        sessionId: SESSION_ID,
        openedBy: GM_USER_ID,
        prompt,
        mode,
        status: "open",
        audiencePulseEnabled: !!(mode === "vote" && audiencePulseEnabled),
        selectedSubmissionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submissions: [],
        myVoteSubmissionId: null,
        voteCount: 0,
        eligibleVoterCount: ACTIVE_PLAYER_USER_IDS.length,
        allEligibleVotersVoted: false,
        isVoteEligible: true,
        audiencePulseCount: 0,
        myAudiencePulseSubmissionId: null,
      });
    },
    [],
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
              userId: selected.userId,
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
    setActivePlayerId(userId);
  }, [floorRound, isGM]);

  const handleAddMapPin = useCallback((pin: Omit<MapPin, "id">) => {
    setMapPins((prev) => [...prev, { ...pin, id: `map-${Date.now()}` }]);
  }, []);

  const handleRemoveMapPin = useCallback((pinId: string) => {
    setMapPins((prev) => prev.filter((pin) => pin.id !== pinId));
    setCurrentMapPinId((prev) => prev === pinId ? "map-altar" : prev);
  }, []);

  const handleSetCurrentMapPin = useCallback((pinId: string) => {
    if (!isGM) return;
    const pin = mapPins.find((item) => item.id === pinId);
    if (!pin) return;
    setCurrentMapPinId(pinId);
    appendTurn({
      userId: GM_USER_ID,
      characterId: null,
      type: "narration",
      content: `The map is turned toward ${pin.label}. ${pin.description ?? "The party's attention shifts there."}`,
      metadata: null,
      user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
      characterName: null,
      characterPortrait: null,
    });
  }, [appendTurn, isGM, mapPins]);

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

        {/* Center: Story Canvas */}
        <div className="flex-1 min-w-0 relative">
          <StoryCanvas
            sessionId={SESSION_ID}
            storyId={STORY_ID}
            storyTurns={storyTurns}
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
            onCommitDraft={handleCommitDraft}
            onPassTurn={handlePassTurn}
            onEndSession={() => {}}
            onTurnExpired={() => {}}
            onRollComplete={handleRollComplete}
            pendingRollRequest={pendingRollRequest}
            myCharacterStatus={myCharacter?.status ?? null}
            onLastWords={() => {}}
            spectatorMode={isSpectator}
            mapPins={mapPins}
            currentMapPinId={currentMapPinId}
            onAddMapPin={handleAddMapPin}
            onRemoveMapPin={handleRemoveMapPin}
            onSetCurrentMapPin={handleSetCurrentMapPin}
            floorRound={floorRound}
            onCreateFloorRound={handleCreateFloorRound}
            onSubmitFloorResponse={handleSubmitFloorResponse}
            onVoteFloorSubmission={handleVoteFloorSubmission}
            onUpdateFloorRound={handleUpdateFloorRound}
          />

          {isSpectator && (
            <AudiencePulsePanel floorRound={floorRound} onPulse={handleSpectatorPulse} />
          )}
        </div>

        {/* Right: Context Panel (GM tools or character sheet) */}
        {!isSpectator && (
          <ContextPanel
            isGM={isGM}
            myCharacter={myCharacter}
            characters={CHARACTERS}
            activePlayerId={activePlayerId}
            onRequestRoll={handleRequestRoll}
            onPushEvent={(content) => {
              appendTurn({
                userId: GM_USER_ID,
                characterId: null,
                type: "narration",
                content,
                metadata: null,
                user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
                characterName: null,
                characterPortrait: null,
              });
            }}
            onChangeCharacterStatus={() => {}}
            clocks={[]}
            onClocksChange={() => {}}
          />
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
              <ContextPanel
                isGM={isGM}
                myCharacter={myCharacter}
                characters={CHARACTERS}
                activePlayerId={activePlayerId}
                onRequestRoll={handleRequestRoll}
                onPushEvent={(content) => {
                  appendTurn({
                    userId: GM_USER_ID,
                    characterId: null,
                    type: "narration",
                    content,
                    metadata: null,
                    user: { id: GM_USER_ID, displayName: "Alex (GM)", avatarUrl: null },
                    characterName: null,
                    characterPortrait: null,
                  });
                }}
                onChangeCharacterStatus={() => {}}
                clocks={[]}
                onClocksChange={() => {}}
                forceVisible
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
