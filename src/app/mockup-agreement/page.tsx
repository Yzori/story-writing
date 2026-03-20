"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Mock Data ───────────────────────────────────────────────

const MOCK_OWNER = {
  userId: "owner-001",
  displayName: "Aurelia Nightshade",
  avatarUrl: null as string | null,
  role: "owner",
};

const MOCK_COLLABORATORS = [
  {
    userId: "collab-001",
    displayName: "Orion Blackwood",
    avatarUrl: null as string | null,
    role: "writer",
  },
  {
    userId: "collab-002",
    displayName: "Sable Moonsong",
    avatarUrl: null as string | null,
    role: "illustrator",
  },
  {
    userId: "collab-003",
    displayName: "Thorne Ashford",
    avatarUrl: null as string | null,
    role: "editor",
  },
];

const ALL_PARTICIPANTS = [MOCK_OWNER, ...MOCK_COLLABORATORS];

interface SplitEntry {
  userId: string;
  percent: number;
}

interface Confirmation {
  userId: string;
  confirmedAt: string;
}

interface AgreementData {
  template: string;
  splits: SplitEntry[];
  creditFormat: string | null;
  terms: string | null;
  version: number;
  status: string;
  confirmations: Confirmation[];
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  writer: "bg-amber/15 text-amber border-amber/20",
  illustrator: "bg-lavender/15 text-lavender border-lavender/20",
  editor: "bg-teal/15 text-teal border-teal/20",
  worldbuilder: "bg-sage/15 text-sage border-sage/20",
  owner: "bg-amber/15 text-amber border-amber/20",
};

const ROLE_BAR_COLORS: Record<string, string> = {
  writer: "bg-amber",
  illustrator: "bg-lavender",
  editor: "bg-teal",
  worldbuilder: "bg-sage",
  owner: "bg-amber",
};

const ROLE_LABELS: Record<string, string> = {
  writer: "Writer",
  illustrator: "Illustrator",
  editor: "Editor",
  worldbuilder: "Worldbuilder",
  owner: "Owner",
};

const TEMPLATES = [
  {
    key: "equal-partners",
    label: "Equal Partners",
    desc: "Split everything equally",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 014-4h2" />
        <path d="M15 15h2a4 4 0 014 4v2" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    key: "lead-contributor",
    label: "Lead Contributor",
    desc: "One lead, others supporting",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="7" r="4" />
        <path d="M5 21v-2a7 7 0 0114 0v2" />
        <path d="M12 14v3" />
      </svg>
    ),
  },
  {
    key: "work-for-hire",
    label: "Work for Hire",
    desc: "Owner retains all rights",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    key: "custom",
    label: "Custom",
    desc: "Set your own terms",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-amber/10 text-amber border-amber/20",
  active: "bg-sage/10 text-sage border-sage/20",
  superseded: "bg-surface text-text-ghost border-border",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// ── Demo Scenarios ──────────────────────────────────────────

type DemoView = "empty" | "create" | "display" | "signing" | "active" | "history";
type DemoRole = "owner" | "collaborator";

// ── Component ───────────────────────────────────────────────

export default function MockupAgreementPage() {
  const [demoView, setDemoView] = useState<DemoView>("empty");
  const [demoRole, setDemoRole] = useState<DemoRole>("owner");
  const [showSignModal, setShowSignModal] = useState(false);
  const [signed, setSigned] = useState(false);

  // Form state
  const [template, setTemplate] = useState("equal-partners");
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [creditFormat, setCreditFormat] = useState("");
  const [terms, setTerms] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Agreement data for display views
  const [agreement, setAgreement] = useState<AgreementData | null>(null);

  const getParticipant = (userId: string) =>
    ALL_PARTICIPANTS.find((p) => p.userId === userId);

  const applyTemplate = useCallback(
    (tmpl: string, currentSplits?: SplitEntry[]) => {
      const userIds = ALL_PARTICIPANTS.map((p) => p.userId);
      let newSplits: SplitEntry[];

      switch (tmpl) {
        case "equal-partners": {
          const each = Math.floor((100 / userIds.length) * 100) / 100;
          newSplits = userIds.map((id, i) => ({
            userId: id,
            percent: i === 0 ? Math.round((100 - each * (userIds.length - 1)) * 100) / 100 : each,
          }));
          break;
        }
        case "lead-contributor": {
          const leadPercent = 60;
          const rest = Math.floor(((100 - leadPercent) / (userIds.length - 1)) * 100) / 100;
          newSplits = userIds.map((id, i) => ({
            userId: id,
            percent: i === 0 ? Math.round((100 - rest * (userIds.length - 1)) * 100) / 100 : rest,
          }));
          break;
        }
        case "work-for-hire":
          newSplits = userIds.map((id, i) => ({
            userId: id,
            percent: i === 0 ? 100 : 0,
          }));
          break;
        default:
          if (currentSplits && currentSplits.length === userIds.length) {
            newSplits = currentSplits;
          } else {
            const each = Math.floor((100 / userIds.length) * 100) / 100;
            newSplits = userIds.map((id, i) => ({
              userId: id,
              percent: i === 0 ? Math.round((100 - each * (userIds.length - 1)) * 100) / 100 : each,
            }));
          }
      }
      setSplits(newSplits);
    },
    []
  );

  const handleTemplateChange = (tmpl: string) => {
    setTemplate(tmpl);
    applyTemplate(tmpl, tmpl === "custom" ? splits : undefined);
  };

  const updateSplitPercent = (userId: string, percent: number) => {
    setSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, percent } : s))
    );
  };

  const splitsTotal = useMemo(
    () => splits.reduce((sum, s) => sum + s.percent, 0),
    [splits]
  );

  const isTotalValid = Math.abs(splitsTotal - 100) < 0.01;

  const creditPreview = useMemo(() => {
    if (creditFormat) return creditFormat;
    const names = ALL_PARTICIPANTS.map((p) =>
      p.displayName.replace(/\s*\(Owner\)$/, "")
    );
    if (names.length === 2) return `Written by ${names[0]} & ${names[1]}`;
    return `Written by ${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  }, [creditFormat]);

  // Scene transitions
  const handleStartCreate = () => {
    setTemplate("equal-partners");
    setCreditFormat("");
    setTerms("");
    setShowTerms(false);
    applyTemplate("equal-partners");
    setDemoView("create");
  };

  const handleSave = () => {
    setAgreement({
      template,
      splits: [...splits],
      creditFormat: creditFormat || null,
      terms: terms || null,
      version: 1,
      status: "draft",
      confirmations: [],
      createdAt: new Date().toISOString(),
    });
    setDemoView("display");
  };

  const handleShowSigning = () => {
    setAgreement({
      template: "lead-contributor",
      splits: [
        { userId: "owner-001", percent: 60 },
        { userId: "collab-001", percent: 20 },
        { userId: "collab-002", percent: 13.33 },
        { userId: "collab-003", percent: 6.67 },
      ],
      creditFormat: null,
      terms: "All collaborators retain moral rights to their individual contributions. Revenue from any adaptation is split proportionally.",
      version: 1,
      status: "draft",
      confirmations: [
        { userId: "collab-001", confirmedAt: new Date(Date.now() - 3600000).toISOString() },
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    });
    setDemoRole("collaborator");
    setSigned(false);
    setDemoView("signing");
  };

  const handleShowActive = () => {
    setAgreement({
      template: "equal-partners",
      splits: [
        { userId: "owner-001", percent: 25 },
        { userId: "collab-001", percent: 25 },
        { userId: "collab-002", percent: 25 },
        { userId: "collab-003", percent: 25 },
      ],
      creditFormat: "Written by Aurelia Nightshade, Orion Blackwood, Sable Moonsong & Thorne Ashford",
      terms: null,
      version: 2,
      status: "active",
      confirmations: ALL_PARTICIPANTS.map((p) => ({
        userId: p.userId,
        confirmedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      })),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    });
    setDemoRole("owner");
    setDemoView("active");
  };

  const handleSign = () => {
    setSigned(true);
    if (agreement) {
      const newConfs = [
        ...agreement.confirmations,
        { userId: "collab-002", confirmedAt: new Date().toISOString() },
      ];
      setAgreement({ ...agreement, confirmations: newConfs });
    }
    setTimeout(() => {
      setShowSignModal(false);
    }, 1500);
  };

  // Mock history
  const mockHistory: AgreementData[] = [
    {
      template: "equal-partners",
      splits: [
        { userId: "owner-001", percent: 25 },
        { userId: "collab-001", percent: 25 },
        { userId: "collab-002", percent: 25 },
        { userId: "collab-003", percent: 25 },
      ],
      creditFormat: null,
      terms: null,
      version: 2,
      status: "active",
      confirmations: ALL_PARTICIPANTS.map((p) => ({
        userId: p.userId,
        confirmedAt: new Date(Date.now() - 86400000).toISOString(),
      })),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      template: "lead-contributor",
      splits: [
        { userId: "owner-001", percent: 60 },
        { userId: "collab-001", percent: 20 },
        { userId: "collab-002", percent: 13.33 },
        { userId: "collab-003", percent: 6.67 },
      ],
      creditFormat: null,
      terms: null,
      version: 1,
      status: "superseded",
      confirmations: [
        { userId: "owner-001", confirmedAt: new Date(Date.now() - 604800000).toISOString() },
        { userId: "collab-001", confirmedAt: new Date(Date.now() - 518400000).toISOString() },
      ],
      createdAt: new Date(Date.now() - 604800000).toISOString(),
    },
  ];

  const currentUserId = demoRole === "owner" ? "owner-001" : "collab-002";
  const isOwner = demoRole === "owner";

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-void">
      {/* Demo Controls */}
      <div className="sticky top-0 z-40 bg-ink/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.15em] text-text-ghost font-mono">
            Agreement Demo
          </span>
          <div className="h-4 w-px bg-border" />

          {/* View selector */}
          {(
            [
              ["empty", "Empty"],
              ["create", "Create"],
              ["display", "Draft"],
              ["signing", "Signing"],
              ["active", "Active"],
              ["history", "History"],
            ] as [DemoView, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                if (key === "empty") {
                  setAgreement(null);
                  setDemoRole("owner");
                  setDemoView("empty");
                } else if (key === "create") {
                  handleStartCreate();
                } else if (key === "display") {
                  handleSave();
                } else if (key === "signing") {
                  handleShowSigning();
                } else if (key === "active") {
                  handleShowActive();
                } else if (key === "history") {
                  handleShowActive();
                  setShowHistory(true);
                  setDemoView("history");
                }
              }}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                demoView === key
                  ? "bg-amber/15 text-amber border-amber/25"
                  : "text-text-secondary border-transparent hover:text-text hover:border-border"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="h-4 w-px bg-border" />

          {/* Role toggle */}
          <div className="flex items-center gap-1 bg-surface/60 rounded-full border border-border p-0.5">
            <button
              onClick={() => setDemoRole("owner")}
              className={`text-[11px] px-3 py-1 rounded-full transition-all ${
                demoRole === "owner"
                  ? "bg-amber/15 text-amber"
                  : "text-text-ghost hover:text-text"
              }`}
            >
              Owner
            </button>
            <button
              onClick={() => setDemoRole("collaborator")}
              className={`text-[11px] px-3 py-1 rounded-full transition-all ${
                demoRole === "collaborator"
                  ? "bg-lavender/15 text-lavender"
                  : "text-text-ghost hover:text-text"
              }`}
            >
              Collaborator
            </button>
          </div>
        </div>
      </div>

      {/* Workshop Frame */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        {/* Workshop Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-text-ghost text-[12px] flex items-center gap-1 cursor-default">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Back to story
            </span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost bg-surface/80 px-2.5 py-1 rounded-full border border-border">
              Workshop
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-paper font-bold mt-3">
            The Clockwork Constellation
          </h1>
          <p className="text-text-secondary text-[13px] mt-2">
            Collaboration workspace for the team
          </p>
        </motion.div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 border-b border-border mb-6">
          {["Team", "Suggestions", "Lore Book", "Agreement"].map((tab) => (
            <button
              key={tab}
              className={`relative px-4 py-3 text-[13px] font-medium transition-colors ${
                tab === "Agreement"
                  ? "text-amber"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {tab}
              {tab === "Agreement" && (
                <motion.div
                  layoutId="demo-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Agreement Content */}
        <AnimatePresence mode="wait">
          {/* ═══ EMPTY STATE ═══ */}
          {demoView === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-surface/60 border border-border rounded-2xl p-14 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber/10 to-amber/5 border border-amber/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/50">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-paper mb-2">
                No creative agreement yet
              </h3>
              <p className="text-text-secondary text-[13px] mb-6 max-w-sm mx-auto">
                {isOwner
                  ? "Define how ownership, credit, and rights are shared among your collaborators."
                  : "The story owner hasn't created an agreement yet. Check back later."}
              </p>
              {isOwner && (
                <button
                  onClick={handleStartCreate}
                  className="px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200"
                >
                  Draft Agreement
                </button>
              )}
            </motion.div>
          )}

          {/* ═══ CREATE/EDIT FORM ═══ */}
          {demoView === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Template Selector */}
              <div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
                  Template
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleTemplateChange(t.key)}
                      className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                        template === t.key
                          ? "border-amber bg-amber/10"
                          : "border-border bg-surface/60 hover:border-border-subtle hover:bg-surface/80"
                      }`}
                    >
                      <div className={`mb-2 ${template === t.key ? "text-amber" : "text-text-ghost"}`}>
                        {t.icon}
                      </div>
                      <p className={`text-[13px] font-medium ${template === t.key ? "text-paper" : "text-text"}`}>
                        {t.label}
                      </p>
                      <p className="text-[11px] text-text-ghost mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Splits Editor */}
              <div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
                  Ownership Splits
                </span>
                <div className="space-y-3">
                  {splits.map((split) => {
                    const participant = getParticipant(split.userId);
                    const role = participant?.role || "writer";
                    return (
                      <div key={split.userId} className="bg-surface/60 border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[11px] font-display font-semibold flex-shrink-0">
                              {(participant?.displayName || "?").charAt(0)}
                            </div>
                            <span className="text-paper text-[13px] font-medium">
                              {participant?.displayName || "Unknown"}
                            </span>
                            <span
                              className={`text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${
                                ROLE_COLORS[role] || ROLE_COLORS.writer
                              }`}
                            >
                              {ROLE_LABELS[role] || role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={split.percent}
                              onChange={(e) =>
                                updateSplitPercent(
                                  split.userId,
                                  Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                                )
                              }
                              className="w-16 bg-ink border border-border rounded-lg px-2 py-1.5 text-paper text-[13px] text-right focus:outline-none focus:border-amber/30 transition-colors"
                            />
                            <span className="text-text-ghost text-[12px]">%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={split.percent}
                          onChange={(e) =>
                            updateSplitPercent(split.userId, parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber bg-ink [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-void [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Split Bar */}
                {splits.length > 0 && (
                  <div className="mt-4">
                    <div className="h-3 rounded-full overflow-hidden flex bg-ink border border-border">
                      {splits.map((split) => {
                        const participant = getParticipant(split.userId);
                        const role = participant?.role || "writer";
                        return split.percent > 0 ? (
                          <motion.div
                            key={split.userId}
                            className={`h-full ${ROLE_BAR_COLORS[role] || "bg-amber"}`}
                            animate={{ width: `${split.percent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {splits.map((split) => {
                          const participant = getParticipant(split.userId);
                          const role = participant?.role || "writer";
                          return (
                            <span key={split.userId} className="flex items-center gap-1.5 text-[11px] text-text-ghost">
                              <span className={`w-2 h-2 rounded-full ${ROLE_BAR_COLORS[role]}`} />
                              {participant?.displayName}: {split.percent}%
                            </span>
                          );
                        })}
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          isTotalValid ? "text-sage" : "text-rose"
                        }`}
                      >
                        Total: {Math.round(splitsTotal * 100) / 100}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Credit Preview */}
              <div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Credit Preview
                </span>
                <div className="bg-surface/80 border border-border rounded-xl p-5 text-center">
                  <p className="font-display text-lg text-paper italic">{creditPreview}</p>
                </div>
                <input
                  type="text"
                  value={creditFormat}
                  onChange={(e) => setCreditFormat(e.target.value)}
                  placeholder="Custom credit line (leave empty for auto-generated)"
                  className="w-full mt-2 bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>

              {/* Terms */}
              <div>
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className="flex items-center gap-2 text-[12px] text-text-secondary hover:text-text transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform ${showTerms ? "rotate-90" : ""}`}
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                  {showTerms ? "Hide custom terms" : "Add custom terms"}
                </button>
                <AnimatePresence>
                  {showTerms && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="Additional terms, conditions, or notes..."
                        rows={4}
                        className="w-full mt-3 bg-ink border border-border rounded-lg px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!isTotalValid}
                  className="px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => setDemoView("empty")}
                  className="text-text-secondary text-[13px] hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ DISPLAY VIEW (draft / signing / active / history) ═══ */}
          {(demoView === "display" || demoView === "signing" || demoView === "active" || demoView === "history") && agreement && (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="bg-surface/80 border border-border rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg text-paper">
                      {TEMPLATES.find((t) => t.key === agreement.template)?.label || agreement.template}
                    </h3>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-text-ghost">
                      v{agreement.version}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                      STATUS_BADGE[agreement.status] || STATUS_BADGE.draft
                    }`}
                  >
                    {agreement.status}
                  </span>
                </div>

                {/* Split Bar */}
                {agreement.splits.length > 0 && (
                  <div className="mb-6">
                    <div className="h-4 rounded-full overflow-hidden flex bg-ink border border-border">
                      {agreement.splits.map((split) => {
                        const participant = getParticipant(split.userId);
                        const role = participant?.role || "writer";
                        return split.percent > 0 ? (
                          <motion.div
                            key={split.userId}
                            className={`h-full ${ROLE_BAR_COLORS[role] || "bg-amber"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${split.percent}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {agreement.splits.map((split) => {
                        const participant = getParticipant(split.userId);
                        const role = participant?.role || "writer";
                        return (
                          <div key={split.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${ROLE_BAR_COLORS[role]}`} />
                              <span className="text-text-secondary text-[13px]">
                                {participant?.displayName || "Unknown"}
                              </span>
                              <span
                                className={`text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border ${
                                  ROLE_COLORS[role] || ROLE_COLORS.writer
                                }`}
                              >
                                {ROLE_LABELS[role] || role}
                              </span>
                            </div>
                            <span className="text-paper text-[13px] font-medium">{split.percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Credit Preview */}
                <div className="bg-ink/50 border border-border-subtle rounded-xl p-5 text-center mb-6">
                  <p className="font-display text-lg text-paper italic">
                    {agreement.creditFormat || creditPreview}
                  </p>
                </div>

                {/* Terms */}
                {agreement.terms && (
                  <div className="mb-6">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                      Terms
                    </span>
                    <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                      {agreement.terms}
                    </p>
                  </div>
                )}

                {/* Signatures */}
                <div className="border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                      Signatures
                    </span>
                    <span className="text-[11px] text-text-ghost">
                      {agreement.confirmations.length} of {ALL_PARTICIPANTS.length} signed
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-ink border border-border mb-4 overflow-hidden">
                    <motion.div
                      className="h-full bg-sage rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(agreement.confirmations.length / ALL_PARTICIPANTS.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>

                  <div className="space-y-2">
                    {ALL_PARTICIPANTS.map((participant) => {
                      const confirmation = agreement.confirmations.find(
                        (c) => c.userId === participant.userId
                      );
                      const role = participant.role;
                      return (
                        <div key={participant.userId} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[11px] font-display font-semibold flex-shrink-0">
                              {participant.displayName.charAt(0)}
                            </div>
                            <span className="text-text-secondary text-[13px]">
                              {participant.displayName}
                            </span>
                            <span
                              className={`text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border ${
                                ROLE_COLORS[role] || ROLE_COLORS.writer
                              }`}
                            >
                              {ROLE_LABELS[role] || role}
                            </span>
                          </div>
                          {confirmation ? (
                            <span className="flex items-center gap-1.5 text-sage text-[12px]">
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 8l4 4 6-7" />
                              </svg>
                              {relativeTime(confirmation.confirmedAt)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-text-ghost text-[12px]">
                              <span className="w-2 h-2 rounded-full bg-surface border border-border-subtle" />
                              Awaiting
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sign button (for collaborator who hasn't signed) */}
                {!isOwner &&
                  !agreement.confirmations.some((c) => c.userId === currentUserId) &&
                  agreement.status !== "superseded" && (
                    <button
                      onClick={() => setShowSignModal(true)}
                      className="px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200"
                    >
                      Sign Agreement
                    </button>
                  )}

                {/* Already signed */}
                {agreement.confirmations.some((c) => c.userId === currentUserId) && (
                  <span className="flex items-center gap-1.5 text-sage text-[13px] font-medium">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l4 4 6-7" />
                    </svg>
                    You have signed this agreement
                  </span>
                )}

                {/* Owner edit */}
                {isOwner && (
                  <button
                    onClick={handleStartCreate}
                    className="px-5 py-2.5 bg-surface border border-border text-paper font-medium text-[13px] rounded-full hover:border-amber/25 transition-all"
                  >
                    Edit Agreement
                  </button>
                )}

                {/* History toggle */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4 py-2.5 text-text-secondary text-[13px] hover:text-text transition-colors"
                >
                  {showHistory ? "Hide History" : "History"}
                </button>
              </div>

              {/* Sign Modal */}
              <AnimatePresence>
                {showSignModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
                    onClick={() => !signed && setShowSignModal(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {signed ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-6"
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/15 border border-sage/20 flex items-center justify-center"
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage">
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                          </motion.div>
                          <p className="font-display text-xl text-paper">Signed!</p>
                        </motion.div>
                      ) : (
                        <>
                          <h3 className="font-display text-xl text-paper mb-4">
                            Sign Agreement
                          </h3>
                          <p className="text-text-secondary text-[13px] mb-4">
                            By signing, you agree to the terms of this{" "}
                            <span className="text-paper font-medium">
                              {TEMPLATES.find((t) => t.key === agreement.template)?.label}
                            </span>{" "}
                            agreement (v{agreement.version}).
                          </p>

                          {/* Mini split bar */}
                          <div className="mb-5">
                            <div className="h-2.5 rounded-full overflow-hidden flex bg-ink border border-border">
                              {agreement.splits.map((split) => {
                                const participant = getParticipant(split.userId);
                                const role = participant?.role || "writer";
                                return split.percent > 0 ? (
                                  <div
                                    key={split.userId}
                                    className={`h-full ${ROLE_BAR_COLORS[role]}`}
                                    style={{ width: `${split.percent}%` }}
                                  />
                                ) : null;
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {agreement.splits.map((split) => {
                                const participant = getParticipant(split.userId);
                                const role = participant?.role || "writer";
                                return (
                                  <span key={split.userId} className="flex items-center gap-1 text-[11px] text-text-ghost">
                                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_BAR_COLORS[role]}`} />
                                    {participant?.displayName}: {split.percent}%
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleSign}
                              className="flex-1 px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200"
                            >
                              I Agree
                            </button>
                            <button
                              onClick={() => setShowSignModal(false)}
                              className="px-5 py-2.5 text-text-secondary text-[13px] hover:text-text transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Version History */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-l-2 border-border ml-3 pl-5 space-y-4 pt-2">
                      {mockHistory.map((version, vi) => {
                        const versionId = `v${version.version}`;
                        const isExpanded = expandedHistory.has(versionId);
                        const isCurrent = version.status !== "superseded";
                        return (
                          <motion.div
                            key={versionId}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: vi * 0.1 }}
                            className={`relative ${isCurrent ? "" : "opacity-60"}`}
                          >
                            <div
                              className={`absolute -left-[29px] top-1.5 w-3 h-3 rounded-full border-2 ${
                                isCurrent
                                  ? "border-amber bg-amber/30"
                                  : "border-border bg-surface"
                              }`}
                            />
                            <button
                              onClick={() =>
                                setExpandedHistory((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(versionId)) next.delete(versionId);
                                  else next.add(versionId);
                                  return next;
                                })
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-paper text-[13px] font-medium">
                                  v{version.version}
                                </span>
                                <span className="text-text-ghost text-[11px]">
                                  {TEMPLATES.find((t) => t.key === version.template)?.label}
                                </span>
                                <span
                                  className={`text-[9px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${
                                    STATUS_BADGE[version.status] || STATUS_BADGE.draft
                                  }`}
                                >
                                  {version.status}
                                </span>
                                <span className="text-text-ghost text-[11px] ml-auto">
                                  {relativeTime(version.createdAt)}
                                </span>
                              </div>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden mt-2"
                                >
                                  <div className="bg-surface/60 border border-border rounded-lg p-3">
                                    <div className="h-2 rounded-full overflow-hidden flex bg-ink border border-border mb-2">
                                      {version.splits.map((split) => {
                                        const participant = getParticipant(split.userId);
                                        const role = participant?.role || "writer";
                                        return split.percent > 0 ? (
                                          <div
                                            key={split.userId}
                                            className={`h-full ${ROLE_BAR_COLORS[role]}`}
                                            style={{ width: `${split.percent}%` }}
                                          />
                                        ) : null;
                                      })}
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                      {version.splits.map((split) => {
                                        const participant = getParticipant(split.userId);
                                        return (
                                          <span key={split.userId} className="text-[11px] text-text-ghost">
                                            {participant?.displayName || "Unknown"}: {split.percent}%
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <p className="text-[11px] text-text-ghost mt-2">
                                      {version.confirmations.length} of {ALL_PARTICIPANTS.length} signed
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
