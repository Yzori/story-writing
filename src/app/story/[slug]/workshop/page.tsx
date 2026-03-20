"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AgreementTab } from "@/components/workshop/AgreementTab";

// ── Types ───────────────────────────────────────────────────

interface StoryData {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  chapters: { id: string; title: string; sortOrder: number }[];
}

interface Collaborator {
  id: string;
  storyId: string;
  userId: string;
  role: string;
  status: string;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

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
  { key: "suggestions", label: "Suggestions" },
  { key: "lore", label: "Lore Book" },
  { key: "agreement", label: "Agreement" },
];

const ROLE_OPTIONS = ["writer", "illustrator", "editor", "worldbuilder"] as const;

const ROLE_LABELS: Record<string, string> = {
  writer: "Writer",
  illustrator: "Illustrator",
  editor: "Editor",
  worldbuilder: "Worldbuilder",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber/10 text-amber border-amber/20",
  accepted: "bg-sage/10 text-sage border-sage/20",
  declined: "bg-rose/10 text-rose border-rose/20",
};

const SUGGESTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber/10 text-amber border-amber/20",
  woven: "bg-sage/10 text-sage border-sage/20",
  revised: "bg-lavender/10 text-lavender border-lavender/20",
  passed: "bg-rose/10 text-rose border-rose/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  character: "bg-amber/10 text-amber border-amber/20",
  place: "bg-teal/10 text-teal border-teal/20",
  event: "bg-lavender/10 text-lavender border-lavender/20",
  item: "bg-copper/10 text-copper border-copper/20",
  lore: "bg-violet/10 text-violet border-violet/20",
};

const CATEGORY_OPTIONS = ["character", "place", "event", "item", "lore"] as const;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// ── Component ───────────────────────────────────────────────

export default function WorkshopPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const slug = params.slug as string;
  const isSetupMode = searchParams.get("setup") === "true";
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [showRosterNudge, setShowRosterNudge] = useState(false);

  // Core state
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("team");

  // Team state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
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
          const isCollab = (collabJson.data as Collaborator[]).some(
            (c) =>
              c.userId === session!.user!.id &&
              (c.status === "accepted" || c.status === "pending")
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
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/story/${slug}`}
            className="text-text-ghost hover:text-amber transition-colors text-[12px] flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to story
          </Link>
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
                    href={`/write/${story.id}`}
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
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-4 py-3 text-[13px] font-medium transition-colors ${
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
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Invite button (owner only) */}
            {isOwner && (
              <div className="mb-6">
                {!showInviteForm ? (
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                    Invite Collaborator
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface/80 border border-border rounded-xl p-5"
                  >
                    <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
                      Invite Collaborator
                    </span>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                          User ID
                        </label>
                        <input
                          type="text"
                          value={inviteUserId}
                          onChange={(e) => setInviteUserId(e.target.value)}
                          placeholder="Enter user ID..."
                          className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                          Role
                        </label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] focus:outline-none focus:border-amber/30 transition-colors"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                      {inviteError && (
                        <p className="text-rose text-[12px]">{inviteError}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleInvite}
                          disabled={inviting || !inviteUserId.trim()}
                          className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {inviting ? "Inviting..." : "Send Invite"}
                        </button>
                        <button
                          onClick={() => {
                            setShowInviteForm(false);
                            setInviteError(null);
                          }}
                          className="text-text-secondary text-[12px] hover:text-text transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Team list */}
            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            ) : collaborators.length > 0 ? (
              <div className="space-y-2">
                {collaborators.map((collab, i) => (
                  <motion.div
                    key={collab.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className="bg-surface/80 border border-border rounded-xl px-5 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-sm font-display font-semibold flex-shrink-0 overflow-hidden">
                        {collab.user?.avatarUrl ? (
                          <img
                            src={collab.user.avatarUrl}
                            alt={collab.user.displayName || ""}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (collab.user?.displayName || "?").charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="text-paper text-[14px] font-medium">
                          {collab.user?.displayName || "Unknown User"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
                            {ROLE_LABELS[collab.role] || collab.role}
                          </span>
                          <span className="text-[11px] text-text-ghost">
                            {relativeTime(collab.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Accept/Decline buttons for the invited user */}
                      {collab.status === "pending" && collab.userId === session?.user?.id && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/stories/${story.id}/collaborators/${collab.id}`,
                                  {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "accepted" }),
                                  }
                                );
                                if (res.ok) {
                                  setTeamLoaded(false);
                                  setShowRosterNudge(true);
                                }
                              } catch {}
                            }}
                            className="px-3 py-1 bg-sage/15 text-sage text-[11px] font-medium rounded-full border border-sage/20 hover:bg-sage/25 transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(
                                  `/api/stories/${story.id}/collaborators/${collab.id}`,
                                  {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "declined" }),
                                  }
                                );
                                setTeamLoaded(false);
                              } catch {}
                            }}
                            className="px-3 py-1 text-text-ghost text-[11px] rounded-full border border-border hover:text-rose hover:border-rose/20 transition-all"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                          STATUS_COLORS[collab.status] || STATUS_COLORS.pending
                        }`}
                      >
                        {collab.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                  <path d="M19 8v6M16 11h6" />
                </svg>
                <p className="text-text-secondary text-[13px] mb-4">
                  No collaborators yet. Invite someone to get started.
                </p>
                <Link
                  href="/roster"
                  className="inline-flex items-center gap-1.5 text-amber text-[12px] hover:text-amber-light transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="6.5" cy="6.5" r="5" />
                    <path d="M10.5 10.5L14 14" />
                  </svg>
                  Find collaborators on the Roster
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ SUGGESTIONS TAB ═══ */}
        {activeTab === "suggestions" && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* New Suggestion form (collaborators, not just owner) */}
            <div className="mb-6">
              {!showSuggestionForm ? (
                <button
                  onClick={() => setShowSuggestionForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 border border-border text-paper font-medium text-[13px] rounded-full hover:border-amber/25 hover:text-amber transition-all duration-200"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  New Suggestion
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface/80 border border-border rounded-xl p-5"
                >
                  <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
                    New Suggestion
                  </span>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Chapter
                      </label>
                      <select
                        value={suggestionChapterId}
                        onChange={(e) => setSuggestionChapterId(e.target.value)}
                        className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] focus:outline-none focus:border-amber/30 transition-colors"
                      >
                        <option value="">Select a chapter...</option>
                        {story.chapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Content
                      </label>
                      <textarea
                        value={suggestionContent}
                        onChange={(e) => setSuggestionContent(e.target.value)}
                        placeholder="Write your suggestion..."
                        rows={4}
                        className="w-full bg-ink border border-border rounded-lg px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Note (optional)
                      </label>
                      <input
                        type="text"
                        value={suggestionNote}
                        onChange={(e) => setSuggestionNote(e.target.value)}
                        placeholder="Add context for the author..."
                        className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSubmitSuggestion}
                        disabled={
                          submittingSuggestion ||
                          !suggestionContent.trim() ||
                          !suggestionChapterId
                        }
                        className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submittingSuggestion ? "Submitting..." : "Submit Suggestion"}
                      </button>
                      <button
                        onClick={() => setShowSuggestionForm(false)}
                        className="text-text-secondary text-[12px] hover:text-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Suggestions list */}
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion, i) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className="bg-surface/80 border border-border rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[11px] font-display font-semibold flex-shrink-0 overflow-hidden">
                          {suggestion.user?.avatarUrl ? (
                            <img
                              src={suggestion.user.avatarUrl}
                              alt={suggestion.user.displayName || ""}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            (suggestion.user?.displayName || "?").charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-paper text-[13px] font-medium">
                            {suggestion.user?.displayName || "Unknown"}
                          </p>
                          <p className="text-text-ghost text-[11px]">
                            {getChapterTitle(suggestion.chapterId)} &middot;{" "}
                            {relativeTime(suggestion.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                          SUGGESTION_STATUS_COLORS[suggestion.status] ||
                          SUGGESTION_STATUS_COLORS.pending
                        }`}
                      >
                        {suggestion.status}
                      </span>
                    </div>

                    {/* Content preview */}
                    <div className="bg-ink/50 border border-border-subtle rounded-lg p-3 mb-3">
                      <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                        {suggestion.content.length > 300
                          ? suggestion.content.slice(0, 300) + "..."
                          : suggestion.content}
                      </p>
                    </div>

                    {suggestion.note && (
                      <p className="text-text-ghost text-[12px] italic mb-3">
                        Note: {suggestion.note}
                      </p>
                    )}

                    {suggestion.reviewNote && (
                      <p className="text-text-ghost text-[12px] italic mb-3">
                        Review note: {suggestion.reviewNote}
                      </p>
                    )}

                    {/* Owner actions on pending suggestions */}
                    {isOwner && suggestion.status === "pending" && (
                      <div className="border-t border-border-subtle pt-3 mt-3">
                        <div className="mb-2">
                          <input
                            type="text"
                            value={reviewNotes[suggestion.id] || ""}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({
                                ...prev,
                                [suggestion.id]: e.target.value,
                              }))
                            }
                            placeholder="Review note (optional)..."
                            className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleReviewSuggestion(suggestion.id, "woven")
                            }
                            disabled={reviewingId === suggestion.id}
                            className="px-3 py-1.5 bg-sage/10 border border-sage/20 text-sage text-[11px] font-medium rounded-full hover:bg-sage/20 transition-all disabled:opacity-40"
                          >
                            Weave
                          </button>
                          <button
                            onClick={() =>
                              handleReviewSuggestion(suggestion.id, "passed")
                            }
                            disabled={reviewingId === suggestion.id}
                            className="px-3 py-1.5 bg-rose/10 border border-rose/20 text-rose text-[11px] font-medium rounded-full hover:bg-rose/20 transition-all disabled:opacity-40"
                          >
                            Pass
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <p className="text-text-secondary text-[13px]">
                  No suggestions yet. Be the first to contribute an idea.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ LORE BOOK TAB ═══ */}
        {activeTab === "lore" && (
          <motion.div
            key="lore"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Add Entry button */}
            <div className="mb-6">
              {!showLoreForm ? (
                <button
                  onClick={() => setShowLoreForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 border border-border text-paper font-medium text-[13px] rounded-full hover:border-amber/25 hover:text-amber transition-all duration-200"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  Add Entry
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface/80 border border-border rounded-xl p-5"
                >
                  <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
                    New Lore Entry
                  </span>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Category
                      </label>
                      <select
                        value={loreCategory}
                        onChange={(e) => setLoreCategory(e.target.value)}
                        className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] focus:outline-none focus:border-amber/30 transition-colors capitalize"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c} className="capitalize">
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Title
                      </label>
                      <input
                        type="text"
                        value={loreTitle}
                        onChange={(e) => setLoreTitle(e.target.value)}
                        placeholder="Entry title..."
                        className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                        Content
                      </label>
                      <textarea
                        value={loreContent}
                        onChange={(e) => setLoreContent(e.target.value)}
                        placeholder="Describe this lore entry..."
                        rows={4}
                        className="w-full bg-ink border border-border rounded-lg px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAddLore}
                        disabled={submittingLore || !loreTitle.trim()}
                        className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submittingLore ? "Adding..." : "Add Entry"}
                      </button>
                      <button
                        onClick={() => setShowLoreForm(false)}
                        className="text-text-secondary text-[12px] hover:text-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Lore entries grouped by category */}
            {loreLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            ) : loreEntries.length > 0 ? (
              <div className="space-y-8">
                {Object.entries(loreByCategory).map(([category, entries]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                          CATEGORY_COLORS[category] || CATEGORY_COLORS.lore
                        }`}
                      >
                        {category}
                      </span>
                      <span className="text-[11px] text-text-ghost">
                        {entries.length} {entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entries.map((entry, i) => {
                        const isExpanded = expandedLore.has(entry.id);
                        const isEditing = editingLore === entry.id;
                        const canEdit =
                          isOwner || entry.userId === session?.user?.id;

                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + i * 0.03 }}
                            className="bg-surface/80 border border-border rounded-xl p-4"
                          >
                            {isEditing ? (
                              <div className="space-y-3">
                                <select
                                  value={editLoreCategory}
                                  onChange={(e) =>
                                    setEditLoreCategory(e.target.value)
                                  }
                                  className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] focus:outline-none focus:border-amber/30 transition-colors"
                                >
                                  {CATEGORY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                      {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={editLoreTitle}
                                  onChange={(e) =>
                                    setEditLoreTitle(e.target.value)
                                  }
                                  className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] focus:outline-none focus:border-amber/30 transition-colors"
                                />
                                <textarea
                                  value={editLoreContent}
                                  onChange={(e) =>
                                    setEditLoreContent(e.target.value)
                                  }
                                  rows={4}
                                  className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] font-reading resize-none focus:outline-none focus:border-amber/30 transition-colors"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditLore(entry.id)}
                                    className="px-3 py-1.5 bg-amber text-void font-semibold text-[11px] rounded-full hover:bg-amber-light transition-all"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingLore(null)}
                                    className="text-text-secondary text-[11px] hover:text-text transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-paper text-[14px] font-medium">
                                    {entry.title}
                                  </h3>
                                  {canEdit && (
                                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                      <button
                                        onClick={() => {
                                          setEditingLore(entry.id);
                                          setEditLoreCategory(entry.category);
                                          setEditLoreTitle(entry.title);
                                          setEditLoreContent(entry.content);
                                        }}
                                        className="text-text-ghost hover:text-amber transition-colors p-1"
                                        title="Edit"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                          <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLore(entry.id)}
                                        className="text-text-ghost hover:text-rose transition-colors p-1"
                                        title="Delete"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                          <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                                  {isExpanded
                                    ? entry.content
                                    : entry.content.length > 150
                                      ? entry.content.slice(0, 150) + "..."
                                      : entry.content}
                                </p>
                                {entry.content.length > 150 && (
                                  <button
                                    onClick={() =>
                                      setExpandedLore((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(entry.id)) {
                                          next.delete(entry.id);
                                        } else {
                                          next.add(entry.id);
                                        }
                                        return next;
                                      })
                                    }
                                    className="text-amber text-[11px] mt-2 hover:text-amber-light transition-colors"
                                  >
                                    {isExpanded ? "Show less" : "Show more"}
                                  </button>
                                )}
                                {entry.user && (
                                  <p className="text-text-ghost text-[11px] mt-2">
                                    by {entry.user.displayName || "Unknown"}
                                  </p>
                                )}
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                <p className="text-text-secondary text-[13px]">
                  No lore entries yet. Start building your world.
                </p>
              </div>
            )}
          </motion.div>
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
