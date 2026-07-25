"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The Hemingway bridge — marginalia written on the page itself.
//
// One line from you to tomorrow-you, so re-entry starts with "where was I
// headed" instead of "what was I doing". It lived in localStorage until
// 2026-07-24, which meant a note written on the laptop was invisible on the
// phone and the server could never quote it back; now it lives on the chapter.
// Notes already on this device migrate up the first time they're seen.
// ─────────────────────────────────────────────────────────────────────────────

const legacyKey = (chapterId: string) => `quiloria-bridge-${chapterId}`;

export default function BridgeNote({
  storyId,
  chapterId,
  note: serverNote,
}: {
  storyId: string;
  chapterId: string;
  note: string | null;
}) {
  const [note, setNote] = useState<string>(serverNote ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const save = async (text: string) => {
    try {
      await fetch(`/api/stories/${storyId}/chapters/${chapterId}/bridge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
    } catch {
      // The note is already on screen; a failed write is not worth a modal.
      // The next save from any device will carry it.
    }
  };

  // Carry a note left on this device before the column existed.
  useEffect(() => {
    if (serverNote) return;
    let stale = "";
    try {
      stale = localStorage.getItem(legacyKey(chapterId)) ?? "";
    } catch {
      return;
    }
    if (!stale.trim()) return;
    setNote(stale);
    void save(stale).then(() => {
      try {
        localStorage.removeItem(legacyKey(chapterId));
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, serverNote]);

  // The server is the truth whenever it has something to say.
  useEffect(() => {
    if (serverNote) setNote(serverNote);
  }, [serverNote]);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const text = draft.trim();
    setNote(text);
    setEditing(false);
    void save(text);
  };

  if (editing) {
    return (
      <div className="mt-7">
        <label className="mb-1 block text-[9px] uppercase tracking-[0.26em] text-on-gold/45">for tomorrow —</label>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          rows={2}
          maxLength={400}
          placeholder="Where were you headed? One line is enough."
          className="w-full resize-none border-0 border-b border-on-gold/25 bg-transparent px-0 py-1 font-reading text-[14px] italic leading-relaxed text-on-gold caret-gold-dark outline-none transition-colors placeholder:not-italic placeholder:text-on-gold/30 focus:border-gold-dark"
        />
      </div>
    );
  }

  if (note) {
    return (
      <div className="mt-7">
        <p className="text-[9px] uppercase tracking-[0.26em] text-on-gold/45">for tomorrow —</p>
        <p className="mt-1 font-reading text-[14px] italic leading-relaxed text-on-gold/85">{note}</p>
        <button
          onClick={() => {
            setDraft(note);
            setEditing(true);
          }}
          className="mt-1 text-[10.5px] text-on-gold/40 transition-colors hover:text-on-gold/70"
        >
          rewrite
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className="mt-7 block font-reading text-[12.5px] italic text-on-gold/40 transition-colors hover:text-on-gold/75"
    >
      + a line for tomorrow-you
    </button>
  );
}
