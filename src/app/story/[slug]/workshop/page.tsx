"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AgreementTab } from "@/components/workshop/AgreementTab";
import { TeamTab } from "@/components/workshop/TeamTab";
import { SuggestionsTab } from "@/components/workshop/SuggestionsTab";
import { LoreBookTab } from "@/components/workshop/LoreBookTab";
import type { ApiStoryData, ApiCollaborator } from "@/types/api";

// ── Types ───────────────────────────────────────────────────

interface Suggestion {
  id: string;
  storyId: string;
  chapterId: string;
  userId: string;
  content: string;
  note: string | null;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface LoreEntry {
  id: string;
  storyId: string;
  userId: string;
  category: string;
  title: string;
  content: string;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

// ── Constants ───────────────────────────────────────────────

type Tab = "team" | "suggestions" | "lore" | "agreement";

const TABS: { key: Tab; label: string }[] = [
  { key: "team", label: "Team" },
  { key: "agreement", label: "Agreement" },
  { key: "suggestions", label: "Suggestions" },
  { key: "lore", label: "Lore Book" },
];


// ── Component ───────────────────────────────────────────────

function WorkshopContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const slug = params.slug as string;
  const isSetupMode = searchParams.get("setup") === "true";
  const fromEditor = searchParams.get("from") === "editor";
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [showRosterNudge, setShowRosterNudge] = useState(false);

  // Core state
  const [story, setStory] = useState<ApiStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("team");

  // Team state
  const [collaborators, setCollaborators] = useState<ApiCollaborator[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("writer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionChapterId, setSuggestionChapterId] = useState("");
  const [suggestionContent, setSuggestionContent] = useState("");
  const [suggestionNote, setSuggestionNote] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Lore state
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [loreLoading, setLoreLoading] = useState(false);
  const [loreLoaded, setLoreLoaded] = useState(false);
  const [showLoreForm, setShowLoreForm] = useState(false);
  const [loreCategory, setLoreCategory] = useState<string>("character");
  const [loreTitle, setLoreTitle] = useState("");
  const [loreContent, setLoreContent] = useState("");
  const [submittingLore, setSubmittingLore] = useState(false);
  const [expandedLore, setExpandedLore] = useState<Set<string>>(new Set());
  const [editingLore, setEditingLore] = useState<string | null>(null);
  const [editLoreCategory, setEditLoreCategory] = useState("");
  const [editLoreTitle, setEditLoreTitle] = useState("");
  const [editLoreContent, setEditLoreContent] = useState("");

  const isOwner = session?.user?.id === story?.userId;

  // ── Fetch Story ─────────────────────────────────────────────

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    async function fetchStory() {
      try {
        const res = await fetch(`/api/stories/by-slug/${slug}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message || "Story not found");
          return;
        }
        const storyData = json.data;
        setStory(storyData);

        // Check access: owner or collaborator
        if (storyData.userId === session!.user!.id) {
          // Owner — full access
          return;
        }

        // Check collaborator access
        const collabRes = await fetch(
          `/api/stories/${storyData.id}/collaborators`
        );
        if (collabRes.ok) {
          const collabJson = await collabRes.json();
          const isCollab = (collabJson.data as ApiCollaborator[]).some(
            (c) =>
              c.userId === session!.user!.id &&
              c.status === "accepted"
          );
          if (!isCollab) {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug, session, sessionStatus, router]);

  // ── Fetch Team (lazy) ─────────────────────────────────────

  const fetchTeam = useCallback(async () => {
    if (!story || teamLoaded) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/collaborators`);
      if (res.ok) {
        const json = await res.json();
        setCollaborators(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setTeamLoading(false);
      setTeamLoaded(true);
    }
  }, [story, teamLoaded]);

  useEffect(() => {
    if (activeTab === "team" && story && !teamLoaded) {
      fetchTeam();
    }
  }, [activeTab, story, teamLoaded, fetchTeam]);

  // ── Fetch Suggestions (lazy) ──────────────────────────────

  const fetchSuggestions = useCallback(async () => {
    if (!story || suggestionsLoaded) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/suggestions`);
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setSuggestionsLoading(false);
      setSuggestionsLoaded(true);
    }
  }, [story, suggestionsLoaded]);

  useEffect(() => {
    if (activeTab === "suggestions" && story && !suggestionsLoaded) {
      fetchSuggestions();
    }
  }, [activeTab, story, suggestionsLoaded, fetchSuggestions]);

  // ── Fetch Lore (lazy) ─────────────────────────────────────

  const fetchLore = useCallback(async () => {
    if (!story || loreLoaded) return;
    setLoreLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/lore`);
      if (res.ok) {
        const json = await res.json();
        setLoreEntries(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoreLoading(false);
      setLoreLoaded(true);
    }
  }, [story, loreLoaded]);

  useEffect(() => {
    if (activeTab === "lore" && story && !loreLoaded) {
      fetchLore();
    }
  }, [activeTab, story, loreLoaded, fetchLore]);

  // Preload team when switching to agreement tab
  useEffect(() => {
    if (activeTab === "agreement" && story && !teamLoaded) {
      fetchTeam();
    }
  }, [activeTab, story, teamLoaded, fetchTeam]);

  // ── Actions ───────────────────────────────────────────────

  const handleInvite = async () => {
    if (!story || inviting || !inviteUserId.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: inviteUserId.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error?.message || "Failed to invite");
        return;
      }
      // Refresh team list
      setTeamLoaded(false);
      setInviteUserId("");
      setInviteRole("writer");
      setShowInviteForm(false);
    } catch {
      setInviteError("Failed to invite collaborator");
    } finally {
      setInviting(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!story || submittingSuggestion || !suggestionContent.trim() || !suggestionChapterId) return;
    setSubmittingSuggestion(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: suggestionChapterId,
          content: suggestionContent.trim(),
          note: suggestionNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setSuggestions((prev) => [{ ...json.data, user: { id: session!.user!.id!, displayName: session!.user!.name || null, avatarUrl: null } }, ...prev]);
        setSuggestionChapterId("");
        setSuggestionContent("");
        setSuggestionNote("");
        setShowSuggestionForm(false);
      }
    } catch {
      // silent
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const handleReviewSuggestion = async (
    suggestionId: string,
    status: "woven" | "passed"
  ) => {
    if (!story || reviewingId) return;
    setReviewingId(suggestionId);
    try {
      const res = await fetch(
        `/api/stories/${story.id}/suggestions/${suggestionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            reviewNote: reviewNotes[suggestionId]?.trim() || undefined,
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? { ...s, ...json.data } : s))
        );
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[suggestionId];
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      setReviewingId(null);
    }
  };

  const handleAddLore = async () => {
    if (!story || submittingLore || !loreTitle.trim()) return;
    setSubmittingLore(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/lore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: loreCategory,
          title: loreTitle.trim(),
          content: loreContent.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setLoreEntries((prev) => [
          ...prev,
          { ...json.data, user: { id: session!.user!.id!, displayName: session!.user!.name || null, avatarUrl: null } },
        ]);
        setLoreTitle("");
        setLoreContent("");
        setLoreCategory("character");
        setShowLoreForm(false);
      }
    } catch {
      // silent
    } finally {
      setSubmittingLore(false);
    }
  };

  const handleEditLore = async (entryId: string) => {
    if (!story) return;
    try {
      const res = await fetch(`/api/stories/${story.id}/lore/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editLoreCategory,
          title: editLoreTitle.trim(),
          content: editLoreContent.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setLoreEntries((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, ...json.data } : e))
        );
        setEditingLore(null);
      }
    } catch {
      // silent
    }
  };

  const handleDeleteLore = async (entryId: string) => {
    if (!story) return;
    try {
      const res = await fetch(`/api/stories/${story.id}/lore/${entryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLoreEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch {
      // silent
    }
  };

  // ── Render helpers ────────────────────────────────────────

  const getChapterTitle = (chapterId: string): string => {
    const ch = story?.chapters.find((c) => c.id === chapterId);
    return ch?.title || "Unknown Chapter";
  };

  // Group lore entries by category
  const loreByCategory = loreEntries.reduce<Record<string, LoreEntry[]>>(
    (acc, entry) => {
      const cat = entry.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    },
    {}
  );

  // ── Loading state ─────────────────────────────────────────

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────

  if (error || !story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-rose/10 border border-rose/15" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose/50">
              <circle cx="14" cy="14" r="10" />
              <path d="M14 9v6M14 19v.5" />
            </svg>
          </div>
        </div>
        <h2 className="font-display text-2xl text-paper mb-2">Story not found</h2>
        <p className="text-text-secondary text-[13px] mb-6">
          {error || "This story may have been removed or doesn't exist."}
        </p>
        <Link href="/browse" className="text-amber hover:text-amber-light transition-colors text-[13px]">
          Browse stories
        </Link>
      </div>
    );
  }

  // ── Access denied ─────────────────────────────────────────

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-amber/10 border border-amber/15" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/50">
              <rect x="7" y="12" width="14" height="10" rx="2" />
              <path d="M10 12V9a4 4 0 018 0v3" />
            </svg>
          </div>
        </div>
        <h2 className="font-display text-2xl text-paper mb-2">Access required</h2>
        <p className="text-text-secondary text-[13px] mb-6">
          You need to be a collaborator or the story owner to access the workshop.
        </p>
        <Link
          href={`/story/${slug}`}
          className="text-amber hover:text-amber-light transition-colors text-[13px]"
        >
          Back to story
        </Link>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-3">
          <Link
            href={`/story/${slug}`}
            className="text-text-ghost hover:text-amber transition-colors text-[12px] flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to story
          </Link>
          {fromEditor && isOwner && story && (
            <Link
              href={`/write/${story.id}`}
              className="text-text-ghost hover:text-teal transition-colors text-[12px] flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Back to editor
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 px-2.5 py-1 rounded-full border border-border">
            Workshop
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-paper font-bold mt-3">
          {story.title}
        </h1>
        <p className="text-text-secondary text-[13px] mt-2">
          Collaboration workspace for the team
        </p>
      </motion.div>

      {/* Setup Banner — shown when redirected from create page */}
      {isSetupMode && !setupDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 relative overflow-hidden rounded-xl border border-teal/20 bg-teal/[0.04] p-5"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal/8 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/15 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                <circle cx="9" cy="7" r="4" />
                <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                <path d="M19 8v6M16 11h6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-paper text-[14px] font-display font-semibold mb-1">
                Build your team to start writing
              </h3>
              <p className="text-text-secondary text-[12px] leading-relaxed">
                Invite at least one collaborator below, or browse the Roster to find
                writers, illustrators, editors and worldbuilders looking for projects.
              </p>
              <div className="flex items-center gap-3 mt-3">
                {teamLoaded && collaborators.some((c) => c.status === "accepted") && (
                  <Link
                    href={`/write/${story.id}/co-op`}
                    className="px-4 py-1.5 bg-teal text-void font-semibold text-[12px] rounded-full hover:bg-teal/90 transition-all"
                  >
                    Start Writing
                  </Link>
                )}
                <Link
                  href="/roster"
                  className="flex items-center gap-1.5 text-amber text-[12px] hover:text-amber-light transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="6.5" cy="6.5" r="5" />
                    <path d="M10.5 10.5L14 14" />
                  </svg>
                  Browse the Roster
                </Link>
                <button
                  onClick={() => setSetupDismissed(true)}
                  className="text-text-ghost text-[11px] hover:text-text-secondary transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Roster Nudge — shown after accepting a collaboration invite */}
      <AnimatePresence>
        {showRosterNudge && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="relative rounded-xl border border-amber/20 bg-amber/[0.04] p-5">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber/8 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-paper text-[14px] font-display font-semibold mb-1">
                    You&apos;re a collaborator now!
                  </h3>
                  <p className="text-text-secondary text-[12px] leading-relaxed">
                    Want other creators to find you for future projects? Post your card on the Roster
                    so people can discover your work.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Link
                      href="/roster/setup"
                      className="px-4 py-1.5 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all"
                    >
                      Post Your Card
                    </Link>
                    <button
                      onClick={() => setShowRosterNudge(false)}
                      className="text-text-ghost text-[11px] hover:text-text-secondary transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative shrink-0 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === t.key
                ? "text-amber"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <motion.div
                layoutId="workshop-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ═══ TEAM TAB ═══ */}
        {activeTab === "team" && (
          <TeamTab
            storyId={story.id}
            isOwner={isOwner}
            sessionUserId={session?.user?.id}
            collaborators={collaborators}
            teamLoading={teamLoading}
            showInviteForm={showInviteForm}
            setShowInviteForm={setShowInviteForm}
            inviteUserId={inviteUserId}
            setInviteUserId={setInviteUserId}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            inviting={inviting}
            inviteError={inviteError}
            setInviteError={setInviteError}
            handleInvite={handleInvite}
            setTeamLoaded={setTeamLoaded}
            setShowRosterNudge={setShowRosterNudge}
          />
        )}

        {/* ═══ SUGGESTIONS TAB ═══ */}
        {activeTab === "suggestions" && (
          <SuggestionsTab
            isOwner={isOwner}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            showSuggestionForm={showSuggestionForm}
            setShowSuggestionForm={setShowSuggestionForm}
            suggestionChapterId={suggestionChapterId}
            setSuggestionChapterId={setSuggestionChapterId}
            suggestionContent={suggestionContent}
            setSuggestionContent={setSuggestionContent}
            suggestionNote={suggestionNote}
            setSuggestionNote={setSuggestionNote}
            submittingSuggestion={submittingSuggestion}
            handleSubmitSuggestion={handleSubmitSuggestion}
            reviewNotes={reviewNotes}
            setReviewNotes={setReviewNotes}
            reviewingId={reviewingId}
            handleReviewSuggestion={handleReviewSuggestion}
            chapters={story.chapters}
            getChapterTitle={getChapterTitle}
          />
        )}

        {/* ═══ LORE BOOK TAB ═══ */}
        {activeTab === "lore" && (
          <LoreBookTab
            isOwner={isOwner}
            sessionUserId={session?.user?.id}
            loreEntries={loreEntries}
            loreLoading={loreLoading}
            loreByCategory={loreByCategory}
            showLoreForm={showLoreForm}
            setShowLoreForm={setShowLoreForm}
            loreCategory={loreCategory}
            setLoreCategory={setLoreCategory}
            loreTitle={loreTitle}
            setLoreTitle={setLoreTitle}
            loreContent={loreContent}
            setLoreContent={setLoreContent}
            submittingLore={submittingLore}
            handleAddLore={handleAddLore}
            expandedLore={expandedLore}
            setExpandedLore={setExpandedLore}
            editingLore={editingLore}
            setEditingLore={setEditingLore}
            editLoreCategory={editLoreCategory}
            setEditLoreCategory={setEditLoreCategory}
            editLoreTitle={editLoreTitle}
            setEditLoreTitle={setEditLoreTitle}
            editLoreContent={editLoreContent}
            setEditLoreContent={setEditLoreContent}
            handleEditLore={handleEditLore}
            handleDeleteLore={handleDeleteLore}
          />
        )}

        {/* ═══ AGREEMENT TAB ═══ */}
        {activeTab === "agreement" && (
          <motion.div
            key="agreement"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AgreementTab
              story={story}
              session={session}
              collaborators={collaborators}
              isOwner={isOwner}
              teamLoaded={teamLoaded}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void" />}>
      <WorkshopContent />
    </Suspense>
  );
}
