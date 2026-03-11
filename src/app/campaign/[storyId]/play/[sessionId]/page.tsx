"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────────

interface Turn {
  id: string;
  sessionId: string;
  userId: string;
  characterId: string | null;
  type: string;
  content: string;
  metadata: string | null;
  sortOrder: number;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  characterName: string | null;
  characterPortrait: string | null;
}

interface CampaignSession {
  id: string;
  storyId: string;
  title: string;
  summary: string;
  status: string;
}

interface PlayerCharacter {
  id: string;
  userId: string;
  name: string;
  portrait: string | null;
  status: string;
}

interface StoryData {
  id: string;
  userId: string;
  title: string;
}

// ── Turn type configs ───────────────────────────────────────

const TURN_TYPES = [
  { key: "narration", label: "Narration", gmOnly: true },
  { key: "action", label: "Action", gmOnly: false },
  { key: "dialogue", label: "Dialogue", gmOnly: false },
  { key: "roll", label: "Roll", gmOnly: false },
  { key: "ooc", label: "OOC", gmOnly: false },
] as const;

const TURN_STYLES: Record<string, { bg: string; border: string; badge?: string }> = {
  narration: {
    bg: "bg-ink/80",
    border: "border-l-amber",
    badge: "bg-amber/15 text-amber",
  },
  action: {
    bg: "bg-surface",
    border: "border-l-violet",
  },
  dialogue: {
    bg: "bg-surface",
    border: "border-l-teal",
  },
  roll: {
    bg: "bg-elevated",
    border: "border-l-copper",
  },
  ooc: {
    bg: "bg-surface/50",
    border: "border-l-text-ghost border-dashed",
  },
};

const SESSION_STATUS_STYLES: Record<string, string> = {
  active: "bg-sage/15 text-sage border-sage/20",
  completed: "bg-amber/15 text-amber border-amber/20",
  archived: "bg-text-ghost/15 text-text-ghost border-text-ghost/20",
};

// ── Component ───────────────────────────────────────────────

export default function SessionPlayPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;

  const [story, setStory] = useState<StoryData | null>(null);
  const [campaignSession, setCampaignSession] = useState<CampaignSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose state
  const [turnType, setTurnType] = useState<string>("action");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const timelineEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxSortRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const myCharacter = characters.find((c) => c.userId === currentUserId);

  // ── Scroll to bottom ───────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Initial fetch ──────────────────────────────────────────

  useEffect(() => {
    if (!storyId || !sessionId) return;

    const fetchInitial = async () => {
      try {
        setLoading(true);

        const [storyRes, turnsRes, charsRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`),
          fetch(`/api/stories/${storyId}/campaign/characters`),
        ]);

        if (!storyRes.ok) throw new Error("Failed to load story");

        const storyJson = await storyRes.json();
        setStory(storyJson.data);

        if (turnsRes.ok) {
          const turnsJson = await turnsRes.json();
          const fetchedTurns: Turn[] = turnsJson.data ?? [];
          setTurns(fetchedTurns);
          setCampaignSession(turnsJson.session ?? null);
          if (fetchedTurns.length > 0) {
            maxSortRef.current = Math.max(...fetchedTurns.map((t) => t.sortOrder));
          }
        }

        if (charsRes.ok) {
          const charsJson = await charsRes.json();
          setCharacters(charsJson.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [storyId, sessionId]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading && turns.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [loading, turns.length, scrollToBottom]);

  // ── Poll for new turns ─────────────────────────────────────

  useEffect(() => {
    if (!storyId || !sessionId || loading) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns?afterSort=${maxSortRef.current}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const newTurns: Turn[] = json.data ?? [];
        if (newTurns.length > 0) {
          setTurns((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const unique = newTurns.filter((t) => !existingIds.has(t.id));
            if (unique.length === 0) return prev;
            return [...prev, ...unique];
          });
          maxSortRef.current = Math.max(
            maxSortRef.current,
            ...newTurns.map((t) => t.sortOrder)
          );
          setTimeout(scrollToBottom, 100);
        }
        // Update session status
        if (json.session) {
          setCampaignSession(json.session);
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [storyId, sessionId, loading, scrollToBottom]);

  // ── Auto-grow textarea ─────────────────────────────────────

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [content]);

  // ── Send turn ──────────────────────────────────────────────

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    if (turnType === "narration" && !isGM) return;

    setSending(true);
    try {
      const body: Record<string, string | undefined> = {
        type: turnType,
        content: content.trim(),
      };
      if (myCharacter && turnType !== "narration") {
        body.characterId = myCharacter.id;
      }

      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to send");
      }

      const json = await res.json();
      const newTurn = json.data as Turn;

      // Optimistically add the turn with user info
      const enrichedTurn: Turn = {
        ...newTurn,
        user: {
          id: currentUserId ?? "",
          displayName: authSession?.user?.name ?? null,
          avatarUrl: authSession?.user?.image ?? null,
        },
        characterName: myCharacter?.name ?? null,
        characterPortrait: myCharacter?.portrait ?? null,
      };

      setTurns((prev) => {
        const exists = prev.some((t) => t.id === enrichedTurn.id);
        return exists ? prev : [...prev, enrichedTurn];
      });
      maxSortRef.current = Math.max(maxSortRef.current, newTurn.sortOrder);
      setContent("");
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error sending turn");
    } finally {
      setSending(false);
    }
  };

  // ── Render turn ────────────────────────────────────────────

  const renderTurn = (turn: Turn) => {
    const style = TURN_STYLES[turn.type] ?? TURN_STYLES.action;
    const isNarration = turn.type === "narration";
    const isOOC = turn.type === "ooc";
    const isRoll = turn.type === "roll";
    const isDialogue = turn.type === "dialogue";

    let rollDetails: Record<string, unknown> | null = null;
    if (isRoll && turn.metadata) {
      try {
        rollDetails = JSON.parse(turn.metadata);
      } catch {
        // ignore
      }
    }

    return (
      <motion.div
        key={turn.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`${style.bg} border border-border rounded-2xl border-l-[3px] ${style.border} p-4 ${isOOC ? "opacity-70" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isNarration ? (
            <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] font-semibold rounded-full ${style.badge}`}>
              GM
            </span>
          ) : (
            <>
              {/* Character avatar */}
              <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {turn.characterPortrait ? (
                  <img src={turn.characterPortrait} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-display text-text-ghost">
                    {(turn.characterName ?? turn.user?.displayName ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold ${isDialogue ? "text-teal" : "text-paper"}`}>
                {turn.characterName ?? turn.user?.displayName ?? "Unknown"}
              </span>
            </>
          )}

          {isOOC && (
            <span className="text-[9px] uppercase tracking-[0.1em] text-text-ghost">OOC</span>
          )}

          <span className="text-[9px] text-text-ghost ml-auto">
            {new Date(turn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Content */}
        <div className={`text-sm leading-relaxed ${isNarration ? "italic text-text-secondary" : isOOC ? "text-text-ghost text-xs" : "text-paper"}`}>
          {isDialogue ? (
            <span>&ldquo;{turn.content}&rdquo;</span>
          ) : isRoll ? (
            <div>
              <span className="mr-1">&#x1F3B2;</span>
              <span className="font-semibold">{turn.content}</span>
              {rollDetails && (
                <div className="mt-1.5 text-[10px] text-text-ghost space-x-3">
                  {Object.entries(rollDetails).map(([key, val]) => (
                    <span key={key}>
                      <span className="text-copper">{key}:</span> {String(val)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : isNarration ? (
            <span className="font-display">{turn.content}</span>
          ) : (
            <span><span className="font-semibold">{turn.characterName ?? turn.user?.displayName}</span> {turn.content}</span>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Loading / Error ────────────────────────────────────────

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
          <p className="text-text-secondary">{error ?? "Session not found"}</p>
          <button
            onClick={() => router.push(`/campaign/${storyId}`)}
            className="inline-block px-4 py-2 bg-surface border border-border rounded-xl text-text-secondary hover:text-paper transition-colors text-sm cursor-pointer"
          >
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }

  const isSessionActive = campaignSession?.status === "active";

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* ── Top Bar ──────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-void/90 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/campaign/${storyId}`)}
              className="p-1.5 rounded-lg hover:bg-surface/80 transition-colors shrink-0 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                <path d="M11 4L6 9l5 5" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-paper truncate">
                {campaignSession?.title ?? "Session"}
              </h1>
              <p className="text-[10px] text-text-ghost truncate">{story.title}</p>
            </div>
          </div>

          {campaignSession && (
            <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border rounded-full shrink-0 ${SESSION_STATUS_STYLES[campaignSession.status] ?? SESSION_STATUS_STYLES.active}`}>
              {campaignSession.status}
            </span>
          )}
        </div>
      </motion.header>

      {/* ── Turn Timeline ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          {turns.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-3xl opacity-20 mb-3">&#x1F3B2;</div>
              <p className="text-text-ghost text-sm">
                {isGM ? "Set the scene with your opening narration." : "Waiting for the GM to begin the session..."}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {turns.map(renderTurn)}
          </AnimatePresence>

          <div ref={timelineEndRef} />
        </div>
      </div>

      {/* ── Compose Area ─────────────────────────────────── */}
      {isSessionActive && currentUserId && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 z-20 bg-void/95 backdrop-blur-md border-t border-border"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            {/* Turn type pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {TURN_TYPES.filter((t) => !t.gmOnly || isGM).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTurnType(t.key)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] font-medium rounded-full border whitespace-nowrap transition-all cursor-pointer ${
                    turnType === t.key
                      ? "bg-amber/15 text-amber border-amber/30"
                      : "bg-surface/50 text-text-ghost border-border hover:text-text-secondary hover:border-border"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="flex items-end gap-3">
              {/* Character badge */}
              {myCharacter && turnType !== "narration" && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface/80 border border-border rounded-xl shrink-0 self-end mb-0.5">
                  <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center overflow-hidden border border-border">
                    {myCharacter.portrait ? (
                      <img src={myCharacter.portrait} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] font-display text-text-ghost">
                        {myCharacter.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-secondary font-medium">{myCharacter.name}</span>
                </div>
              )}

              {/* GM badge for narration */}
              {isGM && turnType === "narration" && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber/10 border border-amber/20 rounded-xl shrink-0 self-end mb-0.5">
                  <span className="text-[10px] text-amber font-semibold">GM</span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  turnType === "narration"
                    ? "Describe the scene..."
                    : turnType === "dialogue"
                    ? "What does your character say?"
                    : turnType === "roll"
                    ? "Describe your roll and result..."
                    : turnType === "ooc"
                    ? "Out of character message..."
                    : "What does your character do?"
                }
                rows={1}
                className="flex-1 px-4 py-2.5 bg-surface/80 border border-border rounded-xl text-paper text-sm placeholder:text-text-ghost/50 focus:outline-none focus:border-amber/40 transition-colors resize-none min-h-[40px]"
              />

              <button
                onClick={handleSend}
                disabled={!content.trim() || sending}
                className="p-2.5 bg-amber text-void rounded-xl hover:bg-amber/90 disabled:opacity-30 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {sending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full"
                  />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.5 2.1a.5.5 0 01.7-.4l11 5a.5.5 0 010 .9l-11 5a.5.5 0 01-.7-.5V9.5L9 8 2.5 6.5V2.1z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inactive session banner */}
      {!isSessionActive && campaignSession && (
        <div className="sticky bottom-0 z-20 bg-void/95 backdrop-blur-md border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 text-center">
            <p className="text-text-ghost text-sm">
              This session has been {campaignSession.status}. No new turns can be added.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
