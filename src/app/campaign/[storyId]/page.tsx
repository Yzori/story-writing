"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import type { ApiStoryData } from "@/types/api";
import { formatTimeAgo } from "@/lib/format";

// ── Types ───────────────────────────────────────────────────

interface PlayerCharacter {
  id: string;
  storyId: string;
  userId: string;
  name: string;
  portrait: string | null;
  description: string;
  traits: string;
  backstory: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface CampaignSession {
  id: string;
  storyId: string;
  title: string;
  summary: string;
  opening?: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  epilogue?: string | null;
  closingMood?: string | null;
  chapterId?: string | null;
}

type LobbyStep = "invite" | "draft" | "schedule" | "review" | "begin";

interface SessionPoll {
  id: string;
  storyId: string;
  title: string;
  options: string[];
  status: string;
  confirmedOption: string | null;
  voteCounts: number[];
  totalVoters: number;
  myVotes: number[];
  createdAt: string;
}

interface CampaignApplication {
  id: string;
  storyId: string;
  userId: string;
  pitch: string;
  characterName?: string | null;
  characterArchetype?: string | null;
  characterKnownFor?: string | null;
  characterPortrait?: string | null;
  firstGlimpse?: string | null;
  playerCadence?: string | null;
  playerSpotlight?: string | null;
  writingSampleUrl?: string | null;
  voiceCadence?: string | null;
  voiceMood?: string | null;
  voiceRestraint?: string | null;
  status: string;
  votingDeadline: string | null;
  createdAt: string;
  user: {
    displayName: string | null;
    avatarUrl: string | null;
  };
  voteCount?: { yes: number; no: number };
}

// ── Status badge colors ─────────────────────────────────────

const CHARACTER_STATUS_STYLES: Record<string, string> = {
  active: "bg-sage/15 text-sage border-sage/20",
  retired: "bg-lavender/15 text-lavender border-lavender/20",
  dead: "bg-rose/15 text-rose border-rose/20",
};

const SESSION_STATUS_STYLES: Record<string, string> = {
  draft: "bg-lavender/15 text-lavender border-lavender/20",
  active: "bg-sage/15 text-sage border-sage/20",
  completed: "bg-amber/15 text-amber border-amber/20",
  archived: "bg-text-ghost/15 text-text-ghost border-text-ghost/20",
};

const APPLICATION_SPOTLIGHT_LABELS: Record<string, string> = {
  driver: "Drives scenes",
  reactor: "Shines in reactions",
  fades: "Fades in and out",
};

function getCampaignToneParts({
  mood,
  scale,
  influence,
}: {
  mood: number;
  scale: number;
  influence: number;
}) {
  return [
    mood < 34 ? "Bright wonder" : mood > 66 ? "Haunted dread" : "Balanced tone",
    scale < 34 ? "Personal stakes" : scale > 66 ? "Epic stakes" : "Wide-ranging stakes",
    influence < 34 ? "GM-led" : influence > 66 ? "Audience-shaped" : "Shared direction",
  ];
}

// Best-effort parser for poll-option labels like "Mon, 8:00 PM".
// Returns the *next* occurrence of that weekday+time, or null if unparseable.
function parseRelativeDateLabel(label: string | null | undefined): Date | null {
  if (!label) return null;
  const direct = new Date(label);
  if (!Number.isNaN(direct.getTime()) && direct.getTime() > Date.now() - 86_400_000) {
    return direct;
  }
  const weekdayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const m = label.match(/(\b[A-Za-z]{3})\w*[, ]\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
  if (!m) return null;
  const wd = weekdayMap[m[1].toLowerCase()];
  if (wd === undefined) return null;
  let hour = parseInt(m[2], 10);
  const minute = m[3] ? parseInt(m[3], 10) : 0;
  const ampm = (m[4] ?? "").toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const now = new Date();
  const out = new Date(now);
  let daysAhead = (wd - now.getDay() + 7) % 7;
  if (daysAhead === 0) {
    const pastToday = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
    if (pastToday) daysAhead = 7;
  }
  out.setDate(now.getDate() + daysAhead);
  out.setHours(hour, minute, 0, 0);
  return out;
}

function CountdownLabel({ target }: { target: string | null | undefined }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const parsed = parseRelativeDateLabel(target ?? null);
  if (!parsed) return null;
  const diff = parsed.getTime() - now;
  if (diff <= 60_000) return <span className="text-amber/85">any moment now…</span>;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  let body: string;
  if (days >= 2) body = `${days} days · ${hours}h`;
  else if (days >= 1) body = `1 day · ${hours}h ${minutes}m`;
  else if (hours >= 1) body = `${hours}h ${minutes}m`;
  else body = `${minutes}m`;
  return <span className="text-amber/85">in {body}</span>;
}

function ActivityPulse({ events }: { events: { id: string; label: string; ago: string; tone?: "gold" | "amber" | "sage" | "lavender" }[] }) {
  if (events.length === 0) return null;
  const toneClass: Record<string, string> = {
    gold: "border-amber/25 bg-amber/[0.06] text-amber/90",
    amber: "border-amber/20 bg-amber/[0.05] text-amber/80",
    sage: "border-sage/25 bg-sage/[0.06] text-sage",
    lavender: "border-lavender/25 bg-lavender/[0.06] text-lavender",
  };
  return (
    <div className="relative mx-auto mt-10 max-w-3xl">
      <div className="mb-3 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber/25" />
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/65">
          Recent at the table
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber/25" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((e) => (
          <div
            key={e.id}
            className={`shrink-0 inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 ${toneClass[e.tone ?? "gold"]}`}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-75">{e.ago}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-current opacity-50" />
            <span className="font-reading text-[12px] italic">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BigHangingLantern() {
  return (
    <div className="relative">
      {/* Outer halo */}
      <div className="pointer-events-none absolute inset-[-60px] rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_60%)] opacity-75" />
      {/* Hanging chain — vanishing into the dark above */}
      <div className="absolute left-1/2 top-[-70px] h-[70px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber/25 to-amber/55" />
      {/* Lantern body — compact */}
      <div className="relative flex h-36 w-28 flex-col items-center">
        <div className="h-1 w-1.5 rounded-t-full bg-copper" />
        <div className="-mt-px h-1 w-3.5 rounded-sm bg-gradient-to-b from-copper to-copper/55" />
        <div className="-mt-px h-2 w-14 rounded-t-md bg-gradient-to-b from-copper via-copper/80 to-copper/45 shadow-[0_0_10px_rgba(184,115,51,0.5)]" />
        <div className="-mt-px h-1.5 w-20 rounded-sm bg-gradient-to-b from-copper/85 to-copper/40 shadow-[0_2px_3px_rgba(0,0,0,0.5)]" />
        <div className="relative -mt-px h-24 w-20 overflow-hidden rounded-md border border-copper/45 bg-gradient-to-b from-amber/28 via-amber/12 to-copper/22 shadow-[inset_0_0_28px_rgba(212,175,55,0.4),inset_3px_0_8px_rgba(255,255,255,0.12),0_0_42px_rgba(212,175,55,0.55)]">
          <div
            className="absolute left-1/2 top-1/2 h-16 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FFE5A8_0%,rgba(212,175,55,0.85)_42%,transparent_75%)] blur-[1.5px]"
            style={{ animation: "flicker 2.6s ease-in-out infinite" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FFF5DC_0%,#FFE5A8_50%,transparent_82%)] blur-[1px]"
            style={{ animation: "flicker 1.7s ease-in-out infinite 0.3s" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-6 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/95 blur-[0.5px]"
            style={{ animation: "flicker 1.1s ease-in-out infinite 0.6s" }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-copper/25" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-copper/12" />
          <div className="absolute inset-y-2 left-1.5 w-0.5 rounded-full bg-gradient-to-b from-paper/35 via-paper/10 to-transparent blur-[1.2px]" />
        </div>
        <div className="-mt-px h-1.5 w-20 rounded-sm bg-gradient-to-b from-copper/85 to-copper/45 shadow-[0_2px_3px_rgba(0,0,0,0.5)]" />
        <div className="-mt-px h-1 w-16 rounded-b-md bg-gradient-to-b from-copper/70 to-copper/30" />
      </div>
      {/* Pool of light cast on the table surface below */}
      <div className="pointer-events-none absolute left-1/2 bottom-[-70px] h-24 w-[400px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.42)_0%,rgba(212,175,55,0.15)_38%,transparent_72%)] blur-[2px]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-30px] h-px w-[320px] -translate-x-1/2 bg-gradient-to-r from-transparent via-amber/22 to-transparent" />
    </div>
  );
}

function GmHostCard({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber/30" />
        <span className="font-mono text-[10px] uppercase tracking-[0.36em] text-amber/70">✦ Host</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber/30" />
      </div>
      <div className="mt-4 flex items-center gap-5 rounded-2xl border border-amber/25 bg-gradient-to-br from-elevated/90 to-surface/65 p-5 shadow-[0_0_36px_rgba(212,175,55,0.16),inset_0_0_30px_rgba(212,175,55,0.05)]">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-amber/45 bg-gradient-to-br from-amber/30 via-amber/12 to-copper/15 font-display text-[26px] font-bold text-amber shadow-[0_0_24px_rgba(212,175,55,0.45)]">
          {initial}
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-elevated bg-gradient-to-br from-amber to-copper shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-display text-[20px] leading-tight text-paper">{name}</p>
          <p className="mt-0.5 font-reading text-[12px] italic text-text-secondary">Game Master &middot; host of the table</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[9px] text-amber/70">✦</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber/75">{status}</span>
            <span className="ml-1 inline-flex items-center gap-0.5">
              <span className="inline-block h-1 w-1 rounded-full bg-amber/80 [animation:pulse_1.2s_ease-in-out_infinite]" />
              <span className="inline-block h-1 w-1 rounded-full bg-amber/80 [animation:pulse_1.2s_ease-in-out_infinite] [animation-delay:0.2s]" />
              <span className="inline-block h-1 w-1 rounded-full bg-amber/80 [animation:pulse_1.2s_ease-in-out_infinite] [animation-delay:0.4s]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LobbyCandidateTile({
  option,
  votes,
  totalVotes,
  leading,
  voted,
  onClick,
  disabled,
}: {
  option: string;
  votes: number;
  totalVotes: number;
  leading: boolean;
  voted: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed ${
        leading
          ? "border-amber/40 bg-gradient-to-br from-amber/15 to-amber/[0.04] shadow-[0_0_24px_rgba(212,175,55,0.18)] hover:border-amber/60"
          : voted
            ? "border-amber/25 bg-amber/[0.04] hover:border-amber/40"
            : "border-border bg-ink/30 hover:border-amber/30 hover:bg-ink/50"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 ${
          leading ? "bg-gradient-to-r from-amber/20 via-amber/8 to-transparent" : "bg-gradient-to-r from-paper/[0.05] to-transparent"
        }`}
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate font-display text-[14px] leading-tight ${leading ? "text-paper" : "text-text-secondary"}`}>
            {option}
          </p>
          {(leading || voted) && (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber/85">
              {leading ? "✦ leading" : "✓ you voted"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={`font-display text-[18px] tabular-nums leading-none ${leading ? "text-amber" : "text-text-ghost"}`}>
            {votes}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">votes</p>
        </div>
      </div>
    </button>
  );
}

function LobbySeat({ character, index }: { character?: PlayerCharacter; index: number }) {
  if (!character) {
    return (
      <div className="rounded-xl border border-dashed border-amber/20 bg-ink/20 px-3 py-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-amber/30 text-[14px] text-amber/40">
          {index + 1}
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-text-ghost">Unlit seat</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber/15 bg-elevated/60 px-3 py-3 text-center shadow-[inset_0_0_20px_rgba(212,175,55,0.04)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.08] font-display text-[16px] text-amber">
        {character.name.charAt(0).toUpperCase()}
      </div>
      <p className="mt-2 truncate font-display text-[13px] text-paper">{character.name}</p>
      <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-text-ghost">
        {character.user?.displayName ?? "Player"}
      </p>
    </div>
  );
}

function LobbyRitualCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-ink/25 p-3.5">
      <p className="font-display text-[14px] text-paper">{title}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-text-ghost">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ApplicantPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border-subtle bg-surface/70 px-2.5 py-0.5 text-[10.5px] text-text-secondary">
      {children}
    </span>
  );
}

function LobbyToneMeter({
  label,
  rightLabel,
  value,
}: {
  label: string;
  rightLabel: string;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-text-ghost">
        <span>{label}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative mt-2 h-px rounded-full bg-border">
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_10px_rgba(212,175,55,0.45)]"
          style={{ left: `calc(${value}% - 5px)` }}
        />
      </div>
    </div>
  );
}

function ReadinessRow({ complete, label, caption }: { complete: boolean; label: string; caption: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          complete
            ? "border-amber/45 bg-amber text-void shadow-[0_0_12px_rgba(212,175,55,0.45)]"
            : "border-border bg-ink/40"
        }`}
      >
        {complete && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 5.2 4.2 7.4 8 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-display text-[15px] ${complete ? "text-paper" : "text-text-ghost"}`}>{label}</p>
        <p className="text-[11px] text-text-ghost">{caption}</p>
      </div>
    </div>
  );
}

function formatDateTimeOption(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocalValue(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "";

  const date = new Date(parsed);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createSchedulePreset(daysAhead: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return formatDateTimeOption(toDateTimeLocalValue(date.toISOString()));
}

// ── Component ───────────────────────────────────────────────

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const storyId = params.storyId as string;

  const [story, setStory] = useState<ApiStoryData | null>(null);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [polls, setPolls] = useState<SessionPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPitch, setExpandedPitch] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  // Poll creation form
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollTitle, setPollTitle] = useState("When should we play next?");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollVoteLoading, setPollVoteLoading] = useState(false);
  const [pollCloseLoading, setPollCloseLoading] = useState(false);

  // Character creation form
  const [showCreateChar, setShowCreateChar] = useState(false);
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [charTraits, setCharTraits] = useState("");
  const [charBackstory, setCharBackstory] = useState("");
  const [charPortrait, setCharPortrait] = useState("");
  const [charAspect, setCharAspect] = useState("");
  const [charApproach, setCharApproach] = useState<"Bold" | "Keen" | "Subtle" | null>(null);
  const [charSubmitting, setCharSubmitting] = useState(false);

  // New session form
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionOpening, setSessionOpening] = useState("");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [beginningSessionId, setBeginningSessionId] = useState<string | null>(null);
  const [compilingSessionId, setCompilingSessionId] = useState<string | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const userHasActiveCharacter = characters.some((c) => c.userId === currentUserId && c.status === "active");
  const userCharacters = characters.filter((c) => c.userId === currentUserId);
  const userDeadOrRetiredChars = userCharacters.filter((c) => c.status === "dead" || c.status === "retired");
  const isReplacementCharacter = userDeadOrRetiredChars.length > 0 && !userHasActiveCharacter;
  const isPublicCampaign = story?.isPublic ?? false;
  const hasStarted = sessions.some((session) => session.status === "active" || session.status === "completed");
  const firstDraftSession = sessions.find((session) => session.status === "draft");
  const activePoll = polls.find((p) => p.status === "open");
  const closedPolls = polls.filter((p) => p.status === "closed");
  const latestClosedPoll = closedPolls.length > 0 ? closedPolls[0] : null;
  const invitePath = story?.slug ? `/story/${story.slug}` : `/campaign/${storyId}`;
  const inviteLink = origin ? `${origin}${invitePath}` : invitePath;
  const campaignSeats = story?.campaignSeats ?? 6;
  const openSeats = Math.max(campaignSeats - characters.length, 0);
  const leadingPollVotes = activePoll ? Math.max(...activePoll.voteCounts, 0) : 0;
  const hasSeatLit = characters.length > 0;
  const hasOpeningDraft = Boolean(firstDraftSession);
  const hasTimeAgreed = Boolean(latestClosedPoll?.confirmedOption);
  const hasDoorAnswered = applications.length === 0;
  const readyToBegin = hasSeatLit && hasOpeningDraft && hasDoorAnswered;
  const nextLobbyStep: LobbyStep = !hasSeatLit
    ? "invite"
    : !hasOpeningDraft
    ? "draft"
    : !hasTimeAgreed
    ? "schedule"
    : !hasDoorAnswered
    ? "review"
    : "begin";
  const nextLobbyCopy: Record<LobbyStep, { title: string; detail: string; action: string }> = {
    invite: {
      title: "Invite players",
      detail: "Start by getting at least one character into the room.",
      action: "Copy invite link",
    },
    draft: {
      title: "Draft the opening scene",
      detail: "Prepare the first words before anyone enters play.",
      action: "Draft opening scene",
    },
    schedule: {
      title: activePoll ? "Wait for session votes" : "Schedule the first session",
      detail: activePoll ? "A time poll is open. Players can vote before you confirm a time." : "Offer a few times so the group can choose.",
      action: activePoll ? "Poll in progress" : "Schedule session",
    },
    review: {
      title: "Review applications",
      detail: "There are pending seat requests before the table is fully settled.",
      action: "Review applications",
    },
    begin: {
      title: "Ready to begin",
      detail: "The key setup pieces are in place.",
      action: "Light the lantern",
    },
  };
  const schedulePresets = [
    createSchedulePreset(1, 20),
    createSchedulePreset(2, 20),
    createSchedulePreset(3, 18),
  ];
  const charterToneParts = story
    ? getCampaignToneParts({
        mood: story.campaignToneMood ?? 62,
        scale: story.campaignToneScale ?? 45,
        influence: story.campaignToneInfluence ?? 35,
      })
    : ["Balanced tone", "Wide-ranging stakes", "Shared direction"];
  const playerPitch = story?.hook?.trim() || story?.synopsis?.trim() || "A new table is forming. The first invitation has not been written yet.";

  const activityEvents = useMemo(() => {
    type Ev = { id: string; label: string; ago: string; tone?: "gold" | "amber" | "sage" | "lavender"; time: number };
    const events: Ev[] = [];
    for (const c of characters) {
      const t = Date.parse(c.createdAt);
      if (!Number.isNaN(t)) {
        events.push({
          id: `char-${c.id}`,
          label: `${c.user?.displayName ?? "a player"} lit ${c.name}'s seat`,
          ago: formatTimeAgo(c.createdAt),
          tone: "gold",
          time: t,
        });
      }
    }
    for (const a of applications) {
      const t = Date.parse(a.createdAt);
      if (!Number.isNaN(t)) {
        events.push({
          id: `app-${a.id}`,
          label: `${a.user.displayName ?? "someone"} arrived at the door`,
          ago: formatTimeAgo(a.createdAt),
          tone: "amber",
          time: t,
        });
      }
    }
    for (const p of polls) {
      const t = Date.parse(p.createdAt);
      if (Number.isNaN(t)) continue;
      if (p.status === "open") {
        events.push({
          id: `poll-${p.id}`,
          label: `Poll opened — "${p.title}"`,
          ago: formatTimeAgo(p.createdAt),
          tone: "lavender",
          time: t,
        });
      } else if (p.status === "closed" && p.confirmedOption) {
        events.push({
          id: `poll-closed-${p.id}`,
          label: `Time settled — ${p.confirmedOption}`,
          ago: formatTimeAgo(p.createdAt),
          tone: "sage",
          time: t,
        });
      }
    }
    for (const s of sessions) {
      if (s.status !== "draft") continue;
      const t = Date.parse(s.createdAt);
      if (!Number.isNaN(t)) {
        events.push({
          id: `session-${s.id}`,
          label: `Opening scene "${s.title}" drafted`,
          ago: formatTimeAgo(s.createdAt),
          tone: "sage",
          time: t,
        });
      }
    }
    return events.sort((a, b) => b.time - a.time).slice(0, 7);
  }, [characters, applications, polls, sessions]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setInviteCopied(false);
    }
  };

  const handlePrimaryLobbyAction = () => {
    if (nextLobbyStep === "invite") {
      handleCopyInvite();
      return;
    }
    if (nextLobbyStep === "draft") {
      setShowCreatePoll(false);
      setShowNewSession(true);
      return;
    }
    if (nextLobbyStep === "schedule") {
      if (activePoll) return;
      setShowNewSession(false);
      setShowCreatePoll(true);
      return;
    }
    if (nextLobbyStep === "review") {
      document.getElementById("campaign-applications")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (nextLobbyStep === "begin" && firstDraftSession) {
      handleBeginSession(firstDraftSession.id);
    }
  };

  const handleToggleDiscoverable = async () => {
    if (!story) return;
    const newValue = !isPublicCampaign;
    // Optimistic update
    setStory({ ...story, isPublic: newValue });
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newValue }),
      });
      if (!res.ok) {
        // Revert on failure
        setStory({ ...story, isPublic: !newValue });
      }
    } catch {
      setStory({ ...story, isPublic: !newValue });
    }
  };

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [storyRes, charsRes, sessionsRes, appsRes, pollsRes] = await Promise.all([
        fetch(`/api/stories/${storyId}`),
        fetch(`/api/stories/${storyId}/campaign/characters`),
        fetch(`/api/stories/${storyId}/campaign/sessions`),
        fetch(`/api/stories/${storyId}/campaign/applications`),
        fetch(`/api/stories/${storyId}/campaign/polls`),
      ]);

      if (!storyRes.ok) throw new Error("Failed to load story");

      const storyJson = await storyRes.json();
      setStory(storyJson.data);

      if (charsRes.ok) {
        const charsJson = await charsRes.json();
        setCharacters(charsJson.data ?? []);
      }

      if (sessionsRes.ok) {
        const sessionsJson = await sessionsRes.json();
        setSessions(sessionsJson.data ?? []);
      }

      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        setApplications(appsJson.data ?? []);
      }

      if (pollsRes.ok) {
        const pollsJson = await pollsRes.json();
        setPolls(pollsJson.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (storyId) fetchData();
  }, [storyId, fetchData]);

  // ── Create character ────────────────────────────────────────

  const handleCreateCharacter = async () => {
    if (!charName.trim() || charSubmitting) return;
    setCharSubmitting(true);
    try {
      // Compute approach stats from the single choice: chosen = +2, next = 0, last = -1
      const approachMap: Record<string, { Bold: number; Keen: number; Subtle: number }> = {
        Bold:   { Bold: 2, Keen: 0, Subtle: -1 },
        Keen:   { Bold: -1, Keen: 2, Subtle: 0 },
        Subtle: { Bold: 0, Keen: -1, Subtle: 2 },
      };
      const approaches = charApproach ? approachMap[charApproach] : { Bold: 0, Keen: 0, Subtle: 0 };

      const payload: Record<string, unknown> = {
        name: charName.trim(),
        description: charDesc.trim(),
        traits: charTraits.trim(),
        backstory: charBackstory.trim(),
        portrait: charPortrait.trim() || undefined,
        stats: JSON.stringify({
          approaches,
          aspect: charAspect.trim(),
        }),
      };
      const res = await fetch(`/api/stories/${storyId}/campaign/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to create character");
      }
      setCharName("");
      setCharDesc("");
      setCharTraits("");
      setCharBackstory("");
      setCharPortrait("");
      setCharAspect("");
      setCharApproach(null);
      setShowCreateChar(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating character");
    } finally {
      setCharSubmitting(false);
    }
  };

  // ── Create session ──────────────────────────────────────────

  const handleCreateSession = async () => {
    if (!sessionTitle.trim() || sessionSubmitting) return;
    setSessionSubmitting(true);
    try {
      const sessionPayload: Record<string, string> = { title: sessionTitle.trim() };
      if (sessionOpening.trim()) {
        sessionPayload.opening = sessionOpening.trim();
      }
      const res = await fetch(`/api/stories/${storyId}/campaign/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to create session");
      }
      setSessionTitle("");
      setSessionOpening("");
      setShowNewSession(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating session");
    } finally {
      setSessionSubmitting(false);
    }
  };

  // ── Begin session (draft → active) ────────────────────────

  const handleBeginSession = async (sessionId: string) => {
    setBeginningSessionId(sessionId);
    try {
      const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to begin session");
      }
      router.push(`/campaign/${storyId}/play/${sessionId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error beginning session");
    } finally {
      setBeginningSessionId(null);
    }
  };

  const handleCompileSession = async (sessionId: string) => {
    setCompilingSessionId(sessionId);
    try {
      const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to compile session");
      }
      const chapterId = json.data?.chapterId;
      // Update local state so button changes to "View Chapter"
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, chapterId } : s))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error compiling session");
    } finally {
      setCompilingSessionId(null);
    }
  };

  // ── Application actions ────────────────────────────────────

  const handleApplicationAction = async (
    applicationId: string,
    action: "approved" | "declined" | "voting"
  ) => {
    setActionLoading(applicationId);
    try {
      const body: Record<string, unknown> = { status: action };
      if (action === "voting") {
        body.votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      }
      const res = await fetch(
        `/api/stories/${storyId}/campaign/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Action failed");
      }
      // Remove approved from list, update others in place
      if (action === "approved") {
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      } else {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, status: action, ...(action === "voting" ? { votingDeadline: body.votingDeadline as string } : {}) } : a
          )
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Poll actions ──────────────────────────────────────────

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (validOptions.length < 2 || pollSubmitting) return;
    setPollSubmitting(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/campaign/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pollTitle.trim() || undefined,
          options: validOptions.map((o) => o.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to create poll");
      }
      const created = await res.json();
      setPolls((prev) => [created.data, ...prev.map((p) => p.status === "open" ? { ...p, status: "closed" } : p)]);
      setShowCreatePoll(false);
      setPollTitle("When should we play next?");
      setPollOptions(["", ""]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating poll");
    } finally {
      setPollSubmitting(false);
    }
  };

  const handlePollVote = async (pollId: string, optionIndex: number) => {
    if (pollVoteLoading) return;
    setPollVoteLoading(true);

    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    // Toggle the option
    const currentVotes = [...poll.myVotes];
    const idx = currentVotes.indexOf(optionIndex);
    if (idx >= 0) {
      currentVotes.splice(idx, 1);
    } else {
      currentVotes.push(optionIndex);
    }

    // Optimistic update
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const newCounts = [...p.voteCounts];
        if (idx >= 0) {
          // Removing vote
          newCounts[optionIndex] = Math.max(0, newCounts[optionIndex] - 1);
        } else {
          // Adding vote
          newCounts[optionIndex]++;
        }
        const hadVotesBefore = p.myVotes.length > 0;
        const hasVotesNow = currentVotes.length > 0;
        let newTotalVoters = p.totalVoters;
        if (!hadVotesBefore && hasVotesNow) newTotalVoters++;
        if (hadVotesBefore && !hasVotesNow) newTotalVoters--;
        return { ...p, myVotes: currentVotes, voteCounts: newCounts, totalVoters: newTotalVoters };
      })
    );

    try {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/polls/${pollId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedOptions: currentVotes }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to vote");
      }
      const updated = await res.json();
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? updated.data : p))
      );
    } catch {
      // Revert optimistic update
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId && poll ? poll : p))
      );
    } finally {
      setPollVoteLoading(false);
    }
  };

  const handleClosePoll = async (pollId: string, confirmedOption: string) => {
    if (pollCloseLoading) return;
    setPollCloseLoading(true);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/polls/${pollId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmedOption }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to close poll");
      }
      const updated = await res.json();
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? updated.data : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error closing poll");
    } finally {
      setPollCloseLoading(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
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
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl opacity-30">&#x2694;&#xFE0F;</div>
          <p className="text-text-secondary">{error ?? "Story not found"}</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-surface border border-border rounded-xl text-text-secondary hover:text-paper transition-colors text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <div className="mx-auto max-w-[1240px] px-4 pt-24 pb-10 sm:px-6 lg:px-10 space-y-8">
        {/* ── Header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-text-ghost hover:text-text-secondary transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-display text-paper font-semibold">
                  {story.title}
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold bg-violet/15 text-violet border border-violet/20 rounded-full">
                  Campaign
                </span>
              </div>
              <p className="text-text-secondary text-sm">
                GM: <span className="text-paper">{story.author?.displayName ?? "Unknown"}</span>
              </p>
            </div>

            {story.slug && (
              <Link
                href={`/story/${story.slug}/workshop`}
                className="flex items-center gap-2 px-4 py-2 bg-surface/80 border border-border rounded-xl text-text-secondary hover:text-paper hover:border-amber/30 transition-all text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M2 3h12M2 7h8M2 11h10M2 15h6" />
                </svg>
                World &amp; Lore
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── Pre-session lobby ─────────────────────────── */}
        {!hasStarted && (
          <div className="space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="relative overflow-hidden rounded-[22px] border border-amber/[0.16] bg-gradient-to-br from-surface/85 via-surface/70 to-elevated/85 px-6 pb-5 pt-14 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.75)] sm:px-9 sm:pb-7 sm:pt-16"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_50%_14%,rgba(212,175,55,0.2)_0%,transparent_55%)]" />
              <div className="relative flex flex-col items-center text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/65">
                  Pre-session lobby · {openSeats} seat{openSeats === 1 ? "" : "s"} unlit
                </p>
                <div className="mt-5">
                  <BigHangingLantern />
                </div>
                <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.28em] text-amber/65">
                  {activePoll
                    ? "The lantern lights on"
                    : latestClosedPoll?.confirmedOption
                      ? "The lantern lights on"
                      : "First session"}
                </p>
                <p className="mt-2 font-display text-[28px] leading-none text-paper sm:text-[36px]">
                  {(() => {
                    if (activePoll) {
                      const leadingIdx = activePoll.voteCounts.findIndex((v) => v === leadingPollVotes && v > 0);
                      return leadingIdx >= 0 ? activePoll.options[leadingIdx] : "Awaiting votes";
                    }
                    return latestClosedPoll?.confirmedOption ?? firstDraftSession?.title ?? "Awaiting a night";
                  })()}
                </p>
                <p className="mt-2 font-reading text-[14px] italic text-text-secondary">
                  {(() => {
                    const leadingIdx = activePoll ? activePoll.voteCounts.findIndex((v) => v === leadingPollVotes && v > 0) : -1;
                    const targetLabel = latestClosedPoll?.confirmedOption ?? (leadingIdx >= 0 && activePoll ? activePoll.options[leadingIdx] : null);
                    const canCountDown = !!parseRelativeDateLabel(targetLabel);
                    if (canCountDown) {
                      return (
                        <>
                          <CountdownLabel target={targetLabel} />
                          {activePoll && <> · {activePoll.totalVoters} vote{activePoll.totalVoters === 1 ? "" : "s"} cast</>}
                        </>
                      );
                    }
                    if (activePoll) {
                      return <>{activePoll.totalVoters} vote{activePoll.totalVoters === 1 ? "" : "s"} cast <span className="text-amber/80">· currently leading</span></>;
                    }
                    if (firstDraftSession) return "The opening scene has been drafted.";
                    return "The lantern will hold until the table is ready.";
                  })()}
                </p>
                {isGM && (
                  <div className="mt-5 w-full max-w-xl rounded-2xl border border-amber/[0.16] bg-ink/25 p-4 text-left">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber/70">
                          Recommended next step
                        </p>
                        <p className="mt-1 font-display text-[18px] text-paper">
                          {nextLobbyCopy[nextLobbyStep].title}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-text-ghost">
                          {nextLobbyCopy[nextLobbyStep].detail}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePrimaryLobbyAction}
                        disabled={nextLobbyStep === "schedule" && Boolean(activePoll)}
                        className="shrink-0 rounded-xl border border-amber/25 bg-amber/[0.08] px-4 py-2.5 text-[12px] font-bold text-amber transition-colors hover:bg-amber/12 disabled:cursor-default disabled:opacity-60"
                      >
                        {nextLobbyStep === "invite" && inviteCopied ? "Copied" : nextLobbyCopy[nextLobbyStep].action}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {activePoll && (
                <div className="relative mx-auto mt-8 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber/25" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/65">
                      Candidate nights
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber/25" />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {activePoll.options.map((option, index) => {
                      const votes = activePoll.voteCounts[index] ?? 0;
                      return (
                        <LobbyCandidateTile
                          key={option}
                          option={option}
                          votes={votes}
                          totalVotes={activePoll.totalVoters}
                          leading={votes > 0 && votes === leadingPollVotes}
                          voted={activePoll.myVotes.includes(index)}
                          onClick={() => handlePollVote(activePoll.id, index)}
                          disabled={pollVoteLoading}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                    Voted by the table · {activePoll.totalVoters} vote{activePoll.totalVoters === 1 ? "" : "s"} · tap to {activePoll.myVotes.length > 0 ? "change your" : "cast a"} vote
                  </p>
                </div>
              )}

              <div className="relative mx-auto mt-6 max-w-lg">
                <GmHostCard
                  name={story.author?.displayName ?? "the Game Master"}
                  status={
                    hasOpeningDraft
                      ? "the opening scene is drafted"
                      : isGM
                        ? "drafting the opening scene"
                        : "preparing the opening scene"
                  }
                />
              </div>

              <ActivityPulse events={activityEvents} />

              <div className="relative my-5 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber/25" />
                <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber/60">
                  Around the lantern · {characters.length} of {campaignSeats} lit
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber/25" />
              </div>

              {/* Mobile / tablet — grid */}
              <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
                {Array.from({ length: campaignSeats }).map((_, index) => (
                  <LobbySeat key={index} character={characters[index]} index={index} />
                ))}
              </div>

              {/* Desktop — seats on a gentle arc. Edges higher, center lower, each tilts inward. */}
              <div className="relative mx-auto hidden lg:block" style={{ height: "145px", maxWidth: "920px" }}>
                {Array.from({ length: campaignSeats }).map((_, index) => {
                  const N = campaignSeats;
                  const center = N > 1 ? (N - 1) / 2 : 0;
                  const norm = center > 0 ? (index - center) / center : 0; // -1 .. 1
                  const arcDepth = 44;
                  const y = (1 - Math.abs(norm)) * arcDepth;
                  const x = 50 + norm * 41;
                  const rotation = -norm * 4;
                  return (
                    <div
                      key={index}
                      className="absolute w-[136px]"
                      style={{
                        left: `${x}%`,
                        top: `${y}px`,
                        transform: `translateX(-50%) rotate(${rotation}deg)`,
                        transformOrigin: "50% 0%",
                      }}
                    >
                      <LobbySeat character={characters[index]} index={index} />
                    </div>
                  );
                })}
              </div>

              {applications.length > 0 && (
                <div className="relative mt-7 rounded-2xl border border-amber/20 bg-amber/[0.05] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/75">
                        At the door
                      </p>
                      <p className="mt-1 font-display text-[18px] text-paper">
                        {applications.length} traveller{applications.length === 1 ? "" : "s"} waiting to be welcomed.
                      </p>
                    </div>
                    <span className="rounded-full border border-amber/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber/75">
                      Review below
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {applications.slice(0, 2).map((app) => (
                      <div key={app.id} className="rounded-xl border border-border bg-surface/60 p-4">
                        <p className="font-display text-[14px] text-paper">{app.user.displayName || "Anonymous"}</p>
                        {(app.characterName || app.characterArchetype) && (
                          <p className="mt-1 text-[11px] text-amber/80">
                            {[app.characterName, app.characterArchetype].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {(app.characterKnownFor || app.pitch) && (
                          <p className="mt-2 line-clamp-2 font-reading text-[13px] italic leading-5 text-text-secondary">
                            &ldquo;{app.characterKnownFor || app.pitch}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-[18px] text-paper">Before the first session</h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">setup steps</p>
              </div>
              <div className={`grid gap-3 ${activePoll || latestClosedPoll?.confirmedOption ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                {!(activePoll || latestClosedPoll?.confirmedOption) && (
                  <LobbyRitualCard title="Schedule session" subtitle="Let players vote on a time.">
                    {isGM ? (
                      <p className="rounded-lg border border-border bg-ink/20 px-3 py-2 text-[12px] leading-5 text-text-ghost">
                        No time poll yet. It will appear as the recommended next step once the table is ready for scheduling.
                      </p>
                    ) : (
                      <p className="text-[12px] text-text-ghost">The GM has not proposed a time yet.</p>
                    )}
                  </LobbyRitualCard>
                )}

                <LobbyRitualCard title="Invite players" subtitle={`${openSeats} seat${openSeats === 1 ? "" : "s"} still open.`}>
                  {isGM ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-2">
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">{inviteLink}</code>
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="rounded-md border border-amber/25 bg-amber/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber"
                        >
                          {inviteCopied ? "Copied" : "Copy"}
                        </button>
                      </div>

                      <div className="rounded-xl border border-border bg-ink/25 p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Table access</p>
                          <span className="text-[11px] text-text-ghost">
                            {isPublicCampaign ? "Listed in Browse" : "Invite only"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface/55 p-1">
                          {(["Private", "Public"] as const).map((option) => {
                            const selected = option === (isPublicCampaign ? "Public" : "Private");
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  const shouldBePublic = option === "Public";
                                  if (shouldBePublic !== isPublicCampaign) handleToggleDiscoverable();
                                }}
                                className={`rounded-md px-3 py-2 text-[12px] font-semibold transition-colors ${
                                  selected
                                    ? "bg-elevated text-paper shadow-[0_8px_24px_-18px_rgba(0,0,0,0.7)]"
                                    : "text-text-ghost hover:text-text-secondary"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-text-ghost">
                          {isPublicCampaign
                            ? "Players can discover the campaign and request a seat."
                            : "Only people with the link can find this campaign."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-ghost">Share the table with someone who should be here.</p>
                  )}
                </LobbyRitualCard>

                <LobbyRitualCard title="Opening scene" subtitle="Prepare the first words at the table.">
                  {firstDraftSession ? (
                    <div>
                      <p className="font-display text-[15px] text-paper">{firstDraftSession.title}</p>
                      {firstDraftSession.opening && (
                        <p className="mt-3 line-clamp-4 rounded-md border border-border bg-ink/25 p-3 font-reading text-[12px] italic leading-5 text-text-secondary">
                          &ldquo;{firstDraftSession.opening}&rdquo;
                        </p>
                      )}
                      <p className="mt-3 rounded-lg border border-sage/20 bg-sage/[0.06] px-3 py-2 text-[12px] text-sage">
                        Opening draft saved.
                      </p>
                    </div>
                  ) : isGM ? (
                    <p className="rounded-lg border border-border bg-ink/20 px-3 py-2 text-[12px] leading-5 text-text-ghost">
                      Not drafted yet. Use the recommended step above when you are ready.
                    </p>
                  ) : (
                    <p className="text-[12px] text-text-ghost">The GM is preparing the opening.</p>
                  )}
                </LobbyRitualCard>
              </div>

              <AnimatePresence mode="wait">
                {showCreatePoll && isGM && (
                  <motion.div
                    key="lobby-poll-form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-5 overflow-hidden rounded-2xl border border-amber/[0.18] bg-gradient-to-br from-surface/80 to-elevated/70 p-5 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.65)] sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/70">
                          Now editing · Schedule session
                        </p>
                        <h4 className="mt-2 font-display text-[23px] text-paper">Offer a few times to the group.</h4>
                        <p className="mt-1 text-[13px] text-text-ghost">
                          Players will vote on these options before the first scene begins.
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-ink/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                        {pollOptions.filter((o) => o.trim()).length}/5 options
                      </span>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                      <div className="space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Question</label>
                        <input
                          type="text"
                          value={pollTitle}
                          onChange={(e) => setPollTitle(e.target.value)}
                          placeholder="When should we play next?"
                          className="w-full rounded-xl border border-border bg-ink/30 px-3 py-2.5 text-[14px] text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-amber/35"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Time options</label>
                        <div className="flex flex-wrap gap-2 pb-1">
                          {schedulePresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                const next = [...pollOptions];
                                const emptyIndex = next.findIndex((option) => !option.trim());
                                const targetIndex = emptyIndex >= 0 ? emptyIndex : next.length;
                                if (targetIndex >= 5) return;
                                next[targetIndex] = preset;
                                setPollOptions(next);
                              }}
                              className="rounded-full border border-amber/20 bg-amber/[0.04] px-3 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/10"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="group flex items-center gap-2 rounded-xl border border-border bg-ink/20 px-3 py-2 transition-colors focus-within:border-amber/35">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber/20 bg-amber/[0.04] font-mono text-[10px] text-amber/80">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...pollOptions];
                                next[idx] = e.target.value;
                                setPollOptions(next);
                              }}
                              placeholder={idx === 0 ? "e.g. Saturday 8pm" : idx === 1 ? "e.g. Sunday afternoon" : `Option ${idx + 1}`}
                              className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-paper outline-none placeholder:text-text-ghost/45"
                            />
                            <label className="relative shrink-0 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-text-ghost transition-colors hover:border-amber/30 hover:text-amber">
                              <input
                                type="datetime-local"
                                value={toDateTimeLocalValue(opt)}
                                onChange={(e) => {
                                  const next = [...pollOptions];
                                  next[idx] = formatDateTimeOption(e.target.value);
                                  setPollOptions(next);
                                }}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label={`Pick date and time for option ${idx + 1}`}
                              />
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                                <path d="M4 2v2M12 2v2M2.5 6h11M3 3.5h10a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
                                <path d="M6 9h.01M8 9h.01M10 9h.01M6 11.5h.01M8 11.5h.01" />
                              </svg>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={handleCreatePoll}
                        disabled={pollOptions.filter((o) => o.trim()).length < 2 || pollSubmitting}
                        className="rounded-xl bg-amber px-5 py-2.5 text-[13px] font-bold text-void transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {pollSubmitting ? "Creating..." : "Post time poll"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreatePoll(false);
                          setPollTitle("When should we play next?");
                          setPollOptions(["", ""]);
                        }}
                        className="px-3 py-2 text-[13px] text-text-ghost transition-colors hover:text-text-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {showNewSession && isGM && (
                  <motion.div
                    key="lobby-session-form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-5 overflow-hidden rounded-2xl border border-amber/[0.18] bg-gradient-to-br from-surface/80 to-elevated/70 p-5 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.65)] sm:p-6"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/70">
                      Now editing · Opening scene
                    </p>
                    <h4 className="mt-2 font-display text-[23px] text-paper">Draft the first words at the table.</h4>
                    <p className="mt-1 text-[13px] text-text-ghost">
                      This stays as a draft until you light the lantern.
                    </p>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                      <div className="space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Scene title</label>
                        <input
                          type="text"
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          placeholder="The Archive Fire"
                          className="w-full rounded-xl border border-border bg-ink/30 px-3 py-2.5 text-[14px] text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-amber/35"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Opening narration</label>
                        <textarea
                          value={sessionOpening}
                          onChange={(e) => setSessionOpening(e.target.value)}
                          placeholder="Set the scene for your players..."
                          rows={5}
                          className="w-full resize-none rounded-xl border border-border bg-ink/30 px-3 py-2.5 font-reading text-[14px] leading-6 text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-amber/35"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={handleCreateSession}
                        disabled={!sessionTitle.trim() || sessionSubmitting}
                        className="rounded-xl bg-amber px-5 py-2.5 text-[13px] font-bold text-void transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sessionSubmitting ? "Drafting..." : "Save opening draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewSession(false)}
                        className="px-3 py-2 text-[13px] text-text-ghost transition-colors hover:text-text-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber/[0.14] bg-gradient-to-br from-surface/65 to-elevated/65 p-4 sm:p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/70">
                  Table charter
                </p>
                <h3 className="mt-2 font-display text-[17px] text-paper">{charterToneParts.join(" · ")}</h3>
                <div className="mt-5 space-y-4">
                  <LobbyToneMeter label="Wonder" rightLabel="Dread" value={story.campaignToneMood ?? 62} />
                  <LobbyToneMeter label="Personal" rightLabel="Epic" value={story.campaignToneScale ?? 45} />
                  <LobbyToneMeter label="GM-led" rightLabel="Audience-shaped" value={story.campaignToneInfluence ?? 35} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(story.genres.length > 0 ? story.genres.slice(0, 5) : ["Unsorted"]).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-md border border-border bg-surface/50 px-2.5 py-0.5 text-[11px] text-text-secondary"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber/[0.14] bg-gradient-to-br from-elevated/80 to-surface/70 p-4 sm:p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/70">
                  Opening invitation
                </p>
                <blockquote className="relative mt-3 rounded-md border border-amber/[0.18] bg-ink/25 px-5 py-4">
                  <span className="pointer-events-none absolute -top-2 left-3 font-display text-[34px] leading-none text-amber/35">
                    &ldquo;
                  </span>
                  <p className="font-reading text-[14px] italic leading-[1.55] text-text-secondary line-clamp-5">
                    {playerPitch}
                  </p>
                </blockquote>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Posted by <span className="text-text-secondary">{story.author?.displayName ?? "the GM"}</span>
                </p>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[22px] border border-amber/25 bg-gradient-to-br from-ink/85 via-surface/60 to-ink/80 p-5 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.75)] sm:p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.16)_0%,transparent_58%)]" />
              <div className="relative grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber/65">
                    Readiness
                  </p>
                  <h3 className="mt-2 font-display text-[22px] leading-tight text-paper">
                    {readyToBegin ? "The table is ready to begin." : "A few things are still open."}
                  </h3>
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <ReadinessRow complete label="The charter has been sealed" caption="This adventure is open." />
                    <ReadinessRow complete={hasSeatLit} label="At least one seat is lit" caption={`${characters.length} of ${campaignSeats} seats filled`} />
                    <ReadinessRow complete={hasOpeningDraft} label="The opening scene is drafted" caption={firstDraftSession?.title ?? "No opening scene yet"} />
                    <ReadinessRow
                      complete={hasTimeAgreed}
                      label="A session time is agreed"
                      caption={latestClosedPoll?.confirmedOption ?? (activePoll ? "Poll in progress" : "No time chosen yet")}
                    />
                    <ReadinessRow complete={hasDoorAnswered} label="Applications are handled" caption={applications.length > 0 ? `${applications.length} applicant${applications.length === 1 ? "" : "s"} waiting` : "No pending applicants"} />
                  </div>
                </div>

                <aside className="rounded-2xl border border-amber/[0.16] bg-ink/25 p-4 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/65">Current state</p>
                  <p className="mt-2 font-display text-[20px] leading-tight text-paper">
                    {readyToBegin ? "Ready for the first scene." : "Still preparing."}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-text-ghost">
                    {readyToBegin
                      ? "Use the recommended step above when you want to begin."
                      : "The list shows what still needs attention before play starts."}
                  </p>
                </aside>
              </div>
            </section>
          </div>
        )}

        {/* ── Players Panel ──────────────────────────────── */}
        {(hasStarted || characters.length > 0 || (!isGM && currentUserId && !userHasActiveCharacter)) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
              Player Characters
            </h2>
            <span className="text-[10px] text-text-ghost">{characters.length} player{characters.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-3">
            {characters.map((char) => (
              <motion.div
                key={char.id}
                layout
                className="card-page p-4 flex items-center gap-4"
              >
                {/* Portrait */}
                <div className="relative w-12 h-12 rounded-full bg-ink flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {char.portrait ? (
                    <Image src={char.portrait} alt={char.name} fill sizes="48px" className="object-cover" unoptimized />
                  ) : (
                    <span className="text-lg font-display text-text-ghost">
                      {char.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-paper text-sm truncate">{char.name}</span>
                    <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border rounded-full ${CHARACTER_STATUS_STYLES[char.status] ?? CHARACTER_STATUS_STYLES.active}`}>
                      {char.status}
                    </span>
                  </div>
                  {char.traits && (
                    <p className="text-text-ghost text-xs mt-0.5 truncate">{char.traits}</p>
                  )}
                  <p className="text-text-ghost text-[10px] mt-0.5">
                    Played by {char.user?.displayName ?? "Unknown"}
                  </p>
                </div>
              </motion.div>
            ))}

            {characters.length === 0 && (
              <div className="bg-surface/50 border border-border/50 border-dashed rounded-2xl p-8 text-center">
                <p className="text-text-ghost text-sm">No characters yet. Be the first to join the campaign.</p>
              </div>
            )}

            {/* GM invite hint + Transfer GM */}
            {isGM && hasStarted && (
              <div className="space-y-3">
                <div className="bg-violet/5 border border-violet/10 rounded-2xl p-4 text-center">
                  <p className="text-text-secondary text-sm">
                    Share this audition link with players so they can introduce a character and join.
                  </p>
                  <p className="text-text-ghost text-xs mt-1 font-mono">
                    {invitePath}
                  </p>
                </div>

                {/* Discoverable toggle */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleToggleDiscoverable}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      isPublicCampaign ? "bg-sage/40" : "bg-surface border border-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full transition-all duration-200 ${
                        isPublicCampaign
                          ? "translate-x-6 bg-sage shadow-sm shadow-sage/30"
                          : "translate-x-1 bg-text-ghost/50"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-text-secondary">
                    {isPublicCampaign ? (
                      <span className="text-sage">Discoverable</span>
                    ) : (
                      <span className="text-text-ghost">Private</span>
                    )}
                  </span>
                  <span className="text-[10px] text-text-ghost/60">
                    {isPublicCampaign
                      ? "Listed in Browse"
                      : "Invite-only"}
                  </span>
                </div>

                {/* Transfer GM — only show if there are players to transfer to */}
                {characters.filter((c) => c.userId !== currentUserId).length > 0 && (
                  <details className="group">
                    <summary className="text-[10px] uppercase tracking-[0.12em] text-text-ghost/50 cursor-pointer hover:text-text-ghost transition-colors list-none flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      Transfer GM Role
                    </summary>
                    <div className="mt-2 bg-rose/5 border border-rose/10 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-text-ghost">
                        Hand the narrator role to another player. This cannot be undone — you will become a regular player.
                      </p>
                      <div className="space-y-1.5">
                        {[...new Map(characters.filter((c) => c.userId !== currentUserId).map((c) => [c.userId, c])).values()].map((c) => (
                          <button
                            key={c.userId}
                            onClick={async () => {
                              if (!confirm(`Transfer GM role to ${c.user?.displayName ?? c.name}? This cannot be undone.`)) return;
                              try {
                                const res = await fetch(`/api/stories/${storyId}/campaign/transfer-gm`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ newGmUserId: c.userId }),
                                });
                                if (!res.ok) {
                                  const err = await res.json();
                                  throw new Error(err.error?.message ?? "Failed to transfer");
                                }
                                alert(`GM role transferred to ${c.user?.displayName ?? c.name}. Refreshing...`);
                                window.location.reload();
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Failed to transfer GM role");
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-ink/30 border border-border/30 hover:border-rose/20 transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-paper/60">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm text-paper/80 block truncate">{c.user?.displayName ?? c.name}</span>
                              <span className="text-[10px] text-text-ghost">playing {c.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Memorial section — Characters Past */}
            {currentUserId && !isGM && userDeadOrRetiredChars.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-page p-5 space-y-3"
              >
                <h3 className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost/60">
                    <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                  Characters Past
                </h3>
                <div className="space-y-2">
                  {userDeadOrRetiredChars.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ink/30 border border-border/30">
                      {c.status === "dead" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose/50 shrink-0">
                          <circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" />
                          <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v2h10v-2c1.5-1 3-3 3-6a8 8 0 0 0-8-8z" />
                          <path d="M9 18v2a3 3 0 0 0 6 0v-2" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lavender/50 shrink-0">
                          <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                        </svg>
                      )}
                      <span className="text-sm text-paper/60">{c.name}</span>
                      <span className={`ml-auto px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border rounded-full ${
                        c.status === "dead"
                          ? "bg-rose/10 text-rose/60 border-rose/15"
                          : "bg-lavender/10 text-lavender/60 border-lavender/15"
                      }`}>
                        {c.status === "dead" ? "Fallen" : "Retired"}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Create character form (non-GM players who don't have an active character) */}
            {currentUserId && !userHasActiveCharacter && !isGM && (
              <div>
                {!showCreateChar ? (
                  <button
                    onClick={() => setShowCreateChar(true)}
                    className="w-full py-3 bg-amber/10 hover:bg-amber/15 border border-amber/20 rounded-2xl text-amber text-sm font-medium transition-colors cursor-pointer"
                  >
                    {isReplacementCharacter ? "Create a New Character" : "+ Create Your Character"}
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="card-page p-5 space-y-4 overflow-hidden"
                    >
                      <h3 className="text-sm font-semibold text-paper">
                        {isReplacementCharacter ? (
                          <span className="font-serif italic text-amber/90">A new face emerges from the crowd...</span>
                        ) : (
                          "Create Character"
                        )}
                      </h3>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Name</label>
                        <input
                          type="text"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                          placeholder="Character name"
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors"
                          onKeyDown={(e) => e.key === "Enter" && handleCreateCharacter()}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Who are they? <span className="normal-case tracking-normal text-text-ghost/60">(a line others can write them by)</span></label>
                        <textarea
                          value={charTraits}
                          onChange={(e) => setCharTraits(e.target.value)}
                          placeholder="Trusts no one but her blade, speaks in half-truths..."
                          rows={2}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Appearance & motivation</label>
                        <textarea
                          value={charDesc}
                          onChange={(e) => setCharDesc(e.target.value)}
                          placeholder="What do they look like? What drives them into danger?"
                          rows={3}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Backstory <span className="normal-case tracking-normal text-text-ghost/60">(optional)</span></label>
                        <textarea
                          value={charBackstory}
                          onChange={(e) => setCharBackstory(e.target.value)}
                          placeholder="What happened before this story? What shaped them?"
                          rows={3}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Portrait <span className="normal-case tracking-normal text-text-ghost/60">(optional — paste an image URL)</span></label>
                        <input
                          type="text"
                          value={charPortrait}
                          onChange={(e) => setCharPortrait(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors"
                        />
                      </div>

                      {/* Defining belief */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Defining belief <span className="normal-case tracking-normal text-text-ghost/60">(optional — one sentence that captures their essence)</span></label>
                        <input
                          type="text"
                          value={charAspect}
                          onChange={(e) => setCharAspect(e.target.value)}
                          placeholder="e.g. Believes every problem has a chemical solution"
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-violet/40 transition-colors"
                        />
                      </div>

                      {/* Approach — single choice, not point-buy */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">When things get dangerous, they tend to be... <span className="normal-case tracking-normal text-text-ghost/60">(optional)</span></label>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            ["Bold", "Direct, forceful, courageous — charges in head-first"],
                            ["Keen", "Clever, perceptive, strategic — thinks before acting"],
                            ["Subtle", "Graceful, quiet, precise — finds the hidden path"],
                          ] as const).map(([approach, desc]) => (
                            <button
                              key={approach}
                              type="button"
                              onClick={() => setCharApproach(charApproach === approach ? null : approach)}
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all cursor-pointer ${
                                charApproach === approach
                                  ? "bg-amber/10 border-2 border-amber/40 shadow-[0_0_12px_rgba(200,150,60,0.1)]"
                                  : "bg-ink/50 border border-border hover:border-white/20"
                              }`}
                            >
                              <span className={`text-xs font-semibold ${charApproach === approach ? "text-amber" : "text-paper/70"}`}>{approach}</span>
                              <span className="text-[9px] text-text-ghost/50 leading-tight">{desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handleCreateCharacter}
                          disabled={!charName.trim() || charSubmitting}
                          className="px-5 py-2 bg-amber text-void font-semibold rounded-xl text-sm disabled:opacity-40 hover:bg-amber/90 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {charSubmitting ? "Creating..." : "Create Character"}
                        </button>
                        <button
                          onClick={() => setShowCreateChar(false)}
                          className="px-4 py-2 text-text-ghost hover:text-text-secondary text-sm transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>
        </motion.section>
        )}

        {/* ── Next Session Poll ───────────────────────── */}
        {hasStarted && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
              Next Session
            </h2>
          </div>

          {/* Closed poll — confirmed time */}
          {!activePoll && latestClosedPoll?.confirmedOption && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-page p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage">
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-paper text-sm font-semibold">{latestClosedPoll.confirmedOption}</p>
                <p className="text-text-ghost text-[10px] mt-0.5">{latestClosedPoll.title}</p>
              </div>
              {isGM && (
                <button
                  onClick={() => setShowCreatePoll(true)}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-text-secondary hover:text-paper text-[11px] transition-colors cursor-pointer"
                >
                  New Poll
                </button>
              )}
            </motion.div>
          )}

          {/* Active poll */}
          {activePoll && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-page p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-paper font-serif italic">
                  {activePoll.title}
                </h3>
                <span className="text-[10px] text-text-ghost">
                  {activePoll.totalVoters} voted
                </span>
              </div>

              <div className="space-y-2">
                {activePoll.options.map((option, idx) => {
                  const count = activePoll.voteCounts[idx] ?? 0;
                  const isLeading = count > 0 && count === Math.max(...activePoll.voteCounts);
                  const isSelected = activePoll.myVotes.includes(idx);
                  const barWidth = activePoll.totalVoters > 0 ? (count / activePoll.totalVoters) * 100 : 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => handlePollVote(activePoll.id, idx)}
                      disabled={pollVoteLoading}
                      className={`w-full text-left relative overflow-hidden rounded-xl p-3 transition-all cursor-pointer border ${
                        isSelected
                          ? "border-amber/30 bg-amber/5"
                          : "border-border/50 bg-ink/30 hover:border-border"
                      } ${pollVoteLoading ? "opacity-60" : ""}`}
                    >
                      {/* Background bar */}
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                          isLeading ? "bg-amber/8" : "bg-surface/50"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />

                      <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-amber border-amber"
                              : "border-text-ghost/30"
                          }`}>
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-void">
                                <path d="M2 5l2.5 2.5L8 3" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm truncate ${isLeading ? "text-paper font-medium" : "text-text-secondary"}`}>
                            {option}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs tabular-nums ${isLeading ? "text-amber font-semibold" : "text-text-ghost"}`}>
                            {count}
                          </span>
                          {isGM && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClosePoll(activePoll.id, option);
                              }}
                              disabled={pollCloseLoading}
                              className="px-2 py-0.5 bg-sage/10 hover:bg-sage/20 border border-sage/20 text-sage text-[9px] uppercase tracking-wider font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {pollCloseLoading ? "..." : "Confirm"}
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* No poll — GM can create one */}
          {hasStarted && !activePoll && !latestClosedPoll?.confirmedOption && !showCreatePoll && isGM && (
            <button
              onClick={() => setShowCreatePoll(true)}
              className="w-full rounded-2xl border border-amber/20 bg-amber/[0.05] py-3 text-[13px] font-semibold text-amber transition-colors hover:bg-amber/10"
            >
              Schedule Next Session
            </button>
          )}

          {/* No poll — player sees nothing special */}
          {hasStarted && !activePoll && !latestClosedPoll?.confirmedOption && !isGM && (
            <div className="bg-surface/50 border border-border/50 border-dashed rounded-2xl p-6 text-center">
              <p className="text-text-ghost text-sm">No session scheduled yet. The GM will post a poll soon.</p>
            </div>
          )}

          {/* Create poll form (GM only) */}
          {showCreatePoll && isGM && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden rounded-2xl border border-amber/[0.16] bg-gradient-to-br from-surface/75 to-elevated/65 p-5 shadow-[0_22px_60px_-42px_rgba(0,0,0,0.55)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/70">
                      Set the night
                    </p>
                    <h3 className="mt-2 font-display text-[22px] text-paper">When should the lantern first light?</h3>
                  </div>
                  <span className="rounded-full border border-border bg-ink/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                    {pollOptions.filter((o) => o.trim()).length}/5 options
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Question</label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="When should we play next?"
                    className="w-full rounded-xl border border-border bg-ink/30 px-3 py-2.5 text-[14px] text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-amber/35"
                  />
                </div>

                <div className="mt-5 space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">Time options</label>
                  <div className="flex flex-wrap gap-2 pb-1">
                    {schedulePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const next = [...pollOptions];
                          const emptyIndex = next.findIndex((option) => !option.trim());
                          const targetIndex = emptyIndex >= 0 ? emptyIndex : next.length;
                          if (targetIndex >= 5) return;
                          next[targetIndex] = preset;
                          setPollOptions(next);
                        }}
                        className="rounded-full border border-amber/20 bg-amber/[0.04] px-3 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/10"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="group flex items-center gap-2 rounded-xl border border-border bg-ink/20 px-3 py-2 transition-colors focus-within:border-amber/35">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber/20 bg-amber/[0.04] font-mono text-[10px] text-amber/80">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={
                          idx === 0
                            ? "e.g. Saturday 8pm"
                            : idx === 1
                            ? "e.g. Sunday afternoon"
                            : `Option ${idx + 1}`
                        }
                        className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-paper outline-none placeholder:text-text-ghost/45"
                      />
                      <label className="relative shrink-0 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-text-ghost transition-colors hover:border-amber/30 hover:text-amber">
                        <input
                          type="datetime-local"
                          value={toDateTimeLocalValue(opt)}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[idx] = formatDateTimeOption(e.target.value);
                            setPollOptions(next);
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          aria-label={`Pick date and time for option ${idx + 1}`}
                        />
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M4 2v2M12 2v2M2.5 6h11M3 3.5h10a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
                          <path d="M6 9h.01M8 9h.01M10 9h.01M6 11.5h.01M8 11.5h.01" />
                        </svg>
                      </label>
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = pollOptions.filter((_, i) => i !== idx);
                            setPollOptions(next);
                          }}
                          className="rounded-md p-1.5 text-text-ghost opacity-70 transition-colors hover:text-rose group-hover:opacity-100"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 3l8 8M11 3l-8 8" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="mt-1 rounded-full border border-amber/20 bg-amber/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber/10"
                    >
                      Add another time
                    </button>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={handleCreatePoll}
                    disabled={pollOptions.filter((o) => o.trim()).length < 2 || pollSubmitting}
                    className="rounded-xl bg-amber px-5 py-2.5 text-[13px] font-bold text-void transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pollSubmitting ? "Creating..." : "Post time poll"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePoll(false);
                      setPollTitle("When should we play next?");
                      setPollOptions(["", ""]);
                    }}
                    className="px-3 py-2 text-[13px] text-text-ghost transition-colors hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.section>
        )}

        {/* ── Applicants (GM only) ─────────────────────── */}
        {isGM && (hasStarted || applications.length > 0) && (
          <motion.section
            id="campaign-applications"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                Applicants
              </h2>
              <span className="text-[10px] text-text-ghost">
                {applications.length} application{applications.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {applications.map((app) => {
                  const isPending = app.status === "pending";
                  const isVoting = app.status === "voting";
                  const isExpanded = expandedPitch === app.id;
                  const pitchTruncated = app.pitch && app.pitch.length > 120;

                  // Calculate countdown for voting deadline
                  let countdownText = "";
                  if (isVoting && app.votingDeadline) {
                    const remaining = new Date(app.votingDeadline).getTime() - Date.now();
                    if (remaining > 0) {
                      const hours = Math.floor(remaining / (1000 * 60 * 60));
                      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                      countdownText = `${hours}h ${minutes}m remaining`;
                    } else {
                      countdownText = "Voting ended";
                    }
                  }

                  const APP_STATUS_STYLES: Record<string, string> = {
                    pending: "bg-amber/15 text-amber border-amber/20",
                    voting: "bg-violet/15 text-violet border-violet/20",
                    approved: "bg-sage/15 text-sage border-sage/20",
                    declined: "bg-rose/15 text-rose border-rose/20",
                  };

                  return (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="card-page p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {app.user.avatarUrl ? (
                            <Image src={app.user.avatarUrl} alt={app.user.displayName || ""} fill sizes="40px" className="object-cover" unoptimized />
                          ) : (
                            <span className="text-sm font-display text-text-ghost">
                              {(app.user.displayName || "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Name & date */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-paper text-sm truncate">
                              {app.user.displayName || "Anonymous"}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border rounded-full ${APP_STATUS_STYLES[app.status] ?? APP_STATUS_STYLES.pending}`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-text-ghost text-[10px] mt-0.5">
                            Applied {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>

                      {(app.characterName || app.characterArchetype || app.characterKnownFor || app.characterPortrait) && (
                        <div className="rounded-xl border border-border-subtle bg-ink/30 p-3">
                          <div className="flex items-start gap-3">
                            {app.characterPortrait && (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber/20 bg-amber/[0.06]">
                                <Image src={app.characterPortrait} alt={app.characterName || "Character portrait"} fill sizes="48px" className="object-cover" unoptimized />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {app.characterName && (
                                  <span className="font-display text-[15px] text-paper">{app.characterName}</span>
                                )}
                                {app.characterArchetype && (
                                  <span className="rounded-full border border-amber/20 bg-amber/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber">
                                    {app.characterArchetype}
                                  </span>
                                )}
                              </div>
                              {app.characterKnownFor && (
                                <p className="mt-2 font-reading text-[13px] italic text-text-secondary">
                                  &ldquo;{app.characterKnownFor}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {app.playerCadence && <ApplicantPill>{app.playerCadence}</ApplicantPill>}
                            {app.playerSpotlight && (
                              <ApplicantPill>
                                {APPLICATION_SPOTLIGHT_LABELS[app.playerSpotlight] ?? app.playerSpotlight}
                              </ApplicantPill>
                            )}
                            {app.voiceCadence && app.voiceMood && (
                              <ApplicantPill>{app.voiceCadence} · {app.voiceMood}</ApplicantPill>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pitch text */}
                      {app.pitch && (
                        <div>
                          <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                            {!isExpanded && pitchTruncated
                              ? app.pitch.slice(0, 120) + "..."
                              : app.pitch}
                          </p>
                          {pitchTruncated && (
                            <button
                              onClick={() => setExpandedPitch(isExpanded ? null : app.id)}
                              className="text-amber text-[11px] mt-1 hover:text-amber-light transition-colors cursor-pointer"
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Voting info */}
                      {isVoting && (
                        <div className="flex items-center gap-4 text-[11px]">
                          {app.voteCount && (
                            <div className="flex items-center gap-3">
                              <span className="text-sage">
                                {app.voteCount.yes} yes
                              </span>
                              <span className="text-rose">
                                {app.voteCount.no} no
                              </span>
                            </div>
                          )}
                          {countdownText && (
                            <span className="text-text-ghost">
                              {countdownText}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {(isPending || isVoting) && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApplicationAction(app.id, "approved")}
                            disabled={actionLoading === app.id}
                            className="px-3.5 py-1.5 bg-sage/15 hover:bg-sage/25 border border-sage/20 text-sage text-[12px] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {actionLoading === app.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleApplicationAction(app.id, "declined")}
                            disabled={actionLoading === app.id}
                            className="px-3.5 py-1.5 bg-rose/10 hover:bg-rose/20 border border-rose/20 text-rose text-[12px] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Decline
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleApplicationAction(app.id, "voting")}
                              disabled={actionLoading === app.id}
                              className="px-3.5 py-1.5 bg-violet/10 hover:bg-violet/20 border border-violet/20 text-violet text-[12px] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Put to Vote
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {applications.length === 0 && (
                <div className="bg-surface/50 border border-border/50 border-dashed rounded-2xl p-8 text-center">
                  <p className="text-text-ghost text-sm">No applications yet.</p>
                  <p className="text-text-ghost/60 text-xs mt-1">
                    Make sure your campaign is public so players can discover and apply.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ── Sessions List ──────────────────────────────── */}
        {(hasStarted || sessions.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
              Sessions
            </h2>
            <span className="text-[10px] text-text-ghost">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-3">
            {sessions.map((s) => {
              const isDraft = s.status === "draft";
              const isCompleted = s.status === "completed";
              const isClickable = !isDraft;

              return (
                <motion.div
                  key={s.id}
                  layout
                  onClick={() => isClickable && router.push(`/campaign/${storyId}/play/${s.id}`)}
                  className={`w-full text-left card-page p-4 transition-all group ${isClickable ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? "bg-white/[0.03]" : "bg-ink"}`}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={isDraft ? "text-lavender" : isCompleted ? "text-white/30" : "text-amber"}>
                          <path d="M2 3l6 2.5L14 3v10l-6 2.5L2 13V3z" />
                          <path d="M8 5.5v10" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className={`font-semibold text-sm transition-colors truncate block ${isCompleted ? "text-paper/60" : "text-paper"} ${isClickable ? "group-hover:text-amber" : ""}`}>
                          {s.title}
                        </span>
                        <span className="text-text-ghost text-xs">{s.turnCount} turn{s.turnCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border rounded-full ${SESSION_STATUS_STYLES[s.status] ?? SESSION_STATUS_STYLES.active}`}>
                        {s.status}
                      </span>
                      {isDraft ? (
                        isGM ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBeginSession(s.id);
                            }}
                            disabled={beginningSessionId === s.id}
                            className="px-3 py-1.5 bg-amber text-void font-semibold rounded-lg text-xs hover:bg-amber/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {beginningSessionId === s.id ? "Starting..." : "Begin Session"}
                          </button>
                        ) : (
                          <span className="text-text-ghost text-xs italic">Preparing...</span>
                        )
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost group-hover:text-amber transition-colors">
                          <path d="M5 3l4 4-4 4" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Epilogue recap for completed sessions */}
                  {isCompleted && s.epilogue && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-text-ghost/70 font-serif italic leading-relaxed">
                        <span className="text-amber/30 mr-0.5">&ldquo;</span>
                        {s.epilogue.length > 150 ? s.epilogue.slice(0, 150).trimEnd() + "..." : s.epilogue}
                        <span className="text-amber/30 ml-0.5">&rdquo;</span>
                      </p>
                    </div>
                  )}

                  {/* Compile to chapter / View chapter button (GM only, completed sessions) */}
                  {isCompleted && isGM && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      {s.chapterId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/write/${storyId}?chapter=${s.chapterId}`);
                          }}
                          className="flex items-center gap-2 text-xs text-sage hover:text-sage/80 transition-colors cursor-pointer"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3l6 2.5L14 3v10l-6 2.5L2 13V3z" />
                            <path d="M8 5.5v10" />
                          </svg>
                          View compiled chapter
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompileSession(s.id);
                          }}
                          disabled={compilingSessionId === s.id}
                          className="flex items-center gap-2 text-xs text-amber hover:text-amber/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3l6 2.5L14 3v10l-6 2.5L2 13V3z" />
                            <path d="M8 5.5v10" />
                          </svg>
                          {compilingSessionId === s.id ? "Compiling..." : "Compile to chapter"}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {sessions.length === 0 && (
              <div className="bg-surface/50 border border-border/50 border-dashed rounded-2xl p-8 text-center">
                <p className="text-text-ghost text-sm">
                  {isGM ? "Create your first session to begin the adventure." : "The GM hasn't started any sessions yet."}
                </p>
              </div>
            )}

            {/* New session form (GM only) */}
            {isGM && (
              <div>
                {!showNewSession ? (
                  <button
                    onClick={() => setShowNewSession(true)}
                    className="w-full py-3 bg-amber/10 hover:bg-amber/15 border border-amber/20 rounded-2xl text-amber text-sm font-medium transition-colors cursor-pointer"
                  >
                    + New Session
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="card-page p-5 space-y-4 overflow-hidden"
                    >
                      <h3 className="text-sm font-semibold text-paper">New Session</h3>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Title</label>
                        <input
                          type="text"
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          placeholder="Session title"
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors"
                          onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Opening Narration <span className="normal-case tracking-normal text-text-ghost/60">(optional)</span></label>
                        <textarea
                          value={sessionOpening}
                          onChange={(e) => setSessionOpening(e.target.value)}
                          placeholder="Set the scene for your players..."
                          rows={3}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                        <p className="text-[9px] text-text-ghost/50 italic">This will play as a cinematic moment when you begin the session, and become the first turn of the story.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCreateSession}
                          disabled={!sessionTitle.trim() || sessionSubmitting}
                          className="px-5 py-2 bg-amber text-void font-semibold rounded-xl text-sm disabled:opacity-40 hover:bg-amber/90 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {sessionSubmitting ? "Creating..." : "Create Session"}
                        </button>
                        <button
                          onClick={() => setShowNewSession(false)}
                          className="px-4 py-2 text-text-ghost hover:text-text-secondary text-sm transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>
        </motion.section>
        )}
      </div>
    </div>
  );
}
