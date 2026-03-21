"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ApiCollaborator } from "@/types/api";

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

interface TeamTabProps {
  storyId: string;
  isOwner: boolean;
  sessionUserId: string | undefined;
  collaborators: ApiCollaborator[];
  teamLoading: boolean;
  showInviteForm: boolean;
  setShowInviteForm: (v: boolean) => void;
  inviteUserId: string;
  setInviteUserId: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  inviting: boolean;
  inviteError: string | null;
  setInviteError: (v: string | null) => void;
  handleInvite: () => void;
  setTeamLoaded: (v: boolean) => void;
  setShowRosterNudge: (v: boolean) => void;
}

export function TeamTab({
  storyId,
  isOwner,
  sessionUserId,
  collaborators,
  teamLoading,
  showInviteForm,
  setShowInviteForm,
  inviteUserId,
  setInviteUserId,
  inviteRole,
  setInviteRole,
  inviting,
  inviteError,
  setInviteError,
  handleInvite,
  setTeamLoaded,
  setShowRosterNudge,
}: TeamTabProps) {
  return (
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
                {collab.status === "pending" && collab.userId === sessionUserId && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `/api/stories/${storyId}/collaborators/${collab.id}`,
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
                            `/api/stories/${storyId}/collaborators/${collab.id}`,
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
  );
}
