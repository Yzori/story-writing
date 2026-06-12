"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Mail, Feather, Pin, Trash2, CornerDownRight } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";

interface LetterSender {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AnsweredLetter {
  id: string;
  body: string;
  reply: string;
  repliedAt: string;
  isPinned: boolean;
  createdAt: string;
  sender: LetterSender;
}

interface WaitingLetter {
  id: string;
  body: string;
  createdAt: string;
  sender: LetterSender;
}

type BlockedReason =
  | "signed-out"
  | "own-desk"
  | "closed"
  | "followers-only"
  | "already-waiting"
  | null;

interface LetterboxData {
  policy: "open" | "followers" | "closed";
  canWrite: boolean;
  writeBlockedReason: BlockedReason;
  letters: AnsweredLetter[];
  waiting: WaitingLetter[];
}

interface LetterboxProps {
  userId: string;
  ownerName: string;
  isOwner: boolean;
}

const MAX_LETTER = 1000;
const MAX_REPLY = 2000;

function SenderMark({ sender }: { sender: LetterSender }) {
  const name = sender.displayName || "A reader";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated">
        {sender.avatarUrl ? (
          <img src={sender.avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[9px] text-text-ghost">{name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="text-[12px] text-text-secondary">{name}</span>
    </span>
  );
}

/**
 * The letterbox: readers write to their writer; letters wait privately on
 * the desk; the ones the writer answers become the study's public
 * correspondence. The writer's choices shape everything here.
 *
 * `LetterboxBody` is the working surface (inbox, compose, correspondence)
 * without section framing — the Composed Room places it on the desk; the
 * mobile stack wraps it in the default export's section.
 */
export function LetterboxBody({
  userId,
  ownerName,
  isOwner,
  framed = false,
}: LetterboxProps & { framed?: boolean }) {
  const [data, setData] = useState<LetterboxData | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/letters`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data);
    } catch {
      // leave the desk quiet on failure
    }
  }, [userId]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/letters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "The letter couldn't be sent.");
      } else {
        setDraft("");
        setSent(true);
        fetchLetters();
      }
    } catch {
      setError("The letter couldn't be sent.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, userId, fetchLetters]);

  if (!data) return null;

  const hasCorrespondence = data.letters.length > 0;
  const hasInbox = isOwner && data.waiting.length > 0;
  const showCompose = data.canWrite || sent;

  // Nothing to show and nothing to do — a closed, empty letterbox stays
  // invisible to visitors. The owner still sees it (it's their choice to make).
  if (!hasCorrespondence && !hasInbox && !showCompose && !isOwner && data.writeBlockedReason !== "followers-only" && data.writeBlockedReason !== "signed-out") {
    return null;
  }

  const body = (
    <>
      {/* Section heading (framed/stack mode only — the room provides its own zone label) */}
      {framed && (
        <div className="mb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber">Correspondence</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            Letters on the desk
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-text-ghost">
            {isOwner
              ? "Letters arrive privately. Answer the ones worth keeping — answered letters live here for every visitor to read."
              : `Write to ${ownerName}. Your letter stays between you until it's answered.`}
          </p>
        </div>
      )}

      {/* Owner's private inbox */}
      {hasInbox && (
        <div className="mb-8 overflow-hidden rounded-[1.5rem] border border-dashed border-amber/30 bg-amber/[0.03] backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-dashed border-amber/20 px-5 py-3">
            <Mail size={13} className="text-amber" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-amber">
              Waiting on the desk — only you see these
            </p>
            <span className="ml-auto font-mono text-[10px] text-text-ghost">{data.waiting.length}</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {data.waiting.map((letter) => (
              <WaitingLetterRow
                key={letter.id}
                letter={letter}
                userId={userId}
                onChanged={fetchLetters}
              />
            ))}
          </div>
        </div>
      )}

      {/* Compose */}
      {!isOwner && (
        <div className="mb-8">
          {sent || data.writeBlockedReason === "already-waiting" ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.5rem] border border-border bg-surface/80 px-6 py-5 text-center backdrop-blur-xl"
            >
              <Mail size={16} className="mx-auto mb-2 text-amber" />
              <p className="font-reading text-[14px] italic text-text">
                Your letter waits on {ownerName}&apos;s desk.
              </p>
              <p className="mt-1 text-[11px] text-text-ghost">
                If it&apos;s answered, the correspondence will appear here.
              </p>
            </motion.div>
          ) : data.canWrite ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-surface/80 backdrop-blur-xl">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_LETTER))}
                rows={4}
                placeholder={`Dear ${ownerName}…`}
                className="w-full resize-none bg-transparent px-6 pt-5 font-reading text-[14px] leading-relaxed text-text outline-none placeholder:italic placeholder:text-text-ghost"
              />
              <div className="flex items-center justify-between px-6 pb-4 pt-2">
                <span className="font-mono text-[10px] text-text-ghost">
                  {draft.length}/{MAX_LETTER}
                </span>
                <div className="flex items-center gap-3">
                  {error && <span className="text-[11px] text-rose">{error}</span>}
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-1.5 text-[12px] font-semibold text-void transition-all hover:shadow-[0_0_18px_rgba(226,172,74,0.22)] disabled:opacity-40"
                  >
                    <Feather size={12} />
                    {sending ? "Sealing…" : "Leave it on the desk"}
                  </button>
                </div>
              </div>
            </div>
          ) : data.writeBlockedReason === "signed-out" ? (
            <p className="text-center text-[12px] text-text-ghost">
              <Link href="/login" className="text-amber underline-offset-2 hover:underline">
                Sign in
              </Link>{" "}
              to leave a letter on the desk.
            </p>
          ) : data.writeBlockedReason === "followers-only" ? (
            <p className="text-center text-[12px] text-text-ghost">
              {ownerName} keeps this letterbox for followers — follow one of
              their stories and come back.
            </p>
          ) : data.writeBlockedReason === "closed" && hasCorrespondence ? (
            <p className="text-center text-[12px] italic text-text-ghost">
              The letterbox is closed for now.
            </p>
          ) : null}
        </div>
      )}

      {/* The public correspondence */}
      {hasCorrespondence ? (
        <div className="space-y-5">
          {data.letters.map((letter, i) => (
            <CorrespondenceCard
              key={letter.id}
              letter={letter}
              ownerName={ownerName}
              isOwner={isOwner}
              userId={userId}
              index={i}
              onChanged={fetchLetters}
            />
          ))}
        </div>
      ) : isOwner && !hasInbox ? (
        <p className="text-center font-reading text-[13px] italic text-text-ghost">
          No letters yet. When readers write and you answer, the exchange is
          kept here.
        </p>
      ) : null}
    </>
  );

  if (!framed) return body;

  return (
    <section id="letterbox" className="relative mx-auto mt-16 max-w-3xl scroll-mt-24 px-5 lg:px-8">
      {body}
    </section>
  );
}

export default function Letterbox(props: LetterboxProps) {
  return <LetterboxBody {...props} framed />;
}

function CorrespondenceCard({
  letter,
  ownerName,
  isOwner,
  userId,
  index,
  onChanged,
}: {
  letter: AnsweredLetter;
  ownerName: string;
  isOwner: boolean;
  userId: string;
  index: number;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const act = async (method: "PATCH" | "DELETE", body?: object) => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/users/${userId}/letters/${letter.id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.5 }}
      className={`relative overflow-hidden rounded-[1.5rem] border bg-surface/80 backdrop-blur-xl ${
        letter.isPinned ? "border-amber/25" : "border-border"
      }`}
    >
      {letter.isPinned && (
        <div className="absolute right-4 top-4 flex items-center gap-1 text-amber">
          <Pin size={11} />
          <span className="text-[9px] uppercase tracking-[0.14em]">Kept</span>
        </div>
      )}

      {/* The reader's letter */}
      <div className="px-6 pt-5">
        <div className="flex items-center gap-2">
          <SenderMark sender={letter.sender} />
          <span className="text-[10px] text-text-ghost">· {formatTimeAgo(letter.createdAt)}</span>
        </div>
        <p className="mt-2.5 font-reading text-[14px] italic leading-relaxed text-text-secondary">
          &ldquo;{letter.body}&rdquo;
        </p>
      </div>

      {/* The writer's answer */}
      <div className="mt-4 border-t border-border-subtle bg-elevated/40 px-6 py-4">
        <div className="flex items-start gap-2.5">
          <CornerDownRight size={13} className="mt-1 shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="font-reading text-[14px] leading-relaxed text-text">{letter.reply}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber">
              <Feather size={11} />
              {ownerName}
              <span className="text-text-ghost">· {formatTimeAgo(letter.repliedAt)}</span>
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => act("PATCH", { isPinned: !letter.isPinned })}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] text-text-ghost transition-colors hover:text-amber disabled:opacity-40"
            >
              <Pin size={10} />
              {letter.isPinned ? "Unpin" : "Keep on top"}
            </button>
            <button
              onClick={() => act("DELETE")}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] text-text-ghost transition-colors hover:text-rose disabled:opacity-40"
            >
              <Trash2 size={10} />
              Discard
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function WaitingLetterRow({
  letter,
  userId,
  onChanged,
}: {
  letter: WaitingLetter;
  userId: string;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReply = async () => {
    if (!reply.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/letters/${letter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: reply.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || "Couldn't send the answer.");
      } else {
        onChanged();
      }
    } catch {
      setError("Couldn't send the answer.");
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/users/${userId}/letters/${letter.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2">
        <SenderMark sender={letter.sender} />
        <span className="text-[10px] text-text-ghost">· {formatTimeAgo(letter.createdAt)}</span>
      </div>
      <p className="mt-2 font-reading text-[13px] italic leading-relaxed text-text-secondary">
        &ldquo;{letter.body}&rdquo;
      </p>

      <AnimatePresence initial={false}>
        {replying ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, MAX_REPLY))}
              rows={3}
              autoFocus
              placeholder="Your answer becomes public correspondence…"
              className="mt-3 w-full resize-none rounded-lg border border-border bg-elevated px-3 py-2.5 font-reading text-[13px] leading-relaxed text-text outline-none placeholder:italic placeholder:text-text-ghost focus:border-amber/30"
            />
            {error && <p className="mt-1.5 text-[11px] text-rose">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setReplying(false)}
                className="rounded-full px-3 py-1 text-[11px] text-text-ghost transition-colors hover:text-text-secondary"
              >
                Not now
              </button>
              <button
                onClick={submitReply}
                disabled={!reply.trim() || busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3.5 py-1 text-[11px] font-semibold text-void transition-all hover:shadow-[0_0_14px_rgba(226,172,74,0.22)] disabled:opacity-40"
              >
                <Feather size={11} />
                {busy ? "Answering…" : "Answer publicly"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={false} className="mt-2.5 flex gap-2">
            <button
              onClick={() => setReplying(true)}
              className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/[0.04] px-3 py-1 text-[11px] text-amber transition-colors hover:bg-amber/10"
            >
              <Feather size={11} />
              Answer
            </button>
            <button
              onClick={discard}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] text-text-ghost transition-colors hover:text-rose disabled:opacity-40"
            >
              <Trash2 size={11} />
              Discard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
