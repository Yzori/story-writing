"use client";

import { useMemo, useState } from "react";
import ThemeToggle from "@/components/editor/ThemeToggle";

type Role = "gm" | "lyra" | "kaelen" | "elara" | "audience";
type Drawer = "activity" | "tools" | "map" | null;
type ComposerMode = "write" | "roll" | "scene" | "react";

interface Character {
  id: string;
  userId: string;
  name: string;
  player: string;
  role: Role;
  initials: string;
  status: "active" | "wounded" | "marked";
  aspect: string;
  focus: string;
  drive: string;
  fear: string;
  pressure: string;
  bond: string;
  consequence: string;
  relic: string;
  traits: Array<{
    name: string;
    kind: "edge" | "flaw" | "bond";
    trigger: string;
    effect: string;
  }>;
  stats: Array<{ label: string; value: number }>;
}

interface StoryBeat {
  id: string;
  speaker: string;
  type: "narration" | "action" | "dialogue" | "roll" | "scene";
  body: string;
  tone?: string;
}

interface ActivityItem {
  id: string;
  label: string;
  body: string;
  meta: string;
  kind: "chat" | "roll" | "system";
}

const CHARACTERS: Character[] = [
  {
    id: "lyra",
    userId: "user-lyra",
    name: "Lyra Varen",
    player: "Sarah",
    role: "lyra",
    initials: "LV",
    status: "marked",
    aspect: "Trusts chemicals more than people",
    focus: "Reading the altar before it reads her",
    drive: "Prove the Crown can be controlled.",
    fear: "Needing another person more than she needs the answer.",
    pressure: "The altar recognizes her blood.",
    bond: "Kaelen once lied to keep her alive.",
    consequence: "Owes the dead king one truthful answer.",
    relic: "Black iron key, burn salve, cracked expedition compass",
    traits: [
      {
        name: "Alchemical Certainty",
        kind: "edge",
        trigger: "When you solve danger through experiment or analysis",
        effect: "Ask one exact question. On a cost, the answer harms someone nearby.",
      },
      {
        name: "Burned Trust",
        kind: "flaw",
        trigger: "When someone offers help before you ask for it",
        effect: "Refuse and gain +1, or accept and mark a bond.",
      },
      {
        name: "Oath Beneath Ash",
        kind: "bond",
        trigger: "When Kaelen puts himself between you and harm",
        effect: "Name what you owe him, then clear one pressure.",
      },
    ],
    stats: [
      { label: "Bold", value: -1 },
      { label: "Keen", value: 2 },
      { label: "Subtle", value: 0 },
    ],
  },
  {
    id: "kaelen",
    userId: "user-kaelen",
    name: "Kaelen Vex",
    player: "James",
    role: "kaelen",
    initials: "KV",
    status: "active",
    aspect: "Wears his oaths heavier than his sword",
    focus: "Keeping the altar away from Lyra",
    drive: "Pay a debt no one living remembers.",
    fear: "That loyalty is just cowardice with better manners.",
    pressure: "His blade is warm with someone else's blood.",
    bond: "Lyra knows the name he will not say.",
    consequence: "Wanted by the Ashen Court.",
    relic: "Saint's blade, river-stone charm, sealed confession",
    traits: [
      {
        name: "A Blade for Every Shadow",
        kind: "edge",
        trigger: "When you protect someone before protecting yourself",
        effect: "Take the danger onto yourself and define the opening you create.",
      },
      {
        name: "Debt-Heavy Heart",
        kind: "flaw",
        trigger: "When an oath conflicts with the obvious survival choice",
        effect: "The GM may offer a hard bargain with teeth.",
      },
      {
        name: "Last Honest Witness",
        kind: "bond",
        trigger: "When Lyra calls you by your full name",
        effect: "Answer one question honestly, then gain +1 forward.",
      },
    ],
    stats: [
      { label: "Bold", value: 2 },
      { label: "Keen", value: -1 },
      { label: "Subtle", value: 0 },
    ],
  },
  {
    id: "elara",
    userId: "user-elara",
    name: "Elara Moss",
    player: "Elena",
    role: "elara",
    initials: "EM",
    status: "wounded",
    aspect: "Walks with one foot in the world after",
    focus: "Choosing which dead voice to trust",
    drive: "Learn why the dead know her childhood name.",
    fear: "That every mercy is only another haunting.",
    pressure: "Three ghosts are speaking at once.",
    bond: "Kaelen's dead brother follows her dreams.",
    consequence: "Carries a Crown-shard under the skin.",
    relic: "Bone needle, mourning veil, salt-black candle",
    traits: [
      {
        name: "Hears the Unburied",
        kind: "edge",
        trigger: "When a place remembers violence",
        effect: "Ask the dead what happened here. One answer is useful, one is hungry.",
      },
      {
        name: "Mercy Is a Door",
        kind: "flaw",
        trigger: "When someone helpless asks you to stop",
        effect: "Pause or mark Haunted. Either way, the scene changes around you.",
      },
      {
        name: "Names in the Dark",
        kind: "bond",
        trigger: "When another character admits fear aloud",
        effect: "Take their fear into the prose and give them a clear next action.",
      },
    ],
    stats: [
      { label: "Bold", value: -1 },
      { label: "Keen", value: 1 },
      { label: "Subtle", value: 1 },
    ],
  },
];

const STORY_BEATS: StoryBeat[] = [
  {
    id: "scene-1",
    speaker: "Scene Cut",
    type: "scene",
    tone: "Dread",
    body: "The Old Throne Room · hot runes · fractured moonlight · the altar knows Lyra's blood",
  },
  {
    id: "beat-1",
    speaker: "GM",
    type: "narration",
    body: "Moonlight filters through cracked arches across the throne room floor. At the far end, a stone altar pulses with a faint, sickly light. Carved runes wind across its base, dim but waiting.",
  },
  {
    id: "beat-2",
    speaker: "Lyra",
    type: "action",
    body: "approaches the altar slowly, fingertips brushing the runes as if testing the temperature of a flame.",
  },
  {
    id: "beat-3",
    speaker: "Kaelen",
    type: "dialogue",
    body: "Is that blood on the blade?",
  },
  {
    id: "beat-4",
    speaker: "Canon Tension",
    type: "roll",
    tone: "Keen check pending",
    body: "Lyra rolls to read the runes before the altar wakes. On success, she names the truth. On a cost, the Director names what the altar takes.",
  },
  {
    id: "beat-5",
    speaker: "Elara",
    type: "action",
    body: "The dead in the walls start whispering at once. Elara raises a hand, not to fight, but to listen.",
  },
];

const ACTIVITY: ActivityItem[] = [
  {
    id: "a-1",
    label: "Check pending",
    body: "Lyra may name the rune truth. The Director holds the cost.",
    meta: "Open",
    kind: "roll",
  },
  {
    id: "a-2",
    label: "Table whisper",
    body: "James: I can cover Lyra if this gets expensive.",
    meta: "Now",
    kind: "chat",
  },
  {
    id: "a-3",
    label: "Audience appetite",
    body: "30 readers are pulsing for dread over violence.",
    meta: "Rising",
    kind: "system",
  },
  {
    id: "a-4",
    label: "Pressure rises",
    body: "The Crown Wakes moved to 3 of 6 beats.",
    meta: "2 min",
    kind: "system",
  },
];

const MAP_PINS = [
  { id: "gate", label: "Shattered Gate", x: "28%", y: "62%", note: "Entry point" },
  { id: "throne", label: "Old Throne Room", x: "50%", y: "47%", note: "Current scene" },
  { id: "altar", label: "Waking Altar", x: "63%", y: "42%", note: "Rune heat rising" },
  { id: "tunnel", label: "Collapsed Tunnel", x: "75%", y: "58%", note: "Moving air below" },
];

const ROLE_OPTIONS: Array<{ role: Role; label: string }> = [
  { role: "gm", label: "Director" },
  { role: "lyra", label: "Lyra" },
  { role: "kaelen", label: "Kaelen" },
  { role: "elara", label: "Elara" },
  { role: "audience", label: "Audience" },
];

const TURN_ORDER: Array<{ id: Role | "gm-beat"; label: string; sublabel: string; state: "done" | "active" | "next" | "idle" }> = [
  { id: "gm-beat", label: "Director", sublabel: "sets cost", state: "done" },
  { id: "lyra", label: "Lyra", sublabel: "claims truth", state: "active" },
  { id: "kaelen", label: "Kaelen", sublabel: "protects", state: "next" },
  { id: "elara", label: "Elara", sublabel: "listens", state: "idle" },
];

const SCENE_ASPECTS = ["hot runes", "fractured moonlight", "the dead are unreliable"];

const GM_MOVES = ["Call Check", "Raise Pressure", "Cut Scene", "Offer Bargain"];

function getDefaultComposerMode(nextRole: Role): ComposerMode {
  if (nextRole === "gm") return "write";
  if (nextRole === "lyra") return "roll";
  if (nextRole === "audience") return "react";
  return "react";
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
        active
          ? "border-amber/40 bg-amber/15 text-amber"
          : "border-border bg-void/80 text-text-secondary hover:border-border-active hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: Character["status"] }) {
  const className =
    status === "active"
      ? "bg-sage"
      : status === "wounded"
        ? "bg-rose"
        : "bg-amber";

  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

export default function DemoAdventureStagePage() {
  const [role, setRole] = useState<Role>("gm");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>("write");
  const [draft, setDraft] = useState("");
  const [selectedPin, setSelectedPin] = useState("altar");

  const isGM = role === "gm";
  const isAudience = role === "audience";
  const activeCharacter = useMemo(
    () => CHARACTERS.find((character) => character.role === role) ?? CHARACTERS[0],
    [role],
  );

  const composerTitle = isGM
    ? "Director Move"
    : isAudience
      ? "Audience Appetite"
      : `${activeCharacter.name}'s Spotlight`;

  const composerPlaceholder = isGM
    ? "Cut the scene, raise the cost, or reveal what the altar wants..."
    : isAudience
      ? "Pulse for dread, mercy, wonder, betrayal..."
      : `${activeCharacter.name} reaches for the fiction by...`;

  const currentPin = MAP_PINS.find((pin) => pin.id === selectedPin) ?? MAP_PINS[2];
  const recommendedMode = getDefaultComposerMode(role);
  const composerHint = isGM
    ? "Direct the next beat. The goal is pressure, not permission."
    : role === "lyra"
      ? "Lyra has a Keen check ready. Success writes truth; cost writes consequence."
      : isAudience
        ? "The audience shapes tone, not plot."
        : `${activeCharacter.name} is outside the spotlight. React, bond, or offer a line.`;

  function selectRole(nextRole: Role) {
    setRole(nextRole);
    setDrawer(null);
    setComposerMode(getDefaultComposerMode(nextRole));
  }

  return (
    <div className="adventure-mode mt-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-void text-paper">
      <header className="z-40 border-b border-border bg-void/90 backdrop-blur-xl">
        <div className="flex min-h-16 items-center gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber sm:flex">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2 3 7l9 5 9-5-9-5Z" />
                <path d="m3 12 9 5 9-5" />
                <path d="m3 17 9 5 9-5" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-display text-[17px] text-paper sm:text-[22px]">The Obsidian Crown</h1>
                <span className="hidden rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-amber sm:inline-flex">
                  Live
                </span>
              </div>
              <p className="truncate text-[11px] text-text-tertiary">Session I · Lyra holds the pen · The Crown Wakes 3/6</p>
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-border bg-subtle/20 p-1 md:flex">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => selectRole(option.role)}
                className={`min-h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  role === option.role
                    ? "bg-amber/15 text-amber"
                    : "text-text-secondary hover:text-paper"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawer(drawer === "map" ? null : "map")}
              className="hidden min-h-10 items-center gap-2 rounded-full border border-border bg-subtle/20 px-3 text-left transition-colors hover:border-amber/30 sm:flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-amber">
                <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
              </svg>
              <span className="hidden max-w-[150px] truncate text-[11px] text-text-secondary lg:inline">{currentPin.label}</span>
            </button>
            <div className="hidden rounded-full border border-border bg-subtle/20 px-2 py-1 sm:block">
              <div className="scale-[0.68]">
                <ThemeToggle />
              </div>
            </div>
            <IconButton label="Activity" active={drawer === "activity"} onClick={() => setDrawer(drawer === "activity" ? null : "activity")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
              </svg>
            </IconButton>
            <IconButton label="Map" active={drawer === "map"} onClick={() => setDrawer(drawer === "map" ? null : "map")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
                <path d="M9 3v15" />
                <path d="M15 6v15" />
              </svg>
            </IconButton>
            <IconButton label={isGM ? "Director Tools" : "Character Engine"} active={drawer === "tools"} onClick={() => setDrawer(drawer === "tools" ? null : "tools")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3v18" />
                <path d="M3 8h18" />
                <path d="M3 16h18" />
              </svg>
            </IconButton>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-t border-border-subtle px-3 py-2 [scrollbar-width:none] md:hidden">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.role}
              type="button"
              onClick={() => selectRole(option.role)}
              className={`min-h-8 shrink-0 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                role === option.role
                  ? "border-amber/40 bg-amber/15 text-amber"
                  : "border-border bg-subtle/20 text-text-secondary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="adventure-cinematic-glow absolute left-1/2 top-0 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-amber/[0.025] blur-[110px] mix-blend-screen" />
          <div className="adventure-mood-tint absolute inset-0 bg-rose/[0.025]" />
          <div className="adventure-cinematic-shadow absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.72)]" />
        </div>

        <section className="relative z-10 flex h-full flex-col">
          <div className="shrink-0 border-b border-border-subtle bg-void/55 px-3 py-3 backdrop-blur-md sm:px-6">
            <div className="mx-auto flex max-w-5xl items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                {TURN_ORDER.map((turn, index) => {
                  const character = CHARACTERS.find((item) => item.role === turn.id);
                  const isSelected = role === turn.id;
                  const isActiveTurn = turn.state === "active";
                  return (
                    <div key={turn.id} className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (character) selectRole(character.role);
                          if (turn.id === "gm-beat") selectRole("gm");
                        }}
                        className={`flex min-w-[128px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          isActiveTurn
                            ? "border-amber/40 bg-amber/[0.08] shadow-[0_0_24px_rgba(212,168,67,0.08)]"
                            : isSelected
                              ? "border-border-active bg-subtle/30"
                              : "border-border bg-black/15 hover:border-border-active"
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                          isActiveTurn
                            ? "border-amber/35 bg-amber/15 text-amber"
                            : "border-border bg-elevated text-text-secondary"
                        }`}>
                          {character?.initials ?? "GM"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {character ? <StatusDot status={character.status} /> : <span className="h-2 w-2 rounded-full bg-lavender" />}
                            <span className="truncate text-[12px] font-medium text-paper">{turn.label}</span>
                          </div>
                          <p className="truncate text-[10px] text-text-tertiary">{turn.sublabel}</p>
                        </div>
                      </button>
                      {index < TURN_ORDER.length - 1 && <span className="h-px w-5 bg-border-subtle" />}
                    </div>
                  );
                })}
              </div>

              <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-amber/20 bg-amber/[0.04] px-3 py-2 sm:flex">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-amber">
                  <path d="M12 8v5l3 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-amber">Timer</p>
                  <p className="font-mono text-[12px] text-paper">04:18</p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-52 pt-8 sm:px-8 sm:pb-56 sm:pt-12 [scrollbar-width:thin] [scrollbar-color:rgba(212,168,67,0.22)_transparent]">
            <article className="mx-auto max-w-[760px]">
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber">Current Chapter</p>
                <h2 className="mt-2 font-display text-[32px] leading-tight text-paper sm:text-[46px]">The Waking Altar</h2>
                <div className="mt-5 h-px w-24 bg-gradient-to-r from-amber/50 to-transparent" />
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawer("map")}
                    className="rounded-full border border-amber/25 bg-amber/[0.05] px-3 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/10"
                  >
                    {currentPin.label}
                  </button>
                  {SCENE_ASPECTS.map((aspect) => (
                    <span
                      key={aspect}
                      className="rounded-full border border-border bg-subtle/20 px-3 py-1.5 text-[11px] text-text-tertiary"
                    >
                      {aspect}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-6 font-reading text-[18px] leading-[1.9] text-text sm:text-[20px] sm:leading-[2.05]">
                {STORY_BEATS.map((beat) => (
                  <div key={beat.id}>
                    {beat.type === "scene" ? (
                      <div className="my-8 border-y border-amber/20 py-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-amber">{beat.tone}</p>
                        <p className="mt-2 font-body text-[12px] leading-relaxed text-text-tertiary">{beat.body}</p>
                      </div>
                    ) : beat.type === "roll" ? (
                      <div className="my-7 rounded-lg border border-lavender/25 bg-lavender/[0.05] p-4 font-body">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-lavender">{beat.tone}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setComposerMode("roll");
                              setDrawer(null);
                            }}
                            className="rounded-full border border-lavender/25 bg-lavender/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-lavender transition-colors hover:bg-lavender/15"
                          >
                            Open Roll
                          </button>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{beat.body}</p>
                      </div>
                    ) : (
                      <p>
                        <span className="mr-2 font-body text-[11px] uppercase tracking-[0.16em] text-amber/70">{beat.speaker}</span>
                        <span className={beat.type === "dialogue" ? "text-paper" : ""}>{beat.body}</span>
                      </p>
                    )}
                  </div>
                ))}
                <p>
                  <span className="inline-block h-5 w-1.5 animate-pulse bg-amber/45 align-middle" />
                </p>
              </div>
            </article>
          </div>

          {!drawer && (
            <div className="pointer-events-none absolute right-4 top-24 z-20 hidden w-[260px] space-y-2 xl:block">
              {ACTIVITY.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDrawer("activity")}
                  className="pointer-events-auto w-full rounded-lg border border-border bg-void/70 px-3 py-2 text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors hover:border-amber/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber">{item.label}</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-text-ghost">{item.meta}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{item.body}</p>
                </button>
              ))}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-void/92 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-amber">{composerTitle}</p>
                  <p className="truncate text-[12px] text-text-tertiary">
                    {composerHint}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-subtle/20 p-1 sm:flex">
                  {(["write", "roll", "scene", "react"] as ComposerMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setComposerMode(mode)}
                      className={`min-h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                        composerMode === mode
                          ? "bg-amber/15 text-amber"
                          : "text-text-secondary hover:text-paper"
                      }`}
                    >
                      {mode}
                      {mode === recommendedMode && (
                        <span className="ml-1 text-amber/60">*</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {isGM && (
                <div className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
                  {GM_MOVES.map((move) => (
                    <button
                      key={move}
                      type="button"
                      onClick={() => setComposerMode(move === "Cut Scene" ? "scene" : move === "Call Check" ? "roll" : "write")}
                      className="min-h-9 shrink-0 rounded-full border border-border bg-subtle/20 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                    >
                      {move}
                    </button>
                  ))}
                </div>
              )}

              {composerMode === "roll" ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="grid grid-cols-3 gap-2">
                    {["Bold", "Keen", "Subtle"].map((stat) => (
                      <button
                        key={stat}
                        type="button"
                        className={`rounded-lg border px-3 py-3 text-left transition-colors hover:border-amber/30 ${
                          stat === "Keen"
                            ? "border-amber/35 bg-amber/[0.05]"
                            : "border-border bg-elevated"
                        }`}
                      >
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{stat}</span>
                        <span className="mt-1 block font-mono text-[18px] text-paper">
                          {activeCharacter.stats.find((item) => item.label === stat)?.value ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-amber/35 bg-amber/15 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber/20"
                  >
                    {role === "lyra" ? "Roll Keen" : "Call Check"}
                  </button>
                </div>
              ) : composerMode === "react" ? (
                <div className="grid grid-cols-4 gap-2">
                  {["Dread", "Mercy", "Wonder", "Betrayal"].map((reaction) => (
                    <button
                      key={reaction}
                      type="button"
                      className="rounded-lg border border-border bg-elevated px-3 py-3 text-[11px] font-bold uppercase tracking-[0.13em] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={composerMode === "scene" ? "Shift the scene..." : composerPlaceholder}
                    className="min-h-[82px] resize-none rounded-lg border border-border bg-elevated px-4 py-3 font-reading text-[16px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-amber/35"
                  />
                  <div className="flex gap-2 sm:w-36 sm:flex-col">
                    <button
                      type="button"
                      className="min-h-10 flex-1 rounded-lg border border-amber/35 bg-amber/15 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber/20"
                    >
                      Add to Canon
                    </button>
                    <button
                      type="button"
                      className="min-h-10 flex-1 rounded-lg border border-border bg-subtle/20 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:text-paper"
                    >
                      Hold
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {drawer && (
          <div className="absolute inset-0 z-30 flex pointer-events-none">
            <button
              type="button"
              aria-label="Close drawer"
              className="pointer-events-auto flex-1 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setDrawer(null)}
            />

            <aside className="pointer-events-auto h-full w-[min(360px,90vw)] border-l border-border bg-surface/95 shadow-[-18px_0_48px_rgba(0,0,0,0.48)] backdrop-blur-xl">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-amber">
                      {drawer === "activity" ? "Canon Feed" : drawer === "map" ? "Story Map" : isGM ? "Director Console" : "Character Engine"}
                    </p>
                    <p className="mt-1 text-[12px] text-text-tertiary">
                      {drawer === "activity" ? "What entered the fiction" : drawer === "map" ? "The Shattered City" : isGM ? "Pressure, cuts, and bargains" : activeCharacter.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawer(null)}
                    aria-label="Close drawer"
                    title="Close drawer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:text-paper"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin] [scrollbar-color:rgba(212,168,67,0.22)_transparent]">
                  {drawer === "activity" && (
                    <div className="space-y-3">
                      {ACTIVITY.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border bg-elevated p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper">{item.label}</p>
                            <span className="rounded-full border border-border bg-subtle/30 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-text-tertiary">
                              {item.meta}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {drawer === "map" && (
                    <div className="space-y-4">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-elevated">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(212,168,67,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)]" />
                        <div className="absolute left-[20%] top-[35%] h-px w-[62%] rotate-12 bg-amber/20" />
                        <div className="absolute left-[36%] top-[24%] h-[56%] w-px rotate-[21deg] bg-amber/15" />
                        {MAP_PINS.map((pin) => (
                          <button
                            key={pin.id}
                            type="button"
                            onClick={() => setSelectedPin(pin.id)}
                            className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all ${
                              selectedPin === pin.id
                                ? "border-amber bg-amber/20 text-amber"
                                : "border-border bg-void/80 text-text-secondary hover:border-amber/35"
                            }`}
                            style={{ left: pin.x, top: pin.y }}
                            aria-label={pin.label}
                            title={pin.label}
                          >
                            <span className="h-2 w-2 rounded-full bg-current" />
                          </button>
                        ))}
                      </div>
                      {MAP_PINS.filter((pin) => pin.id === selectedPin).map((pin) => (
                        <div key={pin.id} className="rounded-lg border border-amber/20 bg-amber/[0.04] p-4">
                          <p className="text-[12px] font-bold text-paper">{pin.label}</p>
                          <p className="mt-1 text-[12px] text-text-secondary">{pin.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {drawer === "tools" && (
                    <div className="space-y-4">
                      {isGM ? (
                        <>
                          {[
                            "Call Check",
                            "Raise Pressure",
                            "Cut to Consequence",
                            "Spotlight a Bond",
                            "Ask a Loaded Question",
                          ].map((tool) => (
                            <button
                              key={tool}
                              type="button"
                              className="flex w-full items-center justify-between rounded-lg border border-border bg-elevated px-4 py-3 text-left transition-colors hover:border-amber/30"
                            >
                              <span className="text-[13px] font-medium text-paper">{tool}</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-text-tertiary">
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </button>
                          ))}
                          <div className="rounded-lg border border-rose/20 bg-rose/[0.04] p-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-rose">Pressure Track</p>
                            <div className="mt-3 flex gap-1">
                              {Array.from({ length: 6 }).map((_, index) => (
                                <span key={index} className={`h-3 flex-1 rounded-full ${index < 3 ? "bg-rose" : "bg-subtle"}`} />
                              ))}
                            </div>
                            <p className="mt-2 text-[12px] text-text-secondary">The Crown Wakes · 3 of 6 beats</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-lg border border-border bg-elevated p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-[12px] font-bold text-amber">
                                {activeCharacter.initials}
                              </div>
                              <div>
                                <p className="text-[15px] font-medium text-paper">{activeCharacter.name}</p>
                                <p className="text-[12px] text-text-tertiary">{activeCharacter.player}</p>
                              </div>
                            </div>
                            <p className="mt-4 font-reading text-[15px] leading-relaxed text-paper">&ldquo;{activeCharacter.aspect}&rdquo;</p>
                            <div className="mt-4 grid gap-2 text-[12px] text-text-secondary">
                              <p><span className="text-amber">Wants:</span> {activeCharacter.drive}</p>
                              <p><span className="text-rose">Afraid of:</span> {activeCharacter.fear}</p>
                              <p><span className="text-lavender">Now:</span> {activeCharacter.pressure}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {activeCharacter.stats.map((stat) => (
                              <div key={stat.label} className="rounded-lg border border-border bg-elevated p-3">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{stat.label}</p>
                                <p className="mt-2 font-mono text-[20px] text-paper">{stat.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {activeCharacter.traits.map((trait) => (
                              <div key={trait.name} className="rounded-lg border border-border bg-elevated p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-[12px] font-medium text-paper">{trait.name}</p>
                                  <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                                    trait.kind === "edge"
                                      ? "border-sage/30 text-sage"
                                      : trait.kind === "flaw"
                                        ? "border-rose/30 text-rose"
                                        : "border-lavender/30 text-lavender"
                                  }`}>
                                    {trait.kind}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">{trait.trigger}</p>
                                <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{trait.effect}</p>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg border border-border bg-elevated p-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-amber">Story Weight</p>
                            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{activeCharacter.bond}</p>
                            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{activeCharacter.consequence}</p>
                            <p className="mt-2 text-[12px] leading-relaxed text-text-tertiary">{activeCharacter.relic}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
