"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import type { ApiStoryData } from "@/types/api";

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
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  epilogue?: string | null;
  closingMood?: string | null;
}

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

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const userHasActiveCharacter = characters.some((c) => c.userId === currentUserId && c.status === "active");
  const userCharacters = characters.filter((c) => c.userId === currentUserId);
  const userDeadOrRetiredChars = userCharacters.filter((c) => c.status === "dead" || c.status === "retired");
  const isReplacementCharacter = userDeadOrRetiredChars.length > 0 && !userHasActiveCharacter;
  const isPublicCampaign = story?.isPublic ?? false;

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

  const activePoll = polls.find((p) => p.status === "open");
  const closedPolls = polls.filter((p) => p.status === "closed");
  const latestClosedPoll = closedPolls.length > 0 ? closedPolls[0] : null;

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
    } catch (err) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
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

        {/* ── Players Panel ──────────────────────────────── */}
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
            {isGM && (
              <div className="space-y-3">
                <div className="bg-violet/5 border border-violet/10 rounded-2xl p-4 text-center">
                  <p className="text-text-secondary text-sm">
                    Share this campaign link with players so they can create characters and join.
                  </p>
                  <p className="text-text-ghost text-xs mt-1 font-mono">
                    /campaign/{storyId}
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

        {/* ── Next Session Poll ───────────────────────── */}
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
                  const maxCount = Math.max(...activePoll.voteCounts, 1);
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
          {!activePoll && !latestClosedPoll?.confirmedOption && !showCreatePoll && isGM && (
            <button
              onClick={() => setShowCreatePoll(true)}
              className="w-full py-3 bg-violet/10 hover:bg-violet/15 border border-violet/20 rounded-2xl text-violet text-sm font-medium transition-colors cursor-pointer"
            >
              Schedule Next Session
            </button>
          )}

          {/* No poll — player sees nothing special */}
          {!activePoll && !latestClosedPoll?.confirmedOption && !isGM && (
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
                className="card-page p-5 space-y-4 overflow-hidden mt-3"
              >
                <h3 className="text-sm font-semibold text-paper">Schedule a Session</h3>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Question</label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="When should we play next?"
                    className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-violet/40 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Time Options</label>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
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
                        className="flex-1 px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-violet/40 transition-colors"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => {
                            const next = pollOptions.filter((_, i) => i !== idx);
                            setPollOptions(next);
                          }}
                          className="p-1.5 text-text-ghost hover:text-rose transition-colors cursor-pointer"
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
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-violet text-[11px] hover:text-violet/80 transition-colors cursor-pointer"
                    >
                      + Add option
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleCreatePoll}
                    disabled={pollOptions.filter((o) => o.trim()).length < 2 || pollSubmitting}
                    className="px-5 py-2 bg-violet text-white font-semibold rounded-xl text-sm disabled:opacity-40 hover:bg-violet/90 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {pollSubmitting ? "Creating..." : "Create Poll"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreatePoll(false);
                      setPollTitle("When should we play next?");
                      setPollOptions(["", ""]);
                    }}
                    className="px-4 py-2 text-text-ghost hover:text-text-secondary text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.section>

        {/* ── Applicants (GM only) ─────────────────────── */}
        {isGM && (
          <motion.section
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
      </div>
    </div>
  );
}
