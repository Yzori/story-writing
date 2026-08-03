"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tiptap/react";
import ProseEditor from "@/components/editor/ProseEditor";
import EditorErrorBoundary from "@/components/editor/EditorErrorBoundary";
import { useToast } from "@/components/shared/Toast";
import type { PresenceEntry, CoopChapter, ActivityEntry, SaveState } from "@/components/co-op/types";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function relativeTime(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function toChapter(c: Record<string, unknown>): CoopChapter {
  return {
    id: c.id as string, title: c.title as string, content: (c.content as string) || "",
    wordCount: (c.wordCount as number) || 0, status: (c.status as "draft" | "published") || "draft",
    sortOrder: (c.sortOrder as number) || 0, version: (c.version as number) || 1,
    authorNoteBefore: "", authorNoteAfter: "", outline: "",
    updatedAt: (c.updatedAt as string) || new Date().toISOString(),
  };
}

function personColor(presences: PresenceEntry[], userId: string): string {
  const role = presences.find((p) => p.userId === userId)?.role || "writer";
  return { writer: "#D4A574", illustrator: "#A78BDB", editor: "#5AB8B3", worldbuilder: "#6DB89B" }[role] || "#D4A574";
}

// ═══════════════════════════════════════════════════════════
//  THE SCROLL — Real Implementation
// ═══════════════════════════════════════════════════════════

export default function CoopScroll() {
  const { storyId } = useParams<{ storyId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  // ── Core ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [storySlug, setStorySlug] = useState("");
  const [storyOwnerId, setStoryOwnerId] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("You");

  // ── Chapters ────────────────────────────────────────────
  const [chapters, setChapters] = useState<CoopChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const activeChapter = useMemo(() => chapters.find((c) => c.id === activeChapterId) ?? null, [chapters, activeChapterId]);
  const [showChapters, setShowChapters] = useState(false);
  const activeChapterIdx = useMemo(() => chapters.findIndex((c) => c.id === activeChapterId), [chapters, activeChapterId]);

  // ── Presence & Pen ──────────────────────────────────────
  const [presences, setPresences] = useState<PresenceEntry[]>([]);
  const [penHolder, setPenHolder] = useState<PresenceEntry | null>(null);
  const iHoldPen = penHolder?.userId === currentUserId;

  // ── Activity & Chat ─────────────────────────────────────
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ── Thoughts (stored locally + posted to activity) ──────
  interface Thought { id: string; afterPara: number; by: string; byName: string; type: string; emoji: string; text: string; createdAt: string }
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [thoughtInput, setThoughtInput] = useState("");
  const [thoughtType, setThoughtType] = useState("thought");

  // ── Editor ──────────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const editorRef = useRef<Editor | null>(null);
  const pendingSave = useRef<{ content: string; version: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [energy, setEnergy] = useState(2);

  // ── Ceremony ────────────────────────────────────────────
  const [ceremony, setCeremony] = useState<{ from: string; to: string } | null>(null);

  // ── Derived ─────────────────────────────────────────────
  const totalWords = useMemo(() => chapters.reduce((s, c) => s + c.wordCount, 0), [chapters]);
  const holderName = penHolder ? (penHolder.userId === currentUserId ? "You" : penHolder.displayName?.split(" ")[0] || "Someone") : null;

  // ═══════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    async function load() {
      try {
        const sRes = await fetch("/api/auth/session");
        const sData = await sRes.json();
        if (!sData?.user?.id) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return; }
        setCurrentUserId(sData.user.id);
        setCurrentUserName(sData.user.name || "You");

        const [storyRes, chRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch(`/api/stories/${storyId}/chapters?withContent=true`),
        ]);
        if (!storyRes.ok) { setError("Story not found"); setLoading(false); return; }
        const story = (await storyRes.json()).data;

        // Verify access
        if (story.userId !== sData.user.id) {
          const collabRes = await fetch(`/api/stories/${storyId}/collaborators`);
          const collabs = collabRes.ok ? (await collabRes.json()).data || [] : [];
          const hasAccess = collabs.some((c: { userId: string; status: string }) => c.userId === sData.user.id && c.status === "accepted");
          if (!hasAccess) { setError("You don\u2019t have access to this story"); setLoading(false); return; }
        }

        setStoryTitle(story.title);
        setStorySlug(story.slug || storyId);
        setStoryOwnerId(story.userId);

        if (chRes.ok) {
          const chs = ((await chRes.json()).data || []).map(toChapter).sort((a: CoopChapter, b: CoopChapter) => a.sortOrder - b.sortOrder);
          setChapters(chs);
          if (chs.length > 0) setActiveChapterId(chs[0].id);
        }

        // Announce arrival + set viewing
        fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "entered the room", type: "join" }) }).catch(() => {});
        fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId: null, status: "viewing" }) }).catch(() => {});
      } catch { setError("Failed to load"); } finally { setLoading(false); }
    }
    load();
  }, [storyId, router]);

  // ── Heartbeat (15s) ─────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || loading) return;
    const send = () => fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: activeChapterId, status: iHoldPen ? "editing" : "viewing" }) }).catch(() => {});
    send();
    const i = setInterval(send, 15000);
    return () => clearInterval(i);
  }, [storyId, currentUserId, activeChapterId, iHoldPen, loading]);

  // ── Presence poll (8s) ──────────────────────────────────
  useEffect(() => {
    if (!currentUserId || loading) return;
    const poll = () => fetch(`/api/stories/${storyId}/presence`).then((r) => r.json()).then((j) => {
      if (!j.data) return;
      setPresences(j.data);
      const ed = j.data.find((p: PresenceEntry) => p.status === "editing");
      setPenHolder(ed || null);
    }).catch(() => {});
    poll();
    const i = setInterval(poll, 8000);
    return () => clearInterval(i);
  }, [storyId, currentUserId, loading]);

  // ── Activity poll (5s) ──────────────────────────────────
  useEffect(() => {
    if (!currentUserId || loading) return;
    const poll = () => fetch(`/api/stories/${storyId}/chat`).then((r) => r.json()).then((j) => { if (j.data) setActivities(j.data); }).catch(() => {});
    poll();
    const i = setInterval(poll, 5000);
    return () => clearInterval(i);
  }, [storyId, currentUserId, loading]);

  // ── Auto-scroll chat ───────────────────────────────────
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [activities.length, chatOpen]);

  // ── Energy decay ────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => setEnergy((e) => Math.max(0, e - 1)), 12000);
    return () => clearInterval(i);
  }, []);

  // ── Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      fetch(`/api/stories/${storyId}/presence`, { method: "DELETE", keepalive: true }).catch(() => {});
      fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "left the room", type: "leave" }), keepalive: true }).catch(() => {});
    };
  }, [storyId]);

  // ═══════════════════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════════════════

  const flushSave = useCallback(async () => {
    if (!pendingSave.current || !activeChapterId) return;
    const { content, version } = pendingSave.current;
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${activeChapterId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, baseVersion: version }) });
      if (res.ok) {
        const j = await res.json();
        if (j.data?.version) setChapters((prev) => prev.map((c) => c.id === j.data.id ? { ...c, version: j.data.version } : c));
        pendingSave.current = null;
      }
    } catch {}
  }, [storyId, activeChapterId]);

  const pickUpPen = useCallback(async () => {
    const res = await fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: activeChapterId, status: "editing" }) });
    const j = await res.json();
    if (j.lock?.locked) { toast(`${j.lock.lockedBy.displayName} is writing`, "error"); return; }
    setPenHolder({ userId: currentUserId!, displayName: currentUserName, avatarUrl: null, role: "writer", chapterId: activeChapterId, status: "editing", lastHeartbeat: new Date().toISOString() });
    setEnergy((e) => Math.min(10, e + 3));
    fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "picked up the pen", type: "edit" }) }).catch(() => {});
  }, [storyId, activeChapterId, currentUserId, currentUserName, toast]);

  const putDownPen = useCallback(async () => {
    await flushSave();
    await fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: activeChapterId, status: "viewing" }) });
    setPenHolder(null);
    fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "set the pen down", type: "edit" }) }).catch(() => {});
  }, [storyId, activeChapterId, flushSave]);

  const passPen = useCallback(async (toUserId: string) => {
    const to = presences.find((p) => p.userId === toUserId);
    if (!to) return;
    await flushSave();
    setCeremony({ from: currentUserName, to: to.displayName || "Unknown" });
    await fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: activeChapterId, status: "viewing" }) });
    fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `passed the pen to ${to.displayName}`, type: "edit" }) }).catch(() => {});
    setTimeout(() => { setCeremony(null); setPenHolder(to); }, 3000);
  }, [presences, currentUserName, storyId, activeChapterId, flushSave]);

  const selectChapter = useCallback(async (id: string) => {
    if (id === activeChapterId) { setShowChapters(false); return; }
    await flushSave();
    setActiveChapterId(id);
    setShowChapters(false);
    setThoughts([]);
    // If we hold the pen, update presence to new chapter
    if (iHoldPen) {
      fetch(`/api/stories/${storyId}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: id, status: "editing" }) }).catch(() => {});
    }
  }, [activeChapterId, flushSave, iHoldPen, storyId]);

  const addChapter = useCallback(async () => {
    const res = await fetch(`/api/stories/${storyId}/chapters`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Chapter ${chapters.length + 1}` }) });
    if (res.ok) { const ch = toChapter((await res.json()).data); setChapters((prev) => [...prev, ch]); selectChapter(ch.id); }
    else toast("Couldn’t create the chapter. Try again.", "error");
  }, [storyId, chapters.length, selectChapter, toast]);

  const [creatingFirst, setCreatingFirst] = useState(false);
  const createFirstChapter = useCallback(async () => {
    if (creatingFirst) return;
    setCreatingFirst(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chapter 1" }) });
      if (!res.ok) { toast("Couldn’t start the chapter. Try again.", "error"); return; }
      const ch = toChapter((await res.json()).data);
      setChapters([ch]);
      setActiveChapterId(ch.id);
    } catch {
      toast("Couldn’t start the chapter. Try again.", "error");
    } finally {
      setCreatingFirst(false);
    }
  }, [creatingFirst, storyId, toast]);

  // ── Content update + auto-save ──────────────────────────
  const handleContentUpdate = useCallback((content: string, wordCount: number) => {
    if (!activeChapterId || !iHoldPen) return;
    setChapters((prev) => prev.map((c) => c.id === activeChapterId ? { ...c, content, wordCount } : c));
    const ch = chapters.find((c) => c.id === activeChapterId);
    if (!ch) return;
    pendingSave.current = { content, version: ch.version };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!pendingSave.current) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${activeChapterId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: pendingSave.current.content, baseVersion: pendingSave.current.version }) });
        if (res.status === 409) { setSaveState("conflict"); toast("Version conflict \u2014 someone else saved. Reload.", "error"); return; }
        if (res.ok) {
          const j = await res.json();
          if (j.data?.version) setChapters((prev) => prev.map((c) => c.id === j.data.id ? { ...c, version: j.data.version } : c));
          pendingSave.current = null;
          setSaveState("saved");
          setEnergy((e) => Math.min(10, e + 1));
          if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
          savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
        } else setSaveState("error");
      } catch { setSaveState("error"); }
    }, 2000);
  }, [activeChapterId, iHoldPen, chapters, storyId, toast]);

  // ── Chat ────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatInput.trim() }) });
      if (res.ok) { const j = await res.json(); setActivities((prev) => [...prev, j.data]); setChatInput(""); setEnergy((e) => Math.min(10, e + 1)); }
    } catch {} finally { setChatSending(false); }
  }, [chatInput, chatSending, storyId]);

  // ── Drop thought ────────────────────────────────────────
  const dropThought = useCallback(() => {
    if (!thoughtInput.trim()) return;
    const emojis: Record<string, string> = { thought: "\uD83D\uDCAD", fire: "\uD83D\uDD25", seed: "\uD83C\uDF31", tension: "\u26A1" };
    const t: Thought = { id: Date.now().toString(), afterPara: -1, by: currentUserId!, byName: currentUserName, type: thoughtType, emoji: emojis[thoughtType], text: thoughtInput.trim(), createdAt: new Date().toISOString() };
    setThoughts((prev) => [...prev, t]);
    fetch(`/api/stories/${storyId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `${emojis[thoughtType]} ${thoughtInput.trim()}`, type: "suggestion" }) }).catch(() => {});
    setThoughtInput("");
    setEnergy((e) => Math.min(10, e + 1));
  }, [thoughtInput, thoughtType, currentUserId, currentUserName, storyId]);

  const handleEditorReady = useCallback((editor: Editor) => { editorRef.current = editor; }, []);

  // ── Loading / Error ─────────────────────────────────────
  if (loading) return (
    <div className="h-screen w-full bg-void flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="w-6 h-6 border-2 border-text-ghost/20 border-t-amber rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-ghost/30 text-[12px]">Entering the room...</p>
      </motion.div>
    </div>
  );
  if (error) return (
    <div className="h-screen w-full bg-void flex items-center justify-center">
      <div className="text-center"><p className="text-text-secondary text-sm mb-3">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="text-amber text-sm">Back to dashboard</button></div>
    </div>
  );

  const others = presences.filter((p) => p.userId !== currentUserId);
  const glowHue = energy > 6 ? "#D4A574" : energy > 3 ? "#6DB89B" : "#888";
  const glowIntensity = 0.02 + energy * 0.004;

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-void text-paper relative">

      {/* ── Ambient ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-[5000ms]"
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${glowHue}${Math.round(glowIntensity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)` }} />

      {/* ── Ceremony ──────────────────────────────────────── */}
      <AnimatePresence>
        {ceremony && (
          <motion.div key="ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-void/85 backdrop-blur-xl">
            <div className="text-center">
              <motion.svg width="48" height="48" viewBox="0 0 32 32" className="mx-auto mb-6"
                animate={{ rotate: [0, -20, 20, 0], y: [0, -14, 0] }} transition={{ duration: 1.8, ease: "easeInOut" }}>
                <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="#D4A574" opacity="0.85" />
                <path d="M7 28L5 29L4 27L7 28Z" fill="#D4A574" />
              </motion.svg>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="font-display text-2xl">
                <span className="text-amber">{ceremony.from}</span>
                <span className="text-text-ghost/40 mx-3 text-lg">passes the pen to</span>
                <span className="text-amber">{ceremony.to}</span>
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.2 }}
                className="text-text-ghost text-[13px] font-reading italic mt-4">The story continues...</motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Presence bar ──────────────────────────────────── */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: "spring", damping: 25 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-void/80 backdrop-blur-xl border border-paper/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          {/* People */}
          <div className="flex -space-x-1.5">
            {presences.map((p) => (
              <div key={p.userId} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-void overflow-hidden"
                style={{ backgroundColor: personColor(presences, p.userId) + "18", color: personColor(presences, p.userId) + "90",
                  boxShadow: p.status === "editing" ? `0 0 8px ${personColor(presences, p.userId)}40` : "none" }}
                title={`${p.displayName} (${p.role})`}>
                {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : (p.displayName || "?").charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          <div className="w-px h-5 bg-paper/[0.06]" />

          {/* Pen status */}
          {penHolder ? (
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: personColor(presences, penHolder.userId) + "70" }}>
              <svg width="8" height="8" viewBox="0 0 32 32" fill="currentColor">
                <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" />
              </svg>
              {iHoldPen ? "Your pen" : `${holderName}\u2019s pen`}
            </span>
          ) : (
            <span className="text-[10px] text-text-ghost/30">pen resting</span>
          )}

          <div className="w-px h-5 bg-paper/[0.06]" />

          {/* Energy */}
          <span className={`text-[10px] ${energy > 6 ? "text-amber/60" : energy > 3 ? "text-teal/50" : "text-text-ghost/30"}`}>
            {energy > 6 ? "\uD83D\uDD25" : energy > 3 ? "\uD83C\uDF0A" : "\uD83C\uDF19"}
          </span>

          {/* Save indicator */}
          {saveState === "saving" && <span className="text-[9px] text-amber/40 animate-pulse">saving</span>}
          {saveState === "saved" && <span className="text-[9px] text-sage/40">saved</span>}
          {saveState === "conflict" && <span className="text-[9px] text-rose/50">conflict</span>}

          {/* Chapter picker */}
          <div className="relative">
            <button onClick={() => setShowChapters(!showChapters)}
              className="text-[10px] text-text-ghost/40 hover:text-text-ghost/70 transition-colors flex items-center gap-1">
              Ch. {activeChapterIdx + 1}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showChapters ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <AnimatePresence>
              {showChapters && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 4, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute top-full right-0 mt-1 w-56 bg-elevated/95 backdrop-blur-xl border border-border rounded-xl p-1.5 shadow-2xl z-50">
                  {chapters.map((ch, i) => (
                    <button key={ch.id} onClick={() => selectChapter(ch.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all ${ch.id === activeChapterId ? "text-amber bg-amber/[0.05]" : "text-text-secondary/60 hover:text-paper hover:bg-surface/30"}`}>
                      <span className="text-text-ghost/30 mr-1.5">{i + 1}.</span>{ch.title}
                      <span className="text-text-ghost/20 ml-1 text-[10px]">{ch.wordCount}w</span>
                    </button>
                  ))}
                  <button onClick={addChapter}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-text-ghost/30 hover:text-amber transition-colors flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    New chapter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat toggle */}
          <button onClick={() => setChatOpen(!chatOpen)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${chatOpen ? "bg-amber/10 text-amber" : "text-text-ghost/30 hover:text-text-ghost/60"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>

          {/* Workshop link */}
          <Link href={`/story/${storySlug}/workshop`} className="text-text-ghost/25 hover:text-text-ghost/50 transition-colors" title="Workshop">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
          </Link>
        </div>
      </motion.header>

      {/* ── Chat drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[300px] z-40 bg-void/95 backdrop-blur-xl border-l border-paper/[0.04] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
            <div className="px-4 py-3 border-b border-paper/[0.04] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost/40">The Room</span>
              <button onClick={() => setChatOpen(false)} className="text-text-ghost/30 hover:text-text-ghost/60 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: "none" }}>
              {activities.length === 0 && <p className="text-[10px] text-text-ghost/20 text-center py-8 italic">The room is quiet</p>}
              {activities.map((a) => {
                if (a.type !== "chat") {
                  return <p key={a.id} className="text-[9px] text-text-ghost/25 text-center py-0.5">
                    <span className="text-text-ghost/40">{a.user?.id === currentUserId ? "You" : a.user?.displayName}</span> {a.content}
                  </p>;
                }
                const isMe = a.user?.id === currentUserId;
                return (
                  <div key={a.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[8px] text-text-ghost/25 mb-0.5">{isMe ? "You" : a.user?.displayName}</span>
                    <div className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed max-w-[90%] ${
                      isMe ? "bg-amber/[0.06] border border-amber/10 text-paper/70 rounded-br-sm" : "bg-paper/[0.03] border border-paper/[0.04] text-text-secondary/70 rounded-bl-sm"
                    }`}>{a.content}</div>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-3 border-t border-paper/[0.04]">
              <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Say something..."
                  className="flex-1 bg-paper/[0.02] border border-paper/[0.05] rounded-xl py-2 px-3 text-[12px] text-paper/70 outline-none focus:border-amber/15 transition-colors placeholder:text-text-ghost/15" />
                <button type="submit" disabled={!chatInput.trim() || chatSending}
                  className="text-amber/40 hover:text-amber/80 transition-colors disabled:opacity-20 px-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════ */}
      {/*  THE SCROLL                                       */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="relative z-10 min-h-screen">
        <div className="max-w-[640px] mx-auto px-8 sm:px-12">

          {/* ── Nothing written yet ───────────────────────── */}
          {chapters.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="min-h-screen flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber/[0.06] border border-amber/15 flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="#D4A574" opacity="0.7">
                  <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-paper mb-3">The page is still blank</h2>
              <p className="text-text-secondary text-[13px] leading-relaxed max-w-sm mb-8">
                Nobody has written anything yet. Start the first chapter and the rest of the room can pick up the pen after you.
              </p>
              <button onClick={createFirstChapter} disabled={creatingFirst}
                className="px-6 py-3 rounded-2xl bg-amber/[0.08] border border-amber/20 text-amber text-[13px] font-medium hover:bg-amber/[0.14] transition-all disabled:opacity-40">
                {creatingFirst ? "Starting…" : "Begin the first chapter"}
              </button>
            </motion.div>
          )}

          {/* ── Chapter header ────────────────────────────── */}
          {chapters.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
            className="pt-24 pb-16 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-ghost/25 mb-3">
              {activeChapterIdx >= 0 ? `Chapter ${activeChapterIdx + 1}` : ""}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-paper/85 mb-5 leading-tight">
              {activeChapter?.title || "Untitled"}
            </h1>
            <div className="flex items-center justify-center gap-4">
              {presences.map((p) => (
                <div key={p.userId} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: personColor(presences, p.userId) + "50" }} />
                  <span className="text-[10px]" style={{ color: personColor(presences, p.userId) + "40" }}>
                    {p.userId === currentUserId ? "You" : p.displayName?.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-ghost/20 mt-3">
              {activeChapter?.wordCount.toLocaleString()} words &middot; {totalWords.toLocaleString()} total
            </p>
          </motion.div>
          )}

          {/* ── The Editor ─────────────────────────────────── */}
          {activeChapter && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}>

              {/* Someone else is writing indicator */}
              {penHolder && !iHoldPen && (
                <div className="flex items-center gap-2 mb-4">
                  <motion.span animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}
                    className="text-[12px] font-reading italic" style={{ color: personColor(presences, penHolder.userId) + "60" }}>
                    {holderName} is writing...
                  </motion.span>
                </div>
              )}

              <div className={!iHoldPen ? "opacity-85" : ""}>
                <EditorErrorBoundary>
                  <ProseEditor
                    content={activeChapter.content}
                    onUpdate={handleContentUpdate}
                    onEditorReady={handleEditorReady}
                  />
                </EditorErrorBoundary>
              </div>
            </motion.div>
          )}

          {/* ── Inline thoughts ────────────────────────────── */}
          {thoughts.length > 0 && (
            <div className="mt-8 space-y-3">
              {thoughts.map((t) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", damping: 22 }}
                  className="flex items-start gap-3 pl-5 py-3 border-l-[2.5px] rounded-r-xl bg-paper/[0.01] hover:bg-paper/[0.02] transition-colors"
                  style={{ borderColor: (t.by === currentUserId ? "#D4A574" : "#A78BDB") + "25" }}>
                  <span className="text-[15px] mt-0.5 shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-secondary/60 leading-relaxed">{t.text}</p>
                    <p className="text-[10px] mt-1.5 text-text-ghost/30">{t.by === currentUserId ? "You" : t.byName}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Pen zone ───────────────────────────────────── */}
          {chapters.length > 0 && (
          <div className="pt-8 pb-6">
            {!penHolder && (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="h-px w-16 bg-paper/[0.06] mb-4" />
                <button onClick={pickUpPen}
                  className="group flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-700 hover:bg-amber/[0.04]">
                  <motion.svg width="20" height="20" viewBox="0 0 32 32"
                    animate={{ rotate: [0, -3, 3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="group-hover:rotate-[-12deg] transition-transform duration-700">
                    <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="#D4A574" opacity="0.5"
                      className="group-hover:opacity-80 transition-opacity duration-700" />
                  </motion.svg>
                  <span className="text-amber/40 text-[13px] font-display group-hover:text-amber/70 transition-colors duration-500">Pick up the pen</span>
                </button>
              </div>
            )}

            {iHoldPen && (
              <div className="flex items-center gap-3 pt-4">
                <div className="w-2 h-2 rounded-full bg-amber/50 animate-pulse" />
                <span className="text-[11px] text-amber/40 font-reading italic">You hold the pen</span>
                <span className="text-text-ghost/15 mx-1">&middot;</span>
                <button onClick={putDownPen} className="text-[10px] text-text-ghost/25 hover:text-text-ghost/50 transition-colors">set down</button>
                {others.map((p) => (
                  <button key={p.userId} onClick={() => passPen(p.userId)}
                    className="text-[10px] transition-colors" style={{ color: personColor(presences, p.userId) + "40" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = personColor(presences, p.userId) + "90")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = personColor(presences, p.userId) + "40")}>
                    pass to {p.displayName?.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* ── Thought input ──────────────────────────────── */}
          {chapters.length > 0 && (
          <div className="pb-20 pt-4">
            <div className="border-t border-paper/[0.04] pt-6">
              <div className="flex items-center gap-2 mb-3">
                {(["thought", "fire", "seed", "tension"] as const).map((t) => {
                  const emojis: Record<string, string> = { thought: "\uD83D\uDCAD", fire: "\uD83D\uDD25", seed: "\uD83C\uDF31", tension: "\u26A1" };
                  const labels: Record<string, string> = { thought: "Thought", fire: "Hot take", seed: "Seed", tension: "Tension" };
                  return (
                    <button key={t} onClick={() => setThoughtType(t)}
                      className={`px-3 py-1 rounded-full text-[10px] transition-all ${
                        thoughtType === t ? "bg-amber/[0.06] text-amber border border-amber/15" : "text-text-ghost/25 hover:text-text-ghost/50 border border-transparent"
                      }`}>
                      {emojis[t]} {labels[t]}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2.5">
                <input value={thoughtInput} onChange={(e) => setThoughtInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") dropThought(); }}
                  placeholder="Drop a thought between the lines..."
                  className="flex-1 bg-paper/[0.015] border border-paper/[0.05] rounded-2xl py-3 px-5 text-[13px] text-paper/70 outline-none focus:border-amber/15 focus:bg-paper/[0.025] transition-all placeholder:text-text-ghost/15" />
                <button onClick={dropThought} disabled={!thoughtInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-amber/[0.04] border border-amber/10 text-amber/40 text-[12px] font-medium hover:bg-amber/[0.08] hover:text-amber/70 transition-all disabled:opacity-15">
                  Drop
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
