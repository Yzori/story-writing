"use client";

import { useState } from "react";

/**
 * The campaign hub's "leave a chair for the dark" card (Director only).
 * Opting in seats the Stranger: a recurring character in the fiction that
 * the audience plays together. The Director names it and keeps a private
 * note on its nature; in play, "/" offers "Wake the Stranger" whenever the
 * house is watching. The house's votes are free — gold never buys the
 * story — and the Director's veto is absolute.
 */
export default function StrangerChair({
  storyId,
  enabled,
  name,
  nature,
  onSaved,
}: {
  storyId: string;
  enabled: boolean;
  name: string | null;
  nature: string | null;
  onSaved: (patch: {
    campaignStrangerEnabled: boolean;
    campaignStrangerName: string | null;
    campaignStrangerNature: string | null;
  }) => void;
}) {
  const [draftName, setDraftName] = useState(name ?? "");
  const [draftNature, setDraftNature] = useState(nature ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    enabled && (draftName.trim() !== (name ?? "") || draftNature.trim() !== (nature ?? ""));

  const save = async (patch: {
    campaignStrangerEnabled: boolean;
    campaignStrangerName: string | null;
    campaignStrangerNature: string | null;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Failed to save");
      }
      onSaved(patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    void save({
      campaignStrangerEnabled: !enabled,
      campaignStrangerName: draftName.trim() || null,
      campaignStrangerNature: draftNature.trim() || null,
    });

  const saveDetails = () =>
    void save({
      campaignStrangerEnabled: true,
      campaignStrangerName: draftName.trim() || null,
      campaignStrangerNature: draftNature.trim() || null,
    });

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--ink-strange) 20%, transparent)",
        background: "color-mix(in srgb, var(--ink-strange) 5%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={busy}
          aria-label={enabled ? "Remove the Stranger's chair" : "Leave a chair for the audience"}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            enabled ? "bg-[#b7c3da]/40" : "bg-surface border border-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full transition-all duration-200 ${
              enabled
                ? "translate-x-6 bg-[#b7c3da] shadow-sm shadow-[#b7c3da]/30"
                : "translate-x-1 bg-text-ghost/50"
            }`}
          />
        </button>
        <span className="text-xs text-text-secondary">
          {enabled ? (
            <span style={{ color: "var(--ink-strange)" }}>☾ The Stranger sits at this table</span>
          ) : (
            <span className="text-text-ghost">Leave a chair for the audience</span>
          )}
        </span>
        <span className="text-[10px] text-text-ghost/60">
          a character the audience plays together
        </span>
      </div>

      {enabled && (
        <div className="mt-3 space-y-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={80}
            placeholder="its name — e.g. the Whisper, the Gravekeeper…"
            className="block w-full rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm text-paper outline-none placeholder:text-text-ghost/60 focus:border-border"
            aria-label="The Stranger's name"
          />
          <textarea
            value={draftNature}
            onChange={(e) => setDraftNature(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="what it is — a private note only you see"
            className="block w-full resize-none rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm text-paper outline-none placeholder:text-text-ghost/60 focus:border-border"
            aria-label="What the Stranger is"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] leading-relaxed text-text-ghost/60">
              In a live session, type &ldquo;/&rdquo; and choose Wake the Stranger while the
              audience is watching. You frame its possible deeds; they choose; you can
              always call it off.
            </p>
            {dirty && (
              <button
                onClick={saveDetails}
                disabled={busy}
                className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:text-paper"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose">{error}</p>}
    </div>
  );
}
