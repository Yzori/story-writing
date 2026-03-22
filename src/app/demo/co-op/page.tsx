"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Demo Data ──────────────────────────────────────────────

const TEAM = [
  { id: "u1", name: "You", initials: "Y", role: "writer" as const, status: "accepted" as const, color: "amber" },
  { id: "u2", name: "Elena Solis", initials: "ES", role: "writer" as const, status: "accepted" as const, color: "amber" },
  { id: "u3", name: "Mika Tanaka", initials: "MT", role: "illustrator" as const, status: "accepted" as const, color: "lavender" },
  { id: "u4", name: "Dev Okonkwo", initials: "DO", role: "worldbuilder" as const, status: "pending" as const, color: "sage" },
];

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  writer: { bg: "bg-amber/10", text: "text-amber", border: "border-amber/20" },
  illustrator: { bg: "bg-lavender/10", text: "text-lavender", border: "border-lavender/20" },
  editor: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/20" },
  worldbuilder: { bg: "bg-sage/10", text: "text-sage", border: "border-sage/20" },
};

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-sage/10 text-sage border-sage/20",
  pending: "bg-amber/10 text-amber border-amber/20",
  declined: "bg-rose/10 text-rose border-rose/20",
};

const CHAPTERS = [
  { id: "ch1", title: "The Cartographer's Daughter", words: 3847, status: "published" },
  { id: "ch2", title: "Maps of Nowhere", words: 2103, status: "published" },
  { id: "ch3", title: "The Compass Rose", words: 1456, status: "draft" },
];

const EDITOR_LINES = [
  "The old map room smelled of cedar and forgotten expeditions.",
  "Elara traced her finger along the coastline her father had",
  "drawn \u2014 every cove memorized, every reef annotated in his",
  "precise hand. She'd spent seventeen years in this room, and",
  "still the maps whispered secrets she couldn't quite hear.",
  "",
  "\u201CYou're doing it again,\u201D said Kael from the doorway, arms",
  "crossed, the afternoon light catching the silver threads in",
  "his dark hair.",
  "",
  "Elara didn't look up. Her father's final map was spread",
  "across the table, weighted at the corners with river stones.",
];

const ELENA_TYPING = [
  "The eastern edge was torn \u2014 deliberately, she now",
  "realized. Someone had removed the part that mattered most.",
];

const SUGGESTIONS = [
  {
    id: "s1",
    user: TEAM[1],
    chapter: "The Compass Rose",
    content: "I think Kael's reaction to the torn map should be more visceral \u2014 he's a navigator, this would feel like sacrilege to him. Maybe add a line about his hands trembling?",
    note: "Connects to his backstory reveal in Ch. 5",
    status: "pending" as const,
    time: "2h ago",
  },
  {
    id: "s2",
    user: TEAM[2],
    chapter: "Maps of Nowhere",
    content: "Added illustration notes for the map room scene \u2014 warm candlelight, cedar walls, maps pinned floor to ceiling. Think Vermeer meets fantasy cartography.",
    note: null,
    status: "woven" as const,
    time: "1d ago",
  },
  {
    id: "s3",
    user: TEAM[1],
    chapter: "The Cartographer's Daughter",
    content: "The opening line feels too passive. What about starting in media res with Elara discovering the torn edge?",
    note: "Just a thought \u2014 the current version is beautiful too",
    status: "passed" as const,
    time: "3d ago",
  },
];

const SUGGESTION_COLORS: Record<string, string> = {
  pending: "bg-amber/10 text-amber border-amber/20",
  woven: "bg-sage/10 text-sage border-sage/20",
  revised: "bg-lavender/10 text-lavender border-lavender/20",
  passed: "bg-rose/10 text-rose border-rose/20",
};

const LORE_ENTRIES = [
  { id: "l1", category: "character", title: "Elara Voss", content: "23, auburn hair, green eyes. Daughter of master cartographer Harlan Voss. Grew up in the map room. Can read star charts and navigate by memory. Stubborn, curious, haunted by her father's disappearance.", user: TEAM[0] },
  { id: "l2", category: "character", title: "Kael Ashwick", content: "28, tall, silver-threaded dark hair. Former navigator turned smuggler. Sarcastic exterior masks deep loyalty. Smells of woodsmoke and ink. Owes Harlan a debt he never speaks of.", user: TEAM[1] },
  { id: "l3", category: "place", title: "The Map Room", content: "Cedar-paneled chamber in the Voss family tower. Floor-to-ceiling maps from every known expedition. River stones used as weights. Smells of cedar, old paper, and candlewax. A brass orrery hangs from the ceiling.", user: TEAM[2] },
  { id: "l4", category: "place", title: "The Thornwall Mountains", content: "Impassable range separating the Known Lands from the eastern territories. Peaks perpetually shrouded in storm clouds. Said to be cursed by the old cartographers' guild. The only known pass was sealed a century ago.", user: TEAM[3] },
  { id: "l5", category: "item", title: "Harlan's Final Map", content: "Drawn on treated lambskin with iron-gall ink. Shows the full coastline from Port Ashenmere to the Thornwall foothills. Eastern edge deliberately torn away. Hidden annotations visible only under moonlight.", user: TEAM[0] },
];

const LORE_CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  character: { bg: "bg-amber/10", text: "text-amber", border: "border-amber/20" },
  place: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/20" },
  event: { bg: "bg-lavender/10", text: "text-lavender", border: "border-lavender/20" },
  item: { bg: "bg-copper/10", text: "text-copper", border: "border-copper/20" },
  lore: { bg: "bg-violet/10", text: "text-violet", border: "border-violet/20" },
};

// ─── Simulated Collaborator Cursor ──────────────────────────

function CollaboratorCursor({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-end gap-0 relative">
      <motion.span
        className="inline-block w-[2px] h-[18px] rounded-full"
        style={{ backgroundColor: color }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-medium"
        style={{ backgroundColor: color, color: "#0a0a0a" }}
      >
        {name}
      </motion.span>
    </span>
  );
}

// ─── Live Editor Simulation ─────────────────────────────────

function LiveEditorSim() {
  const [activeChapter, setActiveChapter] = useState("ch3");
  const [typedChars, setTypedChars] = useState(0);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const typingText = ELENA_TYPING.join(" ");

  useEffect(() => {
    const interval = setInterval(() => {
      setTypedChars((prev) => {
        if (prev >= typingText.length) return prev;
        return prev + 1;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [typingText.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!conflictDismissed) setShowConflict(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [conflictDismissed]);

  const visibleTyped = typingText.slice(0, typedChars);
  const isTyping = typedChars < typingText.length;

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-surface/50 backdrop-blur-sm">
      {/* Editor title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-void/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-sage/40" />
          </div>
          <span className="text-[11px] text-text-ghost font-mono ml-2">The Cartographer's Daughter &mdash; Co-op Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Collaborator presence dots */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-sage animate-pulse" title="You (online)" />
            <div className="w-2 h-2 rounded-full bg-amber animate-pulse" title="Elena (online)" />
            <div className="w-2 h-2 rounded-full bg-lavender/40" title="Mika (away)" />
          </div>
          <span className="text-[10px] text-text-ghost">2 online</span>
        </div>
      </div>

      <div className="flex min-h-[380px]">
        {/* Chapter sidebar */}
        <div className="w-[180px] border-r border-border bg-void/40 p-3 shrink-0 hidden sm:block">
          <p className="text-[9px] uppercase tracking-[0.14em] text-text-ghost mb-3">Chapters</p>
          <div className="space-y-1">
            {CHAPTERS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[12px] transition-all ${
                  activeChapter === ch.id
                    ? "bg-amber/[0.06] border border-amber/15 text-paper"
                    : "text-text-secondary hover:text-text hover:bg-subtle/30"
                }`}
              >
                <p className="truncate font-medium">{ch.title}</p>
                <p className="text-[10px] text-text-ghost mt-0.5">
                  {ch.words.toLocaleString()}w &middot; {ch.status}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 p-6 sm:p-8 relative">
          <div className="max-w-[520px] mx-auto font-reading text-[15px] leading-[1.85] text-text space-y-5">
            {/* Existing paragraphs */}
            <p>
              {EDITOR_LINES.slice(0, 5).join(" ")}
            </p>
            <p>
              {EDITOR_LINES.slice(6, 9).join(" ")}
            </p>
            <p>
              {EDITOR_LINES.slice(10, 12).join(" ")}
            </p>

            {/* Elena's live typing */}
            {visibleTyped && (
              <p>
                <span className="text-amber/90">{visibleTyped}</span>
                {isTyping && (
                  <CollaboratorCursor name="Elena" color="#d4a574" />
                )}
              </p>
            )}
          </div>

          {/* Conflict banner */}
          <AnimatePresence>
            {showConflict && !conflictDismissed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-5 py-3 rounded-xl bg-amber/10 border border-amber/20 backdrop-blur-xl text-amber text-[13px] shadow-2xl shadow-black/40 max-w-[95%]"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Elena edited this chapter. Your draft is saved locally.</span>
                <span className="sm:hidden">Conflict detected</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConflictDismissed(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber/20 hover:bg-amber/30 transition-colors font-medium text-[11px]"
                  >
                    Reload
                  </button>
                  <button
                    onClick={() => setConflictDismissed(true)}
                    className="px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:bg-surface transition-colors font-medium text-[11px] text-text-secondary hidden sm:block"
                  >
                    Copy my draft
                  </button>
                  <button
                    onClick={() => setConflictDismissed(true)}
                    className="px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:bg-surface transition-colors font-medium text-[11px] text-text-secondary hidden sm:block"
                  >
                    Keep mine
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Workshop Tabs ──────────────────────────────────────────

type WorkshopTab = "team" | "suggestions" | "lore" | "agreement";

function WorkshopSection() {
  const [tab, setTab] = useState<WorkshopTab>("team");
  const [expandedLore, setExpandedLore] = useState<Set<string>>(new Set(["l1"]));
  const [signed, setSigned] = useState(false);

  const tabs: { id: WorkshopTab; label: string }[] = [
    { id: "team", label: "Team" },
    { id: "suggestions", label: "Suggestions" },
    { id: "lore", label: "Lore Book" },
    { id: "agreement", label: "Agreement" },
  ];

  const toggleLore = (id: string) => {
    setExpandedLore((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-surface/50 backdrop-blur-sm">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-void/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-3 text-[12px] font-medium transition-all relative ${
              tab === t.id ? "text-amber" : "text-text-ghost hover:text-text-secondary"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="workshop-tab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber/60"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {t.id === "suggestions" && (
              <span className="ml-1.5 inline-flex w-4 h-4 items-center justify-center rounded-full bg-amber/15 text-amber text-[9px] font-bold">1</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 min-h-[340px]">
        <AnimatePresence mode="wait">
          {/* ── Team Tab ─────────────────────────────────── */}
          {tab === "team" && (
            <motion.div key="team" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="space-y-3">
                {TEAM.map((member) => {
                  const role = ROLE_STYLES[member.role];
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink/50 border border-border-subtle">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-display font-bold border ${role.bg} ${role.text} ${role.border}`}>
                        {member.initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-paper text-[13px] font-medium truncate">
                          {member.name}
                          {member.id === "u1" && <span className="text-text-ghost text-[11px] ml-1">(you)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${role.bg} ${role.text} ${role.border}`}>
                            {member.role}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[member.status]}`}>
                            {member.status}
                          </span>
                        </div>
                      </div>
                      {/* Online indicator */}
                      {member.status === "accepted" && member.id !== "u4" && (
                        <div className="w-2 h-2 rounded-full bg-sage/60" title="Online" />
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="mt-4 w-full px-4 py-2.5 rounded-xl border border-dashed border-amber/20 text-amber text-[12px] font-medium hover:bg-amber/[0.04] hover:border-amber/30 transition-all flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                Invite collaborator
              </button>
            </motion.div>
          )}

          {/* ── Suggestions Tab ──────────────────────────── */}
          {tab === "suggestions" && (
            <motion.div key="suggestions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="space-y-3">
                {SUGGESTIONS.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-ink/50 border border-border-subtle">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${ROLE_STYLES[s.user.role].bg} ${ROLE_STYLES[s.user.role].text}`}>
                          {s.user.initials}
                        </div>
                        <span className="text-paper text-[12px] font-medium">{s.user.name}</span>
                        <span className="text-text-ghost text-[11px]">&middot; {s.time}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SUGGESTION_COLORS[s.status]}`}>
                        {s.status}
                      </span>
                    </div>
                    {/* Chapter reference */}
                    <p className="text-[10px] text-text-ghost mb-2">
                      re: <span className="text-text-secondary">{s.chapter}</span>
                    </p>
                    {/* Content */}
                    <p className="text-text-secondary text-[13px] leading-relaxed mb-2">{s.content}</p>
                    {s.note && (
                      <p className="text-text-ghost text-[11px] italic">{s.note}</p>
                    )}
                    {/* Review actions for pending */}
                    {s.status === "pending" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                        <button className="px-3 py-1.5 rounded-lg bg-sage/10 text-sage text-[11px] font-medium border border-sage/20 hover:bg-sage/20 transition-colors">
                          Weave in
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-rose/10 text-rose text-[11px] font-medium border border-rose/20 hover:bg-rose/20 transition-colors">
                          Pass
                        </button>
                        <input
                          placeholder="Review note..."
                          className="flex-1 bg-elevated border border-border rounded-lg px-3 py-1.5 text-[11px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Lore Book Tab ────────────────────────────── */}
          {tab === "lore" && (
            <motion.div key="lore" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {(["character", "place", "item"] as const).map((cat) => {
                const entries = LORE_ENTRIES.filter((e) => e.category === cat);
                if (entries.length === 0) return null;
                const style = LORE_CATEGORY_STYLES[cat];
                return (
                  <div key={cat} className="mb-5">
                    <p className={`text-[10px] uppercase tracking-[0.14em] mb-2 ${style.text}`}>
                      {cat === "character" ? "Characters" : cat === "place" ? "Places" : "Items"}
                      <span className="text-text-ghost ml-1">({entries.length})</span>
                    </p>
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div key={entry.id} className={`rounded-xl border ${style.border} overflow-hidden`}>
                          <button
                            onClick={() => toggleLore(entry.id)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${style.bg}`}
                          >
                            <span className={`text-[13px] font-medium ${style.text}`}>{entry.title}</span>
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`transition-transform ${expandedLore.has(entry.id) ? "rotate-180" : ""} text-text-ghost`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                          <AnimatePresence>
                            {expandedLore.has(entry.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 py-3 bg-ink/30">
                                  <p className="text-text-secondary text-[13px] leading-relaxed">{entry.content}</p>
                                  <p className="text-text-ghost text-[10px] mt-2">
                                    Added by {entry.user.name}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button className="w-full px-4 py-2.5 rounded-xl border border-dashed border-teal/20 text-teal text-[12px] font-medium hover:bg-teal/[0.04] hover:border-teal/30 transition-all flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                Add lore entry
              </button>
            </motion.div>
          )}

          {/* ── Agreement Tab ────────────────────────────── */}
          {tab === "agreement" && (
            <motion.div key="agreement" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="rounded-xl border border-border bg-ink/50 p-5">
                {/* Template badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">Collaboration Agreement</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sage/10 text-sage border border-sage/20">
                    {signed ? "Active" : "Draft"}
                  </span>
                </div>
                <h4 className="text-paper font-display text-lg mb-1">Equal Partners</h4>
                <p className="text-text-ghost text-[12px] mb-5">All contributors share credit and revenue equally.</p>

                {/* Splits */}
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3">Revenue Splits</p>
                <div className="space-y-2 mb-5">
                  {TEAM.filter((m) => m.status === "accepted").map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${ROLE_STYLES[member.role].bg} ${ROLE_STYLES[member.role].text}`}>
                        {member.initials}
                      </div>
                      <span className="text-text text-[13px] flex-1">{member.name}</span>
                      <span className="text-amber font-mono text-[13px] font-medium">33.3%</span>
                    </div>
                  ))}
                </div>

                {/* Signatures */}
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3">Signatures</p>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-[12px]">
                    <div className="w-4 h-4 rounded-full bg-sage/20 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-sage"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-text-secondary">You</span>
                    <span className="text-text-ghost ml-auto">Signed</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <div className="w-4 h-4 rounded-full bg-sage/20 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-sage"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-text-secondary">Elena Solis</span>
                    <span className="text-text-ghost ml-auto">Signed</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    {signed ? (
                      <div className="w-4 h-4 rounded-full bg-sage/20 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-sage"><path d="M5 13l4 4L19 7" /></svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border" />
                    )}
                    <span className="text-text-secondary">Mika Tanaka</span>
                    <span className="text-text-ghost ml-auto">{signed ? "Signed" : "Awaiting"}</span>
                  </div>
                </div>

                {!signed && (
                  <button
                    onClick={() => setSigned(true)}
                    className="w-full py-2.5 rounded-xl bg-amber text-void font-semibold text-[13px] hover:bg-amber/90 transition-colors"
                  >
                    Sign as Mika Tanaka
                  </button>
                )}
                {signed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-2 text-sage text-[13px] font-medium"
                  >
                    All parties have signed. Agreement is now active.
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── How It Works ───────────────────────────────────────────

const STEPS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    ),
    title: "Invite your team",
    desc: "Add writers, illustrators, editors, and worldbuilders. Each role brings a unique perspective to your shared story.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Write together",
    desc: "Edit chapters with version protection. Build shared lore. Submit suggestions and weave feedback into the narrative.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    title: "Review and agree",
    desc: "Set credit splits, sign collaboration agreements, and publish with full attribution for every contributor.",
  },
];

// ─── Main Page ──────────────────────────────────────────────

export default function CoOpDemoPage() {
  return (
    <div className="min-h-screen bg-void text-text">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber/[0.03] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber/[0.04] rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-text-ghost text-[12px] hover:text-text-secondary transition-colors mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to Quiloria
          </Link>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/20 text-amber text-[12px] font-medium mb-6"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Co-op Writing Mode
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl text-paper font-bold mb-4 leading-tight"
          >
            Write stories together
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-text-secondary text-lg max-w-xl mx-auto mb-8 leading-relaxed"
          >
            Invite your team, build shared lore, weave each other's suggestions
            into the narrative, and publish with fair attribution.
          </motion.p>

          {/* Team avatars */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center mb-2"
          >
            <div className="flex -space-x-2">
              {TEAM.map((m) => {
                const role = ROLE_STYLES[m.role];
                return (
                  <div
                    key={m.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-display font-bold border-2 border-void ${role.bg} ${role.text}`}
                    title={`${m.name} (${m.role})`}
                  >
                    {m.initials}
                  </div>
                );
              })}
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-text-ghost text-[12px]"
          >
            4 collaborators on &ldquo;The Cartographer&rsquo;s Daughter&rdquo;
          </motion.p>
        </div>
      </section>

      {/* ── Live Editor Demo ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 text-center">Live Editor</p>
          <LiveEditorSim />
        </motion.div>
      </section>

      {/* ── Workshop Demo ─────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 text-center">The Workshop</p>
          <h2 className="font-display text-2xl text-paper text-center mb-6">Your collaboration hub</h2>
          <WorkshopSection />
        </motion.div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3 text-center">How It Works</p>
          <h2 className="font-display text-2xl text-paper text-center mb-10">Three steps to collaborative writing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="text-center p-6 rounded-2xl border border-border bg-surface/30 hover:bg-surface/50 transition-colors group"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center text-amber group-hover:bg-amber/15 transition-colors">
                  {step.icon}
                </div>
                <h3 className="font-display text-paper text-lg mb-2">{step.title}</h3>
                <p className="text-text-secondary text-[13px] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-display text-2xl text-paper mb-3">Ready to write together?</h2>
          <p className="text-text-secondary text-[14px] mb-6">Create a co-op story and invite your first collaborator.</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-amber text-void font-display font-semibold text-[15px] hover:bg-amber/90 transition-colors shadow-[0_0_20px_rgba(200,150,60,0.15)] hover:shadow-[0_0_30px_rgba(200,150,60,0.25)]"
          >
            Start a co-op story
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
