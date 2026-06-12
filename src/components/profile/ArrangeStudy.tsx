"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Flame, Mail, Gift, X, ImageIcon, ChevronRight } from "lucide-react";

export interface StudySettings {
  profileHearth: boolean;
  profileLetterbox: "open" | "followers" | "closed";
  profileShowGifts: boolean;
  profileCoverMode: "auto" | "portrait" | "story";
  profileCoverStoryId: string | null;
}

interface ArrangeStudyProps {
  userId: string;
  open: boolean;
  settings: StudySettings;
  /** Published stories that may front the cover. */
  coverChoices: { id: string; title: string }[];
  /** Identity, shown as a row linking to the full edit page. */
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  onClose: () => void;
  onSaved: (next: StudySettings) => void;
}

const LETTERBOX_OPTIONS: {
  value: StudySettings["profileLetterbox"];
  label: string;
  detail: string;
}[] = [
  { value: "open", label: "Open", detail: "Any signed-in reader may write" },
  { value: "followers", label: "Followers", detail: "Only readers following your stories" },
  { value: "closed", label: "Closed", detail: "No new letters" },
];

/**
 * The host's hand: decide what's set out for visitors. Every interactive
 * surface on the profile traces back to a choice made here.
 */
export default function ArrangeStudy({
  userId,
  open,
  settings,
  coverChoices,
  displayName,
  avatarUrl,
  bio,
  onClose,
  onSaved,
}: ArrangeStudyProps) {
  const [draft, setDraft] = useState<StudySettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync the draft each time the panel opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setDraft(settings);
    setError(null);
    setWasOpen(true);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || "Couldn't save your arrangement.");
      } else {
        onSaved(draft);
        onClose();
      }
    } catch {
      setError("Couldn't save your arrangement.");
    } finally {
      setSaving(false);
    }
  }, [saving, userId, draft, onSaved, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 px-5 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[var(--t-shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="font-display text-[17px] font-semibold text-paper">
                  Arrange the study
                </h3>
                <p className="mt-0.5 text-[11px] text-text-ghost">
                  What visitors find when they call on you
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-text-ghost transition-colors hover:text-text-secondary"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* The cover */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-amber"><ImageIcon size={14} /></span>
                  <p className="text-[13px] text-paper">The cover</p>
                </div>
                <p className="mb-2.5 text-[11px] leading-relaxed text-text-ghost">
                  What fronts the disc a visitor sees first. A work brings your
                  portrait along as a small medallion beside it.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() =>
                      setDraft((d) => ({ ...d, profileCoverMode: "auto", profileCoverStoryId: null }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                      draft.profileCoverMode === "auto"
                        ? "border-amber/30 bg-amber/[0.04] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    Best work
                  </button>
                  <button
                    onClick={() =>
                      setDraft((d) => ({ ...d, profileCoverMode: "portrait", profileCoverStoryId: null }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                      draft.profileCoverMode === "portrait"
                        ? "border-amber/30 bg-amber/[0.04] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    Your portrait
                  </button>
                  {coverChoices.map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        setDraft((d) => ({ ...d, profileCoverMode: "story", profileCoverStoryId: s.id }))
                      }
                      className={`max-w-full truncate rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                        draft.profileCoverMode === "story" && draft.profileCoverStoryId === s.id
                          ? "border-amber/30 bg-amber/[0.04] text-amber"
                          : "border-border text-text-ghost hover:text-text-secondary"
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Who you are — the deep edits live on their own page */}
              <Link
                href={`/profile/${userId}/edit`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-elevated/50 p-3 transition-all hover:border-amber/25 hover:bg-amber/[0.03]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-[15px] text-paper/80">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-paper">{displayName}</span>
                  <span className="block truncate text-[11px] italic text-text-ghost">
                    {bio || "No biography yet"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-amber">
                  Edit name, portrait & bio
                  <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              {/* Hearth */}
              <SettingRow
                icon={<Flame size={14} />}
                title="Candles from visitors"
                detail="Readers can leave you a free hello — a small candle on your profile that glows for seven days, then fades"
              >
                <Toggle
                  value={draft.profileHearth}
                  onChange={(v) => setDraft((d) => ({ ...d, profileHearth: v }))}
                />
              </SettingRow>

              {/* Letterbox */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-amber"><Mail size={14} /></span>
                  <p className="text-[13px] text-paper">The letterbox</p>
                </div>
                <p className="mb-2.5 text-[11px] leading-relaxed text-text-ghost">
                  Letters land privately on your desk. Only the ones you answer
                  become public correspondence.
                </p>
                <div className="space-y-1.5">
                  {LETTERBOX_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDraft((d) => ({ ...d, profileLetterbox: opt.value }))}
                      className={`flex w-full items-baseline justify-between rounded-lg border px-3 py-2 text-left transition-all ${
                        draft.profileLetterbox === opt.value
                          ? "border-amber/30 bg-amber/[0.04]"
                          : "border-border hover:border-border-active"
                      }`}
                    >
                      <span
                        className={`text-[12px] ${
                          draft.profileLetterbox === opt.value ? "text-amber" : "text-text-secondary"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-text-ghost">{opt.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gifts */}
              <SettingRow
                icon={<Gift size={14} />}
                title="Gifts"
                detail="Visitors may leave ink drops on the desk"
              >
                <Toggle
                  value={draft.profileShowGifts}
                  onChange={(v) => setDraft((d) => ({ ...d, profileShowGifts: v }))}
                />
              </SettingRow>

              {error && <p className="text-[12px] text-rose">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-full bg-amber py-2.5 text-[13px] font-semibold text-void transition-all hover:shadow-[0_0_20px_rgba(226,172,74,0.25)] disabled:opacity-50"
              >
                {saving ? "Arranging…" : "Save arrangement"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingRow({
  icon,
  title,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-amber">{icon}</span>
          <p className="text-[13px] text-paper">{title}</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-text-ghost">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative mt-0.5 w-8 shrink-0 rounded-full transition-colors ${
        value ? "bg-amber" : "bg-subtle"
      } h-[18px]`}
    >
      <div
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-void transition-transform ${
          value ? "left-[16px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
