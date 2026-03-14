"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────

interface Author {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface StoryData {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  writingMode: string;
  author: Author | null;
}

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

  const [story, setStory] = useState<StoryData | null>(null);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPitch, setExpandedPitch] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Character creation form
  const [showCreateChar, setShowCreateChar] = useState(false);
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [charTraits, setCharTraits] = useState("");
  const [charSubmitting, setCharSubmitting] = useState(false);

  // Character stats (approaches + aspect)
  const [showStats, setShowStats] = useState(false);
  const [statBold, setStatBold] = useState(0);
  const [statKeen, setStatKeen] = useState(0);
  const [statSubtle, setStatSubtle] = useState(0);
  const [charAspect, setCharAspect] = useState("");
  const pointsUsed = statBold + statKeen + statSubtle + 3; // each starts at -1, so +3 offset
  const pointsRemaining = 3 - (statBold + 1) - (statKeen + 1) - (statSubtle + 1);

  // New session form
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionOpening, setSessionOpening] = useState("");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [beginningSessionId, setBeginningSessionId] = useState<string | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const userHasCharacter = characters.some((c) => c.userId === currentUserId);

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [storyRes, charsRes, sessionsRes, appsRes] = await Promise.all([
        fetch(`/api/stories/${storyId}`),
        fetch(`/api/stories/${storyId}/campaign/characters`),
        fetch(`/api/stories/${storyId}/campaign/sessions`),
        fetch(`/api/stories/${storyId}/campaign/applications`),
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
      const payload: Record<string, unknown> = {
        name: charName.trim(),
        description: charDesc.trim(),
        traits: charTraits.trim(),
      };
      if (showStats) {
        payload.stats = JSON.stringify({
          approaches: { Bold: statBold, Keen: statKeen, Subtle: statSubtle },
          aspect: charAspect.trim(),
        });
      }
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
      setShowStats(false);
      setStatBold(0); setStatKeen(0); setStatSubtle(0);
      setCharAspect("");
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
                <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {char.portrait ? (
                    <img src={char.portrait} alt={char.name} className="w-full h-full object-cover" />
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

            {/* GM invite hint */}
            {isGM && (
              <div className="bg-violet/5 border border-violet/10 rounded-2xl p-4 text-center">
                <p className="text-text-secondary text-sm">
                  Share this campaign link with players so they can create characters and join.
                </p>
                <p className="text-text-ghost text-xs mt-1 font-mono">
                  /campaign/{storyId}
                </p>
              </div>
            )}

            {/* Create character form (non-GM players who don't have a character yet) */}
            {currentUserId && !userHasCharacter && !isGM && (
              <div>
                {!showCreateChar ? (
                  <button
                    onClick={() => setShowCreateChar(true)}
                    className="w-full py-3 bg-amber/10 hover:bg-amber/15 border border-amber/20 rounded-2xl text-amber text-sm font-medium transition-colors cursor-pointer"
                  >
                    + Create Your Character
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="card-page p-5 space-y-4 overflow-hidden"
                    >
                      <h3 className="text-sm font-semibold text-paper">Create Character</h3>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Name</label>
                        <input
                          type="text"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                          placeholder="Character name"
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Description</label>
                        <textarea
                          value={charDesc}
                          onChange={(e) => setCharDesc(e.target.value)}
                          placeholder="What does your character look like? What drives them?"
                          rows={3}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Traits</label>
                        <textarea
                          value={charTraits}
                          onChange={(e) => setCharTraits(e.target.value)}
                          placeholder="Brave, cunning, has a weakness for pastries..."
                          rows={2}
                          className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none"
                        />
                      </div>

                      {/* Collapsible Character Identity */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowStats(!showStats)}
                          className="flex items-center gap-2 text-sm text-text-secondary hover:text-paper transition-colors cursor-pointer"
                        >
                          <motion.svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            animate={{ rotate: showStats ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <path d="M4 2l4 4-4 4" />
                          </motion.svg>
                          Define identity
                        </button>

                        <AnimatePresence>
                          {showStats && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 space-y-4">
                                {/* Aspect */}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Aspect</label>
                                  <p className="text-[10px] text-text-ghost/50 mb-1">A defining phrase — who your character truly is. Invoke it during rolls for +1.</p>
                                  <input
                                    type="text"
                                    value={charAspect}
                                    onChange={(e) => setCharAspect(e.target.value)}
                                    placeholder="e.g. Believes every problem has a chemical solution"
                                    className="w-full px-3 py-2 bg-ink border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-violet/40 transition-colors"
                                  />
                                </div>

                                {/* Approaches */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">Approaches</label>
                                    <span className={`text-[10px] ${pointsRemaining < 0 ? "text-rose" : pointsRemaining === 0 ? "text-sage" : "text-text-ghost"}`}>
                                      {pointsRemaining} points left
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-text-ghost/50 mb-2">Distribute 3 points. Each starts at -1. How does your character solve problems?</p>
                                  <div className="grid grid-cols-3 gap-3">
                                    {([
                                      ["Bold", "Force & courage", statBold, setStatBold],
                                      ["Keen", "Wit & cunning", statKeen, setStatKeen],
                                      ["Subtle", "Grace & finesse", statSubtle, setStatSubtle],
                                    ] as [string, string, number, React.Dispatch<React.SetStateAction<number>>][]).map(([label, desc, value, setter]) => (
                                      <div key={label} className="flex flex-col items-center gap-1.5 bg-ink/50 border border-border rounded-xl p-3">
                                        <span className="text-[10px] uppercase tracking-[0.1em] text-text-ghost/70 font-medium">{label}</span>
                                        <span className="text-[8px] text-text-ghost/40">{desc}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <button
                                            type="button"
                                            onClick={() => setter(Math.max(-1, value - 1))}
                                            className="w-6 h-6 rounded bg-surface border border-border text-text-ghost hover:text-paper text-sm flex items-center justify-center cursor-pointer"
                                          >-</button>
                                          <span className={`text-lg font-display w-8 text-center ${value > 0 ? "text-amber" : value < 0 ? "text-rose/60" : "text-paper"}`}>
                                            {value >= 0 ? `+${value}` : value}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setter(Math.min(2, value + 1))}
                                            className="w-6 h-6 rounded bg-surface border border-border text-text-ghost hover:text-paper text-sm flex items-center justify-center cursor-pointer"
                                          >+</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
                        <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {app.user.avatarUrl ? (
                            <img src={app.user.avatarUrl} alt={app.user.displayName || ""} className="w-full h-full object-cover" />
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
                  className={`w-full text-left card-page p-4 transition-all group ${isClickable ? "cursor-pointer" : ""} ${isCompleted ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={isDraft ? "text-lavender" : "text-amber"}>
                          <path d="M2 3l6 2.5L14 3v10l-6 2.5L2 13V3z" />
                          <path d="M8 5.5v10" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className={`font-semibold text-paper text-sm transition-colors truncate block ${isClickable ? "group-hover:text-amber" : ""}`}>
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
