"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import type { ApiStoryData } from "@/types/api";

// ── Types ────────────────────────────────────────────────────

type CallRole = "writer" | "illustrator" | "editor" | "worldbuilder";
type CallStatus = "open" | "filled" | "closed";

interface OpenCall {
  id: string;
  role: string;
  title: string;
  description: string;
  requirements: string | null;
  status: CallStatus;
  createdAt: string;
  responseCount?: number;
}

interface CallResponse {
  id: string;
  pitch: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// ── Constants ────────────────────────────────────────────────

const ROLE_OPTIONS: { value: CallRole; label: string }[] = [
  { value: "writer", label: "Writer" },
  { value: "illustrator", label: "Illustrator" },
  { value: "editor", label: "Editor" },
  { value: "worldbuilder", label: "Worldbuilder" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  writer: { bg: "bg-amber/10", text: "text-amber", border: "border-amber/20" },
  illustrator: { bg: "bg-lavender/10", text: "text-lavender", border: "border-lavender/20" },
  editor: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/20" },
  worldbuilder: { bg: "bg-sage/10", text: "text-sage", border: "border-sage/20" },
};

const STATUS_STYLES: Record<CallStatus, { bg: string; text: string; border: string }> = {
  open: { bg: "bg-sage/10", text: "text-sage", border: "border-sage/20" },
  filled: { bg: "bg-amber/10", text: "text-amber", border: "border-amber/20" },
  closed: { bg: "bg-surface/60", text: "text-text-ghost", border: "border-border-subtle" },
};

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

function getRoleColor(role: string) {
  return ROLE_COLORS[role] || ROLE_COLORS.writer;
}

// ── Component ────────────────────────────────────────────────

export default function OpenCallsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const slug = params.slug as string;
  const fromEditor = searchParams.get("from") === "editor";

  // Story state
  const [story, setStory] = useState<ApiStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calls state
  const [calls, setCalls] = useState<OpenCall[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formRole, setFormRole] = useState<CallRole>("writer");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRequirements, setFormRequirements] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Expanded call state
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Responses state (per call)
  const [responses, setResponses] = useState<Record<string, CallResponse[]>>({});
  const [responsesLoading, setResponsesLoading] = useState<Record<string, boolean>>({});

  // Pitch form state
  const [pitchText, setPitchText] = useState<Record<string, string>>({});
  const [pitchSubmitting, setPitchSubmitting] = useState<Record<string, boolean>>({});
  const [pitchSuccess, setPitchSuccess] = useState<Record<string, boolean>>({});

  const isOwner = session?.user?.id === story?.userId;

  // ── Fetch story ──────────────────────────────────────────

  useEffect(() => {
    async function fetchStory() {
      try {
        const res = await fetch(`/api/stories/by-slug/${slug}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message || "Story not found");
          return;
        }
        setStory(json.data);
      } catch {
        setError("Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug]);

  // ── Fetch calls ──────────────────────────────────────────

  const fetchCalls = useCallback(async () => {
    if (!story) return;
    setCallsLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/open-calls`);
      if (res.ok) {
        const json = await res.json();
        setCalls(json.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setCallsLoading(false);
    }
  }, [story]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // ── Fetch responses for a call (owner only) ──────────────

  const fetchResponses = useCallback(
    async (callId: string) => {
      if (!story || !isOwner) return;
      setResponsesLoading((prev) => ({ ...prev, [callId]: true }));
      try {
        const res = await fetch(`/api/stories/${story.id}/open-calls/${callId}/responses`);
        if (res.ok) {
          const json = await res.json();
          setResponses((prev) => ({ ...prev, [callId]: json.data || [] }));
        }
      } catch {
        // silently fail
      } finally {
        setResponsesLoading((prev) => ({ ...prev, [callId]: false }));
      }
    },
    [story, isOwner],
  );

  // ── Create a call ────────────────────────────────────────

  const handleCreateCall = async () => {
    if (!story || creating) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/open-calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formRole,
          title: formTitle.trim(),
          description: formDescription.trim(),
          requirements: formRequirements.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error?.message || "Failed to create call");
        return;
      }
      setCalls((prev) => [json.data, ...prev]);
      setFormTitle("");
      setFormDescription("");
      setFormRequirements("");
      setFormRole("writer");
      setShowCreateForm(false);
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  // ── Update call status (owner) ───────────────────────────

  const handleUpdateCallStatus = async (callId: string, status: CallStatus) => {
    if (!story) return;
    try {
      const res = await fetch(`/api/stories/${story.id}/open-calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCalls((prev) =>
          prev.map((c) => (c.id === callId ? { ...c, status } : c)),
        );
      }
    } catch {
      // silently fail
    }
  };

  // ── Submit a pitch ───────────────────────────────────────

  const handleSubmitPitch = async (callId: string) => {
    if (!story || pitchSubmitting[callId]) return;
    const pitch = (pitchText[callId] || "").trim();
    if (!pitch) return;

    setPitchSubmitting((prev) => ({ ...prev, [callId]: true }));
    try {
      const res = await fetch(`/api/stories/${story.id}/open-calls/${callId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch }),
      });
      if (res.ok) {
        setPitchText((prev) => ({ ...prev, [callId]: "" }));
        setPitchSuccess((prev) => ({ ...prev, [callId]: true }));
        setTimeout(() => {
          setPitchSuccess((prev) => ({ ...prev, [callId]: false }));
        }, 3000);
      }
    } catch {
      // silently fail
    } finally {
      setPitchSubmitting((prev) => ({ ...prev, [callId]: false }));
    }
  };

  // ── Handle expand/collapse ───────────────────────────────

  const toggleExpand = (callId: string) => {
    if (expandedCallId === callId) {
      setExpandedCallId(null);
    } else {
      setExpandedCallId(callId);
      if (isOwner && !responses[callId]) {
        fetchResponses(callId);
      }
    }
  };

  // ── Loading state ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────

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

  // ── Main render ──────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb / Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 text-[12px] text-text-ghost mb-4">
          <Link href={`/story/${slug}`} className="hover:text-amber transition-colors">
            {story.title}
          </Link>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost/50">
            <path d="M6 3l5 5-5 5" />
          </svg>
          <span className="text-text-secondary">Open Calls</span>
          {fromEditor && isOwner && (
            <>
              <span className="text-text-ghost/40">·</span>
              <Link
                href={`/write/${story.id}`}
                className="hover:text-teal transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3L5 8l5 5" />
                </svg>
                Back to editor
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-paper font-bold mb-2">
              Open Calls
            </h1>
            <p className="text-text-secondary text-[14px]">
              Collaboration opportunities for this story
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 hover:shadow-lg hover:shadow-amber/15 flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" />
              </svg>
              Post a Call
            </button>
          )}
        </div>
      </motion.div>

      {/* Create Form (owner only) */}
      <AnimatePresence>
        {isOwner && showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-surface/60 border border-border-subtle rounded-xl p-6">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-5 block">
                Post a New Call
              </span>

              {/* Role selector */}
              <div className="mb-4">
                <label className="text-[12px] text-text-secondary mb-2 block">Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const colors = getRoleColor(opt.value);
                    const selected = formRole === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFormRole(opt.value)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                          selected
                            ? `${colors.bg} ${colors.text} ${colors.border}`
                            : "bg-surface/80 border-border text-text-secondary hover:border-border-subtle"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="text-[12px] text-text-secondary mb-2 block">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value.slice(0, 500))}
                  placeholder="e.g., Looking for a fantasy illustrator"
                  className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-[12px] text-text-secondary mb-2 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 5000) setFormDescription(e.target.value);
                  }}
                  placeholder="Describe what you're looking for, the scope of work, and any creative vision..."
                  rows={4}
                  className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                />
                <span className="text-[11px] text-text-ghost mt-1 block text-right">
                  {formDescription.length}/5000
                </span>
              </div>

              {/* Requirements (optional) */}
              <div className="mb-5">
                <label className="text-[12px] text-text-secondary mb-2 block">
                  Requirements <span className="text-text-ghost">(optional)</span>
                </label>
                <textarea
                  value={formRequirements}
                  onChange={(e) => {
                    if (e.target.value.length <= 5000) setFormRequirements(e.target.value);
                  }}
                  placeholder="Portfolio links, experience level, availability..."
                  rows={3}
                  className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>

              {createError && (
                <p className="text-rose text-[12px] mb-4">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-text-secondary text-[13px] hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCall}
                  disabled={creating || !formTitle.trim() || !formDescription.trim()}
                  className="px-5 py-2.5 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creating ? "Posting..." : "Post Call"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calls List */}
      {callsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : calls.length > 0 ? (
        <div className="space-y-3">
          {calls.map((call, i) => {
            const roleColor = getRoleColor(call.role);
            const statusStyle = STATUS_STYLES[call.status] || STATUS_STYLES.open;
            const isExpanded = expandedCallId === call.id;

            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`bg-surface/80 border rounded-xl transition-all duration-200 ${
                    isExpanded
                      ? "border-amber/15 bg-surface"
                      : "border-border hover:border-amber/10"
                  }`}
                >
                  {/* Call Header (clickable) */}
                  <button
                    onClick={() => toggleExpand(call.id)}
                    className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-0.5 rounded-full border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                        >
                          {call.role}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {call.status}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-paper text-[15px] font-medium mb-1">{call.title}</h3>

                      {/* Preview description (collapsed) */}
                      {!isExpanded && (
                        <p className="text-text-secondary text-[13px] line-clamp-2 leading-relaxed">
                          {call.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-text-ghost">
                        <span>{relativeTime(call.createdAt)}</span>
                        {isOwner && call.responseCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2 4h12v8H4l-2 2V4z" />
                            </svg>
                            {call.responseCount} response{call.responseCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <motion.svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-text-ghost flex-shrink-0 mt-1"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path d="M4 6l4 4 4-4" />
                    </motion.svg>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border-subtle pt-4">
                          {/* Full description */}
                          <div className="mb-4">
                            <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-2 block">
                              Description
                            </span>
                            <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                              {call.description}
                            </p>
                          </div>

                          {/* Requirements */}
                          {call.requirements && (
                            <div className="mb-5">
                              <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-2 block">
                                Requirements
                              </span>
                              <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                                {call.requirements}
                              </p>
                            </div>
                          )}

                          {/* Owner: Status controls */}
                          {isOwner && (
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                              <span className="text-[11px] text-text-ghost mr-1">Set status:</span>
                              {(["open", "filled", "closed"] as CallStatus[]).map((s) => {
                                const style = STATUS_STYLES[s];
                                const isActive = call.status === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleUpdateCallStatus(call.id, s)}
                                    className={`text-[11px] px-3 py-1 rounded-full border font-medium transition-all duration-200 capitalize ${
                                      isActive
                                        ? `${style.bg} ${style.text} ${style.border}`
                                        : "bg-surface/60 border-border text-text-ghost hover:text-text-secondary"
                                    }`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Owner: Responses list */}
                          {isOwner && (
                            <div>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 block">
                                Responses
                              </span>

                              {responsesLoading[call.id] ? (
                                <div className="flex items-center justify-center py-6">
                                  <div className="w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                                </div>
                              ) : (responses[call.id] || []).length > 0 ? (
                                <div className="space-y-3">
                                  {(responses[call.id] || []).map((resp) => (
                                    <div
                                      key={resp.id}
                                      className="bg-ink/60 border border-border-subtle rounded-lg p-4"
                                    >
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[10px] font-display font-semibold flex-shrink-0 overflow-hidden">
                                          {resp.user.avatarUrl ? (
                                            <Image src={resp.user.avatarUrl} alt={resp.user.displayName || ""} fill sizes="28px" className="rounded-full object-cover" unoptimized />
                                          ) : (
                                            (resp.user.displayName || "?").charAt(0)
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-paper text-[13px] font-medium">
                                            {resp.user.displayName || "Anonymous"}
                                          </p>
                                        </div>
                                        <span className="text-[11px] text-text-ghost flex-shrink-0">
                                          {relativeTime(resp.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap mb-3">
                                        {resp.pitch}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-text-ghost capitalize">
                                          Status: {resp.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-text-ghost text-[13px] py-4">
                                  No responses yet.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Non-owner authenticated: Pitch form */}
                          {!isOwner && session?.user && call.status === "open" && (
                            <div className="mt-4">
                              {pitchSuccess[call.id] ? (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-sage/10 border border-sage/20 rounded-xl p-4 text-center"
                                >
                                  <p className="text-sage text-[13px] font-medium mb-2">
                                    Pitch submitted successfully!
                                  </p>
                                  <p className="text-text-secondary text-[11px] mb-2">
                                    Looking for more projects?
                                  </p>
                                  <a
                                    href="/roster/setup"
                                    className="inline-flex items-center gap-1.5 text-amber text-[11px] hover:text-amber-light transition-colors"
                                  >
                                    Post your card on the Roster so creators can find you
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M6 3l5 5-5 5" />
                                    </svg>
                                  </a>
                                </motion.div>
                              ) : (
                                <div>
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-2 block">
                                    Submit a Pitch
                                  </span>
                                  <textarea
                                    value={pitchText[call.id] || ""}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 5000) {
                                        setPitchText((prev) => ({
                                          ...prev,
                                          [call.id]: e.target.value,
                                        }));
                                      }
                                    }}
                                    placeholder="Tell the creator why you'd be a great fit..."
                                    rows={4}
                                    className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                                  />
                                  <div className="flex items-center justify-between mt-3">
                                    <span className="text-[11px] text-text-ghost">
                                      {(pitchText[call.id] || "").length}/5000
                                    </span>
                                    <button
                                      onClick={() => handleSubmitPitch(call.id)}
                                      disabled={
                                        pitchSubmitting[call.id] ||
                                        !(pitchText[call.id] || "").trim()
                                      }
                                      className="px-5 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      {pitchSubmitting[call.id]
                                        ? "Submitting..."
                                        : "Submit Pitch"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Not logged in notice */}
                          {!session?.user && call.status === "open" && (
                            <div className="mt-4 bg-surface/60 border border-border-subtle rounded-xl p-4 text-center">
                              <p className="text-text-ghost text-[13px]">
                                <Link href="/login" className="text-amber hover:text-amber-light transition-colors">
                                  Sign in
                                </Link>{" "}
                                to submit a pitch for this call.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/60 border border-border rounded-2xl p-14 text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-amber/5 border border-amber/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
          </div>
          <h3 className="font-display text-lg text-paper mb-2">No open calls</h3>
          <p className="text-text-secondary text-[13px] max-w-sm mx-auto">
            {isOwner
              ? "Post a call to find collaborators, or browse the Roster to discover creatives looking for projects."
              : "There are no collaboration opportunities for this story right now. Check back later!"}
          </p>
          {isOwner && (
            <a
              href="/roster"
              className="inline-flex items-center gap-1.5 text-amber text-[12px] hover:text-amber-light transition-colors mt-4"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6.5" cy="6.5" r="5" />
                <path d="M10.5 10.5L14 14" />
              </svg>
              Browse the Roster
            </a>
          )}
        </motion.div>
      )}
    </div>
  );
}
